import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bowlCost,
  consumptionByPeriod,
  consumptionRate,
  forecastShelf,
  fractionGrams,
  gramPrice,
  reorderList,
  segments,
  shelfForecast,
  stockState,
  todayForecast,
  weekdayFactor,
  withBrandFallback,
  DEFAULT_SETTINGS,
  type Rate,
  type ShelfItem,
  type StockEntry,
} from './stock';

const DAY = 86_400_000;
const START = Date.UTC(2026, 10, 1);
const day = (n: number) => new Date(START + n * DAY);

let seq = 0;
const entry = (kind: StockEntry['kind'], grams: number, at: number, priceKop: number | null = null): StockEntry => ({
  id: `${kind}-${(seq += 1)}`,
  kind,
  grams,
  at: day(at),
  priceKop,
});
const receipt = (grams: number, at: number, priceKop: number | null = null) => entry('receipt', grams, at, priceKop);
const count = (grams: number, at: number) => entry('count', grams, at);
const writeoff = (grams: number, at: number) => entry('writeoff', grams, at);

const item = (overrides: Partial<ShelfItem> & { tobaccoId: string }): ShelfItem => ({
  brand: 'Тест',
  keepStocked: true,
  plan: false,
  stopped: false,
  entries: [],
  ...overrides,
});

const own = (gramsPerDay: number): Rate => ({ gramsPerDay, kind: 'own' });
const none: Rate = { gramsPerDay: null, kind: 'none' };

const approx = (actual: number | null, expected: number) => {
  assert.ok(actual !== null, 'ожидалось число');
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
};

const shape = (entries: StockEntry[]) =>
  segments(entries).map((segment) => [segment.from, segment.to, segment.grams, segment.excluded]);

// --- отрезки -----------------------------------------------------------------

test.describe('segments', () => {
  test('first receipt starts the scale, a count closes a segment', () => {
    assert.deepEqual(shape([receipt(400, 0), count(200, 10)]), [[day(0).getTime(), day(10).getTime(), 200, false]]);
  });

  test('receipts and write-offs between counts: was + came − written off − is', () => {
    const entries = [receipt(400, 0), count(300, 5), receipt(250, 7), writeoff(50, 8), count(400, 10)];
    assert.deepEqual(shape(entries).map(([, , grams]) => grams), [100, 100]);
  });

  test('«Закончился» is a count of zero', () => {
    assert.deepEqual(shape([receipt(250, 0), count(0, 10)]), [[day(0).getTime(), day(10).getTime(), 250, false]]);
  });

  test('days at zero do not count: after «Закончился» the scale restarts at the receipt', () => {
    const entries = [receipt(250, 0), count(0, 10), receipt(400, 15), count(200, 25)];
    assert.deepEqual(shape(entries), [
      [day(0).getTime(), day(10).getTime(), 250, false],
      [day(15).getTime(), day(25).getTime(), 200, false],
    ]);
  });

  test('a count above what could be left is kept but excluded', () => {
    const entries = [receipt(400, 0), count(100, 10), count(300, 12), count(200, 20)];
    assert.deepEqual(shape(entries), [
      [day(0).getTime(), day(10).getTime(), 300, false],
      [day(10).getTime(), day(12).getTime(), -200, true],
      [day(12).getTime(), day(20).getTime(), 100, false],
    ]);
  });

  test('a segment remembers the count that closed it', () => {
    const closing = count(200, 10);
    assert.equal(segments([receipt(400, 0), closing])[0].closedBy, closing.id);
  });

  test('entries are taken in time order, ties keep input order', () => {
    const entries = [count(200, 10), receipt(400, 0)];
    assert.deepEqual(shape(entries).map(([, , grams]) => grams), [200]);
  });

  test('a count within 30 minutes after another one replaces it', () => {
    const half = count(200, 10);
    const exact = { ...count(180, 10), at: new Date(day(10).getTime() + 5 * 60_000) };
    const result = segments([receipt(400, 0), half, exact]);
    assert.deepEqual(result.map((segment) => [segment.from, segment.to, segment.grams, segment.closedBy]), [
      [day(0).getTime(), exact.at.getTime(), 220, exact.id],
    ]);
  });

  test('a receipt in between keeps both counts', () => {
    const later = { ...count(300, 10), at: new Date(day(10).getTime() + 5 * 60_000) };
    const entries = [receipt(400, 0), count(200, 10), { ...receipt(100, 10), at: new Date(day(10).getTime() + 60_000) }, later];
    assert.deepEqual(shape(entries).map(([, , grams]) => grams), [200, 0]);
  });

  test('a segment shorter than 6 hours says nothing about the rate', () => {
    const quick = { ...count(240, 0), at: new Date(day(0).getTime() + 60 * 60_000) };
    assert.deepEqual(shape([receipt(250, 0), quick]), [[day(0).getTime(), quick.at.getTime(), 10, true]]);
  });

  test('a count before any receipt starts the scale', () => {
    assert.deepEqual(shape([count(300, 0), count(100, 10)]).map(([, , grams]) => grams), [200]);
  });
});

