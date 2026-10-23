import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { AuditAction } from './audit';
import type { StaffUser } from './auth';
import { prisma } from './db';
import {
  bowlCost,
  consumptionByPeriod,
  DEFAULT_SETTINGS,
  forecastShelf,
  fractionGrams,
  gramPrice,
  horizonOf,
  isTrial,
  segments,
  stockState,
  supplyInterval,
  todayForecast,
  weekPeriods,
  type Horizon,
  type LeftSource,
  type ShelfForecast,
  type ShelfItem,
  type ShelfSettings,
  type ShelfStatus,
  type StockEntry,
  type StockEntryKind,
  type SupplyInterval,
} from './stock';

// Полка точки (#152, #306): единственный модуль, который пишет Tobacco.inStock.
// Наличие для гостя = на полке (active) И не стоп И остаток по учёту больше нуля
// И табак не в архиве. Остаток — журнал StockEntry в граммах.

type Tx = Prisma.TransactionClient;

export type ShelfActor = Pick<StaffUser, 'login' | 'name' | 'role'>;
export type ShelfItemStatus = 'active' | 'plan' | 'dropped';

export class ShelfNotFoundError extends Error {
  name = 'ShelfNotFoundError';
}

export class ShelfConflictError extends Error {
  name = 'ShelfConflictError';
  constructor(
    readonly code: 'no_stock' | 'no_receipt' | 'entry_from_delivery',
    message: string,
  ) {
    super(message);
  }
}

export class ShelfValidationError extends Error {
  name = 'ShelfValidationError';
}

export const MARK_FRACTIONS = [0.75, 0.5, 1 / 3, 0.25] as const;

const DAY_MS = 86_400_000;
const MAX_GRAMS = 20_000;
// 10 млн ₽ в месяц — заведомо больше бюджета одной точки.
const MAX_BUDGET_KOP = 1_000_000_000;
const MAX_BATCH = 500;
const INTERVAL_LOOKBACK_DAYS = 92;
const TRIAL_VERDICTS = ['yes', 'no'] as const;
const BATCH_PREFIX = 'batch:';
const HISTORY_WEEKS = 5;
const BIG_PACK_BRANDS = ['DARKSIDE', 'Starline'];

// Типичная фасовка бренда — для прихода без счёта из старого тумблера наличия.
export const defaultReceiptGrams = (manufacturer: string) => (BIG_PACK_BRANDS.includes(manufacturer) ? 250 : 200);

export const parseList = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

// --- загрузка -----------------------------------------------------------------

