import 'dotenv/config';
import { prisma } from '../src/db';
import { HtReviewsClient } from '../src/integrations/htreviews/client';
import { buildHtReviewsDescription } from '../src/integrations/htreviews/description';
import { parseTobaccoPage } from '../src/integrations/htreviews/parser';
import { buildNomadTaxonomyCandidate } from '../src/integrations/htreviews/taxonomy';

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
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const serializeList = (items: string[]) => JSON.stringify(Array.from(new Set(items)));

const updateMixTaxonomy = async () => {
  const mixes = await prisma.mix.findMany({
    include: {
      components: {
        include: {
          tobacco: {
            select: {
              flavorProfiles: true,
              flavors: true,
              flavorTags: true,
            },
          },
        },
      },
    },
  });

  for (const mix of mixes) {
    const flavorProfiles = Array.from(new Set(mix.components.flatMap((item) => parseList(item.tobacco.flavorProfiles)))).sort();
    const flavors = Array.from(new Set(mix.components.flatMap((item) => parseList(item.tobacco.flavors)))).sort();
    const flavorTags = Array.from(new Set(mix.components.flatMap((item) => parseList(item.tobacco.flavorTags)))).sort();

    await prisma.mix.update({
      where: {
        id: mix.id,
      },
      data: {
        flavorProfiles: serializeList(flavorProfiles),
        flavors: serializeList(flavors),
        flavorTags: serializeList(flavorTags),
      },
    });
  }
};

async function main() {
  const client = new HtReviewsClient({
    delayMs: toInt(process.env.HTREVIEWS_DELAY_MS, 25),
    requestTimeoutMs: toInt(process.env.HTREVIEWS_REQUEST_TIMEOUT_MS, 20_000),
  });
  const concurrency = toInt(process.env.HTREVIEWS_CONCURRENCY, 8);
  const limit = process.env.HTREVIEWS_TOBACCO_LIMIT ? toInt(process.env.HTREVIEWS_TOBACCO_LIMIT, 0) : 0;
  const onlyMissingDescription = process.env.HTREVIEWS_ONLY_MISSING_DESCRIPTION === '1';
  const onlyIncomplete = process.env.HTREVIEWS_ONLY_INCOMPLETE === '1';

  const sourceRows = await prisma.tobacco.findMany({
    where: {
      sourceKind: 'htreviews',
      sourceUrl: {
        not: null,
      },
      ...((onlyMissingDescription || onlyIncomplete)
        ? {
            OR: [
              ...(onlyMissingDescription ? ([{ description: null }, { description: '' }] as Array<Record<string, null | string>>) : []),
              ...(onlyIncomplete
                ? ([
                    { country: null },
                    { country: '' },
                    { officialStrength: null },
                    { officialStrength: '' },
                    { communityStrength: null },
                    { communityStrength: '' },
                    { productionStatus: null },
                    { productionStatus: '' },
                    { description: null },
                    { description: '' },
                  ] as Array<Record<string, null | string>>)
                : []),
            ],
          }
        : {}),
    },
    orderBy: {
      updatedAt: 'asc',
    },
  });

  const rows = limit > 0 ? sourceRows.slice(0, limit) : sourceRows;

  let index = 0;
  let updated = 0;
  let failed = 0;
  let withStrength = 0;
  let withFlavors = 0;
  let withTags = 0;

  const worker = async () => {
    while (true) {
      const current = rows[index];
      index += 1;

      if (!current) {
        return;
      }

      try {
        const html = await client.fetchText(current.sourceUrl!);
        const detail = parseTobaccoPage(html, client.baseUrl, current.sourceUrl!);
        const taxonomy = buildNomadTaxonomyCandidate(detail.rawTags);

        await prisma.tobacco.update({
          where: {
            id: current.id,
          },
          data: {
            manufacturer: detail.brand.name || current.manufacturer,
            lineName: detail.line.name || current.lineName,
            name: detail.name || current.name,
            alias: detail.alias ?? current.alias,
            description: buildHtReviewsDescription(detail) ?? current.description,
            country: detail.country ?? current.country,
            officialStrength: detail.officialStrength,
            communityStrength: detail.communityStrength,
            productionStatus: detail.status ?? current.productionStatus,
            imageUrl: detail.imageUrl ?? current.imageUrl,
            sourceExternalId: detail.htreviewsId ?? current.sourceExternalId,
            sourceNumericId: detail.sourceNumericId ?? current.sourceNumericId,
            rawSourceTags: serializeList(detail.rawTags.map((item) => item.trim()).filter(Boolean)),
            flavorProfiles: serializeList(taxonomy.flavorProfiles),
            flavors: serializeList(taxonomy.flavors),
            flavorTags: serializeList(taxonomy.flavorTags),
          },
        });

        updated += 1;
        if (detail.officialStrength || detail.communityStrength) {
          withStrength += 1;
        }
        if (taxonomy.flavors.length) {
          withFlavors += 1;
        }
        if (detail.rawTags.length) {
          withTags += 1;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[htreviews:backfill] failed for ${current.id}: ${message}`);
      }

      if ((updated + failed) % 100 === 0 || updated + failed === rows.length) {
        console.log(
          JSON.stringify({
            processed: updated + failed,
            total: rows.length,
            updated,
            failed,
            withStrength,
            withFlavors,
            withTags,
          }),
        );
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  await updateMixTaxonomy();

  console.log('[htreviews:backfill] completed');
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        updated,
        failed,
        withStrength,
        withFlavors,
        withTags,
        onlyMissingDescription,
        onlyIncomplete,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[htreviews:backfill] ${message}`);
  process.exit(1);
});
