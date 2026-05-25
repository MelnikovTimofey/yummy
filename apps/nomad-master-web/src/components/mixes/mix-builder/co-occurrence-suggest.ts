import type { InventoryTobacco, MixRecord } from '@/contracts';

export type CoOccurrenceSuggestion = {
  tobacco: InventoryTobacco;
  reason: string;
};

// Из прототипа master/mix-builder.jsx: getCoOccurrenceSuggestions.
// Считаем для каждого табака, сколько раз он встречается в миксах,
// где есть пересечение с текущим составом. Берём топ-4 по score.
export const getCoOccurrenceSuggestions = (
  currentIds: string[],
  allMixes: MixRecord[],
  allTobaccos: InventoryTobacco[],
): CoOccurrenceSuggestion[] => {
  if (!currentIds.length) return [];

  const scoreById = new Map<string, number>();
  const reasonById = new Map<string, string>();

  allMixes.forEach((mix) => {
    const componentIds = mix.components.map((c) => c.tobaccoId);
    const overlap = componentIds.filter((id) => currentIds.includes(id));
    if (overlap.length === 0) return;
    componentIds.forEach((id) => {
      if (currentIds.includes(id)) return;
      const score = (scoreById.get(id) ?? 0) + overlap.length;
      scoreById.set(id, score);
      if (!reasonById.has(id)) reasonById.set(id, mix.name);
    });
  });

  return Array.from(scoreById.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([id]) => {
      const tobacco = allTobaccos.find((t) => t.id === id);
      if (!tobacco) return null;
      return { tobacco, reason: `Часто берут с ${reasonById.get(id) ?? ''}` };
    })
    .filter((item): item is CoOccurrenceSuggestion => Boolean(item));
};