const shelfInclude = {
  tobacco: {
    select: {
      id: true,
      manufacturer: true,
      lineName: true,
      name: true,
      flavorProfiles: true,
      flavors: true,
      officialStrength: true,
      communityStrength: true,
      archived: true,
      sourceUrl: true,
    },
  },
  entries: {
    include: {
      delivery: { select: { id: true, kind: true, number: true, supplier: { select: { id: true, name: true } } } },
    },
    orderBy: [{ at: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ShelfItemInclude;

export type ShelfRecord = Prisma.ShelfItemGetPayload<{ include: typeof shelfInclude }>;
type EntryRecord = ShelfRecord['entries'][number];

const toStockEntry = (entry: EntryRecord): StockEntry => ({
  id: entry.id,
  kind: entry.kind as StockEntryKind,
  grams: entry.grams,
  at: entry.at,
  priceKop: entry.priceKop,
});

export const toStockItem = (record: ShelfRecord): ShelfItem => ({
  tobaccoId: record.tobaccoId,
  brand: record.tobacco.manufacturer,
  keepStocked: record.keepStocked,
  plan: record.status === 'plan',
  stopped: record.stopped,
  entries: record.entries.map(toStockEntry),
});

const loadItem = async (client: Tx, tobaccoId: string) => {
  const record = await client.shelfItem.findUnique({ where: { tobaccoId }, include: shelfInclude });
  if (!record) throw new ShelfNotFoundError(`Табака ${tobaccoId} нет на полке`);
  return record;
};

const ON_SHELF = { in: ['active', 'plan'] };

const loadSettings = async (client: Tx): Promise<ShelfSettings> => {
  const row = await client.shelfSettings.findUnique({ where: { id: 1 } });
  return row ? { bowlGrams: row.bowlGrams, leadDays: row.leadDays, budgetKop: row.budgetKop } : { ...DEFAULT_SETTINGS };
};

// Принятые поставки, кроме стартовой: дата счёта, иначе дата приёмки (#325).
const loadInterval = async (client: Tx, now: Date) => {
  const since = new Date(now.getTime() - INTERVAL_LOOKBACK_DAYS * DAY_MS);
  const deliveries = await client.delivery.findMany({
    where: {
      status: 'received',
      kind: { not: 'start' },
      OR: [{ invoiceDate: { gte: since } }, { invoiceDate: null, receivedAt: { gte: since } }],
    },
    select: { invoiceDate: true, receivedAt: true },
  });
  const dates = deliveries
    .map((delivery) => delivery.invoiceDate ?? delivery.receivedAt)
    .filter((date): date is Date => date !== null);
  return supplyInterval(dates, now);
};

const loadPlanning = async (client: Tx, now: Date) => {
  const [settings, interval] = await Promise.all([loadSettings(client), loadInterval(client, now)]);
  return { settings, interval, horizon: horizonOf(settings.leadDays, interval) };
};

export type HorizonView = { days: number; until: string };

export const horizonView = (horizon: Horizon, now: Date): HorizonView => ({
  days: horizon.days,
  until: new Date(now.getTime() + horizon.days * DAY_MS).toISOString(),
});

const loadMixes = async (client: Tx, tobaccoIds: string[]) =>
  client.mixComponent.findMany({
    where: { tobaccoId: { in: tobaccoIds }, mix: { available: true } },
    select: { tobaccoId: true, mix: { select: { id: true, name: true } } },
  });

// --- представление -----------------------------------------------------------

export type ShelfTobaccoView = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  officialStrength: string | null;
  communityStrength: string | null;
  archived: boolean;
  sourceUrl: string | null;
};

export type ReceiptView = {
  at: string;
  grams: number;
  kind: 'invoice' | 'start' | 'manual';
  number: string | null;
  label: string;
};

export type ShelfRow = {
  tobacco: ShelfTobaccoView;
  shelfStatus: ShelfItemStatus;
  status: ShelfStatus;
  guestAvailable: boolean;
  leftGrams: number | null;
  fullGrams: number | null;
  lastReceipt: ReceiptView | null;
  lastCount: { at: string; grams: number; fraction: number | null } | null;
  // Откуда остаток: указал мастер (сегодня или «Закончился») или прогноз.
  leftSource: LeftSource | null;
  rate: number | null;
  rateKind: ShelfForecast['rateKind'];
  // Расход в месяц = г/день × 30.
  monthGrams: number | null;
  daysLeft: number | null;
  endsAt: string | null;
  mixCount: number;
  keepStocked: boolean;
  stopped: boolean;
  stopNote: string | null;
  note: string | null;
  // Проба — впервые пришёл на полку за 60 дней; отметка мастера «зашло / не зашло».
  trial: boolean;
  trialVerdict: TrialVerdict | null;
  trialMarkedAt: string | null;
};

export type TrialVerdict = (typeof TRIAL_VERDICTS)[number];

export type ShelfCounters = Record<'all' | ShelfStatus, number>;

export type ShelfView = {
  rows: ShelfRow[];
  counters: ShelfCounters;
  totals: { kg: number };
  today: { grams: number; bowls: number };
  settings: ShelfSettings;
  interval: SupplyInterval;
  horizon: HorizonView;
};

export type StockEntryView = {
  id: string;
  kind: StockEntryKind;
  grams: number;
  fraction: number | null;
  at: string;
  priceKop: number | null;
  reason: string | null;
  actorLogin: string | null;
  delivery: { id: string; kind: string; number: string | null; supplier: string | null } | null;
  // У отметки: расход отрезка, который она закрыла.
  usage: { from: string; gramsPerDay: number } | null;
  // У отметки: отрезок отрицательный (досыпали без счёта, ошиблись раньше) и в расход не пошёл.
  excluded: boolean;
};

export type ShelfCard = ShelfRow & {
  history: StockEntryView[];
  weekly: Array<{ from: string; to: string; gramsPerDay: number; partial: boolean }>;
  gramPriceKop: number | null;
  bowlCostKop: number | null;
  mixes: Array<{ id: string; name: string }>;
  settings: ShelfSettings;
};

const receiptOf = (entry: EntryRecord): ReceiptView => {
  const kind = (entry.delivery?.kind ?? 'manual') as ReceiptView['kind'];
  const label = entry.delivery?.supplier?.name
    ?? (kind === 'start' ? 'Стартовый приход' : kind === 'invoice' ? 'По счёту' : 'Вручную');
  return { at: entry.at.toISOString(), grams: entry.grams, kind, number: entry.delivery?.number ?? null, label };
};

const lastOf = (record: ShelfRecord, kind: StockEntryKind) =>
  [...record.entries].reverse().find((entry) => entry.kind === kind) ?? null;

const round = (grams: number | null) => (grams === null ? null : Math.round(grams));

// Стартовый приход — табак уже стоял на полке до учёта, это не проба.
export const trialOf = (record: ShelfRecord, now: Date) => {
  const first = record.entries.find((entry) => entry.kind === 'receipt');
  return isTrial(first && first.delivery?.kind !== 'start' ? first.at : null, now);
};

const toRow = (record: ShelfRecord, forecast: ShelfForecast, mixCount: number, now: Date): ShelfRow => {
  const receipt = lastOf(record, 'receipt');
  const count = lastOf(record, 'count');
  return {
    tobacco: {
      id: record.tobacco.id,
      manufacturer: record.tobacco.manufacturer,
      lineName: record.tobacco.lineName,
      name: record.tobacco.name,
      flavorProfiles: parseList(record.tobacco.flavorProfiles),
      flavors: parseList(record.tobacco.flavors),
      officialStrength: record.tobacco.officialStrength,
      communityStrength: record.tobacco.communityStrength,
      archived: record.tobacco.archived,
      sourceUrl: record.tobacco.sourceUrl,
    },
    shelfStatus: record.status as ShelfItemStatus,
    status: forecast.status,
    guestAvailable: forecast.guestAvailable && record.status === 'active' && !record.tobacco.archived,
    leftGrams: round(forecast.leftGrams),
    fullGrams: round(forecast.fullGrams),
    lastReceipt: receipt ? receiptOf(receipt) : null,
    lastCount: count ? { at: count.at.toISOString(), grams: count.grams, fraction: count.fraction } : null,
    leftSource: forecast.leftSource,
    rate: forecast.rate,
    rateKind: forecast.rateKind,
    monthGrams: forecast.monthGrams,
    daysLeft: forecast.daysLeft,
    endsAt: iso(forecast.endsAt),
    mixCount,
    keepStocked: record.keepStocked,
    stopped: record.stopped,
    stopNote: record.stopNote,
    note: record.note,
    trial: trialOf(record, now),
    trialVerdict: record.trialVerdict as TrialVerdict | null,
    trialMarkedAt: iso(record.trialMarkedAt),
  };
};

const byName = (a: ShelfRecord, b: ShelfRecord) =>
  a.tobacco.manufacturer.localeCompare(b.tobacco.manufacturer, 'ru')
  || a.tobacco.lineName.localeCompare(b.tobacco.lineName, 'ru')
  || a.tobacco.name.localeCompare(b.tobacco.name, 'ru');

const countBy = (items: Array<{ tobaccoId: string }>) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.tobaccoId, (counts.get(item.tobaccoId) ?? 0) + 1);
  return counts;
};

// Медиана расхода бренда — по всей полке бренда, поэтому одна строка
// считается вместе с соседями по бренду.
const forecastOf = async (client: Tx, record: ShelfRecord, now: Date) => {
  const neighbours = await client.shelfItem.findMany({
    where: { status: ON_SHELF, tobacco: { manufacturer: record.tobacco.manufacturer }, NOT: { id: record.id } },
    include: shelfInclude,
  });
  const { settings, horizon } = await loadPlanning(client, now);
  const [forecast] = forecastShelf([record, ...neighbours].map(toStockItem), now, horizon);
  return { forecast, settings };
};

const buildRow = async (client: Tx, record: ShelfRecord, now: Date) => {
  const { forecast, settings } = await forecastOf(client, record, now);
  const mixes = await loadMixes(client, [record.tobaccoId]);
  return { row: toRow(record, forecast, mixes.length, now), forecast, settings, mixes };
};

const rowOf = async (tobaccoId: string, now: Date) => (await buildRow(prisma, await loadItem(prisma, tobaccoId), now)).row;

// Полка (в работе и в плане) с прогнозом: records[i], items[i] и forecasts[i] —
// один табак.
export const loadShelf = async (now: Date) => {
  const records = (await prisma.shelfItem.findMany({ where: { status: ON_SHELF }, include: shelfInclude })).sort(byName);
  const { settings, interval, horizon } = await loadPlanning(prisma, now);
  const items = records.map(toStockItem);
  return { records, items, forecasts: forecastShelf(items, now, horizon), settings, interval, horizon };
};

// Убранные с полки: их расход за прошлые недели — тоже расход точки.
export const loadDroppedShelf = () => prisma.shelfItem.findMany({ where: { status: 'dropped' }, include: shelfInclude });

// Журналы всех табаков, когда-либо стоявших на полке, — для истории расхода.
export const loadShelfHistory = async () =>
  (await prisma.shelfItem.findMany({ include: shelfInclude })).map(toStockItem);

export const getShelf = async (now = new Date()): Promise<ShelfView> => {
  const { records, forecasts, settings, interval, horizon } = await loadShelf(now);
  const mixCounts = countBy(await loadMixes(prisma, records.map((record) => record.tobaccoId)));
  const rows = records.map((record, index) => toRow(record, forecasts[index], mixCounts.get(record.tobaccoId) ?? 0, now));

  const withStatus = (status: ShelfStatus) => rows.filter((row) => row.status === status).length;
  return {
    rows,
    counters: {
      all: rows.length,
      ok: withStatus('ok'),
      ending: withStatus('ending'),
      check: withStatus('check'),
      out: withStatus('out'),
      stop: withStatus('stop'),
      plan: withStatus('plan'),
    },
    totals: {
      kg: forecasts.reduce((total, forecast) => total + (forecast.inStock ? forecast.leftGrams ?? 0 : 0), 0) / 1000,
    },
    today: todayForecast(forecasts, settings.bowlGrams),
    settings,
    interval,
    horizon: horizonView(horizon, now),
  };
};

export const getShelfItem = async (tobaccoId: string, now = new Date()): Promise<ShelfCard> => {
  const record = await loadItem(prisma, tobaccoId);
  const { row, settings, mixes } = await buildRow(prisma, record, now);
  const entries = record.entries.map(toStockEntry);
  const closed = new Map(segments(entries).map((segment) => [segment.closedBy, segment]));
  const periods = weekPeriods(now, HISTORY_WEEKS);
  const weekGrams = consumptionByPeriod(entries, periods);
  const price = gramPrice(entries);

  return {
    ...row,
    history: [...record.entries].reverse().map((entry) => {
      const segment = closed.get(entry.id);
      const days = segment ? (segment.to - segment.from) / DAY_MS : 0;
      return {
        id: entry.id,
        kind: entry.kind as StockEntryKind,
        grams: entry.grams,
        fraction: entry.fraction,
        at: entry.at.toISOString(),
        priceKop: entry.priceKop,
        reason: entry.reason,
        actorLogin: entry.actorLogin,
        delivery: entry.delivery
          ? {
              id: entry.delivery.id,
              kind: entry.delivery.kind,
              number: entry.delivery.number,
              supplier: entry.delivery.supplier?.name ?? null,
            }
          : null,
        usage: segment && !segment.excluded && days > 0
          ? { from: new Date(segment.from).toISOString(), gramsPerDay: segment.grams / days }
          : null,
        excluded: segment?.excluded ?? false,
      };
    }),
    weekly: periods.map((period, index) => ({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      gramsPerDay: weekGrams[index] / ((period.to.getTime() - period.from.getTime()) / DAY_MS),
      partial: period.partial,
    })),
    gramPriceKop: price,
    bowlCostKop: bowlCost([price], settings.bowlGrams),
    mixes: mixes.map((item) => item.mix).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    settings,
  };
};

// --- наличие и аудит ---------------------------------------------------------

// Остаток по учёту, без расхода: от него — наличие для гостя.
export const bookOf = (entries: Array<{ kind: string; grams: number; at: Date; id: string; priceKop: number | null }>) =>
  stockState(entries.map((entry) => ({ ...entry, kind: entry.kind as StockEntryKind })), null, new Date()).bookGrams;

export const syncAvailability = async (tx: Tx, tobaccoIds: string[]) => {
  const records = await tx.tobacco.findMany({
    where: { id: { in: tobaccoIds } },
    select: {
      id: true,
      inStock: true,
      archived: true,
      shelfItem: {
        select: {
          status: true,
          stopped: true,
          entries: {
            select: { id: true, kind: true, grams: true, at: true, priceKop: true },
            orderBy: [{ at: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      },
    },
  });
  const available = (record: (typeof records)[number]) =>
    !record.archived
    && record.shelfItem?.status === 'active'
    && !record.shelfItem.stopped
    && bookOf(record.shelfItem.entries) > 0;

  const on = records.filter((record) => available(record) && !record.inStock).map((record) => record.id);
  const off = records.filter((record) => !available(record) && record.inStock).map((record) => record.id);
  if (on.length) await tx.tobacco.updateMany({ where: { id: { in: on } }, data: { inStock: true } });
  if (off.length) await tx.tobacco.updateMany({ where: { id: { in: off } }, data: { inStock: false } });
};

const label = (record: ShelfRecord) => `${record.tobacco.manufacturer} · ${record.tobacco.name}`;

const audit = (
  tx: Tx,
  actor: ShelfActor,
  event: { action: AuditAction; entityType: 'shelf' | 'stock'; entityId: string; entityLabel: string; details?: Record<string, unknown> },
) =>
  tx.auditEvent.create({
    data: {
      actorLogin: actor.login,
      actorName: actor.name,
      actorRole: actor.role,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      entityLabel: event.entityLabel,
      details: JSON.stringify(event.details ?? {}),
    },
  });

// --- журнал ------------------------------------------------------------------

const checkGrams = (value: unknown, field: string, min: number) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > MAX_GRAMS) {
    throw new ShelfValidationError(`${field}: целое число граммов от ${min} до ${MAX_GRAMS}`);
  }
  return value;
};

type EntryInput = {
  kind: StockEntryKind;
  grams: number;
  fraction?: number | null;
  priceKop?: number | null;
  reason?: string | null;
};

const writeEntry = async (
  actor: ShelfActor,
  tobaccoId: string,
  action: AuditAction,
  now: Date,
  build: (record: ShelfRecord, tx: Tx) => Promise<EntryInput>,
) => {
  const entryId = await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const input = await build(record, tx);
    const entry = await tx.stockEntry.create({
      data: { shelfItemId: record.id, at: now, actorLogin: actor.login, ...input },
    });
    // Пришло — табак точно держим, даже если он был в плане или убран.
    if (input.kind === 'receipt' && record.status !== 'active') {
      await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'active' } });
    }
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, {
      action,
      entityType: 'stock',
      entityId: entry.id,
      entityLabel: label(record),
      details: { tobaccoId, ...input },
    });
    return entry.id;
  });
  return { entryId, item: await rowOf(tobaccoId, now) };
};

