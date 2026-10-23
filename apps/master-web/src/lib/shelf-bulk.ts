import type { ShelfEmptyManyResponse, ShelfRow } from '../contracts';
import { formatNumber, shelfRowMenu } from './shelf';

// Выбор нескольких табаков на полке и действия разом (#333,
// design/design_handoff_purchase_analytics, #shot=shelf-bulk, shelf-bulk-done, mobile-bulk).

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
  skipCount: number;
  // Все выбранные на стопе — на панели «Снять стоп».
  allStopped: boolean;
};

export const bulkSummary = (rows: ShelfRow[]): BulkSummary => {
  const emptyCount = rows.filter((row) => shelfRowMenu(row).canEmpty).length;
  const first = rows.slice(0, 3).map((row) => row.tobacco.name).join(', ');
  return {
    count: rows.length,
    names: rows.length > 3 ? `${first} и ещё ${formatNumber(rows.length - 3)}` : first,
    emptyCount,
    skipCount: rows.length - emptyCount,
    allStopped: rows.length > 0 && rows.every((row) => row.stopped),
  };
};

const skipReason = (skipped: ShelfEmptyManyResponse['skipped']) => {
  const out = skipped.some((skip) => skip.reason === 'out');
  const plan = skipped.some((skip) => skip.reason === 'plan');
  return out && plan ? 'уже закончились или в плане' : plan ? 'в плане' : 'уже закончились';
};

// Тост #shot=shelf-bulk-done: одна отмена на всех, пропущенные — числом.
export const bulkEmptyToast = (response: ShelfEmptyManyResponse) => {
  const skipped = response.skipped.length ? `Пропущено ${formatNumber(response.skipped.length)}: ${skipReason(response.skipped)}.` : '';
  const title = `Закончились: ${formatNumber(response.done.length)}`;
  if (!response.done.length) return { title, text: skipped };
  const parts = ['гости их больше не видят.'];
  if (response.hiddenMixes) parts.push(`Миксов скрыто: ${formatNumber(response.hiddenMixes)}.`);
  if (response.items.some((item) => item.keepStocked)) parts.push('Держим постоянно — добавлены в «К заказу».');
  if (skipped) parts.push(skipped);
  return { title, text: parts.join(' ') };
};

// Строка сразу после «Закончились», до ответа сервера: отметка 0 г от мастера.
export const optimisticEmpty = (row: ShelfRow, at: string): ShelfRow => ({
  ...row,
  status: 'out',
  guestAvailable: false,
  leftGrams: 0,
  leftSource: 'mark',
  daysLeft: null,
  endsAt: null,
  lastCount: { at, grams: 0, fraction: null },
});

export const bulkStopToast = (count: number, stopped: boolean) =>
  stopped
    ? { title: `Стоп для гостей: ${formatNumber(count)}`, text: 'гости их больше не видят.' }
    : { title: `Стоп снят: ${formatNumber(count)}`, text: 'гости снова видят те, что есть на полке.' };

export const bulkKeepToast = (count: number, keep: boolean) =>
  keep
    ? { title: `Держим постоянно: ${formatNumber(count)}`, text: 'закончатся — попадут в «К заказу».' }
    : { title: `Не держим постоянно: ${formatNumber(count)}`, text: 'в «К заказу» больше не попадут.' };
