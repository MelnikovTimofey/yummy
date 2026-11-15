import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfOrder } from '../contracts';
import { groupMeta, groupTitle, isStalePlan, notKeptText, orderCopyText, orderCount, orderMixes, planCopyText, planMixes } from './order';

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
  plan: [
    { tobacco: { id: 'p1', manufacturer: 'Musthave', lineName: '', name: 'Pineapple Rings' }, plannedAt: '2026-09-12T09:00:00', mixes: { total: 1, hidden: 1, substituted: 0 } },
    { tobacco: { id: 'p2', manufacturer: 'Bonche', lineName: '', name: 'Clover Club' }, plannedAt: '2026-11-11T09:00:00', mixes: { total: 2, hidden: 2, substituted: 0 } },
  ],
});

test('orderCount: закончившиеся вместе с планом, для переключателя «К заказу N» (#563)', () => {
  assert.equal(orderCount(order), 5);
  assert.equal(orderCount({ ...order, groups: [] }), 2);
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

test('planMixes: сколько миксов ждут табак из плана (#shot=order-plan)', () => {
  assert.deepEqual(planMixes({ total: 1, hidden: 1, substituted: 0 }), { text: 'ждёт 1 микс', tone: 'default' });
  assert.deepEqual(planMixes({ total: 2, hidden: 2, substituted: 0 }), { text: 'ждут 2 микса', tone: 'default' });
  assert.deepEqual(planMixes({ total: 6, hidden: 5, substituted: 1 }), { text: 'ждут 5 миксов', tone: 'default' });
  assert.deepEqual(planMixes({ total: 21, hidden: 21, substituted: 0 }), { text: 'ждёт 21 микс', tone: 'default' });
  assert.deepEqual(planMixes({ total: 2, hidden: 0, substituted: 2 }), { text: 'закрыт аналогом', tone: 'muted' });
  assert.deepEqual(planMixes({ total: 0, hidden: 0, substituted: 0 }), { text: 'нет в миксах', tone: 'faint' });
});

test('planCopyText: список плана — только названия построчно', () => {
  assert.equal(planCopyText(order.plan), 'Musthave Pineapple Rings\nBonche Clover Club');
});

test('isStalePlan: в плане больше 30 дней', () => {
  const now = new Date('2026-11-13T12:00:00');
  assert.equal(isStalePlan('2026-09-12T09:00:00', now), true);
  assert.equal(isStalePlan('2026-10-14T13:00:00', now), false);
  assert.equal(isStalePlan('2026-10-13T11:00:00', now), true);
  assert.equal(isStalePlan('2026-11-11T09:00:00', now), false);
  assert.equal(isStalePlan(null, now), false);
});
