import 'dotenv/config';
import { prisma } from '../src/db';
import { mixes as seedMixes, tobaccos as seedTobaccos } from '../src/catalog';
import { syncHtReviewsCatalogToNomad } from '../src/integrations/htreviews/sync';
import { HtReviewsClient } from '../src/integrations/htreviews/client';
import { buildHtReviewsDescription } from '../src/integrations/htreviews/description';
import { parseTobaccoPage } from '../src/integrations/htreviews/parser';
import { buildNomadTaxonomyCandidate } from '../src/integrations/htreviews/taxonomy';

type ImportedTobaccoRecord = Awaited<ReturnType<typeof prisma.nomadTobacco.findFirstOrThrow>>;

type RailTemplate = {
  id: string;
  name: string;
  description: string;
  type: 'prepared' | 'curated';
  active: boolean;
  isSystem: boolean;
  mixIds: string[];
};

const railTemplates: RailTemplate[] = [
  {
    id: 'rail-prepared-fresh-line',
    name: 'Быстрый старт',
    description: 'Лёгкие и понятные миксы для первого выбора в зале.',
    type: 'prepared',
    mixIds: ['mix-citrus-scout', 'mix-apple-wave', 'mix-berry-dawn'],
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-prepared-sweet-line',
    name: 'Мягкая витрина',
    description: 'Сладкие, фруктовые и спокойные сочетания для длинного вечера.',
    type: 'prepared',
    mixIds: ['mix-silk-road', 'mix-grape-atelier', 'mix-iced-plum-night'],
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-curated-evening-choice',
    name: 'От наших мастеров',
    description: 'Подборка, которую команда зала советует для более выразительного вкуса.',
    type: 'curated',
    mixIds: ['mix-amber-bazaar', 'mix-dark-market', 'mix-rose-afterglow'],
    active: true,
    isSystem: false,
  },
];

const seedSearchTokens: Record<string, string[]> = {
  'tobacco-citrus-breeze': ['лимон', 'лайм', 'грейпфрут', 'цитрус', 'citrus'],
  'tobacco-berry-oasis': ['малина', 'черника', 'ягод', 'raspberry', 'blueberry', 'berry'],
  'tobacco-desert-honey': ['мед', 'ваниль', 'honey', 'vanilla', 'dessert'],
  'tobacco-spice-route': ['корица', 'кардамон', 'прян', 'spice', 'cinnamon', 'cardamom'],
  'tobacco-mint-veil': ['мята', 'mint', 'ментол', 'cold', 'ice', 'лед'],
  'tobacco-peach-silk': ['персик', 'peach'],
  'tobacco-herbal-dawn': ['чай', 'мелис', 'трав', 'herbal', 'tea', 'lime'],
  'tobacco-rose-nocturne': ['роза', 'rose', 'личи', 'lychee', 'floral'],
  'tobacco-apple-fizz': ['яблоко', 'apple', 'fizz', 'лимон', 'lemon'],
  'tobacco-coconut-cream': ['кокос', 'coconut', 'cream', 'слив', 'vanilla'],
  'tobacco-grape-fog': ['виноград', 'grape', 'ежевик', 'blackberry'],
  'tobacco-dark-leaf': ['dark', 'leaf', 'табак', 'tobacco', 'cigar', 'прян'],
  'tobacco-pear-bloom': ['груша', 'pear', 'цвет', 'flower', 'bloom'],
  'tobacco-iced-plum': ['слива', 'plum', 'ice', 'лед', 'mint'],
};

const seedOverrides: Record<string, string> = {
  'tobacco-desert-honey': 'htreviews-151867',
  'tobacco-rose-nocturne': 'htreviews-197287',
  'tobacco-apple-fizz': 'htreviews-92620',
};

const toInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseList = (value: string | null | undefined) => {
  if (!value) {
    return [] as string[];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [] as string[];
  }
};

const unique = (items: string[]) => Array.from(new Set(items));

const normalize = (value: string) => value.trim().toLowerCase().replace(/ё/g, 'е');

