import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyCodeLabel,
  buildDailyCodeValue,
  buildDayKey,
  buildMoscowWindow,
  buildNextBroadcastDelay,
  nextDailyCodeSequence,
} from './time';

test('buildMoscowWindow returns Moscow day bounds', () => {
  const window = buildMoscowWindow(new Date('2026-03-23T06:00:00.000Z'));

  assert.equal(window.dayKey, '2026-03-23');
  assert.equal(window.startsAt.toISOString(), '2026-03-22T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-03-23T21:00:00.000Z');
});

test('broadcast delay targets configured Moscow time', () => {
  const delay = buildNextBroadcastDelay(new Date('2026-03-23T05:30:00.000Z'), 9, 0);
  assert.equal(delay, 1_800_000);
});

test('daily code helpers build stable values and sequences', () => {
  const dayKey = buildDayKey(new Date('2026-03-23T06:00:00.000Z'));

  assert.equal(buildDailyCodeValue('NOMAD', dayKey), 'NOMAD-20260323');
  assert.equal(buildDailyCodeValue('NOMAD', dayKey, 2), 'NOMAD-20260323-2');
  assert.equal(buildDailyCodeLabel(dayKey, 2), 'Код на 23.03.2026 #2');

  const nextSequence = nextDailyCodeSequence(
    [
      { codeValue: 'NOMAD-20260323' },
      { codeValue: 'NOMAD-20260323-2' },
      { codeValue: 'OTHER-20260323-9' },
    ],
    'NOMAD',
    dayKey,
  );

  assert.equal(nextSequence, 3);
});
