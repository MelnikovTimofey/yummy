import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfSettings } from './contracts';

const tobacco = { id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' };

test('normalizeShelfSettings: ответ PATCH и значения по умолчанию', () => {
  assert.deepEqual(normalizeShelfSettings({ bowlGrams: 20, leadDays: 10, budgetKop: 15000000 }), { bowlGrams: 20, leadDays: 10, budgetKop: 15000000 });
  assert.deepEqual(normalizeShelfSettings({ bowlGrams: 20, leadDays: 10, budgetKop: null }), { bowlGrams: 20, leadDays: 10, budgetKop: null });
  assert.deepEqual(normalizeShelfSettings(undefined), { bowlGrams: 18, leadDays: 7, budgetKop: null });
});
