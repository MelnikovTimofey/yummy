import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import type { DeliveryStatus } from './deliveries';
import {
  appByTobacco,
  baseList,
  FAST_WINDOW_DAYS,
  fastList,
  idleList,
  IDLE_DAYS,
  profileShares,
  shelfMedianRate,
  trialRow,
  type AppStats,
  type BaseFlag,
  type JournalEntry,
  type ProfileFlag,
} from './purchase';
import {
  horizonView,
  loadDroppedShelf,
  loadShelf,
  loadShelfHistory,
  parseList,
  trialOf,
  type HorizonView,
  type ShelfRecord,
  type TrialVerdict,
} from './shelf';
import {
  baseBudget,
  bowlCost,
  consumptionByPeriod,
  gramPrice,
  reorderList,
  todayForecast,
  type Rate,
  weekdayFactor,
  weekPeriods,
  type ShelfForecast,
  type ShelfSettings,
  type ShelfStatus,
  type SupplyInterval,
} from './stock';

export { weekPeriods };

// «К заказу» и блок «Полка» дашборда (#152, срез 4): только чтение полки,
// поставок и «Покурить». Недели, месяц и день недели — в часовом поясе процесса.

const DAY_MS = 86_400_000;
const WEEKS = 5;
const ENDING_LIMIT = 8;
const WEEKDAY_WINDOW_DAYS = 28;

type TobaccoRef = { id: string; manufacturer: string; lineName: string; name: string };
type SupplierRef = { id: string; name: string };

export type ReorderItemView = {
  tobacco: TobaccoRef;
  status: ShelfStatus;
  daysLeft: number | null;
  endsAt: string | null;
  rate: number | null;
  rateKind: ShelfForecast['rateKind'];
  monthGrams: number | null;
  leftGrams: number | null;
  gramPriceKop: number | null;
  // Закончится не за срок поставки, а до следующей поставки по интервалу.
  byInterval: boolean;
};

export type ReorderGroup = {
  supplier: SupplierRef | null;
  lastInvoice: { number: string | null; date: string; status: DeliveryStatus } | null;
  items: ReorderItemView[];
};

export type ReorderView = {
  groups: ReorderGroup[];
  settings: ShelfSettings;
  interval: SupplyInterval;
  horizon: HorizonView;
  text: Array<{ supplierId: string | null; text: string }>;
};

// База — Σ расход в месяц × цена грамма по «держим постоянно»; unknownCount — без
// цены или расхода, в базу не вошли. leftKop — остаётся на то, чего нет, и пробы.
export type BudgetView = {
  budgetKop: number | null;
  baseKop: number;
  baseCount: number;
  unknownCount: number;
  leftKop: number | null;
};

export type ShelfDashboard = {
  today: { grams: number; bowls: number; weekdayFactor: number | null; weekday: number };
  ending: Array<{ tobacco: TobaccoRef; status: ShelfStatus; daysLeft: number | null; endsAt: string | null }>;
  spend: { month: string; bySupplier: Array<{ supplier: SupplierRef | null; sumKop: number }>; totalKop: number };
  budget: BudgetView;
  bowlCostKop: number | null;
  stockValueKop: number;
  weekly: Array<{ from: string; to: string; grams: number; partial: boolean }>;
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);
const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const tobaccoOf = (record: ShelfRecord): TobaccoRef => ({
  id: record.tobacco.id,
  manufacturer: record.tobacco.manufacturer,
  lineName: record.tobacco.lineName,
  name: record.tobacco.name,
});

// --- к заказу ----------------------------------------------------------------

type OrderLine = { tobacco: Pick<TobaccoRef, 'manufacturer' | 'lineName' | 'name'> };

// Только названия: сколько заказать, мастер впишет сам (#323).
export const orderText = (lines: OrderLine[]) =>
  [
    'Добрый день! Заказ:',
    ...lines.map(({ tobacco }) => [tobacco.manufacturer, tobacco.lineName, tobacco.name].filter(Boolean).join(' ')),
    'Спасибо!',
  ].join('\n');

