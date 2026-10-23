import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePurchaseView } from './contracts';

const tobacco = { id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' };

test('normalizePurchaseView: все разделы «Закупки» как в ответе S2', () => {
  const view = normalizePurchaseView({
    since: '2026-11-16T09:00:00.000Z',
    budget: { budgetKop: 15000000, baseKop: 11200000, baseCount: 214, unknownCount: 9, leftKop: 3800000 },
    spend: { month: '2026-11', totalKop: 8721600 },
    base: {
      enough: true,
      medianMonthGrams: 300,
      counts: { notBase: 2, idleBase: 1 },
      rows: [
        {
          tobacco,
          monthGrams: 630,
          rateKind: 'own',
          share: 0.039,
          rubKop: 488000,
          gramPriceKop: 775,
          app: { smokes: 14, rating: 4.6, ratings: 5 },
          keepStocked: true,
          flag: null,
        },
        { tobacco, monthGrams: 450, rateKind: 'own', share: 0.028, keepStocked: false, flag: 'notBase' },
      ],
    },
    fast: {
      enough: true,
      rows: [
        {
          tobacco,
          receiptGrams: 100,
          receivedAt: '2026-11-14T10:00:00.000Z',
          goneDays: 2.2,
          emptyAt: '2026-11-16T15:00:00.000Z',
          emptyDays: 2.9,
          ongoing: true,
          next: null,
          times: 2,
          status: 'out',
        },
        {
          tobacco,
          receiptGrams: 250,
          receivedAt: '2026-11-02T10:00:00.000Z',
          goneDays: 1.8,
          emptyAt: '2026-11-04T10:00:00.000Z',
          emptyDays: 8,
          ongoing: false,
          next: { grams: 500, at: '2026-11-12T10:00:00.000Z' },
          times: 1,
          status: 'ok',
        },
      ],
    },
    trials: {
      enough: true,
      medianRate: 10,
      rows: [
        {
          tobacco,
          receiptGrams: 25,
          receivedAt: '2026-11-14T10:00:00.000Z',
          rate: 28,
          speed: 2.8,
          goneDays: 2,
          app: { smokes: 3, rating: 4.8, ratings: 4 },
          mixCount: 1,
          trialVerdict: 'yes',
          trialMarkedAt: '2026-11-18T10:00:00.000Z',
        },
      ],
    },
    idle: {
      enough: true,
      totalKop: 925000,
      unknownPriceCount: 1,
      unmarkedCount: 3,
      rows: [
        { tobacco, leftGrams: 480, rate21: 1, rubKop: 360000, receivedAt: '2026-10-15T10:00:00.000Z', days: 35.2, keepStocked: true },
      ],
    },
    profiles: {
      enough: true,
      appEvents: 42,
      appEnough: true,
      rows: [{ key: 'berry', spend: 0.22, shelf: 0.14, app: 0.3, flag: 'more' }],
    },
  });

  assert.equal(view.since, '2026-11-16T09:00:00.000Z');
  assert.deepEqual(view.budget, { budgetKop: 15000000, baseKop: 11200000, baseCount: 214, unknownCount: 9, leftKop: 3800000 });
  assert.deepEqual(view.spend, { month: '2026-11', totalKop: 8721600 });

  assert.equal(view.base.enough, true);
  assert.equal(view.base.medianMonthGrams, 300);
  assert.deepEqual(view.base.counts, { notBase: 2, idleBase: 1 });
  assert.deepEqual(view.base.rows[0], {
    tobacco,
    monthGrams: 630,
    rateKind: 'own',
    share: 0.039,
    rubKop: 488000,
    gramPriceKop: 775,
    app: { smokes: 14, rating: 4.6, ratings: 5 },
    keepStocked: true,
    flag: null,
  });
  assert.deepEqual(view.base.rows[1].app, { smokes: 0, rating: null, ratings: 0 });
  assert.equal(view.base.rows[1].rubKop, null);
  assert.equal(view.base.rows[1].flag, 'notBase');

  assert.deepEqual(view.fast.rows[0], {
    tobacco,
    receiptGrams: 100,
    receivedAt: '2026-11-14T10:00:00.000Z',
    goneDays: 2.2,
    emptyAt: '2026-11-16T15:00:00.000Z',
    emptyDays: 2.9,
    ongoing: true,
    next: null,
    times: 2,
    status: 'out',
  });
  assert.deepEqual(view.fast.rows[1].next, { grams: 500, at: '2026-11-12T10:00:00.000Z' });

  assert.equal(view.trials.medianRate, 10);
  assert.deepEqual(view.trials.rows[0], {
    tobacco,
    receiptGrams: 25,
    receivedAt: '2026-11-14T10:00:00.000Z',
    rate: 28,
    speed: 2.8,
    goneDays: 2,
    app: { smokes: 3, rating: 4.8, ratings: 4 },
    mixCount: 1,
    trialVerdict: 'yes',
    trialMarkedAt: '2026-11-18T10:00:00.000Z',
  });

  assert.deepEqual(view.idle, {
    enough: true,
    totalKop: 925000,
    unknownPriceCount: 1,
    unmarkedCount: 3,
    rows: [
      { tobacco, leftGrams: 480, rate21: 1, rubKop: 360000, receivedAt: '2026-10-15T10:00:00.000Z', days: 35.2, keepStocked: true },
    ],
  });

  assert.deepEqual(view.profiles, {
    enough: true,
    appEvents: 42,
    appEnough: true,
    rows: [{ key: 'berry', spend: 0.22, shelf: 0.14, app: 0.3, flag: 'more' }],
  });
});

test('normalizePurchaseView переживает пустой и битый ответ: данных мало во всех разделах', () => {
  const view = normalizePurchaseView(null);
  assert.equal(view.since, null);
  assert.deepEqual(view.budget, { budgetKop: null, baseKop: 0, baseCount: 0, unknownCount: 0, leftKop: null });
  assert.deepEqual(view.spend, { month: '', totalKop: 0 });
  assert.deepEqual(view.base, { enough: false, medianMonthGrams: null, counts: { notBase: 0, idleBase: 0 }, rows: [] });
  assert.deepEqual(view.fast, { enough: false, rows: [] });
  assert.deepEqual(view.trials, { enough: false, medianRate: null, rows: [] });
  assert.deepEqual(view.idle, { enough: false, totalKop: 0, unknownPriceCount: 0, unmarkedCount: 0, rows: [] });
  assert.deepEqual(view.profiles, { enough: false, appEvents: 0, appEnough: false, rows: [] });

  const broken = normalizePurchaseView({
    base: { enough: true, rows: [{ tobacco, rateKind: 'weird', flag: 'other', keepStocked: 'yes' }] },
    trials: { enough: true, rows: [{ tobacco, trialVerdict: 'maybe' }] },
    fast: { enough: true, rows: [{ tobacco, status: 'gone' }] },
    profiles: { enough: true, rows: [{ key: 'berry', flag: 'huge' }, 'мусор'] },
  });
  assert.equal(broken.base.rows[0].rateKind, 'none');
  assert.equal(broken.base.rows[0].flag, null);
  assert.equal(broken.base.rows[0].keepStocked, false);
  assert.equal(broken.trials.rows[0].trialVerdict, null);
  assert.equal(broken.fast.rows[0].status, 'ok');
  assert.deepEqual(broken.profiles.rows, [{ key: 'berry', spend: 0, shelf: 0, app: 0, flag: null }]);
});
