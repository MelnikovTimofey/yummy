// Порядок ленты «Рилсы» (#263, design/design_handoff_reels — «Порядок ленты»):
// подбор по онбордингу, затем остальные доступные миксы каталога без повторов.
// Недоступные миксы уже отсекает backend.

type Taste = { likedProfiles: string[]; likedFlavors: string[] };

export function orderReelFeed<T extends { id: string }>(recommended: T[], catalog: T[]): T[] {
  const seen = new Set<string>();
  return [...recommended, ...catalog].filter((mix) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}

// Полоса над Подбором (#264): первые восемь рилсов ленты в её порядке.
export const reelStrip = <T extends { id: string }>(recommended: T[], catalog: T[]): T[] =>
  orderReelFeed(recommended, catalog).slice(0, 8);

/** `taste: null` — гость не прошёл онбординг. `recommendations` и `catalog` —
 *  уже загруженные выдачи: их не запрашиваем повторно. */
export async function loadReelFeed<T extends { id: string }>({
  taste,
  recommendations,
  catalog,
  fetchRecommendations,
  fetchCatalog,
}: {
  taste: Taste | null;
  recommendations: T[] | null;
  catalog: T[] | null;
  fetchRecommendations: (taste: Taste) => Promise<T[]>;
  fetchCatalog: () => Promise<T[]>;
}): Promise<T[]> {
  const hasTaste = Boolean(taste && (taste.likedProfiles.length || taste.likedFlavors.length));
  const [recommended, all] = await Promise.all([
    recommendations ?? (hasTaste && taste ? fetchRecommendations(taste) : Promise.resolve([])),
    catalog ?? fetchCatalog(),
  ]);
  return orderReelFeed(recommended, all);
}

const pad = (n: number) => String(n).padStart(2, '0');

export const reelCounter = (index: number, total: number) => `${pad(index + 1)} · из ${pad(total)}`;
