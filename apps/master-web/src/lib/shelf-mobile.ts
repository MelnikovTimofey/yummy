import { formatCount, type ShelfCounters, type ShelfRow, type ShelfView } from '../contracts';
import { formatGrams, formatNumber, formatShelfDate, type ShelfStatusKey } from './shelf';

// «Полка» на телефоне (#215, #306): мастер у стойки жмёт «Закончился» и,
// когда удобно, отмечает остаток.

// Чипы прокручиваются по горизонтали, поэтому первыми — те, ради которых
// открывают полку с телефона.
export const SHELF_MOBILE_CHIPS: Array<[ShelfStatusKey, string]> = [
  ['ending', 'Заканчивается'],
  ['trial', 'Пробы'],
  ['check', 'Проверьте'],
  ['out', 'Закончились'],
  ['all', 'Все'],
  ['ok', 'Есть'],
  ['stop', 'Стоп'],
  ['plan', 'В плане'],
];

export const defaultMobileShelfStatus = (counters: Pick<ShelfCounters, 'ending'>): ShelfStatusKey =>
  counters.ending > 0 ? 'ending' : 'all';

// Кнопки карточки: слева — шторка «Сколько осталось?», справа — «Закончился»
// или «Снять стоп». Закончился или в плане — только подпись.
export type ShelfMobileActions = {
  note: string | null;
  left: string | null;
  right: 'empty' | 'unstop' | null;
};

export const shelfMobileActions = (row: Pick<ShelfRow, 'status'>): ShelfMobileActions => {
  switch (row.status) {
    case 'out':
    case 'plan':
      return { note: 'в «К заказу»', left: null, right: null };
    case 'stop':
      return { note: null, left: 'Осталось…', right: 'unstop' };
    case 'check':
      return { note: null, left: 'Отметить остаток', right: 'empty' };
    default:
      return { note: null, left: 'Осталось…', right: 'empty' };
  }
};

export const sheetLine = (row: Pick<ShelfRow, 'leftGrams' | 'fullGrams' | 'lastReceipt'>) =>
  row.fullGrams === null || !row.lastReceipt
    ? 'Прихода ещё не было'
    : `После прихода ${formatShelfDate(row.lastReceipt.at)} было ${formatNumber(row.fullGrams)} г · сейчас ${formatGrams(row.leftGrams ?? 0)}`;

const kg = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export const shelfMobileSummary = (view: {
  counters: Pick<ShelfView['counters'], 'all'>;
  totals: ShelfView['totals'];
  today: ShelfView['today'];
}) =>
  [
    formatCount(view.counters.all, ['позиция', 'позиции', 'позиций']),
    `≈ ${kg.format(view.totals.kg)} кг`,
    `сегодня ≈ ${formatNumber(view.today.grams)} г, ${formatCount(Math.round(view.today.bowls), ['чаша', 'чаши', 'чаш'])}`,
  ].join(' · ');
