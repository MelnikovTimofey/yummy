import { prisma } from './db';

export type IdeaSourceTobacco = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  inStock: boolean;
  archived: boolean;
  sourceUrl: string | null;
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  viewsCount: number | null;
};

export type IdeaSourceMix = {
  available: boolean;
  componentIds: string[];
};

export type CatalogIdea = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  flavorProfiles: string[];
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  viewsCount: number | null;
  sourceUrl: string;
  why?: string;
};

export type CatalogIdeas = {
  popularOnShelfBrands: CatalogIdea[];
  topRated: CatalogIdea[];
  likeFastMoving: CatalogIdea[];
};

const IDEAS_LIMIT = 12;
const FAST_MOVING_LIMIT = 10;
const PRIOR_RATING = 4.2;
const PRIOR_WEIGHT = 50;

const normalize = (value: string) => value.trim().toLowerCase();

// Сглаживание к средней по каталогу: 5,0 с тремя оценками не обгоняет 4,7 с тысячей.
export const bayesianRating = (rating: number | null, ratingsCount: number | null) => {
  const n = rating === null ? 0 : ratingsCount ?? 0;
  return ((rating ?? 0) * n + PRIOR_RATING * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
};

const byBayesian = (left: IdeaSourceTobacco, right: IdeaSourceTobacco) =>
  bayesianRating(right.rating, right.ratingsCount) - bayesianRating(left.rating, left.ratingsCount)
  || left.name.localeCompare(right.name, 'ru');

const toIdea = (tobacco: IdeaSourceTobacco, why?: string): CatalogIdea => ({
  id: tobacco.id,
  manufacturer: tobacco.manufacturer,
  lineName: tobacco.lineName,
  name: tobacco.name,
  flavorProfiles: tobacco.flavorProfiles,
  rating: tobacco.rating,
  ratingsCount: tobacco.ratingsCount,
  reviewsCount: tobacco.reviewsCount,
  viewsCount: tobacco.viewsCount,
  sourceUrl: tobacco.sourceUrl ?? '',
  ...(why ? { why } : {}),
});

const tasteKeys = (tobacco: IdeaSourceTobacco) =>
  new Set([
    ...tobacco.flavorProfiles.map((item) => `profile:${normalize(item)}`),
    ...tobacco.flavors.map((item) => `flavor:${normalize(item)}`),
  ]);

// Пока расхода нет (срез 4 эпика #152), «быстро уходит» — табаки полки, чаще
// всего встречающиеся в опубликованных миксах. После среза 4 источником станет
// топ по расходу.
const pickFastMoving = (shelf: IdeaSourceTobacco[], mixes: IdeaSourceMix[]) => {
  const usage = new Map<string, number>();
  for (const mix of mixes.filter((item) => item.available)) {
    for (const id of new Set(mix.componentIds)) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  }

  return shelf
    .filter((tobacco) => (usage.get(tobacco.id) ?? 0) > 0)
    .sort((left, right) =>
      (usage.get(right.id) ?? 0) - (usage.get(left.id) ?? 0) || left.name.localeCompare(right.name, 'ru'),
    )
    .slice(0, FAST_MOVING_LIMIT);
};

const buildLikeFastMoving = (candidates: IdeaSourceTobacco[], fastMoving: IdeaSourceTobacco[]) => {
  const sources = fastMoving.map((tobacco) => ({ tobacco, keys: tasteKeys(tobacco) }));

  const matches = candidates.flatMap((candidate) => {
    const keys = tasteKeys(candidate);
    let best: { source: IdeaSourceTobacco; overlap: number } | null = null;
    for (const source of sources) {
      const overlap = Array.from(keys).filter((key) => source.keys.has(key)).length;
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { source: source.tobacco, overlap };
      }
    }
    return best ? [{ candidate, ...best }] : [];
  });

  return matches
    .sort((left, right) => right.overlap - left.overlap || byBayesian(left.candidate, right.candidate))
    .slice(0, IDEAS_LIMIT)
    .map((match) => toIdea(match.candidate, `как ${match.source.name}`));
};

export const buildCatalogIdeas = (tobaccos: IdeaSourceTobacco[], mixes: IdeaSourceMix[]): CatalogIdeas => {
  const shelf = tobaccos.filter((tobacco) => tobacco.inStock && !tobacco.archived);
  const candidates = tobaccos.filter((tobacco) => !tobacco.inStock && !tobacco.archived && tobacco.sourceUrl);
  const shelfBrands = new Set(shelf.map((tobacco) => normalize(tobacco.manufacturer)));

  const popularOnShelfBrands = candidates
    .filter((tobacco) => tobacco.viewsCount !== null && shelfBrands.has(normalize(tobacco.manufacturer)))
    .sort((left, right) => (right.viewsCount ?? 0) - (left.viewsCount ?? 0) || byBayesian(left, right))
    .slice(0, IDEAS_LIMIT)
    .map((tobacco) => toIdea(tobacco));

  const topRated = candidates
    .filter((tobacco) => tobacco.rating !== null && (tobacco.ratingsCount ?? 0) >= 1)
    .sort(byBayesian)
    .slice(0, IDEAS_LIMIT)
    .map((tobacco) => toIdea(tobacco));

  return {
    popularOnShelfBrands,
    topRated,
    likeFastMoving: buildLikeFastMoving(candidates, pickFastMoving(shelf, mixes)),
  };
};

const parseList = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

export const getCatalogIdeas = async (): Promise<CatalogIdeas> => {
  const [tobaccos, mixes] = await Promise.all([
    prisma.tobacco.findMany({
      where: { archived: false },
      select: {
        id: true,
        manufacturer: true,
        lineName: true,
        name: true,
        flavorProfiles: true,
        flavors: true,
        inStock: true,
        archived: true,
        sourceUrl: true,
        rating: true,
        ratingsCount: true,
        reviewsCount: true,
        viewsCount: true,
      },
    }),
    prisma.mix.findMany({
      where: { available: true },
      select: { available: true, components: { select: { tobaccoId: true } } },
    }),
  ]);

  return buildCatalogIdeas(
    tobaccos.map((tobacco) => ({
      ...tobacco,
      flavorProfiles: parseList(tobacco.flavorProfiles),
      flavors: parseList(tobacco.flavors),
    })),
    mixes.map((mix) => ({ available: mix.available, componentIds: mix.components.map((item) => item.tobaccoId) })),
  );
};
