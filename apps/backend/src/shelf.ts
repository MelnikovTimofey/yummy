import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { AuditAction } from './audit';
import type { StaffUser } from './auth';
import type { MixGuestStatus, MixSubstitutionView, TobaccoRef } from './state';
import { loadRuleContext, rankSimilar, resolveMixAvailability, toRuleComponent } from './analogs';
import { prisma } from './db';

// Полка точки (#152, #518): единственный модуль, который пишет Tobacco.inStock.
// Наличие для гостя = на полке (active) И не стоп И не «Закончился» (outAt пуст)
// И табак не в архиве. Граммы не учитываются: приходы — строки принятых поставок.

type Tx = Prisma.TransactionClient;

export type ShelfActor = Pick<StaffUser, 'login' | 'name' | 'role'>;
export type ShelfItemStatus = 'active' | 'plan' | 'dropped';

export class ShelfNotFoundError extends Error {
  name = 'ShelfNotFoundError';
}

export class ShelfConflictError extends Error {
  name = 'ShelfConflictError';
  constructor(
    readonly code: 'no_stock' | 'in_stock' | 'plan',
    message: string,
  ) {
    super(message);
  }
}

export class ShelfValidationError extends Error {
  name = 'ShelfValidationError';
}

const DAY_MS = 86_400_000;
const TRIAL_WINDOW_DAYS = 60;
const MAX_BATCH = 500;
const TRIAL_VERDICTS = ['yes', 'no'] as const;

export const parseList = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

// Проба (#329) — табак, впервые пришедший на полку за 60 дней; стартовый приход — не проба.
export const isTrial = (firstArrivalAt: Date | null, now: Date) =>
  firstArrivalAt !== null && now.getTime() - firstArrivalAt.getTime() <= TRIAL_WINDOW_DAYS * DAY_MS;

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
      inStock: true,
      sourceUrl: true,
    },
  },
} satisfies Prisma.ShelfItemInclude;

type ShelfRecord = Prisma.ShelfItemGetPayload<{ include: typeof shelfInclude }>;

const loadItem = async (client: Tx, tobaccoId: string) => {
  const record = await client.shelfItem.findUnique({ where: { tobaccoId }, include: shelfInclude });
  if (!record) throw new ShelfNotFoundError(`Табака ${tobaccoId} нет на полке`);
  return record;
};

const ON_SHELF = { in: ['active', 'plan'] };

const loadMixes = async (client: Tx, tobaccoIds: string[]) =>
  client.mixComponent.findMany({
    where: { tobaccoId: { in: tobaccoIds }, mix: { available: true } },
    select: { tobaccoId: true, mix: { select: { id: true, name: true } } },
  });

type AnalogRecord = { id: string; manufacturer: string; name: string; inStock: boolean; archived: boolean };

// Аналоги табаков полки в их порядке замены (#480) — один запрос на все строки.
const loadAnalogs = async (client: Tx, tobaccoIds: string[]) => {
  const links = await client.tobaccoAnalog.findMany({
    where: { tobaccoId: { in: tobaccoIds } },
    orderBy: { sortOrder: 'asc' },
    select: { tobaccoId: true, analog: { select: { id: true, manufacturer: true, name: true, inStock: true, archived: true } } },
  });
  const byTobacco = new Map<string, AnalogRecord[]>();
  for (const link of links) byTobacco.set(link.tobaccoId, [...(byTobacco.get(link.tobaccoId) ?? []), link.analog]);
  return byTobacco;
};

const readyOf = (tobacco: { inStock: boolean; archived: boolean }) => tobacco.inStock && !tobacco.archived;

// substituting — первый аналог в наличии, пока сам табак закончился: он и встаёт
// заменой в миксах (PRD §6.2 п.1), если его там ещё нет.
const analogViews = (self: { inStock: boolean; archived: boolean }, analogs: AnalogRecord[]): ShelfAnalogView[] => {
  const standIn = readyOf(self) ? undefined : analogs.find(readyOf);
  return analogs.map((analog) => ({
    tobaccoId: analog.id,
    manufacturer: analog.manufacturer,
    name: analog.name,
    inStock: readyOf(analog),
    substituting: analog === standIn,
  }));
};

// Приход табака (#518) — строка принятой поставки: счёта, ручной или стартовой.
export type ArrivalView = {
  at: string;
  kind: 'invoice' | 'manual' | 'start';
  supplier: string | null;
  number: string | null;
  qty: number;
  deliveryId: string;
};

