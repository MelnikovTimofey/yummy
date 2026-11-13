import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { acceptDelivery, addLine, createManualDraft } from './deliveries';
import {
  addToShelf,
  getShelf,
  getShelfItem,
  markEmpty,
  markEmptyMany,
  restock,
  restockMany,
  setKeepStockedMany,
  ShelfConflictError,
  ShelfNotFoundError,
  ShelfValidationError,
  undoRestockBatch,
} from './shelf';
import { resetAppState } from './state';

// #518 S2: «Вернуть в наличие», «Держать постоянно» пачкой, приходы из счетов.

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const PEACH = 'tobacco-peach-silk';
const BERRY = 'tobacco-berry-oasis';
const CITRUS = 'tobacco-citrus-breeze';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

const inStock = async (id: string) =>
  (await prisma.tobacco.findUniqueOrThrow({ where: { id }, select: { inStock: true } })).inStock;

const outAt = async (tobaccoId: string) =>
  (await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId }, select: { outAt: true } })).outAt;

const rowOf = async (tobaccoId: string, when: Date) => (await getShelf(when)).rows.find((row) => row.tobacco.id === tobaccoId)!;

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' } })).receivedAt!;
});

test.describe('«Вернуть в наличие»', () => {
  test('по одному: табак снова у гостя; отмена возвращает дату «Закончился»', async () => {
    await markEmpty(actor, MINT, at(1));

    const { batchId, item } = await restock(actor, MINT, at(2));
    assert.equal(item.outAt, null);
    assert.equal(item.guestAvailable, true);
    assert.equal(await inStock(MINT), true);
    assert.equal((await rowOf(MINT, at(2))).outAt, null);

    const undone = await undoRestockBatch(actor, batchId, at(3));
    assert.deepEqual(undone.items.map((row) => [row.tobacco.id, row.outAt, row.guestAvailable]), [[MINT, at(1).toISOString(), false]]);
    assert.equal(await inStock(MINT), false);
    await assert.rejects(undoRestockBatch(actor, batchId, at(3)), ShelfNotFoundError);

    await assert.rejects(restock(actor, CITRUS, at(3)), (error) => error instanceof ShelfConflictError && error.code === 'in_stock');
    await assert.rejects(restock(actor, 'tobacco-nope', at(3)), ShelfNotFoundError);
  });

  test('из плана (#558): табак сразу «Есть» в работе; отмена возвращает в план', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));

    const { batchId, item } = await restock(actor, PEACH, at(2));
    assert.deepEqual([item.shelfStatus, item.outAt, item.guestAvailable], ['active', null, true]);
    assert.equal(await inStock(PEACH), true);

    assert.equal(item.plannedAt, at(1).toISOString());

    const undone = await undoRestockBatch(actor, batchId, at(3));
    assert.deepEqual(undone.items.map((row) => [row.tobacco.id, row.shelfStatus, row.outAt, row.guestAvailable]), [[PEACH, 'plan', null, false]]);
    assert.equal(undone.items[0].plannedAt, at(1).toISOString());
    assert.equal(await inStock(PEACH), false);
  });

  test('из плана: отмена не трогает табак, который с тех пор отметили «Закончился»', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    const { batchId } = await restock(actor, PEACH, at(2));
    await markEmpty(actor, PEACH, at(3));

    const undone = await undoRestockBatch(actor, batchId, at(4));
    assert.deepEqual(undone.items.map((row) => [row.shelfStatus, row.outAt]), [['active', at(3).toISOString()]]);
  });

  test('пачкой: пропуск тех, что есть; план — в наличие; одна отмена на всех', async () => {
    await markEmptyMany(actor, [MINT, BERRY], at(1));
    await addToShelf(actor, PEACH, 'plan', at(1));

    const result = await restockMany(actor, [MINT, BERRY, CITRUS, PEACH, MINT], at(2));
    assert.deepEqual(result.done, [MINT, BERRY, PEACH]);
    assert.deepEqual(result.skipped, [{ tobaccoId: CITRUS, reason: 'in' }]);
    assert.deepEqual(result.items.map((row) => [row.tobacco.id, row.outAt, row.guestAvailable]), [
      [MINT, null, true],
      [BERRY, null, true],
      [PEACH, null, true],
    ]);
    const events = await prisma.auditEvent.findMany({ where: { action: 'restock' } });
    assert.equal(events.length, 3);

    // BERRY успели снова отметить — отмена его не трогает.
    await markEmpty(actor, BERRY, at(3));
    await undoRestockBatch(actor, result.batchId, at(4));
    assert.deepEqual(await Promise.all([outAt(MINT), outAt(BERRY), outAt(PEACH)]), [at(1), at(3), null]);
    assert.equal((await rowOf(PEACH, at(4))).shelfStatus, 'plan');

    await assert.rejects(restockMany(actor, [], at(2)), ShelfValidationError);
    await assert.rejects(restockMany(actor, [MINT, 'tobacco-nope'], at(2)), ShelfNotFoundError);
  });

  test('после возврата «Закончился» снова ставится, добавление с каталога наличие не трогает', async () => {
    await markEmpty(actor, MINT, at(1));
    await restock(actor, MINT, at(2));
    await addToShelf(actor, MINT, 'active', at(3));
    assert.equal(await outAt(MINT), null);

    const { item } = await markEmpty(actor, MINT, at(4));
    assert.equal(item.outAt, at(4).toISOString());
    assert.equal(await inStock(MINT), false);
  });
});

