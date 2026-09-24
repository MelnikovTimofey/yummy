import crypto from 'node:crypto';
import { prisma } from '../../db';
import { fetchHtReviewsCatalogSnapshot } from './catalog';
import { lineUrlFromTobaccoUrl } from './parser';
import type { HtReviewsImportOptions, HtReviewsImportedTobacco } from './types';

export type HtReviewsSyncOptions = HtReviewsImportOptions & {
  defaultInStock?: boolean;
};

export type HtReviewsSyncStats = {
  fetched: number;
  created: number;
  updated: number;
  skippedInactive: number;
  preservedStockCount: number;
  defaultInStock: boolean;
};

const PRODUCED_STATUS = 'Выпускается';

// Новые позиции заводим только выпускаемые, а заведённые обновляем всегда:
// так снятие с производства доходит до productionStatus, а не застывает.
export const decideTobaccoUpsert = (
  status: string | null,
  exists: boolean,
): 'create' | 'update' | 'skip' => {
  if (exists) {
    return 'update';
  }
  return status?.trim() === PRODUCED_STATUS ? 'create' : 'skip';
};

export const collectKnownLineUrls = (sourceUrls: Array<string | null>) => {
  const lineUrls = new Set<string>();
  for (const sourceUrl of sourceUrls) {
    const lineUrl = sourceUrl ? lineUrlFromTobaccoUrl(sourceUrl) : null;
    if (lineUrl) {
      lineUrls.add(lineUrl);
    }
  }
  return Array.from(lineUrls);
};

const loadKnownLineUrls = async () => {
  const records = await prisma.tobacco.findMany({
    where: { sourceKind: 'htreviews' },
    select: { sourceUrl: true },
  });
  return collectKnownLineUrls(records.map((record) => record.sourceUrl));
};

const toStableId = (item: HtReviewsImportedTobacco) => {
  if (item.sourceExternalId) {
    return `htreviews-${item.sourceExternalId.toLowerCase()}`;
  }

  if (item.sourceNumericId) {
    return `htreviews-${item.sourceNumericId}`;
  }

  return `htreviews-${crypto.createHash('sha1').update(item.sourceUrl).digest('hex').slice(0, 16)}`;
};

const serializeList = (items: string[]) => JSON.stringify(items);

const buildUpsertData = (item: HtReviewsImportedTobacco, inStock: boolean) => ({
  manufacturer: item.manufacturer,
  lineName: item.lineName ?? '',
  name: item.name,
  alias: item.alias,
  description: item.description,
  sourceKind: 'htreviews',
  sourceUrl: item.sourceUrl,
  sourceExternalId: item.sourceExternalId,
  sourceNumericId: item.sourceNumericId,
  country: item.country,
  officialStrength: item.officialStrength,
  communityStrength: item.communityStrength,
  productionStatus: item.status,
  imageUrl: item.imageUrl,
  rawSourceTags: serializeList(item.rawTags),
  flavorProfiles: serializeList(item.taxonomyCandidate.flavorProfiles),
  flavors: serializeList(item.taxonomyCandidate.flavors),
  flavorTags: serializeList(item.taxonomyCandidate.flavorTags),
  inStock,
});

const findExistingRecord = async (item: HtReviewsImportedTobacco) => {
  if (item.sourceExternalId) {
    const bySourceId = await prisma.tobacco.findUnique({
      where: {
        sourceExternalId: item.sourceExternalId,
      },
    });
    if (bySourceId) {
      return bySourceId;
    }
  }

  const byStableId = await prisma.tobacco.findUnique({
    where: {
      id: toStableId(item),
    },
  });
  if (byStableId) {
    return byStableId;
  }

  const bySourceUrl = await prisma.tobacco.findFirst({
    where: {
      sourceUrl: item.sourceUrl,
    },
  });
  if (bySourceUrl) {
    return bySourceUrl;
  }

  // HTReviews can legitimately expose duplicate manufacturer/line/name combinations
  // with different source IDs and URLs, so only fall back to the name key when the
  // source identity is genuinely missing.
  if (item.sourceExternalId || item.sourceNumericId) {
    return null;
  }

  return prisma.tobacco.findFirst({
    where: {
      manufacturer: item.manufacturer,
      lineName: item.lineName ?? '',
      name: item.name,
    },
  });
};

const logUpsertProgress = (message: string) => {
  console.log(`[htreviews:sync] ${new Date().toISOString()} ${message}`);
};

export const syncHtReviewsCatalog = async (
  options: HtReviewsSyncOptions = {},
): Promise<HtReviewsSyncStats> => {
  const knownLineUrls = options.knownLineUrls ?? (options.brandUrls?.length ? [] : await loadKnownLineUrls());
  logUpsertProgress(`phase=known-lines total=${knownLineUrls.length}`);
  const snapshot = await fetchHtReviewsCatalogSnapshot({ ...options, knownLineUrls });
  const defaultInStock = options.defaultInStock ?? false;

  let created = 0;
  let updated = 0;
  let skippedInactive = 0;
  let preservedStockCount = 0;

  logUpsertProgress(
    `phase=upsert total=${snapshot.items.length} defaultInStock=${defaultInStock}`,
  );

  let processed = 0;
  for (const item of snapshot.items) {
    processed += 1;
    const existing = await findExistingRecord(item);
    const decision = decideTobaccoUpsert(item.status, Boolean(existing));

    if (decision === 'skip') {
      skippedInactive += 1;
    } else if (existing) {
      if (existing.inStock !== defaultInStock) {
        preservedStockCount += 1;
      }
      await prisma.tobacco.update({
        where: {
          id: existing.id,
        },
        data: buildUpsertData(item, existing.inStock),
      });
      updated += 1;
    } else {
      await prisma.tobacco.create({
        data: {
          id: toStableId(item),
          ...buildUpsertData(item, defaultInStock),
        },
      });
      created += 1;
    }

    if (processed % 50 === 0 || processed === snapshot.items.length) {
      logUpsertProgress(
        `upsert ${processed}/${snapshot.items.length} created=${created} updated=${updated}` +
        ` skippedInactive=${skippedInactive} preservedStock=${preservedStockCount}`,
      );
    }
  }

  return {
    fetched: snapshot.tobaccoCount,
    created,
    updated,
    skippedInactive,
    preservedStockCount,
    defaultInStock,
  };
};
