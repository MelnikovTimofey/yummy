import test from 'node:test';
import assert from 'node:assert/strict';
import { builderStockTag } from './mix-builder-status';

// #494: метка наличия в конструкторе совпадает со статусом микса из API (#479).

const substitution = {
  from: { tobaccoId: 'lime-spark', manufacturer: 'Ателье Reserve', name: 'Lime Spark' },
  to: { tobaccoId: 'citrus-breeze', manufacturer: 'Ателье Reserve', name: 'Citrus Breeze' },
};

test('всё в наличии — метки нет', () => {
  assert.equal(builderStockTag([], substitution), null);
});

test('не хватает одного табака, и его закрывает замена — «с заменой» и пара', () => {
  assert.deepEqual(builderStockTag(['lime-spark'], substitution), {
    tone: 'info',
    label: 'с заменой',
    note: 'Citrus Breeze вместо Lime Spark',
  });
});

test('не хватает другого табака или двух — «блокируется наличием»', () => {
  const blocked = { tone: 'warning', label: 'блокируется наличием' };
  assert.deepEqual(builderStockTag(['mint-veil'], substitution), blocked);
  assert.deepEqual(builderStockTag(['lime-spark', 'mint-veil'], substitution), blocked);
  assert.deepEqual(builderStockTag(['lime-spark'], null), blocked);
});
