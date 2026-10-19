import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReorderView, normalizeShelfDashboard, normalizeShelfSettings } from './contracts';

const tobacco = { id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Cane Mint' };

test('normalizeReorderView: группы, строки, настройки и текст заказа', () => {
  const view = normalizeReorderView({
    groups: [
      {
        supplier: { id: 's1', name: 'Каспий Опт' },
        lastInvoice: { number: '04102', date: '2026-11-18', status: 'draft' },
        items: [
          {
            tobacco,
            status: 'ending',
            daysLeft: 2.4,
            endsAt: '2026-11-21T10:00:00.000Z',
            rate: 21,
            rateKind: 'own',
            quantity: 3,
            packWeight: 200,
            lastPriceKop: 155000,
          },
        ],
        sumKop: 465000,
      },
      {
        supplier: null,
        lastInvoice: null,
        items: [{ tobacco: { id: 't2', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' }, status: 'plan', quantity: 1, packWeight: 250 }],
        sumKop: null,
      },
    ],
    settings: { bowlGrams: 20, leadDays: 5 },
    text: [{ supplierId: 's1', text: 'Добрый день! Заказ:' }, { supplierId: null, text: '…' }],
  });

  assert.equal(view.groups.length, 2);
  const [first, second] = view.groups;
  assert.deepEqual(first.supplier, { id: 's1', name: 'Каспий Опт' });
  assert.deepEqual(first.lastInvoice, { number: '04102', date: '2026-11-18', status: 'draft' });
  assert.equal(first.sumKop, 465000);
  assert.deepEqual(first.items[0], {
    tobacco,
    status: 'ending',
    daysLeft: 2.4,
    endsAt: '2026-11-21T10:00:00.000Z',
    rate: 21,
    rateKind: 'own',
    quantity: 3,
    packWeight: 200,
    lastPriceKop: 155000,
  });

  assert.equal(second.supplier, null);
  assert.equal(second.lastInvoice, null);
  assert.equal(second.sumKop, null);
  assert.deepEqual(second.items[0], {
    tobacco: { id: 't2', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' },
    status: 'plan',
    daysLeft: null,
    endsAt: null,
    rate: null,
    rateKind: 'none',
    quantity: 1,
    packWeight: 250,
    lastPriceKop: null,
  });

  assert.deepEqual(view.settings, { bowlGrams: 20, leadDays: 5 });
  assert.deepEqual(view.text, [{ supplierId: 's1', text: 'Добрый день! Заказ:' }, { supplierId: null, text: '…' }]);
});

test('normalizeReorderView переживает пустой и битый ответ', () => {
  assert.deepEqual(normalizeReorderView(null), { groups: [], settings: { bowlGrams: 18, leadDays: 7 }, text: [] });
  const view = normalizeReorderView({ groups: [{ items: 'x', lastInvoice: { date: 'вчера' } }] });
  assert.deepEqual(view.groups[0], { supplier: null, lastInvoice: null, items: [], sumKop: null });
});

test('normalizeShelfDashboard: прогноз, заканчивается, траты и недели', () => {
  const dashboard = normalizeShelfDashboard({
    today: { grams: 540.4, bowls: 30.02, weekdayFactor: 1.08, weekday: 4 },
    ending: [{ tobacco, status: 'ending', daysLeft: 2, endsAt: '2026-11-21T10:00:00.000Z' }, { tobacco, status: 'out', daysLeft: null, endsAt: null }],
    spend: {
      month: '2026-11',
      bySupplier: [{ supplier: { id: 's1', name: 'Каспий Опт' }, sumKop: 5108000 }, { supplier: null, sumKop: 100 }],
      totalKop: 5108100,
    },
    bowlCostKop: 13700,
    stockValueKop: 59400000,
    weekly: [
      { from: '2026-10-19', to: '2026-10-25', grams: 3420, partial: false },
      { from: '2026-11-16', to: '2026-11-19', grams: 2190, partial: true },
    ],
  });

  assert.deepEqual(dashboard.today, { grams: 540.4, bowls: 30.02, weekdayFactor: 1.08, weekday: 4 });
  assert.equal(dashboard.ending.length, 2);
  assert.deepEqual(dashboard.ending[1], { tobacco, status: 'out', daysLeft: null, endsAt: null });
  assert.deepEqual(dashboard.spend, {
    month: '2026-11',
    bySupplier: [{ supplier: { id: 's1', name: 'Каспий Опт' }, sumKop: 5108000 }, { supplier: null, sumKop: 100 }],
    totalKop: 5108100,
  });
  assert.equal(dashboard.bowlCostKop, 13700);
  assert.equal(dashboard.stockValueKop, 59400000);
  assert.deepEqual(dashboard.weekly[1], { from: '2026-11-16', to: '2026-11-19', grams: 2190, partial: true });
});

test('normalizeShelfDashboard: без поправки на день недели и без цен', () => {
  const dashboard = normalizeShelfDashboard({ today: { grams: 0, bowls: 0, weekdayFactor: null, weekday: 1 }, bowlCostKop: null });
  assert.equal(dashboard.today.weekdayFactor, null);
  assert.equal(dashboard.bowlCostKop, null);
  assert.equal(dashboard.stockValueKop, 0);
  assert.deepEqual(dashboard.ending, []);
  assert.deepEqual(dashboard.weekly, []);
  assert.deepEqual(dashboard.spend, { month: '', bySupplier: [], totalKop: 0 });
});

test('normalizeShelfSettings: ответ PATCH и значения по умолчанию', () => {
  assert.deepEqual(normalizeShelfSettings({ bowlGrams: 20, leadDays: 10 }), { bowlGrams: 20, leadDays: 10 });
  assert.deepEqual(normalizeShelfSettings(undefined), { bowlGrams: 18, leadDays: 7 });
});
