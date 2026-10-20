export type PackMark = { at: Date; fraction: number };

export type Pack = {
  id: string;
  weight: number;
  price: number | null;
  receivedAt: Date;
  openedAt: Date | null;
  emptiedAt: Date | null;
  writtenOffAt: Date | null;
  marks: PackMark[];
};

export type PackState = 'sealed' | 'open' | 'empty' | 'written_off';

export type ResolvedPack = Pack & { state: PackState };

export type Rate =
  | { gramsPerDay: number; kind: 'own' | 'brand' }
  | { gramsPerDay: null; kind: 'none' };

export type ShelfSettings = { bowlGrams: number; leadDays: number };

export type ShelfItem = {
  tobaccoId: string;
  brand: string;
  packWeight: number;
  keepStocked: boolean;
  plan: boolean;
  stopped: boolean;
  packs: Pack[];
};

export type ShelfStatus = 'ok' | 'ending' | 'check' | 'stop' | 'out' | 'plan';

export type ShelfForecast = {
  tobaccoId: string;
  status: ShelfStatus;
  last: boolean;
  overdue: boolean;
  guestAvailable: boolean;
  rate: number | null;
  rateKind: Rate['kind'];
  openPacks: number;
  sealedPacks: number;
  remainingGrams: number;
  daysLeft: number | null;
  endsAt: Date | null;
};

export type ReorderLine = {
  tobaccoId: string;
  status: ShelfStatus;
  quantity: number;
  daysLeft: number | null;
  endsAt: Date | null;
};

export const DEFAULT_SETTINGS: ShelfSettings = { bowlGrams: 18, leadDays: 7 };

const DAY_MS = 86_400_000;
const RATE_WINDOW_DAYS = 60;
const REORDER_DAYS = 21;
const OVERDUE_SHARE = 0.1;
const WEEKDAY_WINDOW_DAYS = 28;
const WEEKDAY_MIN_EVENTS = 50;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const endOf = (pack: Pack) => pack.emptiedAt ?? pack.writtenOffAt;

// Самая ранняя точка не раньше `from`, когда у табака нет ни одной открытой
// банки; null — какая-то банка открыта до сих пор.
const firstGap = (from: number, intervals: Array<[number, number | null]>) => {
  let time = from;
  for (;;) {
    const covering = intervals.find(([start, end]) => start <= time && (end === null || time < end));
    if (!covering) return time;
    if (covering[1] === null) return null;
    time = covering[1];
  }
};

// Мастер вскрытие не отмечает: если у табака нет банки в работе, в работу
// уходит старейшая из запаса — с прихода или с момента, когда закончилась
// предыдущая. Явный openedAt — «вскрыть ещё одну» параллельно.
export const resolvePacks = (packs: Pack[]): ResolvedPack[] => {
  const opened = new Map<string, Date>();
  const intervals: Array<[number, number | null]> = [];
  for (const pack of packs) {
    if (!pack.openedAt) continue;
    opened.set(pack.id, pack.openedAt);
    intervals.push([pack.openedAt.getTime(), endOf(pack)?.getTime() ?? null]);
  }

  const queue = packs
    .map((pack, index) => ({ pack, index }))
    .filter(({ pack }) => !pack.openedAt)
    .sort((a, b) => a.pack.receivedAt.getTime() - b.pack.receivedAt.getTime() || a.index - b.index)
    .map(({ pack }) => pack);

  for (const pack of queue) {
    const openAt = firstGap(pack.receivedAt.getTime(), intervals);
    if (openAt === null) break;
    if (pack.writtenOffAt && pack.writtenOffAt.getTime() <= openAt) continue;
    opened.set(pack.id, new Date(openAt));
    intervals.push([openAt, endOf(pack)?.getTime() ?? null]);
  }

  return packs.map((pack) => {
    const openedAt = opened.get(pack.id) ?? null;
    const state: PackState = pack.writtenOffAt
      ? 'written_off'
      : pack.emptiedAt
        ? 'empty'
        : openedAt
          ? 'open'
          : 'sealed';
    return { ...pack, openedAt, state };
  });
};

const lastMark = (pack: ResolvedPack): PackMark => {
  const marks = [...pack.marks].sort((a, b) => a.at.getTime() - b.at.getTime());
  return marks[marks.length - 1] ?? { at: pack.openedAt!, fraction: 1 };
};

