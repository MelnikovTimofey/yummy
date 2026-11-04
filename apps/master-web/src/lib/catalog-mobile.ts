import { formatMetricValue, type InventoryTobacco } from '../contracts';
import type { ShelfState } from './shelf';

// Карточка «Каталога» на телефоне (#540, #shot=catalog): подписи подвала и шапки.

export const catalogCardShelf = (state: ShelfState | undefined): { tone: ShelfState | 'none'; label: string } => {
  switch (state) {
    case 'in':
      return { tone: state, label: 'на полке' };
    case 'out':
      return { tone: state, label: 'закончился' };
    case 'stop':
      return { tone: state, label: 'стоп для гостей' };
    case 'plan':
      return { tone: state, label: 'в плане' };
    default:
      return { tone: 'none', label: 'не на полке' };
  }
};

export const formatInMixes = (count: number) => {
  if (!count) return 'нет в миксах';
  const noun = count % 10 === 1 && count % 100 !== 11 ? 'миксе' : 'миксах';
  return `в ${formatMetricValue(count)} ${noun}`;
};

export const catalogBrandLine = (item: Pick<InventoryTobacco, 'manufacturer' | 'lineName'>) =>
  [item.manufacturer, item.lineName?.trim()].filter(Boolean).join(', ');