// Журнал отсортирован по времени: берём последний приход с поставщиком.
const lastSupplier = (record: ShelfRecord): SupplierRef | null =>
  [...record.entries].reverse().find((entry) => entry.delivery?.supplier)?.delivery?.supplier ?? null;

const loadLastInvoices = async (supplierIds: string[]) => {
  const invoices = await prisma.delivery.findMany({
    where: { kind: 'invoice', supplierId: { in: supplierIds } },
    select: { supplierId: true, number: true, invoiceDate: true, createdAt: true, status: true },
  });
  const latest = new Map<string, ReorderGroup['lastInvoice'] & { at: Date }>();
  for (const invoice of invoices) {
    const at = invoice.invoiceDate ?? invoice.createdAt;
    const current = latest.get(invoice.supplierId!);
    if (current && current.at >= at) continue;
    latest.set(invoice.supplierId!, {
      at,
      number: invoice.number,
      date: at.toISOString().slice(0, 10),
      status: invoice.status as DeliveryStatus,
    });
  }
  return latest;
};

export const getReorder = async (now = new Date()): Promise<ReorderView> => {
  const { records, items, forecasts, settings, interval, horizon } = await loadShelf(now);
  const byId = new Map(records.map((record, index) => [record.tobaccoId, { record, item: items[index], forecast: forecasts[index] }]));

  // reorderList уже отсортирован по срочности: группы идут в порядке первой строки,
  // «Поставщик не выбран» — последней.
  const groups = new Map<string | null, ReorderGroup>();
  for (const line of reorderList(items, forecasts, horizon)) {
    const { record, item, forecast } = byId.get(line.tobaccoId)!;
    const supplier = lastSupplier(record);
    const key = supplier?.id ?? null;
    if (!groups.has(key)) groups.set(key, { supplier, lastInvoice: null, items: [] });
    groups.get(key)!.items.push({
      tobacco: tobaccoOf(record),
      status: line.status,
      daysLeft: line.daysLeft,
      endsAt: iso(line.endsAt),
      rate: forecast.rate,
      rateKind: forecast.rateKind,
      monthGrams: forecast.monthGrams,
      leftGrams: forecast.leftGrams === null ? null : Math.round(forecast.leftGrams),
      gramPriceKop: gramPrice(item.entries),
      byInterval: line.byInterval,
    });
  }

  const invoices = await loadLastInvoices([...groups.keys()].filter((key): key is string => key !== null));
  const ordered = [...groups.values()].sort((a, b) => Number(a.supplier === null) - Number(b.supplier === null));
  const result = ordered.map((group) => {
    const invoice = group.supplier ? invoices.get(group.supplier.id) : undefined;
    return {
      ...group,
      lastInvoice: invoice ? { number: invoice.number, date: invoice.date, status: invoice.status } : null,
    };
  });

  return {
    groups: result,
    settings,
    interval,
    horizon: horizonView(horizon, now),
    text: result.map((group) => ({ supplierId: group.supplier?.id ?? null, text: orderText(group.items) })),
  };
};

// --- дашборд -----------------------------------------------------------------

const loadSmokeEvents = async (now: Date) => {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WEEKDAY_WINDOW_DAYS);
  const where = { createdAt: { gte: since, lt: now } };
  const select = { createdAt: true } as const;
  const orderBy = { createdAt: 'asc' } as const;
  const [guest, custom, firstGuest, firstCustom] = await Promise.all([
    prisma.smokeCtaEvent.findMany({ where, select }),
    prisma.customMixSmokeEvent.findMany({ where, select }),
    prisma.smokeCtaEvent.findFirst({ select, orderBy }),
    prisma.customMixSmokeEvent.findFirst({ select, orderBy }),
  ]);
  const firsts = [firstGuest?.createdAt, firstCustom?.createdAt].filter((date): date is Date => date !== undefined);
  return {
    events: [...guest, ...custom].map((event) => event.createdAt),
    first: firsts.length ? new Date(Math.min(...firsts.map((date) => date.getTime()))) : null,
  };
};

