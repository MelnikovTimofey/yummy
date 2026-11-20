import test from 'node:test';
import assert from 'node:assert/strict';
import { attributeChipLabel } from './filters';

test('attributeChipLabel: ничего не выбрано — название, одно значение — оно само, несколько — «Бренд: 2» (#464)', () => {
  assert.equal(attributeChipLabel('Бренд', []), 'Бренд');
  assert.equal(attributeChipLabel('Бренд', ['Сарма']), 'Сарма');
  assert.equal(attributeChipLabel('Характер', ['berry'], (value) => (value === 'berry' ? 'Ягодные' : value)), 'Ягодные');
  assert.equal(attributeChipLabel('Бренд', ['Сарма', 'Black Burn']), 'Бренд: 2');
});
