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

// Бар закрыт с 03:00 до 11:00: граница в 06:00 не режет ни одну смену (#456).
test('getDailyCodeWindow spans from 06:00 today to 06:00 tomorrow Moscow time', () => {
  // Пятница, 9 октября 2026, 12:00 МСК.
  const window = getDailyCodeWindow(new Date('2026-10-09T09:00:00.000Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-09T03:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-10T03:00:00.000Z');
});

test('getDailyCodeWindow keeps the previous day window before 06:00 Moscow time', () => {
  // Суббота, 10 октября 2026, 05:59 МСК — ещё смена пятницы.
  const window = getDailyCodeWindow(new Date('2026-10-10T02:59:59.999Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-09T03:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-10T03:00:00.000Z');
});

test('getDailyCodeWindow switches to a new window at exactly 06:00 Moscow time', () => {
  const window = getDailyCodeWindow(new Date('2026-10-10T03:00:00.000Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-10T03:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-11T03:00:00.000Z');
});

test('getDailyCodeWindow does not change at Moscow midnight', () => {
  const beforeMidnight = getDailyCodeWindow(new Date('2026-10-09T20:59:59.999Z'));
  const afterMidnight = getDailyCodeWindow(new Date('2026-10-09T21:00:00.000Z'));

  assert.deepEqual(afterMidnight, beforeMidnight);
  assert.equal(afterMidnight.startsAt.toISOString(), '2026-10-09T03:00:00.000Z');
});
