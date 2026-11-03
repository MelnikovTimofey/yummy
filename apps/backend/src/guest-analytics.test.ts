import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app';
import { prisma } from './db';
import { resetAppState } from './state';
import { getGuestChoices, parseChoicesPeriod, roundShares, type GuestChoices } from './guest-analytics';

const DAY = 86_400_000;
const NOW = new Date();
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const dayKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const localDay = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (key: string, days: number) => {
  const date = localDay(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
};
const today = dayKey(NOW);

const smoke = (mixId: string | null, createdAt: Date, extra: { mixName?: string; from?: string; to?: string; profiles?: string[] } = {}) =>
  prisma.smokeCtaEvent.create({
    data: {
      mixId,
      mixName: extra.mixName ?? mixId ?? 'Удалённый',
      mixProfiles: extra.profiles ?? [],
      substitutedFromId: extra.from ?? null,
      substitutedToId: extra.to ?? null,
      createdAt,
    },
  });

const smokeMany = (mixId: string, count: number, createdAt: Date) =>
  prisma.smokeCtaEvent.createMany({ data: Array.from({ length: count }, () => ({ mixId, mixName: mixId, createdAt })) });

const own = (tobaccoIds: string[], createdAt: Date) =>
  prisma.customMixSmokeEvent.create({
    data: {
      components: tobaccoIds.map((tobaccoId) => ({ tobaccoId, manufacturer: '', name: '', proportion: 50 })),
      signature: tobaccoIds.join('|'),
      name: 'Свой',
      harmony: 50,
      createdAt,
    },
  });

const period = (query: Record<string, string>) => {
  const parsed = parseChoicesPeriod(query, NOW);
  assert.ok(!('error' in parsed), JSON.stringify(parsed));
  return parsed;
};

const choices = (query: Record<string, string> = { period: '30d' }) => getGuestChoices(period(query), NOW);

test.describe('parseChoicesPeriod', () => {
  test('presets are rolling windows ending today', () => {
    assert.deepEqual(parseChoicesPeriod({ period: '7d' }, NOW), { key: '7d', from: addDays(today, -6), to: today });
    assert.deepEqual(parseChoicesPeriod({ period: '30d' }, NOW), { key: '30d', from: addDays(today, -29), to: today });
    assert.deepEqual(parseChoicesPeriod({ period: '90d' }, NOW), { key: '90d', from: addDays(today, -89), to: today });
    assert.deepEqual(parseChoicesPeriod({ period: 'all' }, NOW), { key: 'all', from: null, to: today });
  });

  test('custom range is inclusive by days', () => {
    const from = addDays(today, -13);
    assert.deepEqual(parseChoicesPeriod({ from, to: today }, NOW), { key: 'custom', from, to: today });
    assert.deepEqual(parseChoicesPeriod({ from: today, to: today }, NOW), { key: 'custom', from: today, to: today });
  });

  test('rejects broken, reversed, future and half ranges and unknown presets', () => {
    const bad: Array<Record<string, string>> = [
      { period: '14d' },
      { from: '2026-02-30', to: '2026-03-01' },
      { from: '2026-1-1', to: '2026-01-02' },
      { from: today, to: addDays(today, -1) },
      { from: today, to: addDays(today, 1) },
      { from: today },
      { to: today },
    ];
    for (const query of bad) {
      assert.ok('error' in parseChoicesPeriod(query, NOW), JSON.stringify(query));
    }
  });
});

test('roundShares keeps the sum at 100 by largest remainder', () => {
  assert.deepEqual(roundShares([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(roundShares([2, 1]), [67, 33]);
  assert.deepEqual(roundShares([10, 10, 10, 10]), [25, 25, 25, 25]);
  assert.deepEqual(roundShares([]), []);
});

test.describe('guest choices analytics', () => {
  test.beforeEach(async () => {
    await resetAppState();
  });

  // Сцена: Citrus Breeze на полке, но закончился, у него аналог Apple Fizz → «Цитрусовый
  // караван» идёт с аналогом; Rose Nocturne снят с полки → «Розовый сумрак» скрыт у гостя;
  // Peach Silk — проба (первый приход неделю назад, не стартовый).
  const stage = async () => {
    await prisma.tobacco.update({ where: { id: 'tobacco-citrus-breeze' }, data: { inStock: false } });
    await prisma.tobaccoAnalog.createMany({
      data: [
        { tobaccoId: 'tobacco-citrus-breeze', analogId: 'tobacco-apple-fizz' },
        { tobaccoId: 'tobacco-apple-fizz', analogId: 'tobacco-citrus-breeze' },
      ],
    });
    await prisma.shelfItem.update({ where: { tobaccoId: 'tobacco-rose-nocturne' }, data: { status: 'dropped' } });
    await prisma.tobacco.update({ where: { id: 'tobacco-rose-nocturne' }, data: { inStock: false } });
    const peach = await prisma.shelfItem.create({ data: { tobaccoId: 'tobacco-peach-silk', status: 'active' } });
    await prisma.stockEntry.create({ data: { shelfItemId: peach.id, kind: 'receipt', grams: 200, at: ago(7) } });
    await prisma.tobacco.update({ where: { id: 'tobacco-peach-silk' }, data: { inStock: true } });
    await prisma.rail.create({
      data: { id: 'rail-empty', name: 'Новинки', description: '', type: 'curated', active: true, mixes: { create: [{ mixId: 'mix-rose-afterglow' }] } },
    });

    await smoke('mix-citrus-scout', ago(1));
    await smoke('mix-citrus-scout', ago(2));
    await smoke('mix-berry-dawn', ago(3), { from: 'tobacco-berry-oasis', to: 'tobacco-grape-fog' });
    await smoke('mix-rose-afterglow', ago(4));
    await smoke(null, ago(5), { mixName: 'Старый микс', profiles: ['gastro'] });
    await smoke('mix-peach-mirage', ago(6));
    await smokeMany('mix-dark-market', 15, ago(10));
    await own(['tobacco-citrus-breeze', 'tobacco-herbal-dawn', 'tobacco-citrus-breeze', 'tobacco-gone'], ago(2));
    // Вне месяца.
    await smoke('mix-citrus-scout', ago(40));
    await own(['tobacco-mint-veil'], ago(45));

    await prisma.mixRating.createMany({
      data: [
        { mixId: 'mix-dark-market', value: 5, createdAt: ago(3) },
        { mixId: 'mix-dark-market', value: 4, createdAt: ago(4) },
        { mixId: 'mix-dark-market', value: 1, createdAt: ago(50) },
      ],
    });
  };

  test('counts choices of catalog and own mixes within the period', async () => {
    await stage();
    const result = await choices();

    assert.equal(result.enough, true);
    assert.deepEqual(result.kpi, {
      choices: 22,
      ownMixes: 1,
      mixesChosen: 5,
      mixesOnShowcase: 10,
      avgRating: 4.5,
      ratingsCount: 2,
    });
    assert.deepEqual(result.period, { key: '30d', from: addDays(today, -29), to: today, days: 30, bucket: 'day' });
  });

  test('timeline lists every day of the period, empty days are zeros', async () => {
    await stage();
    const { timeline } = await choices();

    assert.equal(timeline.length, 30);
    assert.equal(timeline[0].date, addDays(today, -29));
    assert.equal(timeline[29].date, today);
    assert.equal(timeline.reduce((sum, point) => sum + point.catalog, 0), 21);
    assert.equal(timeline.reduce((sum, point) => sum + point.own, 0), 1);
    assert.deepEqual(timeline.find((point) => point.date === dayKey(ago(10))), { date: dayKey(ago(10)), catalog: 15, own: 0 });
  });

  test('a tobacco scores once per choice, the shelf analog replaces the original', async () => {
    await stage();
    const { topTobaccos } = await choices();
    const byId = new Map(topTobaccos.map((row) => [row.tobaccoId, row]));

    assert.deepEqual(topTobaccos.slice(0, 4).map((row) => [row.tobaccoId, row.choices]), [
      ['tobacco-dark-leaf', 15],
      ['tobacco-spice-route', 15],
      ['tobacco-mint-veil', 4],
      ['tobacco-citrus-breeze', 3],
    ]);
    assert.equal(byId.get('tobacco-grape-fog')?.choices, 1);
    assert.equal(byId.get('tobacco-herbal-dawn')?.choices, 1);
    assert.equal(byId.has('tobacco-berry-oasis'), false);
    assert.equal(byId.has('tobacco-gone'), false);
    assert.deepEqual(byId.get('tobacco-citrus-breeze'), {
      tobaccoId: 'tobacco-citrus-breeze',
      manufacturer: 'Ателье Reserve',
      name: 'Citrus Breeze',
      choices: 3,
      mark: 'out',
    });
    assert.equal(byId.get('tobacco-rose-nocturne')?.mark, 'off-shelf');
    assert.equal(byId.get('tobacco-peach-silk')?.mark, 'trial');
    assert.equal(byId.get('tobacco-mint-veil')?.mark, null);
  });

  test('top mixes keep deleted mixes under their name and mark hidden and analog ones', async () => {
    await stage();
    const { topMixes } = await choices();

    assert.deepEqual(topMixes[0], { mixId: 'mix-dark-market', mixName: 'Тёмный рынок', choices: 15, avgRating: 4.5, mark: null });
    assert.deepEqual(topMixes[1], { mixId: 'mix-citrus-scout', mixName: 'Цитрусовый караван', choices: 2, avgRating: null, mark: 'analog' });
    const byName = new Map(topMixes.map((row) => [row.mixName, row]));
    assert.deepEqual(byName.get('Старый микс'), { mixId: null, mixName: 'Старый микс', choices: 1, avgRating: null, mark: null });
    assert.equal(byName.get('Розовый сумрак')?.mark, 'hidden');
    assert.equal(topMixes.length, 6);
  });

  test('signals: popular tobaccos that ran out, mixes hidden by stock, empty rails', async () => {
    await stage();
    const { signals } = await choices();

    assert.deepEqual(signals, {
      outPopular: [{ tobaccoId: 'tobacco-citrus-breeze', name: 'Citrus Breeze' }],
      hiddenMixes: [{ mixId: 'mix-rose-afterglow', mixName: 'Розовый сумрак' }],
      emptyRails: [{ railId: 'rail-empty', name: 'Новинки' }],
    });
  });

  test('flavour shares: catalog mix by its profiles, own mix by its tobaccos, sum is 100', async () => {
    await smokeMany('mix-dark-market', 10, ago(1));
    await Promise.all(Array.from({ length: 10 }, () => own(['tobacco-mint-veil'], ago(2))));
    const { profiles } = await choices();

    assert.deepEqual(profiles, [
      { key: 'fresh', label: 'Свежие', share: 25 },
      { key: 'minty', label: 'Мятные', share: 25 },
      { key: 'spicy', label: 'Пряные', share: 25 },
      { key: 'tobacco', label: 'Табачные', share: 25 },
    ]);
  });

  test('the profile snapshot of the choice wins over the current composition', async () => {
    await smokeMany('mix-dark-market', 19, ago(1));
    await smoke('mix-dark-market', ago(1), { profiles: ['berry'] });
    const { profiles } = await choices();

    assert.deepEqual(profiles.map((row) => row.key), ['spicy', 'tobacco', 'berry']);
    assert.equal(profiles.reduce((sum, row) => sum + row.share, 0), 100);
  });

  test('few choices: no charts, but tiles and signals stay', async () => {
    await smoke('mix-citrus-scout', ago(1));
    await own(['tobacco-mint-veil'], ago(1));
    const result = await choices();

    assert.equal(result.enough, false);
    assert.equal(result.kpi.choices, 2);
    assert.equal(result.kpi.ownMixes, 1);
    assert.deepEqual([result.timeline, result.topTobaccos, result.topMixes, result.profiles], [[], [], [], []]);
    assert.deepEqual(result.signals.hiddenMixes, [{ mixId: 'mix-peach-mirage', mixName: 'Персиковый мираж' }]);
  });

  test('empty period: zeros and no average rating', async () => {
    const result = await choices({ period: '7d' });
    assert.deepEqual(result.kpi, { choices: 0, ownMixes: 0, mixesChosen: 0, mixesOnShowcase: 10, avgRating: null, ratingsCount: 0 });
    assert.equal(result.enough, false);
  });

  test('longer than 31 days goes by weeks starting on Monday', async () => {
    await smokeMany('mix-dark-market', 20, ago(1));
    const result = await choices({ period: '90d' });

    assert.equal(result.period.bucket, 'week');
    assert.equal(result.period.days, 90);
    const firstMonday = localDay(addDays(today, -89));
    firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));
    assert.equal(result.timeline[0].date, dayKey(firstMonday));
    for (const point of result.timeline) assert.equal(localDay(point.date).getDay(), 1, point.date);
    for (let i = 1; i < result.timeline.length; i += 1) {
      assert.equal(result.timeline[i].date, addDays(result.timeline[i - 1].date, 7));
    }
    assert.equal(result.timeline.reduce((sum, point) => sum + point.catalog, 0), 20);
  });

  test('all time starts at the first choice', async () => {
    await smokeMany('mix-dark-market', 20, ago(1));
    await own(['tobacco-mint-veil'], ago(40));
    const result = await choices({ period: 'all' });

    assert.deepEqual(result.period, { key: 'all', from: dayKey(ago(40)), to: today, days: 41, bucket: 'week' });
    assert.equal(result.kpi.choices, 21);
  });

  test('all time without choices is just today', async () => {
    const result = await choices({ period: 'all' });
    assert.deepEqual(result.period, { key: 'all', from: today, to: today, days: 1, bucket: 'day' });
  });

  test('custom range counts both edge days', async () => {
    await smoke('mix-citrus-scout', ago(3));
    await smoke('mix-citrus-scout', ago(5));
    await smoke('mix-citrus-scout', ago(6));
    const result = await choices({ from: dayKey(ago(5)), to: dayKey(ago(3)) });

    assert.equal(result.period.key, 'custom');
    assert.equal(result.period.days, 3);
    assert.equal(result.kpi.choices, 2);
  });
});

test.describe('GET /staff/dashboard/choices', () => {
  test.beforeEach(async () => {
    await resetAppState();
  });

  const login = async (app: ReturnType<typeof buildApp>) => {
    const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
    return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
  };

  test('requires a staff session', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/staff/dashboard/choices?period=30d' });
    await app.close();
    assert.equal(response.statusCode, 401);
  });

  test('answers aggregates only, without guest ids', async () => {
    const guest = await prisma.guestAccount.create({ data: { telegramId: '777', consentAt: new Date() } });
    await prisma.smokeCtaEvent.create({ data: { mixId: 'mix-citrus-scout', mixName: 'x', guestId: guest.id } });
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/staff/dashboard/choices?period=7d', headers: await login(app) });
    await app.close();

    assert.equal(response.statusCode, 200);
    const body = response.json() as GuestChoices;
    assert.deepEqual(Object.keys(body).sort(), ['enough', 'kpi', 'period', 'profiles', 'signals', 'timeline', 'topMixes', 'topTobaccos']);
    assert.equal(body.kpi.choices, 1);
    assert.equal(response.body.includes(guest.id), false);
  });

  test('takes a custom range', async () => {
    const app = buildApp();
    const from = addDays(today, -2);
    const response = await app.inject({ method: 'GET', url: `/staff/dashboard/choices?from=${from}&to=${today}`, headers: await login(app) });
    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual((response.json() as GuestChoices).period, { key: 'custom', from, to: today, days: 3, bucket: 'day' });
  });

  test('rejects a reversed, broken or future range with 400', async () => {
    const app = buildApp();
    const headers = await login(app);
    for (const query of [`from=${today}&to=${addDays(today, -1)}`, 'from=2026-13-01&to=2026-13-02', `from=${today}&to=${addDays(today, 1)}`, 'period=year']) {
      const response = await app.inject({ method: 'GET', url: `/staff/dashboard/choices?${query}`, headers });
      assert.equal(response.statusCode, 400, query);
    }
    await app.close();
  });
});
