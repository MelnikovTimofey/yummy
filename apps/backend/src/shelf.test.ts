import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { tobaccos as seedTobaccos } from './catalog';
import {
  addToShelf,
  getShelf,
  getShelfItem,
  markEmpty,
  markEmptyMany,
  removeFromShelf,
  setStop,
  setTrialVerdict,
  ShelfConflictError,
  ShelfNotFoundError,
  ShelfValidationError,
  undoEmptyBatch,
  updateShelfItem,
} from './shelf';
import { resetAppState } from './state';

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

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' } })).receivedAt!;
});

test.describe('старт полки из наличия', () => {
  test('каждому табаку в наличии — запись на полке в работе и строка стартовой поставки', async () => {
    const stocked = seedTobaccos.filter((item) => item.inStock);
    const items = await prisma.shelfItem.findMany();
    const lines = await prisma.deliveryLine.findMany({ where: { delivery: { kind: 'start' } } });

    assert.equal(items.length, stocked.length);
    assert.equal(items.some((item) => item.tobaccoId === PEACH), false);
    assert.ok(items.every((item) => item.status === 'active' && item.outAt === null));
    assert.deepEqual(lines.map((line) => line.tobaccoId).sort(), stocked.map((item) => item.id).sort());
  });
});

test.describe('«Закончился»', () => {
  test('гость не видит табак, отмена возвращает', async () => {
    const result = await markEmpty(actor, MINT, at(10));

    assert.equal(result.item.outAt, at(10).toISOString());
    assert.equal(result.item.guestAvailable, false);
    assert.equal(await inStock(MINT), false);

    const { items } = await undoEmptyBatch(actor, result.batchId, at(10));
    assert.equal(items[0].guestAvailable, true);
    assert.equal(await inStock(MINT), true);
  });

  test('уже закончился — ошибка домена; не на полке — не найден', async () => {
    await markEmpty(actor, MINT, at(1));
    await assert.rejects(markEmpty(actor, MINT, at(2)), ShelfConflictError);
    await assert.rejects(markEmpty(actor, 'tobacco-nope', at(2)), ShelfNotFoundError);
    await assert.rejects(markEmpty(actor, PEACH, at(2)), ShelfNotFoundError);
  });
});

test.describe('стоп, настройки строки, полка и план', () => {
  test('стоп для гостей снимает наличие', async () => {
    const stopped = await setStop(actor, MINT, true, 'горчит', at(1));
    assert.deepEqual([stopped.stopped, stopped.stopNote, stopped.guestAvailable], [true, 'горчит', false]);
    assert.equal(await inStock(MINT), false);

    const resumed = await setStop(actor, MINT, false, undefined, at(1));
    assert.deepEqual([resumed.stopped, resumed.stopNote, resumed.guestAvailable], [false, null, true]);
    assert.equal(await inStock(MINT), true);
  });

  test('настройки строки: держим постоянно, заметка', async () => {
    const row = await updateShelfItem(actor, MINT, { keepStocked: false, note: ' у бара ' }, at(1));
    assert.deepEqual([row.keepStocked, row.note], [false, 'у бара']);
  });

  test('убрать с полки — наличие пропадает; вернуть — оживает', async () => {
    const removed = await removeFromShelf(actor, MINT, at(1));
    assert.equal(removed.shelfStatus, 'dropped');
    assert.equal(await inStock(MINT), false);
    assert.equal((await getShelf(at(1))).rows.some((row) => row.tobacco.id === MINT), false);

    const back = await addToShelf(actor, MINT, 'active', at(2));
    assert.equal(back.shelfStatus, 'active');
    assert.equal(await inStock(MINT), true);
  });

  test('план не понижает то, что уже держим', async () => {
    const row = await addToShelf(actor, MINT, 'plan', at(1));
    assert.equal(row.shelfStatus, 'active');
  });

  test('дата постановки в план (#561): новая строка и возврат после «Убрать с полки»', async () => {
    assert.equal((await addToShelf(actor, PEACH, 'plan', at(1))).plannedAt, at(1).toISOString());
    assert.equal((await addToShelf(actor, PEACH, 'plan', at(2))).plannedAt, at(1).toISOString());
    assert.equal((await removeFromShelf(actor, PEACH, at(3))).plannedAt, at(1).toISOString());
    assert.equal((await addToShelf(actor, PEACH, 'plan', at(4))).plannedAt, at(4).toISOString());
    assert.equal((await addToShelf(actor, MINT, 'plan', at(4))).plannedAt, null);
    assert.equal((await addToShelf(actor, BERRY, 'active', at(4))).plannedAt, null);
  });

  test('табак в плане к гостю не попадает', async () => {
    const row = await addToShelf(actor, PEACH, 'plan', at(1));
    assert.deepEqual([row.shelfStatus, row.outAt, row.guestAvailable], ['plan', null, false]);
    await assert.rejects(addToShelf(actor, 'tobacco-nope', 'plan', at(1)), ShelfNotFoundError);
  });
});

