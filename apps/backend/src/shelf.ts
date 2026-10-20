import type { Prisma } from '@prisma/client';
import type { AuditAction } from './audit';
import type { StaffUser } from './auth';
import { prisma } from './db';
import {
  bowlCost,
  DEFAULT_SETTINGS,
  forecastShelf,
  gramPrice,
  openRemaining,
  resolvePacks,
  todayForecast,
  type Pack,
  type PackState,
  type ShelfForecast,
  type ShelfItem,
  type ShelfSettings,
  type ShelfStatus,
} from './stock';

// Полка точки (#152): единственный модуль, который пишет Tobacco.inStock.
// Наличие для гостя = на полке (active) И не стоп И есть банка в запасе или
// в работе И табак не в архиве.

type Tx = Prisma.TransactionClient;

export type ShelfActor = Pick<StaffUser, 'login' | 'name' | 'role'>;
export type ShelfItemStatus = 'active' | 'plan' | 'dropped';

export class ShelfNotFoundError extends Error {
  name = 'ShelfNotFoundError';
}

export class ShelfConflictError extends Error {
  name = 'ShelfConflictError';
  constructor(
    readonly code: 'no_open_pack' | 'no_sealed_pack' | 'pack_not_empty' | 'pack_closed',
    message: string,
  ) {
    super(message);
  }
}

export class ShelfValidationError extends Error {
  name = 'ShelfValidationError';
}

export const MARK_FRACTIONS = [1, 0.75, 0.5, 1 / 3, 0.25] as const;

const DAY_MS = 86_400_000;
const MAX_PACK_GRAMS = 5000;
const BIG_PACK_BRANDS = ['DARKSIDE', 'Starline'];

export const defaultPackWeight = (manufacturer: string) => (BIG_PACK_BRANDS.includes(manufacturer) ? 250 : 200);

