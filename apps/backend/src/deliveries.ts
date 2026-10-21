import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { describeLine } from './invoices/brands';
import { CONFIDENT_MATCH, matchLine, normalizeName, type CatalogTobacco, type SupplierMemoryItem } from './invoices/match';
import { parseInvoice } from './invoices/parse';
import { extractTextItems } from './invoices/pdf-text';
import type { TextPage } from './invoices/types';
import { ensureOnShelf, syncAvailability, type ShelfActor, type ShelfItemStatus } from './shelf';

// Поставки (#152, срез 3): счёт поставщика → черновик со строками → приёмка
// пишет приходы в граммах на полку и запоминает сопоставления строк в SupplierItem.

type Tx = Prisma.TransactionClient;

export type DeliveryKind = 'invoice' | 'manual' | 'start';
export type DeliveryStatus = 'draft' | 'received';
export type LineKind = 'tobacco' | 'skip';
// memory — по памяти поставщика, catalog — уверенное предложение каталога, manual — выбрал мастер.
export type MatchReason = 'memory' | 'catalog' | 'manual';

export class DeliveryNotFoundError extends Error {
  name = 'DeliveryNotFoundError';
}

export class DeliveryValidationError extends Error {
  name = 'DeliveryValidationError';
}

export class DeliveryConflictError extends Error {
  name = 'DeliveryConflictError';
  constructor(
    readonly code: 'duplicate' | 'pending_lines' | 'not_draft',
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export class InvoiceUnreadableError extends Error {
  name = 'InvoiceUnreadableError';
  constructor(readonly code: 'no_text' | 'unknown_format', message: string) {
    super(message);
  }
}

const MAX_QTY = 50;
const MAX_GRAMS = 5000;
const MAX_CANDIDATES = 5;

// --- представление -----------------------------------------------------------

export type DeliveryLineView = {
  id: string;
  n: number;
  rawName: string;
  article: string | null;
  qty: number;
  unit: string | null;
  priceKop: number | null;
  sumKop: number | null;
  grams: number | null;
  // Сколько граммов придёт: поправка мастера или qty × grams; null — граммы неизвестны.
  receivedGrams: number | null;
  kind: LineKind;
  arrived: boolean;
  tobacco: { id: string; manufacturer: string; lineName: string; name: string; shelfStatus: ShelfItemStatus | null } | null;
  matchReason: MatchReason | null;
  confidence: number | null;
  candidates: Array<{ id: string; manufacturer: string; lineName: string; name: string; confidence: number; reason: string }>;
  newOnShelf: boolean;
};

export type DeliveryCard = {
  id: string;
  kind: DeliveryKind;
  status: DeliveryStatus;
  supplier: { id: string; name: string; inn: string | null } | null;
  number: string | null;
  invoiceDate: string | null;
  receivedAt: string | null;
  totalKop: number | null;
  fileName: string | null;
  hasFile: boolean;
  createdAt: string;
  lines: DeliveryLineView[];
  linesSumKop: number;
  // null — сверять не с чем: у ручной поставки нет итога счёта.
  sumMatches: boolean | null;
  pendingLines: number;
  gramsToReceive: number;
  // Сколько граммов пришло по приёмке; у черновика 0.
  grams: number;
};

export type DeliveryListItem = {
  id: string;
  kind: DeliveryKind;
  status: DeliveryStatus;
  supplier: string | null;
  number: string | null;
  invoiceDate: string | null;
  receivedAt: string | null;
  lines: number;
  grams: number;
  totalKop: number | null;
  createdAt: string;
};

export type DeliveryList = {
  items: DeliveryListItem[];
  totals: { monthKop: number; monthGrams: number; drafts: number; suppliers: number; memoryItems: number };
};

type LineRecord = {
  qty: number;
  grams: number | null;
  receivedGrams: number | null;
  priceKop: number | null;
  sumKop: number | null;
  kind: string;
  arrived: boolean;
  tobaccoId: string | null;
};

const lineSum = (line: LineRecord) => line.sumKop ?? (line.priceKop !== null ? line.priceKop * line.qty : 0);
export const lineGrams = (line: Pick<LineRecord, 'qty' | 'grams' | 'receivedGrams'>) =>
  line.receivedGrams ?? (line.grams === null ? null : line.qty * line.grams);
const isReceived = (line: LineRecord) => line.kind === 'tobacco' && line.arrived;
const createsReceipt = (line: LineRecord) => isReceived(line) && line.tobaccoId !== null && lineGrams(line) !== null;
const isPending = (line: LineRecord) => isReceived(line) && (line.tobaccoId === null || lineGrams(line) === null);

const summarize = (lines: LineRecord[]) => ({
  linesSumKop: lines.reduce((total, line) => total + lineSum(line), 0),
  pendingLines: lines.filter(isPending).length,
  gramsToReceive: lines.filter(createsReceipt).reduce((total, line) => total + lineGrams(line)!, 0),
});

const iso = (value: Date | null) => (value ? value.toISOString() : null);
const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

const loadCatalog = (): Promise<CatalogTobacco[]> =>
  prisma.tobacco.findMany({ where: { archived: false }, select: { id: true, manufacturer: true, lineName: true, name: true } });

const loadMemory = async (client: Tx, supplierId: string | null): Promise<SupplierMemoryItem[]> =>
  supplierId
    ? client.supplierItem.findMany({ where: { supplierId }, select: { article: true, normalizedName: true, tobaccoId: true } })
    : [];

const bestMatch = (line: { article?: string; name: string }, catalog: CatalogTobacco[], memory: SupplierMemoryItem[]) => {
  const [best] = matchLine(line, catalog, memory);
  return best && best.confidence >= CONFIDENT_MATCH
    ? { tobaccoId: best.tobaccoId, matchReason: best.reason === 'memory' ? ('memory' as const) : ('catalog' as const) }
    : { tobaccoId: null, matchReason: null };
};

// Без file: PDF до 5 МБ читаем только в getDeliveryFile.
const cardSelect = {
  id: true,
  supplierId: true,
  kind: true,
  number: true,
  invoiceDate: true,
  receivedAt: true,
  status: true,
  totalKop: true,
  fileName: true,
  createdAt: true,
  supplier: { select: { id: true, name: true, inn: true } },
  lines: { orderBy: { n: 'asc' } },
  entries: { select: { grams: true } },
} satisfies Prisma.DeliverySelect;

const loadDelivery = async (client: Tx, id: string) => {
  const record = await client.delivery.findUnique({ where: { id }, select: cardSelect });
  if (!record) throw new DeliveryNotFoundError('Поставка не найдена');
  return record;
};

const loadDraft = async (client: Tx, id: string) => {
  const record = await loadDelivery(client, id);
  if (record.status !== 'draft') {
    throw new DeliveryConflictError('not_draft', 'Поставка уже принята — менять её нельзя');
  }
  return record;
};

export const getDelivery = async (id: string): Promise<DeliveryCard> => {
  const record = await loadDelivery(prisma, id);
  const [catalog, memory, withFile] = await Promise.all([
    loadCatalog(),
    loadMemory(prisma, record.supplierId),
    prisma.delivery.count({ where: { id, file: { not: null } } }),
  ]);
  const byId = new Map(catalog.map((tobacco) => [tobacco.id, tobacco]));

  const chosenIds = [...new Set(record.lines.map((line) => line.tobaccoId).filter((id): id is string => id !== null))];
  const chosen = new Map(
    (
      await prisma.tobacco.findMany({
        where: { id: { in: chosenIds } },
        select: { id: true, manufacturer: true, lineName: true, name: true, shelfItem: { select: { status: true } } },
      })
    ).map((tobacco) => [tobacco.id, tobacco]),
  );

  const lines = record.lines.map((line): DeliveryLineView => {
    const matches = matchLine({ article: line.article ?? undefined, name: line.rawName }, catalog, memory);
    const tobacco = line.tobaccoId ? chosen.get(line.tobaccoId) : undefined;
    const shelfStatus = (tobacco?.shelfItem?.status ?? null) as ShelfItemStatus | null;
    return {
      id: line.id,
      n: line.n,
      rawName: line.rawName,
      article: line.article,
      qty: line.qty,
      unit: line.unit,
      priceKop: line.priceKop,
      sumKop: line.sumKop,
      grams: line.grams,
      receivedGrams: lineGrams(line),
      kind: line.kind as LineKind,
      arrived: line.arrived,
      tobacco: tobacco
        ? { id: tobacco.id, manufacturer: tobacco.manufacturer, lineName: tobacco.lineName, name: tobacco.name, shelfStatus }
        : null,
      matchReason: line.matchReason as MatchReason | null,
      confidence: matches.find((match) => match.tobaccoId === line.tobaccoId)?.confidence ?? null,
      candidates: matches.slice(0, MAX_CANDIDATES).flatMap((match) => {
        const candidate = byId.get(match.tobaccoId);
        return candidate
          ? [{ id: candidate.id, manufacturer: candidate.manufacturer, lineName: candidate.lineName ?? '', name: candidate.name, confidence: match.confidence, reason: match.reason }]
          : [];
      }),
      newOnShelf: Boolean(tobacco) && shelfStatus !== 'active' && shelfStatus !== 'plan',
    };
  });

  const summary = summarize(record.lines);
  return {
    id: record.id,
    kind: record.kind as DeliveryKind,
    status: record.status as DeliveryStatus,
    supplier: record.supplier,
    number: record.number,
    invoiceDate: isoDate(record.invoiceDate),
    receivedAt: iso(record.receivedAt),
    totalKop: record.totalKop,
    fileName: record.fileName,
    hasFile: withFile > 0,
    createdAt: record.createdAt.toISOString(),
    lines,
    ...summary,
    sumMatches: record.totalKop === null ? null : summary.linesSumKop === record.totalKop,
    grams: record.entries.reduce((total, entry) => total + entry.grams, 0),
  };
};

export const getDeliveryFile = async (id: string) => {
  const record = await prisma.delivery.findUnique({ where: { id }, select: { fileName: true, file: true } });
  if (!record?.file) throw new DeliveryNotFoundError('Файл счёта не найден');
  return { fileName: record.fileName ?? 'invoice.pdf', file: Buffer.from(record.file) };
};

const monthStart = (now: Date) => new Date(now.getFullYear(), now.getMonth(), 1);

export const listDeliveries = async (now = new Date()): Promise<DeliveryList> => {
  const records = await prisma.delivery.findMany({
    select: {
      id: true,
      kind: true,
      status: true,
      number: true,
      invoiceDate: true,
      receivedAt: true,
      totalKop: true,
      createdAt: true,
      supplier: { select: { name: true } },
      lines: {
        select: { qty: true, grams: true, receivedGrams: true, priceKop: true, sumKop: true, kind: true, arrived: true, tobaccoId: true },
      },
      entries: { select: { grams: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const from = monthStart(now);
  const monthReceipts = await prisma.stockEntry.findMany({
    where: { kind: 'receipt', delivery: { status: 'received', kind: { not: 'start' }, receivedAt: { gte: from, lte: now } } },
    select: { grams: true, priceKop: true },
  });

  return {
    items: records.map((record) => {
      const summary = summarize(record.lines);
      return {
        id: record.id,
        kind: record.kind as DeliveryKind,
        status: record.status as DeliveryStatus,
        supplier: record.supplier?.name ?? null,
        number: record.number,
        invoiceDate: isoDate(record.invoiceDate),
        receivedAt: iso(record.receivedAt),
        lines: record.lines.length,
        // У черновика — сколько граммов даст приёмка сейчас.
        grams: record.status === 'draft' ? summary.gramsToReceive : record.entries.reduce((total, entry) => total + entry.grams, 0),
        totalKop: record.totalKop ?? (record.lines.length ? summary.linesSumKop : null),
        createdAt: record.createdAt.toISOString(),
      };
    }),
    totals: {
      monthKop: monthReceipts.reduce((total, receipt) => total + (receipt.priceKop ?? 0), 0),
      monthGrams: monthReceipts.reduce((total, receipt) => total + receipt.grams, 0),
      drafts: records.filter((record) => record.status === 'draft').length,
      suppliers: await prisma.supplier.count(),
      memoryItems: await prisma.supplierItem.count(),
    },
  };
};

// --- аудит -------------------------------------------------------------------

const audit = (
  tx: Tx,
  actor: ShelfActor,
  event: { action: 'create' | 'accept' | 'delete'; entityId: string; entityLabel: string; details?: Record<string, unknown> },
) =>
  tx.auditEvent.create({
    data: {
      actorLogin: actor.login,
      actorName: actor.name,
      actorRole: actor.role,
      action: event.action,
      entityType: 'delivery',
      entityId: event.entityId,
      entityLabel: event.entityLabel,
      details: JSON.stringify(event.details ?? {}),
    },
  });

const labelOf = (record: { number: string | null; supplier: { name: string } | null }) =>
  [record.supplier?.name ?? 'Без поставщика', record.number ? `№ ${record.number}` : null].filter(Boolean).join(' · ');

// --- создание ----------------------------------------------------------------

const findDuplicate = (client: Tx, supplierId: string | null, number: string | null, exceptId?: string) =>
  supplierId && number
    ? client.delivery.findFirst({
        where: { supplierId, number, status: { not: 'cancelled' }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
        select: { id: true, status: true },
      })
    : null;

const assertNotDuplicate = async (client: Tx, supplierId: string | null, number: string | null, exceptId?: string) => {
  const duplicate = await findDuplicate(client, supplierId, number, exceptId);
  if (duplicate) {
    const state = duplicate.status === 'draft' ? 'ждёт прихода в черновиках' : 'уже принят';
    throw new DeliveryConflictError('duplicate', `Счёт № ${number} этого поставщика уже загружен и ${state}`, {
      deliveryId: duplicate.id,
      status: duplicate.status,
    });
  }
};

const findSupplierByName = (client: Tx, name: string) =>
  client.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } });

export const createDraftFromPages = async (
  actor: ShelfActor,
  fileName: string,
  file: Uint8Array | null,
  pages: TextPage[],
  options: { allowDuplicate?: boolean } = {},
): Promise<DeliveryCard> => {
  const parsed = parseInvoice(pages);
  if (parsed.kind === 'no-text') {
    throw new InvoiceUnreadableError('no_text', 'В файле нет текста: похоже, это скан или фото. Заполните строки вручную.');
  }
  if (parsed.kind === 'unknown-format') {
    throw new InvoiceUnreadableError('unknown_format', 'Формат счёта не узнали. Заполните строки вручную.');
  }

  const catalog = await loadCatalog();
  const id = await prisma.$transaction(async (tx) => {
    const { name, inn } = parsed.supplier;
    const existing = inn ? await tx.supplier.findUnique({ where: { inn } }) : await findSupplierByName(tx, name);
    const supplier = existing
      ? existing.format === parsed.format
        ? existing
        : await tx.supplier.update({ where: { id: existing.id }, data: { format: parsed.format } })
      : await tx.supplier.create({ data: { name, inn, format: parsed.format } });

    if (!options.allowDuplicate) await assertNotDuplicate(tx, supplier.id, parsed.number);

    const memory = await loadMemory(tx, supplier.id);
    const delivery = await tx.delivery.create({
      data: {
        supplierId: supplier.id,
        kind: 'invoice',
        status: 'draft',
        number: parsed.number,
        invoiceDate: parsed.date ? new Date(parsed.date) : null,
        totalKop: parsed.totalKop,
        fileName,
        file: file ? Buffer.from(file) : null,
        lines: {
          create: parsed.lines.map((line) => {
            const described = describeLine(line.name);
            const match = bestMatch(line, catalog, memory);
            // Строку из памяти мастер уже подтверждал как табак.
            const kind: LineKind = described.isTobacco || match.matchReason === 'memory' ? 'tobacco' : 'skip';
            return {
              n: line.n,
              rawName: line.name,
              article: line.article ?? null,
              qty: Math.max(1, Math.round(line.qty)),
              unit: line.unit || null,
              priceKop: line.priceKop,
              sumKop: line.sumKop,
              grams: described.grams ?? null,
              kind,
              ...(kind === 'tobacco' ? match : { tobaccoId: null, matchReason: null }),
            };
          }),
        },
      },
    });
    await audit(tx, actor, {
      action: 'create',
      entityId: delivery.id,
      entityLabel: labelOf({ number: delivery.number, supplier }),
      details: { kind: 'invoice', lines: parsed.lines.length, fileName },
    });
    return delivery.id;
  });
  return getDelivery(id);
};

const PDF_MAGIC = '%PDF-';

export const createDraftFromPdf = async (
  actor: ShelfActor,
  fileName: string,
  file: Buffer,
  options: { allowDuplicate?: boolean } = {},
) => {
  if (file.subarray(0, PDF_MAGIC.length).toString('latin1') !== PDF_MAGIC) {
    throw new DeliveryValidationError('Это не PDF. Загрузите счёт в формате PDF.');
  }
  let pages: TextPage[];
  try {
    pages = await extractTextItems(file);
  } catch {
    throw new DeliveryValidationError('Не удалось открыть PDF: файл повреждён.');
  }
  return createDraftFromPages(actor, fileName, file, pages, options);
};

const cleanText = (value: string | null | undefined) => value?.trim() || null;

export const createManualDraft = async (
  actor: ShelfActor,
  input: { supplierName?: string | null; number?: string | null; invoiceDate?: Date | null },
): Promise<DeliveryCard> => {
  const supplierName = cleanText(input.supplierName);
  const number = cleanText(input.number);
  const id = await prisma.$transaction(async (tx) => {
    const supplier = supplierName
      ? (await findSupplierByName(tx, supplierName)) ?? (await tx.supplier.create({ data: { name: supplierName } }))
      : null;
    await assertNotDuplicate(tx, supplier?.id ?? null, number);
    const delivery = await tx.delivery.create({
      data: { supplierId: supplier?.id ?? null, kind: 'manual', status: 'draft', number, invoiceDate: input.invoiceDate ?? null },
    });
    await audit(tx, actor, {
      action: 'create',
      entityId: delivery.id,
      entityLabel: labelOf({ number, supplier }),
      details: { kind: 'manual' },
    });
    return delivery.id;
  });
  return getDelivery(id);
};

// --- правка черновика --------------------------------------------------------

const checkInt = (value: number | null | undefined, min: number, max: number, message: string) => {
  if (value !== undefined && value !== null && (!Number.isInteger(value) || value < min || value > max)) {
    throw new DeliveryValidationError(message);
  }
};

const checkLineFields = (input: { qty?: number; grams?: number | null; receivedGrams?: number | null; priceKop?: number | null }) => {
  checkInt(input.qty, 1, MAX_QTY, `Количество по счёту — целое число от 1 до ${MAX_QTY}`);
  checkInt(input.grams, 1, MAX_GRAMS, `Граммы в штуке — целое число от 1 до ${MAX_GRAMS}`);
  checkInt(input.receivedGrams, 1, MAX_QTY * MAX_GRAMS, 'Приход — целое число граммов больше нуля');
  checkInt(input.priceKop, 0, Number.MAX_SAFE_INTEGER, 'Цена — целое число копеек, не меньше нуля');
};

const checkTobacco = async (client: Tx, tobaccoId: string | null | undefined) => {
  if (!tobaccoId) return;
  const tobacco = await client.tobacco.findUnique({ where: { id: tobaccoId }, select: { id: true } });
  if (!tobacco) throw new DeliveryValidationError('Такого табака нет в каталоге');
};

export type LinePatch = {
  tobaccoId?: string | null;
  qty?: number;
  grams?: number | null;
  receivedGrams?: number | null;
  priceKop?: number | null;
  arrived?: boolean;
  kind?: LineKind;
};

export const updateLine = async (deliveryId: string, lineId: string, patch: LinePatch): Promise<DeliveryCard> => {
  checkLineFields(patch);
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDraft(tx, deliveryId);
    if (!delivery.lines.some((line) => line.id === lineId)) throw new DeliveryNotFoundError('Строка поставки не найдена');
    await checkTobacco(tx, patch.tobaccoId);
    await tx.deliveryLine.update({
      where: { id: lineId },
      data: {
        ...(patch.tobaccoId !== undefined
          ? { tobaccoId: patch.tobaccoId, matchReason: patch.tobaccoId ? 'manual' : null }
          : {}),
        ...(patch.qty !== undefined ? { qty: patch.qty } : {}),
        ...(patch.grams !== undefined ? { grams: patch.grams } : {}),
        ...(patch.receivedGrams !== undefined ? { receivedGrams: patch.receivedGrams } : {}),
        ...(patch.priceKop !== undefined ? { priceKop: patch.priceKop } : {}),
        ...(patch.arrived !== undefined ? { arrived: patch.arrived } : {}),
        ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      },
    });
  });
  return getDelivery(deliveryId);
};

export const updateDelivery = async (
  id: string,
  patch: { receivedAt?: Date | null; number?: string | null; invoiceDate?: Date | null },
): Promise<DeliveryCard> => {
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDraft(tx, id);
    const number = patch.number !== undefined ? cleanText(patch.number) : undefined;
    if (number !== undefined) await assertNotDuplicate(tx, delivery.supplierId, number, id);
    await tx.delivery.update({
      where: { id },
      data: {
        ...(patch.receivedAt !== undefined ? { receivedAt: patch.receivedAt } : {}),
        ...(number !== undefined ? { number } : {}),
        ...(patch.invoiceDate !== undefined ? { invoiceDate: patch.invoiceDate } : {}),
      },
    });
  });
  return getDelivery(id);
};

export const addLine = async (
  deliveryId: string,
  input: { rawName: string; qty: number; priceKop?: number | null; grams?: number | null; tobaccoId?: string | null; kind?: LineKind },
): Promise<DeliveryCard> => {
  const rawName = input.rawName.trim();
  if (!rawName) throw new DeliveryValidationError('Укажите название строки');
  if (input.qty === undefined) throw new DeliveryValidationError('Укажите количество по счёту');
  checkLineFields(input);

  const catalog = input.tobaccoId ? [] : await loadCatalog();
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDraft(tx, deliveryId);
    await checkTobacco(tx, input.tobaccoId);
    const kind = input.kind ?? 'tobacco';
    const match = input.tobaccoId
      ? { tobaccoId: input.tobaccoId, matchReason: 'manual' }
      : kind === 'tobacco'
        ? bestMatch({ name: rawName }, catalog, await loadMemory(tx, delivery.supplierId))
        : { tobaccoId: null, matchReason: null };
    await tx.deliveryLine.create({
      data: {
        deliveryId,
        n: Math.max(0, ...delivery.lines.map((line) => line.n)) + 1,
        rawName,
        qty: input.qty,
        priceKop: input.priceKop ?? null,
        grams: input.grams ?? describeLine(rawName).grams ?? null,
        kind,
        ...match,
      },
    });
  });
  return getDelivery(deliveryId);
};