test.describe('проба', () => {
  test('впервые пришёл на полку за 60 дней по поставке; стартовый приход — не проба', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    await prisma.delivery.create({
      data: { kind: 'invoice', status: 'received', receivedAt: at(2), lines: { create: { n: 1, rawName: 'Peach Silk', qty: 1, tobaccoId: PEACH } } },
    });
    const trial = async (id: string, when: Date) => (await getShelf(when)).rows.find((row) => row.tobacco.id === id)!.trial;
    assert.equal(await trial(PEACH, at(10)), true);
    assert.equal(await trial(MINT, at(10)), false);
    assert.equal(await trial(PEACH, at(63)), false);
    assert.equal((await getShelfItem(PEACH, at(10))).trial, true);
  });

  test('черновик и не пришедшая строка — не приход', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    await prisma.delivery.create({
      data: { kind: 'invoice', status: 'draft', lines: { create: { n: 1, rawName: 'Peach Silk', qty: 1, tobaccoId: PEACH } } },
    });
    await prisma.delivery.create({
      data: {
        kind: 'invoice',
        status: 'received',
        receivedAt: at(2),
        lines: { create: { n: 1, rawName: 'Peach Silk', qty: 1, tobaccoId: PEACH, arrived: false } },
      },
    });
    const card = await getShelfItem(PEACH, at(3));
    assert.deepEqual([card.trial, card.lastArrival, card.arrivals], [false, null, []]);
  });

  test('отметка «зашло / не зашло» меняется и снимается, пишет аудит', async () => {
    const yes = await setTrialVerdict(actor, MINT, 'yes', at(1));
    assert.deepEqual([yes.trialVerdict, yes.trialMarkedAt], ['yes', at(1).toISOString()]);
    const no = await setTrialVerdict(actor, MINT, 'no', at(2));
    assert.deepEqual([no.trialVerdict, no.trialMarkedAt], ['no', at(2).toISOString()]);
    const cleared = await setTrialVerdict(actor, MINT, null, at(3));
    assert.deepEqual([cleared.trialVerdict, cleared.trialMarkedAt], [null, null]);

    await assert.rejects(setTrialVerdict(actor, MINT, 'maybe', at(3)), ShelfValidationError);
    await assert.rejects(setTrialVerdict(actor, 'tobacco-nope', 'yes', at(3)), ShelfNotFoundError);
    const events = await prisma.auditEvent.findMany({ where: { entityType: 'shelf', entityId: MINT }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(events.map((event) => [event.action, JSON.parse(event.details ?? '{}').trialVerdict]), [
      ['update', 'yes'],
      ['update', 'no'],
      ['update', null],
    ]);
  });
});

