import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { tobaccos as seedTobaccos } from './catalog';
import {
  addMark,
  addPack,
  addToShelf,
  getSettings,
  getShelf,
  getShelfItem,
  markEmpty,
  openAnother,
  removeFromShelf,
  setStop,
  ShelfConflictError,
  ShelfNotFoundError,
  ShelfValidationError,
  syncAvailability,
  undoEmpty,
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

const packsOf = (tobaccoId: string) =>
  prisma.pack.findMany({ where: { shelfItem: { tobaccoId } }, orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }] });

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.pack.findFirstOrThrow({ orderBy: { receivedAt: 'asc' } })).receivedAt;
});

test.describe('старт полки из наличия', () => {
  test('каждому табаку в наличии — запись на полке и одна банка стартового прихода', async () => {
    const stocked = seedTobaccos.filter((item) => item.inStock);
    const items = await prisma.shelfItem.findMany({ include: { packs: { include: { delivery: true } } } });

    assert.equal(items.length, stocked.length);
    assert.equal(items.some((item) => item.tobaccoId === PEACH), false);
    for (const item of items) {
      assert.equal(item.status, 'active');
      assert.equal(item.packs.length, 1);
      assert.equal(item.packs[0].weight, item.packWeight);
      assert.equal(item.packs[0].openedAt, null);
      assert.equal(item.packs[0].delivery?.kind, 'start');
    }
    assert.deepEqual(await getSettings(), { bowlGrams: 18, leadDays: 7 });
  });
});

test.describe('syncAvailability', () => {
  test('наличие = активен на полке, не стоп, есть банка в запасе или в работе, не архив', async () => {
    const ids = ['tobacco-citrus-breeze', 'tobacco-berry-oasis', 'tobacco-desert-honey', 'tobacco-spice-route', MINT, PEACH];
    await prisma.shelfItem.update({ where: { tobaccoId: 'tobacco-berry-oasis' }, data: { stopped: true } });
    await prisma.shelfItem.update({ where: { tobaccoId: 'tobacco-desert-honey' }, data: { status: 'plan' } });
    await prisma.tobacco.update({ where: { id: 'tobacco-spice-route' }, data: { archived: true } });
    await prisma.pack.updateMany({ where: { shelfItem: { tobaccoId: MINT } }, data: { emptiedAt: new Date() } });
    await prisma.tobacco.update({ where: { id: PEACH }, data: { inStock: true } });

    await prisma.$transaction((tx) => syncAvailability(tx, ids));

    assert.deepEqual(
      await Promise.all(ids.map(inStock)),
      [true, false, false, false, false, false],
    );
  });
});

test.describe('«Закончилась» и отмена', () => {
  test('последняя банка закончилась — гость не видит табак, отмена возвращает', async () => {
    const result = await markEmpty(actor, MINT, at(10));

    assert.equal(result.item.status, 'out');
    assert.equal(result.item.guestAvailable, false);
    assert.equal(await inStock(MINT), false);
    const [pack] = await packsOf(MINT);
    assert.equal(result.packId, pack.id);
    assert.deepEqual(pack.emptiedAt, at(10));

    const undone = await undoEmpty(actor, result.packId, at(10));
    assert.equal(undone.guestAvailable, true);
    assert.equal(await inStock(MINT), true);
    assert.equal((await packsOf(MINT))[0].emptiedAt, null);
  });

  test('закончилась одна из двух — в работу уходит следующая, расход по пустой', async () => {
    await addPack(actor, MINT, { priceKop: 150_000 }, at(1));
    const result = await markEmpty(actor, MINT, at(10));

    assert.equal(result.item.status, 'ok');
    assert.equal(result.item.last, true);
    assert.equal(result.item.openPacks.length, 1);
    assert.equal(result.item.sealedCount, 0);
    assert.equal(result.item.rateKind, 'own');
    assert.equal(Math.round(result.item.rate!), 20);
    assert.equal(await inStock(MINT), true);
  });

  test('нет открытой банки — ошибка домена', async () => {
    await markEmpty(actor, MINT, at(1));
    await assert.rejects(markEmpty(actor, MINT, at(2)), ShelfConflictError);
    await assert.rejects(markEmpty(actor, 'tobacco-nope', at(2)), ShelfNotFoundError);
    await assert.rejects(markEmpty(actor, PEACH, at(2)), ShelfNotFoundError);
  });

  test('отменить можно только пустую банку', async () => {
    const [pack] = await packsOf(MINT);
    await assert.rejects(undoEmpty(actor, pack.id, at(1)), ShelfConflictError);
    await assert.rejects(undoEmpty(actor, 'pack-nope', at(1)), ShelfNotFoundError);
  });
});