const loadMonthSpend = async (now: Date) => {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const receipts = await prisma.stockEntry.findMany({
    where: {
      kind: 'receipt',
      priceKop: { not: null },
      delivery: { status: 'received', kind: { not: 'start' }, receivedAt: { gte: from, lte: now } },
    },
    select: { priceKop: true, delivery: { select: { supplier: { select: { id: true, name: true } } } } },
  });
  const bySupplier = new Map<string | null, { supplier: SupplierRef | null; sumKop: number }>();
  for (const receipt of receipts) {
    const supplier = receipt.delivery?.supplier ?? null;
    const entry = bySupplier.get(supplier?.id ?? null) ?? { supplier, sumKop: 0 };
    entry.sumKop += receipt.priceKop!;
    bySupplier.set(supplier?.id ?? null, entry);
  }
  const rows = [...bySupplier.values()].sort((a, b) => b.sumKop - a.sumKop);
  return {
    month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    bySupplier: rows,
    totalKop: sum(rows.map((row) => row.sumKop)),
  };
};

const endingOf = (records: ShelfRecord[], forecasts: ShelfForecast[]) => {
  const rows = forecasts
    .map((forecast, index) => ({ forecast, record: records[index] }))
    .filter(({ forecast, record }) => forecast.status === 'ending' || (forecast.status === 'out' && record.keepStocked));
  const rank = ({ forecast }: (typeof rows)[number]) =>
    forecast.status === 'out' ? -Infinity : forecast.endsAt?.getTime() ?? Infinity;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index)
    .slice(0, ENDING_LIMIT)
    .map(({ row: { forecast, record } }) => ({
      tobacco: tobaccoOf(record),
      status: forecast.status,
      daysLeft: forecast.daysLeft,
      endsAt: iso(forecast.endsAt),
    }));
};

const budgetOf = (
  records: ShelfRecord[],
  forecasts: ShelfForecast[],
  prices: Array<number | null>,
  settings: ShelfSettings,
): BudgetView => {
  const base = baseBudget(
    forecasts
      .map((forecast, index) => ({ forecast, record: records[index], price: prices[index] }))
      .filter(({ record }) => record.status === 'active' && record.keepStocked)
      .map(({ forecast, price }) => ({ monthGrams: forecast.monthGrams, gramPriceKop: price })),
  );
  const baseKop = Math.round(base.kop);
  return {
    budgetKop: settings.budgetKop,
    baseKop,
    baseCount: base.count,
    unknownCount: base.unknown,
    leftKop: settings.budgetKop === null ? null : settings.budgetKop - baseKop,
  };
};

export const getShelfDashboard = async (now = new Date()): Promise<ShelfDashboard> => {
  const [{ records, items, forecasts, settings }, history, smoke, spend] = await Promise.all([
    loadShelf(now),
    loadShelfHistory(),
    loadSmokeEvents(now),
    loadMonthSpend(now),
  ]);

  const factor = weekdayFactor(smoke.events, smoke.first, now);
  const today = todayForecast(forecasts, settings.bowlGrams);
  const grams = today.grams * (factor ?? 1);

  const prices = items.map((item) => gramPrice(item.entries));
  const cost = bowlCost(prices.filter((_, index) => forecasts[index].inStock), settings.bowlGrams);
  const stockValue = sum(
    forecasts.map((forecast, index) =>
      forecast.inStock && prices[index] !== null ? (forecast.leftGrams ?? 0) * prices[index]! : 0,
    ),
  );

  const periods = weekPeriods(now, WEEKS);
  const weekGrams = periods.map(() => 0);
  for (const item of history) {
    consumptionByPeriod(item.entries, periods).forEach((value, index) => {
      weekGrams[index] += value;
    });
  }

  return {
    today: { grams, bowls: grams / settings.bowlGrams, weekdayFactor: factor, weekday: ((now.getDay() + 6) % 7) + 1 },
    ending: endingOf(records, forecasts),
    spend,
    budget: budgetOf(records, forecasts, prices, settings),
    bowlCostKop: cost === null ? null : Math.round(cost),
    stockValueKop: Math.round(stockValue),
    weekly: periods.map((period, index) => ({
      from: localDate(period.from),
      to: localDate(period.partial ? period.to : new Date(period.to.getTime() - DAY_MS / 2)),
      grams: weekGrams[index],
      partial: period.partial,
    })),
  };
};

