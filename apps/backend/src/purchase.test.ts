import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appByTobacco,
  baseList,
  emptyCycles,
  fastList,
  idleList,
  profileShares,
  shelfMedianRate,
  trialRow,
  type JournalEntry,
} from './purchase';
import type { Rate } from './stock';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 1);
const day = (n: number) => new Date(START + n * DAY);

let seq = 0;
const entry = (kind: JournalEntry['kind'], grams: number, at: number, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `${kind}-${(seq += 1)}`,
  kind,
  grams,
  at: day(at),
  priceKop: null,
  ...extra,
});
const receipt = (grams: number, at: number, extra: Partial<JournalEntry> = {}) => entry('receipt', grams, at, extra);
const count = (grams: number, at: number) => entry('count', grams, at);
const empty = (at: number) => count(0, at);

const own = (gramsPerDay: number): Rate => ({ gramsPerDay, kind: 'own' });
const none: Rate = { gramsPerDay: null, kind: 'none' };

const approx = (actual: number | null | undefined, expected: number) => {
  assert.ok(actual !== null && actual !== undefined, 'ожидалось число');
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`);
};

test.describe('циклы «приход → Закончился»', () => {
  test('цикл от прихода до «Закончился», дни без табака — до следующего прихода', () => {
    const cycles = emptyCycles([receipt(200, 10), count(100, 11), empty(12), receipt(400, 15)], day(20));
    assert.equal(cycles.length, 1);
    const [cycle] = cycles;
    assert.equal(cycle.grams, 200);
    assert.deepEqual(cycle.receivedAt, day(10));
    assert.deepEqual(cycle.emptyAt, day(12));
    approx(cycle.goneDays, 2);
    approx(cycle.emptyDays, 3);
    assert.deepEqual(cycle.next, { at: day(15), grams: 400 });
    assert.equal(cycle.ongoing, false);
  });

  test('без следующего прихода — пустые дни идут до сейчас', () => {
    const [cycle] = emptyCycles([receipt(100, 10), empty(11)], day(14));
    approx(cycle.emptyDays, 3);
    assert.equal(cycle.next, null);
    assert.equal(cycle.ongoing, true);
  });

  test('несколько приходов до «Закончился» — один цикл с первого прихода, граммы суммируются', () => {
    const [cycle] = emptyCycles([receipt(200, 10), receipt(200, 11), empty(13)], day(14));
    assert.equal(cycle.grams, 400);
    approx(cycle.goneDays, 3);
  });

  test('стартовый приход цикл не открывает', () => {
    assert.deepEqual(emptyCycles([receipt(200, 0, { start: true }), empty(1)], day(5)), []);
    const [cycle] = emptyCycles([receipt(200, 0, { start: true }), receipt(100, 3), empty(4)], day(5));
    assert.equal(cycle.grams, 100);
    assert.deepEqual(cycle.receivedAt, day(3));
  });

  test('отрезок короче 6 ч не считается', () => {
    const journal = [receipt(200, 10), { ...empty(10), at: new Date(day(10).getTime() + 5 * HOUR) }];
    assert.deepEqual(emptyCycles(journal, day(12)), []);
  });

  test('без «Закончился» цикла нет, «Закончился» с поправкой в 30 минут не считается', () => {
    assert.deepEqual(emptyCycles([receipt(200, 10), count(50, 12)], day(14)), []);
    const corrected = [receipt(200, 10), empty(12), { ...count(40, 12), at: new Date(day(12).getTime() + 10 * 60_000) }];
    assert.deepEqual(emptyCycles(corrected, day(14)), []);
  });
});

test.describe('закончились быстро', () => {
  const now = day(70);

  test('за 60 дней, ушёл за ≤ 3 дня: последний быстрый цикл и сколько раз', () => {
    const rows = fastList(
      [
        {
          tobaccoId: 'mint',
          status: 'ok',
          entries: [receipt(200, 20), empty(22), receipt(200, 25), empty(28), receipt(300, 30), empty(50), receipt(250, 52)],
        },
        { tobaccoId: 'slow', status: 'ok', entries: [receipt(200, 20), empty(30)] },
        // Приход больше 60 дней назад — вне окна.
        { tobaccoId: 'old', status: 'ok', entries: [receipt(200, 5), empty(6), receipt(200, 40)] },
      ],
      now,
    );
    assert.deepEqual(rows.map((row) => row.tobaccoId), ['mint']);
    const [mint] = rows;
    assert.equal(mint.times, 2);
    assert.deepEqual(mint.receivedAt, day(25));
    approx(mint.goneDays, 3);
    approx(mint.emptyDays, 2);
    assert.deepEqual(mint.next, { at: day(30), grams: 300 });
    assert.equal(mint.status, 'ok');
  });

  test('сначала то, чего нет сейчас, затем по дням без табака', () => {
    const rows = fastList(
      [
        { tobaccoId: 'short', status: 'ok', entries: [receipt(100, 40), empty(41), receipt(100, 42)] },
        { tobaccoId: 'long', status: 'ending', entries: [receipt(100, 40), empty(41), receipt(100, 50)] },
        { tobaccoId: 'out', status: 'out', entries: [receipt(100, 66), empty(68)] },
      ],
      now,
    );
    assert.deepEqual(rows.map((row) => row.tobaccoId), ['out', 'long', 'short']);
    assert.equal(rows[0].ongoing, true);
  });
});

test.describe('медиана расхода полки', () => {
  test('по своим расходам; меньше трёх — мало данных', () => {
    assert.equal(shelfMedianRate([own(4), none, own(10), own(20), { gramsPerDay: 99, kind: 'brand' }]), 10);
    assert.equal(shelfMedianRate([own(4), own(10), none]), null);
  });
});

test.describe('проба', () => {
  test('скорость к медиане полки, первый приход и за сколько ушла', () => {
    const row = trialRow(
      { rate: own(25), entries: [receipt(25, 50), empty(52), receipt(100, 55)], firstReceipt: { at: day(50), grams: 25 } },
      10,
      day(60),
    );
    approx(row.speed, 2.5);
    assert.equal(row.rate, 25);
    assert.equal(row.receiptGrams, 25);
    assert.deepEqual(row.receivedAt, day(50));
    approx(row.goneDays, 2);
  });

  test('без отметок остатка или без медианы — мало данных', () => {
    const fresh = trialRow({ rate: none, entries: [receipt(400, 60)], firstReceipt: { at: day(60), grams: 400 } }, 10, day(61));
    assert.equal(fresh.speed, null);
    assert.equal(fresh.rate, null);
    assert.equal(fresh.goneDays, null);
    assert.equal(trialRow({ rate: own(5), entries: [], firstReceipt: { at: day(60), grams: 25 } }, null, day(61)).speed, null);
  });
});

test.describe('лежит', () => {
  const now = day(60);
  const base = { keepStocked: true, stopped: false, inStock: true, leftGrams: 300, gramPriceKop: 750 };

  test('в наличии, приход больше 21 дня назад, расход за 21 день меньше 2 г/день', () => {
    const result = idleList(
      [
        // 300 г почти не тронуты: 30 г за 30 дней.
        { ...base, tobaccoId: 'pear', entries: [receipt(330, 20), count(300, 50)] },
        // 5 г/день — не лежит.
        { ...base, tobaccoId: 'mint', entries: [receipt(400, 20), count(250, 50)] },
        // Пришёл 10 дней назад.
        { ...base, tobaccoId: 'fresh', entries: [receipt(300, 50), count(300, 55)] },
        // На стопе.
        { ...base, tobaccoId: 'stop', stopped: true, entries: [receipt(330, 20), count(300, 50)] },
        // Нет в наличии.
        { ...base, tobaccoId: 'gone', inStock: false, entries: [receipt(330, 20), empty(50)] },
        // Без цены грамма.
        { ...base, tobaccoId: 'cola', gramPriceKop: null, leftGrams: 200, entries: [receipt(200, 10), count(200, 40)] },
      ],
      now,
    );
    assert.deepEqual(result.rows.map((row) => row.tobaccoId), ['pear', 'cola']);
    const [pear, cola] = result.rows;
    approx(pear.rate21, 1);
    assert.equal(pear.rubKop, 300 * 750);
    assert.equal(pear.leftGrams, 300);
    assert.deepEqual(pear.receivedAt, day(20));
    approx(pear.days, 40);
    assert.equal(pear.keepStocked, true);
    approx(cola.rate21, 0);
    assert.equal(cola.rubKop, null);
    assert.equal(result.totalKop, 300 * 750);
    assert.equal(result.unknownPriceCount, 1);
    assert.equal(result.unmarkedCount, 0);
  });

  test('без отметок остатка расход за 21 день неизвестен — не «лежит», а считается отдельно', () => {
    const result = idleList([{ ...base, tobaccoId: 'quiet', entries: [receipt(300, 10)] }], now);
    assert.deepEqual(result.rows, []);
    assert.equal(result.unmarkedCount, 1);
  });

  test('сортировка по деньгам в остатке', () => {
    const result = idleList(
      [
        { ...base, tobaccoId: 'cheap', gramPriceKop: 500, entries: [receipt(300, 10), count(300, 50)] },
        { ...base, tobaccoId: 'dear', gramPriceKop: 900, entries: [receipt(300, 10), count(300, 50)] },
      ],
      now,
    );
    assert.deepEqual(result.rows.map((row) => row.tobaccoId), ['dear', 'cheap']);
  });
});

test.describe('база', () => {
  const row = (tobaccoId: string, gramsPerDay: number | null, keepStocked: boolean, kind: Rate['kind'] = 'own') => ({
    tobaccoId,
    keepStocked,
    rate: gramsPerDay === null ? none : ({ gramsPerDay, kind } as Rate),
    gramPriceKop: 8,
  });

  test('расход в месяц, доля, ₽ в месяц; подсказки по расходу', () => {
    const result = baseList([
      row('mint', 21, true),
      row('pinkman', 15, false),
      row('low', 9, false),
      row('mango', 11, true),
      row('gummy', 1, true),
      row('new', null, true),
      row('brand', 12, false, 'brand'),
    ]);
    assert.equal(result.enough, true);
    // Медиана своих расходов (21, 15, 9, 11, 1) — 11 г/день = 330 г/мес.
    assert.equal(result.medianMonthGrams, 330);
    assert.deepEqual(result.rows.map((line) => line.tobaccoId), ['mint', 'pinkman', 'brand', 'mango', 'low', 'gummy', 'new']);
    const by = new Map(result.rows.map((line) => [line.tobaccoId, line]));
    approx(by.get('mint')!.monthGrams, 630);
    approx(by.get('mint')!.share, 21 / 57);
    approx(by.get('mint')!.rubKop, 630 * 8);
    assert.equal(by.get('pinkman')!.flag, 'notBase');
    assert.equal(by.get('low')!.flag, null);
    assert.equal(by.get('mango')!.flag, null);
    assert.equal(by.get('gummy')!.flag, 'idleBase');
    // По бренду — оценка без доли и подсказок; без истории — мало данных.
    approx(by.get('brand')!.monthGrams, 360);
    assert.equal(by.get('brand')!.share, null);
    assert.equal(by.get('brand')!.flag, null);
    assert.equal(by.get('new')!.monthGrams, null);
    assert.equal(by.get('new')!.rubKop, null);
    assert.equal(by.get('new')!.flag, null);
    assert.deepEqual(result.counts, { notBase: 1, idleBase: 1 });
  });

  test('меньше трёх табаков со своим расходом — мало данных, без подсказок', () => {
    const result = baseList([row('mint', 21, false), row('gummy', 0, true)]);
    assert.equal(result.enough, false);
    assert.ok(result.rows.every((line) => line.flag === null));
  });
});

test.describe('вкусы', () => {
  test('доли расхода, полки и приложения; табак с двумя направлениями делится пополам', () => {
    const result = profileShares({
      spend: [
        { profiles: ['berry'], grams: 300 },
        { profiles: ['berry', 'Fruity'], grams: 260 },
        { profiles: ['dessert'], grams: 100 },
        { profiles: ['minty'], grams: 0 },
      ],
      shelf: [{ profiles: ['berry'] }, { profiles: ['fruity'] }, { profiles: ['dessert'] }, { profiles: ['dessert', 'minty'] }],
      app: [{ profiles: ['berry'] }, { profiles: ['fruity', 'berry'] }],
    });
    assert.equal(result.enough, true);
    assert.equal(result.appEvents, 2);
    assert.deepEqual(result.rows.map((row) => row.key), ['berry', 'fruity', 'dessert', 'minty']);
    const by = new Map(result.rows.map((row) => [row.key, row]));
    approx(by.get('berry')!.spend, 430 / 660);
    approx(by.get('berry')!.shelf, 1 / 4);
    approx(by.get('berry')!.app, 3 / 4);
    approx(by.get('dessert')!.shelf, 1.5 / 4);
    assert.equal(by.get('berry')!.flag, 'more');
    assert.equal(by.get('dessert')!.flag, 'less');
    assert.equal(by.get('fruity')!.flag, null);
    assert.equal(by.get('minty')!.flag, 'less');
  });

  test('мало расхода — без подсказок; без событий приложения доля приложения — ноль', () => {
    const result = profileShares({ spend: [{ profiles: ['berry'], grams: 100 }], shelf: [{ profiles: ['dessert'] }], app: [] });
    assert.equal(result.enough, false);
    assert.equal(result.appEnough, false);
    assert.ok(result.rows.every((row) => row.flag === null && row.app === 0));
  });
});

test.describe('в приложении', () => {
  test('«Покурить» по миксам каталога и «Намиксуй», средняя оценка миксов', () => {
    const stats = appByTobacco({
      components: [
        { mixId: 'm1', tobaccoId: 'mint' },
        { mixId: 'm1', tobaccoId: 'berry' },
        { mixId: 'm2', tobaccoId: 'mint' },
      ],
      events: [{ mixId: 'm1' }, { mixId: 'm1' }, { mixId: 'm2' }, { mixId: null }, { mixId: 'gone' }],
      custom: [{ tobaccoIds: ['mint', 'apple'] }, { tobaccoIds: ['berry'] }],
      ratings: [
        { mixId: 'm1', avg: 4, count: 1 },
        { mixId: 'm2', avg: 5, count: 3 },
      ],
    });
    assert.deepEqual(stats.get('mint'), { smokes: 4, rating: 4.75, ratings: 4 });
    assert.deepEqual(stats.get('berry'), { smokes: 3, rating: 4, ratings: 1 });
    assert.deepEqual(stats.get('apple'), { smokes: 1, rating: null, ratings: 0 });
    assert.equal(stats.get('peach'), undefined);
  });
});
