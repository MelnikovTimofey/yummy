// Лента «Рилсы» продолжает Подбор (#349, PRD §8.10): миксов, показанных на
// Подборе, в ней нет. Сначала подбор, не поместившийся на экран, затем остальные
// доступные миксы каталога без повторов. Недоступные миксы уже отсекает backend.

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

export function reelFeed<T extends { id: string }>(page: RecsPage<T>, catalog: T[]): T[] {
  const seen = new Set(page.shown.map((mix) => mix.id));
  return [...page.rest, ...catalog].filter((mix) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}
