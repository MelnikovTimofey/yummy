import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfEmptyManyResponse, normalizeShelfRestockManyResponse, normalizeShelfRow, type ShelfRow } from '../contracts';
import {
  bulkEmptyToast,
  bulkKeepToast,
  bulkRemoveToast,
  bulkRestockToast,
  bulkStopToast,
  bulkSummary,
  headCheck,
  optimisticEmpty,
  selectRange,
  toggleSelected,
} from './shelf-bulk';

const row = (name: string, patch: Partial<ShelfRow> = {}): ShelfRow => ({
  ...normalizeShelfRow({
    tobacco: { id: name, manufacturer: 'Black Burn', name },
    mixCount: 2,
    guestAvailable: true,
  }),
  ...patch,
});

test('toggleSelected: добавляет и убирает табак', () => {
  assert.deepEqual(toggleSelected([], 'a'), ['a']);
  assert.deepEqual(toggleSelected(['a', 'b'], 'a'), ['b']);
});

test('selectRange: Shift + клик добавляет строки от прошлой до текущей в порядке таблицы', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(selectRange(order, 'b', 'd', ['b']), ['b', 'c', 'd']);
  // Вверх по таблице — тоже диапазон; уже выбранные не дублируются.
  assert.deepEqual(selectRange(order, 'd', 'a', ['d', 'e']), ['d', 'e', 'a', 'b', 'c']);
  // Прошлой строки нет в видимых (или её не было) — просто переключаем строку.
  assert.deepEqual(selectRange(order, null, 'c', []), ['c']);
  assert.deepEqual(selectRange(order, 'z', 'c', ['c']), []);
});

test('headCheck: «выбрать все» — пусто, частично (mixed) или все видимые', () => {
  assert.equal(headCheck([], ['a', 'b']), false);
  assert.equal(headCheck(['a'], ['a', 'b']), 'mixed');
  assert.equal(headCheck(['b', 'a'], ['a', 'b']), true);
  assert.equal(headCheck([], []), false);
});

test('bulkSummary: первые три названия, «и ещё», сколько закончатся и вернутся, стоп и «держим»', () => {
  const rows = [
    row('Cane Mint'),
    row('Blackcurrant'),
    row('Pear lemonade', { stopped: true }),
    row('Virgin Peach 2.0', { shelfStatus: 'plan' }),
    row('Лимонная шипучка', { outAt: '2026-10-30T10:00:00.000Z' }),
  ];
  const summary = bulkSummary(rows);
  assert.equal(summary.count, 5);
  assert.equal(summary.names, 'Cane Mint, Blackcurrant, Pear lemonade и ещё 2');
  assert.equal(summary.emptyCount, 3);
  assert.equal(summary.restockCount, 2);
  assert.equal(summary.allStopped, false);
  assert.equal(summary.allKept, true);

  assert.equal(bulkSummary([row('Cane Mint'), row('Panama')]).names, 'Cane Mint, Panama');
  assert.equal(bulkSummary([row('a', { stopped: true }), row('b', { stopped: true, outAt: '2026-10-30T10:00:00.000Z' })]).allStopped, true);
  assert.equal(bulkSummary([row('a'), row('b', { keepStocked: false })]).allKept, false);
  assert.equal(bulkSummary([]).allStopped, false);
  assert.equal(bulkSummary([]).allKept, false);
});

test('bulkEmptyToast: число, скрытые миксы, сколько добавлено в заявку и пропущенные', () => {
  const toast = bulkEmptyToast(
    normalizeShelfEmptyManyResponse({
      batchId: 'b1',
      done: ['a', 'b', 'c', 'd'],
      skipped: [{ tobaccoId: 'e', reason: 'out' }],
      hiddenMixes: 7,
      items: [{ tobacco: { id: 'a' }, keepStocked: true }, { tobacco: { id: 'b' }, keepStocked: false }],
    }),
  );
  assert.equal(toast.title, 'Закончились: 4');
  assert.equal(
    toast.text,
    'Гости их не видят. Скрыто миксов: 7, в заявку добавлено: 1. Пропущено 1: уже закончились.',
  );
});

