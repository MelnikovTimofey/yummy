import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { prisma } from './db';
import { acceptDelivery, addLine, createManualDraft } from './deliveries';
import {
  addCount,
  addReceipt,
  addToShelf,
  bookOf,
  deleteEntry,
  getShelf,
  getShelfItem,
  markEmpty,
  markEmptyMany,
  removeFromShelf,
  setStockedLegacy,
  syncAvailability,
  undoEmptyBatch,
  writeOff,
} from './shelf';
import { resetAppState } from './state';

// #518 S1: «Закончился» — дата outAt у строки полки, null — «Есть». Наличие для
// гостя считается по outAt; журнал граммов пока пишется рядом.

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const PEACH = 'tobacco-peach-silk';
const BERRY = 'tobacco-berry-oasis';
const CITRUS = 'tobacco-citrus-breeze';
const HONEY = 'tobacco-desert-honey';
const SPICE = 'tobacco-spice-route';
const HERBAL = 'tobacco-herbal-dawn';
const ROSE = 'tobacco-rose-nocturne';
const APPLE = 'tobacco-apple-fizz';
const COCONUT = 'tobacco-coconut-cream';
const GRAPE = 'tobacco-grape-fog';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

const inStock = async (id: string) =>
  (await prisma.tobacco.findUniqueOrThrow({ where: { id }, select: { inStock: true } })).inStock;

const outAt = async (tobaccoId: string) =>
  (await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId }, select: { outAt: true } })).outAt;

const shelfId = async (tobaccoId: string) => (await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId } })).id;

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.stockEntry.findFirstOrThrow({ orderBy: { at: 'asc' } })).at;
});

test.describe('наличие по outAt', () => {
  test('syncAvailability: активен, не стоп, не закончился, не архив — журнал граммов не читается', async () => {
    const ids = [CITRUS, BERRY, HONEY, SPICE, MINT, PEACH];
    await prisma.shelfItem.update({ where: { tobaccoId: BERRY }, data: { stopped: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: HONEY }, data: { status: 'plan' } });
    await prisma.tobacco.update({ where: { id: SPICE }, data: { archived: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: MINT }, data: { outAt: at(1) } });
    await prisma.tobacco.update({ where: { id: PEACH }, data: { inStock: true } });
    // 0 г в журнале без outAt — «Есть»: наличие решает outAt.
    await prisma.stockEntry.create({ data: { shelfItemId: await shelfId(CITRUS), kind: 'count', grams: 0, at: at(1) } });

    await prisma.$transaction((tx) => syncAvailability(tx, ids));

    assert.deepEqual(await Promise.all(ids.map(inStock)), [true, false, false, false, false, false]);
  });
});

test.describe('пишущие пути ставят и снимают outAt', () => {
  test('«Закончился» ставит дату, удаление отметки возвращает «Есть»; строка и карточка отдают outAt', async () => {
    assert.equal(await outAt(MINT), null);
    const { entryId, item } = await markEmpty(actor, MINT, at(3));
    assert.equal(item.outAt, at(3).toISOString());
    assert.deepEqual(await outAt(MINT), at(3));
    assert.equal((await getShelfItem(MINT, at(4))).outAt, at(3).toISOString());
    assert.equal((await getShelf(at(4))).rows.find((row) => row.tobacco.id === MINT)!.outAt, at(3).toISOString());

    const back = await deleteEntry(actor, entryId, at(4));
    assert.equal(back.outAt, null);
    assert.equal(await inStock(MINT), true);
  });

  test('«Закончились» пачкой и отмена пачки', async () => {
    const result = await markEmptyMany(actor, [MINT, BERRY], at(2));
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(BERRY)]), [at(2), at(2)]);
    await undoEmptyBatch(actor, result.batchId, at(2));
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(BERRY)]), [null, null]);
    assert.deepEqual(await Promise.all([inStock(MINT), inStock(BERRY)]), [true, true]);
  });

  test('отметка 0 г — «Закончился», остаток больше нуля и приход — «Есть»', async () => {
    await addCount(actor, MINT, { grams: 0 }, at(2));
    assert.deepEqual(await outAt(MINT), at(2));
    // Повторный ноль не сдвигает дату.
    await addCount(actor, MINT, { grams: 0 }, at(3));
    assert.deepEqual(await outAt(MINT), at(2));
    await addCount(actor, MINT, { grams: 40 }, at(4));
    assert.equal(await outAt(MINT), null);

    await addCount(actor, MINT, { grams: 0 }, at(5));
    await addReceipt(actor, MINT, { grams: 200 }, at(6));
    assert.equal(await outAt(MINT), null);
    assert.equal(await inStock(MINT), true);
  });

  test('списание до нуля — «Закончился», частичное — нет', async () => {
    await writeOff(actor, MINT, { grams: 50, reason: 'просыпали' }, at(1));
    assert.equal(await outAt(MINT), null);
    await writeOff(actor, MINT, { grams: 150, reason: 'брак' }, at(2));
    assert.deepEqual(await outAt(MINT), at(2));
    assert.equal(await inStock(MINT), false);
  });

  test('новая строка без прихода — «Закончился», в плане — без даты, приход оживляет план', async () => {
    const active = await addToShelf(actor, PEACH, 'active', at(1));
    assert.equal(active.outAt, at(1).toISOString());
    assert.equal(await inStock(PEACH), false);

    await prisma.shelfItem.delete({ where: { tobaccoId: PEACH } });
    const plan = await addToShelf(actor, PEACH, 'plan', at(1));
    assert.equal(plan.outAt, null);
    assert.equal(await inStock(PEACH), false);
    // План → полка без прихода: как и раньше, к гостю не попадает.
    const promoted = await addToShelf(actor, PEACH, 'active', at(2));
    assert.equal(promoted.outAt, at(2).toISOString());
    assert.equal(await inStock(PEACH), false);
    await addReceipt(actor, PEACH, { grams: 100 }, at(3));
    assert.equal(await outAt(PEACH), null);
    assert.equal(await inStock(PEACH), true);
  });

  test('убрать и вернуть на полку не меняют дату', async () => {
    await markEmpty(actor, MINT, at(1));
    await removeFromShelf(actor, MINT, at(2));
    assert.deepEqual(await outAt(MINT), at(1));
    await addToShelf(actor, MINT, 'active', at(3));
    assert.deepEqual(await outAt(MINT), at(1));
    assert.equal(await inStock(MINT), false);
  });

  test('тумблер наличия «Каталога»', async () => {
    await prisma.$transaction((tx) => setStockedLegacy(tx, [MINT], false, at(2)));
    assert.deepEqual(await outAt(MINT), at(2));
    assert.equal(await inStock(MINT), false);
    await prisma.$transaction((tx) => setStockedLegacy(tx, [MINT], true, at(3)));
    assert.equal(await outAt(MINT), null);
    assert.equal(await inStock(MINT), true);
  });

  test('приёмка счёта возвращает «Есть»', async () => {
    await markEmpty(actor, MINT, at(1));
    const draft = await createManualDraft(actor, { supplierName: 'Табачный двор' });
    await addLine(draft.id, { rawName: 'Mint Veil 200 г', qty: 1, grams: 200, tobaccoId: MINT });
    await acceptDelivery(actor, draft.id, { receivedAt: at(2) });
    assert.equal(await outAt(MINT), null);
    assert.equal(await inStock(MINT), true);
  });
});

