import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bowlCost,
  consumptionRate,
  forecastShelf,
  gramPrice,
  openRemaining,
  reorderList,
  resolvePacks,
  shelfForecast,
  todayForecast,
  withBrandFallback,
  DEFAULT_SETTINGS,
  type Pack,
  type Rate,
  type ShelfItem,
} from './stock';

const DAY = 86_400_000;
const START = Date.UTC(2026, 10, 1);
const day = (n: number) => new Date(START + n * DAY);

const pack = (overrides: Partial<Pack> & { id: string }): Pack => ({
  weight: 250,
  price: null,
  receivedAt: day(0),
  openedAt: null,
  emptiedAt: null,
  writtenOffAt: null,
  marks: [],
  ...overrides,
});

const item = (overrides: Partial<ShelfItem> & { tobaccoId: string }): ShelfItem => ({
  brand: 'Тест',
  packWeight: 250,
  keepStocked: true,
  plan: false,
  stopped: false,
  packs: [],
  ...overrides,
});

const own = (gramsPerDay: number): Rate => ({ gramsPerDay, kind: 'own' });
const none: Rate = { gramsPerDay: null, kind: 'none' };

const stateOf = (packs: Pack[]) =>
  resolvePacks(packs).map((resolved) => [resolved.id, resolved.state, resolved.openedAt?.getTime() ?? null]);

const approx = (actual: number | null, expected: number) => {
  assert.ok(actual !== null, 'ожидалось число');
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
};

// --- автовскрытие ----------------------------------------------------------

test.describe('resolvePacks', () => {
  test('of two packs received the same day only the first is opened', () => {
    assert.deepEqual(stateOf([pack({ id: 'a' }), pack({ id: 'b' })]), [
      ['a', 'open', day(0).getTime()],
      ['b', 'sealed', null],
    ]);
  });

  test('the next pack opens when the previous one is emptied', () => {
    assert.deepEqual(stateOf([pack({ id: 'a', emptiedAt: day(10) }), pack({ id: 'b' })]), [
      ['a', 'empty', day(0).getTime()],
      ['b', 'open', day(10).getTime()],
    ]);
  });

  test('a pack arriving while another is open stays sealed', () => {
    assert.deepEqual(stateOf([pack({ id: 'a' }), pack({ id: 'b', receivedAt: day(5) })]), [
      ['a', 'open', day(0).getTime()],
      ['b', 'sealed', null],
    ]);
  });

  test('a pack arriving after the shelf ran out opens on arrival', () => {
    assert.deepEqual(stateOf([pack({ id: 'a', emptiedAt: day(5) }), pack({ id: 'b', receivedAt: day(8) })]), [
      ['a', 'empty', day(0).getTime()],
      ['b', 'open', day(8).getTime()],
    ]);
  });

  test('the oldest pack opens first, ties keep input order', () => {
    const packs = [
      pack({ id: 'late', receivedAt: day(3) }),
      pack({ id: 'first', receivedAt: day(1) }),
      pack({ id: 'second', receivedAt: day(1) }),
    ];
    assert.deepEqual(stateOf(packs), [
      ['late', 'sealed', null],
      ['first', 'open', day(1).getTime()],
      ['second', 'sealed', null],
    ]);
  });

  test('explicit openedAt opens a second pack in parallel', () => {
    const packs = [pack({ id: 'a' }), pack({ id: 'b', openedAt: day(4) }), pack({ id: 'c' })];
    assert.deepEqual(stateOf(packs), [
      ['a', 'open', day(0).getTime()],
      ['b', 'open', day(4).getTime()],
      ['c', 'sealed', null],
    ]);
  });

  test('auto-open waits for an explicitly opened pack too', () => {
    const packs = [
      pack({ id: 'a', emptiedAt: day(5) }),
      pack({ id: 'b', openedAt: day(3), emptiedAt: day(9) }),
      pack({ id: 'c' }),
    ];
    assert.deepEqual(stateOf(packs), [
      ['a', 'empty', day(0).getTime()],
      ['b', 'empty', day(3).getTime()],
      ['c', 'open', day(9).getTime()],
    ]);
  });

  test('undoing «Закончилась» reopens the pack and reseals the next one', () => {
    const emptied = [pack({ id: 'a', emptiedAt: day(10) }), pack({ id: 'b' })];
    const undone = [pack({ id: 'a' }), pack({ id: 'b' })];
    assert.equal(resolvePacks(emptied)[1].state, 'open');
    assert.deepEqual(stateOf(undone), [
      ['a', 'open', day(0).getTime()],
      ['b', 'sealed', null],
    ]);
  });

  test('a pack written off while sealed is never opened and does not block the queue', () => {
    const packs = [
      pack({ id: 'a', emptiedAt: day(10) }),
      pack({ id: 'b', writtenOffAt: day(4) }),
      pack({ id: 'c' }),
    ];
    assert.deepEqual(stateOf(packs), [
      ['a', 'empty', day(0).getTime()],
      ['b', 'written_off', null],
      ['c', 'open', day(10).getTime()],
    ]);
  });

  test('writing off an open pack opens the next one', () => {
    const packs = [pack({ id: 'a', writtenOffAt: day(3) }), pack({ id: 'b' })];
    assert.deepEqual(stateOf(packs), [
      ['a', 'written_off', day(0).getTime()],
      ['b', 'open', day(3).getTime()],
    ]);
  });
});

