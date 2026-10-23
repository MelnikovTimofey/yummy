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
            monthGrams: 630,
            leftGrams: 40,
            gramPriceKop: 775,
            byInterval: true,
          },
        ],
      },
      {
        supplier: null,
        lastInvoice: null,
        items: [{ tobacco: { id: 't2', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' }, status: 'plan' }],
      },
    ],
    settings: { bowlGrams: 20, leadDays: 5, budgetKop: 15000000 },
    interval: { days: 10, deliveries: 6 },
    horizon: { days: 15, until: '2026-12-04T10:00:00.000Z' },
    text: [{ supplierId: 's1', text: 'Добрый день! Заказ:' }, { supplierId: null, text: '…' }],
  });

  assert.equal(view.groups.length, 2);
  const [first, second] = view.groups;
  assert.deepEqual(first.supplier, { id: 's1', name: 'Каспий Опт' });
  assert.deepEqual(first.lastInvoice, { number: '04102', date: '2026-11-18', status: 'draft' });
  assert.equal('sumKop' in first, false);
  assert.deepEqual(first.items[0], {
    tobacco,
    status: 'ending',
    daysLeft: 2.4,
    endsAt: '2026-11-21T10:00:00.000Z',
    rate: 21,
    rateKind: 'own',
    monthGrams: 630,
    leftGrams: 40,
    gramPriceKop: 775,
    byInterval: true,
  });

  assert.equal(second.supplier, null);
  assert.equal(second.lastInvoice, null);
  assert.deepEqual(second.items[0], {
    tobacco: { id: 't2', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Supernova' },
    status: 'plan',
    daysLeft: null,
    endsAt: null,
    rate: null,
    rateKind: 'none',
    monthGrams: null,
    leftGrams: null,
    gramPriceKop: null,
    byInterval: false,
  });

  assert.deepEqual(view.settings, { bowlGrams: 20, leadDays: 5, budgetKop: 15000000 });
  assert.deepEqual(view.interval, { days: 10, deliveries: 6 });
  assert.deepEqual(view.horizon, { days: 15, until: '2026-12-04T10:00:00.000Z' });
  assert.deepEqual(view.text, [{ supplierId: 's1', text: 'Добрый день! Заказ:' }, { supplierId: null, text: '…' }]);
});

test('normalizeReorderView переживает пустой и битый ответ', () => {
  assert.deepEqual(normalizeReorderView(null), {
    groups: [],
    settings: { bowlGrams: 18, leadDays: 7, budgetKop: null },
    // Интервал неизвестен — горизонт по сроку поставки.
    interval: { days: null, deliveries: 0 },
    horizon: { days: 7, until: '' },
    text: [],
  });
  const view = normalizeReorderView({ groups: [{ items: 'x', lastInvoice: { date: 'вчера' } }], interval: { days: 'x', deliveries: 2 } });
  assert.deepEqual(view.groups[0], { supplier: null, lastInvoice: null, items: [] });
  assert.deepEqual(view.interval, { days: null, deliveries: 2 });
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
    budget: { budgetKop: 15000000, baseKop: 11200000, baseCount: 40, unknownCount: 9, leftKop: 3800000 },
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
  assert.deepEqual(dashboard.budget, { budgetKop: 15000000, baseKop: 11200000, baseCount: 40, unknownCount: 9, leftKop: 3800000 });
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
  // Бюджет не указан — остатка на пробы нет.
  assert.deepEqual(dashboard.budget, { budgetKop: null, baseKop: 0, baseCount: 0, unknownCount: 0, leftKop: null });
});

test('normalizeShelfSettings: ответ PATCH и значения по умолчанию', () => {
  assert.deepEqual(normalizeShelfSettings({ bowlGrams: 20, leadDays: 10, budgetKop: 15000000 }), { bowlGrams: 20, leadDays: 10, budgetKop: 15000000 });
  assert.deepEqual(normalizeShelfSettings({ bowlGrams: 20, leadDays: 10, budgetKop: null }), { bowlGrams: 20, leadDays: 10, budgetKop: null });
  assert.deepEqual(normalizeShelfSettings(undefined), { bowlGrams: 18, leadDays: 7, budgetKop: null });
});
