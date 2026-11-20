import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { prisma } from './db';
import { acceptDelivery, addLine, createManualDraft } from './deliveries';
import {
  addToShelf,
  getShelf,
  getShelfItem,
  markEmpty,
  markEmptyMany,
  removeFromShelf,
  restock,
  setStockedLegacy,
  ShelfConflictError,
  ShelfNotFoundError,
  syncAvailability,
  undoEmptyBatch,
} from './shelf';
import { resetAppState } from './state';

// #518: «Закончился» — дата outAt у строки полки, null — «Есть». Граммов нет (S6):
// отмена «Закончился» — по пакету в аудите, приходы — строки принятых поставок.

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const PEACH = 'tobacco-peach-silk';
const BERRY = 'tobacco-berry-oasis';
const CITRUS = 'tobacco-citrus-breeze';
const HONEY = 'tobacco-desert-honey';
const SPICE = 'tobacco-spice-route';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

const inStock = async (id: string) =>
  (await prisma.tobacco.findUniqueOrThrow({ where: { id }, select: { inStock: true } })).inStock;

const outAt = async (tobaccoId: string) =>
  (await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId }, select: { outAt: true } })).outAt;

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' } })).receivedAt!;
});

test.describe('стартовая полка', () => {
  test('табаки в наличии — «Есть» со строкой стартовой поставки, не проба', async () => {
    const delivery = await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' }, include: { lines: true } });
    const items = await prisma.shelfItem.findMany();
    assert.ok(items.length > 0);
    assert.equal(delivery.status, 'received');
    assert.deepEqual(new Set(delivery.lines.map((line) => line.tobaccoId)), new Set(items.map((item) => item.tobaccoId)));
    assert.ok(items.every((item) => item.outAt === null));

    const card = await getShelfItem(MINT, at(1));
    assert.equal(card.trial, false);
    assert.deepEqual(card.arrivals.map((arrival) => ({ kind: arrival.kind, qty: arrival.qty })), [{ kind: 'start', qty: 1 }]);
  });
});

test.describe('наличие по outAt', () => {
  test('syncAvailability: активен, не стоп, не закончился, не архив', async () => {
    const ids = [CITRUS, BERRY, HONEY, SPICE, MINT];
    await prisma.shelfItem.update({ where: { tobaccoId: BERRY }, data: { stopped: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: HONEY }, data: { status: 'plan' } });
    await prisma.tobacco.update({ where: { id: SPICE }, data: { archived: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: MINT }, data: { outAt: at(1) } });

    await prisma.$transaction((tx) => syncAvailability(tx, ids));

    assert.deepEqual(await Promise.all(ids.map(inStock)), [true, false, false, false, false]);
  });
});

