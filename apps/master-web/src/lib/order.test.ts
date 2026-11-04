import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfOrder } from '../contracts';
import { groupMeta, groupTitle, notKeptText, orderCopyText, orderCount, orderMixes } from './order';

const line = (manufacturer: string, name: string, mixes = { total: 0, hidden: 0, substituted: 0 }) => ({
  tobacco: { id: `${manufacturer}-${name}`, manufacturer, lineName: '', name },
  outAt: '2026-11-03T09:00:00',
  mixes,
  lastArrival: null,
});

const order = normalizeShelfOrder({
  groups: [
    { supplier: { id: 's1', name: 'Каспий Опт' }, lastDeliveryAt: '2026-10-12T10:00:00', lines: [line('Black Burn', 'Cane Mint'), line('Sebero', 'Лимонная шипучка')] },
    { supplier: null, lastDeliveryAt: null, lines: [line('Musthave', 'Pineapple Rings')] },
  ],
  notKept: [
    { tobaccoId: 'a', manufacturer: 'Хулиган', name: 'POOL', outAt: '2026-10-28T09:00:00' },
    { tobaccoId: 'b', manufacturer: 'Сарма', name: 'Ромашковое варенье', outAt: '2026-10-20T09:00:00' },
  ],
});

test('orderCount: сколько табаков в заявке, для переключателя «К заказу N»', () => {
  assert.equal(orderCount(order), 3);
  assert.equal(orderCount(null), 0);
});

test('groupTitle и groupMeta: поставщик и последний счёт; без счёта — своей группой', () => {
  assert.equal(groupTitle(order.groups[0]), 'Каспий Опт');
  assert.equal(groupMeta(order.groups[0]), 'последний счёт 12 окт');
  assert.equal(groupTitle(order.groups[1]), 'Без счёта');
  assert.equal(groupMeta(order.groups[1]), null);
});

test('orderCopyText: заявка — только названия «Бренд Название» построчно (#shot=order-copied)', () => {
  assert.equal(orderCopyText(order.groups[0]), 'Black Burn Cane Mint\nSebero Лимонная шипучка');
});

test('orderMixes: сколько миксов скрыто у гостя, закрыт аналогом или нет в миксах', () => {
  assert.deepEqual(orderMixes({ total: 6, hidden: 2, substituted: 4 }), { text: '2 из 6 скрыты у гостя', tone: 'default' });
  assert.deepEqual(orderMixes({ total: 1, hidden: 1, substituted: 0 }), { text: '1 микс скрыт у гостя', tone: 'default' });
  assert.deepEqual(orderMixes({ total: 3, hidden: 3, substituted: 0 }), { text: '3 микса скрыты у гостя', tone: 'default' });
  assert.deepEqual(orderMixes({ total: 3, hidden: 1, substituted: 2 }), { text: '1 из 3 скрыт у гостя', tone: 'default' });
  assert.deepEqual(orderMixes({ total: 2, hidden: 0, substituted: 2 }), { text: 'закрыт аналогом', tone: 'muted' });
  assert.deepEqual(orderMixes({ total: 0, hidden: 0, substituted: 0 }), { text: 'нет в миксах', tone: 'faint' });
});

test('notKeptText: закончились, но не держим, — одной строкой', () => {
  assert.equal(notKeptText(order.notKept), 'Ещё 2 закончились, их не держим постоянно: Хулиган POOL, Сарма Ромашковое варенье.');
  assert.equal(
    notKeptText(order.notKept.slice(0, 1)),
    'Ещё 1 закончился, его не держим постоянно: Хулиган POOL.',
  );
  const many = Array.from({ length: 7 }, (_, index) => ({ ...order.notKept[0], tobaccoId: `t${index}`, name: `T${index}` }));
  assert.equal(notKeptText(many), 'Ещё 7 закончились, их не держим постоянно: Хулиган T0, Хулиган T1, Хулиган T2, Хулиган T3, Хулиган T4 и ещё 2.');
});