test.describe('отметки и вскрытие', () => {
  test('отметка ложится на текущую открытую банку, доля — только из шкалы', async () => {
    await addPack(actor, MINT, {}, at(1));
    const row = await addMark(actor, MINT, 0.5, at(4));

    const [first, second] = await prisma.pack.findMany({
      where: { shelfItem: { tobaccoId: MINT } },
      include: { marks: true },
      orderBy: { receivedAt: 'asc' },
    });
    assert.deepEqual(first.marks.map((mark) => [mark.fraction, mark.at, mark.actorLogin]), [[0.5, at(4), 'admin']]);
    assert.equal(second.marks.length, 0);
    assert.equal(row.openPacks[0].fraction, 0.5);

    await addMark(actor, MINT, 1 / 3, at(5));
    await assert.rejects(addMark(actor, MINT, 0.6, at(5)), ShelfValidationError);
  });

  test('«вскрыть ещё одну» открывает старейшую из запаса', async () => {
    await addPack(actor, MINT, {}, at(1));
    await addPack(actor, MINT, {}, at(2));
    const row = await openAnother(actor, MINT, at(3));

    assert.equal(row.openPacks.length, 2);
    assert.equal(row.sealedCount, 1);
    const packs = await packsOf(MINT);
    assert.deepEqual(packs.map((pack) => pack.openedAt), [null, at(3), null]);

    await openAnother(actor, MINT, at(3));
    await assert.rejects(openAnother(actor, MINT, at(3)), ShelfConflictError);
  });
});

test.describe('банки вручную и списание', () => {
  test('ручная банка — фасовка по умолчанию, план оживает и попадает к гостю', async () => {
    await addToShelf(actor, PEACH, 'plan', at(1));
    assert.equal(await inStock(PEACH), false);

    const row = await addPack(actor, PEACH, {}, at(2));
    const [pack] = await packsOf(PEACH);
    assert.equal(pack.weight, row.packWeight);
    assert.equal(pack.deliveryId, null);
    assert.equal(row.shelfStatus, 'active');
    assert.equal(await inStock(PEACH), true);

    await assert.rejects(addPack(actor, PEACH, { weight: 0 }, at(2)), ShelfValidationError);
    await assert.rejects(addPack(actor, PEACH, { priceKop: -1 }, at(2)), ShelfValidationError);
  });

  test('списание единственной банки снимает наличие, повторно не списать', async () => {
    const [pack] = await packsOf(MINT);
    const row = await writeOff(actor, pack.id, 'брак', at(3));

    assert.equal(row.status, 'out');
    assert.equal(await inStock(MINT), false);
    const stored = await prisma.pack.findUniqueOrThrow({ where: { id: pack.id } });
    assert.deepEqual([stored.writtenOffAt, stored.writeOffReason], [at(3), 'брак']);
    await assert.rejects(writeOff(actor, pack.id, 'брак', at(4)), ShelfConflictError);
    await assert.rejects(writeOff(actor, pack.id, '  ', at(4)), ShelfValidationError);
  });
});

