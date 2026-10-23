// «Закупка» (#327–#331): чистые функции поверх журнала остатка. Решения закупки —
// только по расходу точки; «Покурить» и оценки приложения — справочно, в пороги
// и подсказки не входят.

import {
  consumptionRate,
  CORRECTION_MS,
  median,
  MIN_SEGMENT_MS,
  type Rate,
  type ShelfStatus,
  type StockEntry,
} from './stock';

// start — приход стартовой поставки: табак стоял на полке до учёта, это не поставка.
export type JournalEntry = StockEntry & { start?: boolean };

const DAY_MS = 86_400_000;
const MONTH_DAYS = 30;
export const FAST_WINDOW_DAYS = 60;
export const FAST_DAYS = 3;
export const IDLE_DAYS = 21;
export const IDLE_GRAMS_PER_DAY = 2;
export const PROFILE_RATIO = 1.5;
// Меньше трёх табаков со своим расходом — медиана и доли случайны.
export const MIN_RATED = 3;
// Меньше — колонка приложения во «Вкусах» скрывается.
export const APP_MIN_EVENTS = 20;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const byTime = (entries: JournalEntry[]) => [...entries].sort((a, b) => a.at.getTime() - b.at.getTime());

// --- циклы «приход → Закончился» -------------------------------------------------

export type Cycle = {
  receivedAt: Date;
  // Все приходы цикла: с первого после прошлого «Закончился» до этого.
  grams: number;
  emptyAt: Date;
  goneDays: number;
  // Без табака — от «Закончился» до следующего прихода или до сейчас (ongoing).
  emptyDays: number;
  ongoing: boolean;
  next: { at: Date; grams: number } | null;
};

// Правила #306: отрезок короче 6 ч не считается; «Закончился», исправленный
// отметкой в пределах 30 минут, — не «Закончился».
export const emptyCycles = (entries: JournalEntry[], now: Date): Cycle[] => {
  const list = byTime(entries);
  const cycles: Array<Omit<Cycle, 'emptyDays' | 'ongoing'>> = [];
  let open: { at: Date; grams: number } | null = null;
  let waiting: (typeof cycles)[number] | null = null;
  list.forEach((entry, index) => {
    if (entry.kind === 'receipt') {
      if (waiting) waiting.next = { at: entry.at, grams: entry.grams };
      waiting = null;
      if (entry.start) return;
      if (open) open.grams += entry.grams;
      else open = { at: entry.at, grams: entry.grams };
      return;
    }
    if (entry.kind !== 'count' || entry.grams !== 0) return;
    const following = list[index + 1];
    if (following?.kind === 'count' && following.at.getTime() - entry.at.getTime() < CORRECTION_MS) return;
    if (open && entry.at.getTime() - open.at.getTime() >= MIN_SEGMENT_MS) {
      const cycle = {
        receivedAt: open.at,
        grams: open.grams,
        emptyAt: entry.at,
        goneDays: (entry.at.getTime() - open.at.getTime()) / DAY_MS,
        next: null,
      };
      cycles.push(cycle);
      waiting = cycle;
    }
    open = null;
  });
  return cycles.map((cycle) => ({
    ...cycle,
    emptyDays: ((cycle.next?.at ?? now).getTime() - cycle.emptyAt.getTime()) / DAY_MS,
    ongoing: cycle.next === null,
  }));
};

// --- закончились быстро (#328) ---------------------------------------------------

export type FastRow = Cycle & { tobaccoId: string; status: ShelfStatus; times: number };

// Последний быстрый цикл табака за 60 дней и сколько их было. Сначала то, чего
// нет сейчас, затем по дням без табака.
export const fastList = (
  items: Array<{ tobaccoId: string; status: ShelfStatus; entries: JournalEntry[] }>,
  now: Date,
): FastRow[] => {
  const windowStart = now.getTime() - FAST_WINDOW_DAYS * DAY_MS;
  const rows: FastRow[] = [];
  for (const item of items) {
    const fast = emptyCycles(item.entries, now).filter(
      (cycle) => cycle.receivedAt.getTime() >= windowStart && cycle.goneDays <= FAST_DAYS,
    );
    if (!fast.length) continue;
    rows.push({ ...fast[fast.length - 1], tobaccoId: item.tobaccoId, status: item.status, times: fast.length });
  }
  return rows.sort((a, b) => Number(b.status === 'out') - Number(a.status === 'out') || b.emptyDays - a.emptyDays);
};

// --- пробы (#329) ----------------------------------------------------------------