// Завершённые отрезки шкалы банки: от вскрытия через отметки к «Закончилась».
// Текущий отрезок (от последней точки до сейчас) не завершён и сюда не входит.
// Отметка выше предыдущей — исправление: её отрезок не расход, но точкой
// отсчёта дальше служит она.
const segments = (pack: ResolvedPack) => {
  if (!pack.openedAt || pack.state === 'written_off') return [];
  const points: PackMark[] = [
    { at: pack.openedAt, fraction: 1 },
    ...[...pack.marks].sort((a, b) => a.at.getTime() - b.at.getTime()),
  ];
  if (pack.emptiedAt) points.push({ at: pack.emptiedAt, fraction: 0 });
  return points.slice(1).flatMap((point, index) => {
    const previous = points[index];
    if (point.fraction > previous.fraction) return [];
    return [{ from: previous.at.getTime(), to: point.at.getTime(), grams: pack.weight * (previous.fraction - point.fraction) }];
  });
};

const unionLength = (intervals: Array<[number, number]>) => {
  let total = 0;
  let end = -Infinity;
  for (const [from, to] of [...intervals].sort((a, b) => a[0] - b[0])) {
    if (to <= end) continue;
    total += to - Math.max(from, end);
    end = to;
  }
  return total;
};

// Расход — табака, а не банки: граммы всех банок делятся на время, когда
// хоть одна была в работе, чтобы параллельные банки не делили расход пополам.
export const consumptionRate = (packs: Pack[], now: Date): Rate => {
  const windowStart = now.getTime() - RATE_WINDOW_DAYS * DAY_MS;
  let grams = 0;
  const covered: Array<[number, number]> = [];
  for (const segment of resolvePacks(packs).flatMap(segments)) {
    if (segment.to <= segment.from) continue;
    const from = Math.max(segment.from, windowStart);
    const to = Math.min(segment.to, now.getTime());
    if (to <= from) continue;
    grams += (segment.grams * (to - from)) / (segment.to - segment.from);
    covered.push([from, to]);
  }
  const days = unionLength(covered) / DAY_MS;
  return days > 0 ? { gramsPerDay: grams / days, kind: 'own' } : { gramsPerDay: null, kind: 'none' };
};

export type Period = { from: Date; to: Date };