// --- расход ------------------------------------------------------------------

test.describe('consumptionRate', () => {
  test('grams over days of finished segments', () => {
    const entries = [receipt(400, 0), count(200, 10), count(0, 30)];
    assert.deepEqual(consumptionRate(entries, day(40)), own(400 / 30));
  });

  test('the running segment does not count', () => {
    assert.deepEqual(consumptionRate([receipt(400, 0)], day(40)), none);
  });

  test('days at zero waiting for a delivery are not days of consumption', () => {
    const entries = [receipt(250, 0), count(0, 10), receipt(250, 20), count(0, 30)];
    assert.deepEqual(consumptionRate(entries, day(40)), own(500 / 20));
  });

  test('only the last 60 days count, a straddling segment proportionally', () => {
    const entries = [receipt(400, 0), count(200, 20), count(0, 40)];
    // окно с 10-го дня: половина первого отрезка (100 г за 10 дней) и весь второй
    approx(consumptionRate(entries, day(70)).gramsPerDay, 300 / 30);
  });

  test('excluded segments give neither grams nor days', () => {
    const entries = [receipt(400, 0), count(100, 10), count(300, 12), count(200, 20)];
    approx(consumptionRate(entries, day(30)).gramsPerDay, 400 / 18);
  });

  test('segments older than the window mean no data', () => {
    assert.deepEqual(consumptionRate([receipt(400, 0), count(0, 10)], day(100)), none);
  });

  test('written-off grams are not consumption', () => {
    const entries = [receipt(400, 0), writeoff(100, 5), count(100, 10)];
    approx(consumptionRate(entries, day(20)).gramsPerDay, 200 / 10);
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

// --- остаток -----------------------------------------------------------------

test.describe('stockState', () => {
  test('nothing received: no stock and no level', () => {
    assert.deepEqual(stockState([], 10, day(5)), { received: false, bookGrams: 0, leftGrams: null, fullGrams: null, spent: false });
  });

  test('left: last count + receipts − write-offs − rate × days since the count', () => {
    const entries = [receipt(400, 0), count(300, 10), receipt(200, 12), writeoff(50, 13)];
    const state = stockState(entries, 10, day(15));
    assert.equal(state.bookGrams, 450);
    assert.equal(state.leftGrams, 400);
  });

  test('without a rate the book is what is left', () => {
    assert.equal(stockState([receipt(400, 0), count(300, 10)], null, day(15)).leftGrams, 300);
  });

  test('never below zero', () => {
    assert.equal(stockState([receipt(100, 0)], 10, day(30)).leftGrams, 0);
  });

  test('full is the level right after the last receipt', () => {
    // к 10-му дню по расчёту осталось 400 − 10 × 10 = 300, пришло ещё 250
    assert.equal(stockState([receipt(400, 0), receipt(250, 10)], 10, day(12)).fullGrams, 550);
  });

  test('after «Закончился» the next receipt is the whole level', () => {
    assert.equal(stockState([receipt(400, 0), count(0, 5), receipt(250, 10)], 10, day(12)).fullGrams, 250);
  });

  test('a count above the level raises it', () => {
    assert.equal(stockState([receipt(200, 0), count(300, 5)], 10, day(6)).fullGrams, 300);
  });

  test('spent: the estimate went below the book because of consumption', () => {
    assert.equal(stockState([receipt(400, 0)], 10, day(5)).spent, true);
    assert.equal(stockState([receipt(400, 0)], null, day(5)).spent, false);
  });

  test('«Закончился» and a full write-off empty the book', () => {
    assert.equal(stockState([receipt(400, 0), count(0, 5)], 10, day(6)).bookGrams, 0);
    assert.equal(stockState([receipt(400, 0), writeoff(400, 5)], 10, day(6)).bookGrams, 0);
  });
});

test.describe('fractionGrams', () => {
  test('a share of the level after the receipt, whole grams', () => {
    assert.equal(fractionGrams(400, 0.5), 200);
    assert.equal(fractionGrams(400, 1 / 3), 133);
  });
});

// --- прогноз -----------------------------------------------------------------

test.describe('shelfForecast', () => {
  const now = day(20);
  const settings = DEFAULT_SETTINGS;

  test('ok: left, days and date', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0), count(300, 10)] }), own(10), now, settings);
    assert.equal(forecast.status, 'ok');
    assert.equal(forecast.leftGrams, 200);
    assert.equal(forecast.fullGrams, 400);
    approx(forecast.daysLeft, 20);
    assert.equal(forecast.endsAt?.getTime(), day(40).getTime());
    assert.equal(forecast.guestAvailable, true);
    assert.equal(forecast.inStock, true);
  });

  test('ending when days left fit into the lead time', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0), count(100, 15)] }), own(10), now, settings);
    assert.equal(forecast.status, 'ending');
  });

  test('check when the estimate fell below 10 % of the level', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0), count(100, 10)] }), own(9), now, settings);
    assert.equal(forecast.leftGrams, 10);
    assert.equal(forecast.status, 'check');
    assert.equal(forecast.guestAvailable, true);
  });

  test('a fresh low count is not a reason to check', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0), count(20, 20)] }), own(10), now, settings);
    assert.equal(forecast.status, 'ending');
  });

  test('out after «Закончился»: hidden from guests', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0), count(0, 10)] }), own(10), now, settings);
    assert.equal(forecast.status, 'out');
    assert.equal(forecast.leftGrams, 0);
    assert.equal(forecast.guestAvailable, false);
    assert.equal(forecast.inStock, false);
  });

  test('the forecast alone never hides a tobacco', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(100, 0)] }), own(10), now, settings);
    assert.equal(forecast.leftGrams, 0);
    assert.equal(forecast.guestAvailable, true);
  });

  test('stop hides a stocked tobacco from guests', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', stopped: true, entries: [receipt(400, 0)] }), none, now, settings);
    assert.equal(forecast.status, 'stop');
    assert.equal(forecast.guestAvailable, false);
    assert.equal(forecast.inStock, true);
  });

  test('plan: never received', () => {
    assert.equal(shelfForecast(item({ tobaccoId: 't', plan: true }), none, now, settings).status, 'plan');
    assert.equal(shelfForecast(item({ tobaccoId: 't' }), none, now, settings).status, 'out');
  });

  test('without a rate there is no date', () => {
    const forecast = shelfForecast(item({ tobaccoId: 't', entries: [receipt(400, 0)] }), none, now, settings);
    assert.equal(forecast.status, 'ok');
    assert.equal(forecast.daysLeft, null);
    assert.equal(forecast.endsAt, null);
  });
});

