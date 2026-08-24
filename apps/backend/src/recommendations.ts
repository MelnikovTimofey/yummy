import type { MixView } from './state';
import { getGuestCatalogMixes } from './state';

export type OnboardingInput = {
  likedProfiles: string[];
  likedFlavors: string[];
  limit?: number;
};

export type OnboardingOptions = {
  profiles: string[];
  flavors: string[];
  profileCounts: Record<string, number>;
  flavorCounts: Record<string, number>;
};

export type RecommendationMix = {
  id: string;
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  matchedProfiles: string[];
  matchedFlavors: string[];
  score: number;
  avgRating: number;
  smokeCtaCount: number;
  components: Array<{
    id: string;
    name: string;
    manufacturer: string;
    flavors: string[];
    proportion: number;
  }>;
};

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeInput = (items: string[]) =>
  unique(items.map((item) => item.trim().toLowerCase()).filter(Boolean));

const byRu = (left: string, right: string) => left.localeCompare(right, 'ru');

const countMixesBy = (mixes: MixView[], pick: (mix: MixView) => string[]) => {
  const counts = new Map<string, number>();

  mixes.forEach((mix) => {
    unique(pick(mix)).forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
  });

  return counts;
};

// Опции строятся по миксам гостевого каталога, а не по инвентарю табаков:
// выбор в онбординге должен вести хотя бы к одной рекомендации, иначе гость
// набирает состав, которого в картотеке нет (#36). Счётчики отдаются сразу —
// по ним онбординг показывает, сколько миксов стоит за каждой опцией.
export const getOnboardingOptions = async (): Promise<OnboardingOptions> => {
  const mixes = await getGuestCatalogMixes();

  const profileCounts = countMixesBy(mixes, (mix) => mix.flavorProfiles);
  const flavorCounts = countMixesBy(mixes, (mix) => mix.flavors);

  return {
    profiles: Array.from(profileCounts.keys()).sort(byRu),
    flavors: Array.from(flavorCounts.keys()).sort(byRu),
    profileCounts: Object.fromEntries(profileCounts),
    flavorCounts: Object.fromEntries(flavorCounts),
  };
};

export const getInStockMixes = () => getGuestCatalogMixes();

// Спрос — сырой счётчик событий «Покурить», он растёт неограниченно. Нормируем
// его по самому выбираемому миксу, иначе со временем бонус за спрос перевесит
// совпадение по онбордингу и рекомендации перестанут зависеть от ответов гостя
// (PRD §7.3). Потолок в 30 баллов держит вклад спроса на уровне прежнего.
const DEMAND_BONUS_CEILING = 30;

const calculateScore = (
  mix: MixView,
  likedProfiles: string[],
  likedFlavors: string[],
  maxSmokeCtaCount: number,
) => {
  const profiles = unique(mix.flavorProfiles.map((profile) => profile.toLowerCase()));
  const flavors = unique(mix.flavors.map((flavor) => flavor.toLowerCase()));

  const profileHits = profiles.filter((profile) => likedProfiles.includes(profile)).length;
  const flavorHits = flavors.filter((flavor) => likedFlavors.includes(flavor)).length;
  const ratingBonus = mix.avgRating * 12;
  const demandBonus = maxSmokeCtaCount > 0
    ? (mix.smokeCtaCount / maxSmokeCtaCount) * DEMAND_BONUS_CEILING
    : 0;

  return profileHits * 110 + flavorHits * 75 + ratingBonus + demandBonus;
};

export const getRecommendations = async (input: OnboardingInput): Promise<RecommendationMix[]> => {
  const likedProfiles = normalizeInput(input.likedProfiles);
  const likedFlavors = normalizeInput(input.likedFlavors);
  const limit = Math.max(1, Math.min(input.limit ?? 6, 12));

  const mixes = await getInStockMixes();
  const maxSmokeCtaCount = mixes.reduce((max, mix) => Math.max(max, mix.smokeCtaCount), 0);

  return mixes
    .map((mix) => {
      return {
        id: mix.id,
        name: mix.name,
        description: mix.description,
        flavorProfiles: [...mix.flavorProfiles],
        flavors: [...mix.flavors],
        // Скоринг мягкий: микс попадает в выдачу и при нулевом совпадении, за
        // счёт рейтинга и спроса. Различение «совпало / не совпало» нужно, чтобы
        // экран результатов не выдавал популярное за подобранное (#36).
        matchedProfiles: mix.flavorProfiles.filter((profile) =>
          likedProfiles.includes(profile.toLowerCase()),
        ),
        matchedFlavors: mix.flavors.filter((flavor) => likedFlavors.includes(flavor.toLowerCase())),
        score: Number(calculateScore(mix, likedProfiles, likedFlavors, maxSmokeCtaCount).toFixed(2)),
        avgRating: mix.avgRating,
        smokeCtaCount: mix.smokeCtaCount,
        components: mix.components.map((item) => ({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          flavors: [...item.flavors],
          proportion: item.proportion,
        })),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }
      return right.smokeCtaCount - left.smokeCtaCount;
    })
    .slice(0, limit);
};
