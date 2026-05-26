import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSortPillOptions,
  composeSortKey,
  parseSortKey,
} from './master-sort-pill.helpers';

test('composeSortKey склеивает поле и направление через дефис', () => {
  assert.equal(composeSortKey('usage', 'desc'), 'usage-desc');
  assert.equal(composeSortKey('stock', 'asc'), 'stock-asc');
  assert.equal(composeSortKey('popularity', 'desc'), 'popularity-desc');
});

test('parseSortKey раскладывает compound-ключ обратно', () => {
  assert.deepEqual(parseSortKey<'usage' | 'stock'>('usage-desc'), {
    field: 'usage',
    direction: 'desc',
  });
  assert.deepEqual(parseSortKey<'usage' | 'stock'>('stock-asc'), {
    field: 'stock',
    direction: 'asc',
  });
});

test('compose ∘ parse round-trip сохраняет значения', () => {
  const cases: Array<{ field: 'a' | 'b' | 'updatedAt'; direction: 'asc' | 'desc' }> = [
    { field: 'a', direction: 'asc' },
    { field: 'b', direction: 'desc' },
    { field: 'updatedAt', direction: 'desc' },
  ];
  for (const { field, direction } of cases) {
    const key = composeSortKey(field, direction);
    const parsed = parseSortKey<'a' | 'b' | 'updatedAt'>(key);
    assert.equal(parsed.field, field);
    assert.equal(parsed.direction, direction);
  }
});

test('parseSortKey обрабатывает имя поля с дефисами (split по последнему)', () => {
  assert.deepEqual(parseSortKey<'avg-rating'>('avg-rating-asc'), {
    field: 'avg-rating',
    direction: 'asc',
  });
});

test('buildSortPillOptions раскрывает каждое поле в desc/asc с человекочитаемой меткой', () => {
  const fields = [
    { value: 'popularity' as const, label: 'По популярности' },
    { value: 'name' as const, label: 'По названию' },
  ];
  const options = buildSortPillOptions(fields, [
    { value: 'desc', label: 'По убыванию' },
    { value: 'asc', label: 'По возрастанию' },
  ]);

  assert.equal(options.length, 4);
  assert.deepEqual(options[0], {
    key: 'popularity-desc',
    label: 'По популярности · По убыванию',
  });
  assert.deepEqual(options[1], {
    key: 'popularity-asc',
    label: 'По популярности · По возрастанию',
  });
  assert.deepEqual(options[2], {
    key: 'name-desc',
    label: 'По названию · По убыванию',
  });
  assert.deepEqual(options[3], {
    key: 'name-asc',
    label: 'По названию · По возрастанию',
  });
});

test('buildSortPillOptions поддерживает один direction (только desc)', () => {
  const options = buildSortPillOptions(
    [
      { value: 'usage' as const, label: 'По использованию' },
      { value: 'stock' as const, label: 'Сначала по наличию' },
    ],
    [{ value: 'desc', label: 'По убыванию' }],
  );
  assert.equal(options.length, 2);
  assert.equal(options[0]?.key, 'usage-desc');
  assert.equal(options[1]?.key, 'stock-desc');
});
