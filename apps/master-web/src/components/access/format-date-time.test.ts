import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCodeDay } from './format-date-time';

// Код живёт до полуночи по Москве (#381): срок — день кода, а не «24 октября в 00:00».
test('formatCodeDay: день кода по Москве по концу его окна', () => {
  assert.equal(formatCodeDay('2026-10-23T21:00:00.000Z'), '23 октября');
  assert.equal(formatCodeDay('2026-01-01T21:00:00.000Z'), '1 января');
});

test('formatCodeDay: без даты — прочерк', () => {
  assert.equal(formatCodeDay(''), '—');
  assert.equal(formatCodeDay('not-a-date'), '—');
});
