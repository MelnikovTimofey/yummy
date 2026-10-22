// Остаток табака в граммах (#306): журнал приходов, отметок и списаний.
// «Закончился» — отметка 0 г. Расход считается по отрезкам между отметками.

export type StockEntryKind = 'receipt' | 'count' | 'writeoff';

export type StockEntry = {
  id: string;
  kind: StockEntryKind;
  // receipt — пришло, count — стало, writeoff — списано.
  grams: number;
  at: Date;
  priceKop: number | null;
};

export type Segment = { from: number; to: number; grams: number; closedBy: string; excluded: boolean };

export type Rate =
  | { gramsPerDay: number; kind: 'own' | 'brand' }
  | { gramsPerDay: null; kind: 'none' };

export type ShelfSettings = { bowlGrams: number; leadDays: number; budgetKop: number | null };

// Интервал поставок по принятым счетам (#325): deliveries — дней поставок за 90 дней
// (счета одного дня — одна поставка); days — null, пока их меньше трёх.
export type SupplyInterval = { days: number | null; deliveries: number };

// «Заканчивается» и «К заказу» — что закончится в пределах days: интервал + срок поставки.
export type Horizon = { leadDays: number; days: number };

export type ShelfItem = {
  tobaccoId: string;
  brand: string;
  keepStocked: boolean;
  plan: boolean;
  stopped: boolean;
  entries: StockEntry[];
};

export type ShelfStatus = 'ok' | 'ending' | 'check' | 'stop' | 'out' | 'plan';

export type StockState = {
  received: boolean;
  // По учёту, без расхода: последняя отметка + приходы − списания.
  bookGrams: number;
  // По расчёту сейчас; null — прихода не было.
  leftGrams: number | null;
  // Уровень сразу после последнего прихода — база долей.
  fullGrams: number | null;
  // Расчёт ушёл ниже учёта из-за расхода, а не из-за свежей отметки.
  spent: boolean;
};

// mark — остаток указал мастер: отметка сегодня или ноль после «Закончился»; иначе прогноз.
export type LeftSource = 'mark' | 'forecast';

export type ShelfForecast = {
  tobaccoId: string;
  status: ShelfStatus;
  inStock: boolean;
  guestAvailable: boolean;
  rate: number | null;
  rateKind: Rate['kind'];
  monthGrams: number | null;
  leftGrams: number | null;
  leftSource: LeftSource | null;
  fullGrams: number | null;
  daysLeft: number | null;
  endsAt: Date | null;
};

export type ReorderLine = {
  tobaccoId: string;
  status: ShelfStatus;
  daysLeft: number | null;
  endsAt: Date | null;
  // Закончится не за срок поставки, а до следующей поставки по интервалу.
  byInterval: boolean;
};

export const DEFAULT_SETTINGS: ShelfSettings = { bowlGrams: 18, leadDays: 7, budgetKop: null };

const DAY_MS = 86_400_000;
const RATE_WINDOW_DAYS = 60;
const MONTH_DAYS = 30;
const INTERVAL_WINDOW_DAYS = 90;
const INTERVAL_MIN_DAYS = 3;
const TRIAL_WINDOW_DAYS = 60;
const CHECK_SHARE = 0.1;
export const CORRECTION_MS = 30 * 60_000;
export const MIN_SEGMENT_MS = 6 * 3_600_000;
const WEEKDAY_WINDOW_DAYS = 28;
const WEEKDAY_MIN_EVENTS = 50;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const localDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const ordered = (entries: StockEntry[]) =>
  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.at.getTime() - b.entry.at.getTime() || a.index - b.index)
    .map(({ entry }) => entry);

type Anchor = { at: number; level: number };

type WalkHandlers = {
  receipt?: (anchor: Anchor | null, came: number, gone: number, entry: StockEntry) => void;
  count?: (entry: StockEntry) => void;
};