export const shelfMedianRate = (rates: Rate[]) => {
  const own = rates.filter((rate) => rate.kind === 'own').map((rate) => rate.gramsPerDay!);
  return own.length < MIN_RATED ? null : median(own);
};

// rate — свой расход табака; без отметок остатка или «Закончился» его нет — мало данных.
export const trialRow = (
  input: { rate: Rate; entries: JournalEntry[]; firstReceipt: { at: Date; grams: number } },
  shelfMedian: number | null,
  now: Date,
) => {
  const rate = input.rate.kind === 'own' ? input.rate.gramsPerDay : null;
  const first = emptyCycles(input.entries, now)[0];
  return {
    receiptGrams: input.firstReceipt.grams,
    receivedAt: input.firstReceipt.at,
    rate,
    speed: rate !== null && shelfMedian ? rate / shelfMedian : null,
    goneDays: first?.goneDays ?? null,
  };
};

// --- лежит (#330) ----------------------------------------------------------------

export type IdleInput = {
  tobaccoId: string;
  keepStocked: boolean;
  stopped: boolean;
  inStock: boolean;
  leftGrams: number | null;
  gramPriceKop: number | null;
  entries: StockEntry[];
};

// В наличии, не стоп, последний приход больше 21 дня назад, расход за 21 день
// меньше 2 г/день. Без отметок остатка расход неизвестен: такой табак не «лежит»,
// а считается в unmarkedCount.
export const idleList = (items: IdleInput[], now: Date) => {
  const rows = [];
  let unmarkedCount = 0;
  for (const item of items) {
    if (!item.inStock || item.stopped) continue;
    const receipt = byTime(item.entries).filter((entry) => entry.kind === 'receipt').pop();
    if (!receipt || now.getTime() - receipt.at.getTime() <= IDLE_DAYS * DAY_MS) continue;
    const rate = consumptionRate(item.entries, now, IDLE_DAYS);
    if (rate.kind === 'none') {
      unmarkedCount += 1;
      continue;
    }
    if (rate.gramsPerDay >= IDLE_GRAMS_PER_DAY) continue;
    const leftGrams = Math.round(item.leftGrams ?? 0);
    rows.push({
      tobaccoId: item.tobaccoId,
      leftGrams,
      rate21: rate.gramsPerDay,
      rubKop: item.gramPriceKop === null ? null : Math.round(leftGrams * item.gramPriceKop),
      receivedAt: receipt.at,
      days: (now.getTime() - receipt.at.getTime()) / DAY_MS,
      keepStocked: item.keepStocked,
    });
  }
  rows.sort((a, b) => (b.rubKop ?? -1) - (a.rubKop ?? -1));
  return {
    rows,
    totalKop: sum(rows.map((row) => row.rubKop ?? 0)),
    unknownPriceCount: rows.filter((row) => row.rubKop === null).length,
    unmarkedCount,
  };
};

// --- база (#327) -----------------------------------------------------------------

export type BaseFlag = 'notBase' | 'idleBase';

// rate — после подстановки медианы бренда. Подсказки только по своему расходу:
// notBase — не «держим постоянно», а расход выше медианы своих расходов полки;
// idleBase — «держим постоянно», а расход ниже порога «Лежит» (2 г/день).
export const baseList = (items: Array<{ tobaccoId: string; keepStocked: boolean; rate: Rate; gramPriceKop: number | null }>) => {
  const rated = items.filter((item) => item.rate.kind === 'own');
  const enough = rated.length >= MIN_RATED;
  const totalOwn = sum(rated.map((item) => item.rate.gramsPerDay!));
  const medianMonthGrams = enough ? median(rated.map((item) => item.rate.gramsPerDay!)) * MONTH_DAYS : null;

  const rows = items.map((item) => {
    const monthGrams = item.rate.gramsPerDay === null ? null : item.rate.gramsPerDay * MONTH_DAYS;
    const own = item.rate.kind === 'own';
    const flag: BaseFlag | null =
      !enough || !own
        ? null
        : !item.keepStocked && monthGrams! > medianMonthGrams!
          ? 'notBase'
          : item.keepStocked && monthGrams! < IDLE_GRAMS_PER_DAY * MONTH_DAYS
            ? 'idleBase'
            : null;
    return {
      tobaccoId: item.tobaccoId,
      monthGrams,
      rateKind: item.rate.kind,
      share: own && totalOwn > 0 ? item.rate.gramsPerDay! / totalOwn : null,
      rubKop: monthGrams === null || item.gramPriceKop === null ? null : Math.round(monthGrams * item.gramPriceKop),
      keepStocked: item.keepStocked,
      flag,
    };
  });
  rows.sort((a, b) => (b.monthGrams ?? -1) - (a.monthGrams ?? -1));
  return {
    enough,
    medianMonthGrams,
    rows,
    counts: {
      notBase: rows.filter((row) => row.flag === 'notBase').length,
      idleBase: rows.filter((row) => row.flag === 'idleBase').length,
    },
  };
};

