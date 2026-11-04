import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRailMixCount } from './rails';

test('formatRailMixCount: число миксов рейла по-русски, пустой рейл — «пусто»', () => {
  assert.equal(formatRailMixCount(0), 'пусто');
  assert.equal(formatRailMixCount(1), '1 микс');
  assert.equal(formatRailMixCount(3), '3 микса');
  assert.equal(formatRailMixCount(8), '8 миксов');
  assert.equal(formatRailMixCount(11), '11 миксов');
  assert.equal(formatRailMixCount(21), '21 микс');
  assert.equal(formatRailMixCount(112), '112 миксов');
});