test.describe('forecastShelf', () => {
  test('falls back to the median of own rates of the same brand', () => {
    const items = [
      item({ tobaccoId: 'a', brand: 'X', entries: [receipt(400, 0), count(200, 10)] }),
      item({ tobaccoId: 'b', brand: 'X', entries: [receipt(400, 0), count(0, 10)] }),
      item({ tobaccoId: 'c', brand: 'X', entries: [receipt(400, 15)] }),
      item({ tobaccoId: 'd', brand: 'Y', entries: [receipt(400, 15)] }),
    ];
    const [, , c, d] = forecastShelf(items, day(20), DEFAULT_SETTINGS);
    assert.equal(c.rateKind, 'brand');
    approx(c.rate, 30);
    assert.equal(d.rateKind, 'none');
  });
});

test.describe('todayForecast', () => {
  test('sums rates of tobaccos in stock, stop included', () => {
    const items = [
      item({ tobaccoId: 'a', entries: [receipt(400, 0), count(300, 10)] }),
      item({ tobaccoId: 'b', stopped: true, entries: [receipt(400, 0), count(200, 10)] }),
      item({ tobaccoId: 'c', entries: [receipt(400, 0), count(0, 10)] }),
    ];
    const today = todayForecast(forecastShelf(items, day(12), DEFAULT_SETTINGS), 18);
    approx(today.grams, 10 + 20);
    approx(today.bowls, 30 / 18);
  });
});

