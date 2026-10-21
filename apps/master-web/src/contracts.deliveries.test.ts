import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDeliveryCard, normalizeDeliveryList } from './contracts';

const rawLine = {
  id: 'l1',
  n: 5,
  rawName: 'Табак для кальяна Black Burn 200г Original Popcorn',
  article: 'BB-001',
  qty: 2,
  unit: 'шт',
  priceKop: 155000,
  sumKop: 310000,
  grams: 200,
  receivedGrams: 350,
  kind: 'tobacco',
  arrived: true,
  tobacco: { id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Original Popcorn', shelfStatus: null },
  matchReason: 'memory',
  confidence: 100,
  candidates: [{ id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Original Popcorn', confidence: 100, reason: 'memory' }],
  newOnShelf: true,
};

const rawCard = {
  id: 'd1',
  kind: 'invoice',
  status: 'draft',
  supplier: { id: 's1', name: 'Каспий Опт', inn: '7700000000' },
  number: '04102',
  invoiceDate: '2026-11-18',
  receivedAt: null,
  totalKop: 2227000,
  fileName: 'invoice.pdf',
  hasFile: true,
  createdAt: '2026-11-18T09:00:00.000Z',
  lines: [rawLine],
  linesSumKop: 310000,
  sumMatches: false,
  pendingLines: 0,
  gramsToReceive: 350,
  grams: 0,
};

test('normalizeDeliveryCard читает карточку поставки и строки разбора', () => {
  const card = normalizeDeliveryCard(rawCard);
  assert.equal(card.id, 'd1');
  assert.equal(card.kind, 'invoice');
  assert.equal(card.status, 'draft');
  assert.deepEqual(card.supplier, { id: 's1', name: 'Каспий Опт', inn: '7700000000' });
  assert.equal(card.number, '04102');
  assert.equal(card.invoiceDate, '2026-11-18');
  assert.equal(card.receivedAt, null);
  assert.equal(card.totalKop, 2227000);
  assert.equal(card.hasFile, true);
  assert.equal(card.sumMatches, false);
  assert.equal(card.gramsToReceive, 350);
  assert.equal(card.grams, 0);
  assert.equal(card.lines.length, 1);

  const [line] = card.lines;
  assert.equal(line.n, 5);
  assert.equal(line.article, 'BB-001');
  assert.equal(line.qty, 2);
  assert.equal(line.grams, 200);
  // Мастер поправил приход: пришло не всё.
  assert.equal(line.receivedGrams, 350);
  assert.equal(line.priceKop, 155000);
  assert.equal(line.kind, 'tobacco');
  assert.equal(line.arrived, true);
  assert.equal(line.tobacco?.name, 'Original Popcorn');
  assert.equal(line.tobacco?.shelfStatus, null);
  assert.equal(line.matchReason, 'memory');
  assert.equal(line.confidence, 100);
  assert.equal(line.candidates[0].reason, 'memory');
  assert.equal(line.newOnShelf, true);
});

test('normalizeDeliveryCard не доверяет неизвестным значениям', () => {
  const card = normalizeDeliveryCard({
    id: 'd2',
    kind: 'weird',
    status: 'cancelled',
    supplier: null,
    totalKop: null,
    sumMatches: null,
    lines: [{ id: 'l2', kind: 'coal', matchReason: 'guess', tobacco: null, priceKop: 'x', grams: null, candidates: 'nope' }],
  });
  assert.equal(card.kind, 'manual');
  assert.equal(card.status, 'draft');
  assert.equal(card.supplier, null);
  assert.equal(card.totalKop, null);
  assert.equal(card.sumMatches, null);
  assert.equal(card.hasFile, false);
  const [line] = card.lines;
  assert.equal(line.kind, 'tobacco');
  assert.equal(line.matchReason, null);
  assert.equal(line.priceKop, null);
  assert.equal(line.grams, null);
  assert.equal(line.receivedGrams, null);
  assert.equal(line.qty, 1);
  assert.equal(line.arrived, true);
  assert.deepEqual(line.candidates, []);
});

test('normalizeDeliveryList читает список и итоги месяца', () => {
  const list = normalizeDeliveryList({
    items: [
      {
        id: 'd1',
        kind: 'invoice',
        status: 'received',
        supplier: 'Каспий Опт',
        number: '03944',
        invoiceDate: '2026-11-11',
        receivedAt: '2026-11-12T08:00:00.000Z',
        lines: 12,
        grams: 2800,
        totalKop: 1986000,
        createdAt: '2026-11-11T10:00:00.000Z',
      },
      { id: 'd0', kind: 'start', status: 'received', supplier: null, number: null, lines: 0, grams: 53800, totalKop: null },
    ],
    totals: { monthKop: 6607600, monthGrams: 9000, drafts: 1, suppliers: 2, memoryItems: 61 },
  });
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].grams, 2800);
  assert.equal(list.items[1].grams, 53800);
  assert.equal(list.items[0].supplier, 'Каспий Опт');
  assert.equal(list.items[0].receivedAt, '2026-11-12T08:00:00.000Z');
  assert.equal(list.items[1].kind, 'start');
  assert.equal(list.items[1].supplier, null);
  assert.equal(list.items[1].invoiceDate, null);
  assert.equal(list.items[1].totalKop, null);
  assert.deepEqual(list.totals, { monthKop: 6607600, monthGrams: 9000, drafts: 1, suppliers: 2, memoryItems: 61 });
});

test('normalizeDeliveryList на пустом ответе — пустой список и нули', () => {
  const list = normalizeDeliveryList(null);
  assert.deepEqual(list.items, []);
  assert.deepEqual(list.totals, { monthKop: 0, monthGrams: 0, drafts: 0, suppliers: 0, memoryItems: 0 });
});