test('bulkEmptyToast: без миксов и «держим» — короче; «в плане» называется своими словами', () => {
  const base = { batchId: 'b1', done: ['a'], hiddenMixes: 0, items: [{ tobacco: { id: 'a' }, keepStocked: false }] };
  assert.equal(bulkEmptyToast(normalizeShelfEmptyManyResponse({ ...base, skipped: [] })).text, 'Гости их не видят.');
  assert.equal(
    bulkEmptyToast(normalizeShelfEmptyManyResponse({ ...base, skipped: [], items: [{ tobacco: { id: 'a' }, keepStocked: true }] })).text,
    'Гости их не видят. В заявку добавлено: 1.',
  );
  assert.equal(
    bulkEmptyToast(normalizeShelfEmptyManyResponse({ ...base, skipped: [{ tobaccoId: 'p', reason: 'plan' }] })).text,
    'Гости их не видят. Пропущено 1: в плане.',
  );
  assert.equal(
    bulkEmptyToast(
      normalizeShelfEmptyManyResponse({
        ...base,
        skipped: [
          { tobaccoId: 'p', reason: 'plan' },
          { tobaccoId: 'o', reason: 'out' },
        ],
      }),
    ).text,
    'Гости их не видят. Пропущено 2: уже закончились или в плане.',
  );
});

test('bulkEmptyToast: ничего не отмечено — так и говорим', () => {
  const toast = bulkEmptyToast(
    normalizeShelfEmptyManyResponse({ batchId: 'b1', done: [], skipped: [{ tobaccoId: 'o', reason: 'out' }], hiddenMixes: 0, items: [] }),
  );
  assert.equal(toast.title, 'Закончились: 0');
  assert.equal(toast.text, 'Пропущено 1: уже закончились.');
});

test('optimisticEmpty: строка сразу «закончился» с датой и не видна гостю', () => {
  const at = '2026-11-19T15:00:00.000Z';
  const next = optimisticEmpty(row('Cane Mint', { stopped: false }), at);
  assert.equal(next.outAt, at);
  assert.equal(next.guestAvailable, false);
});

test('bulkRestockToast: сколько вернулось, пропущенные «уже есть»', () => {
  const base = { batchId: 'r1', done: ['a', 'b'], items: [] };
  assert.deepEqual(bulkRestockToast(normalizeShelfRestockManyResponse({ ...base, skipped: [] })), {
    title: 'Снова есть: 2',
    text: 'Вернулись на витрину.',
  });
  assert.deepEqual(
    bulkRestockToast(normalizeShelfRestockManyResponse({ ...base, skipped: [{ tobaccoId: 'c', reason: 'in' }, { tobaccoId: 'd', reason: 'in' }] })),
    { title: 'Снова есть: 2', text: 'Вернулись на витрину. Пропущено 2: уже есть.' },
  );
  assert.deepEqual(
    bulkRestockToast(normalizeShelfRestockManyResponse({ batchId: 'r2', done: [], skipped: [{ tobaccoId: 'c', reason: 'in' }], items: [] })),
    { title: 'Снова есть: 0', text: 'Пропущено 1: уже есть.' },
  );
});

test('тосты стопа и «держим постоянно» для нескольких: текст предложением с заглавной', () => {
  assert.deepEqual(bulkStopToast(3, true), { title: 'Стоп для гостей: 3', text: 'Гости их не видят.' });
  assert.deepEqual(bulkStopToast(2, false), { title: 'Стоп снят: 2', text: 'Гости снова видят те, что есть на полке.' });
  assert.deepEqual(bulkKeepToast(4, true), { title: 'Держим постоянно: 4', text: 'Когда закончатся, попадут в заявку.' });
  assert.deepEqual(bulkKeepToast(1, false), { title: 'Не держим постоянно: 1', text: 'В заявку больше не попадут.' });
});

test('тост «Убрать с полки» для нескольких: сколько убрано и сколько не вышло', () => {
  assert.deepEqual(bulkRemoveToast(3, 0), { title: 'Убраны с полки: 3', text: 'История осталась.' });
  assert.deepEqual(bulkRemoveToast(2, 1), { title: 'Убраны с полки: 2', text: 'История осталась. Не убрано 1, попробуйте ещё раз.' });
});
