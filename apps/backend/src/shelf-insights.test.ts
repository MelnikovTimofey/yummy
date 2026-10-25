import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { addCount, addReceipt, addToShelf, getShelf, getShelfItem, markEmpty, removeFromShelf, updateSettings, writeOff } from './shelf';
import { getPurchase, getReorder, getShelfDashboard, orderText, weekPeriods } from './shelf-insights';
import { resetAppState } from './state';

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const BERRY = 'tobacco-berry-oasis';
const HERBAL = 'tobacco-herbal-dawn';
const APPLE = 'tobacco-apple-fizz';
const PEACH = 'tobacco-peach-silk';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.stockEntry.findFirstOrThrow({ orderBy: { at: 'asc' } })).at;
});

const supplier = (name: string) => prisma.supplier.create({ data: { name } });

// Принятая поставка с одним приходом табака.
const receive = async (
  tobaccoId: string,
  input: {
    supplierId?: string | null;
    kind?: 'invoice' | 'manual';
    priceKop?: number | null;
    at: Date;
    entryAt?: Date;
    grams?: number;
    number?: string;
  },
) => {
  const delivery = await prisma.delivery.create({
    data: {
      supplierId: input.supplierId ?? null,
      kind: input.kind ?? 'invoice',
      status: 'received',
      number: input.number ?? null,
      invoiceDate: input.kind === 'manual' ? null : input.at,
      receivedAt: input.at,
    },
  });
  const item = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId } });
  await prisma.stockEntry.create({
    data: {
      shelfItemId: item.id,
      kind: 'receipt',
      grams: input.grams ?? 200,
      priceKop: input.priceKop ?? null,
      at: input.entryAt ?? input.at,
      deliveryId: delivery.id,
    },
  });
  return delivery;
};

const keepOnly = (tobaccoIds: string[]) =>
  prisma.shelfItem.updateMany({ where: { tobaccoId: { notIn: tobaccoIds } }, data: { keepStocked: false } });

