import { formatCount, type ShelfHorizon, type ShelfInterval, type ShelfSettings, type ShelfStatus } from '../contracts';
import { formatNumber, formatShelfDate } from './shelf';

// Остаток граммовой логики «К заказу» (#213, #325, #326): настройки полки и бюджет
// на дашборде. Вид «К заказу» теперь на статусе «Закончился» (#518, lib/order.ts);
// этот файл уйдёт вместе с блоком «Полка» дашборда (#520).

export type ShelfTone = 'default' | 'muted' | 'faint' | 'warning' | 'danger';

// Кусок подписи; strong — выделить жирным, tone — цветом.
export type TextSegment = { text: string; strong?: boolean; tone?: 'success' | 'danger' };

// Зеркало INTERVAL_MIN_DAYS в apps/backend/src/stock.ts: меньше — интервал неизвестен.
const INTERVAL_MIN_DELIVERIES = 3;

const inDays = (value: number) => formatCount(value, ['день', 'дня', 'дней']);
const invoices = (value: number) => formatCount(value, ['счёт', 'счёта', 'счетов']);

// «Считается само» в настройках полки (#326, #shot=settings).
export const settingsCalcNote = (interval: ShelfInterval, horizon: ShelfHorizon, leadDays: number): TextSegment[] => {
  const until = formatShelfDate(horizon.until);
  const rest = interval.days === null
    ? ` интервал между поставками по принятым счетам. Пока принято ${invoices(interval.deliveries)} из ${INTERVAL_MIN_DELIVERIES} нужных, поэтому в заказе то, что закончится за срок поставки, до ${until}.`
    : ` интервал между поставками по принятым счетам, сейчас примерно раз в ${inDays(interval.days)}. В заказе то, что закончится до ${until}: ${inDays(interval.days)} до следующей заявки и ${inDays(leadDays)} поставки.`;
  return [{ text: 'Считается само:', strong: true }, { text: rest }];
};

type UntilInput = { status: ShelfStatus; daysLeft: number | null; endsAt: string | null };

// «Хватит до» на дашборде. Оценка по бренду без «~».
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
