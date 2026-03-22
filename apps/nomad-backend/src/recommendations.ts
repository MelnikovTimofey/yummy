import { Mix, Tobacco, mixes, tobaccos } from './catalog';

export type OnboardingInput = {
  likedProfiles: string[];
  likedFlavors: string[];
  limit?: number;
};

export type RecommendationMix = {
  id: string;
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  score: number;
  avgRating: number;
  popularity: number;
  components: Array<{
    id: string;
    name: string;
    manufacturer: string;
    flavors: string[];
  }>;
};

const tobaccoById = new Map(tobaccos.map((item) => [item.id, item]));

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeInput = (items: string[]) =>
  unique(items.map((item) => item.trim().toLowerCase()).filter(Boolean));

const getMixTobaccos = (mix: Mix) =>
  mix.componentIds
    .map((componentId) => tobaccoById.get(componentId))
    .filter((item): item is Tobacco => Boolean(item));

export const getOnboardingOptions = () => {
  const inStockTobaccos = tobaccos.filter((item) => item.inStock);

  return {
    profiles: unique(inStockTobaccos.flatMap((item) => item.flavorProfiles)).sort(),
    flavors: unique(inStockTobaccos.flatMap((item) => item.flavors)).sort(),
  };
};

export const getInStockMixes = () =>
  mixes.filter((mix) => getMixTobaccos(mix).length === mix.componentIds.length && getMixTobaccos(mix).every((item) => item.inStock));

const calculateScore = (
  mix: Mix,
  mixTobaccos: Tobacco[],
  likedProfiles: string[],
  likedFlavors: string[],
) => {
  const profiles = unique(mixTobaccos.flatMap((item) => item.flavorProfiles));
  const flavors = unique(mixTobaccos.flatMap((item) => item.flavors.map((flavor) => flavor.toLowerCase())));

  const profileHits = profiles.filter((profile) => likedProfiles.includes(profile)).length;
  const flavorHits = flavors.filter((flavor) => likedFlavors.includes(flavor)).length;
  const ratingBonus = mix.avgRating * 12;
  const popularityBonus = mix.popularity * 0.35;

  return profileHits * 110 + flavorHits * 75 + ratingBonus + popularityBonus;
};

export const getRecommendations = (input: OnboardingInput): RecommendationMix[] => {
  const likedProfiles = normalizeInput(input.likedProfiles);
  const likedFlavors = normalizeInput(input.likedFlavors);
  const limit = Math.max(1, Math.min(input.limit ?? 6, 12));

  return getInStockMixes()
    .map((mix) => {
      const mixTobaccos = getMixTobaccos(mix);
      const flavorProfiles = unique(mixTobaccos.flatMap((item) => item.flavorProfiles));
      const flavors = unique(mixTobaccos.flatMap((item) => item.flavors));

      return {
        id: mix.id,
        name: mix.name,
        description: mix.description,
        flavorProfiles,
        flavors,
        score: Number(calculateScore(mix, mixTobaccos, likedProfiles, likedFlavors).toFixed(2)),
        avgRating: mix.avgRating,
        popularity: mix.popularity,
        components: mixTobaccos.map((item) => ({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          flavors: item.flavors,
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
      return right.popularity - left.popularity;
    })
    .slice(0, limit);
};
