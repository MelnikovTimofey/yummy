import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogBrandLine, catalogCardShelf, catalogRemoveLabel, formatInMixes } from './catalog-mobile';

test('catalogCardShelf names the shelf place like the shelf statuses', () => {
  assert.deepEqual(catalogCardShelf('in'), { tone: 'in', label: 'на полке' });
  assert.deepEqual(catalogCardShelf('out'), { tone: 'out', label: 'закончился' });
  assert.deepEqual(catalogCardShelf('stop'), { tone: 'stop', label: 'стоп для гостей' });
  assert.deepEqual(catalogCardShelf('plan'), { tone: 'plan', label: 'в плане' });
  assert.deepEqual(catalogCardShelf(undefined), { tone: 'none', label: 'не на полке' });
});

test('formatInMixes agrees the noun with the count', () => {
  assert.equal(formatInMixes(0), 'нет в миксах');
  assert.equal(formatInMixes(1), 'в 1 миксе');
  assert.equal(formatInMixes(4), 'в 4 миксах');
  assert.equal(formatInMixes(6), 'в 6 миксах');
  assert.equal(formatInMixes(11), 'в 11 миксах');
  assert.equal(formatInMixes(21), 'в 21 миксе');
  assert.equal(formatInMixes(111), 'в 111 миксах');
});

test('catalogBrandLine joins brand and line, skipping an empty line', () => {
  assert.equal(catalogBrandLine({ manufacturer: 'Darkside', lineName: 'Core' }), 'Darkside, Core');
  assert.equal(catalogBrandLine({ manufacturer: 'Black Burn', lineName: '' }), 'Black Burn');
  assert.equal(catalogBrandLine({ manufacturer: 'Black Burn', lineName: '  ' }), 'Black Burn');
  assert.equal(catalogBrandLine({ manufacturer: 'Black Burn' }), 'Black Burn');
});

test('catalogRemoveLabel takes a planned tobacco out of the plan, others off the shelf', () => {
  assert.equal(catalogRemoveLabel('plan'), 'Убрать из плана');
  assert.equal(catalogRemoveLabel('active'), 'Убрать с полки');
  assert.equal(catalogRemoveLabel('in'), 'Убрать с полки');
  assert.equal(catalogRemoveLabel('out'), 'Убрать с полки');
  assert.equal(catalogRemoveLabel('stop'), 'Убрать с полки');
});
