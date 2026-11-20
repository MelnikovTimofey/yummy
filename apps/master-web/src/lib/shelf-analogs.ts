import type { ShelfAnalog } from '@/contracts';

// Аналоги табака на «Полке» (#482, PRD §9.3 п.6): порядок в списке — порядок замены.

export const moveAnalog = (ids: string[], index: number, delta: -1 | 1) => {
  const target = index + delta;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// Столбец «Аналоги» (#482): два первых в порядке замены, остальные — «ещё N».
export const analogCell = (analogs: ShelfAnalog[]) => ({
  head: analogs.slice(0, 2),
  rest: Math.max(0, analogs.length - 2),
  title: analogs.map((item) => `${item.manufacturer} ${item.name}`).join(', '),
});

export const withoutAnalog = (ids: string[], id: string) => ids.filter((item) => item !== id);

export const analogToastText = (tobaccoName: string, unblocked: Array<{ id: string; name: string }>) => {
  const head = `Аналог ${tobaccoName}.`;
  if (!unblocked.length) return head;
  const names = unblocked.map((mix) => `«${mix.name}»`).join(', ');
  return `${head} ${names} ${unblocked.length === 1 ? 'виден' : 'видны'} гостю с заменой.`;
};

// Граммов нет (#518): аналог или есть у гостя, или закончился.
export const analogStock = (analog: ShelfAnalog) => (analog.inStock ? 'есть' : 'закончился');
