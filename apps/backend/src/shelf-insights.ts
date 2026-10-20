import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import type { DeliveryStatus } from './deliveries';
import { loadShelf, loadShelfHistory, type ShelfRecord } from './shelf';
import {
  bowlCost,
  consumptionByPeriod,
  gramPrice,
  openRemaining,
  reorderList,
  resolvePacks,
  todayForecast,
  weekdayFactor,
  type Period,
  type ShelfForecast,
  type ShelfSettings,
  type ShelfStatus,
} from './stock';

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
  quantity: number;
  packWeight: number;
  lastPriceKop: number | null;
};

export type ReorderGroup = {
  supplier: SupplierRef | null;
  lastInvoice: { number: string | null; date: string; status: DeliveryStatus } | null;
  items: ReorderItemView[];
  // null — хоть у одной строки нет последней цены.
  sumKop: number | null;
};

export type ReorderView = {
  groups: ReorderGroup[];
  settings: ShelfSettings;
  text: Array<{ supplierId: string | null; text: string }>;
};

export type ShelfDashboard = {
  today: { grams: number; bowls: number; weekdayFactor: number | null; weekday: number };
  ending: Array<{ tobacco: TobaccoRef; status: ShelfStatus; daysLeft: number | null; endsAt: string | null }>;
  spend: { month: string; bySupplier: Array<{ supplier: SupplierRef | null; sumKop: number }>; totalKop: number };
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

type OrderLine = { tobacco: Pick<TobaccoRef, 'manufacturer' | 'lineName' | 'name'>; packWeight: number; quantity: number };

export const orderText = (lines: OrderLine[]) =>
  [
    'Добрый день! Заказ:',
    ...lines.map(({ tobacco, packWeight, quantity }) =>
      `${[tobacco.manufacturer, tobacco.lineName, tobacco.name].filter(Boolean).join(' ')} ${packWeight} г — ${quantity} шт`,
    ),
    'Спасибо!',
  ].join('\n');

// Банки отсортированы по приходу: берём последнюю с поставщиком и последнюю с ценой.
const lastSupplier = (record: ShelfRecord): SupplierRef | null =>
  [...record.packs].reverse().find((pack) => pack.delivery?.supplier)?.delivery?.supplier ?? null;

const lastPrice = (record: ShelfRecord) => [...record.packs].reverse().find((pack) => pack.priceKop !== null)?.priceKop ?? null;

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
  const { records, items, forecasts, settings } = await loadShelf(now);
  const byId = new Map(records.map((record, index) => [record.tobaccoId, { record, forecast: forecasts[index] }]));

  // reorderList уже отсортирован по срочности: группы идут в порядке первой строки,
  // «Поставщик не выбран» — последней.
  const groups = new Map<string | null, ReorderGroup>();
  for (const line of reorderList(items, forecasts, settings)) {
    const { record, forecast } = byId.get(line.tobaccoId)!;
    const supplier = lastSupplier(record);
    const key = supplier?.id ?? null;
    if (!groups.has(key)) groups.set(key, { supplier, lastInvoice: null, items: [], sumKop: null });
    groups.get(key)!.items.push({
      tobacco: tobaccoOf(record),
      status: line.status,
      daysLeft: line.daysLeft,
      endsAt: iso(line.endsAt),
      rate: forecast.rate,
      rateKind: forecast.rateKind,
      quantity: line.quantity,
      packWeight: record.packWeight,
      lastPriceKop: lastPrice(record),
    });
  }

  const invoices = await loadLastInvoices([...groups.keys()].filter((key): key is string => key !== null));
  const ordered = [...groups.values()].sort((a, b) => Number(a.supplier === null) - Number(b.supplier === null));
  const result = ordered.map((group) => {
    const invoice = group.supplier ? invoices.get(group.supplier.id) : undefined;
    const priced = group.items.every((item) => item.lastPriceKop !== null);
    return {
      ...group,
      lastInvoice: invoice ? { number: invoice.number, date: invoice.date, status: invoice.status } : null,
      sumKop: priced ? sum(group.items.map((item) => item.quantity * item.lastPriceKop!)) : null,
    };
  });

  return {
    groups: result,
    settings,
    text: result.map((group) => ({ supplierId: group.supplier?.id ?? null, text: orderText(group.items) })),
  };
};

// --- дашборд -----------------------------------------------------------------

// Недели с понедельника; последняя — текущая, до сейчас.
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
  const packs = await prisma.pack.findMany({
    where: {
      priceKop: { not: null },
      delivery: { status: 'received', kind: { not: 'start' }, receivedAt: { gte: from, lte: now } },
    },
    select: { priceKop: true, delivery: { select: { supplier: { select: { id: true, name: true } } } } },
  });
  const bySupplier = new Map<string | null, { supplier: SupplierRef | null; sumKop: number }>();
  for (const pack of packs) {
    const supplier = pack.delivery?.supplier ?? null;
    const entry = bySupplier.get(supplier?.id ?? null) ?? { supplier, sumKop: 0 };
    entry.sumKop += pack.priceKop!;
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

export const getShelfDashboard = async (now = new Date()): Promise<ShelfDashboard> => {
  const [{ records, items, forecasts, settings }, history, smoke, spend] = await Promise.all([
    loadShelf(now),
    loadShelfHistory(),
    loadSmokeEvents(now),
    loadMonthSpend(now),
  ]);

  const factor = weekdayFactor(smoke.events, smoke.first, now);
  const base = todayForecast(forecasts, settings.bowlGrams);
  const grams = base.grams * (factor ?? 1);

  const resolved = items.map((item) => resolvePacks(item.packs));
  const cost = bowlCost(resolved.flat(), settings.bowlGrams);
  const stockValue = sum(
    resolved.flatMap((packs, index) =>
      packs.map((pack) => {
        const price = gramPrice(pack);
        if (price === null) return 0;
        if (pack.state === 'sealed') return pack.weight * price;
        if (pack.state === 'open') return openRemaining(pack, forecasts[index].rate, now, packs).grams * price;
        return 0;
      }),
    ),
  );

  const periods = weekPeriods(now, WEEKS);
  const weekGrams = periods.map(() => 0);
  for (const item of history) {
    consumptionByPeriod(item.packs, periods).forEach((value, index) => {
      weekGrams[index] += value;
    });
  }

  return {
    today: { grams, bowls: grams / settings.bowlGrams, weekdayFactor: factor, weekday: ((now.getDay() + 6) % 7) + 1 },
    ending: endingOf(records, forecasts),
    spend,
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
};
