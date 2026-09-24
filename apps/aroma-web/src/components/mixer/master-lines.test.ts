import test from 'node:test';
import assert from 'node:assert/strict';
import { masterLines, pickMasterLine, skipLineKey } from './master-lines';

// Ключи — ровно из issue #128; тексты пишет владелец продукта.
const expectedKeys = [
  'turn.base',
  'turn.accent',
  'turn.twist',
  ...[
    'berry',
    'citrus',
    'dessert',
    'fresh',
    'minty',
    'fruity',
    'spicy',
    'tobacco',
    'floral_herbal',
    'sweet',
    'sour',
    'perfume',
  ].map((profile) => `take.base.${profile}`),
  'take.accent.classic',
  'take.accent.confident',
  'take.accent.bold',
  'take.accent.ask-master',
  'take.twist.cooling',
  'take.twist.spicy',
  'skip',
  'skip.streak10',
  'deck.loop',
  'deck.empty',
  'rewind',
  'twist.skipped',
  'luck',
  'split.too-cold',
  'split.weak-base',
  'reveal.similar',
  'reveal.unique',
  'master-card',
];

test('словарь реплик содержит все ключи из #128', () => {
  assert.deepEqual(Object.keys(masterLines).sort(), [...expectedKeys].sort());
  for (const lines of Object.values(masterLines)) {
    assert.ok(Array.isArray(lines));
  }
});

test('pickMasterLine: пустой ключ — мастер молчит', () => {
  assert.equal(pickMasterLine('rewind', {}, () => 0, { ...masterLines, rewind: [] }), null);
});

test('pickMasterLine выбирает фразу и подставляет {name}', () => {
  const lines = { ...masterLines, 'reveal.similar': ['Похоже на «{name}».', 'Почти «{name}».'] };
  assert.equal(pickMasterLine('reveal.similar', { name: 'Тропики' }, () => 0, lines), 'Похоже на «Тропики».');
  assert.equal(pickMasterLine('reveal.similar', { name: 'Тропики' }, () => 0.99, lines), 'Почти «Тропики».');
});

test('skipLineKey: десятый пропуск подряд и редкая реплика на пропуск', () => {
  assert.equal(skipLineKey(10, () => 0.9), 'skip.streak10');
  assert.equal(skipLineKey(3, () => 0.1), 'skip');
  assert.equal(skipLineKey(3, () => 0.5), null);
  assert.equal(skipLineKey(20, () => 0.5), null);
});
