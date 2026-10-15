import test from 'node:test';
import assert from 'node:assert/strict';
import { Feather, Flame, Star, Users } from 'lucide-react';
import { dedupeRails, railKindIcon, railKindLabel, railOpenLabel } from './showcase';

const rail = (id: string, type: 'statistical' | 'prepared' | 'curated', mixIds: string[], name = id) => ({
  id,
  name,
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

// Полка Витрины (#175): тип показан значком, словами — только в aria-label заголовка.
test('railKindIcon даёт значок типа полки', () => {
  assert.equal(railKindIcon(rail('rail-statistical-top', 'statistical', [])), Users);
  assert.equal(railKindIcon(rail('rail-statistical-rated', 'statistical', [])), Star);
  assert.equal(railKindIcon(rail('rail-prepared-on-ice', 'prepared', [])), Feather);
  assert.equal(railKindIcon(rail('rail-curated-evening-choice', 'curated', [])), Flame);
});

test('railOpenLabel называет полку и её тип', () => {
  assert.equal(
    railOpenLabel(rail('rail-prepared-on-ice', 'prepared', [], 'Со льдом')),
    'Открыть подборку «Со льдом», редакция',
  );
  assert.equal(
    railOpenLabel(rail('rail-statistical-rated', 'statistical', [], 'Лучшие оценки')),
    'Открыть подборку «Лучшие оценки», оценки гостей',
  );
});
