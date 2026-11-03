import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfOrder } from './contracts';

const tobacco = { id: 'bb-cane', manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' };

test('normalizeShelfOrder: группы по поставщику, строки и «не держим» (#518)', () => {
  const order = normalizeShelfOrder({
    groups: [
      {
        supplier: { id: 's1', name: 'Каспий Опт' },
        lastDeliveryAt: '2026-10-12T10:00:00.000Z',
        lines: [
          {
            tobacco,
            outAt: '2026-11-03T09:00:00.000Z',
            mixes: { total: 6, hidden: 2, substituted: 4 },
            lastArrival: { at: '2026-10-12T10:00:00.000Z', kind: 'invoice', supplier: 'Каспий Опт', number: '1184', qty: 2, deliveryId: 'd1' },
          },
        ],
      },
      { supplier: null, lastDeliveryAt: null, lines: [{ tobacco: { id: 'mh-pine' }, outAt: '2026-10-21T09:00:00.000Z' }] },
    ],
    notKept: [{ tobaccoId: 'hl-pool', manufacturer: 'Хулиган', lineName: '', name: 'POOL', outAt: '2026-10-28T09:00:00.000Z' }, 'мусор'],
  });
  assert.equal(order.groups.length, 2);
  assert.deepEqual(order.groups[0].supplier, { id: 's1', name: 'Каспий Опт' });
  assert.equal(order.groups[0].lastDeliveryAt, '2026-10-12T10:00:00.000Z');
  assert.deepEqual(order.groups[0].lines[0], {
    tobacco,
    outAt: '2026-11-03T09:00:00.000Z',
    mixes: { total: 6, hidden: 2, substituted: 4 },
    lastArrival: { at: '2026-10-12T10:00:00.000Z', kind: 'invoice', supplier: 'Каспий Опт', number: '1184', qty: 2, deliveryId: 'd1' },
  });
  assert.equal(order.groups[1].supplier, null);
  assert.equal(order.groups[1].lastDeliveryAt, null);
  assert.deepEqual(order.groups[1].lines[0].mixes, { total: 0, hidden: 0, substituted: 0 });
  assert.equal(order.groups[1].lines[0].lastArrival, null);
  assert.deepEqual(order.notKept, [{ tobaccoId: 'hl-pool', manufacturer: 'Хулиган', lineName: '', name: 'POOL', outAt: '2026-10-28T09:00:00.000Z' }]);
});

test('normalizeShelfOrder: пустой ответ — пустая заявка', () => {
  assert.deepEqual(normalizeShelfOrder(null), { groups: [], notKept: [] });
});
