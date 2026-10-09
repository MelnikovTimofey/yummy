import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyCodeValue, getDailyCodeWindow } from './daily-code';

test('createDailyCodeValue produces a 4-digit code', () => {
  const value = createDailyCodeValue();
  assert.match(value, /^\d{4}$/);
});

test('createDailyCodeValue never returns an excluded code', () => {
  const all = Array.from({ length: 10_000 }, (_, index) => index.toString().padStart(4, '0'));
  const free = '4242';
  const exclude = all.filter((code) => code !== free);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    assert.equal(createDailyCodeValue(new Date(), exclude), free);
  }
});

test('getDailyCodeWindow spans the Moscow calendar week from Monday to Monday', () => {
  // Пятница, 9 октября 2026, 12:00 МСК.
  const window = getDailyCodeWindow(new Date('2026-10-09T09:00:00.000Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-04T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-11T21:00:00.000Z');
});

test('getDailyCodeWindow switches to the next week at Monday 00:00 Moscow time', () => {
  const sundayNight = getDailyCodeWindow(new Date('2026-10-11T20:59:59.999Z'));
  const mondayStart = getDailyCodeWindow(new Date('2026-10-11T21:00:00.000Z'));

  assert.equal(sundayNight.endsAt.toISOString(), '2026-10-11T21:00:00.000Z');
  assert.equal(mondayStart.startsAt.toISOString(), '2026-10-11T21:00:00.000Z');
  assert.equal(mondayStart.endsAt.toISOString(), '2026-10-18T21:00:00.000Z');
});