// Данные миграции — всё, кроме ALTER TABLE: колонку в тестовой схеме уже создал db push.
const migrationData = () => {
  const file = path.join(__dirname, '..', 'prisma', 'migrations', '20261104000000_shelf_out_at', 'migration.sql');
  return readFileSync(file, 'utf8')
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter((statement) => statement && !/^ALTER TABLE/i.test(statement));
};

test.describe('миграция outAt из журнала граммов', () => {
  test('гостевое наличие ни у одного табака не меняется', async () => {
    const entry = async (tobaccoId: string, kind: string, grams: number, day: number) =>
      prisma.stockEntry.create({ data: { shelfItemId: await shelfId(tobaccoId), kind, grams, at: at(day) } });

    // CITRUS: закончился. BERRY: стоп с остатком. HONEY: стоп и закончился.
    // SPICE: списали всё. HERBAL: закончился и снова пришёл. ROSE: убран, остаток есть.
    // APPLE: убран, закончился. COCONUT: переписали остаток дважды подряд.
    // GRAPE: на полке без единого прихода. PEACH: в плане. MINT: есть.
    await entry(CITRUS, 'count', 0, 3);
    await prisma.shelfItem.update({ where: { tobaccoId: BERRY }, data: { stopped: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: HONEY }, data: { stopped: true } });
    await entry(HONEY, 'count', 0, 4);
    await entry(SPICE, 'writeoff', 120, 2);
    await entry(SPICE, 'writeoff', 80, 5);
    await entry(HERBAL, 'count', 0, 2);
    await entry(HERBAL, 'receipt', 100, 6);
    await prisma.shelfItem.update({ where: { tobaccoId: ROSE }, data: { status: 'dropped' } });
    await prisma.shelfItem.update({ where: { tobaccoId: APPLE }, data: { status: 'dropped' } });
    await entry(APPLE, 'count', 0, 7);
    await entry(COCONUT, 'count', 0, 3);
    await entry(COCONUT, 'count', 30, 3);
    await prisma.stockEntry.deleteMany({ where: { shelfItem: { tobaccoId: GRAPE } } });
    await prisma.shelfItem.delete({ where: { tobaccoId: GRAPE } });
    await prisma.shelfItem.create({ data: { tobaccoId: GRAPE, createdAt: at(1) } });
    await prisma.shelfItem.create({ data: { tobaccoId: PEACH, status: 'plan' } });

    // Наличие по правилу до миграции: активен, не стоп, остаток по учёту, не архив.
    const items = await prisma.shelfItem.findMany({
      select: { tobaccoId: true, status: true, stopped: true, tobacco: { select: { archived: true } }, entries: { orderBy: [{ at: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] } },
    });
    for (const item of items) {
      const stocked = item.status === 'active' && !item.stopped && !item.tobacco.archived && bookOf(item.entries) > 0;
      await prisma.tobacco.update({ where: { id: item.tobaccoId }, data: { inStock: stocked } });
    }
    const before = new Map(
      (await prisma.tobacco.findMany({ select: { id: true, inStock: true } })).map((tobacco) => [tobacco.id, tobacco.inStock]),
    );

    await prisma.shelfItem.updateMany({ data: { outAt: null } });
    for (const statement of migrationData()) await prisma.$executeRawUnsafe(statement);
    await prisma.$transaction((tx) => syncAvailability(tx, [...before.keys()]));

    const after = new Map(
      (await prisma.tobacco.findMany({ select: { id: true, inStock: true } })).map((tobacco) => [tobacco.id, tobacco.inStock]),
    );
    assert.deepEqual(after, before);

    const dates = new Map(
      (await prisma.shelfItem.findMany({ select: { tobaccoId: true, outAt: true } })).map((item) => [item.tobaccoId, item.outAt]),
    );
    assert.deepEqual(
      [CITRUS, BERRY, HONEY, SPICE, HERBAL, ROSE, APPLE, COCONUT, GRAPE, PEACH, MINT].map((id) => dates.get(id)),
      [at(3), null, at(4), at(5), null, null, at(7), null, at(1), null, null],
    );
  });
});