export type Arrival = ArrivalView & { supplierId: string | null; fromInvoice: boolean };

export const arrivalView = (arrival: Arrival): ArrivalView => ({
  at: arrival.at,
  kind: arrival.kind,
  supplier: arrival.supplier,
  number: arrival.number,
  qty: arrival.qty,
  deliveryId: arrival.deliveryId,
});

// Приходы табаков полки, новые первыми — один запрос на все строки.
export const loadArrivals = async (client: Tx, tobaccoIds: string[]) => {
  const lines = await client.deliveryLine.findMany({
    where: { tobaccoId: { in: tobaccoIds }, kind: 'tobacco', arrived: true, delivery: { status: 'received' } },
    select: {
      tobaccoId: true,
      qty: true,
      delivery: { select: { id: true, kind: true, number: true, receivedAt: true, supplier: { select: { id: true, name: true } } } },
    },
  });
  const byTobacco = new Map<string, Arrival[]>();
  for (const { tobaccoId, qty, delivery } of lines) {
    if (!tobaccoId || !delivery.receivedAt) continue;
    const kind = delivery.kind as Arrival['kind'];
    const arrival: Arrival = {
      at: delivery.receivedAt.toISOString(),
      kind,
      supplier: delivery.supplier?.name ?? null,
      number: delivery.number,
      qty,
      deliveryId: delivery.id,
      supplierId: delivery.supplier?.id ?? null,
      fromInvoice: kind !== 'start',
    };
    byTobacco.set(tobaccoId, [...(byTobacco.get(tobaccoId) ?? []), arrival]);
  }
  for (const list of byTobacco.values()) list.sort((a, b) => b.at.localeCompare(a.at));
  return byTobacco;
};

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

// Аналог в порядке замены у этого табака (#478); substituting — стоит заменой в миксах,
// пока сам табак закончился.
export type ShelfAnalogView = TobaccoRef & { inStock: boolean; substituting: boolean };

export type ShelfSimilarView = TobaccoRef & { flavors: string[] };

export type ShelfRow = {
  tobacco: ShelfTobaccoView;
  shelfStatus: ShelfItemStatus;
  guestAvailable: boolean;
  // С какого момента «Закончился»; null — «Есть».
  outAt: string | null;
  lastArrival: ArrivalView | null;
  mixCount: number;
  keepStocked: boolean;
  stopped: boolean;
  stopNote: string | null;
  note: string | null;
  // Проба — впервые пришёл на полку за 60 дней; отметка мастера «зашло / не зашло».
  trial: boolean;
  trialVerdict: TrialVerdict | null;
  trialMarkedAt: string | null;
  analogs: ShelfAnalogView[];
};

export type TrialVerdict = (typeof TRIAL_VERDICTS)[number];

export type ShelfView = { rows: ShelfRow[] };

export type ShelfCard = ShelfRow & {
  mixes: Array<{ id: string; name: string; status: MixGuestStatus; substitution: MixSubstitutionView | null }>;
  // Приходы, новые первыми (#518).
  arrivals: ArrivalView[];
  // До пяти табаков с полки в наличии, похожих по flavors и flavorProfiles (PRD §9.3 п.6).
  similar: ShelfSimilarView[];
};

// arrivals — новые первыми: первый приход последний.
const trialOf = (arrivals: Arrival[], now: Date) => {
  const first = arrivals.at(-1);
  return isTrial(first && first.kind !== 'start' ? new Date(first.at) : null, now);
};

const toRow = (record: ShelfRecord, mixCount: number, analogs: AnalogRecord[], arrivals: Arrival[], now: Date): ShelfRow => ({
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
  guestAvailable: !record.outAt && !record.stopped && record.status === 'active' && !record.tobacco.archived,
  outAt: iso(record.outAt),
  lastArrival: arrivals.length ? arrivalView(arrivals[0]) : null,
  mixCount,
  keepStocked: record.keepStocked,
  stopped: record.stopped,
  stopNote: record.stopNote,
  note: record.note,
  trial: trialOf(arrivals, now),
  trialVerdict: record.trialVerdict as TrialVerdict | null,
  trialMarkedAt: iso(record.trialMarkedAt),
  analogs: analogViews(record.tobacco, analogs),
});

const byName = (a: ShelfRecord, b: ShelfRecord) =>
  a.tobacco.manufacturer.localeCompare(b.tobacco.manufacturer, 'ru')
  || a.tobacco.lineName.localeCompare(b.tobacco.lineName, 'ru')
  || a.tobacco.name.localeCompare(b.tobacco.name, 'ru');