const parseList = (value: string): string[] => {
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
  packs: {
    include: {
      marks: { orderBy: { at: 'asc' } },
      delivery: { select: { id: true, kind: true, number: true, supplier: { select: { id: true, name: true } } } },
    },
    orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ShelfItemInclude;

export type ShelfRecord = Prisma.ShelfItemGetPayload<{ include: typeof shelfInclude }>;
type PackRecord = ShelfRecord['packs'][number];

const toStockPack = (pack: PackRecord): Pack => ({
  id: pack.id,
  weight: pack.weight,
  price: pack.priceKop,
  receivedAt: pack.receivedAt,
  openedAt: pack.openedAt,
  emptiedAt: pack.emptiedAt,
  writtenOffAt: pack.writtenOffAt,
  marks: pack.marks.map((mark) => ({ at: mark.at, fraction: mark.fraction })),
});

const toStockItem = (record: ShelfRecord): ShelfItem => ({
  tobaccoId: record.tobaccoId,
  brand: record.tobacco.manufacturer,
  packWeight: record.packWeight,
  keepStocked: record.keepStocked,
  plan: record.status === 'plan',
  stopped: record.stopped,
  packs: record.packs.map(toStockPack),
});

const loadItem = async (client: Tx, tobaccoId: string) => {
  const record = await client.shelfItem.findUnique({ where: { tobaccoId }, include: shelfInclude });
  if (!record) throw new ShelfNotFoundError(`Табака ${tobaccoId} нет на полке`);
  return record;
};

const loadPack = async (client: Tx, packId: string) => {
  const pack = await client.pack.findUnique({
    where: { id: packId },
    include: { shelfItem: { include: shelfInclude } },
  });
  if (!pack) throw new ShelfNotFoundError(`Банка ${packId} не найдена`);
  return pack;
};

const ON_SHELF = { in: ['active', 'plan'] };

const loadSettings = async (client: Tx): Promise<ShelfSettings> => {
  const row = await client.shelfSettings.findUnique({ where: { id: 1 } });
  return row ? { bowlGrams: row.bowlGrams, leadDays: row.leadDays } : { ...DEFAULT_SETTINGS };
};

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

export type OpenPackView = {
  id: string;
  weight: number;
  openedAt: string;
  // Оценка доли остатка сейчас — для пипсов.
  fraction: number;
};

export type ReceiptView = {
  receivedAt: string;
  kind: 'invoice' | 'start' | 'manual';
  number: string | null;
  label: string;
};

export type ShelfRow = {
  tobacco: ShelfTobaccoView;
  shelfStatus: ShelfItemStatus;
  status: ShelfStatus;
  last: boolean;
  overdue: boolean;
  guestAvailable: boolean;
  openPacks: OpenPackView[];
  sealedCount: number;
  remainingGrams: number;
  rate: number | null;
  rateKind: ShelfForecast['rateKind'];
  daysLeft: number | null;
  endsAt: string | null;
  lastReceipt: ReceiptView | null;
  mixCount: number;
  keepStocked: boolean;
  stopped: boolean;
  stopNote: string | null;
  packWeight: number;
  note: string | null;
};

export type ShelfCounters = Record<'all' | 'ok' | 'last' | 'ending' | 'out' | 'stop' | 'plan', number>;

export type ShelfView = {
  rows: ShelfRow[];
  counters: ShelfCounters;
  totals: { packs: number; kg: number };
  today: { grams: number; bowls: number };
  settings: ShelfSettings;
};

export type PackHistoryView = {
  id: string;
  state: PackState;
  weight: number;
  priceKop: number | null;
  receivedAt: string;
  openedAt: string | null;
  emptiedAt: string | null;
  writtenOffAt: string | null;
  writeOffReason: string | null;
  delivery: { id: string; kind: string; number: string | null; supplier: string | null } | null;
  marks: Array<{ at: string; fraction: number }>;
  // Только у пустых: сколько банка прожила в работе и расход по ней.
  usage: { days: number; gramsPerDay: number } | null;
};

export type ShelfCard = ShelfRow & {
  packs: PackHistoryView[];
  gramPriceKop: number | null;
  bowlCostKop: number | null;
  mixes: Array<{ id: string; name: string }>;
  settings: ShelfSettings;
};

const receiptOf = (pack: PackRecord): ReceiptView => {
  const kind = (pack.delivery?.kind ?? 'manual') as ReceiptView['kind'];
  const label = pack.delivery?.supplier?.name
    ?? (kind === 'start' ? 'Стартовый приход' : kind === 'invoice' ? 'По счёту' : 'Вручную');
  return { receivedAt: pack.receivedAt.toISOString(), kind, number: pack.delivery?.number ?? null, label };
};

const toRow = (record: ShelfRecord, forecast: ShelfForecast, now: Date, mixCount: number): ShelfRow => {
  const packs = resolvePacks(record.packs.map(toStockPack));
  const open = packs
    .filter((pack) => pack.state === 'open')
    .sort((a, b) => a.openedAt!.getTime() - b.openedAt!.getTime());
  const latest = record.packs[record.packs.length - 1];

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
    last: forecast.last,
    overdue: forecast.overdue,
    guestAvailable: forecast.guestAvailable && record.status === 'active' && !record.tobacco.archived,
    openPacks: open.map((pack) => ({
      id: pack.id,
      weight: pack.weight,
      openedAt: pack.openedAt!.toISOString(),
      fraction: openRemaining(pack, forecast.rate, now, packs).grams / pack.weight,
    })),
    sealedCount: forecast.sealedPacks,
    remainingGrams: forecast.remainingGrams,
    rate: forecast.rate,
    rateKind: forecast.rateKind,
    daysLeft: forecast.daysLeft,
    endsAt: iso(forecast.endsAt),
    lastReceipt: latest ? receiptOf(latest) : null,
    mixCount,
    keepStocked: record.keepStocked,
    stopped: record.stopped,
    stopNote: record.stopNote,
    packWeight: record.packWeight,
    note: record.note,
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
const buildRow = async (client: Tx, record: ShelfRecord, now: Date) => {
  const neighbours = await client.shelfItem.findMany({
    where: { status: ON_SHELF, tobacco: { manufacturer: record.tobacco.manufacturer }, NOT: { id: record.id } },
    include: shelfInclude,
  });
  const settings = await loadSettings(client);
  const [forecast] = forecastShelf([record, ...neighbours].map(toStockItem), now, settings);
  const mixes = await loadMixes(client, [record.tobaccoId]);
  return { row: toRow(record, forecast, now, mixes.length), settings, mixes };
};

const rowOf = async (tobaccoId: string, now: Date) => (await buildRow(prisma, await loadItem(prisma, tobaccoId), now)).row;

// Полка (в работе и в плане) с прогнозом: records[i], items[i] и forecasts[i] —
// один табак.
export const loadShelf = async (now: Date) => {
  const records = (await prisma.shelfItem.findMany({ where: { status: ON_SHELF }, include: shelfInclude })).sort(byName);
  const settings = await loadSettings(prisma);
  const items = records.map(toStockItem);
  return { records, items, forecasts: forecastShelf(items, now, settings), settings };
};

// Банки всех табаков, когда-либо стоявших на полке, — для истории расхода.
export const loadShelfHistory = async () =>
  (await prisma.shelfItem.findMany({ include: shelfInclude })).map(toStockItem);

export const getShelf = async (now = new Date()): Promise<ShelfView> => {
  const { records, forecasts, settings } = await loadShelf(now);
  const mixCounts = countBy(await loadMixes(prisma, records.map((record) => record.tobaccoId)));
  const rows = records.map((record, index) => toRow(record, forecasts[index], now, mixCounts.get(record.tobaccoId) ?? 0));

  const withStatus = (...statuses: ShelfStatus[]) => rows.filter((row) => statuses.includes(row.status)).length;
  return {
    rows,
    counters: {
      all: rows.length,
      ok: withStatus('ok', 'check'),
      last: rows.filter((row) => row.last).length,
      ending: withStatus('ending'),
      out: withStatus('out'),
      stop: withStatus('stop'),
      plan: withStatus('plan'),
    },
    totals: {
      packs: rows.reduce((total, row) => total + row.openPacks.length + row.sealedCount, 0),
      kg: rows.reduce((total, row) => total + row.remainingGrams, 0) / 1000,
    },
    today: todayForecast(forecasts, settings.bowlGrams),
    settings,
  };
};

export const getShelfItem = async (tobaccoId: string, now = new Date()): Promise<ShelfCard> => {
  const record = await loadItem(prisma, tobaccoId);
  const { row, settings, mixes } = await buildRow(prisma, record, now);
  const resolved = resolvePacks(record.packs.map(toStockPack));
  const priced = resolved.filter((pack) => pack.price !== null);

  return {
    ...row,
    packs: resolved.map((pack, index) => {
      const source = record.packs[index];
      const days = pack.state === 'empty' && pack.openedAt
        ? (pack.emptiedAt!.getTime() - pack.openedAt.getTime()) / DAY_MS
        : 0;
      return {
        id: pack.id,
        state: pack.state,
        weight: pack.weight,
        priceKop: pack.price,
        receivedAt: pack.receivedAt.toISOString(),
        openedAt: iso(pack.openedAt),
        emptiedAt: iso(pack.emptiedAt),
        writtenOffAt: iso(pack.writtenOffAt),
        writeOffReason: source.writeOffReason,
        delivery: source.delivery
          ? {
              id: source.delivery.id,
              kind: source.delivery.kind,
              number: source.delivery.number,
              supplier: source.delivery.supplier?.name ?? null,
            }
          : null,
        marks: pack.marks.map((mark) => ({ at: mark.at.toISOString(), fraction: mark.fraction })),
        usage: days > 0 ? { days, gramsPerDay: pack.weight / days } : null,
      };
    }),
    gramPriceKop: priced.length ? gramPrice(priced[priced.length - 1]) : null,
    bowlCostKop: bowlCost(resolved, settings.bowlGrams),
    mixes: mixes.map((item) => item.mix).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    settings,
  };
};

// --- наличие и аудит ---------------------------------------------------------

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
          packs: { where: { emptiedAt: null, writtenOffAt: null }, select: { id: true }, take: 1 },
        },
      },
    },
  });
  const available = (record: (typeof records)[number]) =>
    !record.archived
    && record.shelfItem?.status === 'active'
    && !record.shelfItem.stopped
    && record.shelfItem.packs.length > 0;

  const on = records.filter((record) => available(record) && !record.inStock).map((record) => record.id);
  const off = records.filter((record) => !available(record) && record.inStock).map((record) => record.id);
  if (on.length) await tx.tobacco.updateMany({ where: { id: { in: on } }, data: { inStock: true } });
  if (off.length) await tx.tobacco.updateMany({ where: { id: { in: off } }, data: { inStock: false } });
};

