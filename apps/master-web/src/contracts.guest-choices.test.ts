import test from 'node:test';
import assert from 'node:assert/strict';
import { guestChoicesQuery, normalizeGuestChoices } from './contracts';

test('normalizeGuestChoices: ответ /staff/dashboard/choices целиком', () => {
  const choices = normalizeGuestChoices({
    period: { key: '30d', from: '2026-10-06', to: '2026-11-04', days: 30, bucket: 'day' },
    kpi: { choices: 621, ownMixes: 121, mixesChosen: 58, mixesOnShowcase: 64, avgRating: 4.6, ratingsCount: 87 },
    timeline: [{ date: '2026-10-06', catalog: 12, own: 2 }],
    topTobaccos: [
      { tobaccoId: 't1', manufacturer: 'Black Burn', name: 'Cane Mint', choices: 81, stock: 'out', trial: false },
      { tobaccoId: 't2', manufacturer: 'Darkside', name: 'Red Tea', choices: 96, stock: 'strange', trial: 'yes' },
    ],
    topMixes: [
      { mixId: 'm1', mixName: 'Melon Cola', choices: 33, avgRating: 4.2, status: 'blocked' },
      { mixId: null, mixName: 'Удалённый', choices: 3, avgRating: null, status: null },
    ],
    profiles: [{ key: 'berry', label: 'Ягодные', share: 24 }],
    signals: {
      outPopular: [{ tobaccoId: 't1', name: 'Cane Mint' }],
      hiddenMixes: [{ mixId: 'm1', mixName: 'Melon Cola' }],
      emptyRails: [{ railId: 'r1', name: 'Новинки' }],
    },
  });

  assert.deepEqual(choices.period, { key: '30d', from: '2026-10-06', to: '2026-11-04', days: 30, bucket: 'day' });
  assert.deepEqual(choices.kpi, { choices: 621, ownMixes: 121, mixesChosen: 58, mixesOnShowcase: 64, avgRating: 4.6, ratingsCount: 87 });
  assert.deepEqual(choices.timeline, [{ date: '2026-10-06', catalog: 12, own: 2 }]);
  assert.deepEqual([choices.topTobaccos[0].stock, choices.topTobaccos[0].trial], ['out', false]);
  assert.deepEqual([choices.topTobaccos[1].stock, choices.topTobaccos[1].trial], [null, false]);
  assert.equal(choices.topMixes[0].status, 'blocked');
  assert.deepEqual(choices.topMixes[1], { mixId: null, mixName: 'Удалённый', choices: 3, avgRating: null, status: null });
  assert.deepEqual(choices.profiles, [{ key: 'berry', label: 'Ягодные', share: 24 }]);
  assert.deepEqual(choices.signals.emptyRails, [{ railId: 'r1', name: 'Новинки' }]);
});

test('normalizeGuestChoices: пустой ответ не роняет экран', () => {
  const choices = normalizeGuestChoices(null);
  assert.equal(choices.period.bucket, 'day');
  assert.equal(choices.kpi.avgRating, null);
  assert.deepEqual(choices.timeline, []);
  assert.deepEqual(choices.signals, { outPopular: [], hiddenMixes: [], emptyRails: [] });
});

test('guestChoicesQuery: пресет — period, свои даты — from и to', () => {
  assert.equal(guestChoicesQuery({ key: '30d' }), 'period=30d');
  assert.equal(guestChoicesQuery({ key: 'all' }), 'period=all');
  assert.equal(guestChoicesQuery({ key: 'custom', from: '2026-10-13', to: '2026-10-26' }), 'from=2026-10-13&to=2026-10-26');
});