// --- расход ----------------------------------------------------------------

test.describe('consumptionRate', () => {
  test('full packs: grams over days', () => {
    const packs = [
      pack({ id: 'a', emptiedAt: day(10) }),
      pack({ id: 'b', emptiedAt: day(20) }),
      pack({ id: 'c' }),
    ];
    const rate = consumptionRate(packs, day(25));
    assert.equal(rate.kind, 'own');
    approx(rate.gramsPerDay, 25);
  });

  test('marks count, the running segment does not', () => {
    const packs = [pack({ id: 'a', marks: [{ at: day(4), fraction: 0.5 }] })];
    const rate = consumptionRate(packs, day(30));
    assert.equal(rate.kind, 'own');
    approx(rate.gramsPerDay, 31.25);
  });

  test('marks and «Закончилась» on one pack', () => {
    const packs = [
      pack({
        id: 'a',
        weight: 200,
        emptiedAt: day(12),
        marks: [
          { at: day(8), fraction: 0.25 },
          { at: day(3), fraction: 0.75 },
        ],
      }),
    ];
    approx(consumptionRate(packs, day(12)).gramsPerDay, 200 / 12);
  });

  test('only the last 60 days count, a straddling segment proportionally', () => {
    const packs = [
      pack({ id: 'a', emptiedAt: day(20) }),
      pack({ id: 'b', emptiedAt: day(30) }),
      pack({ id: 'c' }),
    ];
    // окно с 10-го дня: половина первой банки (125 г за 10 дней) + вторая (250 г за 10 дней)
    approx(consumptionRate(packs, day(70)).gramsPerDay, 375 / 20);
  });

  test('written-off packs are excluded', () => {
    const packs = [
      pack({ id: 'a', writtenOffAt: day(10), marks: [{ at: day(5), fraction: 0.75 }] }),
      pack({ id: 'b', emptiedAt: day(20) }),
    ];
    approx(consumptionRate(packs, day(25)).gramsPerDay, 25);
  });

  test('no finished segment means no data', () => {
    assert.deepEqual(consumptionRate([pack({ id: 'a' }), pack({ id: 'b' })], day(30)), none);
    assert.deepEqual(consumptionRate([], day(30)), none);
  });

  test('segments older than the window mean no data', () => {
    const packs = [pack({ id: 'a', emptiedAt: day(10) }), pack({ id: 'b' })];
    assert.deepEqual(consumptionRate(packs, day(100)), none);
  });

  test('undoing «Закончилась» drops the finished segment', () => {
    assert.equal(consumptionRate([pack({ id: 'a', emptiedAt: day(10) })], day(12)).kind, 'own');
    assert.equal(consumptionRate([pack({ id: 'a' })], day(12)).kind, 'none');
  });
});

