// Лента «Рилсы» продолжает Подбор (#349, PRD §8.10): миксов, показанных на
// Подборе, в ней нет. Сначала подбор, не поместившийся на экран, затем остальные
// доступные миксы каталога без повторов, перемешанные заново при каждом открытии.
// Недоступные миксы уже отсекает backend.

import { forYouSlots, type GuestForYouPersonal } from './for-you-copy';

/** Подбор глазами ленты: `shown` — миксы на экране, `rest` — подбор, который не поместился. */
export type RecsPage<T> = { shown: T[]; rest: T[] };

/** Подбор по вкусам: герой и четыре «Тоже подходят». */
export const RECS_ON_SCREEN = 5;

export const recsPage = <T>(items: T[]): RecsPage<T> => ({
  shown: items.slice(0, RECS_ON_SCREEN),
  rest: items.slice(RECS_ON_SCREEN),
});

export const forYouPage = <T>(response: GuestForYouPersonal<T>): RecsPage<T> => {
  const { hero, taste, sidestep, again } = forYouSlots(response);
  const shown = [hero, ...taste, sidestep, again].flatMap((row) => (row ? [row.mix] : []));
  return { shown, rest: response.fresh.slice(1 + taste.length).map((card) => card.mix) };
};

/** Зерно перемешивания: одно на открытие, чтобы кадр при дотягивании совпал с первым рилсом. */
export const newReelSeed = () => Math.floor(Math.random() * 2 ** 32);

// mulberry32: повторяемый порядок по зерну.
const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Каталог приходит лучшими вперёд (рейтинг, затем «Покурить»). Сдвиг места на
// случайную долю длины каталога сохраняет перевес лучших, но в начале ленты
// может оказаться любой микс.
const shuffleBestFirst = <T>(items: T[], seed: number): T[] => {
  const random = seededRandom(seed);
  return items
    .map((item, rank) => ({ item, key: rank + random() * items.length }))
    .sort((left, right) => left.key - right.key)
    .map(({ item }) => item);
};

export function reelFeed<T extends { id: string }>(page: RecsPage<T>, catalog: T[], seed: number): T[] {
  const seen = new Set(page.shown.map((mix) => mix.id));
  return [...page.rest, ...shuffleBestFirst(catalog, seed)].filter((mix) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}