// Граммы завершённых отрезков шкалы, разнесённые по времени отрезка равномерно.
export const consumptionByPeriod = (packs: Pack[], periods: Period[]): number[] => {
  const all = resolvePacks(packs).flatMap(segments).filter((segment) => segment.to > segment.from);
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

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// brandRates — собственные расходы других табаков того же бренда на полке.
export const withBrandFallback = (rate: Rate, brandRates: number[]): Rate => {
  if (rate.kind !== 'none' || !brandRates.length) return rate;
  return { gramsPerDay: median(brandRates), kind: 'brand' };
};

const openInterval = (pack: ResolvedPack): [number, number] | null =>
  pack.openedAt ? [pack.openedAt.getTime(), endOf(pack)?.getTime() ?? Infinity] : null;

// Дни, взвешенные долей банки: пока в работе k банок, каждая уходит в k раз медленнее.
const sharedDays = (from: number, to: number, intervals: Array<[number, number]>) => {
  const cuts = [from, to, ...intervals.flat().filter((time) => time > from && time < to)].sort((a, b) => a - b);
  let days = 0;
  for (let index = 1; index < cuts.length; index += 1) {
    const middle = (cuts[index - 1] + cuts[index]) / 2;
    const open = intervals.filter(([start, end]) => start <= middle && middle < end).length;
    days += (cuts[index] - cuts[index - 1]) / DAY_MS / Math.max(1, open);
  }
  return days;
};

// packs — все банки табака: по ним видно, сколько банок было в работе одновременно.
export const openRemaining = (
  pack: ResolvedPack,
  gramsPerDay: number | null,
  now: Date,
  packs: ResolvedPack[] = [pack],
) => {
  const mark = lastMark(pack);
  const intervals = packs.map(openInterval).filter((interval): interval is [number, number] => interval !== null);
  const spent = gramsPerDay === null ? 0 : gramsPerDay * sharedDays(mark.at.getTime(), now.getTime(), intervals);
  const grams = Math.max(0, pack.weight * mark.fraction - spent);
  return { grams, overdue: grams < pack.weight * OVERDUE_SHARE };
};

export const shelfForecast = (item: ShelfItem, rate: Rate, now: Date, settings: ShelfSettings): ShelfForecast => {
  const packs = resolvePacks(item.packs);
  const open = packs.filter((pack) => pack.state === 'open');
  const sealed = packs.filter((pack) => pack.state === 'sealed');
  const remaining = open.map((pack) => openRemaining(pack, rate.gramsPerDay, now, packs));
  const remainingGrams = sum(remaining.map((entry) => entry.grams)) + sum(sealed.map((pack) => pack.weight));
  const daysLeft = rate.gramsPerDay ? remainingGrams / rate.gramsPerDay : null;
  const overdue = remaining.some((entry) => entry.overdue);
  const stocked = open.length + sealed.length > 0;

  const status: ShelfStatus = !stocked
    ? item.plan && !packs.length
      ? 'plan'
      : 'out'
    : item.stopped
      ? 'stop'
      : overdue
        ? 'check'
        : daysLeft !== null && daysLeft <= settings.leadDays
          ? 'ending'
          : 'ok';

  return {
    tobaccoId: item.tobaccoId,
    status,
    last: open.length === 1 && !sealed.length,
    overdue,
    guestAvailable: stocked && !item.stopped,
    rate: rate.gramsPerDay,
    rateKind: rate.kind,
    openPacks: open.length,
    sealedPacks: sealed.length,
    remainingGrams,
    daysLeft,
    endsAt: daysLeft === null ? null : new Date(now.getTime() + daysLeft * DAY_MS),
  };
};

// Прогноз всей полки: табак без своих данных получает медиану расхода
// своего бренда.
export const forecastShelf = (items: ShelfItem[], now: Date, settings: ShelfSettings): ShelfForecast[] => {
  const rates = items.map((item) => consumptionRate(item.packs, now));
  const brandRates = new Map<string, number[]>();
  items.forEach((item, index) => {
    const rate = rates[index];
    if (rate.kind === 'own') brandRates.set(item.brand, [...(brandRates.get(item.brand) ?? []), rate.gramsPerDay]);
  });
  return items.map((item, index) =>
    shelfForecast(item, withBrandFallback(rates[index], brandRates.get(item.brand) ?? []), now, settings),
  );
};

export const todayForecast = (forecasts: ShelfForecast[], bowlGrams: number) => {
  const grams = sum(forecasts.filter((forecast) => forecast.openPacks > 0).map((forecast) => forecast.rate ?? 0));
  return { grams, bowls: grams / bowlGrams };
};

export const reorderList = (items: ShelfItem[], forecasts: ShelfForecast[], settings: ShelfSettings): ReorderLine[] => {
  const byId = new Map(forecasts.map((forecast) => [forecast.tobaccoId, forecast]));
  const lines: ReorderLine[] = [];
  for (const item of items) {
    const forecast = byId.get(item.tobaccoId);
    if (!forecast || !(item.keepStocked || item.plan)) continue;
    const missing = forecast.status === 'out' || forecast.status === 'plan';
    if (!missing && !(forecast.daysLeft !== null && forecast.daysLeft <= settings.leadDays)) continue;
    lines.push({
      tobaccoId: item.tobaccoId,
      status: forecast.status,
      quantity: forecast.rate ? Math.max(1, Math.ceil((forecast.rate * REORDER_DAYS) / item.packWeight)) : 1,
      daysLeft: forecast.daysLeft,
      endsAt: forecast.endsAt,
    });
  }
  const rank = (line: ReorderLine) =>
    line.status === 'out' || line.status === 'plan' ? -Infinity : line.endsAt?.getTime() ?? Infinity;
  return lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => rank(a.line) - rank(b.line) || a.index - b.index)
    .map(({ line }) => line);
};

export const gramPrice = (pack: Pack) => (pack.price === null ? null : pack.price / pack.weight);

export const bowlCost = (packs: ResolvedPack[], bowlGrams: number) => {
  const prices = packs
    .filter((pack) => pack.state === 'open')
    .map(gramPrice)
    .filter((price): price is number => price !== null);
  return prices.length ? (bowlGrams * sum(prices)) / prices.length : null;
};
