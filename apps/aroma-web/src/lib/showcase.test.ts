import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeRails, railKindLabel } from './showcase';

const rail = (id: string, type: 'statistical' | 'prepared' | 'curated', mixIds: string[]) => ({
  id,
  type,
  mixes: mixIds.map((mixId) => ({ id: mixId })),
});

// Рейл, повторяющий состав рейла выше, гостю ничего не добавляет (#116).
test('dedupeRails убирает рейлы с тем же составом, что у рейла выше', () => {
  const rails = [
    rail('rail-statistical-top', 'statistical', ['a', 'b', 'c']),
    rail('rail-statistical-rated', 'statistical', ['a', 'b', 'c']),
    rail('rail-prepared-fresh-line', 'prepared', ['a', 'b']),
    rail('rail-prepared-sweet-line', 'prepared', ['c']),
  ];

  assert.deepEqual(
    dedupeRails(rails).map((item) => item.id),
    ['rail-statistical-top', 'rail-prepared-fresh-line', 'rail-prepared-sweet-line'],
  );
});

test('dedupeRails учитывает порядок и пропускает пустые рейлы', () => {
  const rails = [
    rail('first', 'prepared', ['a', 'b']),
    rail('reordered', 'prepared', ['b', 'a']),
    rail('empty', 'curated', []),
  ];

  assert.deepEqual(dedupeRails(rails).map((item) => item.id), ['first', 'reordered']);
});

test('railKindLabel различает статистические рейлы', () => {
  assert.equal(railKindLabel(rail('rail-statistical-top', 'statistical', [])), 'Выбор гостей');
  assert.equal(railKindLabel(rail('rail-statistical-rated', 'statistical', [])), 'Оценки гостей');
  assert.equal(railKindLabel(rail('rail-prepared-fresh-line', 'prepared', [])), 'Редакция');
  assert.equal(railKindLabel(rail('rail-curated-evening-choice', 'curated', [])), 'Мастера');
});
