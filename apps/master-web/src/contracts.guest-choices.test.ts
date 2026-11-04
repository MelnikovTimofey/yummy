import test from 'node:test';
import assert from 'node:assert/strict';
import { guestChoicesQuery, normalizeGuestChoices } from './contracts';

test('normalizeGuestChoices: ответ /staff/dashboard/choices целиком', () => {
  const choices = normalizeGuestChoices({
    period: { key: '30d', from: '2026-10-06', to: '2026-11-04', days: 30, bucket: 'day' },
    enough: true,
    kpi: { choices: 621, ownMixes: 121, mixesChosen: 58, mixesOnShowcase: 64, avgRating: 4.6, ratingsCount: 87 },
    timeline: [{ date: '2026-10-06', catalog: 12, own: 2 }],
    topTobaccos: [
      { tobaccoId: 't1', manufacturer: 'Black Burn', name: 'Cane Mint', choices: 81, mark: 'out' },
      { tobaccoId: 't2', manufacturer: 'Darkside', name: 'Red Tea', choices: 96, mark: 'strange' },
    ],
    topMixes: [
      { mixId: 'm1', mixName: 'Melon Cola', choices: 33, avgRating: 4.2, mark: 'hidden' },
      { mixId: null, mixName: 'Удалённый', choices: 3, avgRating: null, mark: null },
    ],
    profiles: [{ key: 'berry', label: 'Ягодные', share: 24 }],
    signals: {
      outPopular: [{ tobaccoId: 't1', name: 'Cane Mint' }],
      hiddenMixes: [{ mixId: 'm1', mixName: 'Melon Cola' }],
      emptyRails: [{ railId: 'r1', name: 'Новинки' }],
    },
  });

  assert.deepEqual(choices.period, { key: '30d', from: '2026-10-06', to: '2026-11-04', days: 30, bucket: 'day' });
  assert.equal(choices.enough, true);
  assert.deepEqual(choices.kpi, { choices: 621, ownMixes: 121, mixesChosen: 58, mixesOnShowcase: 64, avgRating: 4.6, ratingsCount: 87 });
  assert.deepEqual(choices.timeline, [{ date: '2026-10-06', catalog: 12, own: 2 }]);
  assert.equal(choices.topTobaccos[0].mark, 'out');
  assert.equal(choices.topTobaccos[1].mark, null);
  assert.deepEqual(choices.topMixes[1], { mixId: null, mixName: 'Удалённый', choices: 3, avgRating: null, mark: null });
  assert.deepEqual(choices.profiles, [{ key: 'berry', label: 'Ягодные', share: 24 }]);
  assert.deepEqual(choices.signals.emptyRails, [{ railId: 'r1', name: 'Новинки' }]);
});

test('normalizeGuestChoices: пустой ответ не роняет экран', () => {
  const choices = normalizeGuestChoices(null);
  assert.equal(choices.enough, false);
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