const countBy = (items: Array<{ tobaccoId: string }>) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.tobaccoId, (counts.get(item.tobaccoId) ?? 0) + 1);
  return counts;
};

const rowsOfRecords = async (client: Tx, records: ShelfRecord[], now: Date) => {
  const ids = records.map((record) => record.tobaccoId);
  const [mixLinks, analogs, arrivals] = await Promise.all([loadMixes(client, ids), loadAnalogs(client, ids), loadArrivals(client, ids)]);
  const mixCounts = countBy(mixLinks);
  return records.map((record) =>
    toRow(
      record,
      mixCounts.get(record.tobaccoId) ?? 0,
      analogs.get(record.tobaccoId) ?? [],
      arrivals.get(record.tobaccoId) ?? [],
      now,
    ),
  );
};

const rowOf = async (tobaccoId: string, now: Date) => (await rowsOfRecords(prisma, [await loadItem(prisma, tobaccoId)], now))[0];

const rowsOf = async (tobaccoIds: string[], now: Date) => {
  const records = await prisma.shelfItem.findMany({ where: { tobaccoId: { in: tobaccoIds } }, include: shelfInclude });
  const rows = new Map((await rowsOfRecords(prisma, records, now)).map((row) => [row.tobacco.id, row]));
  return tobaccoIds.flatMap((id) => rows.get(id) ?? []);
};

// Полка — в работе и в плане.
export const getShelf = async (now = new Date()): Promise<ShelfView> => {
  const records = (await prisma.shelfItem.findMany({ where: { status: ON_SHELF }, include: shelfInclude })).sort(byName);
  return { rows: await rowsOfRecords(prisma, records, now) };
};

export const getShelfItem = async (tobaccoId: string, now = new Date()): Promise<ShelfCard> => {
  const record = await loadItem(prisma, tobaccoId);
  const [arrivals, [row], mixes, candidates] = await Promise.all([
    loadArrivals(prisma, [tobaccoId]),
    rowsOfRecords(prisma, [record], now),
    cardMixes(tobaccoId),
    similarCandidates(),
  ]);

  return {
    ...row,
    mixes,
    arrivals: (arrivals.get(tobaccoId) ?? []).map(arrivalView),
    similar: rankSimilar(
      { tobaccoId, flavorProfiles: row.tobacco.flavorProfiles, flavors: row.tobacco.flavors },
      candidates,
      new Set(row.analogs.map((analog) => analog.tobaccoId)),
    ),
  };
};