// Проход по журналу: от точки отсчёта (первый приход или отметка) копятся
// приходы и списания до следующей отметки. Пока остаток был 0, дни не идут:
// приход после «Закончился» сам становится точкой отсчёта. Отметка вскоре после
// предыдущей («½», а потом «точно 180 г») заменяет её, а не открывает отрезок в минуту.
const walk = (entries: StockEntry[], on: WalkHandlers = {}) => {
  const result: Segment[] = [];
  let anchor: Anchor | null = null;
  let came = 0;
  let gone = 0;
  type Running = { anchor: Anchor | null; came: number; gone: number };
  let last: (Running & { at: number; segment: boolean }) | null = null;
  for (const entry of ordered(entries)) {
    const at = entry.at.getTime();
    if (entry.kind === 'receipt') {
      on.receipt?.(anchor, came, gone, entry);
      if (!anchor || (anchor.level === 0 && !came && !gone)) anchor = { at, level: entry.grams };
      else came += entry.grams;
      last = null;
    } else if (entry.kind === 'writeoff') {
      if (anchor) gone += entry.grams;
      last = null;
    } else {
      if (last && at - last.at < CORRECTION_MS) {
        if (last.segment) result.pop();
        ({ anchor, came, gone } = last);
      }
      const before: Running = { anchor, came, gone };
      if (anchor) {
        const grams = anchor.level + came - gone - entry.grams;
        result.push({ from: anchor.at, to: at, grams, closedBy: entry.id, excluded: grams < 0 || at - anchor.at < MIN_SEGMENT_MS });
      }
      last = { at, ...before, segment: anchor !== null };
      on.count?.(entry);
      anchor = { at, level: entry.grams };
      came = 0;
      gone = 0;
    }
  }
  return { segments: result, anchor, came, gone };
};

export const segments = (entries: StockEntry[]): Segment[] => walk(entries).segments;

const counted = (entries: StockEntry[]) =>
  segments(entries).filter((segment) => !segment.excluded && segment.to > segment.from);

export const consumptionRate = (entries: StockEntry[], now: Date, windowDays = RATE_WINDOW_DAYS): Rate => {
  const windowStart = now.getTime() - windowDays * DAY_MS;
  let grams = 0;
  let days = 0;
  for (const segment of counted(entries)) {
    const from = Math.max(segment.from, windowStart);
    const to = Math.min(segment.to, now.getTime());
    if (to <= from) continue;
    grams += (segment.grams * (to - from)) / (segment.to - segment.from);
    days += (to - from) / DAY_MS;
  }
  return days > 0 ? { gramsPerDay: grams / days, kind: 'own' } : { gramsPerDay: null, kind: 'none' };
};

export type Period = { from: Date; to: Date };

// Недели с понедельника в часовом поясе процесса; последняя — текущая, до сейчас.
export const weekPeriods = (now: Date, count: number): Array<Period & { partial: boolean }> => {
  const monday = now.getDate() - ((now.getDay() + 6) % 7);
  return Array.from({ length: count }, (_, index) => {
    const back = count - 1 - index;
    const from = new Date(now.getFullYear(), now.getMonth(), monday - 7 * back);
    return back
      ? { from, to: new Date(now.getFullYear(), now.getMonth(), monday - 7 * back + 7), partial: false }
      : { from, to: now, partial: true };
  });
};

// Граммы завершённых отрезков, разнесённые по времени отрезка равномерно.
export const consumptionByPeriod = (entries: StockEntry[], periods: Period[]): number[] => {
  const all = counted(entries);
  return periods.map(({ from, to }) =>
    sum(
      all.map((segment) => {
        const overlap = Math.min(segment.to, to.getTime()) - Math.max(segment.from, from.getTime());
        return overlap > 0 ? (segment.grams * overlap) / (segment.to - segment.from) : 0;
      }),
    ),
  );
};

// Поправка прогноза на день недели по «Покурить» за 28 полных дней до сегодня
// (по 4 каждого дня недели). Дни — в часовом поясе процесса. first — самое
// раннее событие вообще: пока оно позже начала окна, четырёх недель ещё нет.
export const weekdayFactor = (events: Date[], first: Date | null, now: Date): number | null => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WEEKDAY_WINDOW_DAYS);
  if (!first || first > windowStart) return null;
  const inWindow = events.filter((event) => event >= windowStart && event < today);
  if (inWindow.length < WEEKDAY_MIN_EVENTS) return null;
  const sameDay = inWindow.filter((event) => event.getDay() === now.getDay()).length;
  return sameDay / (WEEKDAY_WINDOW_DAYS / 7) / (inWindow.length / WEEKDAY_WINDOW_DAYS);
};

