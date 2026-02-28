import { prisma } from '../db';
import { CatalogSourcePayload, MixSeed, RefreshStats, TobaccoSeed } from '../types';
import {
  FlavorProfile,
  dedupe,
  deriveFlavor,
  deriveFlavorProfiles,
  deriveTobaccoFlavorTags,
  extractTagsFromDescription,
  normalizeTobaccoName,
  normalizeTextList,
} from './normalize';

const makeTobaccoKey = (manufacturer: string, name: string) =>
  `${manufacturer.trim().toLowerCase()}::${name.trim().toLowerCase()}`;

const makeMixKey = (authorEmail: string, name: string) =>
  `${authorEmail.trim().toLowerCase()}::${name.trim().toLowerCase()}`;

const normalizeCatalogInput = (sources: CatalogSourcePayload[]) => {
  const tobaccoMap = new Map<string, TobaccoSeed>();
  const mixMap = new Map<string, MixSeed>();

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
        flavorTags: dedupe([...(current.flavorTags ?? []), ...(tobacco.flavorTags ?? [])]),
        flavors: dedupe([...(current.flavors ?? current.flavor ?? []), ...(tobacco.flavors ?? tobacco.flavor ?? [])]),
        sources: dedupe([...(current.sources ?? []), ...(tobacco.sources ?? [])]),
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

const upsertManufacturers = async (tobaccos: TobaccoSeed[], stats: RefreshStats) => {
  const byManufacturer = new Map<string, string | null>();
  for (const tobacco of tobaccos) {
    if (!byManufacturer.has(tobacco.manufacturer)) {
      byManufacturer.set(tobacco.manufacturer, tobacco.website ?? null);
    }
  }

  const ids = new Map<string, string>();
  for (const [name, website] of byManufacturer) {
    const existing = await prisma.manufacturer.findUnique({ where: { name } });
    await prisma.manufacturer.upsert({
      where: { name },
      update: { website },
      create: { name, website },
    });

    const persisted = await prisma.manufacturer.findUnique({ where: { name }, select: { id: true } });
    if (!persisted) {
      throw new Error(`Failed to upsert manufacturer: ${name}`);
    }

    if (existing) {
      stats.manufacturersUpdated += 1;
    } else {
      stats.manufacturersCreated += 1;
    }

    ids.set(name, persisted.id);
  }

  return ids;
};

const upsertTobaccos = async (
  tobaccos: TobaccoSeed[],
  manufacturerIds: Map<string, string>,
  stats: RefreshStats,
) => {
  for (const tobacco of tobaccos) {
    const manufacturerId = manufacturerIds.get(tobacco.manufacturer);
    if (!manufacturerId) {
      stats.issues.push(`Unknown manufacturer for tobacco: ${tobacco.manufacturer}`);
      continue;
    }

    const rawFlavorTags = normalizeTextList(tobacco.flavorTags ?? []);
    const flavors = deriveFlavor(tobacco.flavors ?? tobacco.flavor, rawFlavorTags);
    const flavorTags = deriveTobaccoFlavorTags(rawFlavorTags, flavors, tobacco.description);
    const flavorProfiles = deriveFlavorProfiles([
      ...flavors,
      ...rawFlavorTags,
      ...(tobacco.description ? [tobacco.description] : []),
    ]);

    const existing = await prisma.tobacco.findUnique({
      where: {
        manufacturerId_name: {
          manufacturerId,
          name: tobacco.name,
        },
      },
      select: { id: true },
    });

    await prisma.tobacco.upsert({
      where: {
        manufacturerId_name: {
          manufacturerId,
          name: tobacco.name,
        },
      },
      update: {
        strength: tobacco.strength,
        description: tobacco.description ?? null,
        flavorTags,
        flavors,
        flavorProfiles,
      },
      create: {
        manufacturerId,
        name: tobacco.name,
        strength: tobacco.strength,
        description: tobacco.description ?? null,
        flavorTags,
        flavors,
        flavorProfiles,
      },
    });

    if (existing) {
      stats.tobaccosUpdated += 1;
    } else {
      stats.tobaccosCreated += 1;
    }
  }
};

type TobaccoLookup = Map<
  string,
  {
    id: string;
    flavorProfiles: FlavorProfile[];
    flavors: string[];
    flavorTags: string[];
  }
>;

const buildTobaccoLookup = async (mixes: MixSeed[]): Promise<TobaccoLookup> => {
  const manufacturerNames = dedupe(
    mixes.flatMap((mix) => mix.components.map((component) => component.manufacturer)),
  );

  if (manufacturerNames.length === 0) {
    return new Map();
  }

  const manufacturers = await prisma.manufacturer.findMany({
    where: { name: { in: manufacturerNames } },
    select: { id: true, name: true },
  });

  const tobaccoLookup: TobaccoLookup = new Map();

  await Promise.all(
    manufacturers.map(async (manufacturer: { id: string; name: string }) => {
      const tobaccoNames = dedupe(
        mixes
          .flatMap((mix) => mix.components)
          .filter((component) => component.manufacturer === manufacturer.name)
          .map((component) => normalizeTobaccoName(component.tobacco)),
      );

      if (!tobaccoNames.length) {
        return;
      }

      const tobaccos = await prisma.tobacco.findMany({
        where: {
          manufacturerId: manufacturer.id,
          name: { in: tobaccoNames },
        },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
          flavorProfiles: true,
          flavors: true,
          flavorTags: true,
        },
      });

      for (const tobacco of tobaccos) {
        tobaccoLookup.set(makeTobaccoKey(manufacturer.name, tobacco.name), {
          id: tobacco.id,
          flavorProfiles: tobacco.flavorProfiles,
          flavors: tobacco.flavors,
          flavorTags: tobacco.flavorTags,
        });
      }
    }),
  );

  return tobaccoLookup;
};