const requireStock = (record: ShelfRecord) => {
  if (bookOf(record.entries) <= 0) throw new ShelfConflictError('no_stock', 'Табак уже закончился');
};

export const markEmpty = (actor: ShelfActor, tobaccoId: string, now = new Date()) =>
  writeEntry(actor, tobaccoId, 'mark-empty', now, async (record) => {
    requireStock(record);
    return { kind: 'count', grams: 0 };
  });

export type EmptySkip = { tobaccoId: string; reason: 'out' | 'plan' };

const batchIds = (value: unknown) => {
  if (!Array.isArray(value) || !value.length || value.length > MAX_BATCH || !value.every((id) => typeof id === 'string' && id.trim())) {
    throw new ShelfValidationError(`Список табаков: от 1 до ${MAX_BATCH} id`);
  }
  return [...new Set(value.map((id: string) => id.trim()))];
};

// «Закончились» разом (#333): на каждый табак — та же отметка 0 г, что и одиночная,
// с общим пакетом в reason для одной отмены. Закончившиеся и «в плане» пропускаются.
export const markEmptyMany = async (actor: ShelfActor, tobaccoIds: unknown, now = new Date()) => {
  const ids = batchIds(tobaccoIds);
  const batchId = randomUUID();
  const { done, skipped, hiddenMixes } = await prisma.$transaction(async (tx) => {
    const records = new Map(
      (await tx.shelfItem.findMany({ where: { tobaccoId: { in: ids } }, include: shelfInclude })).map((record) => [record.tobaccoId, record]),
    );
    const missing = ids.filter((id) => !records.has(id));
    if (missing.length) throw new ShelfNotFoundError(`Табаков нет на полке: ${missing.join(', ')}`);

    const done: string[] = [];
    const skipped: EmptySkip[] = [];
    for (const id of ids) {
      const record = records.get(id)!;
      if (record.status === 'plan') {
        skipped.push({ tobaccoId: id, reason: 'plan' });
        continue;
      }
      if (bookOf(record.entries) <= 0) {
        skipped.push({ tobaccoId: id, reason: 'out' });
        continue;
      }
      const entry = await tx.stockEntry.create({
        data: { shelfItemId: record.id, kind: 'count', grams: 0, at: now, actorLogin: actor.login, reason: `${BATCH_PREFIX}${batchId}` },
      });
      await audit(tx, actor, {
        action: 'mark-empty',
        entityType: 'stock',
        entityId: entry.id,
        entityLabel: label(record),
        details: { tobaccoId: id, kind: 'count', grams: 0, batchId },
      });
      done.push(id);
    }
    await syncAvailability(tx, done);
    const mixes = done.length ? await loadMixes(tx, done) : [];
    return { done, skipped, hiddenMixes: new Set(mixes.map((item) => item.mix.id)).size };
  });
  const items = [];
  for (const id of done) items.push(await rowOf(id, now));
  return { batchId, done, skipped, hiddenMixes, items };
};

