import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDayTime } from './format-date-time';

test('formatDayTime: день, месяц словом и время через «в»', () => {
  assert.equal(formatDayTime(new Date(2026, 9, 24, 6, 0).toISOString()), '24 октября в 06:00');
  assert.equal(formatDayTime(new Date(2026, 0, 1, 14, 5).toISOString()), '1 января в 14:05');
});

test('formatDayTime: без даты — прочерк', () => {
  assert.equal(formatDayTime(''), '—');
  assert.equal(formatDayTime('not-a-date'), '—');
});
