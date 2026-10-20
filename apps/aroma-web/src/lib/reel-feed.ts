// Порядок ленты «Рилсы» (#263, #265, design/design_handoff_reels — «Порядок
// ленты», «Вошедший гость»): голова ленты, затем остальные доступные миксы
// каталога без повторов. Недоступные миксы уже отсекает backend.
//
// Голова — «Для вас» вошедшего гостя (режим personal, те же слоты и фразы, что
// на Подборе, #245) или подбор по вкусам: онбординга у гостя без входа, вкусов
// кабинета у вошедшего в режиме cold.

import { forYouSlots, type ForYouRow, type GuestForYouPersonal } from './for-you-copy';

/** `slot` — надпись слота «Для вас» вместо профилей, `reason` — причина под
 *  названием, `hint` — подсказка «Давно на одном вкусе» над «Шагом в сторону». */
export type ReelEntry<T> = { mix: T; slot: string | null; reason: string | null; hint: string | null };

export type ReelHead<T> = GuestForYouPersonal<T> | T[];

const plain = <T>(mix: T): ReelEntry<T> => ({ mix, slot: null, reason: null, hint: null });

const forYouEntries = <T>(response: GuestForYouPersonal<T>): ReelEntry<T>[] => {
  const slots = forYouSlots(response);
  const entry = (row: ForYouRow<T> | null, slot: string, hint: string | null = null) =>
    row ? [{ mix: row.mix, slot, reason: row.reason, hint }] : [];
  const fresh = [slots.hero, ...slots.taste].flatMap((row) => entry(row, 'Новое в вашем вкусе'));
  // Подсказка ведёт на «Шаг в сторону», как на Подборе: он идёт первым.
  return slots.hint
    ? [...entry(slots.sidestep, 'Шаг в сторону', slots.hint.text), ...fresh, ...entry(slots.again, 'Снова')]
    : [...fresh, ...entry(slots.sidestep, 'Шаг в сторону'), ...entry(slots.again, 'Снова')];
};

export function reelEntries<T extends { id: string }>(head: ReelHead<T>, catalog: T[]): ReelEntry<T>[] {
  const seen = new Set<string>();
  const first = Array.isArray(head) ? head.map(plain) : forYouEntries(head);
  return [...first, ...catalog.map(plain)].filter(({ mix }) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}

// Полоса над Подбором (#264): первые восемь рилсов ленты в её порядке.
export const reelStrip = <T extends { id: string }>(head: ReelHead<T>, catalog: T[]) =>
  reelEntries(head, catalog).slice(0, 8);

/** `head` и `catalog` — уже загруженные выдачи (`null` — ещё нет): их не
 *  запрашиваем повторно. Пустая голова — гость не прошёл онбординг. */
export async function loadReelFeed<T extends { id: string }>({
  head,
  catalog,
  fetchHead,
  fetchCatalog,
}: {
  head: ReelHead<T> | null;
  catalog: T[] | null;
  fetchHead: () => Promise<ReelHead<T>>;
  fetchCatalog: () => Promise<T[]>;
}): Promise<ReelEntry<T>[]> {
  const [first, all] = await Promise.all([head ?? fetchHead(), catalog ?? fetchCatalog()]);
  return reelEntries(first, all);
}