test.describe('withBrandFallback', () => {
  test('own rate wins', () => {
    assert.deepEqual(withBrandFallback(own(5), [10, 20]), own(5));
  });

  test('no data takes the brand median', () => {
    assert.deepEqual(withBrandFallback(none, [30, 10, 20]), { gramsPerDay: 20, kind: 'brand' });
    assert.deepEqual(withBrandFallback(none, [40, 10, 20, 30]), { gramsPerDay: 25, kind: 'brand' });
  });

  test('no brand data stays no data', () => {
    assert.deepEqual(withBrandFallback(none, []), none);
  });
});

// --- остаток ---------------------------------------------------------------

test.describe('openRemaining', () => {
  const opened = (overrides: Partial<Pack> = {}) => resolvePacks([pack({ id: 'a', ...overrides })])[0];

  test('counts from opening without marks', () => {
    assert.deepEqual(openRemaining(opened(), 10, day(5)), { grams: 200, overdue: false });
  });

  test('counts from the last mark', () => {
    const resolved = opened({ marks: [{ at: day(4), fraction: 0.5 }, { at: day(1), fraction: 0.75 }] });
    assert.deepEqual(openRemaining(resolved, 10, day(6)), { grams: 105, overdue: false });
  });

  test('without a rate the last mark is the remainder', () => {
    const resolved = opened({ weight: 300, marks: [{ at: day(4), fraction: 1 / 3 }] });
    approx(openRemaining(resolved, null, day(40)).grams, 100);
    assert.equal(openRemaining(resolved, null, day(40)).overdue, false);
  });

  test('below 10 % of the weight asks for a check', () => {
    assert.deepEqual(openRemaining(opened(), 24, day(10)), { grams: 10, overdue: true });
  });

  test('never goes below zero', () => {
    assert.deepEqual(openRemaining(opened(), 30, day(20)), { grams: 0, overdue: true });
  });
});

// --- прогноз по табаку -----------------------------------------------------