test.describe('reorderList', () => {
  test('needs for 21 days minus what is left, rounded up to 50 g', () => {
    const items = [
      // расход 16 г/день, к 20-му дню осталось 80 г: 16 × 21 − 80 = 256 → 300
      item({ tobaccoId: 'ending', entries: [receipt(400, 0), count(96, 19)] }),
      item({ tobaccoId: 'out', entries: [receipt(250, 0), count(0, 10)] }),
      item({ tobaccoId: 'plan', plan: true, keepStocked: false }),
      item({ tobaccoId: 'enough', entries: [receipt(1000, 0), count(900, 10)] }),
      item({ tobaccoId: 'not-kept', keepStocked: false, entries: [receipt(250, 0), count(0, 10)] }),
    ];
    const lines = reorderList(items, forecastShelf(items, day(20), DEFAULT_SETTINGS), DEFAULT_SETTINGS);
    assert.deepEqual(lines.map((line) => [line.tobaccoId, line.status, line.quantityGrams]), [
      ['out', 'out', 550],
      // своего расхода нет — медиана бренда (16, 25, 10, 25 → 20,5) × 21 = 430,5 → 450
      ['plan', 'plan', 450],
      ['ending', 'ending', 300],
    ]);
  });

  test('without a rate orders what came last time', () => {
    const items = [item({ tobaccoId: 'a', entries: [receipt(375, 0), count(0, 0)] })];
    const [line] = reorderList(items, forecastShelf(items, day(1), DEFAULT_SETTINGS), DEFAULT_SETTINGS);
    assert.equal(line.quantityGrams, 400);
  });
});

// --- деньги ------------------------------------------------------------------

test.describe('money', () => {
  test('gram price comes from the last priced receipt', () => {
    approx(gramPrice([receipt(400, 0, 300_000), receipt(250, 5, 200_000), receipt(100, 6)]), 800);
    assert.equal(gramPrice([receipt(400, 0)]), null);
  });

  test('bowl cost averages gram prices that are known', () => {
    approx(bowlCost([700, null, 900], 18), 18 * 800);
    assert.equal(bowlCost([null], 18), null);
  });
});

test.describe('consumptionByPeriod', () => {
  test('a segment spreads evenly over its days', () => {
    const entries = [receipt(400, 0), count(0, 20)];
    assert.deepEqual(consumptionByPeriod(entries, [{ from: day(0), to: day(10) }, { from: day(10), to: day(30) }]), [200, 200]);
  });

  test('excluded segments and the running one give nothing', () => {
    const entries = [receipt(400, 0), count(100, 10), count(300, 12)];
    assert.deepEqual(consumptionByPeriod(entries, [{ from: day(0), to: day(30) }]), [300]);
  });
});

test.describe('weekdayFactor', () => {
  // Четверг 12 февраля 2026; окно — 28 полных дней с 15 января (тоже четверг).
  const NOW = new Date(2026, 1, 12, 15);
  const WINDOW_START = new Date(2026, 0, 15);
  const local = (dayOfJanuary: number, hour: number) => new Date(2026, 0, dayOfJanuary, hour);

  // По два события в каждый день окна и ещё по два — по четвергам.
  const events = () => {
    const result: Date[] = [];
    for (let offset = 0; offset < 28; offset += 1) {
      result.push(local(15 + offset, 12), local(15 + offset, 20));
      if (offset % 7 === 0) result.push(local(15 + offset, 21), local(15 + offset, 22));
    }
    return result;
  };

  test('share of this weekday against the average day', () => {
    // четверг: 4 события в день, средний день — 64 / 28
    approx(weekdayFactor(events(), WINDOW_START, NOW), 4 / (64 / 28));
  });

  test('today and events before the window are not counted', () => {
    const extra = [new Date(2026, 1, 12, 10), local(10, 12), local(14, 23)];
    approx(weekdayFactor([...events(), ...extra], local(1, 0), NOW), 4 / (64 / 28));
  });

  test('less than four full weeks of data gives no factor', () => {
    assert.equal(weekdayFactor(events(), new Date(2026, 0, 15, 0, 1), NOW), null);
    assert.equal(weekdayFactor([], null, NOW), null);
  });

  test('fewer than 50 events give no factor', () => {
    const sparse = events().slice(0, 49);
    assert.equal(weekdayFactor(sparse, WINDOW_START, NOW), null);
  });
});