export const undoEmptyBatch = async (actor: ShelfActor, batchId: string, now = new Date()) => {
  const tobaccoIds = await prisma.$transaction(async (tx) => {
    const entries = await tx.stockEntry.findMany({
      where: { kind: 'count', reason: `${BATCH_PREFIX}${batchId}` },
      include: { shelfItem: { include: shelfInclude } },
      orderBy: { createdAt: 'asc' },
    });
    if (!entries.length) throw new ShelfNotFoundError(`Пакет ${batchId} не найден`);
    await tx.stockEntry.deleteMany({ where: { id: { in: entries.map((entry) => entry.id) } } });
    const ids = entries.map((entry) => entry.shelfItem.tobaccoId);
    await syncAvailability(tx, ids);
    for (const entry of entries) {
      await audit(tx, actor, {
        action: 'delete-entry',
        entityType: 'stock',
        entityId: entry.id,
        entityLabel: label(entry.shelfItem),
        details: { tobaccoId: entry.shelfItem.tobaccoId, kind: entry.kind, grams: entry.grams, at: entry.at.toISOString(), batchId },
      });
    }
    return ids;
  });
  const items = [];
  for (const id of tobaccoIds) items.push(await rowOf(id, now));
  return { items };
};

// Доля — от уровня сразу после последнего прихода; хранится вместе с граммами,
// в которые превратилась.
export const addCount = (
  actor: ShelfActor,
  tobaccoId: string,
  input: { fraction?: unknown; grams?: unknown },
  now = new Date(),
) =>
  writeEntry(actor, tobaccoId, 'count', now, async (record, tx) => {
    if (input.fraction !== undefined && input.fraction !== null) {
      const fraction = MARK_FRACTIONS.find((allowed) => typeof input.fraction === 'number' && Math.abs(allowed - input.fraction) < 1e-6);
      if (fraction === undefined) throw new ShelfValidationError('Остаток отмечается долей ¾, ½, ⅓ или ¼ — или в граммах');
      const { forecast } = await forecastOf(tx, record, now);
      if (forecast.fullGrams === null) throw new ShelfConflictError('no_receipt', 'Прихода ещё не было — укажите граммы');
      return { kind: 'count', grams: fractionGrams(forecast.fullGrams, fraction), fraction };
    }
    return { kind: 'count', grams: checkGrams(input.grams, 'Остаток', 0) };
  });