// --- вкусы (#331) ----------------------------------------------------------------

export type ProfileFlag = 'more' | 'less';

const normalize = (value: string) => value.trim().toLowerCase();

// Табак (или выбор) с несколькими направлениями делится между ними поровну —
// доли каждой колонки в сумме дают 1.
const shares = (rows: Array<{ profiles: string[]; weight: number }>) => {
  const totals = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const profiles = [...new Set(row.profiles.map(normalize).filter(Boolean))];
    if (!profiles.length) continue;
    total += row.weight;
    for (const profile of profiles) totals.set(profile, (totals.get(profile) ?? 0) + row.weight / profiles.length);
  }
  return { of: (profile: string) => (total > 0 ? (totals.get(profile) ?? 0) / total : 0), keys: [...totals.keys()] };
};

// spend — граммы расхода табака за 30 дней, shelf — табаки полки в наличии,
// app — выборы «Покурить» за 30 дней. Подсветка — только по расходу против полки.
export const profileShares = (input: {
  spend: Array<{ profiles: string[]; grams: number }>;
  shelf: Array<{ profiles: string[] }>;
  app: Array<{ profiles: string[] }>;
}) => {
  const spend = shares(input.spend.map((row) => ({ profiles: row.profiles, weight: row.grams })));
  const shelf = shares(input.shelf.map((row) => ({ profiles: row.profiles, weight: 1 })));
  const app = shares(input.app.map((row) => ({ profiles: row.profiles, weight: 1 })));
  const enough = input.spend.filter((row) => row.grams > 0).length >= MIN_RATED;
  const keys = [...new Set([...spend.keys, ...shelf.keys, ...app.keys])];
  const rows = keys.map((key) => {
    const row = { key, spend: spend.of(key), shelf: shelf.of(key), app: app.of(key) };
    const flag: ProfileFlag | null = !enough
      ? null
      : row.spend > 0 && row.spend >= row.shelf * PROFILE_RATIO
        ? 'more'
        : row.shelf > 0 && row.shelf >= row.spend * PROFILE_RATIO
          ? 'less'
          : null;
    return { ...row, flag };
  });
  rows.sort((a, b) => b.spend - a.spend || b.shelf - a.shelf || a.key.localeCompare(b.key));
  return { enough, appEvents: input.app.length, appEnough: input.app.length >= APP_MIN_EVENTS, rows };
};

// --- в приложении ----------------------------------------------------------------

export type AppStats = { smokes: number; rating: number | null; ratings: number };

// Только агрегаты: «Покурить» по миксам каталога с табаком и по «Намиксуй»,
// средняя оценка гостей этих миксов (взвешенная по числу оценок).
export const appByTobacco = (input: {
  components: Array<{ mixId: string; tobaccoId: string }>;
  events: Array<{ mixId: string | null }>;
  custom: Array<{ tobaccoIds: string[] }>;
  ratings: Array<{ mixId: string; avg: number; count: number }>;
}) => {
  const smokesByMix = new Map<string, number>();
  for (const event of input.events) {
    if (event.mixId) smokesByMix.set(event.mixId, (smokesByMix.get(event.mixId) ?? 0) + 1);
  }
  const ratingByMix = new Map(input.ratings.map((rating) => [rating.mixId, rating]));
  const stats = new Map<string, { smokes: number; ratingSum: number; ratings: number }>();
  const of = (tobaccoId: string) => {
    if (!stats.has(tobaccoId)) stats.set(tobaccoId, { smokes: 0, ratingSum: 0, ratings: 0 });
    return stats.get(tobaccoId)!;
  };
  for (const { mixId, tobaccoId } of input.components) {
    const row = of(tobaccoId);
    row.smokes += smokesByMix.get(mixId) ?? 0;
    const rating = ratingByMix.get(mixId);
    if (rating) {
      row.ratingSum += rating.avg * rating.count;
      row.ratings += rating.count;
    }
  }
  for (const event of input.custom) {
    for (const tobaccoId of new Set(event.tobaccoIds)) of(tobaccoId).smokes += 1;
  }
  return new Map<string, AppStats>(
    [...stats].map(([tobaccoId, row]) => [
      tobaccoId,
      { smokes: row.smokes, rating: row.ratings ? row.ratingSum / row.ratings : null, ratings: row.ratings },
    ]),
  );
};