const label = (record: ShelfRecord) => `${record.tobacco.manufacturer} · ${record.tobacco.name}`;

const audit = (
  tx: Tx,
  actor: ShelfActor,
  event: { action: AuditAction; entityType: 'shelf' | 'pack'; entityId: string; entityLabel: string; details?: Record<string, unknown> },
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

// --- банки -------------------------------------------------------------------

const currentOpen = (record: ShelfRecord) =>
  resolvePacks(record.packs.map(toStockPack))
    .filter((pack) => pack.state === 'open')
    .sort((a, b) => a.openedAt!.getTime() - b.openedAt!.getTime())[0];

const requireOpen = (record: ShelfRecord) => {
  const pack = currentOpen(record);
  if (!pack) throw new ShelfConflictError('no_open_pack', 'У табака нет открытой банки');
  return pack;
};

export const markEmpty = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  const packId = await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const pack = requireOpen(record);
    await tx.pack.update({ where: { id: pack.id }, data: { emptiedAt: now } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, { action: 'mark-empty', entityType: 'pack', entityId: pack.id, entityLabel: label(record), details: { tobaccoId } });
    return pack.id;
  });
  return { packId, item: await rowOf(tobaccoId, now) };
};

export const undoEmpty = async (actor: ShelfActor, packId: string, now = new Date()) => {
  const tobaccoId = await prisma.$transaction(async (tx) => {
    const pack = await loadPack(tx, packId);
    if (!pack.emptiedAt || pack.writtenOffAt) throw new ShelfConflictError('pack_not_empty', 'Банка не отмечена пустой');
    await tx.pack.update({ where: { id: packId }, data: { emptiedAt: null } });
    await syncAvailability(tx, [pack.shelfItem.tobaccoId]);
    await audit(tx, actor, {
      action: 'undo-empty',
      entityType: 'pack',
      entityId: packId,
      entityLabel: label(pack.shelfItem),
      details: { tobaccoId: pack.shelfItem.tobaccoId, emptiedAt: pack.emptiedAt.toISOString() },
    });
    return pack.shelfItem.tobaccoId;
  });
  return rowOf(tobaccoId, now);
};

