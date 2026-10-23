import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfEmptyManyResponse, normalizeShelfRow, type ShelfRow } from '../contracts';
import {
  bulkEmptyToast,
  bulkKeepToast,
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
    status: 'ok',
    leftGrams: 300,
    fullGrams: 400,
    leftSource: 'forecast',
    rate: 10,
    rateKind: 'own',
    monthGrams: 300,
    daysLeft: 30,
    endsAt: '2026-12-19T10:00:00.000Z',
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

test('bulkSummary: первые три названия, «и ещё», сколько закончатся и все ли на стопе', () => {
  const rows = [
    row('Cane Mint'),
    row('Blackcurrant'),
    row('Pear lemonade'),
    row('Virgin Peach 2.0', { status: 'plan' }),
    row('Лимонная шипучка', { status: 'out', leftGrams: 0 }),
  ];
  const summary = bulkSummary(rows);
  assert.equal(summary.count, 5);
  assert.equal(summary.names, 'Cane Mint, Blackcurrant, Pear lemonade и ещё 2');
  assert.equal(summary.emptyCount, 3);
  assert.equal(summary.skipCount, 2);
  assert.equal(summary.allStopped, false);

  assert.equal(bulkSummary([row('Cane Mint'), row('Panama')]).names, 'Cane Mint, Panama');
  assert.equal(bulkSummary([row('a', { stopped: true, status: 'stop' }), row('b', { stopped: true, status: 'out' })]).allStopped, true);
  assert.equal(bulkSummary([]).allStopped, false);
});

test('bulkEmptyToast: число, скрытые миксы, сколько добавлено в заказ и пропущенные', () => {
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
    'Гости их не видят. Скрыто миксов: 7, в заказ добавлено: 1. Пропущено 1: уже закончились.',
  );
});

test('bulkEmptyToast: без миксов и «держим» — короче; «в плане» называется своими словами', () => {
  const base = { batchId: 'b1', done: ['a'], hiddenMixes: 0, items: [{ tobacco: { id: 'a' }, keepStocked: false }] };
  assert.equal(bulkEmptyToast(normalizeShelfEmptyManyResponse({ ...base, skipped: [] })).text, 'Гости их не видят.');
  assert.equal(
    bulkEmptyToast(normalizeShelfEmptyManyResponse({ ...base, skipped: [], items: [{ tobacco: { id: 'a' }, keepStocked: true }] })).text,
    'Гости их не видят. В заказ добавлено: 1.',
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

test('optimisticEmpty: строка сразу «закончился» с отметкой 0 г', () => {
  const at = '2026-11-19T15:00:00.000Z';
  const next = optimisticEmpty(row('Cane Mint', { stopped: false }), at);
  assert.equal(next.status, 'out');
  assert.equal(next.leftGrams, 0);
  assert.equal(next.leftSource, 'mark');
  assert.equal(next.guestAvailable, false);
  assert.equal(next.daysLeft, null);
  assert.equal(next.endsAt, null);
  assert.deepEqual(next.lastCount, { at, grams: 0, fraction: null });
  // «Закончился» важнее стопа в статусе строки, как в stock.ts на сервере.
  assert.equal(optimisticEmpty(row('Panama', { stopped: true, status: 'stop' }), at).status, 'out');
});

test('тосты стопа и «держим постоянно» для нескольких: текст предложением с заглавной', () => {
  assert.deepEqual(bulkStopToast(3, true), { title: 'Стоп для гостей: 3', text: 'Гости их не видят.' });
  assert.deepEqual(bulkStopToast(2, false), { title: 'Стоп снят: 2', text: 'Гости снова видят те, что есть на полке.' });
  assert.deepEqual(bulkKeepToast(4, true), { title: 'Держим постоянно: 4', text: 'Когда закончатся, попадут в заказ.' });
  assert.deepEqual(bulkKeepToast(1, false), { title: 'Не держим постоянно: 1', text: 'В заказ больше не попадут.' });
});
