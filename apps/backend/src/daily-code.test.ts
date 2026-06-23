import assert from 'node:assert/strict';
import test from 'node:test';
import { createNomadDailyCodeValue } from './daily-code';

test('createNomadDailyCodeValue produces a 4-digit code', () => {
  const value = createNomadDailyCodeValue();
  assert.match(value, /^\d{4}$/);
});

test('createNomadDailyCodeValue never returns an excluded code', () => {
  const all = Array.from({ length: 10_000 }, (_, index) => index.toString().padStart(4, '0'));
  const free = '4242';
  const exclude = all.filter((code) => code !== free);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    assert.equal(createNomadDailyCodeValue(new Date(), exclude), free);
  }
});
