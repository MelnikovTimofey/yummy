import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { tobaccos as seedTobaccos } from './catalog';
import {
  addCount,
  addReceipt,
  addToShelf,
  deleteEntry,
  getSettings,
  getShelf,
  getShelfItem,
  markEmpty,
  removeFromShelf,
  setStop,
  ShelfConflictError,
  ShelfNotFoundError,
  ShelfValidationError,
  syncAvailability,
  updateSettings,
  updateShelfItem,
  writeOff,
} from './shelf';
import { resetAppState } from './state';

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const PEACH = 'tobacco-peach-silk';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

const inStock = async (id: string) =>
  (await prisma.tobacco.findUniqueOrThrow({ where: { id }, select: { inStock: true } })).inStock;

const entriesOf = (tobaccoId: string) =>
  prisma.stockEntry.findMany({ where: { shelfItem: { tobaccoId } }, orderBy: [{ at: 'asc' }, { createdAt: 'asc' }] });

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.stockEntry.findFirstOrThrow({ orderBy: { at: 'asc' } })).at;
});

test.describe('старт полки из наличия', () => {
  test('каждому табаку в наличии — запись на полке и стартовый приход типичной фасовки', async () => {
    const stocked = seedTobaccos.filter((item) => item.inStock);
    const items = await prisma.shelfItem.findMany({ include: { entries: { include: { delivery: true } } } });

    assert.equal(items.length, stocked.length);
    assert.equal(items.some((item) => item.tobaccoId === PEACH), false);
    for (const item of items) {
      assert.equal(item.status, 'active');
      assert.deepEqual(item.entries.map((entry) => [entry.kind, entry.delivery?.kind]), [['receipt', 'start']]);
      assert.ok([200, 250].includes(item.entries[0].grams));
    }
    assert.deepEqual(await getSettings(), { bowlGrams: 18, leadDays: 7 });
  });
});

test.describe('syncAvailability', () => {
  test('наличие = активен на полке, не стоп, остаток по учёту больше нуля, не архив', async () => {
    const ids = ['tobacco-citrus-breeze', 'tobacco-berry-oasis', 'tobacco-desert-honey', 'tobacco-spice-route', MINT, PEACH];
    await prisma.shelfItem.update({ where: { tobaccoId: 'tobacco-berry-oasis' }, data: { stopped: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: 'tobacco-desert-honey' }, data: { status: 'plan' } });
    await prisma.tobacco.update({ where: { id: 'tobacco-spice-route' }, data: { archived: true } });
    const mint = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: MINT } });
    await prisma.stockEntry.create({ data: { shelfItemId: mint.id, kind: 'count', grams: 0, at: new Date() } });
    await prisma.tobacco.update({ where: { id: PEACH }, data: { inStock: true } });

    await prisma.$transaction((tx) => syncAvailability(tx, ids));

    assert.deepEqual(
      await Promise.all(ids.map(inStock)),
      [true, false, false, false, false, false],
    );
  });
});

test.describe('«Закончился» и отмена', () => {
  test('гость не видит табак, удаление записи возвращает', async () => {
    const result = await markEmpty(actor, MINT, at(10));

    assert.equal(result.item.status, 'out');
    assert.equal(result.item.leftGrams, 0);
    assert.equal(result.item.guestAvailable, false);
    assert.equal(await inStock(MINT), false);
    const entries = await entriesOf(MINT);
    assert.deepEqual(entries.map((entry) => [entry.kind, entry.grams, entry.actorLogin]), [['receipt', 200, null], ['count', 0, 'admin']]);
    assert.equal(result.entryId, entries[1].id);

    const undone = await deleteEntry(actor, result.entryId, at(10));
    assert.equal(undone.guestAvailable, true);
    assert.equal(await inStock(MINT), true);
    assert.equal((await entriesOf(MINT)).length, 1);
  });

  test('«Закончился» даёт расход: стартовые 200 г за 10 дней', async () => {
    const result = await markEmpty(actor, MINT, at(10));
    assert.equal(result.item.rateKind, 'own');
    assert.equal(result.item.rate, 20);
  });

  test('уже закончился — ошибка домена', async () => {
    await markEmpty(actor, MINT, at(1));
    await assert.rejects(markEmpty(actor, MINT, at(2)), ShelfConflictError);
    await assert.rejects(markEmpty(actor, 'tobacco-nope', at(2)), ShelfNotFoundError);
    await assert.rejects(markEmpty(actor, PEACH, at(2)), ShelfNotFoundError);
  });

  test('приход по поставке из истории не удалить, несуществующую запись — тоже', async () => {
    const [startReceipt] = await entriesOf(MINT);
    await assert.rejects(deleteEntry(actor, startReceipt.id, at(1)), ShelfConflictError);
    await assert.rejects(deleteEntry(actor, 'entry-nope', at(1)), ShelfNotFoundError);
  });
});