// Миксы с табаком и их статус по правилу доступности с аналогами (#479).
const cardMixes = async (tobaccoId: string): Promise<ShelfCard['mixes']> => {
  const [mixes, context] = await Promise.all([
    prisma.mix.findMany({
      where: { available: true, components: { some: { tobaccoId } } },
      select: {
        id: true,
        name: true,
        components: {
          orderBy: { sortOrder: 'asc' },
          select: { tobacco: { select: { id: true, manufacturer: true, name: true, flavors: true, inStock: true, archived: true } } },
        },
      },
    }),
    loadRuleContext(),
  ]);
  return mixes
    .map((mix) => {
      const { status, substitution } = resolveMixAvailability(true, mix.components.map((item) => toRuleComponent(item.tobacco, context)));
      return { id: mix.id, name: mix.name, status, substitution };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
};

// Кандидаты в аналоги — только полка в наличии (около 300 табаков), каталог не читается.
const similarCandidates = async () => {
  const shelf = await prisma.shelfItem.findMany({
    where: { status: 'active', tobacco: { inStock: true, archived: false } },
    select: { tobacco: { select: { id: true, manufacturer: true, name: true, flavorProfiles: true, flavors: true } } },
  });
  return shelf.map(({ tobacco }) => ({
    tobaccoId: tobacco.id,
    manufacturer: tobacco.manufacturer,
    name: tobacco.name,
    flavorProfiles: parseList(tobacco.flavorProfiles),
    flavors: parseList(tobacco.flavors),
  }));
};

// --- наличие и аудит ---------------------------------------------------------

export const syncAvailability = async (tx: Tx, tobaccoIds: string[]) => {
  const records = await tx.tobacco.findMany({
    where: { id: { in: tobaccoIds } },
    select: { id: true, inStock: true, archived: true, shelfItem: { select: { status: true, stopped: true, outAt: true } } },
  });
  const available = (record: (typeof records)[number]) =>
    !record.archived
    && record.shelfItem?.status === 'active'
    && !record.shelfItem.stopped
    && !record.shelfItem.outAt;

  const on = records.filter((record) => available(record) && !record.inStock).map((record) => record.id);
  const off = records.filter((record) => !available(record) && record.inStock).map((record) => record.id);
  if (on.length) await tx.tobacco.updateMany({ where: { id: { in: on } }, data: { inStock: true } });
  if (off.length) await tx.tobacco.updateMany({ where: { id: { in: off } }, data: { inStock: false } });
};

const label = (record: ShelfRecord) => `${record.tobacco.manufacturer} · ${record.tobacco.name}`;

const audit = (
  tx: Tx,
  actor: ShelfActor,
  event: { action: AuditAction; entityId: string; entityLabel: string; details?: Record<string, unknown> },
) =>
  tx.auditEvent.create({
    data: {
      actorLogin: actor.login,
      actorName: actor.name,
      actorRole: actor.role,
      action: event.action,
      entityType: 'shelf',
      entityId: event.entityId,
      entityLabel: event.entityLabel,
      details: JSON.stringify(event.details ?? {}),
    },
  });

// --- «Закончился» и «Вернуть в наличие» --------------------------------------

const batchIds = (value: unknown) => {
  if (!Array.isArray(value) || !value.length || value.length > MAX_BATCH || !value.every((id) => typeof id === 'string' && id.trim())) {
    throw new ShelfValidationError(`Список табаков: от 1 до ${MAX_BATCH} id`);
  }
  return [...new Set(value.map((id: string) => id.trim()))];
};

const loadBatch = async (tx: Tx, ids: string[]) => {
  const records = new Map(
    (await tx.shelfItem.findMany({ where: { tobaccoId: { in: ids } }, include: shelfInclude })).map((record) => [record.tobaccoId, record]),
  );
  const missing = ids.filter((id) => !records.has(id));
  if (missing.length) throw new ShelfNotFoundError(`Табаков нет на полке: ${missing.join(', ')}`);
  return records;
};

// Пакет — события аудита с общим batchId: отдельной таблицы под пакеты нет. Отменённый
// пакет отмечен событием отмены и второй раз не отменяется.
const loadBatchEvents = async (tx: Tx, batchId: string, action: AuditAction, undoAction: AuditAction) => {
  const where = { entityType: 'shelf', details: { contains: `"batchId":${JSON.stringify(batchId)}` } };
  const [events, undone] = await Promise.all([
    tx.auditEvent.findMany({ where: { ...where, action }, orderBy: { createdAt: 'asc' } }),
    tx.auditEvent.count({ where: { ...where, action: undoAction } }),
  ]);
  if (!events.length || undone) throw new ShelfNotFoundError(`Пакет ${batchId} не найден`);
  return events.map((event) => {
    const details = JSON.parse(event.details ?? '{}') as { outAt?: string | null; fromPlan?: boolean };
    return { tobaccoId: event.entityId, outAt: details.outAt ?? null, fromPlan: details.fromPlan === true };
  });
};

export type EmptySkip = { tobaccoId: string; reason: 'out' | 'plan' };

// «Закончились» разом (#333): дата outAt и общий пакет для одной отмены.
// Закончившиеся и «в плане» пропускаются.
export const markEmptyMany = async (actor: ShelfActor, tobaccoIds: unknown, now = new Date()) => {
  const ids = batchIds(tobaccoIds);
  const batchId = randomUUID();
  const { done, skipped, hiddenMixes } = await prisma.$transaction(async (tx) => {
    const records = await loadBatch(tx, ids);
    const done: string[] = [];
    const skipped: EmptySkip[] = [];
    for (const id of ids) {
      const record = records.get(id)!;
      if (record.status === 'plan' || record.outAt) {
        skipped.push({ tobaccoId: id, reason: record.status === 'plan' ? 'plan' : 'out' });
        continue;
      }
      await tx.shelfItem.update({ where: { id: record.id }, data: { outAt: now } });
      await audit(tx, actor, { action: 'mark-empty', entityId: id, entityLabel: label(record), details: { batchId, outAt: iso(now) } });
      done.push(id);
    }
    await syncAvailability(tx, done);
    const mixes = done.length ? await loadMixes(tx, done) : [];
    return { done, skipped, hiddenMixes: new Set(mixes.map((item) => item.mix.id)).size };
  });
  return { batchId, done, skipped, hiddenMixes, items: await rowsOf(done, now) };
};

// Одиночный «Закончился» — пакет из одного табака, отмена — по пакету.
export const markEmpty = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  const { batchId, skipped, items } = await markEmptyMany(actor, [tobaccoId], now);
  if (skipped.length) throw new ShelfConflictError('no_stock', 'Табак уже закончился');
  return { batchId, item: items[0] };
};

// Отмена возвращает «Есть» тем, у кого с тех пор осталась дата этого пакета.
export const undoEmptyBatch = async (actor: ShelfActor, batchId: string, now = new Date()) => {
  const tobaccoIds = await prisma.$transaction(async (tx) => {
    const events = await loadBatchEvents(tx, batchId, 'mark-empty', 'undo-empty');
    const ids = events.map((event) => event.tobaccoId);
    const records = await loadBatch(tx, ids);
    for (const event of events) {
      const record = records.get(event.tobaccoId)!;
      const restored = iso(record.outAt) === event.outAt;
      if (restored) await tx.shelfItem.update({ where: { id: record.id }, data: { outAt: null } });
      await audit(tx, actor, { action: 'undo-empty', entityId: event.tobaccoId, entityLabel: label(record), details: { batchId, restored } });
    }
    await syncAvailability(tx, ids);
    return ids;
  });
  return { items: await rowsOf(tobaccoIds, now) };
};

export type RestockSkip = { tobaccoId: string; reason: 'in' };

// «Вернуть в наличие» (#518): снимает «Закончился». Прежняя дата — в аудите пакета:
// отмена возвращает её тем, кого с тех пор не отметили снова. Табак из плана (#558)
// встаёт в работу «Есть» без поставки: принесли без счёта или поставку не заводят.
export const restockMany = async (actor: ShelfActor, tobaccoIds: unknown, now = new Date()) => {
  const ids = batchIds(tobaccoIds);
  const batchId = randomUUID();
  const { done, skipped } = await prisma.$transaction(async (tx) => {
    const records = await loadBatch(tx, ids);
    const done: string[] = [];
    const skipped: RestockSkip[] = [];
    for (const id of ids) {
      const record = records.get(id)!;
      const fromPlan = record.status === 'plan';
      if (!fromPlan && !record.outAt) {
        skipped.push({ tobaccoId: id, reason: 'in' });
        continue;
      }
      await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'active', outAt: null } });
      await audit(tx, actor, {
        action: 'restock',
        entityId: id,
        entityLabel: label(record),
        details: fromPlan ? { batchId, outAt: null, fromPlan } : { batchId, outAt: iso(record.outAt) },
      });
      done.push(id);
    }
    await syncAvailability(tx, done);
    return { done, skipped };
  });
  return { batchId, done, skipped, items: await rowsOf(done, now) };
};

