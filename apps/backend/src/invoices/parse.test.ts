import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parseInvoice } from './parse';
import type { TextPage } from './types';

const loadFixture = (name: string): TextPage[] =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', `invoice-format-${name}.items.json`), 'utf8'));

const replaceItem = (pages: TextPage[], str: string, patch: Partial<TextPage[number]>) =>
  pages.map((page) => page.map((item) => (item.str === str ? { ...item, ...patch } : item)));

test('parseInvoice reads format A: header, supplier, single-row lines with articles', () => {
  const result = parseInvoice(loadFixture('a'));
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.format, 'a');
  assert.deepEqual(result.supplier, { name: 'ИП Петров П. П.', inn: '771234567890' });
  assert.equal(result.number, 'ИУ-1001');
  assert.equal(result.date, '2026-10-12');
  assert.equal(result.lines.length, 9);
  assert.deepEqual(result.lines[0], {
    n: 1,
    article: 'DSSB250-0005',
    name: '"Дарк Сайд" Саботаж (Вольтэйдж) 250гр',
    qty: 1,
    unit: 'шт',
    priceKop: 188600,
    sumKop: 188600,
  });
  assert.deepEqual(result.lines[8], {
    n: 9,
    article: 'SL2028',
    name: '"Старлайн" (Черничный крамбл), 250 г',
    qty: 1,
    unit: 'шт',
    priceKop: 156000,
    sumKop: 156000,
  });
  assert.deepEqual(
    result.lines.map((line) => line.n),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(result.totalKop, 1599600);
  assert.equal(result.linesSumKop, 1599600);
  assert.equal(result.sumMatches, true);
});

test('parseInvoice reads format B: wrapped names glued top-down around the row number', () => {
  const result = parseInvoice(loadFixture('b'));
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.format, 'b');
  assert.deepEqual(result.supplier, {
    name: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ОПТ-ПРИМЕР"',
    inn: '7700000001',
  });
  assert.equal(result.number, '01001');
  assert.equal(result.date, '2026-10-13');
  assert.equal(result.lines.length, 15);
  assert.deepEqual(
    result.lines.map((line) => line.n),
    Array.from({ length: 15 }, (_, index) => index + 1),
  );
  assert.ok(result.lines.every((line) => line.article === undefined));

  assert.deepEqual(result.lines[0], { n: 1, name: 'ОБЛАКО Египетская', qty: 1, unit: 'шт', priceKop: 50000, sumKop: 50000 });
  assert.equal(result.lines[1].name, 'Табак для кальяна BLANSH 200 гр Грейпфрутовый Сок');
  assert.equal(result.lines[4].name, 'Табак для кальяна Black Burn 200г Original Popcorn (Оригинальный попкорн)');
  assert.equal(result.lines[5].name, 'Табак для кальяна Black Burn 200г Pear Lemonade (Грушевый лимонад)');
  assert.deepEqual(result.lines[7], {
    n: 8,
    name: 'Табак для кальяна Black Burn 200г Raspberries (Спелая лесная малина)',
    qty: 2,
    unit: 'шт',
    priceKop: 155000,
    sumKop: 310000,
  });
  assert.equal(result.lines[12].name, 'Табак для кальяна Сарма 25г Бабл Гам');
  assert.equal(result.lines[12].priceKop, 22000);
  assert.equal(result.lines[13].name, 'Табак для кальяна Сарма 360 Крепкая 200гр Маракуйя');
  assert.equal(result.lines[14].name, 'Табак для кальяна Хулиган 200г Panama (Фруктовый салатик)');
  assert.equal(result.totalKop, 2227000);
  assert.equal(result.linesSumKop, 2227000);
  assert.equal(result.sumMatches, true);
});

test('parseInvoice flags a total that does not match the sum of lines', () => {
  const pages = replaceItem(loadFixture('b'), '22270,00', { str: '22370,00' });
  const result = parseInvoice(pages);
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.totalKop, 2237000);
  assert.equal(result.linesSumKop, 2227000);
  assert.equal(result.sumMatches, false);
});

test('parseInvoice keeps a short name in the name column even if it ends before the name header', () => {
  const pages = replaceItem(loadFixture('a'), '"Дарк Сайд" Кор (Пинк Ми), 250 г', { str: 'Пинк Ми', w: 30 });
  const result = parseInvoice(pages);
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.lines[4].article, 'DT734');
  assert.equal(result.lines[4].name, 'Пинк Ми');
});

test('parseInvoice reports an empty text layer as no-text', () => {
  assert.deepEqual(parseInvoice([]), { kind: 'no-text' });
  assert.deepEqual(parseInvoice([[], []]), { kind: 'no-text' });
  assert.deepEqual(parseInvoice([[{ str: '  ', x: 10, y: 10, w: 5, h: 5 }]]), { kind: 'no-text' });
});

test('parseInvoice reports a document without a known table header as unknown-format', () => {
  const pages: TextPage[] = [
    [
      { str: 'Накладная № 7 от 01.10.2026', x: 40, y: 700, w: 200, h: 10 },
      { str: '№', x: 40, y: 600, w: 10, h: 8 },
      { str: 'Товар', x: 80, y: 600, w: 40, h: 8 },
      { str: 'Сумма', x: 400, y: 600, w: 40, h: 8 },
    ],
  ];
  assert.deepEqual(parseInvoice(pages), { kind: 'unknown-format' });
});
