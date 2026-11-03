import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeShelfBatchUndoResponse,
  normalizeShelfEmptyManyResponse,
  normalizeShelfRestockManyResponse,
  normalizeShelfRestockResponse,
} from './contracts';

const item = (id: string, outAt: string | null = '2026-11-03T09:00:00.000Z') => ({
  tobacco: { id, manufacturer: 'Black Burn', lineName: '', name: id },
  shelfStatus: 'active',
  outAt,
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
  assert.equal(response.items[0].outAt, '2026-11-03T09:00:00.000Z');
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
  const response = normalizeShelfBatchUndoResponse({ items: [item('t1', null)] });
  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].outAt, null);
  assert.deepEqual(normalizeShelfBatchUndoResponse(undefined).items, []);
});

test('normalizeShelfRestockResponse: «Вернуть в наличие» одного табака отдаёт пакет для отмены (#518)', () => {
  const response = normalizeShelfRestockResponse({ batchId: 'r1', item: item('t1', null) });
  assert.equal(response.batchId, 'r1');
  assert.equal(response.item.tobacco.id, 't1');
  assert.equal(response.item.outAt, null);
});

test('normalizeShelfRestockManyResponse: вернувшиеся, пропущенные «уже есть» и «в плане»', () => {
  const response = normalizeShelfRestockManyResponse({
    batchId: 'r2',
    done: ['t1'],
    skipped: [
      { tobaccoId: 't2', reason: 'in' },
      { tobaccoId: 't3', reason: 'plan' },
      { tobaccoId: 't4', reason: 'weird' },
    ],
    items: [item('t1', null)],
  });
  assert.equal(response.batchId, 'r2');
  assert.deepEqual(response.done, ['t1']);
  assert.deepEqual(response.skipped, [
    { tobaccoId: 't2', reason: 'in' },
    { tobaccoId: 't3', reason: 'plan' },
    { tobaccoId: 't4', reason: 'in' },
  ]);
  assert.equal(response.items[0].outAt, null);
  assert.deepEqual(normalizeShelfRestockManyResponse(null), { batchId: '', done: [], skipped: [], items: [] });
});
