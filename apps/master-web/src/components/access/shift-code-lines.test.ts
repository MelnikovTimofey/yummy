import test from 'node:test';
import assert from 'node:assert/strict';
import type { DailyAccessCodeRecord } from '@/contracts';
import { describeShiftCode } from './shift-code-lines';

const code: DailyAccessCodeRecord = {
  id: 'c1',
  codeValue: '4817',
  codeLabel: '4817',
  active: true,
  startsAt: '2026-11-04T03:00:00.000Z',
  endsAt: '2026-11-05T03:00:00.000Z',
};

// Код смены на телефоне (#337, #shot=access): статус, срок и остаток строчными.
test('describeShiftCode: действующий код — срок по Москве и остаток', () => {
  const lines = describeShiftCode({ state: 'active', code }, Date.parse('2026-11-04T10:00:00.000Z'));
  assert.deepEqual(lines, {
    status: 'действует',
    active: true,
    value: '4817',
    until: 'до 06:00 5 ноября',
    left: 'осталось 17 ч 0 мин',
    progress: 7 / 24 * 100,
    urgency: 'fresh',
  });
});

test('describeShiftCode: истёкший код не выдаётся за текущий', () => {
  const lines = describeShiftCode({ state: 'expired', code }, Date.parse('2026-11-05T04:00:00.000Z'));
  assert.equal(lines.status, 'истёк');
  assert.equal(lines.active, false);
  assert.equal(lines.value, '');
  assert.equal(lines.until, 'код 4817 действовал до 06:00 5 ноября');
  assert.equal(lines.left, '');
});

test('describeShiftCode: кода нет', () => {
  const lines = describeShiftCode({ state: 'none', code: null }, Date.now());
  assert.equal(lines.status, 'нет кода');
  assert.equal(lines.value, '');
  assert.equal(lines.until, '');
});