test.describe('shelfForecast', () => {
  // первая банка ушла за 10 дней: расход 25 г/день
  const history = () => [pack({ id: 'a', emptiedAt: day(10) })];

  test('ok: remainder, days and date', () => {
    const shelf = item({ tobaccoId: 't', packs: [...history(), pack({ id: 'b' }), pack({ id: 'c' })] });
    const forecast = shelfForecast(shelf, own(25), day(12), DEFAULT_SETTINGS);
    assert.equal(forecast.status, 'ok');
    assert.equal(forecast.last, false);
    assert.equal(forecast.overdue, false);
    assert.equal(forecast.guestAvailable, true);
    assert.equal(forecast.rate, 25);
    assert.equal(forecast.rateKind, 'own');
    assert.equal(forecast.openPacks, 1);
    assert.equal(forecast.sealedPacks, 1);
    approx(forecast.remainingGrams, 450);
    approx(forecast.daysLeft, 18);
    assert.equal(forecast.endsAt?.getTime(), day(30).getTime());
  });

  test('last pack is a flag, not a status', () => {
    const shelf = item({ tobaccoId: 't', packs: [...history(), pack({ id: 'b' })] });
    const forecast = shelfForecast(shelf, own(25), day(12), DEFAULT_SETTINGS);
    assert.equal(forecast.status, 'ok');
    assert.equal(forecast.last, true);
  });

  test('ending when days left fit into the lead time, together with last', () => {
    const shelf = item({ tobaccoId: 't', packs: [...history(), pack({ id: 'b' })] });
    const forecast = shelfForecast(shelf, own(25), day(14), DEFAULT_SETTINGS);
    approx(forecast.daysLeft, 6);
    assert.equal(forecast.status, 'ending');
    assert.equal(forecast.last, true);
  });

  test('check when an open pack should have run out', () => {
    const shelf = item({ tobaccoId: 't', packs: [...history(), pack({ id: 'b' }), pack({ id: 'c' })] });
    const forecast = shelfForecast(shelf, own(25), day(30), DEFAULT_SETTINGS);
    assert.equal(forecast.overdue, true);
    assert.equal(forecast.status, 'check');
    approx(forecast.remainingGrams, 250);
  });

  test('out when no sealed or open pack is left', () => {
    const shelf = item({ tobaccoId: 't', packs: [...history(), pack({ id: 'b', writtenOffAt: day(2) })] });
    const forecast = shelfForecast(shelf, own(25), day(12), DEFAULT_SETTINGS);
    assert.equal(forecast.status, 'out');
    assert.equal(forecast.guestAvailable, false);
    assert.equal(forecast.remainingGrams, 0);
    assert.equal(forecast.daysLeft, 0);
  });

  test('stop hides a stocked tobacco from guests', () => {
    const shelf = item({ tobaccoId: 't', stopped: true, packs: [pack({ id: 'a' })] });
    const forecast = shelfForecast(shelf, none, day(1), DEFAULT_SETTINGS);
    assert.equal(forecast.status, 'stop');
    assert.equal(forecast.guestAvailable, false);
  });

  test('stop without packs is out', () => {
    const shelf = item({ tobaccoId: 't', stopped: true, packs: history() });
    assert.equal(shelfForecast(shelf, none, day(12), DEFAULT_SETTINGS).status, 'out');
  });

  test('plan: never had a pack', () => {
    const planned = shelfForecast(item({ tobaccoId: 't', plan: true }), none, day(1), DEFAULT_SETTINGS);
    assert.equal(planned.status, 'plan');
    assert.equal(planned.guestAvailable, false);
    const ranOut = shelfForecast(item({ tobaccoId: 't', plan: true, packs: history() }), none, day(12), DEFAULT_SETTINGS);
    assert.equal(ranOut.status, 'out');
  });

  test('without a rate there is no date', () => {
    const shelf = item({ tobaccoId: 't', packs: [pack({ id: 'a' }), pack({ id: 'b' })] });
    const forecast = shelfForecast(shelf, none, day(3), DEFAULT_SETTINGS);
    assert.equal(forecast.status, 'ok');
    assert.equal(forecast.rate, null);
    assert.equal(forecast.rateKind, 'none');
    assert.equal(forecast.daysLeft, null);
    assert.equal(forecast.endsAt, null);
    approx(forecast.remainingGrams, 500);
  });
});

test.describe('forecastShelf', () => {
  test('falls back to the median of own rates of the same brand', () => {
    const items = [
      item({ tobaccoId: 'fast', brand: 'A', packs: [pack({ id: 'a', emptiedAt: day(10) }), pack({ id: 'b' })] }),
      item({ tobaccoId: 'slow', brand: 'A', packs: [pack({ id: 'c', emptiedAt: day(25) }), pack({ id: 'd' })] }),
      item({ tobaccoId: 'new', brand: 'A', packs: [pack({ id: 'e', receivedAt: day(26) })] }),
      item({ tobaccoId: 'alone', brand: 'B', packs: [pack({ id: 'f' })] }),
    ];
    const forecasts = forecastShelf(items, day(30), DEFAULT_SETTINGS);
    assert.deepEqual(
      forecasts.map((forecast) => [forecast.tobaccoId, forecast.rateKind, forecast.rate]),
      [
        ['fast', 'own', 25],
        ['slow', 'own', 10],
        ['new', 'brand', 17.5],
        ['alone', 'none', null],
      ],
    );
  });
});

// --- дашборд ---------------------------------------------------------------