// --- закупка (#327–#331) -----------------------------------------------------

const PURCHASE_MONTH_DAYS = 30;

export type PurchaseView = {
  // Первая запись журнала остатка: с неё идёт учёт в граммах.
  since: string | null;
  budget: BudgetView;
  spend: { month: string; totalKop: number };
  base: {
    enough: boolean;
    medianMonthGrams: number | null;
    counts: Record<BaseFlag, number>;
    rows: Array<{
      tobacco: TobaccoRef;
      monthGrams: number | null;
      rateKind: Rate['kind'];
      share: number | null;
      rubKop: number | null;
      gramPriceKop: number | null;
      app: AppStats;
      keepStocked: boolean;
      flag: BaseFlag | null;
    }>;
  };
  fast: {
    enough: boolean;
    rows: Array<{
      tobacco: TobaccoRef;
      receiptGrams: number;
      receivedAt: string;
      goneDays: number;
      emptyAt: string;
      emptyDays: number;
      ongoing: boolean;
      next: { grams: number; at: string } | null;
      times: number;
      status: ShelfStatus;
    }>;
  };
  trials: {
    enough: boolean;
    medianRate: number | null;
    rows: Array<{
      tobacco: TobaccoRef;
      receiptGrams: number;
      receivedAt: string;
      rate: number | null;
      speed: number | null;
      goneDays: number | null;
      app: AppStats;
      mixCount: number;
      trialVerdict: TrialVerdict | null;
      trialMarkedAt: string | null;
    }>;
  };
  idle: {
    enough: boolean;
    totalKop: number;
    unknownPriceCount: number;
    unmarkedCount: number;
    rows: Array<{
      tobacco: TobaccoRef;
      leftGrams: number;
      rate21: number;
      rubKop: number | null;
      receivedAt: string;
      days: number;
      keepStocked: boolean;
    }>;
  };
  profiles: {
    enough: boolean;
    appEvents: number;
    appEnough: boolean;
    rows: Array<{ key: string; spend: number; shelf: number; app: number; flag: ProfileFlag | null }>;
  };
};

const NO_APP: AppStats = { smokes: 0, rating: null, ratings: 0 };

const journalOf = (record: ShelfRecord): JournalEntry[] =>
  record.entries.map((entry) => ({
    id: entry.id,
    kind: entry.kind as JournalEntry['kind'],
    grams: entry.grams,
    at: entry.at,
    priceKop: entry.priceKop,
    start: entry.delivery?.kind === 'start',
  }));

const stringsOf = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