export const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// dates — даты принятых счетов (дата счёта, иначе дата приёмки); дни — календарные
// в часовом поясе процесса.
export const supplyInterval = (dates: Date[], now: Date): SupplyInterval => {
  const windowStart = localDay(now).getTime() - INTERVAL_WINDOW_DAYS * DAY_MS;
  const inWindow = dates.filter((date) => date.getTime() >= windowStart && date <= now);
  const days = [...new Set(inWindow.map((date) => localDay(date).getTime()))].sort((a, b) => a - b);
  if (days.length < INTERVAL_MIN_DAYS) return { days: null, deliveries: days.length };
  const gaps = days.slice(1).map((day, index) => Math.round((day - days[index]) / DAY_MS));
  return { days: Math.round(median(gaps)), deliveries: days.length };
};

export const horizonOf = (leadDays: number, interval: SupplyInterval): Horizon => ({
  leadDays,
  days: (interval.days ?? 0) + leadDays,
});

// Проба (#329) — табак, впервые пришедший на полку за 60 дней.
export const isTrial = (firstReceiptAt: Date | null, now: Date) =>
  firstReceiptAt !== null && now.getTime() - firstReceiptAt.getTime() <= TRIAL_WINDOW_DAYS * DAY_MS;

// brandRates — собственные расходы других табаков того же бренда на полке.
export const withBrandFallback = (rate: Rate, brandRates: number[]): Rate => {
  if (rate.kind !== 'none' || !brandRates.length) return rate;
  return { gramsPerDay: median(brandRates), kind: 'brand' };
};

const estimate = (anchor: Anchor, came: number, gone: number, gramsPerDay: number | null, at: number) =>
  Math.max(0, anchor.level + came - gone - (gramsPerDay ?? 0) * Math.max(0, at - anchor.at) / DAY_MS);

// Уровень после прихода — база долей; отметка выше него (досыпали без счёта)
// поднимает уровень, чтобы полоса не уходила за 100 %.
export const stockState = (entries: StockEntry[], gramsPerDay: number | null, now: Date): StockState => {
  let full: number | null = null;
  const end = walk(entries, {
    receipt: (anchor, came, gone, entry) => {
      full = (anchor ? estimate(anchor, came, gone, gramsPerDay, entry.at.getTime()) : 0) + entry.grams;
    },
    count: (entry) => {
      if (full === null || entry.grams > full) full = entry.grams;
    },
  });
  if (!end.anchor) return { received: false, bookGrams: 0, leftGrams: null, fullGrams: null, spent: false };
  const book = Math.max(0, end.anchor.level + end.came - end.gone);
  const left = estimate(end.anchor, end.came, end.gone, gramsPerDay, now.getTime());
  return { received: true, bookGrams: book, leftGrams: left, fullGrams: full, spent: left < book };
};

export const fractionGrams = (fullGrams: number, fraction: number) => Math.round(fullGrams * fraction);

// Ноль по учёту — «Закончился» или списано всё: точная цифра в любой день.
const leftSourceOf = (entries: StockEntry[], state: StockState, now: Date): LeftSource | null => {
  if (!state.received) return null;
  if (state.bookGrams <= 0) return 'mark';
  const last = ordered(entries).pop();
  return last?.kind === 'count' && localDay(last.at).getTime() === localDay(now).getTime() ? 'mark' : 'forecast';
};

