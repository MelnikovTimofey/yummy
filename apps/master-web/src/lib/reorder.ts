import {
  formatCount,
  type ReorderGroup,
  type ReorderItem,
  type ReorderView,
  type ShelfHorizon,
  type ShelfInterval,
  type ShelfRateKind,
  type ShelfSettings,
  type ShelfStatus,
  type ShelfTobaccoRef,
} from '../contracts';
import { formatDay } from './deliveries';
import { formatMonthGrams, formatNumber, formatShelfDate, type ShelfTone } from './shelf';

// Чистая логика «К заказу» (#213, #323, #325): сколько заказать, решает мастер —
// здесь только когда закончится, расход в месяц и текст заявки с названиями.

export const reorderItemName = (item: { tobacco: Pick<ShelfTobaccoRef, 'manufacturer' | 'lineName' | 'name'> }) =>
  [item.tobacco.manufacturer, item.tobacco.lineName, item.tobacco.name].filter(Boolean).join(' ');

// Зеркало orderText в apps/backend/src/shelf-insights.ts.
export const orderText = (items: Array<Pick<ReorderItem, 'tobacco'>>) =>
  ['Добрый день! Заказ:', ...items.map(reorderItemName), 'Спасибо!'].join('\n');

export const groupOrderText = (group: ReorderGroup, texts: ReorderView['text']) =>
  texts.find((entry) => entry.supplierId === (group.supplier?.id ?? null))?.text ?? orderText(group.items);

export const reorderMonth = (item: Pick<ReorderItem, 'monthGrams' | 'rateKind'>) => {
  if (item.rateKind === 'none' || item.monthGrams === null) return { value: 'мало данных', brand: false, few: true };
  const grams = `${formatMonthGrams(item.monthGrams)} г`;
  return { value: grams, brand: item.rateKind === 'brand', few: false };
};

export const REORDER_HINT = 'Сколько заказать, решает мастер. Расход в месяц средний за 60 дней. Если своих отметок мало, взята медиана бренда.';

export const REORDER_COPY_HINT = 'Объём впишите перед отправкой.';

// Кусок подписи; strong — выделить жирным, tone — цветом (остаток бюджета в «Закупке»).
export type TextSegment = { text: string; strong?: boolean; tone?: 'success' | 'danger' };

// Зеркало INTERVAL_MIN_DAYS в apps/backend/src/stock.ts: меньше — интервал неизвестен.
const INTERVAL_MIN_DELIVERIES = 3;

const inDays = (value: number) => formatCount(value, ['день', 'дня', 'дней']);
const invoices = (value: number) => formatCount(value, ['счёт', 'счёта', 'счетов']);

// Плашка над «К заказу» (#325, #shot=reorder, edge-interval).
export const intervalNote = (interval: ShelfInterval, horizon: ShelfHorizon, leadDays: number): { known: boolean; segments: TextSegment[] } => {
  if (interval.days === null) {
    return {
      known: false,
      segments: [
        { text: 'Интервал поставок пока неизвестен: принято ' },
        { text: invoices(interval.deliveries), strong: true },
        { text: ` из ${INTERVAL_MIN_DELIVERIES} нужных. В списке то, что закончится за срок поставки, ` },
        { text: inDays(leadDays), strong: true },
        { text: '.' },
      ],
    };
  }
  return {
    known: true,
    segments: [
      { text: 'Поставки примерно ' },
      { text: `раз в ${inDays(interval.days)}`, strong: true },
      { text: `, по ${formatCount(interval.deliveries, ['счёту', 'счетам', 'счетам'])} за 90 дней. В списке то, что закончится до следующей поставки с запасом на срок поставки, ` },
      { text: `до ${formatShelfDate(horizon.until)}`, strong: true },
      { text: '.' },
    ],
  };
};

// «Считается само» в настройках полки (#326, #shot=settings).
export const settingsCalcNote = (interval: ShelfInterval, horizon: ShelfHorizon, leadDays: number): TextSegment[] => {
  const until = formatShelfDate(horizon.until);
  const rest = interval.days === null
    ? ` интервал между поставками по принятым счетам. Пока принято ${invoices(interval.deliveries)} из ${INTERVAL_MIN_DELIVERIES} нужных, поэтому в заказе то, что закончится за срок поставки, до ${until}.`
    : ` интервал между поставками по принятым счетам, сейчас примерно раз в ${inDays(interval.days)}. В заказе то, что закончится до ${until}: ${inDays(interval.days)} до следующей заявки и ${inDays(leadDays)} поставки.`;
  return [{ text: 'Считается само:', strong: true }, { text: rest }];
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

// «Хватит до» для «К заказу» и дашборда; тон — как на полке (shelfUntil). Оценка по
// бренду без «~»: «по бренду» подписан расход рядом.
export const untilLabel = (item: UntilInput, leadDays: number): { text: string; days: string | null; tone: ShelfTone } => {
  if (item.status === 'out') return { text: 'закончился', days: null, tone: 'danger' };
  if (item.status === 'plan') return { text: 'в плане', days: null, tone: 'faint' };
  if (item.status === 'check') return { text: 'проверьте остаток', days: null, tone: 'warning' };
  if (item.daysLeft === null || !item.endsAt) return { text: '—', days: null, tone: 'faint' };
  const days = Math.round(item.daysLeft);
  return {
    text: formatShelfDate(item.endsAt),
    days: `${days} дн`,
    tone: days <= 3 ? 'danger' : days <= leadDays ? 'warning' : 'default',
  };
};

// Границы — как в apps/backend/src/shelf.ts (updateSettings).
const SETTINGS_FIELDS = [
  { key: 'bowlGrams', min: 1, max: 100, error: 'Укажите граммовку чаши от 1 до 100 г.' },
  { key: 'leadDays', min: 1, max: 60, error: 'Укажите срок поставки от 1 до 60 дней.' },
] as const;

// MAX_BUDGET_KOP в backend — 1e9 копеек.
const MAX_BUDGET_RUB = 10_000_000;

export type ShelfSettingsForm = { bowlGrams: string; leadDays: string; budget: string };

export const validateShelfSettings = (
  form: ShelfSettingsForm,
): { ok: true; value: ShelfSettings } | { ok: false; error: string } => {
  const value: ShelfSettings = { bowlGrams: 0, leadDays: 0, budgetKop: null };
  for (const { key, min, max, error } of SETTINGS_FIELDS) {
    const text = form[key].trim();
    const number = Number(text);
    if (!/^\d+$/.test(text) || number < min || number > max) {
      return { ok: false, error };
    }
    value[key] = number;
  }
  // Бюджет — в рублях в поле, в копейках в API; пусто — не указан.
  const budget = form.budget.replace(/\s/g, '');
  if (budget) {
    if (!/^\d+$/.test(budget) || Number(budget) > MAX_BUDGET_RUB) {
      return { ok: false, error: 'Укажите бюджет в целых рублях, до 10 000 000, или оставьте поле пустым.' };
    }
    value.budgetKop = Number(budget) * 100;
  }
  return { ok: true, value };
};

export const budgetInput = (budgetKop: number | null) => (budgetKop === null ? '' : formatNumber(budgetKop / 100));
