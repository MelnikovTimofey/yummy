import crypto from 'node:crypto';
import { prisma } from '../../db';
import { fetchHtReviewsCatalogSnapshot } from './catalog';
import type { HtReviewsImportOptions, HtReviewsImportedTobacco } from './types';

export type HtReviewsSyncOptions = HtReviewsImportOptions & {
  defaultInStock?: boolean;
};

export type HtReviewsSyncStats = {
  fetched: number;
  created: number;
  updated: number;
  preservedStockCount: number;
  defaultInStock: boolean;
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
  flavorProfiles: serializeList(item.nomadCandidate.flavorProfiles),
  flavors: serializeList(item.nomadCandidate.flavors),
  flavorTags: serializeList(item.nomadCandidate.flavorTags),
  inStock,
});

const findExistingRecord = async (item: HtReviewsImportedTobacco) => {
  if (item.sourceExternalId) {
    const bySourceId = await prisma.nomadTobacco.findUnique({
      where: {
        sourceExternalId: item.sourceExternalId,
      },
    });
    if (bySourceId) {
      return bySourceId;
    }
  }

  const byStableId = await prisma.nomadTobacco.findUnique({
    where: {
      id: toStableId(item),
    },
  });
  if (byStableId) {
    return byStableId;
  }

  const bySourceUrl = await prisma.nomadTobacco.findFirst({
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

  return prisma.nomadTobacco.findFirst({
    where: {
      manufacturer: item.manufacturer,
      lineName: item.lineName ?? '',
      name: item.name,
    },
  });
};

export const syncHtReviewsCatalogToNomad = async (
  options: HtReviewsSyncOptions = {},
): Promise<HtReviewsSyncStats> => {
  const snapshot = await fetchHtReviewsCatalogSnapshot(options);
  const defaultInStock = options.defaultInStock ?? false;

  let created = 0;
  let updated = 0;
  let preservedStockCount = 0;

  for (const item of snapshot.items) {
    const existing = await findExistingRecord(item);
    const nextInStock = existing ? existing.inStock : defaultInStock;
    if (existing && existing.inStock !== defaultInStock) {
      preservedStockCount += 1;
    }

    const data = buildUpsertData(item, nextInStock);

    if (existing) {
      await prisma.nomadTobacco.update({
        where: {
          id: existing.id,
        },
        data,
      });
      updated += 1;
      continue;
    }

    await prisma.nomadTobacco.create({
      data: {
        id: toStableId(item),
        ...data,
      },
    });
    created += 1;
  }

  return {
    fetched: snapshot.tobaccoCount,
    created,
    updated,
    preservedStockCount,
    defaultInStock,
  };
};
