"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCatalogFromSources = void 0;
const db_1 = require("../db");
const normalize_1 = require("./normalize");
const makeTobaccoKey = (manufacturer, name) => `${manufacturer.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
const makeMixKey = (authorEmail, name) => `${authorEmail.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
const normalizeCatalogInput = (sources) => {
    const tobaccoMap = new Map();
    const mixMap = new Map();
    for (const source of sources) {
        for (const tobacco of source.tobaccos) {
            const key = makeTobaccoKey(tobacco.manufacturer, tobacco.name);
            const current = tobaccoMap.get(key);
            if (!current) {
                tobaccoMap.set(key, tobacco);
                continue;
            }
            tobaccoMap.set(key, {
                ...current,
                website: current.website ?? tobacco.website ?? null,
                description: current.description ?? tobacco.description ?? null,
                flavorTags: (0, normalize_1.dedupe)([...current.flavorTags, ...tobacco.flavorTags]),
                sources: (0, normalize_1.dedupe)([...(current.sources ?? []), ...(tobacco.sources ?? [])]),
            });
        }
        for (const mix of source.mixes) {
            const key = makeMixKey(mix.authorEmail, mix.name);
            if (!mixMap.has(key)) {
                mixMap.set(key, mix);
            }
        }
    }
    return {
        tobaccos: Array.from(tobaccoMap.values()),
        mixes: Array.from(mixMap.values()),
    };
};
const upsertManufacturers = async (tobaccos, stats) => {
    const byManufacturer = new Map();
    for (const tobacco of tobaccos) {
        if (!byManufacturer.has(tobacco.manufacturer)) {
            byManufacturer.set(tobacco.manufacturer, tobacco.website ?? null);
        }
    }
    const ids = new Map();
    for (const [name, website] of byManufacturer) {
        const existing = await db_1.prisma.manufacturer.findUnique({ where: { name } });
        await db_1.prisma.manufacturer.upsert({
            where: { name },
            update: { website },
            create: { name, website },
        });
        const persisted = await db_1.prisma.manufacturer.findUnique({ where: { name }, select: { id: true } });
        if (!persisted) {
            throw new Error(`Failed to upsert manufacturer: ${name}`);
        }
        if (existing) {
            stats.manufacturersUpdated += 1;
        }
        else {
            stats.manufacturersCreated += 1;
        }
        ids.set(name, persisted.id);
    }
    return ids;
};
const upsertTobaccos = async (tobaccos, manufacturerIds, stats) => {
    for (const tobacco of tobaccos) {
        const manufacturerId = manufacturerIds.get(tobacco.manufacturer);
        if (!manufacturerId) {
            stats.issues.push(`Unknown manufacturer for tobacco: ${tobacco.manufacturer}`);
            continue;
        }
        const flavorTags = (0, normalize_1.dedupe)(tobacco.flavorTags.map((tag) => tag.trim()).filter(Boolean));
        const flavorProfiles = (0, normalize_1.deriveFlavorProfiles)(flavorTags);
        const existing = await db_1.prisma.tobacco.findUnique({
            where: {
                manufacturerId_name: {
                    manufacturerId,
                    name: tobacco.name,
                },
            },
            select: { id: true },
        });
        await db_1.prisma.tobacco.upsert({
            where: {
                manufacturerId_name: {
                    manufacturerId,
                    name: tobacco.name,
                },
            },
            update: {
                strength: tobacco.strength,
                line: tobacco.line ?? null,
                description: tobacco.description ?? null,
                flavorTags,
                flavorProfiles,
            },
            create: {
                manufacturerId,
                name: tobacco.name,
                strength: tobacco.strength,
                line: tobacco.line ?? null,
                description: tobacco.description ?? null,
                flavorTags,
                flavorProfiles,
            },
        });
        if (existing) {
            stats.tobaccosUpdated += 1;
        }
        else {
            stats.tobaccosCreated += 1;
        }
    }
};
const buildTobaccoLookup = async (mixes) => {
    const manufacturerNames = (0, normalize_1.dedupe)(mixes.flatMap((mix) => mix.components.map((component) => component.manufacturer)));
    if (manufacturerNames.length === 0) {
        return new Map();
    }
    const manufacturers = await db_1.prisma.manufacturer.findMany({
        where: { name: { in: manufacturerNames } },
        select: { id: true, name: true },
    });
    const tobaccoLookup = new Map();
    await Promise.all(manufacturers.map(async (manufacturer) => {
        const tobaccoNames = (0, normalize_1.dedupe)(mixes
            .flatMap((mix) => mix.components)
            .filter((component) => component.manufacturer === manufacturer.name)
            .map((component) => (0, normalize_1.normalizeTobaccoName)(component.tobacco)));
        if (!tobaccoNames.length) {
            return;
        }
        const tobaccos = await db_1.prisma.tobacco.findMany({
            where: {
                manufacturerId: manufacturer.id,
                name: { in: tobaccoNames },
            },
            select: {
                id: true,
                name: true,
                manufacturerId: true,
                flavorProfiles: true,
            },
        });
        for (const tobacco of tobaccos) {
            tobaccoLookup.set(makeTobaccoKey(manufacturer.name, tobacco.name), {
                id: tobacco.id,
                flavorProfiles: tobacco.flavorProfiles,
            });
        }
    }));
    return tobaccoLookup;
};
const upsertMixes = async (mixes, stats) => {
    const tobaccoLookup = await buildTobaccoLookup(mixes);
    for (const mix of mixes) {
        const author = await db_1.prisma.user.upsert({
            where: { email: mix.authorEmail },
            update: {},
            create: { email: mix.authorEmail },
            select: { id: true },
        });
        const mappedComponents = [];
        for (const component of mix.components) {
            const normalizedName = (0, normalize_1.normalizeTobaccoName)(component.tobacco);
            const lookup = tobaccoLookup.get(makeTobaccoKey(component.manufacturer, normalizedName));
            if (!lookup) {
                stats.issues.push(`Missing tobacco for mix "${mix.name}": ${component.manufacturer} ${normalizedName}`);
                continue;
            }
            mappedComponents.push({
                tobaccoId: lookup.id,
                proportion: component.proportion,
                flavorProfiles: lookup.flavorProfiles,
            });
        }
        const uniqueComponentIds = new Set(mappedComponents.map((component) => component.tobaccoId));
        const total = mappedComponents.reduce((sum, component) => sum + component.proportion, 0);
        if (mappedComponents.length === 0 ||
            uniqueComponentIds.size !== mappedComponents.length ||
            total !== 100) {
            stats.mixesSkipped += 1;
            stats.issues.push(`Skipped mix "${mix.name}": invalid components (sum=${total})`);
            continue;
        }
        const flavorProfiles = (0, normalize_1.dedupe)(mappedComponents.flatMap((component) => component.flavorProfiles));
        const tags = (0, normalize_1.dedupe)([
            ...(mix.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
            ...(0, normalize_1.extractTagsFromDescription)(mix.description),
        ]);
        const existing = await db_1.prisma.mix.findFirst({
            where: {
                name: mix.name,
                authorId: author.id,
                isUserMix: mix.isUserMix ?? false,
            },
            select: { id: true },
        });
        if (existing) {
            await db_1.prisma.mix.update({
                where: { id: existing.id },
                data: {
                    description: mix.description ?? null,
                    tags,
                    flavorProfiles,
                    components: {
                        deleteMany: {},
                        create: mappedComponents.map((component) => ({
                            tobaccoId: component.tobaccoId,
                            proportion: component.proportion,
                        })),
                    },
                },
            });
            stats.mixesUpdated += 1;
            continue;
        }
        await db_1.prisma.mix.create({
            data: {
                name: mix.name,
                authorId: author.id,
                description: mix.description ?? null,
                tags,
                flavorProfiles,
                isUserMix: mix.isUserMix ?? false,
                components: {
                    create: mappedComponents.map((component) => ({
                        tobaccoId: component.tobaccoId,
                        proportion: component.proportion,
                    })),
                },
            },
        });
        stats.mixesCreated += 1;
    }
};
const upsertCatalogFromSources = async (sources) => {
    const normalized = normalizeCatalogInput(sources);
    const stats = {
        sourceNames: sources.map((source) => source.source),
        input: {
            tobaccos: normalized.tobaccos.length,
            mixes: normalized.mixes.length,
        },
        manufacturersCreated: 0,
        manufacturersUpdated: 0,
        tobaccosCreated: 0,
        tobaccosUpdated: 0,
        mixesCreated: 0,
        mixesUpdated: 0,
        mixesSkipped: 0,
        issues: [],
    };
    const manufacturerIds = await upsertManufacturers(normalized.tobaccos, stats);
    await upsertTobaccos(normalized.tobaccos, manufacturerIds, stats);
    await upsertMixes(normalized.mixes, stats);
    if (stats.issues.length > 100) {
        stats.issues = stats.issues.slice(0, 100);
        stats.issues.push('... trimmed ...');
    }
    return stats;
};
exports.upsertCatalogFromSources = upsertCatalogFromSources;