const upsertMixes = async (mixes: MixSeed[], stats: RefreshStats) => {
  const tobaccoLookup = await buildTobaccoLookup(mixes);

  for (const mix of mixes) {
    const author = await prisma.user.upsert({
      where: { email: mix.authorEmail },
      update: {},
      create: { email: mix.authorEmail },
      select: { id: true },
    });

    const mappedComponents: Array<{
      tobaccoId: string;
      proportion: number;
      flavorProfiles: FlavorProfile[];
      flavors: string[];
      flavorTags: string[];
    }> = [];

    for (const component of mix.components) {
      const normalizedName = normalizeTobaccoName(component.tobacco);
      const lookup = tobaccoLookup.get(makeTobaccoKey(component.manufacturer, normalizedName));
      if (!lookup) {
        stats.issues.push(
          `Missing tobacco for mix "${mix.name}": ${component.manufacturer} ${normalizedName}`,
        );
        continue;
      }

      mappedComponents.push({
        tobaccoId: lookup.id,
        proportion: component.proportion,
        flavorProfiles: lookup.flavorProfiles,
        flavors: lookup.flavors,
        flavorTags: lookup.flavorTags,
      });
    }

    const uniqueComponentIds = new Set(mappedComponents.map((component) => component.tobaccoId));
    const total = mappedComponents.reduce((sum, component) => sum + component.proportion, 0);

    if (
      mappedComponents.length === 0 ||
      uniqueComponentIds.size !== mappedComponents.length ||
      total !== 100
    ) {
      stats.mixesSkipped += 1;
      stats.issues.push(`Skipped mix "${mix.name}": invalid components (sum=${total})`);
      continue;
    }

    const flavorProfiles = dedupe(
      mappedComponents.flatMap((component) => component.flavorProfiles),
    );
    const flavors = dedupe(mappedComponents.flatMap((component) => component.flavors));

    const tags = dedupe([
      ...mappedComponents.flatMap((component) => component.flavorTags),
      ...((mix.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean) as string[]),
      ...extractTagsFromDescription(mix.description),
    ]);

    const existing = await prisma.mix.findFirst({
      where: {
        name: mix.name,
        authorId: author.id,
        isUserMix: mix.isUserMix ?? false,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.mix.update({
        where: { id: existing.id },
        data: {
          description: mix.description ?? null,
          tags,
          flavorProfiles,
          flavors,
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

    await prisma.mix.create({
      data: {
        name: mix.name,
        authorId: author.id,
        description: mix.description ?? null,
        tags,
        flavorProfiles,
        flavors,
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

export const upsertCatalogFromSources = async (
  sources: CatalogSourcePayload[],
): Promise<RefreshStats> => {
  const normalized = normalizeCatalogInput(sources);

  const stats: RefreshStats = {
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
