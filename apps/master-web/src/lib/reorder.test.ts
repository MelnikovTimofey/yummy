import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReorderGroup, ReorderItem } from '../contracts';
import {
  countReorder,
  groupCaption,
  groupKey,
  orderText,
  reorderItemName,
  reorderRate,
  reorderSum,
  stepQuantity,
  untilLabel,
  validateShelfSettings,
  withQuantities,
} from './reorder';

const item = (patch: Partial<ReorderItem> & { id?: string; name?: string; brand?: string; line?: string } = {}): ReorderItem => {
  const { id = 't1', name = 'Cane Mint', brand = 'Black Burn', line = '', ...rest } = patch;
  return {
    tobacco: { id, manufacturer: brand, lineName: line, name },
    status: 'ending',
    daysLeft: 2,
    endsAt: '2026-11-21T10:00:00.000Z',
    rate: 21,
    rateKind: 'own',
    quantity: 3,
    packWeight: 200,
    lastPriceKop: 155000,
    ...rest,
  };
};

const group = (items: ReorderItem[], patch: Partial<ReorderGroup> = {}): ReorderGroup => ({
  supplier: { id: 's1', name: 'Каспий Опт' },
  lastInvoice: { number: '04102', date: '2026-11-18', status: 'draft' },
  items,
  sumKop: null,
  ...patch,
});

test('reorderItemName: бренд, линейка и вкус через пробел, без пустой линейки', () => {
  assert.equal(reorderItemName(item()), 'Black Burn Cane Mint');
  assert.equal(reorderItemName(item({ brand: 'DARKSIDE', line: 'Core', name: 'Blackcurrant' })), 'DARKSIDE Core Blackcurrant');
});

test('orderText повторяет формат backend (shelf-insights orderText)', () => {
  assert.equal(
    orderText([item(), item({ id: 't2', brand: 'Sebero', name: 'Лимонная шипучка', quantity: 2 })]),
    'Добрый день! Заказ:\nBlack Burn Cane Mint 200 г — 3 шт\nSebero Лимонная шипучка 200 г — 2 шт\nСпасибо!',
  );
});

test('withQuantities: локальное количество меняет и текст, и сумму группы', () => {
  const items = [item(), item({ id: 't2', name: 'Pear lemonade', quantity: 2 })];
  const changed = withQuantities(items, { t2: 4 });
  assert.deepEqual(changed.map((line) => line.quantity), [3, 4]);
  assert.equal(reorderSum(changed), 3 * 155000 + 4 * 155000);
  assert.match(orderText(changed), /Black Burn Pear lemonade 200 г — 4 шт/);
  // Исходные строки не трогаем.
  assert.equal(items[1].quantity, 2);
});

test('reorderSum: нет цены хоть у одной строки — суммы нет', () => {
  assert.equal(reorderSum([item(), item({ id: 't2', lastPriceKop: null })]), null);
  assert.equal(reorderSum([]), null);
});

test('stepQuantity: не меньше одной банки и не больше 99', () => {
  assert.equal(stepQuantity(3, 1), 4);
  assert.equal(stepQuantity(1, -1), 1);
  assert.equal(stepQuantity(99, 1), 99);
});

test('countReorder считает строки во всех группах, без данных — null', () => {
  assert.equal(countReorder(null), null);
  assert.equal(countReorder({ groups: [group([item(), item({ id: 't2' })]), group([item({ id: 't3' })], { supplier: null })] }), 3);
  assert.equal(countReorder({ groups: [] }), 0);
});

test('groupKey: поставщик или «не выбран»', () => {
  assert.equal(groupKey(group([])), 's1');
  assert.equal(groupKey(group([], { supplier: null })), 'none');
});

test('groupCaption: последний счёт со статусом, план из каталога, без счёта', () => {
  assert.equal(groupCaption(group([item()])), 'последний счёт 18 ноя, черновик');
  assert.equal(
    groupCaption(group([item()], { lastInvoice: { number: null, date: '2026-11-12', status: 'received' } })),
    'последний счёт 12 ноя, принят',
  );
  assert.equal(groupCaption(group([item({ status: 'plan' })], { supplier: null, lastInvoice: null })), 'в плане из каталога');
  assert.equal(groupCaption(group([item({ status: 'out' })], { supplier: null, lastInvoice: null })), 'банки пришли без счёта поставщика');
  assert.equal(groupCaption(group([item()], { lastInvoice: null })), '');
});

test('untilLabel: закончился, в плане, дата с днями и тон по срочности', () => {
  assert.deepEqual(untilLabel(item({ status: 'out', daysLeft: null, endsAt: null }), 7), { text: 'закончился', days: null, tone: 'danger' });
  assert.deepEqual(untilLabel(item({ status: 'plan', daysLeft: null, endsAt: null }), 7), { text: 'в плане', days: null, tone: 'faint' });
  assert.deepEqual(untilLabel(item({ status: 'check' }), 7), { text: 'проверьте остаток', days: null, tone: 'warning' });
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).tone, 'danger');
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).days, '2 дн');
  assert.equal(untilLabel(item({ daysLeft: 6 }), 7).tone, 'warning');
  assert.equal(untilLabel(item({ daysLeft: 16 }), 7).tone, 'default');
  assert.equal(untilLabel(item({ daysLeft: 16, rateKind: 'brand' }), 7).text.startsWith('~'), true);
  assert.deepEqual(untilLabel(item({ daysLeft: null, endsAt: null }), 7), { text: '—', days: null, tone: 'faint' });
});

test('reorderRate: нет расхода — прочерк, оценка по бренду помечена', () => {
  assert.equal(reorderRate(item()), '21 г/день');
  assert.equal(reorderRate(item({ rate: null, rateKind: 'none' })), '—');
  assert.equal(reorderRate(item({ rate: 9.5, rateKind: 'brand' })), '≈ 9,5 г/день · бренд');
});

test('validateShelfSettings: целые числа в границах backend', () => {
  assert.deepEqual(validateShelfSettings({ bowlGrams: '20', leadDays: '10' }), { ok: true, value: { bowlGrams: 20, leadDays: 10 } });
  assert.deepEqual(validateShelfSettings({ bowlGrams: ' 18 ', leadDays: '7' }), { ok: true, value: { bowlGrams: 18, leadDays: 7 } });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '0', leadDays: '7' }), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18,5', leadDays: '7' }), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18', leadDays: '61' }), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18', leadDays: '' }), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
});