export const shelfForecast = (item: ShelfItem, rate: Rate, now: Date, horizon: Horizon): ShelfForecast => {
  const state = stockState(item.entries, rate.gramsPerDay, now);
  const inStock = state.bookGrams > 0;
  const daysLeft = inStock && rate.gramsPerDay ? state.leftGrams! / rate.gramsPerDay : null;
  const check = state.spent && state.fullGrams !== null && state.leftGrams! < state.fullGrams * CHECK_SHARE;

  const status: ShelfStatus = !state.received
    ? item.plan ? 'plan' : 'out'
    : !inStock
      ? 'out'
      : item.stopped
        ? 'stop'
        : check
          ? 'check'
          : daysLeft !== null && daysLeft <= horizon.days
            ? 'ending'
            : 'ok';

  return {
    tobaccoId: item.tobaccoId,
    status,
    inStock,
    guestAvailable: inStock && !item.stopped,
    rate: rate.gramsPerDay,
    rateKind: rate.kind,
    monthGrams: rate.gramsPerDay === null ? null : rate.gramsPerDay * MONTH_DAYS,
    leftGrams: state.leftGrams,
    leftSource: leftSourceOf(item.entries, state, now),
    fullGrams: state.fullGrams,
    daysLeft,
    endsAt: daysLeft === null ? null : new Date(now.getTime() + daysLeft * DAY_MS),
  };
};

// Прогноз всей полки: табак без своих данных получает медиану расхода
// своего бренда.
export const forecastShelf = (items: ShelfItem[], now: Date, horizon: Horizon): ShelfForecast[] => {
  const rates = items.map((item) => consumptionRate(item.entries, now));
  const brandRates = new Map<string, number[]>();
  items.forEach((item, index) => {
    const rate = rates[index];
    if (rate.kind === 'own') brandRates.set(item.brand, [...(brandRates.get(item.brand) ?? []), rate.gramsPerDay]);
  });
  return items.map((item, index) =>
    shelfForecast(item, withBrandFallback(rates[index], brandRates.get(item.brand) ?? []), now, horizon),
  );
};

export const todayForecast = (forecasts: ShelfForecast[], bowlGrams: number) => {
  const grams = sum(forecasts.filter((forecast) => forecast.inStock).map((forecast) => forecast.rate ?? 0));
  return { grams, bowls: grams / bowlGrams };
};

// Сколько заказать, решает мастер (#323): строка — только что и когда закончится.
export const reorderList = (items: ShelfItem[], forecasts: ShelfForecast[], horizon: Horizon): ReorderLine[] => {
  const byId = new Map(forecasts.map((forecast) => [forecast.tobaccoId, forecast]));
  const lines: ReorderLine[] = [];
  for (const item of items) {
    const forecast = byId.get(item.tobaccoId);
    if (!forecast || !(item.keepStocked || item.plan)) continue;
    const missing = forecast.status === 'out' || forecast.status === 'plan';
    if (!missing && !(forecast.daysLeft !== null && forecast.daysLeft <= horizon.days)) continue;
    lines.push({
      tobaccoId: item.tobaccoId,
      status: forecast.status,
      daysLeft: forecast.daysLeft,
      endsAt: forecast.endsAt,
      byInterval: !missing && forecast.daysLeft! > horizon.leadDays,
    });
  }
  const rank = (line: ReorderLine) =>
    line.status === 'out' || line.status === 'plan' ? -Infinity : line.endsAt?.getTime() ?? Infinity;
  return lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => rank(a.line) - rank(b.line) || a.index - b.index)
    .map(({ line }) => line);
};

export const gramPrice = (entries: StockEntry[]) => {
  const priced = ordered(entries).filter((entry) => entry.kind === 'receipt' && entry.priceKop !== null && entry.grams > 0).pop();
  return priced ? priced.priceKop! / priced.grams : null;
};

export const bowlCost = (gramPrices: Array<number | null>, bowlGrams: number) => {
  const known = gramPrices.filter((price): price is number => price !== null);
  return known.length ? (bowlGrams * sum(known)) / known.length : null;
};

// База в месяц (#326): Σ расход в месяц × цена грамма по табакам, которые держим
// постоянно. Без цены или расхода табак не суммируется, а считается в unknown.
export const baseBudget = (lines: Array<{ monthGrams: number | null; gramPriceKop: number | null }>) => {
  const known = lines.filter((line) => line.monthGrams !== null && line.gramPriceKop !== null);
  return {
    kop: sum(known.map((line) => line.monthGrams! * line.gramPriceKop!)),
    count: lines.length,
    unknown: lines.length - known.length,
  };
};
