import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { addPack, addToShelf, getShelf, markEmpty, removeFromShelf, writeOff } from './shelf';
import { getReorder, getShelfDashboard, orderText, weekPeriods } from './shelf-insights';
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
  start = (await prisma.pack.findFirstOrThrow({ orderBy: { receivedAt: 'asc' } })).receivedAt;
});

const supplier = (name: string) => prisma.supplier.create({ data: { name } });

const receive = async (
  tobaccoId: string,
  input: {
    supplierId?: string | null;
    kind?: 'invoice' | 'manual';
    priceKop?: number | null;
    at: Date;
    packAt?: Date;
    qty?: number;
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
  await prisma.pack.createMany({
    data: Array.from({ length: input.qty ?? 1 }, () => ({
      shelfItemId: item.id,
      weight: item.packWeight,
      priceKop: input.priceKop ?? null,
      receivedAt: input.packAt ?? input.at,
      deliveryId: delivery.id,
    })),
  });
  return delivery;
};

const keepOnly = (tobaccoIds: string[]) =>
  prisma.shelfItem.updateMany({ where: { tobaccoId: { notIn: tobaccoIds } }, data: { keepStocked: false } });

const expectedQuantity = (rate: number | null, packWeight: number) =>
  rate ? Math.max(1, Math.ceil((rate * 21) / packWeight)) : 1;

test.describe('текст заказа', () => {
  test('строка на табак: бренд, линейка, вкус, фасовка и количество', () => {
    assert.equal(
      orderText([
        { tobacco: { manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' }, packWeight: 200, quantity: 3 },
        { tobacco: { manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' }, packWeight: 250, quantity: 1 },
      ]),
      'Добрый день! Заказ:\nBlack Burn Cane Mint 200 г — 3 шт\nDARKSIDE Core Supernova 250 г — 1 шт\nСпасибо!',
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

    // Mint: банка Каспия после стартовой, обе закончились.
    await receive(MINT, { supplierId: kaspiy.id, priceKop: 155_000, at: at(1), number: 'K-1' });
    await markEmpty(actor, MINT, at(5));
    await markEmpty(actor, MINT, at(8));
    // Berry: банка Каспия в работе, хватит на 4 дня.
    await receive(BERRY, { supplierId: kaspiy.id, priceKop: 160_000, at: at(2), number: 'K-2' });
    await markEmpty(actor, BERRY, at(6));
    // Apple: ручная поставка Южного, потом банка без цены и поставщика (списана);
    // хватит на 6 дней.
    await receive(APPLE, { supplierId: yug.id, kind: 'manual', priceKop: 180_000, at: at(1) });
    await addPack(actor, APPLE, {}, at(2));
    const extra = await prisma.pack.findFirstOrThrow({ where: { shelfItem: { tobaccoId: APPLE } }, orderBy: { receivedAt: 'desc' } });
    await writeOff(actor, extra.id, 'Рассыпали', at(2));
    await markEmpty(actor, APPLE, at(7));
    // Herbal: только стартовая — закончилась; Peach — в плане.
    await markEmpty(actor, HERBAL, at(2));
    await addToShelf(actor, PEACH, 'plan', at(3));
    // Свежий счёт Каспия ещё черновик — он и «последний».
    await prisma.delivery.create({
      data: { supplierId: kaspiy.id, kind: 'invoice', status: 'draft', number: 'K-3', invoiceDate: at(7) },
    });
    return { kaspiy, yug };
  };

  test('группы по последнему поставщику, цены, суммы и текст', async () => {
    const { kaspiy, yug } = await scenario();
    const now = at(8);
    const reorder = await getReorder(now);
    const rows = new Map((await getShelf(now)).rows.map((row) => [row.tobacco.id, row]));
    const quantity = (id: string) => expectedQuantity(rows.get(id)!.rate, rows.get(id)!.packWeight);

    assert.deepEqual(reorder.settings, { bowlGrams: 18, leadDays: 7 });
    const bySupplier = new Map(reorder.groups.map((group) => [group.supplier?.id ?? null, group]));
    assert.equal(reorder.groups.length, 3);
    // С поставщиком — по срочности первой строки; «Поставщик не выбран» — всегда последней,
    // хотя закончившийся Herbal и Peach в плане срочнее Apple.
    assert.deepEqual(reorder.groups.map((group) => group.supplier?.id ?? null), [kaspiy.id, yug.id, null]);

    const k = bySupplier.get(kaspiy.id)!;
    assert.deepEqual(k.supplier, { id: kaspiy.id, name: 'Каспий Опт' });
    assert.deepEqual(k.lastInvoice, { number: 'K-3', date: at(7).toISOString().slice(0, 10), status: 'draft' });
    assert.deepEqual(k.items.map((item) => [item.tobacco.id, item.status, item.lastPriceKop]), [
      [MINT, 'out', 155_000],
      [BERRY, 'ending', 160_000],
    ]);
    const mint = k.items[0];
    assert.equal(mint.quantity, quantity(MINT));
    assert.equal(mint.packWeight, 200);
    assert.equal(mint.rateKind, 'own');
    assert.equal(mint.daysLeft, 0);
    const berry = k.items[1];
    assert.equal(Math.round(berry.daysLeft!), 4);
    assert.equal(berry.endsAt, rows.get(BERRY)!.endsAt);
    assert.equal(k.sumKop, quantity(MINT) * 155_000 + quantity(BERRY) * 160_000);

    const y = bySupplier.get(yug.id)!;
    assert.equal(y.lastInvoice, null);
    assert.deepEqual(y.items.map((item) => [item.tobacco.id, item.status, item.lastPriceKop]), [[APPLE, 'ending', 180_000]]);
    assert.equal(y.sumKop, quantity(APPLE) * 180_000);

    const none = bySupplier.get(null)!;
    assert.equal(none.supplier, null);
    assert.equal(none.lastInvoice, null);
    assert.deepEqual(none.items.map((item) => [item.tobacco.id, item.status, item.lastPriceKop]).sort(), [
      [HERBAL, 'out', null],
      [PEACH, 'plan', null],
    ]);
    assert.equal(none.sumKop, null);

    const mintRow = rows.get(MINT)!.tobacco;
    const text = reorder.text.find((entry) => entry.supplierId === kaspiy.id)!.text;
    assert.equal(
      text,
      [
        'Добрый день! Заказ:',
        `${mintRow.manufacturer} ${mintRow.name} 200 г — ${quantity(MINT)} шт`,
        `${rows.get(BERRY)!.tobacco.manufacturer} ${rows.get(BERRY)!.tobacco.name} 200 г — ${quantity(BERRY)} шт`,
        'Спасибо!',
      ].join('\n'),
    );
    assert.deepEqual(reorder.text.map((entry) => entry.supplierId), reorder.groups.map((group) => group.supplier?.id ?? null));
  });

  test('без цены хоть у одной строки сумма группы неизвестна', async () => {
    const { kaspiy } = await scenario();
    await prisma.pack.updateMany({ where: { shelfItem: { tobaccoId: BERRY } }, data: { priceKop: null } });
    const group = (await getReorder(at(8))).groups.find((item) => item.supplier?.id === kaspiy.id)!;
    assert.equal(group.items[1].lastPriceKop, null);
    assert.equal(group.sumKop, null);
  });

  test('пустая полка — пустой список', async () => {
    await keepOnly([]);
    const reorder = await getReorder(at(1));
    assert.deepEqual(reorder.groups, []);
    assert.deepEqual(reorder.text, []);
  });
});

test.describe('дашборд полки', () => {
  test('прогноз на сегодня без поправки, пока нет 4 недель «Покурить»', async () => {
    await addPack(actor, BERRY, {}, at(1));
    await markEmpty(actor, BERRY, at(6));
    const now = at(8);
    const dashboard = await getShelfDashboard(now);
    const shelf = await getShelf(now);
    assert.equal(dashboard.today.weekdayFactor, null);
    assert.equal(dashboard.today.weekday, ((now.getDay() + 6) % 7) + 1);
    assert.equal(dashboard.today.grams, shelf.today.grams);
    assert.equal(dashboard.today.bowls, shelf.today.bowls);
  });

  test('поправка на день недели по «Покурить» гостей и из «Намиксуй»', async () => {
    await addPack(actor, BERRY, {}, at(1));
    await markEmpty(actor, BERRY, at(6));
    const now = at(8);
    const local = (daysBack: number, hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, hour);
    const smoke: Date[] = [local(30, 12)];
    const custom: Date[] = [];
    for (let back = 1; back <= 28; back += 1) {
      smoke.push(local(back, 12));
      custom.push(local(back, 20));
      if (back % 7 === 0) smoke.push(local(back, 21), local(back, 22));
    }
    await prisma.smokeCtaEvent.createMany({ data: smoke.map((createdAt) => ({ mixId: 'mix-citrus-scout', createdAt })) });
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
    await addPack(actor, BERRY, { priceKop: 160_000 }, at(1));
    await markEmpty(actor, BERRY, at(6));
    await markEmpty(actor, MINT, at(5));
    // Закончившийся, который не держим постоянно, — не в списке.
    await markEmpty(actor, HERBAL, at(5));
    await prisma.shelfItem.update({ where: { tobaccoId: HERBAL }, data: { keepStocked: false } });
    const dashboard = await getShelfDashboard(at(8));
    assert.deepEqual(dashboard.ending.map((item) => [item.tobacco.id, item.status]), [
      [MINT, 'out'],
      [BERRY, 'ending'],
    ]);
    assert.equal(dashboard.ending[0].daysLeft, 0);
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
    // После стартового прихода, чтобы стартовые банки остались в работе.
    const inMonth = new Date((Math.max(monthStart.getTime(), start.getTime() + 1000) + now.getTime()) / 2);
    const kaspiy = await supplier('Каспий Опт');
    const yug = await supplier('Южный табак');
    await receive(MINT, { supplierId: kaspiy.id, priceKop: 155_000, at: inMonth, qty: 2 });
    await receive(APPLE, { supplierId: yug.id, kind: 'manual', priceKop: 180_000, at: inMonth });
    await receive(HERBAL, { supplierId: yug.id, kind: 'manual', at: inMonth });
    await receive(HERBAL, { supplierId: kaspiy.id, priceKop: 999_000, at: new Date(monthStart.getTime() - DAY), packAt: inMonth });
    await prisma.delivery.create({ data: { supplierId: kaspiy.id, kind: 'invoice', status: 'draft', totalKop: 777_000 } });
    // Berry: банка с ценой в работе, расход свой.
    await addPack(actor, BERRY, { priceKop: 160_000 }, at(1));
    await markEmpty(actor, BERRY, at(6));

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

    // В работе с ценой — только банка Berry (800 коп/г).
    assert.equal(dashboard.bowlCostKop, 18 * 800);
    const berry = (await getShelf(now)).rows.find((row) => row.tobacco.id === BERRY)!;
    const berryGrams = berry.openPacks[0].fraction * berry.openPacks[0].weight;
    // Запас: две банки Mint, Apple и прошломесячная Herbal — в запасе целиком.
    assert.equal(dashboard.stockValueKop, Math.round(berryGrams * 800 + 2 * 155_000 + 180_000 + 999_000));
  });

  test('без цен нет себестоимости чаши, табак на полке — ноль', async () => {
    const dashboard = await getShelfDashboard(at(1));
    assert.equal(dashboard.bowlCostKop, null);
    assert.equal(dashboard.stockValueKop, 0);
    assert.deepEqual(dashboard.spend.bySupplier, []);
    assert.equal(dashboard.spend.totalKop, 0);
  });

  test('расход по неделям: отрезок через границу недель, текущая неделя частичная, убранные табаки тоже', async () => {
    const now = at(8);
    const weeks = weekPeriods(now, 5);
    await addToShelf(actor, PEACH, 'plan', at(1));
    const peach = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: PEACH } });
    const boundary = weeks[2].from.getTime();
    await prisma.pack.create({
      data: {
        shelfItemId: peach.id,
        weight: 200,
        receivedAt: new Date(boundary - 2 * DAY),
        emptiedAt: new Date(boundary + 2 * DAY),
      },
    });
    const current = weeks[4].from.getTime();
    await prisma.pack.create({
      data: {
        shelfItemId: peach.id,
        weight: 200,
        receivedAt: new Date(current),
        emptiedAt: new Date((current + now.getTime()) / 2),
      },
    });
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

test.describe('HTTP', () => {
  const login = async (app: ReturnType<typeof buildApp>) => {
    const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
    return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
  };

  test('без токена — 401', async () => {
    const app = buildApp();
    for (const url of ['/staff/shelf/reorder', '/staff/shelf/dashboard']) {
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
    assert.deepEqual(Object.keys(body).sort(), ['groups', 'settings', 'text']);
    const item = body.groups[0].items.find((entry: { tobacco: { id: string } }) => entry.tobacco.id === MINT);
    assert.deepEqual(Object.keys(item).sort(), [
      'daysLeft', 'endsAt', 'lastPriceKop', 'packWeight', 'quantity', 'rate', 'rateKind', 'status', 'tobacco',
    ]);
    assert.deepEqual(Object.keys(body.groups[0]).sort(), ['items', 'lastInvoice', 'sumKop', 'supplier']);

    const dashboard = await app.inject({ method: 'GET', url: '/staff/shelf/dashboard', headers });
    assert.equal(dashboard.statusCode, 200);
    const view = dashboard.json();
    assert.deepEqual(Object.keys(view).sort(), ['bowlCostKop', 'ending', 'spend', 'stockValueKop', 'today', 'weekly']);
    assert.deepEqual(Object.keys(view.today).sort(), ['bowls', 'grams', 'weekday', 'weekdayFactor']);
    assert.equal(view.weekly.length, 5);
    assert.equal(view.ending[0].tobacco.id, MINT);
  });
});