test.describe('текст заказа', () => {
  test('строка на табак: бренд, линейка и вкус, объём мастер впишет сам', () => {
    assert.equal(
      orderText([
        { tobacco: { manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' } },
        { tobacco: { manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' } },
      ]),
      'Добрый день! Заказ:\nBlack Burn Cane Mint\nDARKSIDE Core Supernova\nСпасибо!',
    );
  });
});

test.describe('недели расхода', () => {
  const iso = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];

  test('пять недель с понедельника, текущая — до сейчас', () => {
    const now = new Date(2026, 1, 12, 15);
    const weeks = weekPeriods(now, 5);
    assert.equal(weeks.length, 5);
    assert.deepEqual(iso(weeks[0].from), [2026, 1, 12, 0, 0]);
    assert.deepEqual(iso(weeks[0].to), [2026, 1, 19, 0, 0]);
    assert.equal(weeks[0].partial, false);
    assert.deepEqual(iso(weeks[3].to), [2026, 2, 9, 0, 0]);
    assert.deepEqual(iso(weeks[4].from), [2026, 2, 9, 0, 0]);
    assert.equal(weeks[4].to, now);
    assert.equal(weeks[4].partial, true);
  });

  test('воскресенье — ещё та же неделя, понедельник — уже новая', () => {
    assert.deepEqual(iso(weekPeriods(new Date(2026, 1, 15, 23), 1)[0].from), [2026, 2, 9, 0, 0]);
    assert.deepEqual(iso(weekPeriods(new Date(2026, 1, 16, 0, 30), 1)[0].from), [2026, 2, 16, 0, 0]);
  });
});

test.describe('к заказу', () => {
  const scenario = async () => {
    const kaspiy = await supplier('Каспий Опт');
    const yug = await supplier('Южный табак');
    await keepOnly([MINT, BERRY, HERBAL, APPLE]);

    // Mint: стартовые 200 г и 200 г от Каспия, к 8-му дню закончился.
    await receive(MINT, { supplierId: kaspiy.id, priceKop: 155_000, at: at(1), number: 'K-1' });
    await addCount(actor, MINT, { grams: 200 }, at(5));
    await markEmpty(actor, MINT, at(8));
    // Berry: 200 г от Каспия, расход ≈ 33 г/день, хватит на 4 дня.
    await receive(BERRY, { supplierId: kaspiy.id, priceKop: 160_000, at: at(2), number: 'K-2' });
    await addCount(actor, BERRY, { grams: 200 }, at(6));
    // Apple: ручная поставка Южного, потом приход без поставки, списанный целиком;
    // хватит на 6 дней.
    await receive(APPLE, { supplierId: yug.id, kind: 'manual', priceKop: 180_000, at: at(1) });
    await addReceipt(actor, APPLE, { grams: 200 }, at(2));
    await writeOff(actor, APPLE, { grams: 200, reason: 'Рассыпали' }, at(2));
    await addCount(actor, APPLE, { grams: 200 }, at(7));
    // Herbal: только стартовые — закончились; Peach — в плане.
    await markEmpty(actor, HERBAL, at(2));
    await addToShelf(actor, PEACH, 'plan', at(3));
    // Свежий счёт Каспия ещё черновик — он и «последний».
    await prisma.delivery.create({
      data: { supplierId: kaspiy.id, kind: 'invoice', status: 'draft', number: 'K-3', invoiceDate: at(7) },
    });
    return { kaspiy, yug };
  };

  test('группы по последнему поставщику, прогноз, расход в месяц, цена грамма и текст', async () => {
    const { kaspiy, yug } = await scenario();
    const now = at(8);
    const reorder = await getReorder(now);
    const rows = new Map((await getShelf(now)).rows.map((row) => [row.tobacco.id, row]));

    assert.deepEqual(reorder.settings, { bowlGrams: 18, leadDays: 7, budgetKop: null });
    // Поставки 1-го и 2-го дня — два дня из трёх нужных: интервала нет, горизонт — срок поставки.
    assert.deepEqual(reorder.interval, { days: null, deliveries: 2 });
    assert.deepEqual(reorder.horizon, { days: 7, until: new Date(now.getTime() + 7 * DAY).toISOString() });
    const bySupplier = new Map(reorder.groups.map((group) => [group.supplier?.id ?? null, group]));
    assert.equal(reorder.groups.length, 3);
    // С поставщиком — по срочности первой строки; «Поставщик не выбран» — всегда последней,
    // хотя закончившийся Herbal и Peach в плане срочнее Apple.
    assert.deepEqual(reorder.groups.map((group) => group.supplier?.id ?? null), [kaspiy.id, yug.id, null]);

    const k = bySupplier.get(kaspiy.id)!;
    assert.deepEqual(k.supplier, { id: kaspiy.id, name: 'Каспий Опт' });
    assert.deepEqual(k.lastInvoice, { number: 'K-3', date: at(7).toISOString().slice(0, 10), status: 'draft' });
    assert.deepEqual(k.items.map((item) => [item.tobacco.id, item.status, item.gramPriceKop]), [
      [MINT, 'out', 775],
      [BERRY, 'ending', 800],
    ]);
    const mint = k.items[0];
    assert.equal(mint.rate, 50);
    assert.equal(mint.monthGrams, 1500);
    assert.equal(mint.byInterval, false);
    assert.equal(mint.leftGrams, 0);
    assert.equal(mint.rateKind, 'own');
    assert.equal(mint.daysLeft, null);
    const berry = k.items[1];
    assert.equal(Math.round(berry.daysLeft!), 4);
    assert.equal(berry.endsAt, rows.get(BERRY)!.endsAt);
    // Один прогноз: расход в месяц тот же, что на полке.
    assert.equal(berry.monthGrams, rows.get(BERRY)!.monthGrams);
    assert.equal(berry.leftGrams, rows.get(BERRY)!.leftGrams);
    assert.equal('sumKop' in k, false);
    assert.equal('quantityGrams' in berry, false);

    const y = bySupplier.get(yug.id)!;
    assert.equal(y.lastInvoice, null);
    assert.deepEqual(y.items.map((item) => [item.tobacco.id, item.status, item.gramPriceKop]), [
      [APPLE, 'ending', 900],
    ]);

    const none = bySupplier.get(null)!;
    assert.equal(none.supplier, null);
    assert.equal(none.lastInvoice, null);
    assert.deepEqual(none.items.map((item) => [item.tobacco.id, item.status, item.gramPriceKop]).sort(), [
      [HERBAL, 'out', null],
      [PEACH, 'plan', null],
    ]);
    // Без своего расхода у Peach — медиана бренда.
    const peach = none.items.find((item) => item.tobacco.id === PEACH)!;
    assert.equal(peach.rateKind, 'brand');
    assert.equal(peach.monthGrams, peach.rate! * 30);

    const name = (id: string) => `${rows.get(id)!.tobacco.manufacturer} ${rows.get(id)!.tobacco.name}`;
    const text = reorder.text.find((entry) => entry.supplierId === kaspiy.id)!.text;
    assert.equal(text, ['Добрый день! Заказ:', name(MINT), name(BERRY), 'Спасибо!'].join('\n'));
    assert.deepEqual(reorder.text.map((entry) => entry.supplierId), reorder.groups.map((group) => group.supplier?.id ?? null));
  });

  test('с интервалом поставок — что закончится до следующей поставки', async () => {
    await keepOnly([MINT]);
    // Mint: 200 стартовых, на 5-й день 140 г — расход 12 г/день, к 6-му дню хватит на ≈ 10,7 дня.
    await addCount(actor, MINT, { grams: 140 }, at(5));
    for (const day of [-20, -10]) await receive(HERBAL, { at: at(day), grams: 50 });
    assert.deepEqual((await getReorder(at(6))).groups, []);

    await receive(HERBAL, { at: at(0), grams: 50 });
    const reorder = await getReorder(at(6));
    assert.deepEqual(reorder.interval, { days: 10, deliveries: 3 });
    assert.equal(reorder.horizon.days, 17);
    const [mint] = reorder.groups[0].items;
    assert.deepEqual([mint.tobacco.id, mint.status, mint.byInterval], [MINT, 'ending', true]);
  });

  test('пустая полка — пустой список', async () => {
    await keepOnly([]);
    const reorder = await getReorder(at(1));
    assert.deepEqual(reorder.groups, []);
    assert.deepEqual(reorder.text, []);
  });
});

test.describe('дашборд полки', () => {
  const berryRunning = async (priceKop?: number) => {
    await addReceipt(actor, BERRY, { grams: 200, priceKop }, at(1));
    await addCount(actor, BERRY, { grams: 200 }, at(6));
  };

  test('прогноз на сегодня без поправки, пока нет 4 недель «Покурить»', async () => {
    await berryRunning();
    const now = at(8);
    const dashboard = await getShelfDashboard(now);
    const shelf = await getShelf(now);
    assert.equal(dashboard.today.weekdayFactor, null);
    assert.equal(dashboard.today.weekday, ((now.getDay() + 6) % 7) + 1);
    assert.equal(dashboard.today.grams, shelf.today.grams);
    assert.equal(dashboard.today.bowls, shelf.today.bowls);
  });

  test('поправка на день недели по «Покурить» гостей и из «Намиксуй»', async () => {
    await berryRunning();
    const now = at(8);
    const local = (daysBack: number, hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, hour);
    const smoke: Date[] = [local(30, 12)];
    const custom: Date[] = [];
    for (let back = 1; back <= 28; back += 1) {
      smoke.push(local(back, 12));
      custom.push(local(back, 20));
      if (back % 7 === 0) smoke.push(local(back, 21), local(back, 22));
    }
    await prisma.smokeCtaEvent.createMany({ data: smoke.map((createdAt) => ({ mixId: 'mix-citrus-scout', mixName: 'Citrus Scout', createdAt })) });
    await prisma.customMixSmokeEvent.createMany({
      data: custom.map((createdAt) => ({ components: [], signature: 's', name: 'Свой', harmony: 50, createdAt })),
    });

    const dashboard = await getShelfDashboard(now);
    const base = (await getShelf(now)).today.grams;
    assert.ok(base > 0);
    const factor = 4 / (64 / 28);
    assert.ok(Math.abs(dashboard.today.weekdayFactor! - factor) < 1e-9);
    assert.ok(Math.abs(dashboard.today.grams - base * factor) < 1e-9);
    assert.ok(Math.abs(dashboard.today.bowls - (base * factor) / 18) < 1e-9);
  });

  test('заканчивается: сначала закончившиеся, потом по дате', async () => {
    await berryRunning(160_000);
    await markEmpty(actor, MINT, at(5));
    // Закончившийся, который не держим постоянно, — не в списке.
    await markEmpty(actor, HERBAL, at(5));
    await prisma.shelfItem.update({ where: { tobaccoId: HERBAL }, data: { keepStocked: false } });
    const dashboard = await getShelfDashboard(at(8));
    assert.deepEqual(dashboard.ending.map((item) => [item.tobacco.id, item.status]), [
      [MINT, 'out'],
      [BERRY, 'ending'],
    ]);
    assert.equal(dashboard.ending[0].daysLeft, null);
    assert.equal(Math.round(dashboard.ending[1].daysLeft!), 4);
    assert.equal(typeof dashboard.ending[1].endsAt, 'string');
    assert.equal(dashboard.ending[1].tobacco.manufacturer, 'Ателье Reserve');
  });

  test('заканчивается — не больше восьми', async () => {
    const stocked = await prisma.shelfItem.findMany({ select: { tobaccoId: true } });
    assert.ok(stocked.length > 8);
    for (const item of stocked) await markEmpty(actor, item.tobaccoId, at(1));
    const dashboard = await getShelfDashboard(at(2));
    assert.equal(dashboard.ending.length, 8);
    assert.ok(dashboard.ending.every((item) => item.status === 'out'));
  });

  test('деньги: траты месяца по поставщикам, чаша и табак на полке', async () => {
    const now = at(8);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inMonth = new Date((Math.max(monthStart.getTime(), start.getTime() + 1000) + now.getTime()) / 2);
    const kaspiy = await supplier('Каспий Опт');
    const yug = await supplier('Южный табак');
    await receive(MINT, { supplierId: kaspiy.id, priceKop: 310_000, at: inMonth, grams: 400 });
    await receive(APPLE, { supplierId: yug.id, kind: 'manual', priceKop: 180_000, at: inMonth });
    await receive(HERBAL, { supplierId: yug.id, kind: 'manual', at: inMonth });
    // Поставка прошлого месяца: в траты не идёт, хотя приход записан в этом.
    await receive(HERBAL, { supplierId: kaspiy.id, priceKop: 999_000, at: new Date(monthStart.getTime() - DAY), entryAt: inMonth });
    await prisma.delivery.create({ data: { supplierId: kaspiy.id, kind: 'invoice', status: 'draft', totalKop: 777_000 } });
    await berryRunning(160_000);

    const dashboard = await getShelfDashboard(now);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    assert.deepEqual(dashboard.spend, {
      month,
      bySupplier: [
        { supplier: { id: kaspiy.id, name: 'Каспий Опт' }, sumKop: 310_000 },
        { supplier: { id: yug.id, name: 'Южный табак' }, sumKop: 180_000 },
      ],
      totalKop: 490_000,
    });

    // Цена грамма — по последнему приходу с ценой у каждого табака в наличии.
    const cards = await Promise.all([MINT, APPLE, HERBAL, BERRY].map((id) => getShelfItem(id, now)));
    const prices = cards.map((card) => card.gramPriceKop!);
    assert.deepEqual(prices, [775, 900, 4995, 800]);
    assert.equal(dashboard.bowlCostKop, Math.round((18 * (775 + 900 + 4995 + 800)) / 4));
    const value = cards.reduce((total, card) => total + card.leftGrams! * card.gramPriceKop!, 0);
    // Остаток в карточке округлён до грамма.
    assert.ok(Math.abs(dashboard.stockValueKop - value) <= 4 * 4995, `${dashboard.stockValueKop} ≠ ${value}`);
  });

  test('бюджет: база в месяц по «держим постоянно», без цены — в счёт неизвестных', async () => {
    await keepOnly([MINT, BERRY, APPLE]);
    await berryRunning(160_000);
    const now = at(8);
    const berry = await getShelfItem(BERRY, now);
    const base = Math.round(berry.monthGrams! * berry.gramPriceKop!);

    const without = (await getShelfDashboard(now)).budget;
    assert.deepEqual(without, { budgetKop: null, baseKop: base, baseCount: 3, unknownCount: 2, leftKop: null });

    await updateSettings(actor, { budgetKop: 1_500_000 });
    const withBudget = (await getShelfDashboard(now)).budget;
    assert.deepEqual(withBudget, { budgetKop: 1_500_000, baseKop: base, baseCount: 3, unknownCount: 2, leftKop: 1_500_000 - base });
  });

  test('без цен нет себестоимости чаши, табак на полке — ноль', async () => {
    const dashboard = await getShelfDashboard(at(1));
    assert.equal(dashboard.bowlCostKop, null);
    assert.equal(dashboard.stockValueKop, 0);
    assert.deepEqual(dashboard.spend.bySupplier, []);
    assert.equal(dashboard.spend.totalKop, 0);
  });

  test('расход по неделям: отрезок через границу недель, текущая неделя частичная, убранные табаки тоже', async () => {
    // Четверг, полдень недели дня 8: иначе в зависимости от дня прогона отрезок в текущей
    // неделе бывает короче MIN_SEGMENT_MS и не засчитывается (#416).
    const now = new Date(weekPeriods(at(8), 1)[0].from.getTime() + 3.5 * DAY);
    const weeks = weekPeriods(now, 5);
    await addToShelf(actor, PEACH, 'plan', at(1));
    const peach = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: PEACH } });
    const entry = (kind: string, grams: number, time: number) =>
      prisma.stockEntry.create({ data: { shelfItemId: peach.id, kind, grams, at: new Date(time) } });
    const boundary = weeks[2].from.getTime();
    await entry('receipt', 200, boundary - 2 * DAY);
    await entry('count', 0, boundary + 2 * DAY);
    const current = weeks[4].from.getTime();
    await entry('receipt', 200, current);
    await entry('count', 0, (current + now.getTime()) / 2);
    await removeFromShelf(actor, PEACH, at(1));

    const { weekly } = await getShelfDashboard(now);
    const ymd = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    assert.deepEqual(
      weekly.map((week) => [week.from, week.to, week.partial]),
      weeks.map((week, index) => [
        ymd(week.from),
        ymd(index === 4 ? now : new Date(week.to.getTime() - DAY / 2)),
        index === 4,
      ]),
    );
    const grams = weekly.map((week) => week.grams);
    assert.equal(grams[0], 0);
    assert.ok(Math.abs(grams[1] - 100) < 3, `${grams[1]}`);
    assert.ok(Math.abs(grams[2] - 100) < 3, `${grams[2]}`);
    assert.equal(grams[3], 0);
    assert.ok(Math.abs(grams[4] - 200) < 1e-9);
  });
});

