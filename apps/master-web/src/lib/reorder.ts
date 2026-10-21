import { formatCount, type ReorderGroup, type ReorderItem, type ReorderView, type ShelfRateKind, type ShelfSettings, type ShelfStatus, type ShelfTobaccoRef } from '../contracts';
import { formatDay } from './deliveries';
import { formatDecimal, formatNumber, formatShelfDate, type ShelfTone } from './shelf';

// Чистая логика «К заказу» (#213, #310): граммы заказа меняются локально, поэтому
// текст заказа и сумма группы пересчитываются здесь, а без правок берутся с backend.

// Зеркало REORDER_STEP_GRAMS в apps/backend/src/stock.ts.
export const REORDER_STEP_GRAMS = 50;

export const reorderItemName = (item: { tobacco: Pick<ShelfTobaccoRef, 'manufacturer' | 'lineName' | 'name'> }) =>
  [item.tobacco.manufacturer, item.tobacco.lineName, item.tobacco.name].filter(Boolean).join(' ');

// Зеркало orderText в apps/backend/src/shelf-insights.ts.
export const orderText = (items: Array<Pick<ReorderItem, 'tobacco' | 'quantityGrams'>>) =>
  ['Добрый день! Заказ:', ...items.map((item) => `${reorderItemName(item)} — ${item.quantityGrams} г`), 'Спасибо!'].join('\n');

// Граммы заказа по id табака.
export type ReorderQuantities = Record<string, number>;

export const withQuantities = (items: ReorderItem[], quantities: ReorderQuantities) =>
  items.map((item) => {
    const quantityGrams = quantities[item.tobacco.id];
    return quantityGrams === undefined ? item : { ...item, quantityGrams };
  });

// Зеркало sumKop группы в backend: Σ граммы × цена грамма.
export const reorderSum = (items: ReorderItem[]) =>
  items.length && items.every((item) => item.gramPriceKop !== null)
    ? Math.round(items.reduce((total, item) => total + item.quantityGrams * item.gramPriceKop!, 0))
    : null;

export const stepQuantity = (current: number, delta: number) => {
  const aligned = delta > 0 ? Math.floor(current / REORDER_STEP_GRAMS) : Math.ceil(current / REORDER_STEP_GRAMS);
  return Math.max(1, aligned + delta) * REORDER_STEP_GRAMS;
};

// Пока мастер не менял граммы группы, копируем текст backend как есть.
export const groupOrderText = (
  group: ReorderGroup,
  items: ReorderItem[],
  texts: ReorderView['text'],
  quantities: ReorderQuantities,
) => {
  const changed = group.items.some((item) => {
    const quantity = quantities[item.tobacco.id];
    return quantity !== undefined && quantity !== item.quantityGrams;
  });
  const fromBackend = texts.find((entry) => entry.supplierId === (group.supplier?.id ?? null));
  return !changed && fromBackend ? fromBackend.text : orderText(items);
};

export const countReorder = (view: Pick<ReorderView, 'groups'> | null) =>
  view ? view.groups.reduce((total, group) => total + group.items.length, 0) : null;

export const groupKey = (group: Pick<ReorderGroup, 'supplier'>) => group.supplier?.id ?? 'none';

export const groupCaption = (group: ReorderGroup) => {
  if (group.lastInvoice) {
    return `последний счёт ${formatDay(group.lastInvoice.date)}, ${group.lastInvoice.status === 'draft' ? 'черновик' : 'принят'}`;
  }
  if (group.supplier) return '';
  return group.items.every((item) => item.status === 'plan') ? 'в плане из каталога' : 'приход без счёта поставщика';
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

export const reorderRate = (item: Pick<ReorderItem, 'rate' | 'rateKind' | 'leftGrams'>) => {
  if (item.rateKind === 'brand' && item.rate !== null) return `≈ ${formatDecimal(item.rate)} г/день · бренд`;
  const rate = item.rateKind === 'own' && item.rate !== null ? `${formatDecimal(item.rate)} г/день` : 'мало данных';
  return item.leftGrams === null ? rate : `${rate} · ${formatNumber(item.leftGrams)} г`;
};

export const reorderHint = (leadDays: number) =>
  `Заказать — расход на 21 день минус остаток, вверх до ${REORDER_STEP_GRAMS} г; шаг ± ${REORDER_STEP_GRAMS} г. ` +
  `Срок поставки — ${formatCount(leadDays, ['день', 'дня', 'дней'])} (настройка точки).`;

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