export const addReceipt = async (
  actor: ShelfActor,
  tobaccoId: string,
  input: { grams?: unknown; priceKop?: unknown },
  now = new Date(),
) => {
  const grams = checkGrams(input.grams, 'Приход', 1);
  if (input.priceKop != null && (typeof input.priceKop !== 'number' || !Number.isInteger(input.priceKop) || input.priceKop < 0)) {
    throw new ShelfValidationError('Цена прихода: целое число копеек, не меньше нуля');
  }
  const priceKop = (input.priceKop as number | null | undefined) ?? null;
  return writeEntry(actor, tobaccoId, 'receipt', now, async () => ({ kind: 'receipt', grams, priceKop }));
};

export const writeOff = async (
  actor: ShelfActor,
  tobaccoId: string,
  input: { grams?: unknown; reason?: unknown },
  now = new Date(),
) => {
  const grams = checkGrams(input.grams, 'Списание', 1);
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) throw new ShelfValidationError('Укажите причину списания');
  return writeEntry(actor, tobaccoId, 'write-off', now, async (record) => {
    requireStock(record);
    return { kind: 'writeoff', grams, reason };
  });
};

// Отмена в тосте и исправление из истории. Приход по счёту живёт вместе с поставкой.
export const deleteEntry = async (actor: ShelfActor, entryId: string, now = new Date()) => {
  const tobaccoId = await prisma.$transaction(async (tx) => {
    const entry = await tx.stockEntry.findUnique({
      where: { id: entryId },
      include: { shelfItem: { include: shelfInclude } },
    });
    if (!entry) throw new ShelfNotFoundError(`Запись ${entryId} не найдена`);
    if (entry.deliveryId) {
      throw new ShelfConflictError('entry_from_delivery', 'Приход по поставке удаляется только вместе с поставкой');
    }
    await tx.stockEntry.delete({ where: { id: entryId } });
    await syncAvailability(tx, [entry.shelfItem.tobaccoId]);
    await audit(tx, actor, {
      action: 'delete-entry',
      entityType: 'stock',
      entityId: entryId,
      entityLabel: label(entry.shelfItem),
      details: { tobaccoId: entry.shelfItem.tobaccoId, kind: entry.kind, grams: entry.grams, at: entry.at.toISOString() },
    });
    return entry.shelfItem.tobaccoId;
  });
  return rowOf(tobaccoId, now);
};

