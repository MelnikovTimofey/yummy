import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultInventoryListResponse, defaultMixListResponse } from '../contracts';
import {
  CATALOG_SORTS,
  CATALOG_STATUS_CHIPS,
  MIX_SORTS,
  MIX_STATUS_CHIPS,
  applyAttributeChange,
  catalogStatusCount,
  catalogStatusOf,
  catalogStatusPatch,
  mixStatusCount,
  pickSort,
  sortPillOptions,
} from './list-filters';

const spy = () => {
  const calls: string[] = [];
  return {
    calls,
    handlers: {
      toggle: (value: string) => calls.push(`toggle:${value}`),
      clear: () => calls.push('clear'),
    },
  };
};

test('applyAttributeChange: список отдаёт новый набор, серверу нужен toggle одного значения или clear (#467)', () => {
  const added = spy();
  applyAttributeChange(['Сарма'], ['Сарма', 'DARKSIDE'], added.handlers);
  assert.deepEqual(added.calls, ['toggle:DARKSIDE']);

  const removed = spy();
  applyAttributeChange(['Сарма', 'DARKSIDE'], ['DARKSIDE'], removed.handlers);
  assert.deepEqual(removed.calls, ['toggle:Сарма']);

  const cleared = spy();
  applyAttributeChange(['Сарма', 'DARKSIDE'], [], cleared.handlers);
  assert.deepEqual(cleared.calls, ['clear']);

  const nothing = spy();
  applyAttributeChange([], [], nothing.handlers);
  applyAttributeChange(['Сарма'], ['Сарма'], nothing.handlers);
  assert.deepEqual(nothing.calls, []);
});

test('Каталог: «Архив» — статус из того же ряда, что и наличие (#467)', () => {
  assert.deepEqual(
    CATALOG_STATUS_CHIPS.map(([, label]) => label),
    ['Все', 'В наличии', 'Нет наличия', 'Архив'],
  );
  assert.equal(catalogStatusOf({ stock: 'all', archived: 'active' }), 'all');
  assert.equal(catalogStatusOf({ stock: 'in-stock', archived: 'active' }), 'in-stock');
  assert.equal(catalogStatusOf({ stock: 'all', archived: 'archived' }), 'archived');

  assert.deepEqual(catalogStatusPatch({ stock: 'in-stock', archived: 'active' }, 'archived'), { stock: 'all', archived: 'archived' });
  assert.deepEqual(catalogStatusPatch({ stock: 'all', archived: 'archived' }, 'out-of-stock'), { stock: 'out-of-stock', archived: 'active' });
  assert.deepEqual(catalogStatusPatch({ stock: 'all', archived: 'active' }, 'in-stock'), { stock: 'in-stock' });
  assert.deepEqual(catalogStatusPatch({ stock: 'all', archived: 'active' }, 'all'), {});
});

test('Каталог: число у каждого статуса, кроме «Все», ноль тоже (#467)', () => {
  const meta = { ...defaultInventoryListResponse.meta, inStockCount: 269, outOfStockCount: 10675, archivedCount: 0 };
  assert.equal(catalogStatusCount(meta, 'all'), undefined);
  assert.equal(catalogStatusCount(meta, 'in-stock'), 269);
  assert.equal(catalogStatusCount(meta, 'out-of-stock'), 10675);
  assert.equal(catalogStatusCount(meta, 'archived'), 0);
});

test('Миксы: число у каждого статуса, кроме «Все» (#467)', () => {
  assert.deepEqual(
    MIX_STATUS_CHIPS.map(([, label]) => label),
    ['Все', 'Виден гостю', 'Скрыт', 'Блокирован'],
  );
  const meta = { ...defaultMixListResponse.meta, guestVisibleCount: 31, hiddenCount: 2, blockedCount: 0 };
  assert.equal(mixStatusCount(meta, 'all'), undefined);
  assert.equal(mixStatusCount(meta, 'guest-visible'), 31);
  assert.equal(mixStatusCount(meta, 'hidden'), 2);
  assert.equal(mixStatusCount(meta, 'blocked'), 0);
});

test('Сортировка «По …»: подписи пилюли, первая — сортировка по умолчанию (#467)', () => {
  assert.deepEqual(sortPillOptions(CATALOG_SORTS), [
    ['stock', 'По наличию'],
    ['name', 'По названию'],
    ['manufacturer', 'По бренду'],
    ['dependentMixes', 'По миксам'],
  ]);
  assert.deepEqual(sortPillOptions(MIX_SORTS), [
    ['demand', 'По спросу'],
    ['avgRating', 'По рейтингу'],
    ['name', 'По названию'],
  ]);
  assert.deepEqual(
    { field: CATALOG_SORTS[0].field, direction: CATALOG_SORTS[0].direction },
    defaultInventoryListResponse.sort,
  );
  assert.deepEqual({ field: MIX_SORTS[0].field, direction: MIX_SORTS[0].direction }, defaultMixListResponse.sort);
});

test('pickSort: новое поле — с его исходным направлением, то же поле — без изменений (#467)', () => {
  assert.deepEqual(pickSort(CATALOG_SORTS, { field: 'stock', direction: 'desc' }, 'name'), { field: 'name', direction: 'asc' });
  assert.deepEqual(pickSort(CATALOG_SORTS, { field: 'name', direction: 'asc' }, 'dependentMixes'), {
    field: 'dependentMixes',
    direction: 'desc',
  });
  const current = { field: 'name', direction: 'desc' } as const;
  assert.equal(pickSort(CATALOG_SORTS, current, 'name'), current);
  assert.deepEqual(pickSort(MIX_SORTS, { field: 'demand', direction: 'desc' }, 'avgRating'), { field: 'avgRating', direction: 'desc' });
});
