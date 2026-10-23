import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfBatchUndoResponse, normalizeShelfEmptyManyResponse } from './contracts';

const item = (id: string) => ({
  tobacco: { id, manufacturer: 'Black Burn', lineName: '', name: id },
  shelfStatus: 'active',
  status: 'out',
  leftGrams: 0,
  fullGrams: 200,
  mixCount: 3,
  keepStocked: true,
});

test('normalizeShelfEmptyManyResponse: пакет, отмеченные, пропущенные и строки', () => {
  const response = normalizeShelfEmptyManyResponse({
    batchId: 'b1',
    done: ['t1', 't2'],
    skipped: [
      { tobaccoId: 't3', reason: 'out' },
      { tobaccoId: 't4', reason: 'plan' },
      { tobaccoId: 't5', reason: 'weird' },
      'мусор',
    ],
    hiddenMixes: 7,
    items: [item('t1'), item('t2')],
  });
  assert.equal(response.batchId, 'b1');
  assert.deepEqual(response.done, ['t1', 't2']);
  assert.deepEqual(response.skipped, [
    { tobaccoId: 't3', reason: 'out' },
    { tobaccoId: 't4', reason: 'plan' },
    { tobaccoId: 't5', reason: 'out' },
  ]);
  assert.equal(response.hiddenMixes, 7);
  assert.equal(response.items.length, 2);
  assert.equal(response.items[0].tobacco.id, 't1');
  assert.equal(response.items[0].status, 'out');
  assert.equal(response.items[1].keepStocked, true);
});

test('normalizeShelfEmptyManyResponse: пустой ответ — пустой пакет', () => {
  const response = normalizeShelfEmptyManyResponse(null);
  assert.equal(response.batchId, '');
  assert.deepEqual(response.done, []);
  assert.deepEqual(response.skipped, []);
  assert.equal(response.hiddenMixes, 0);
  assert.deepEqual(response.items, []);
});

test('normalizeShelfBatchUndoResponse: строки после отмены пакета', () => {
  const response = normalizeShelfBatchUndoResponse({ items: [{ ...item('t1'), status: 'ok', leftGrams: 120 }] });
  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].status, 'ok');
  assert.equal(response.items[0].leftGrams, 120);
  assert.deepEqual(normalizeShelfBatchUndoResponse(undefined).items, []);
});
