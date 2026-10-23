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

test('getDailyCodeWindow spans the Moscow calendar day', () => {
  // Пятница, 9 октября 2026, 12:00 МСК.
  const window = getDailyCodeWindow(new Date('2026-10-09T09:00:00.000Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-08T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-09T21:00:00.000Z');
});

test('getDailyCodeWindow keeps the window until 23:59 Moscow time', () => {
  const window = getDailyCodeWindow(new Date('2026-10-09T20:59:59.999Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-08T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-09T21:00:00.000Z');
});

// Код действует до конца суток (#381): в полночь по Москве начинается новое окно.
test('getDailyCodeWindow switches to a new window at Moscow midnight', () => {
  const window = getDailyCodeWindow(new Date('2026-10-09T21:00:00.000Z'));

  assert.equal(window.startsAt.toISOString(), '2026-10-09T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-10-10T21:00:00.000Z');
});

test('getDailyCodeWindow does not change at 06:00 Moscow time', () => {
  const before = getDailyCodeWindow(new Date('2026-10-10T02:59:59.999Z'));
  const after = getDailyCodeWindow(new Date('2026-10-10T03:00:00.000Z'));

  assert.deepEqual(after, before);
});