// --- строка полки ------------------------------------------------------------

export const setStop = async (actor: ShelfActor, tobaccoId: string, stopped: boolean, note?: string, now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const stopNote = stopped ? note?.trim() || null : null;
    await tx.shelfItem.update({ where: { id: record.id }, data: { stopped, stopNote } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, { action: 'stop', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: { stopped, stopNote } });
  });
  return rowOf(tobaccoId, now);
};

export const updateShelfItem = async (
  actor: ShelfActor,
  tobaccoId: string,
  patch: { keepStocked?: boolean; note?: string | null },
  now = new Date(),
) => {
  const data = {
    ...(patch.keepStocked !== undefined ? { keepStocked: patch.keepStocked } : {}),
    ...(patch.note !== undefined ? { note: patch.note?.trim() || null } : {}),
  };
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    await tx.shelfItem.update({ where: { id: record.id }, data });
    await audit(tx, actor, { action: 'update', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: data });
  });
  return rowOf(tobaccoId, now);
};

// Отметка мастера по пробе (#329): yes / no, null — снять.
export const setTrialVerdict = async (actor: ShelfActor, tobaccoId: string, verdict: unknown, now = new Date()) => {
  if (verdict !== null && !TRIAL_VERDICTS.includes(verdict as TrialVerdict)) {
    throw new ShelfValidationError('Отметка пробы: yes, no или null');
  }
  const trialVerdict = verdict as TrialVerdict | null;
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    await tx.shelfItem.update({ where: { id: record.id }, data: { trialVerdict, trialMarkedAt: trialVerdict ? now : null } });
    await audit(tx, actor, { action: 'update', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: { trialVerdict } });
  });
  return rowOf(tobaccoId, now);
};

