import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfRow, type ShelfRow } from '../contracts';
import { sheetLine, shelfMobileActions, shelfMobileSummary } from './shelf-mobile';

const row = (patch: Partial<ShelfRow> = {}): ShelfRow => ({
  ...normalizeShelfRow({
    tobacco: { id: 'bb-rasp', manufacturer: 'Black Burn', name: 'Raspberries' },
    status: 'ok',
    leftGrams: 300,
    fullGrams: 400,
    lastReceipt: { at: '2026-11-12T10:00:00', grams: 400, kind: 'invoice', number: '03944', label: 'Каспий Опт' },
    rate: 14.7,
    rateKind: 'own',
    daysLeft: 20,
    endsAt: '2026-12-09T10:00:00.000Z',
  }),
  ...patch,
});

test('кнопки карточки: «Указать остаток» и «Закончился», у «проверьте» — «Отметить остаток»', () => {
  assert.deepEqual(shelfMobileActions(row()), { note: null, left: 'Указать остаток', right: 'empty' });
  assert.deepEqual(shelfMobileActions(row({ status: 'ending' })), { note: null, left: 'Указать остаток', right: 'empty' });
  assert.deepEqual(shelfMobileActions(row({ status: 'check' })), { note: null, left: 'Отметить остаток', right: 'empty' });
  assert.deepEqual(shelfMobileActions(row({ status: 'stop' })), { note: null, left: 'Указать остаток', right: 'unstop' });
  assert.deepEqual(shelfMobileActions(row({ status: 'out', leftGrams: 0 })), { note: 'в заказе', left: null, right: null });
  assert.deepEqual(shelfMobileActions(row({ status: 'plan', leftGrams: null, fullGrams: null })), { note: 'в заказе', left: null, right: null });
});

test('строка шторки: уровень после прихода, остаток по расчёту — подсказкой ниже', () => {
  assert.equal(sheetLine(row()), 'После прихода 12 ноя было 400 г');
  assert.equal(sheetLine(row({ leftGrams: null, fullGrams: null, lastReceipt: null })), 'Прихода ещё не было');
});

test('сводка полки на телефоне — одна строка вместо KPI-плиток', () => {
  assert.equal(
    shelfMobileSummary({ counters: { all: 269 }, totals: { kg: 78.04 }, today: { grams: 126.4, bowls: 7.02 } }).replace(/\u00a0/g, ' '),
    '269 позиций, 78 кг. Сегодня уйдёт 126 г.',
  );
  // Расхода ещё нет — прогноз дня не пишем.
  assert.equal(
    shelfMobileSummary({ counters: { all: 1 }, totals: { kg: 0.25 }, today: { grams: 0, bowls: 0 } }),
    '1 позиция, 0,3 кг.',
  );
});