test.describe('закупка', () => {
  const near = (actual: number | null | undefined, expected: number, delta = 1e-6) =>
    assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < delta, `${actual} ≠ ${expected}`);

  // Сид: все табаки в наличии пришли стартовым приходом 200 г в день 0.
  const scenario = async () => {
    // Mint — 10 г/день.
    await addCount(actor, MINT, { grams: 100 }, at(10));
    // Berry лежит: 20 г за 25 дней, цены нет (только стартовый приход).
    await addCount(actor, BERRY, { grams: 180 }, at(25));
    // Apple лежит: приход по счёту в день 1, 10 г за 19 дней, грамм — 8 ₽.
    await receive(APPLE, { priceKop: 160_000, at: at(1) });
    await addCount(actor, APPLE, { grams: 390 }, at(20));
    // Herbal: 100 г по счёту ушли за 2 дня, следующего прихода нет.
    await receive(HERBAL, { at: at(5), grams: 100 });
    await markEmpty(actor, HERBAL, at(7));
    // Peach — проба: 25 г впервые пришли в день 20 и ушли за 2 дня; не держим постоянно.
    await addToShelf(actor, PEACH, 'active', at(19));
    await prisma.shelfItem.update({ where: { tobaccoId: PEACH }, data: { keepStocked: false, trialVerdict: 'yes', trialMarkedAt: at(23) } });
    await receive(PEACH, { at: at(20), grams: 25 });
    await markEmpty(actor, PEACH, at(22));
    await receive(PEACH, { at: at(24), grams: 100 });

    // Приложение: «Ягодный рассвет» (berry + mint) — 2 раза, «Цитрусовый караван» (citrus + mint) — 1,
    // событие за окном 30 дней не считается; «Намиксуй» с персиком — 1.
    await prisma.smokeCtaEvent.createMany({
      data: [
        { mixId: 'mix-berry-dawn', mixName: 'Ягодный рассвет', mixProfiles: ['berry', 'minty'], createdAt: at(28) },
        { mixId: 'mix-berry-dawn', mixName: 'Ягодный рассвет', mixProfiles: ['berry', 'minty'], createdAt: at(29) },
        { mixId: 'mix-citrus-scout', mixName: 'Цитрусовый караван', mixProfiles: ['citrus'], createdAt: at(28) },
        { mixId: 'mix-citrus-scout', mixName: 'Цитрусовый караван', mixProfiles: ['citrus'], createdAt: at(-10) },
      ],
    });
    await prisma.customMixSmokeEvent.create({
      data: {
        components: [{ tobaccoId: PEACH, manufacturer: 'Ателье Reserve', name: 'Peach', proportion: 100 }],
        signature: PEACH,
        name: 'Персик',
        harmony: 70,
        createdAt: at(29),
      },
    });
    await prisma.mixRating.createMany({ data: [{ mixId: 'mix-berry-dawn', value: 5 }, { mixId: 'mix-berry-dawn', value: 4 }] });
  };

  test('бюджет — тот же, что на дашборде', async () => {
    await scenario();
    await updateSettings(actor, { budgetKop: 1_500_000 });
    const now = at(30);
    const [purchase, dashboard] = await Promise.all([getPurchase(now), getShelfDashboard(now)]);
    assert.deepEqual(purchase.budget, dashboard.budget);
    assert.deepEqual(purchase.spend, { month: dashboard.spend.month, totalKop: dashboard.spend.totalKop });
    assert.equal(purchase.since, start.toISOString());
  });

  test('база: расход, доля, приложение справочно и подсказки', async () => {
    await scenario();
    const { base } = await getPurchase(at(30));
    assert.equal(base.enough, true);
    const by = new Map(base.rows.map((row) => [row.tobacco.id, row]));
    const mint = by.get(MINT)!;
    near(mint.monthGrams, 300);
    assert.equal(mint.rateKind, 'own');
    assert.deepEqual(mint.app, { smokes: 3, rating: 4.5, ratings: 2 });
    assert.equal(by.get(BERRY)!.flag, 'idleBase');
    assert.equal(by.get(APPLE)!.flag, 'idleBase');
    near(by.get(APPLE)!.rubKop, 15 * 800, 1);
    assert.equal(by.get(PEACH)!.flag, 'notBase');
    assert.equal(by.get(PEACH)!.keepStocked, false);
    near(base.rows.reduce((total, row) => total + (row.share ?? 0), 0), 1);
    assert.deepEqual(base.counts, { notBase: 1, idleBase: 2 });
  });

  test('закончились быстро, пробы и «лежит»', async () => {
    await scenario();
    const view = await getPurchase(at(30));

    assert.equal(view.fast.enough, true);
    assert.deepEqual(view.fast.rows.map((row) => row.tobacco.id), [HERBAL, PEACH]);
    const [herbal, peach] = view.fast.rows;
    assert.deepEqual([herbal.receiptGrams, herbal.receivedAt, herbal.emptyAt, herbal.ongoing, herbal.next, herbal.status], [
      100, at(5).toISOString(), at(7).toISOString(), true, null, 'out',
    ]);
    near(herbal.goneDays, 2);
    near(herbal.emptyDays, 23);
    assert.deepEqual(peach.next, { grams: 100, at: at(24).toISOString() });

    // Стартовый приход — не проба.
    assert.deepEqual(view.trials.rows.map((row) => row.tobacco.id), [PEACH]);
    const [trial] = view.trials.rows;
    assert.equal(trial.receiptGrams, 25);
    assert.equal(trial.receivedAt, at(20).toISOString());
    near(trial.goneDays, 2);
    assert.ok(trial.speed !== null && trial.speed > 1);
    assert.deepEqual(trial.app, { smokes: 1, rating: null, ratings: 0 });
    assert.equal(trial.mixCount, 1);
    assert.deepEqual([trial.trialVerdict, trial.trialMarkedAt], ['yes', at(23).toISOString()]);

    assert.deepEqual(view.idle.rows.map((row) => row.tobacco.id), [APPLE, BERRY]);
    const [apple, berry] = view.idle.rows;
    near(apple.rate21, 0.5);
    assert.equal(apple.rubKop, apple.leftGrams * 800);
    assert.equal(berry.rubKop, null);
    assert.equal(view.idle.totalKop, apple.rubKop);
    assert.equal(view.idle.unknownPriceCount, 1);
    // Остальные табаки сида без отметок остатка — расход за 21 день неизвестен.
    assert.ok(view.idle.unmarkedCount > 0);
  });

  test('вкусы — по flavorProfiles, доли в сумме дают 1', async () => {
    await scenario();
    const { profiles } = await getPurchase(at(30));
    assert.equal(profiles.enough, true);
    assert.equal(profiles.appEvents, 4);
    assert.equal(profiles.appEnough, false);
    for (const column of ['spend', 'shelf', 'app'] as const) {
      near(profiles.rows.reduce((total, row) => total + row[column], 0), 1);
    }
    const herbal = profiles.rows.find((row) => row.key === 'floral_herbal')!;
    assert.equal(herbal.flag, 'more');
  });

  test('без отметок — мало данных во всех разделах', async () => {
    const view = await getPurchase(at(1));
    assert.equal(view.base.enough, false);
    assert.equal(view.fast.enough, false);
    assert.equal(view.trials.enough, false);
    assert.equal(view.idle.enough, false);
    assert.equal(view.profiles.enough, false);
    assert.ok(view.base.rows.every((row) => row.flag === null));
  });
});