test.describe('стоп, настройки строки, полка и план', () => {
  test('стоп для гостей снимает наличие без изменения банок', async () => {
    const stopped = await setStop(actor, MINT, true, 'горчит', at(1));
    assert.deepEqual([stopped.status, stopped.stopped, stopped.stopNote], ['stop', true, 'горчит']);
    assert.equal(await inStock(MINT), false);

    const resumed = await setStop(actor, MINT, false, undefined, at(1));
    assert.deepEqual([resumed.status, resumed.stopped, resumed.stopNote], ['ok', false, null]);
    assert.equal(await inStock(MINT), true);
  });

  test('настройки строки: держим постоянно, фасовка, заметка', async () => {
    const row = await updateShelfItem(actor, MINT, { keepStocked: false, packWeight: 25, note: ' у бара ' }, at(1));
    assert.deepEqual([row.keepStocked, row.packWeight, row.note], [false, 25, 'у бара']);
    await assert.rejects(updateShelfItem(actor, MINT, { packWeight: 0 }, at(1)), ShelfValidationError);
  });

  test('убрать с полки — наличие пропадает, история остаётся; вернуть — оживает', async () => {
    const removed = await removeFromShelf(actor, MINT, at(1));
    assert.equal(removed.shelfStatus, 'dropped');
    assert.equal(await inStock(MINT), false);
    assert.equal((await packsOf(MINT)).length, 1);
    assert.equal((await getShelf(at(1))).rows.some((row) => row.tobacco.id === MINT), false);

    const back = await addToShelf(actor, MINT, 'active', at(2));
    assert.equal(back.shelfStatus, 'active');
    assert.equal(await inStock(MINT), true);
  });

  test('план не понижает то, что уже держим', async () => {
    const row = await addToShelf(actor, MINT, 'plan', at(1));
    assert.equal(row.shelfStatus, 'active');
  });

  test('табак в плане без банок — статус «в плане», к гостю не попадает', async () => {
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
    await addPack(actor, 'tobacco-desert-honey', {}, at(1));
    const shelf = await getShelf(at(12));

    const stocked = seedTobaccos.filter((item) => item.inStock).length;
    assert.equal(shelf.rows.length, stocked + 1);
    assert.deepEqual(shelf.counters, {
      all: stocked + 1,
      ok: stocked - 2,
      // «Последняя банка» — признак, а не статус: стоп с одной банкой тоже последний.
      last: stocked - 2,
      ending: 0,
      out: 1,
      stop: 1,
      plan: 1,
    });
    // Пустая у Citrus Breeze ушла, ручная у Desert Honey пришла.
    assert.equal(shelf.totals.packs, stocked);
    assert.equal(shelf.settings.bowlGrams, 18);

    const mint = shelf.rows.find((row) => row.tobacco.id === MINT)!;
    assert.equal(mint.mixCount, 5);
    assert.deepEqual(mint.lastReceipt && [mint.lastReceipt.label, mint.lastReceipt.kind], ['Стартовый приход', 'start']);
    assert.deepEqual(mint.tobacco.flavors, seedTobaccos.find((item) => item.id === MINT)!.flavors);
    assert.equal(mint.tobacco.sourceUrl, mintUrl);
    assert.equal(mint.openPacks.length, 1);
    assert.equal(mint.sealedCount, 0);
    // У Ателье Reserve есть свой расход (Citrus Breeze), остальные бренда получают медиану.
    assert.equal(mint.rateKind, 'brand');
    assert.equal(Math.round(mint.rate!), 20);
    assert.ok(mint.openPacks[0].fraction < 1);

    const honey = shelf.rows.find((row) => row.tobacco.id === 'tobacco-desert-honey')!;
    assert.equal(honey.lastReceipt?.label, 'Вручную');
    assert.equal(honey.tobacco.sourceUrl, null);

    const openWithRate = shelf.rows.filter((row) => row.openPacks.length && row.rate);
    const grams = openWithRate.reduce((total, row) => total + row.rate!, 0);
    assert.equal(Math.round(shelf.today.grams), Math.round(grams));
    assert.equal(Math.round(shelf.today.bowls * 18), Math.round(grams));
  });

  test('карточка: история банок, деньги, миксы', async () => {
    await addPack(actor, MINT, { priceKop: 200_000, weight: 250 }, at(1));
    await addMark(actor, MINT, 0.5, at(5));
    await markEmpty(actor, MINT, at(10));
    const card = await getShelfItem(MINT, at(11));

    assert.equal(card.packs.length, 2);
    const [startPack, bought] = card.packs;
    assert.equal(startPack.state, 'empty');
    assert.equal(startPack.delivery?.kind, 'start');
    assert.equal(startPack.marks.length, 1);
    assert.equal(Math.round(startPack.usage!.gramsPerDay), 20);
    assert.equal(bought.state, 'open');
    assert.equal(bought.priceKop, 200_000);
    assert.equal(bought.delivery, null);
    assert.equal(bought.usage, null);
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
});

test.describe('аудит', () => {
  test('мутации полки пишут события аудита', async () => {
    const { packId } = await markEmpty(actor, MINT, at(1));
    await undoEmpty(actor, packId, at(1));
    await setStop(actor, MINT, true, undefined, at(1));

    const events = await prisma.auditEvent.findMany({
      where: { entityType: { in: ['shelf', 'pack'] } },
      orderBy: { createdAt: 'asc' },
    });
    assert.deepEqual(
      events.map((event) => [event.entityType, event.action, event.actorLogin]),
      [
        ['pack', 'mark-empty', 'admin'],
        ['pack', 'undo-empty', 'admin'],
        ['shelf', 'stop', 'admin'],
      ],
    );
    assert.equal(events[0].entityId, packId);
  });
});