// Повторное добавление убранного табака возвращает его на полку; то, что уже
// держим, в план не понижается.
export const ensureOnShelf = async (tx: Tx, tobaccoId: string, status: 'active' | 'plan') => {
  const tobacco = await tx.tobacco.findUnique({
    where: { id: tobaccoId },
    select: { shelfItem: { select: { id: true, status: true } } },
  });
  if (!tobacco) throw new ShelfNotFoundError(`Табак ${tobaccoId} не найден в каталоге`);
  if (!tobacco.shelfItem) return tx.shelfItem.create({ data: { tobaccoId, status } });
  const next = tobacco.shelfItem.status === 'active' ? 'active' : status;
  return tobacco.shelfItem.status === next
    ? tx.shelfItem.findUniqueOrThrow({ where: { id: tobacco.shelfItem.id } })
    : tx.shelfItem.update({ where: { id: tobacco.shelfItem.id }, data: { status: next } });
};

export const addToShelf = async (actor: ShelfActor, tobaccoId: string, status: 'active' | 'plan', now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const item = await ensureOnShelf(tx, tobaccoId, status);
    await syncAvailability(tx, [tobaccoId]);
    const record = await loadItem(tx, tobaccoId);
    await audit(tx, actor, { action: 'add', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: { status: item.status } });
  });
  return rowOf(tobaccoId, now);
};