// Гостевые данные — только агрегаты по миксам: события без гостя, оценки — средним.
const loadApp = async (tobaccoIds: string[], now: Date) => {
  const since = new Date(now.getTime() - PURCHASE_MONTH_DAYS * DAY_MS);
  const createdAt = { gte: since, lte: now };
  const [components, events, custom] = await Promise.all([
    prisma.mixComponent.findMany({
      where: { tobaccoId: { in: tobaccoIds } },
      select: { mixId: true, tobaccoId: true, mix: { select: { available: true } } },
    }),
    prisma.smokeCtaEvent.findMany({ where: { createdAt }, select: { mixId: true, mixProfiles: true } }),
    prisma.customMixSmokeEvent.findMany({ where: { createdAt }, select: { components: true } }),
  ]);
  const ratings = await prisma.mixRating.groupBy({
    by: ['mixId'],
    where: { mixId: { in: [...new Set(components.map((component) => component.mixId))] } },
    _avg: { value: true },
    _count: { _all: true },
  });
  const customTobaccos = custom.map((event) =>
    (Array.isArray(event.components) ? event.components : [])
      .map((component) => (component as { tobaccoId?: unknown } | null)?.tobaccoId)
      .filter((id): id is string => typeof id === 'string'),
  );
  const mixCount = new Map<string, number>();
  for (const component of components) {
    if (component.mix.available) mixCount.set(component.tobaccoId, (mixCount.get(component.tobaccoId) ?? 0) + 1);
  }
  return {
    stats: appByTobacco({
      components,
      events,
      custom: customTobaccos.map((ids) => ({ tobaccoIds: ids })),
      ratings: ratings.map((rating) => ({ mixId: rating.mixId, avg: rating._avg.value ?? 0, count: rating._count._all })),
    }),
    mixCount,
    eventProfiles: events.map((event) => stringsOf(event.mixProfiles)),
    customTobaccos,
  };
};