test.describe('отметки остатка', () => {
  test('доля — от уровня после последнего прихода, хранится вместе с граммами', async () => {
    await addReceipt(actor, MINT, { grams: 200 }, at(1));
    const { item } = await addCount(actor, MINT, { fraction: 0.5 }, at(4));

    const count = (await entriesOf(MINT)).at(-1)!;
    // В момент отметки расхода ещё нет: 200 стартовых + 200 пришло = 400, ½ → 200 г.
    assert.deepEqual([count.kind, count.grams, count.fraction, count.actorLogin], ['count', 200, 0.5, 'admin']);
    // После отметки появился расход 50 г/день, и уровень после прихода пересчитан: 150 + 200.
    assert.equal(item.fullGrams, 350);
    assert.deepEqual(item.lastCount && [item.lastCount.grams, item.lastCount.fraction], [200, 0.5]);
    assert.equal(item.rate, 50);

    await assert.rejects(addCount(actor, MINT, { fraction: 0.6 }, at(5)), ShelfValidationError);
    await assert.rejects(addCount(actor, MINT, { fraction: 1 }, at(5)), ShelfValidationError);
  });

  test('точно в граммах — целое от 0 до 20 000', async () => {
    const { item } = await addCount(actor, MINT, { grams: 120 }, at(5));
    assert.equal(item.leftGrams, 120);
    assert.equal(item.lastCount?.fraction, null);
    await assert.rejects(addCount(actor, MINT, { grams: 1.5 }, at(5)), ShelfValidationError);
    await assert.rejects(addCount(actor, MINT, { grams: 20_001 }, at(5)), ShelfValidationError);
    await assert.rejects(addCount(actor, MINT, {}, at(5)), ShelfValidationError);
  });

  test('долей нельзя, пока не было прихода', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    await assert.rejects(addCount(actor, PEACH, { fraction: 0.5 }, at(2)), ShelfConflictError);
  });
});

test.describe('приход без счёта и списание', () => {
  test('приход оживляет план и попадает к гостю', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    assert.equal(await inStock(PEACH), false);

    const { item } = await addReceipt(actor, PEACH, { grams: 250, priceKop: 190_000 }, at(2));
    const [receipt] = await entriesOf(PEACH);
    assert.deepEqual([receipt.kind, receipt.grams, receipt.priceKop, receipt.deliveryId], ['receipt', 250, 190_000, null]);
    assert.equal(item.shelfStatus, 'active');
    assert.equal(item.lastReceipt?.label, 'Вручную');
    assert.equal(await inStock(PEACH), true);

    await assert.rejects(addReceipt(actor, PEACH, { grams: 0 }, at(2)), ShelfValidationError);
    await assert.rejects(addReceipt(actor, PEACH, { grams: 100, priceKop: -1 }, at(2)), ShelfValidationError);
  });

  test('списание всего остатка снимает наличие, причина обязательна', async () => {
    await assert.rejects(writeOff(actor, MINT, { grams: 50, reason: '  ' }, at(3)), ShelfValidationError);
    const { item } = await writeOff(actor, MINT, { grams: 200, reason: 'брак' }, at(3));

    assert.equal(item.status, 'out');
    assert.equal(await inStock(MINT), false);
    const entry = (await entriesOf(MINT)).at(-1)!;
    assert.deepEqual([entry.kind, entry.grams, entry.reason], ['writeoff', 200, 'брак']);
    await assert.rejects(writeOff(actor, MINT, { grams: 10, reason: 'брак' }, at(4)), ShelfConflictError);
  });

  test('частичное списание не трогает наличие и не идёт в расход', async () => {
    await writeOff(actor, MINT, { grams: 50, reason: 'просыпали' }, at(3));
    const { item } = await addCount(actor, MINT, { grams: 50 }, at(10));
    assert.equal(await inStock(MINT), true);
    assert.equal(item.rate, 10);
  });
});