export const restock = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  const { batchId, skipped, items } = await restockMany(actor, [tobaccoId], now);
  if (skipped.length) throw new ShelfConflictError('in_stock', 'Табак и так в наличии');
  return { batchId, item: items[0] };
};

export const undoRestockBatch = async (actor: ShelfActor, batchId: string, now = new Date()) => {
  const tobaccoIds = await prisma.$transaction(async (tx) => {
    const events = await loadBatchEvents(tx, batchId, 'restock', 'undo-restock');
    const ids = events.map((event) => event.tobaccoId);
    const records = await loadBatch(tx, ids);
    for (const event of events) {
      const record = records.get(event.tobaccoId)!;
      if (event.fromPlan) {
        // В план — только то, что с тех пор не трогали: в работе и «Есть».
        const replanned = record.status === 'active' && !record.outAt;
        if (replanned) await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'plan' } });
        await audit(tx, actor, { action: 'undo-restock', entityId: event.tobaccoId, entityLabel: label(record), details: { batchId, replanned } });
        continue;
      }
      const restored = !record.outAt && event.outAt ? new Date(event.outAt) : null;
      if (restored) await tx.shelfItem.update({ where: { id: record.id }, data: { outAt: restored } });
      await audit(tx, actor, { action: 'undo-restock', entityId: event.tobaccoId, entityLabel: label(record), details: { batchId, outAt: iso(restored) } });
    }
    await syncAvailability(tx, ids);
    return ids;
  });
  return { items: await rowsOf(tobaccoIds, now) };
};

