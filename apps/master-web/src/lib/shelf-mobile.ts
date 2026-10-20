import { formatCount, type ShelfCounters, type ShelfOpenPack, type ShelfRow, type ShelfView } from '../contracts';
import { MARK_OPTIONS, formatNumber, formatShelfDate, fractionLabel, type ShelfStatusKey } from './shelf';

// «Полка» на телефоне (#215): мастер у стойки отмечает «Закончилась» и остаток.

// Чипы прокручиваются по горизонтали, поэтому первыми — те, ради которых
// открывают полку с телефона.
export const SHELF_MOBILE_CHIPS: Array<[ShelfStatusKey, string]> = [
  ['ending', 'Заканчивается'],
  ['last', 'Последняя'],
  ['out', 'Закончились'],
  ['all', 'Все'],
  ['ok', 'Есть'],
  ['stop', 'Стоп'],
  ['plan', 'В плане'],
];

export const defaultMobileShelfStatus = (counters: Pick<ShelfCounters, 'ending'>): ShelfStatusKey =>
  counters.ending > 0 ? 'ending' : 'all';

export type ShelfMobileAction = {
  kind: 'empty' | 'check' | 'unstop' | 'none';
  label: string;
  disabled: boolean;
};

export const shelfMobileAction = (row: ShelfRow): ShelfMobileAction => {
  switch (row.status) {
    case 'out':
    case 'plan':
      return { kind: 'none', label: 'в «К заказу»', disabled: true };
    case 'stop':
      return { kind: 'unstop', label: 'Снять стоп', disabled: false };
    case 'check':
      return { kind: 'check', label: 'Проверить', disabled: false };
    default:
      return { kind: 'empty', label: 'Закончилась', disabled: !row.openPacks.length };
  }
};

export const sheetEmptyLabel = (row: ShelfRow) =>
  row.openPacks.length <= 1 && row.sealedCount === 0 ? 'Закончилась · запаса нет' : 'Закончилась';

// Backend отмечает и опустошает самую старую открытую банку.
export const markTargetPack = (row: ShelfRow): ShelfOpenPack | null =>
  [...row.openPacks].sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null;

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const relativeDay = (iso: string, now = new Date()) => {
  const days = Math.round((dayStart(now) - dayStart(new Date(iso))) / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return formatShelfDate(iso);
};

// marks === null — отметки ещё не загружены.
export const openPackLine = (row: ShelfRow, marks: Array<{ at: string; fraction: number }> | null, now = new Date()) => {
  const pack = markTargetPack(row);
  if (!pack) return row.sealedCount ? `Открытой банки нет · в запасе: ${formatNumber(row.sealedCount)}` : 'Банок нет';
  const title = row.openPacks.length > 1 ? `Открытая банка 1 из ${row.openPacks.length}` : 'Открытая банка';
  const parts = [title, `вскрыта ${formatShelfDate(pack.openedAt)}`];
  if (marks) {
    const last = marks[marks.length - 1];
    parts.push(last ? `отметка ${fractionLabel(last.fraction)} ${relativeDay(last.at, now)}` : 'отметок нет');
  }
  return parts.join(' · ');
};

export const SHEET_MARK_OPTIONS: Array<{ label: string; value: number; hint?: string }> = [
  { label: '1', value: 1, hint: 'полная' },
  ...MARK_OPTIONS,
];

export const shelfMobileSummary = (view: {
  counters: Pick<ShelfView['counters'], 'all'>;
  totals: Pick<ShelfView['totals'], 'packs'>;
  today: ShelfView['today'];
}) =>
  [
    formatCount(view.counters.all, ['позиция', 'позиции', 'позиций']),
    formatCount(view.totals.packs, ['банка', 'банки', 'банок']),
    `сегодня ≈ ${formatNumber(view.today.grams)} г, ${formatCount(Math.round(view.today.bowls), ['чаша', 'чаши', 'чаш'])}`,
  ].join(' · ');