export const deleteLine = async (deliveryId: string, lineId: string): Promise<DeliveryCard> => {
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDraft(tx, deliveryId);
    if (!delivery.lines.some((line) => line.id === lineId)) throw new DeliveryNotFoundError('Строка поставки не найдена');
    await tx.deliveryLine.delete({ where: { id: lineId } });
  });
  return getDelivery(deliveryId);
};

export const deleteDelivery = async (actor: ShelfActor, id: string) => {
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDraft(tx, id);
    await tx.delivery.delete({ where: { id } });
    await audit(tx, actor, {
      action: 'delete',
      entityId: id,
      entityLabel: labelOf(delivery),
      details: { kind: delivery.kind, lines: delivery.lines.length },
    });
  });
};

// --- приёмка -----------------------------------------------------------------

export const acceptDelivery = async (
  actor: ShelfActor,
  id: string,
  input: { receivedAt?: Date } = {},
): Promise<DeliveryCard> => {
  await prisma.$transaction(
    async (tx) => {
      const delivery = await loadDraft(tx, id);
      const pending = delivery.lines.filter(isPending).length;
      if (pending) {
        throw new DeliveryConflictError('pending_lines', `Выберите табак и укажите граммы в строках: ${pending}`, { count: pending });
      }
      const receivedAt = input.receivedAt ?? delivery.receivedAt ?? new Date();
      // Условное обновление берёт блокировку строки: повторное нажатие «Принять» ждёт
      // и видит уже принятую поставку, приход второй раз не пишется.
      const claimed = await tx.delivery.updateMany({ where: { id, status: 'draft' }, data: { status: 'received', receivedAt } });
      if (!claimed.count) throw new DeliveryConflictError('not_draft', 'Поставка уже принята — менять её нельзя');

      const accepted = delivery.lines.filter(createsReceipt);
      const tobaccoIds = [...new Set(accepted.map((line) => line.tobaccoId!))];
      const shelf = new Map<string, string>();
      for (const tobaccoId of tobaccoIds) shelf.set(tobaccoId, (await ensureOnShelf(tx, tobaccoId, 'active')).id);

      // Пришло меньше, чем по счёту, — цена прихода пропорциональна граммам.
      let grams = 0;
      let sumKop = 0;
      for (const line of accepted) {
        const received = lineGrams(line)!;
        const billed = line.grams === null ? received : line.qty * line.grams;
        const lineKop = line.sumKop ?? (line.priceKop === null ? null : line.priceKop * line.qty);
        const priceKop = lineKop === null ? null : Math.round((lineKop * received) / billed);
        await tx.stockEntry.create({
          data: {
            shelfItemId: shelf.get(line.tobaccoId!)!,
            kind: 'receipt',
            grams: received,
            at: receivedAt,
            priceKop,
            deliveryId: id,
            deliveryLineId: line.id,
            actorLogin: actor.login,
          },
        });
        grams += received;
        sumKop += priceKop ?? 0;
      }

      if (delivery.supplierId) {
        for (const line of delivery.lines.filter((item) => item.kind === 'tobacco' && item.tobaccoId)) {
          const memory = { article: line.article, tobaccoId: line.tobaccoId!, packWeight: line.grams };
          await tx.supplierItem.upsert({
            where: { supplierId_normalizedName: { supplierId: delivery.supplierId, normalizedName: normalizeName(line.rawName) } },
            create: { supplierId: delivery.supplierId, normalizedName: normalizeName(line.rawName), ...memory },
            update: memory,
          });
        }
      }

      await syncAvailability(tx, tobaccoIds);
      await audit(tx, actor, { action: 'accept', entityId: id, entityLabel: labelOf(delivery), details: { grams, sumKop } });
    },
    { timeout: 30_000 },
  );
  return getDelivery(id);
};
