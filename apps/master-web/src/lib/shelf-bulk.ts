import type { ShelfEmptyManyResponse, ShelfRestockManyResponse, ShelfRow } from '../contracts';
import { formatNumber, shelfRowMenu } from './shelf';

// Выбор нескольких табаков на полке и действия разом (#333, #517, #518,
// design/design_handoff_shelf_status, #shot=shelf-bulk).

export const toggleSelected = (selected: string[], id: string) =>
  selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];

// Shift + клик: строки от прошлого клика до текущего — в выделение, в порядке таблицы.
export const selectRange = (order: string[], anchor: string | null, target: string, selected: string[]) => {
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to = order.indexOf(target);
  if (from < 0 || to < 0) return toggleSelected(selected, target);
  const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
  return [...selected, ...range.filter((id) => !selected.includes(id))];
};

// Чекбокс «выбрать все» в шапке таблицы.
export const headCheck = (selected: string[], shownIds: string[]): boolean | 'mixed' => {
  if (!selected.length || !shownIds.length) return false;
  return shownIds.every((id) => selected.includes(id)) ? true : 'mixed';
};

export type BulkSummary = {
  count: number;
  // «Cane Mint, Blackcurrant, Pear lemonade и ещё 2».
  names: string;
  // Сколько отметятся «Закончились»: уже закончившиеся и «в плане» пропускаются.
  emptyCount: number;
  // Сколько вернутся в наличие: только закончившиеся.
  restockCount: number;
  // Все выбранные на стопе — на панели «Снять стоп»; все держим — «Не держать постоянно».
  allStopped: boolean;
  allKept: boolean;
};

export const bulkSummary = (rows: ShelfRow[]): BulkSummary => {
  const first = rows.slice(0, 3).map((row) => row.tobacco.name).join(', ');
  return {
    count: rows.length,
    names: rows.length > 3 ? `${first} и ещё ${formatNumber(rows.length - 3)}` : first,
    emptyCount: rows.filter((row) => shelfRowMenu(row).canEmpty).length,
    restockCount: rows.filter((row) => shelfRowMenu(row).canRestock).length,
    allStopped: rows.length > 0 && rows.every((row) => row.stopped),
    allKept: rows.length > 0 && rows.every((row) => row.keepStocked),
  };
};

const skippedText = (count: number, reasons: Array<string | null>) =>
  count ? `Пропущено ${formatNumber(count)}: ${reasons.filter(Boolean).join(' или ')}.` : '';

const sentence = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}.` : '');

// Тост «Закончились»: одна отмена на всех, пропущенные — числом. Текст —
// предложениями, как у тоста одного табака.
export const bulkEmptyToast = (response: ShelfEmptyManyResponse) => {
  const skipped = skippedText(response.skipped.length, [
    response.skipped.some((skip) => skip.reason === 'out') ? 'уже закончились' : null,
    response.skipped.some((skip) => skip.reason === 'plan') ? 'в плане' : null,
  ]);
  const title = `Закончились: ${formatNumber(response.done.length)}`;
  if (!response.done.length) return { title, text: skipped };
  const kept = response.items.filter((item) => item.keepStocked).length;
  const tail = [
    response.hiddenMixes ? `скрыто миксов: ${formatNumber(response.hiddenMixes)}` : null,
    kept ? `в заявку добавлено: ${formatNumber(kept)}` : null,
  ].filter(Boolean).join(', ');
  return { title, text: ['Гости их не видят.', sentence(tail), skipped].filter(Boolean).join(' ') };
};

export const bulkRestockToast = (response: ShelfRestockManyResponse) => {
  const skipped = skippedText(response.skipped.length, [
    response.skipped.some((skip) => skip.reason === 'in') ? 'уже есть' : null,
    response.skipped.some((skip) => skip.reason === 'plan') ? 'в плане' : null,
  ]);
  return {
    title: `Снова есть: ${formatNumber(response.done.length)}`,
    text: [response.done.length ? 'Вернулись на витрину.' : '', skipped].filter(Boolean).join(' '),
  };
};

// Строка сразу после «Закончились», до ответа сервера.
export const optimisticEmpty = (row: ShelfRow, at: string): ShelfRow => ({ ...row, outAt: at, guestAvailable: false });

export const bulkStopToast = (count: number, stopped: boolean) =>
  stopped
    ? { title: `Стоп для гостей: ${formatNumber(count)}`, text: 'Гости их не видят.' }
    : { title: `Стоп снят: ${formatNumber(count)}`, text: 'Гости снова видят те, что есть на полке.' };

export const bulkKeepToast = (count: number, keep: boolean) =>
  keep
    ? { title: `Держим постоянно: ${formatNumber(count)}`, text: 'Когда закончатся, попадут в заявку.' }
    : { title: `Не держим постоянно: ${formatNumber(count)}`, text: 'В заявку больше не попадут.' };

export const bulkRemoveToast = (count: number, failed: number) => ({
  title: `Убраны с полки: ${formatNumber(count)}`,
  text: ['История осталась.', failed ? `Не убрано ${formatNumber(failed)}, попробуйте ещё раз.` : ''].filter(Boolean).join(' '),
});
