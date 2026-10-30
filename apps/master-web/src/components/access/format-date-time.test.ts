import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCodeDeadline } from './format-date-time';

// Код живёт до 06:00 по Москве (#456): срок — время и день конца окна, как в боте.
test('formatCodeDeadline: конец окна кода по Москве', () => {
  assert.equal(formatCodeDeadline('2026-10-31T03:00:00.000Z'), '06:00 31 октября');
  assert.equal(formatCodeDeadline('2026-01-01T03:00:00.000Z'), '06:00 1 января');
});

test('formatCodeDeadline: без даты — прочерк', () => {
  assert.equal(formatCodeDeadline(''), '—');
  assert.equal(formatCodeDeadline('not-a-date'), '—');
});