export const addMark = async (actor: ShelfActor, tobaccoId: string, fraction: number, now = new Date()) => {
  const value = MARK_FRACTIONS.find((allowed) => Math.abs(allowed - fraction) < 1e-6);
  if (value === undefined) throw new ShelfValidationError('Остаток отмечается долей 1, ¾, ½, ⅓ или ¼');
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const pack = requireOpen(record);
    await tx.packMark.create({ data: { packId: pack.id, fraction: value, at: now, actorLogin: actor.login } });
    await audit(tx, actor, { action: 'mark', entityType: 'pack', entityId: pack.id, entityLabel: label(record), details: { tobaccoId, fraction: value } });
  });
  return rowOf(tobaccoId, now);
};

export const openAnother = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const pack = resolvePacks(record.packs.map(toStockPack)).find((item) => item.state === 'sealed');
    if (!pack) throw new ShelfConflictError('no_sealed_pack', 'В запасе нет банок');
    await tx.pack.update({ where: { id: pack.id }, data: { openedAt: now } });
    await audit(tx, actor, { action: 'open', entityType: 'pack', entityId: pack.id, entityLabel: label(record), details: { tobaccoId } });
  });
  return rowOf(tobaccoId, now);
};

const checkGrams = (value: number, field: string) => {
  if (!Number.isInteger(value) || value < 1 || value > MAX_PACK_GRAMS) {
    throw new ShelfValidationError(`${field}: целое число граммов от 1 до ${MAX_PACK_GRAMS}`);
  }
};

export const addPack = async (
  actor: ShelfActor,
  tobaccoId: string,
  input: { weight?: number; priceKop?: number | null },
  now = new Date(),
) => {
  if (input.weight !== undefined) checkGrams(input.weight, 'Вес банки');
  if (input.priceKop != null && (!Number.isInteger(input.priceKop) || input.priceKop < 0)) {
    throw new ShelfValidationError('Цена банки: целое число копеек, не меньше нуля');
  }
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const pack = await tx.pack.create({
      data: {
        shelfItemId: record.id,
        weight: input.weight ?? record.packWeight,
        priceKop: input.priceKop ?? null,
        receivedAt: now,
      },
    });
    // Банка пришла — табак точно держим, даже если он был в плане или убран.
    if (record.status !== 'active') await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'active' } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, {
      action: 'add-pack',
      entityType: 'pack',
      entityId: pack.id,
      entityLabel: label(record),
      details: { tobaccoId, weight: pack.weight, priceKop: pack.priceKop },
    });
  });
  return rowOf(tobaccoId, now);
};

export const writeOff = async (actor: ShelfActor, packId: string, reason: string, now = new Date()) => {
  const note = reason.trim();
  if (!note) throw new ShelfValidationError('Укажите причину списания');
  const tobaccoId = await prisma.$transaction(async (tx) => {
    const pack = await loadPack(tx, packId);
    if (pack.emptiedAt || pack.writtenOffAt) throw new ShelfConflictError('pack_closed', 'Банка уже пустая или списана');
    await tx.pack.update({ where: { id: packId }, data: { writtenOffAt: now, writeOffReason: note } });
    await syncAvailability(tx, [pack.shelfItem.tobaccoId]);
    await audit(tx, actor, {
      action: 'write-off',
      entityType: 'pack',
      entityId: packId,
      entityLabel: label(pack.shelfItem),
      details: { tobaccoId: pack.shelfItem.tobaccoId, reason: note },
    });
    return pack.shelfItem.tobaccoId;
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
  patch: { keepStocked?: boolean; packWeight?: number; note?: string | null },
  now = new Date(),
) => {
  if (patch.packWeight !== undefined) checkGrams(patch.packWeight, 'Фасовка');
  const data = {
    ...(patch.keepStocked !== undefined ? { keepStocked: patch.keepStocked } : {}),
    ...(patch.packWeight !== undefined ? { packWeight: patch.packWeight } : {}),
    ...(patch.note !== undefined ? { note: patch.note?.trim() || null } : {}),
  };
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    await tx.shelfItem.update({ where: { id: record.id }, data });
    await audit(tx, actor, { action: 'update', entityType: 'shelf', entityId: tobaccoId, entityLabel: label(record), details: data });
  });
  return rowOf(tobaccoId, now);
};