const buildHaystack = (candidate: ImportedTobaccoRecord) =>
  normalize([
    candidate.manufacturer,
    candidate.lineName,
    candidate.name,
    candidate.alias ?? '',
    candidate.description ?? '',
  ].join(' '));

const scoreCandidate = (seed: (typeof seedTobaccos)[number], candidate: ImportedTobaccoRecord) => {
  const candidateFlavors = new Set(parseList(candidate.flavors).map(normalize));
  const candidateProfiles = new Set(parseList(candidate.flavorProfiles).map(normalize));
  const candidateTags = new Set(parseList(candidate.rawSourceTags).map(normalize));
  const seedFlavors = new Set(seed.flavors.map(normalize));
  const seedProfiles = new Set(seed.flavorProfiles.map(normalize));
  const haystack = buildHaystack(candidate);
  const searchTokens = seedSearchTokens[seed.id] ?? [];

  let flavorOverlap = 0;
  for (const flavor of seedFlavors) {
    if (candidateFlavors.has(flavor) || candidateTags.has(flavor)) {
      flavorOverlap += 1;
    }
  }

  let profileOverlap = 0;
  for (const profile of seedProfiles) {
    if (candidateProfiles.has(profile)) {
      profileOverlap += 1;
    }
  }

  let tokenHits = 0;
  for (const token of searchTokens) {
    if (haystack.includes(normalize(token))) {
      tokenHits += 1;
    }
  }

  const profilePenalty = candidateProfiles.size > seedProfiles.size ? candidateProfiles.size - seedProfiles.size : 0;
  const reviewCount = Number(candidate.reviewsCount ?? 0);

  return flavorOverlap * 120 + profileOverlap * 30 + tokenHits * 45 + Math.min(reviewCount, 50) * 0.1 - profilePenalty * 2;
};

