import test from 'node:test';
import assert from 'node:assert/strict';
import { ariaSortFor, nextColumnSort } from './table-sort';

type Field = 'stock' | 'name' | 'dependentMixes';
const fallback = { field: 'stock', direction: 'desc' } as const;

// Клик по заголовку: естественное направление поля → обратное → порядок по
// умолчанию. Так вернуть исходный порядок можно без отдельной кнопки (#100).
test('nextColumnSort переключает колонку по кругу из трёх состояний', () => {
  const first = nextColumnSort<Field>(fallback, 'name', 'asc', fallback);
  assert.deepEqual(first, { field: 'name', direction: 'asc' });
  const second = nextColumnSort<Field>(first, 'name', 'asc', fallback);
  assert.deepEqual(second, { field: 'name', direction: 'desc' });
  const third = nextColumnSort<Field>(second, 'name', 'asc', fallback);
  assert.deepEqual(third, fallback);
});

test('nextColumnSort при смене колонки начинает с её естественного направления', () => {
  const current = { field: 'name', direction: 'desc' } as const;
  assert.deepEqual(nextColumnSort<Field>(current, 'dependentMixes', 'desc', fallback), {
    field: 'dependentMixes',
    direction: 'desc',
  });
});

test('ariaSortFor описывает только активную колонку', () => {
  const current = { field: 'name', direction: 'asc' } as const;
  assert.equal(ariaSortFor<Field>(current, 'name'), 'ascending');
  assert.equal(ariaSortFor<Field>({ field: 'name', direction: 'desc' }, 'name'), 'descending');
  assert.equal(ariaSortFor<Field>(current, 'dependentMixes'), 'none');
});