export const getPurchase = async (now = new Date()): Promise<PurchaseView> => {
  const [{ records, items, forecasts, settings }, dropped, spend] = await Promise.all([
    loadShelf(now),
    loadDroppedShelf(),
    loadMonthSpend(now),
  ]);
  const app = await loadApp(records.map((record) => record.tobaccoId), now);
  const appOf = (record: ShelfRecord) => app.stats.get(record.tobaccoId) ?? NO_APP;

  const prices = items.map((item) => gramPrice(item.entries));
  const rows = records
    .map((record, index) => ({ record, item: items[index], forecast: forecasts[index], price: prices[index], journal: journalOf(record) }))
    .filter(({ record }) => record.status === 'active');
  const byId = new Map(rows.map((row) => [row.record.tobaccoId, row]));
  const rateOf = (forecast: ShelfForecast): Rate =>
    forecast.rateKind === 'none' ? { gramsPerDay: null, kind: 'none' } : { gramsPerDay: forecast.rate!, kind: forecast.rateKind };

  const firstEntry = [...records, ...dropped].flatMap((record) => record.entries.slice(0, 1)).map((entry) => entry.at.getTime());
  const since = firstEntry.length ? new Date(Math.min(...firstEntry)) : null;

  const base = baseList(
    rows.map(({ record, forecast, price }) => ({
      tobaccoId: record.tobaccoId,
      keepStocked: record.keepStocked,
      rate: rateOf(forecast),
      gramPriceKop: price,
    })),
  );

  const fastWindow = now.getTime() - FAST_WINDOW_DAYS * DAY_MS;
  const fast = fastList(
    rows.map(({ record, forecast, journal }) => ({ tobaccoId: record.tobaccoId, status: forecast.status, entries: journal })),
    now,
  );

  const medianRate = shelfMedianRate(rows.map(({ forecast }) => rateOf(forecast)));
  const trials = rows
    .filter(({ record }) => trialOf(record, now))
    .map(({ record, forecast, journal }) => {
      const first = record.entries.find((entry) => entry.kind === 'receipt')!;
      return { record, row: trialRow({ rate: rateOf(forecast), entries: journal, firstReceipt: { at: first.at, grams: first.grams } }, medianRate, now) };
    })
    .sort((a, b) => b.row.receivedAt.getTime() - a.row.receivedAt.getTime());

  const idle = idleList(
    rows.map(({ record, forecast, item, price }) => ({
      tobaccoId: record.tobaccoId,
      keepStocked: record.keepStocked,
      stopped: record.stopped,
      inStock: forecast.inStock,
      leftGrams: forecast.leftGrams,
      gramPriceKop: price,
      entries: item.entries,
    })),
    now,
  );

  const month = [{ from: new Date(now.getTime() - PURCHASE_MONTH_DAYS * DAY_MS), to: now }];
  const shelfProfiles = new Map([...records, ...dropped].map((record) => [record.tobaccoId, parseList(record.tobacco.flavorProfiles)]));
  const profiles = profileShares({
    spend: [...records, ...dropped].map((record) => ({
      profiles: shelfProfiles.get(record.tobaccoId)!,
      grams: consumptionByPeriod(journalOf(record), month)[0],
    })),
    shelf: rows.filter(({ forecast }) => forecast.inStock).map(({ record }) => ({ profiles: shelfProfiles.get(record.tobaccoId)! })),
    app: [
      ...app.eventProfiles.map((profiles) => ({ profiles })),
      ...app.customTobaccos.map((ids) => ({ profiles: ids.flatMap((id) => shelfProfiles.get(id) ?? []) })),
    ],
  });

  const tobacco = (tobaccoId: string) => tobaccoOf(byId.get(tobaccoId)!.record);
  return {
    since: iso(since),
    budget: budgetOf(records, forecasts, prices, settings),
    spend: { month: spend.month, totalKop: spend.totalKop },
    base: {
      enough: base.enough,
      medianMonthGrams: base.medianMonthGrams,
      counts: base.counts,
      rows: base.rows.map(({ tobaccoId, ...row }) => ({
        tobacco: tobacco(tobaccoId),
        monthGrams: row.monthGrams,
        rateKind: row.rateKind,
        share: row.share,
        rubKop: row.rubKop,
        gramPriceKop: byId.get(tobaccoId)!.price,
        app: appOf(byId.get(tobaccoId)!.record),
        keepStocked: row.keepStocked,
        flag: row.flag,
      })),
    },
    fast: {
      enough: rows.some(({ journal }) =>
        journal.some((entry) => entry.kind === 'count' && entry.grams === 0 && entry.at.getTime() >= fastWindow),
      ),
      rows: fast.map((row) => ({
        tobacco: tobacco(row.tobaccoId),
        receiptGrams: row.grams,
        receivedAt: row.receivedAt.toISOString(),
        goneDays: row.goneDays,
        emptyAt: row.emptyAt.toISOString(),
        emptyDays: row.emptyDays,
        ongoing: row.ongoing,
        next: row.next && { grams: row.next.grams, at: row.next.at.toISOString() },
        times: row.times,
        status: row.status,
      })),
    },
    trials: {
      enough: medianRate !== null,
      medianRate,
      rows: trials.map(({ record, row }) => ({
        tobacco: tobaccoOf(record),
        receiptGrams: row.receiptGrams,
        receivedAt: row.receivedAt.toISOString(),
        rate: row.rate,
        speed: row.speed,
        goneDays: row.goneDays,
        app: appOf(record),
        mixCount: app.mixCount.get(record.tobaccoId) ?? 0,
        trialVerdict: record.trialVerdict as TrialVerdict | null,
        trialMarkedAt: iso(record.trialMarkedAt),
      })),
    },
    idle: {
      enough: since !== null && now.getTime() - since.getTime() > IDLE_DAYS * DAY_MS,
      totalKop: idle.totalKop,
      unknownPriceCount: idle.unknownPriceCount,
      unmarkedCount: idle.unmarkedCount,
      rows: idle.rows.map(({ tobaccoId, receivedAt, ...row }) => ({
        tobacco: tobacco(tobaccoId),
        ...row,
        receivedAt: receivedAt.toISOString(),
      })),
    },
    profiles,
  };
};

// --- маршруты ----------------------------------------------------------------

type Authenticate = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

export const registerShelfInsightsRoutes = (app: FastifyInstance, authenticate: Authenticate) => {
  app.get('/staff/shelf/reorder', async (request, reply) => {
    if (!(await authenticate(request, reply))) return;
    return reply.send(await getReorder());
  });

  app.get('/staff/shelf/dashboard', async (request, reply) => {
    if (!(await authenticate(request, reply))) return;
    return reply.send(await getShelfDashboard());
  });

  app.get('/staff/shelf/purchase', async (request, reply) => {
    if (!(await authenticate(request, reply))) return;
    return reply.send(await getPurchase());
  });
};