test.describe('HTTP', () => {
  const login = async (app: ReturnType<typeof buildApp>) => {
    const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
    return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
  };

  test('без токена — 401', async () => {
    const app = buildApp();
    for (const url of ['/staff/shelf/reorder', '/staff/shelf/dashboard', '/staff/shelf/purchase']) {
      assert.equal((await app.inject({ method: 'GET', url })).statusCode, 401, url);
    }
  });

  test('формы ответов', async () => {
    const app = buildApp();
    const headers = await login(app);
    await markEmpty(actor, MINT, new Date());

    const reorder = await app.inject({ method: 'GET', url: '/staff/shelf/reorder', headers });
    assert.equal(reorder.statusCode, 200);
    const body = reorder.json();
    assert.deepEqual(Object.keys(body).sort(), ['groups', 'horizon', 'interval', 'settings', 'text']);
    const item = body.groups[0].items.find((entry: { tobacco: { id: string } }) => entry.tobacco.id === MINT);
    assert.deepEqual(Object.keys(item).sort(), [
      'byInterval', 'daysLeft', 'endsAt', 'gramPriceKop', 'leftGrams', 'monthGrams', 'rate', 'rateKind', 'status', 'tobacco',
    ]);
    assert.deepEqual(Object.keys(body.groups[0]).sort(), ['items', 'lastInvoice', 'supplier']);

    const dashboard = await app.inject({ method: 'GET', url: '/staff/shelf/dashboard', headers });
    assert.equal(dashboard.statusCode, 200);
    const view = dashboard.json();
    assert.deepEqual(Object.keys(view).sort(), ['bowlCostKop', 'budget', 'ending', 'spend', 'stockValueKop', 'today', 'weekly']);
    assert.deepEqual(Object.keys(view.today).sort(), ['bowls', 'grams', 'weekday', 'weekdayFactor']);
    assert.equal(view.weekly.length, 5);
    assert.equal(view.ending[0].tobacco.id, MINT);

    const purchase = await app.inject({ method: 'GET', url: '/staff/shelf/purchase', headers });
    assert.equal(purchase.statusCode, 200);
    const sections = purchase.json();
    assert.deepEqual(Object.keys(sections).sort(), ['base', 'budget', 'fast', 'idle', 'profiles', 'since', 'spend', 'trials']);
    assert.deepEqual(Object.keys(sections.base.rows[0]).sort(), [
      'app', 'flag', 'gramPriceKop', 'keepStocked', 'monthGrams', 'rateKind', 'rubKop', 'share', 'tobacco',
    ]);
  });
});
