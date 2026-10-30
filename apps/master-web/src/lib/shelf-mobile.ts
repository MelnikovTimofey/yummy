import { formatCount, type ShelfRow, type ShelfView } from '../contracts';
import { afterReceiptLine, formatNumber } from './shelf';

// «Полка» на телефоне (#215, #306): мастер у стойки жмёт «Закончился» и,
// когда удобно, отмечает остаток.

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
      return { note: 'в заказе', left: null, right: null };
    case 'stop':
      return { note: null, left: 'Указать остаток', right: 'unstop' };
    case 'check':
      return { note: null, left: 'Отметить остаток', right: 'empty' };
    default:
      return { note: null, left: 'Указать остаток', right: 'empty' };
  }
};

export const sheetLine = (row: Pick<ShelfRow, 'fullGrams' | 'lastReceipt'>) => afterReceiptLine(row) ?? 'Прихода ещё не было';

const kg = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export const shelfMobileSummary = (view: {
  counters: Pick<ShelfView['counters'], 'all'>;
  totals: ShelfView['totals'];
  today: ShelfView['today'];
}) => {
  const stock = `${formatCount(view.counters.all, ['позиция', 'позиции', 'позиций'])}, ${kg.format(view.totals.kg)} кг.`;
  return view.today.grams > 0 ? `${stock} Сегодня уйдёт ${formatNumber(view.today.grams)} г.` : stock;
};