// Повторное добавление убранного табака возвращает его на полку; то, что уже
// держим, в план не понижается.
const ensureOnShelf = async (tx: Tx, tobaccoId: string, status: 'active' | 'plan') => {
  const tobacco = await tx.tobacco.findUnique({
    where: { id: tobaccoId },
    select: { manufacturer: true, shelfItem: { select: { id: true, status: true } } },
  });
  if (!tobacco) throw new ShelfNotFoundError(`Табак ${tobaccoId} не найден в каталоге`);
  if (!tobacco.shelfItem) {
    return tx.shelfItem.create({ data: { tobaccoId, status, packWeight: defaultPackWeight(tobacco.manufacturer) } });
  }
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

export const updateSettings = async (actor: ShelfActor, patch: { bowlGrams?: number; leadDays?: number }) => {
  const check = (value: number | undefined, min: number, max: number, field: string) => {
    if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
      throw new ShelfValidationError(`${field}: целое число от ${min} до ${max}`);
    }
  };
  check(patch.bowlGrams, 1, 100, 'Граммовка чаши');
  check(patch.leadDays, 1, 60, 'Срок поставки');
  const data = {
    ...(patch.bowlGrams !== undefined ? { bowlGrams: patch.bowlGrams } : {}),
    ...(patch.leadDays !== undefined ? { leadDays: patch.leadDays } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const row = await tx.shelfSettings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULT_SETTINGS, ...data }, update: data });
    await audit(tx, actor, { action: 'settings', entityType: 'shelf', entityId: 'settings', entityLabel: 'Настройки полки', details: data });
    return { bowlGrams: row.bowlGrams, leadDays: row.leadDays };
  });
};

// --- старт и переходный режим ------------------------------------------------

// То же, что миграция shelf_packs_deliveries делает на проде (README §8):
// для сида тестов и dev-БД.
export const startShelfFromStock = async (tx: Tx, now: Date) => {
  await tx.shelfSettings.upsert({ where: { id: 1 }, create: { id: 1, ...DEFAULT_SETTINGS }, update: {} });
  const tobaccos = await tx.tobacco.findMany({
    where: { inStock: true, archived: false, shelfItem: { is: null } },
    select: { id: true, manufacturer: true },
  });
  if (!tobaccos.length) return;
  const delivery = await tx.delivery.create({ data: { kind: 'start', status: 'received', receivedAt: now } });
  for (const tobacco of tobaccos) {
    const weight = defaultPackWeight(tobacco.manufacturer);
    await tx.shelfItem.create({
      data: {
        tobaccoId: tobacco.id,
        packWeight: weight,
        packs: { create: { weight, receivedAt: now, deliveryId: delivery.id } },
      },
    });
  }
};

// Старый экран «Табаки» (до среза 2) переключает наличие тумблером. «Есть» —
// табак на полке, без стопа и хотя бы с одной банкой; «нет» — все банки в запасе
// и в работе закончились сейчас. Аудит пишет эндпоинт инвентаря.
export const setStockedLegacy = async (tx: Tx, tobaccoIds: string[], inStock: boolean, now: Date) => {
  if (inStock) {
    for (const tobaccoId of tobaccoIds) {
      const item = await ensureOnShelf(tx, tobaccoId, 'active');
      if (item.stopped) await tx.shelfItem.update({ where: { id: item.id }, data: { stopped: false, stopNote: null } });
      const stocked = await tx.pack.count({ where: { shelfItemId: item.id, emptiedAt: null, writtenOffAt: null } });
      if (!stocked) await tx.pack.create({ data: { shelfItemId: item.id, weight: item.packWeight, receivedAt: now } });
    }
  } else {
    await tx.pack.updateMany({
      where: { shelfItem: { tobaccoId: { in: tobaccoIds } }, emptiedAt: null, writtenOffAt: null },
      data: { emptiedAt: now },
    });
  }
  await syncAvailability(tx, tobaccoIds);
};