test.describe('стоп, настройки строки, полка и план', () => {
  test('стоп для гостей снимает наличие без изменения остатка', async () => {
    const stopped = await setStop(actor, MINT, true, 'горчит', at(1));
    assert.deepEqual([stopped.status, stopped.stopped, stopped.stopNote], ['stop', true, 'горчит']);
    assert.equal(await inStock(MINT), false);

    const resumed = await setStop(actor, MINT, false, undefined, at(1));
    assert.deepEqual([resumed.status, resumed.stopped, resumed.stopNote], ['ok', false, null]);
    assert.equal(await inStock(MINT), true);
  });

  test('настройки строки: держим постоянно, заметка', async () => {
    const row = await updateShelfItem(actor, MINT, { keepStocked: false, note: ' у бара ' }, at(1));
    assert.deepEqual([row.keepStocked, row.note], [false, 'у бара']);
  });

  test('убрать с полки — наличие пропадает, история остаётся; вернуть — оживает', async () => {
    const removed = await removeFromShelf(actor, MINT, at(1));
    assert.equal(removed.shelfStatus, 'dropped');
    assert.equal(await inStock(MINT), false);
    assert.equal((await entriesOf(MINT)).length, 1);
    assert.equal((await getShelf(at(1))).rows.some((row) => row.tobacco.id === MINT), false);

    const back = await addToShelf(actor, MINT, 'active', at(2));
    assert.equal(back.shelfStatus, 'active');
    assert.equal(await inStock(MINT), true);
  });

  test('план не понижает то, что уже держим', async () => {
    const row = await addToShelf(actor, MINT, 'plan', at(1));
    assert.equal(row.shelfStatus, 'active');
  });

  test('табак в плане без прихода — статус «в плане», к гостю не попадает', async () => {
    const row = await addToShelf(actor, PEACH, 'plan', at(1));
    assert.deepEqual([row.shelfStatus, row.status, row.guestAvailable], ['plan', 'plan', false]);
    await assert.rejects(addToShelf(actor, 'tobacco-nope', 'plan', at(1)), ShelfNotFoundError);
  });
});

test.describe('настройки полки', () => {
  test('граммовка чаши и срок поставки в границах', async () => {
    assert.deepEqual(await updateSettings(actor, { bowlGrams: 20 }), { bowlGrams: 20, leadDays: 7 });
    assert.deepEqual(await updateSettings(actor, { leadDays: 14 }), { bowlGrams: 20, leadDays: 14 });
    await assert.rejects(updateSettings(actor, { bowlGrams: 0 }), ShelfValidationError);
    await assert.rejects(updateSettings(actor, { bowlGrams: 101 }), ShelfValidationError);
    await assert.rejects(updateSettings(actor, { leadDays: 61 }), ShelfValidationError);
    await assert.rejects(updateSettings(actor, { leadDays: 1.5 }), ShelfValidationError);
    assert.deepEqual(await getSettings(), { bowlGrams: 20, leadDays: 14 });
  });
});

