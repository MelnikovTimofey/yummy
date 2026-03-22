import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventorySummary, sortInventoryItems } from './contracts';

test('buildInventorySummary counts stock states', () => {
  const summary = buildInventorySummary([
    { id: '1', name: 'A', manufacturer: 'Nomad', inStock: true },
    { id: '2', name: 'B', manufacturer: 'Nomad', inStock: false },
    { id: '3', name: 'C', manufacturer: 'Nomad', inStock: true },
  ]);

  assert.deepEqual(summary, {
    totalTobaccos: 3,
    inStockCount: 2,
    outOfStockCount: 1,
  });
});

test('sortInventoryItems places in-stock tobaccos first', () => {
  const sorted = sortInventoryItems([
    { id: '2', name: 'Zulu', manufacturer: 'Nomad', inStock: false },
    { id: '1', name: 'Alpha', manufacturer: 'Nomad', inStock: true },
    { id: '3', name: 'Beta', manufacturer: 'Nomad', inStock: false },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['1', '3', '2']);
});