test.describe('todayForecast', () => {
  test('sums rates of tobaccos with an open pack', () => {
    const items = [
      item({ tobaccoId: 'a', packs: [pack({ id: 'a1', emptiedAt: day(10) }), pack({ id: 'a2' })] }),
      item({ tobaccoId: 'b', packs: [pack({ id: 'b1', weight: 200, emptiedAt: day(20) }), pack({ id: 'b2' })] }),
      item({ tobaccoId: 'gone', packs: [pack({ id: 'g1', emptiedAt: day(5) })] }),
      item({ tobaccoId: 'fresh', brand: 'Другой', packs: [pack({ id: 'f1' })] }),
    ];
    const forecasts = forecastShelf(items, day(21), DEFAULT_SETTINGS);
    const today = todayForecast(forecasts, 18);
    approx(today.grams, 25 + 10);
    approx(today.bowls, 35 / 18);
  });
});

test.describe('reorderList', () => {
  test('keeps stocked and planned tobaccos that run out within the lead time', () => {
    const items = [
      item({ tobaccoId: 'ok', packs: [pack({ id: 'o1', emptiedAt: day(10) }), pack({ id: 'o2' }), pack({ id: 'o3' })] }),
      item({ tobaccoId: 'ending', packs: [pack({ id: 'e1', emptiedAt: day(10) }), pack({ id: 'e2' })] }),
      item({ tobaccoId: 'sooner', packs: [pack({ id: 's1', emptiedAt: day(5) }), pack({ id: 's2' })] }),
      item({ tobaccoId: 'casual', keepStocked: false, packs: [pack({ id: 'c1', emptiedAt: day(10) }), pack({ id: 'c2' })] }),
      item({ tobaccoId: 'out', packs: [pack({ id: 'x1', emptiedAt: day(14) })] }),
      item({ tobaccoId: 'casual-out', keepStocked: false, packs: [pack({ id: 'y1', emptiedAt: day(14) })] }),
      item({ tobaccoId: 'idea', brand: 'Новый', keepStocked: false, plan: true }),
      item({ tobaccoId: 'small', packWeight: 25, packs: [pack({ id: 'm1', weight: 25, emptiedAt: day(5) }), pack({ id: 'm2', weight: 25 })] }),
    ];
    const now = day(15);
    const forecasts = forecastShelf(items, now, DEFAULT_SETTINGS);
    const lines = reorderList(items, forecasts, DEFAULT_SETTINGS);
    assert.deepEqual(
      lines.map((line) => [line.tobaccoId, line.status, line.quantity, line.endsAt?.getTime() ?? null]),
      [
        // 250 г за 14 дней: ceil(250/14 × 21 / 250) = 2
        ['out', 'out', 2, now.getTime()],
        ['idea', 'plan', 1, null],
        // 50 г/день, со вскрытия 10 дней: остаток 0, «проверьте»; ceil(50 × 21 / 250) = 5
        ['sooner', 'check', 5, now.getTime()],
        // 25 г за 5 дней: остаток 0; ceil(5 × 21 / 25) = 5
        ['small', 'check', 5, now.getTime()],
        // 25 г/день, со вскрытия 5 дней: остаток 125 г, 5 дней
        ['ending', 'ending', 3, day(20).getTime()],
      ],
    );
  });
});

// --- деньги ----------------------------------------------------------------

test.describe('money', () => {
  test('gram price is pack price over weight', () => {
    assert.equal(gramPrice(pack({ id: 'a', price: 150_000 })), 600);
    assert.equal(gramPrice(pack({ id: 'a' })), null);
  });

  test('bowl cost averages gram prices of open packs with a price', () => {
    const packs = resolvePacks([
      pack({ id: 'a', price: 150_000 }),
      pack({ id: 'b', price: 10_000, openedAt: day(1) }),
      pack({ id: 'c', price: 999_999 }),
      pack({ id: 'd', openedAt: day(1) }),
    ]);
    // открыты a (600 коп/г), b (40 коп/г) и d без цены; c в запасе
    assert.equal(bowlCost(packs, 18), 18 * 320);
  });

  test('no priced open pack, no bowl cost', () => {
    assert.equal(bowlCost(resolvePacks([pack({ id: 'a' })]), 18), null);
  });
});