const buildSeedMatchMap = (imported: ImportedTobaccoRecord[]) => {
  const usedIds = new Set<string>();
  const matchMap = new Map<string, ImportedTobaccoRecord>();
  const importedById = new Map(imported.map((item) => [item.id, item]));

  for (const seed of seedTobaccos) {
    const overrideId = seedOverrides[seed.id];
    if (!overrideId) {
      continue;
    }

    const overridden = importedById.get(overrideId);
    if (!overridden) {
      throw new Error(`Override ${overrideId} for ${seed.id} is missing in imported catalog`);
    }

    usedIds.add(overridden.id);
    matchMap.set(seed.id, overridden);
  }

  const rankedSeeds = seedTobaccos
    .filter((seed) => !matchMap.has(seed.id))
    .map((seed) => {
      const rankedCandidates = imported
        .map((candidate) => ({
          candidate,
          score: scoreCandidate(seed, candidate),
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score);

      return {
        seed,
        rankedCandidates,
      };
    })
    .sort((left, right) => {
      const leftBest = left.rankedCandidates[0]?.score ?? -1;
      const rightBest = right.rankedCandidates[0]?.score ?? -1;
      return rightBest - leftBest;
    });

  for (const item of rankedSeeds) {
    const selected = item.rankedCandidates.find((candidate) => !usedIds.has(candidate.candidate.id));
    if (!selected) {
      throw new Error(`No imported tobacco match for seed ${item.seed.id} (${item.seed.name})`);
    }

    usedIds.add(selected.candidate.id);
    matchMap.set(item.seed.id, selected.candidate);
  }

  return matchMap;
};

const enrichSelectedTobaccos = async (items: ImportedTobaccoRecord[], requestTimeoutMs: number, delayMs: number) => {
  const client = new HtReviewsClient({ requestTimeoutMs, delayMs });

  for (const item of items) {
    try {
      const html = await client.fetchText(item.sourceUrl);
      const detail = parseTobaccoPage(html, client.baseUrl, item.sourceUrl);
      const taxonomy = buildNomadTaxonomyCandidate(detail.rawTags);

      await prisma.nomadTobacco.update({
        where: {
          id: item.id,
        },
        data: {
          alias: detail.alias ?? item.alias,
          description: buildHtReviewsDescription(detail) ?? item.description,
          country: detail.country,
          officialStrength: detail.officialStrength,
          communityStrength: detail.communityStrength,
          productionStatus: detail.status,
          imageUrl: detail.imageUrl ?? item.imageUrl,
          sourceExternalId: detail.htreviewsId ?? item.sourceExternalId,
          sourceNumericId: detail.sourceNumericId ?? item.sourceNumericId,
          rawSourceTags: JSON.stringify(detail.rawTags),
          flavorProfiles: JSON.stringify(taxonomy.flavorProfiles),
          flavors: JSON.stringify(taxonomy.flavors),
          flavorTags: JSON.stringify(taxonomy.flavorTags),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[rebuild-live-catalog] skipped detail enrich for ${item.sourceUrl}: ${message}`);
    }
  }
};

const distributeProportions = (tobaccoIds: string[]) => {
  const base = Math.floor(100 / tobaccoIds.length);
  const remainder = 100 - base * tobaccoIds.length;

  return tobaccoIds.map((tobaccoId, index) => ({
    tobaccoId,
    proportion: base + (index < remainder ? 1 : 0),
    sortOrder: index,
  }));
};

async function main() {
  const delayMs = toInt(process.env.HTREVIEWS_DELAY_MS, 50);
  const requestTimeoutMs = toInt(process.env.HTREVIEWS_REQUEST_TIMEOUT_MS, 20_000);

  console.log('[rebuild-live-catalog] syncing HTReviews summary catalog');
  const syncStats = await syncHtReviewsCatalogToNomad({
    fetchDetails: false,
    delayMs,
    requestTimeoutMs,
    defaultInStock: false,
  });

  const imported = await prisma.nomadTobacco.findMany({
    where: {
      sourceKind: 'htreviews',
    },
  });

  if (!imported.length) {
    throw new Error('HTReviews sync produced no imported tobaccos');
  }

  const matchMap = buildSeedMatchMap(imported);
  const selectedTobaccoIds = unique(Array.from(matchMap.values()).map((item) => item.id));
  const selectedCandidates = imported.filter((item) => selectedTobaccoIds.includes(item.id));

  console.log('[rebuild-live-catalog] enriching selected component tobaccos');
  await enrichSelectedTobaccos(selectedCandidates, requestTimeoutMs, delayMs);

  const refreshedSelected = await prisma.nomadTobacco.findMany({
    where: {
      id: {
        in: selectedTobaccoIds,
      },
    },
  });
  const selectedTobaccos = new Map(refreshedSelected.map((item) => [item.id, item]));

  await prisma.$transaction(async (tx) => {
    await tx.nomadSmokeCtaEvent.deleteMany();
    await tx.nomadMixRating.deleteMany();
    await tx.nomadRailMix.deleteMany();
    await tx.nomadMixComponent.deleteMany();
    await tx.nomadRail.deleteMany();
    await tx.nomadMix.deleteMany();
    await tx.nomadAuditEvent.deleteMany();
    await tx.nomadTobacco.deleteMany({
      where: {
        sourceKind: null,
      },
    });

    await tx.nomadTobacco.updateMany({
      where: {
        sourceKind: 'htreviews',
      },
      data: {
        inStock: false,
      },
    });

    await tx.nomadTobacco.updateMany({
      where: {
        id: {
          in: selectedTobaccoIds,
        },
      },
      data: {
        inStock: true,
      },
    });

    await tx.nomadMix.createMany({
      data: seedMixes.map((mix) => {
        const seedComponents = mix.componentIds
          .map((componentId) => {
            const matched = matchMap.get(componentId);
            return matched ? selectedTobaccos.get(matched.id) ?? matched : null;
          })
          .filter((item): item is ImportedTobaccoRecord => Boolean(item));
        const flavorProfiles = unique(seedComponents.flatMap((item) => parseList(item.flavorProfiles))).sort();
        const flavors = unique(seedComponents.flatMap((item) => parseList(item.flavors))).sort();
        const flavorTags = unique(seedComponents.flatMap((item) => parseList(item.flavorTags))).sort();

        return {
          id: mix.id,
          name: mix.name,
          description: mix.description,
          flavorProfiles: JSON.stringify(flavorProfiles.length ? flavorProfiles : unique(
            mix.componentIds.flatMap((componentId) => {
              const seed = seedTobaccos.find((item) => item.id === componentId);
              return seed ? seed.flavorProfiles : [];
            }),
          ).sort()),
          flavors: JSON.stringify(flavors.length ? flavors : unique(
            mix.componentIds.flatMap((componentId) => {
              const seed = seedTobaccos.find((item) => item.id === componentId);
              return seed ? seed.flavors : [];
            }),
          ).sort()),
          flavorTags: JSON.stringify(flavorTags.length ? flavorTags : unique(
            mix.componentIds.flatMap((componentId) => {
              const seed = seedTobaccos.find((item) => item.id === componentId);
              return seed ? seed.flavorTags : [];
            }),
          ).sort()),
          available: true,
          popularity: mix.popularity,
          baseAvgRating: mix.avgRating,
        };
      }),
    });

    await tx.nomadMixComponent.createMany({
      data: seedMixes.flatMap((mix) => {
        const tobaccoIds = mix.componentIds
          .map((componentId) => matchMap.get(componentId)?.id)
          .filter((item): item is string => Boolean(item));

        return distributeProportions(tobaccoIds).map((component) => ({
          mixId: mix.id,
          tobaccoId: component.tobaccoId,
          proportion: component.proportion,
          sortOrder: component.sortOrder,
        }));
      }),
    });

    await tx.nomadRail.createMany({
      data: railTemplates.map((rail) => ({
        id: rail.id,
        name: rail.name,
        description: rail.description,
        type: rail.type,
        active: rail.active,
        isSystem: rail.isSystem,
      })),
    });

    await tx.nomadRailMix.createMany({
      data: railTemplates.flatMap((rail) =>
        rail.mixIds.map((mixId, index) => ({
          railId: rail.id,
          mixId,
          sortOrder: index,
        })),
      ),
    });
  });

  const mixSummary = seedMixes.map((mix) => ({
    mixId: mix.id,
    mixName: mix.name,
    components: mix.componentIds.map((componentId) => {
      const selected = matchMap.get(componentId);
      if (!selected) {
        return {
          seedComponentId: componentId,
          tobaccoId: null,
          manufacturer: null,
          lineName: null,
          name: null,
        };
      }

      return {
        seedComponentId: componentId,
        tobaccoId: selected.id,
        manufacturer: selected.manufacturer,
        lineName: selected.lineName,
        name: selected.name,
      };
    }),
  }));

  const [tobaccoCount, importedCount, inStockCount, mixCount, railCount] = await Promise.all([
    prisma.nomadTobacco.count(),
    prisma.nomadTobacco.count({ where: { sourceKind: 'htreviews' } }),
    prisma.nomadTobacco.count({ where: { inStock: true } }),
    prisma.nomadMix.count(),
    prisma.nomadRail.count(),
  ]);

  console.log('[rebuild-live-catalog] completed');
  console.log(
    JSON.stringify(
      {
        syncStats,
        counts: {
          tobaccos: tobaccoCount,
          imported: importedCount,
          inStock: inStockCount,
          mixes: mixCount,
          rails: railCount,
        },
        selectedComponentTobaccos: selectedTobaccoIds.map((id) => {
          const item = selectedTobaccos.get(id);
          return item
            ? {
              id: item.id,
              manufacturer: item.manufacturer,
              lineName: item.lineName,
              name: item.name,
            }
            : { id };
        }),
        mixSummary,
      },
      null,
      2,
    ),
  );
}

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[rebuild-live-catalog] ${message}`);
  await prisma.$disconnect();
  process.exit(1);
});