test.describe('«Закончились» разом', () => {
  test('дата на каждый, пропуск закончившихся и плана, скрытые миксы и одна отмена', async () => {
    await markEmpty(actor, CITRUS, at(1));
    await addToShelf(actor, PEACH, 'plan', at(1));

    const result = await markEmptyMany(actor, [MINT, BERRY, CITRUS, PEACH, MINT], at(5));
    assert.deepEqual(result.done, [MINT, BERRY]);
    assert.deepEqual(result.skipped, [
      { tobaccoId: CITRUS, reason: 'out' },
      { tobaccoId: PEACH, reason: 'plan' },
    ]);
    const mixes = await prisma.mixComponent.findMany({
      where: { tobaccoId: { in: [MINT, BERRY] }, mix: { available: true } },
      select: { mixId: true },
    });
    assert.equal(result.hiddenMixes, new Set(mixes.map((mix) => mix.mixId)).size);
    assert.ok(result.hiddenMixes >= 5);
    assert.deepEqual(result.items.map((item) => [item.tobacco.id, item.outAt, item.guestAvailable]), [
      [MINT, at(5).toISOString(), false],
      [BERRY, at(5).toISOString(), false],
    ]);
    assert.deepEqual([await inStock(MINT), await inStock(BERRY)], [false, false]);

    const events = await prisma.auditEvent.findMany({ where: { action: 'mark-empty' }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(events.slice(1).map((event) => JSON.parse(event.details ?? '{}').batchId), [result.batchId, result.batchId]);

    const undone = await undoEmptyBatch(actor, result.batchId, at(5));
    assert.deepEqual(undone.items.map((item) => [item.tobacco.id, item.guestAvailable]), [
      [MINT, true],
      [BERRY, true],
    ]);
    assert.deepEqual([await inStock(MINT), await inStock(BERRY)], [true, true]);
    // CITRUS закончился не в этом пакете — так и стоит.
    assert.equal(await inStock(CITRUS), false);
    await assert.rejects(undoEmptyBatch(actor, result.batchId, at(5)), ShelfNotFoundError);
  });

  test('список табаков обязателен; неизвестный табак — ничего не записано', async () => {
    await assert.rejects(markEmptyMany(actor, [], at(1)), ShelfValidationError);
    await assert.rejects(markEmptyMany(actor, 'x', at(1)), ShelfValidationError);
    await assert.rejects(markEmptyMany(actor, [MINT, 7], at(1)), ShelfValidationError);
    await assert.rejects(markEmptyMany(actor, [MINT, 'tobacco-nope'], at(1)), ShelfNotFoundError);
    assert.equal(await inStock(MINT), true);
  });
});

test.describe('экран «Полка»', () => {
  test('строки полки в работе и в плане, по имени; без граммов', async () => {
    const mintUrl = 'https://htreviews.org/tobaccos/atelier/mint-veil';
    await prisma.tobacco.update({ where: { id: MINT }, data: { sourceUrl: mintUrl } });
    await addToShelf(actor, PEACH, 'plan', at(1));
    await setStop(actor, BERRY, true, undefined, at(1));
    await markEmpty(actor, CITRUS, at(10));
    const shelf = await getShelf(at(12));

    assert.deepEqual(Object.keys(shelf), ['rows']);
    const stocked = seedTobaccos.filter((item) => item.inStock).length;
    assert.equal(shelf.rows.length, stocked + 1);

    const mint = shelf.rows.find((row) => row.tobacco.id === MINT)!;
    assert.deepEqual(Object.keys(mint).sort(), [
      'analogs',
      'guestAvailable',
      'keepStocked',
      'lastArrival',
      'mixCount',
      'note',
      'outAt',
      'plannedAt',
      'shelfStatus',
      'stopNote',
      'stopped',
      'tobacco',
      'trial',
      'trialMarkedAt',
      'trialVerdict',
    ]);
    assert.equal(mint.mixCount, 5);
    assert.deepEqual(mint.lastArrival && [mint.lastArrival.kind, mint.lastArrival.qty, mint.lastArrival.at], ['start', 1, start.toISOString()]);
    assert.deepEqual(mint.tobacco.flavors, seedTobaccos.find((item) => item.id === MINT)!.flavors);
    assert.equal(mint.tobacco.sourceUrl, mintUrl);
    assert.deepEqual(
      [BERRY, CITRUS, PEACH].map((id) => shelf.rows.find((row) => row.tobacco.id === id)!).map((row) => [row.stopped, !!row.outAt, row.shelfStatus]),
      [
        [true, false, 'active'],
        [false, true, 'active'],
        [false, false, 'plan'],
      ],
    );
  });

  test('карточка: строка, миксы, приходы', async () => {
    const card = await getShelfItem(MINT, at(11));
    assert.deepEqual(card.arrivals.map((arrival) => arrival.kind), ['start']);
    assert.equal('history' in card, false);
    assert.equal('settings' in card, false);
    assert.deepEqual(card.mixes.map((mix) => mix.name).sort(), [
      'Персиковый мираж',
      'Травяной сад',
      'Цитрусовый караван',
      'Яблочная волна',
      'Ягодный рассвет',
    ]);
    await assert.rejects(getShelfItem(PEACH, at(1)), ShelfNotFoundError);
  });
});

test.describe('аудит', () => {
  test('мутации полки пишут события аудита', async () => {
    const { batchId } = await markEmpty(actor, MINT, at(1));
    await undoEmptyBatch(actor, batchId, at(1));
    await setStop(actor, MINT, true, undefined, at(1));

    const events = await prisma.auditEvent.findMany({ where: { entityType: 'shelf' }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(
      events.map((event) => [event.entityType, event.action, event.entityId, event.actorLogin]),
      [
        ['shelf', 'mark-empty', MINT, 'admin'],
        ['shelf', 'undo-empty', MINT, 'admin'],
        ['shelf', 'stop', MINT, 'admin'],
      ],
    );
    assert.deepEqual(JSON.parse(events[0].details!), { batchId, outAt: at(1).toISOString() });
  });
});