test.describe('«Держать постоянно» пачкой', () => {
  test('ставит и снимает отметку у выбранных', async () => {
    const off = await setKeepStockedMany(actor, [MINT, BERRY], false, at(1));
    assert.deepEqual(off.items.map((row) => [row.tobacco.id, row.keepStocked]), [[MINT, false], [BERRY, false]]);
    const on = await setKeepStockedMany(actor, [MINT], true, at(1));
    assert.deepEqual(on.items.map((row) => [row.tobacco.id, row.keepStocked]), [[MINT, true]]);
    assert.equal(await prisma.auditEvent.count({ where: { action: 'update', entityType: 'shelf' } }), 3);

    await assert.rejects(setKeepStockedMany(actor, [MINT], 'да', at(1)), ShelfValidationError);
    await assert.rejects(setKeepStockedMany(actor, [MINT, 'tobacco-nope'], true, at(1)), ShelfNotFoundError);
  });
});

test.describe('приходы из счетов', () => {
  test('приёмка: табак «Есть», строка и карточка показывают приход по счёту', async () => {
    await markEmpty(actor, MINT, at(1));
    const draft = await createManualDraft(actor, { supplierName: 'Каспий Опт', number: '1184' });
    await addLine(draft.id, { rawName: 'Mint Veil', qty: 2, tobaccoId: MINT });
    const accepted = await acceptDelivery(actor, draft.id, { receivedAt: at(3) });
    assert.equal(accepted.pendingLines, 0);

    assert.equal(await outAt(MINT), null);
    assert.equal(await inStock(MINT), true);

    const arrival = { at: at(3).toISOString(), kind: 'manual', supplier: 'Каспий Опт', number: '1184', qty: 2, deliveryId: draft.id };
    assert.deepEqual((await rowOf(MINT, at(4))).lastArrival, arrival);
    const card = await getShelfItem(MINT, at(4));
    assert.deepEqual(card.arrivals.map((item) => [item.at, item.kind, item.supplier, item.qty]), [
      [at(3).toISOString(), 'manual', 'Каспий Опт', 2],
      [start.toISOString(), 'start', null, 1],
    ]);
  });

  test('приёмка табака из плана сохраняет дату постановки в план (#561)', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    const draft = await createManualDraft(actor, { supplierName: 'Каспий Опт' });
    await addLine(draft.id, { rawName: 'Peach Silk', qty: 1, tobaccoId: PEACH });
    await acceptDelivery(actor, draft.id, { receivedAt: at(3) });

    const row = await rowOf(PEACH, at(4));
    assert.deepEqual([row.shelfStatus, row.outAt, row.plannedAt], ['active', null, at(1).toISOString()]);
  });

  test('граммы в штуке — данные счёта: приход по строке один', async () => {
    const draft = await createManualDraft(actor, { supplierName: 'Южный табак' });
    await addLine(draft.id, { rawName: 'Berry Oasis 200 г', qty: 1, grams: 200, tobaccoId: BERRY });
    await acceptDelivery(actor, draft.id, { receivedAt: at(2) });

    const card = await getShelfItem(BERRY, at(3));
    assert.deepEqual(card.arrivals.map((item) => [item.kind, item.supplier, item.qty]), [
      ['manual', 'Южный табак', 1],
      ['start', null, 1],
    ]);
  });
});

test.describe('API', () => {
  test('вернуть по одному и пачкой, отмена, держать постоянно пачкой', async () => {
    const app = buildApp();
    const login = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
    const headers = { authorization: `Bearer ${(login.json() as { accessToken: string }).accessToken}` };
    assert.equal((await app.inject({ method: 'POST', url: `/staff/shelf/${MINT}/restock` })).statusCode, 401);

    await markEmptyMany(actor, [MINT, BERRY], at(1));
    const single = await app.inject({ method: 'POST', url: `/staff/shelf/${MINT}/restock`, headers });
    assert.equal(single.statusCode, 200);
    const one = single.json() as { batchId: string; item: { outAt: string | null } };
    assert.equal(one.item.outAt, null);
    assert.equal((await app.inject({ method: 'POST', url: `/staff/shelf/${MINT}/restock`, headers })).statusCode, 409);
    assert.equal((await app.inject({ method: 'DELETE', url: `/staff/shelf/restock-batches/${one.batchId}`, headers })).statusCode, 200);

    const many = await app.inject({ method: 'POST', url: '/staff/shelf/restock', headers, payload: { tobaccoIds: [MINT, BERRY, CITRUS] } });
    assert.equal(many.statusCode, 200);
    const body = many.json() as { batchId: string; done: string[]; skipped: unknown[]; items: unknown[] };
    assert.deepEqual(Object.keys(body).sort(), ['batchId', 'done', 'items', 'skipped']);
    assert.deepEqual(body.done, [MINT, BERRY]);
    assert.equal((await app.inject({ method: 'DELETE', url: `/staff/shelf/restock-batches/${body.batchId}`, headers })).statusCode, 200);
    assert.equal((await app.inject({ method: 'DELETE', url: `/staff/shelf/restock-batches/${body.batchId}`, headers })).statusCode, 404);
    assert.equal((await app.inject({ method: 'POST', url: '/staff/shelf/restock', headers, payload: {} })).statusCode, 400);

    const keep = await app.inject({ method: 'POST', url: '/staff/shelf/keep', headers, payload: { tobaccoIds: [MINT], keepStocked: false } });
    assert.equal(keep.statusCode, 200);
    assert.deepEqual((keep.json() as { items: Array<{ keepStocked: boolean }> }).items.map((row) => row.keepStocked), [false]);
    assert.equal((await app.inject({ method: 'POST', url: '/staff/shelf/keep', headers, payload: { tobaccoIds: [MINT] } })).statusCode, 400);
  });
});
