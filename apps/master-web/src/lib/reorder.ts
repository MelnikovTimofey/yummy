import type { ReorderGroup, ReorderItem, ReorderView, ShelfRateKind, ShelfSettings, ShelfStatus, ShelfTobaccoRef } from '../contracts';
import { formatDay } from './deliveries';
import { formatRate, formatShelfDate, type ShelfTone } from './shelf';

// Чистая логика «К заказу» (#213): количество меняется локально, поэтому
// текст заказа и сумма группы пересчитываются здесь, а не берутся с backend.

export const REORDER_MAX_QUANTITY = 99;

export const reorderItemName = (item: { tobacco: Pick<ShelfTobaccoRef, 'manufacturer' | 'lineName' | 'name'> }) =>
  [item.tobacco.manufacturer, item.tobacco.lineName, item.tobacco.name].filter(Boolean).join(' ');

// Зеркало orderText в apps/backend/src/shelf-insights.ts.
export const orderText = (items: Array<Pick<ReorderItem, 'tobacco' | 'packWeight' | 'quantity'>>) =>
  [
    'Добрый день! Заказ:',
    ...items.map((item) => `${reorderItemName(item)} ${item.packWeight} г — ${item.quantity} шт`),
    'Спасибо!',
  ].join('\n');

export type ReorderQuantities = Record<string, number>;

export const withQuantities = (items: ReorderItem[], quantities: ReorderQuantities) =>
  items.map((item) => {
    const quantity = quantities[item.tobacco.id];
    return quantity === undefined ? item : { ...item, quantity };
  });

export const reorderSum = (items: ReorderItem[]) =>
  items.length && items.every((item) => item.lastPriceKop !== null)
    ? items.reduce((total, item) => total + item.quantity * item.lastPriceKop!, 0)
    : null;

export const stepQuantity = (current: number, delta: number) => Math.min(REORDER_MAX_QUANTITY, Math.max(1, current + delta));

export const countReorder = (view: Pick<ReorderView, 'groups'> | null) =>
  view ? view.groups.reduce((total, group) => total + group.items.length, 0) : null;

export const groupKey = (group: Pick<ReorderGroup, 'supplier'>) => group.supplier?.id ?? 'none';

export const groupCaption = (group: ReorderGroup) => {
  if (group.lastInvoice) {
    return `последний счёт ${formatDay(group.lastInvoice.date)}, ${group.lastInvoice.status === 'draft' ? 'черновик' : 'принят'}`;
  }
  if (group.supplier) return '';
  return group.items.every((item) => item.status === 'plan') ? 'в плане из каталога' : 'банки пришли без счёта поставщика';
};

type UntilInput = { status: ShelfStatus; daysLeft: number | null; endsAt: string | null; rateKind?: ShelfRateKind };

// «Хватит до» для «К заказу» и дашборда; тон — как на полке (shelfUntil).
export const untilLabel = (item: UntilInput, leadDays: number): { text: string; days: string | null; tone: ShelfTone } => {
  if (item.status === 'out') return { text: 'закончился', days: null, tone: 'danger' };
  if (item.status === 'plan') return { text: 'в плане', days: null, tone: 'faint' };
  if (item.status === 'check') return { text: 'проверьте остаток', days: null, tone: 'warning' };
  if (item.daysLeft === null || !item.endsAt) return { text: '—', days: null, tone: 'faint' };
  const days = Math.round(item.daysLeft);
  return {
    text: `${item.rateKind === 'brand' ? '~' : ''}${formatShelfDate(item.endsAt)}`,
    days: `${days} дн`,
    tone: days <= 3 ? 'danger' : days <= leadDays ? 'warning' : 'default',
  };
};

export const reorderRate = (item: Pick<ReorderItem, 'rate' | 'rateKind'>) => (item.rate === null ? '—' : formatRate(item));

// Границы — как в apps/backend/src/shelf.ts (updateSettings).
const SETTINGS_FIELDS = [
  { key: 'bowlGrams', label: 'Граммовка чаши', min: 1, max: 100 },
  { key: 'leadDays', label: 'Срок поставки', min: 1, max: 60 },
] as const;

export const validateShelfSettings = (
  form: Record<keyof ShelfSettings, string>,
): { ok: true; value: ShelfSettings } | { ok: false; error: string } => {
  const value = {} as ShelfSettings;
  for (const { key, label, min, max } of SETTINGS_FIELDS) {
    const text = form[key].trim();
    const number = Number(text);
    if (!/^\d+$/.test(text) || number < min || number > max) {
      return { ok: false, error: `${label} — целое число от ${min} до ${max}.` };
    }
    value[key] = number;
  }
  return { ok: true, value };
};