test.describe('«Закончился» и отмена', () => {
  test('одиночный — пакет из одного табака; строка и карточка отдают outAt; отмена возвращает «Есть»', async () => {
    assert.equal(await outAt(MINT), null);
    const { batchId, item } = await markEmpty(actor, MINT, at(3));
    assert.equal(item.outAt, at(3).toISOString());
    assert.deepEqual(await outAt(MINT), at(3));
    assert.equal(await inStock(MINT), false);
    assert.equal((await getShelfItem(MINT, at(4))).outAt, at(3).toISOString());
    assert.equal((await getShelf(at(4))).rows.find((row) => row.tobacco.id === MINT)!.outAt, at(3).toISOString());

    const { items } = await undoEmptyBatch(actor, batchId, at(4));
    assert.equal(items[0].outAt, null);
    assert.equal(await inStock(MINT), true);
    await assert.rejects(undoEmptyBatch(actor, batchId, at(4)), ShelfNotFoundError);
  });

  test('уже закончился и в плане — 409', async () => {
    await markEmpty(actor, MINT, at(1));
    await assert.rejects(markEmpty(actor, MINT, at(2)), (error: unknown) => error instanceof ShelfConflictError && error.code === 'no_stock');
    assert.deepEqual(await outAt(MINT), at(1));
    await prisma.shelfItem.update({ where: { tobaccoId: BERRY }, data: { status: 'plan' } });
    await assert.rejects(markEmpty(actor, BERRY, at(2)), ShelfConflictError);
  });

  test('пачкой и отмена пачки; отмена не трогает тех, кого с тех пор вернули и отметили снова', async () => {
    const result = await markEmptyMany(actor, [MINT, BERRY, CITRUS], at(2));
    assert.deepEqual(result.done, [MINT, BERRY, CITRUS]);
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(BERRY)]), [at(2), at(2)]);

    await restock(actor, CITRUS, at(3));
    await markEmpty(actor, CITRUS, at(4));

    await undoEmptyBatch(actor, result.batchId, at(5));
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(BERRY), outAt(CITRUS)]), [null, null, at(4)]);
    assert.deepEqual(await Promise.all([inStock(MINT), inStock(BERRY), inStock(CITRUS)]), [true, true, false]);

    const undo = await prisma.auditEvent.findMany({ where: { action: 'undo-empty' }, orderBy: { entityId: 'asc' } });
    assert.deepEqual(undo.map((event) => [event.entityId, JSON.parse(event.details!).restored]), [[BERRY, true], [CITRUS, false], [MINT, true]]);
  });

  test('отмена чужого пакета «Вернуть в наличие» как «Закончился» — 404', async () => {
    await markEmpty(actor, MINT, at(1));
    const { batchId } = await restock(actor, MINT, at(2));
    await assert.rejects(undoEmptyBatch(actor, batchId, at(3)), ShelfNotFoundError);
  });
});

test.describe('строка полки', () => {
  test('новая строка — «Закончился» до прихода, в плане — без даты', async () => {
    const active = await addToShelf(actor, PEACH, 'active', at(1));
    assert.equal(active.outAt, at(1).toISOString());
    assert.equal(await inStock(PEACH), false);

    await prisma.shelfItem.delete({ where: { tobaccoId: PEACH } });
    const plan = await addToShelf(actor, PEACH, 'plan', at(1));
    assert.equal(plan.outAt, null);
    assert.equal(await inStock(PEACH), false);
    const promoted = await addToShelf(actor, PEACH, 'active', at(2));
    assert.equal(promoted.outAt, at(2).toISOString());
    assert.equal(await inStock(PEACH), false);
  });

  test('убрать и вернуть на полку не меняют дату', async () => {
    await markEmpty(actor, MINT, at(1));
    await removeFromShelf(actor, MINT, at(2));
    assert.deepEqual(await outAt(MINT), at(1));
    await addToShelf(actor, MINT, 'active', at(3));
    assert.deepEqual(await outAt(MINT), at(1));
    assert.equal(await inStock(MINT), false);
  });

  test('тумблер наличия «Каталога»: «Нет» — дата, «Есть» — без даты и стопа; план без даты', async () => {
    await prisma.$transaction((tx) => setStockedLegacy(tx, [MINT], false, at(2)));
    assert.deepEqual(await outAt(MINT), at(2));
    assert.equal(await inStock(MINT), false);
    // Повторное «Нет» дату не сдвигает.
    await prisma.$transaction((tx) => setStockedLegacy(tx, [MINT], false, at(3)));
    assert.deepEqual(await outAt(MINT), at(2));

    await prisma.shelfItem.update({ where: { tobaccoId: MINT }, data: { stopped: true } });
    await prisma.$transaction((tx) => setStockedLegacy(tx, [MINT], true, at(3)));
    assert.equal(await outAt(MINT), null);
    assert.equal(await inStock(MINT), true);

    await prisma.shelfItem.update({ where: { tobaccoId: BERRY }, data: { status: 'plan' } });
    await prisma.$transaction((tx) => setStockedLegacy(tx, [BERRY], false, at(3)));
    assert.equal(await outAt(BERRY), null);

    await prisma.$transaction((tx) => setStockedLegacy(tx, [PEACH], true, at(3)));
    assert.equal(await outAt(PEACH), null);
    assert.equal(await inStock(PEACH), true);
  });

  test('приёмка счёта возвращает «Есть»; первый не стартовый приход за 60 дней — проба', async () => {
    await markEmpty(actor, MINT, at(1));
    await addToShelf(actor, PEACH, 'plan', at(1));
    const draft = await createManualDraft(actor, { supplierName: 'Табачный двор' });
    await addLine(draft.id, { rawName: 'Mint Veil 200 г', qty: 2, grams: 200, tobaccoId: MINT });
    await addLine(draft.id, { rawName: 'Peach Silk', qty: 1, tobaccoId: PEACH });
    await acceptDelivery(actor, draft.id, { receivedAt: at(2) });
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(PEACH)]), [null, null]);
    assert.deepEqual(await Promise.all([inStock(MINT), inStock(PEACH)]), [true, true]);

    const mint = await getShelfItem(MINT, at(3));
    assert.equal(mint.trial, false);
    assert.deepEqual(mint.arrivals.map((arrival) => [arrival.kind, arrival.qty, arrival.supplier]), [
      ['manual', 2, 'Табачный двор'],
      ['start', 1, null],
    ]);
    const peach = await getShelfItem(PEACH, at(3));
    assert.equal(peach.shelfStatus, 'active');
    assert.equal(peach.trial, true);
    assert.equal((await getShelfItem(PEACH, at(63))).trial, false);
  });
});

