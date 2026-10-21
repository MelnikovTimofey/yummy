import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReorderGroup, ReorderItem } from '../contracts';
import {
  countReorder,
  groupCaption,
  groupKey,
  groupOrderText,
  orderText,
  reorderItemName,
  reorderHint,
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
    leftGrams: 40,
    quantityGrams: 450,
    gramPriceKop: 775,
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

test('orderText повторяет формат backend (shelf-insights orderText): граммы', () => {
  assert.equal(
    orderText([item(), item({ id: 't2', brand: 'Sebero', name: 'Лимонная шипучка', quantityGrams: 350 })]),
    'Добрый день! Заказ:\nBlack Burn Cane Mint — 450 г\nSebero Лимонная шипучка — 350 г\nСпасибо!',
  );
});

test('withQuantities: локальные граммы меняют и текст, и сумму группы', () => {
  const items = [item(), item({ id: 't2', name: 'Pear lemonade', quantityGrams: 200 })];
  const changed = withQuantities(items, { t2: 300 });
  assert.deepEqual(changed.map((line) => line.quantityGrams), [450, 300]);
  assert.equal(reorderSum(changed), 450 * 775 + 300 * 775);
  assert.match(orderText(changed), /Black Burn Pear lemonade — 300 г/);
  // Исходные строки не трогаем.
  assert.equal(items[1].quantityGrams, 200);
});

test('reorderSum: цена грамма дробная — сумма в целых копейках; нет цены — суммы нет', () => {
  assert.equal(reorderSum([item({ quantityGrams: 150, gramPriceKop: 7.75 * 100 + 0.333 })]), Math.round(150 * 775.333));
  assert.equal(reorderSum([item(), item({ id: 't2', gramPriceKop: null })]), null);
  assert.equal(reorderSum([]), null);
});

test('stepQuantity: шаг ± 50 г, не меньше 50 г', () => {
  assert.equal(stepQuantity(450, 1), 500);
  assert.equal(stepQuantity(450, -1), 400);
  assert.equal(stepQuantity(50, -1), 50);
  // Чужое количество от backend выравниваем к шагу.
  assert.equal(stepQuantity(130, 1), 150);
  assert.equal(stepQuantity(130, -1), 100);
});

test('groupOrderText: без правок — текст из ответа, после правки — пересобран в граммах', () => {
  const items = [item(), item({ id: 't2', name: 'Pear lemonade', quantityGrams: 200 })];
  const g = group(items);
  const text = [{ supplierId: 's1', text: 'текст backend' }];
  assert.equal(groupOrderText(g, items, text, {}), 'текст backend');
  assert.equal(groupOrderText(g, items, text, { t9: 100 }), 'текст backend');
  // Вернули степпер к исходному — снова текст backend.
  assert.equal(groupOrderText(g, items, text, { t2: 200 }), 'текст backend');
  const changed = withQuantities(items, { t2: 250 });
  assert.equal(groupOrderText(g, changed, text, { t2: 250 }), orderText(changed));
  // Группа без поставщика — ключ null; текста нет — собираем сами.
  const none = group(items, { supplier: null });
  assert.equal(groupOrderText(none, items, [{ supplierId: null, text: 'без поставщика' }], {}), 'без поставщика');
  assert.equal(groupOrderText(g, items, [], {}), orderText(items));
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
  assert.equal(groupCaption(group([item({ status: 'out' })], { supplier: null, lastInvoice: null })), 'приход без счёта поставщика');
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

test('reorderRate: свой расход с остатком, по бренду — без остатка, нет расхода — «мало данных»', () => {
  assert.equal(reorderRate(item()), '21 г/день · 40 г');
  assert.equal(reorderRate(item({ leftGrams: 0, rate: 15 })), '15 г/день · 0 г');
  assert.equal(reorderRate(item({ leftGrams: null })), '21 г/день');
  assert.equal(reorderRate(item({ rate: 12, rateKind: 'brand' })), '≈ 12 г/день · бренд');
  assert.equal(reorderRate(item({ rate: null, rateKind: 'none', leftGrams: null })), 'мало данных');
  assert.equal(reorderRate(item({ rate: null, rateKind: 'none' })), 'мало данных · 40 г');
});

test('reorderHint: формулировка мокапа и срок поставки из настроек точки', () => {
  assert.equal(
    reorderHint(7),
    'Заказать — расход на 21 день минус остаток, вверх до 50 г; шаг ± 50 г. Срок поставки — 7 дней (настройка точки).',
  );
  assert.match(reorderHint(1), /Срок поставки — 1 день/);
});

test('validateShelfSettings: целые числа в границах backend', () => {
  assert.deepEqual(validateShelfSettings({ bowlGrams: '20', leadDays: '10' }), { ok: true, value: { bowlGrams: 20, leadDays: 10 } });
  assert.deepEqual(validateShelfSettings({ bowlGrams: ' 18 ', leadDays: '7' }), { ok: true, value: { bowlGrams: 18, leadDays: 7 } });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '0', leadDays: '7' }), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18,5', leadDays: '7' }), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18', leadDays: '61' }), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
  assert.deepEqual(validateShelfSettings({ bowlGrams: '18', leadDays: '' }), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
});