test.describe('экран «Полка»', () => {
  test('строки, счётчики, итоги и прогноз на сегодня', async () => {
    const mintUrl = 'https://htreviews.org/tobaccos/atelier/mint-veil';
    await prisma.tobacco.update({ where: { id: MINT }, data: { sourceUrl: mintUrl } });
    await addToShelf(actor, PEACH, 'plan', at(1));
    await setStop(actor, 'tobacco-berry-oasis', true, undefined, at(1));
    await markEmpty(actor, 'tobacco-citrus-breeze', at(10));
    await addReceipt(actor, 'tobacco-desert-honey', { grams: 100 }, at(1));
    const shelf = await getShelf(at(12));

    const stocked = seedTobaccos.filter((item) => item.inStock).length;
    assert.equal(shelf.rows.length, stocked + 1);
    assert.equal(shelf.counters.all, stocked + 1);
    assert.deepEqual(
      [shelf.counters.out, shelf.counters.stop, shelf.counters.plan],
      [1, 1, 1],
    );
    assert.equal(
      shelf.counters.ok + shelf.counters.ending + shelf.counters.check,
      stocked - 2,
    );
    assert.equal(shelf.settings.bowlGrams, 18);

    const mint = shelf.rows.find((row) => row.tobacco.id === MINT)!;
    assert.equal(mint.mixCount, 5);
    assert.deepEqual(
      mint.lastReceipt && [mint.lastReceipt.label, mint.lastReceipt.kind, mint.lastReceipt.grams],
      ['Стартовый приход', 'start', 200],
    );
    assert.deepEqual(mint.tobacco.flavors, seedTobaccos.find((item) => item.id === MINT)!.flavors);
    assert.equal(mint.tobacco.sourceUrl, mintUrl);
    assert.equal(mint.fullGrams, 200);
    // У Ателье Reserve есть свой расход (Citrus Breeze, 20 г/день), остальные бренда получают медиану.
    assert.equal(mint.rateKind, 'brand');
    assert.equal(mint.rate, 20);
    assert.equal(mint.leftGrams, 0);
    assert.equal(mint.status, 'check');

    const honey = shelf.rows.find((row) => row.tobacco.id === 'tobacco-desert-honey')!;
    assert.equal(honey.lastReceipt?.label, 'Вручную');
    assert.equal(honey.tobacco.sourceUrl, null);

    const inStockRows = shelf.rows.filter((row) => row.status !== 'out' && row.status !== 'plan' && row.rate);
    const grams = inStockRows.reduce((total, row) => total + row.rate!, 0);
    assert.equal(Math.round(shelf.today.grams), Math.round(grams));
    assert.equal(Math.round(shelf.today.bowls * 18), Math.round(grams));
    assert.ok(shelf.totals.kg >= 0);
  });

  test('карточка: история с расходом отрезков, недели, деньги, миксы', async () => {
    await addReceipt(actor, MINT, { grams: 250, priceKop: 200_000 }, at(1));
    await addCount(actor, MINT, { grams: 250 }, at(5));
    await markEmpty(actor, MINT, at(10));
    const card = await getShelfItem(MINT, at(11));

    assert.deepEqual(card.history.map((entry) => [entry.kind, entry.grams]), [
      ['count', 0],
      ['count', 250],
      ['receipt', 250],
      ['receipt', 200],
    ]);
    const [empty, count, bought, startReceipt] = card.history;
    assert.deepEqual(empty.usage && [empty.usage.from, empty.usage.gramsPerDay], [at(5).toISOString(), 50]);
    assert.deepEqual(count.usage && [count.usage.from, count.usage.gramsPerDay], [start.toISOString(), 40]);
    assert.equal(bought.priceKop, 200_000);
    assert.equal(bought.delivery, null);
    assert.equal(startReceipt.delivery?.kind, 'start');
    assert.equal(card.weekly.length, 5);
    assert.equal(card.gramPriceKop, 800);
    assert.equal(card.bowlCostKop, 800 * 18);
    assert.deepEqual(card.mixes.map((mix) => mix.name).sort(), [
      'Персиковый мираж',
      'Травяной сад',
      'Цитрусовый караван',
      'Яблочная волна',
      'Ягодный рассвет',
    ]);
    await assert.rejects(getShelfItem(PEACH, at(1)), ShelfNotFoundError);
  });

  test('отметка выше расчёта в расход не идёт и помечена в истории', async () => {
    await addCount(actor, MINT, { grams: 100 }, at(5));
    await addCount(actor, MINT, { grams: 180 }, at(8));
    const card = await getShelfItem(MINT, at(9));
    assert.deepEqual(card.history.slice(0, 2).map((entry) => [entry.grams, entry.excluded]), [[180, true], [100, false]]);
    assert.equal(card.rate, 20);
  });
});

test.describe('аудит', () => {
  test('мутации полки пишут события аудита', async () => {
    const { entryId } = await markEmpty(actor, MINT, at(1));
    await deleteEntry(actor, entryId, at(1));
    await setStop(actor, MINT, true, undefined, at(1));

    const events = await prisma.auditEvent.findMany({
      where: { entityType: { in: ['shelf', 'stock'] } },
      orderBy: { createdAt: 'asc' },
    });
    assert.deepEqual(
      events.map((event) => [event.entityType, event.action, event.actorLogin]),
      [
        ['stock', 'mark-empty', 'admin'],
        ['stock', 'delete-entry', 'admin'],
        ['shelf', 'stop', 'admin'],
      ],
    );
    assert.equal(events[0].entityId, entryId);
  });
});