// «Держать постоянно» у выбранных (#518): закончившиеся попадают в «К заказу».
export const setKeepStockedMany = async (actor: ShelfActor, tobaccoIds: unknown, keepStocked: unknown, now = new Date()) => {
  if (typeof keepStocked !== 'boolean') throw new ShelfValidationError('Держим постоянно: true или false');
  const ids = batchIds(tobaccoIds);
  await prisma.$transaction(async (tx) => {
    const records = await loadBatch(tx, ids);
    for (const id of ids) {
      const record = records.get(id)!;
      await tx.shelfItem.update({ where: { id: record.id }, data: { keepStocked } });
      await audit(tx, actor, { action: 'update', entityId: id, entityLabel: label(record), details: { keepStocked } });
    }
  });
  return { items: await rowsOf(ids, now) };
};

// --- строка полки ------------------------------------------------------------

export const setStop = async (actor: ShelfActor, tobaccoId: string, stopped: boolean, note?: string, now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    const stopNote = stopped ? note?.trim() || null : null;
    await tx.shelfItem.update({ where: { id: record.id }, data: { stopped, stopNote } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, { action: 'stop', entityId: tobaccoId, entityLabel: label(record), details: { stopped, stopNote } });
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
    await audit(tx, actor, { action: 'update', entityId: tobaccoId, entityLabel: label(record), details: data });
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
    await audit(tx, actor, { action: 'update', entityId: tobaccoId, entityLabel: label(record), details: { trialVerdict } });
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

// Наличие стоящей или убранной строки не меняется. Новая строка и строка из плана
// в работе ещё не приходили — «Закончился» до прихода; в плане даты нет.
export const addToShelf = async (actor: ShelfActor, tobaccoId: string, status: 'active' | 'plan', now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const before = await tx.shelfItem.findUnique({ where: { tobaccoId }, select: { status: true } });
    const item = await ensureOnShelf(tx, tobaccoId, status);
    if (!before || before.status === 'plan') {
      await tx.shelfItem.update({ where: { id: item.id }, data: { outAt: item.status === 'plan' ? null : now } });
    }
    await syncAvailability(tx, [tobaccoId]);
    const record = await loadItem(tx, tobaccoId);
    await audit(tx, actor, { action: 'add', entityId: tobaccoId, entityLabel: label(record), details: { status: item.status } });
  });
  return rowOf(tobaccoId, now);
};

export const removeFromShelf = async (actor: ShelfActor, tobaccoId: string, now = new Date()) => {
  await prisma.$transaction(async (tx) => {
    const record = await loadItem(tx, tobaccoId);
    await tx.shelfItem.update({ where: { id: record.id }, data: { status: 'dropped' } });
    await syncAvailability(tx, [tobaccoId]);
    await audit(tx, actor, { action: 'remove', entityId: tobaccoId, entityLabel: label(record), details: { from: record.status } });
  });
  return rowOf(tobaccoId, now);
};

// --- старт и тумблер «Каталога» ----------------------------------------------

// Стартовая полка для сида тестов и dev-БД: табаки в наличии встают на полку «Есть»
// со строкой стартовой поставки — как на проде после #518.
export const startShelfFromStock = async (tx: Tx, now: Date) => {
  const tobaccos = await tx.tobacco.findMany({
    where: { inStock: true, archived: false, shelfItem: { is: null } },
    select: { id: true, manufacturer: true, name: true },
    orderBy: [{ manufacturer: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  });
  if (!tobaccos.length) return;
  await tx.delivery.create({
    data: {
      kind: 'start',
      status: 'received',
      receivedAt: now,
      lines: {
        create: tobaccos.map((tobacco, index) => ({
          n: index + 1,
          rawName: `${tobacco.manufacturer} ${tobacco.name}`,
          qty: 1,
          tobaccoId: tobacco.id,
        })),
      },
    },
  });
  await tx.shelfItem.createMany({ data: tobaccos.map((tobacco) => ({ tobaccoId: tobacco.id })) });
};

// Тумблер наличия «Каталога» и создания карточки. «Есть» — табак на полке в работе,
// без стопа и «Закончился». «Нет» — «Закончился» (у плана даты нет). Аудит пишет
// эндпоинт инвентаря.
export const setStockedLegacy = async (tx: Tx, tobaccoIds: string[], inStock: boolean, now: Date) => {
  for (const tobaccoId of tobaccoIds) {
    if (inStock) {
      const item = await ensureOnShelf(tx, tobaccoId, 'active');
      await tx.shelfItem.update({ where: { id: item.id }, data: { stopped: false, stopNote: null, outAt: null } });
    } else {
      await tx.shelfItem.updateMany({ where: { tobaccoId, status: { not: 'plan' }, outAt: null }, data: { outAt: now } });
    }
  }
  await syncAvailability(tx, tobaccoIds);
};