export const removeFromShelf = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'dropped' } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, { action: 'remove', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: { from: record.status } });
  });
  return rowOf(tobaccoId, now);
};

// --- настройки ---------------------------------------------------------------

export const getSettings = () => loadSettings(prisma);

// budgetKop: null — бюджет не указан.
export const updateSettings = async (
  actor: ShelfActor,
  patch: { bowlGrams?: number; leadDays?: number; budgetKop?: unknown },
): Promise<ShelfSettings> => {
  const check = (value: unknown, min: number, max: number, field: string) => {
    if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)) {
      throw new ShelfValidationError(`${field}: целое число от ${min} до ${max}`);
    }
  };
  check(patch.bowlGrams, 1, 100, 'Граммовка чаши');
  check(patch.leadDays, 1, 60, 'Срок поставки');
  if (patch.budgetKop !== null) check(patch.budgetKop, 0, MAX_BUDGET_KOP, 'Бюджет на табак, копеек');
  const data = {
    ...(patch.bowlGrams !== undefined ? { bowlGrams: patch.bowlGrams } : {}),
    ...(patch.leadDays !== undefined ? { leadDays: patch.leadDays } : {}),
    ...(patch.budgetKop !== undefined ? { budgetKop: patch.budgetKop as number | null } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const row = await tx.shelfSettings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULT_SETTINGS, ...data }, update: data });
    await audit(tx, actor, { action: 'settings', entityType: 'shelf', entityId: 'settings', entityLabel: 'Настройки полки', details: data });
    return { bowlGrams: row.bowlGrams, leadDays: row.leadDays, budgetKop: row.budgetKop };
  });
};

// --- старт и переходный режим ------------------------------------------------

// Стартовый приход для сида тестов и dev-БД: табаки в наличии встают на полку
// с типичной для бренда фасовкой (README #152 §8).
export const startShelfFromStock = async (tx: Tx, now: Date) => {
  await tx.shelfSettings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULT_SETTINGS }, update: {} });
  const tobaccos = await tx.tobacco.findMany({
    where: { inStock: true, archived: false, shelfItem: { is: null } },
    select: { id: true, manufacturer: true },
  });
  if (!tobaccos.length) return;
  const delivery = await tx.delivery.create({ data: { kind: 'start', status: 'received', receivedAt: now } });
  for (const tobacco of tobaccos) {
    await tx.shelfItem.create({
      data: {
        tobaccoId: tobacco.id,
        entries: { create: { kind: 'receipt', grams: defaultReceiptGrams(tobacco.manufacturer), at: now, deliveryId: delivery.id } },
      },
    });
  }
};

// Тумблер наличия «Каталога» и создания карточки. «Есть» — табак на полке, без
// стопа и с остатком: если остатка нет, приход типичной фасовки бренда. «Нет» —
// «Закончился». Аудит пишет эндпоинт инвентаря.
export const setStockedLegacy = async (tx: Tx, tobaccoIds: string[], inStock: boolean, now: Date) => {
  const records = await tx.tobacco.findMany({
    where: { id: { in: tobaccoIds } },
    select: { id: true, manufacturer: true },
  });
  for (const tobacco of records) {
    const item = inStock ? await ensureOnShelf(tx, tobacco.id, 'active') : await tx.shelfItem.findUnique({ where: { tobaccoId: tobacco.id } });
    if (!item) continue;
    const entries = await tx.stockEntry.findMany({
      where: { shelfItemId: item.id },
      orderBy: [{ at: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const stocked = bookOf(entries) > 0;
    if (inStock) {
      if (item.stopped) await tx.shelfItem.update({ where: { id: item.id }, data: { stopped: false, stopNote: null } });
      if (!stocked) {
        await tx.stockEntry.create({ data: { shelfItemId: item.id, kind: 'receipt', grams: defaultReceiptGrams(tobacco.manufacturer), at: now } });
      }
    } else if (stocked) {
      await tx.stockEntry.create({ data: { shelfItemId: item.id, kind: 'count', grams: 0, at: now } });
    }
  }
  await syncAvailability(tx, tobaccoIds);
};