// Перенос стартовых приходов из журнала: только INSERT — таблицы в тестовой схеме
// уже такие, как после миграции, журнал заводится на время теста.
const migrationInsert = () => {
  const file = path.join(__dirname, '..', 'prisma', 'migrations', '20261105000000_drop_stock_grams', 'migration.sql');
  const statements = readFileSync(file, 'utf8')
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter((statement) => /^INSERT/i.test(statement));
  assert.equal(statements.length, 1);
  return statements[0];
};

test.describe('миграция S6: стартовые приходы → строки стартовой поставки', () => {
  test('стартовый приход — строка, ручной и по счёту — нет', async () => {
    const delivery = await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' } });
    await prisma.deliveryLine.deleteMany({ where: { deliveryId: delivery.id } });
    const shelfId = async (tobaccoId: string) => (await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId } })).id;

    await prisma.$executeRawUnsafe(`CREATE TABLE "StockEntry" (
      "id" TEXT PRIMARY KEY, "shelfItemId" TEXT NOT NULL, "kind" TEXT NOT NULL, "grams" INTEGER NOT NULL,
      "at" TIMESTAMP(3) NOT NULL, "deliveryId" TEXT, "deliveryLineId" TEXT)`);
    try {
      const entry = (id: string, shelfItemId: string, kind: string, deliveryId: string | null, deliveryLineId: string | null = null) =>
        prisma.$executeRawUnsafe(
          `INSERT INTO "StockEntry" VALUES ($1, $2, $3, 200, $4, $5, $6)`,
          id, shelfItemId, kind, start, deliveryId, deliveryLineId,
        );
      await entry('e1', await shelfId(MINT), 'receipt', delivery.id);
      await entry('e2', await shelfId(BERRY), 'receipt', delivery.id);
      await entry('e3', await shelfId(BERRY), 'count', null);
      await entry('e4', await shelfId(CITRUS), 'receipt', null);
      await entry('e5', await shelfId(HONEY), 'receipt', delivery.id, 'line-from-invoice');

      await prisma.$executeRawUnsafe(migrationInsert());
    } finally {
      await prisma.$executeRawUnsafe('DROP TABLE "StockEntry"');
    }

    const lines = await prisma.deliveryLine.findMany({ where: { deliveryId: delivery.id }, orderBy: { n: 'asc' } });
    assert.deepEqual(
      lines.map((line) => [line.n, line.tobaccoId, line.rawName, line.qty, line.kind, line.arrived, line.grams]),
      [
        [1, BERRY, 'Ателье Reserve Berry Oasis', 1, 'tobacco', true, null],
        [2, MINT, 'Ателье Reserve Mint Veil', 1, 'tobacco', true, null],
      ],
    );
  });
});
