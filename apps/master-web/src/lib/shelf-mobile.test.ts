import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfRow, type ShelfRow } from '../contracts';
import {
  SHEET_MARK_OPTIONS,
  SHELF_MOBILE_CHIPS,
  defaultMobileShelfStatus,
  markTargetPack,
  openPackLine,
  relativeDay,
  sheetEmptyLabel,
  shelfMobileAction,
  shelfMobileSummary,
} from './shelf-mobile';

const row = (patch: Partial<ShelfRow> = {}): ShelfRow => ({
  ...normalizeShelfRow({
    tobacco: { id: 'ds-blackcurrant', manufacturer: 'DARKSIDE', name: 'Blackcurrant' },
    status: 'ok',
    openPacks: [{ id: 'p1', weight: 250, openedAt: '2026-11-07T10:00:00.000Z', fraction: 0.4 }],
    sealedCount: 1,
    rate: 10,
    rateKind: 'own',
    daysLeft: 12,
    endsAt: '2026-12-01T10:00:00.000Z',
    packWeight: 250,
  }),
  ...patch,
});

const NOW = new Date('2026-11-19T15:00:00');

test('на телефоне первым идёт «Заканчивается», «Все» — среди первых, все статусы на месте', () => {
  assert.deepEqual(
    SHELF_MOBILE_CHIPS.map(([key]) => key),
    ['ending', 'last', 'out', 'all', 'ok', 'stop', 'plan'],
  );
});

test('чип по умолчанию: «Заканчивается», если там что-то есть, иначе «Все»', () => {
  assert.equal(defaultMobileShelfStatus({ ending: 14 }), 'ending');
  assert.equal(defaultMobileShelfStatus({ ending: 0 }), 'all');
});

test('главная кнопка карточки: «Закончилась», «Проверить» для просроченной, «Снять стоп», ничего у закончившихся', () => {
  assert.deepEqual(shelfMobileAction(row()), { kind: 'empty', label: 'Закончилась', disabled: false });
  assert.deepEqual(shelfMobileAction(row({ status: 'ending' })), { kind: 'empty', label: 'Закончилась', disabled: false });
  assert.deepEqual(shelfMobileAction(row({ status: 'check' })), { kind: 'check', label: 'Проверить', disabled: false });
  assert.deepEqual(shelfMobileAction(row({ status: 'stop' })), { kind: 'unstop', label: 'Снять стоп', disabled: false });
  assert.deepEqual(shelfMobileAction(row({ status: 'out', openPacks: [], sealedCount: 0 })), { kind: 'none', label: 'в «К заказу»', disabled: true });
  assert.deepEqual(shelfMobileAction(row({ status: 'plan', openPacks: [], sealedCount: 0 })), { kind: 'none', label: 'в «К заказу»', disabled: true });
  // Банки только в запасе: опустошать нечего, как и на десктопе.
  assert.deepEqual(shelfMobileAction(row({ openPacks: [] })), { kind: 'empty', label: 'Закончилась', disabled: true });
});

test('«Закончилась» в шторке предупреждает, когда это последняя банка', () => {
  assert.equal(sheetEmptyLabel(row()), 'Закончилась');
  assert.equal(sheetEmptyLabel(row({ sealedCount: 0 })), 'Закончилась · запаса нет');
  const twoOpen = row({
    sealedCount: 0,
    openPacks: [
      { id: 'p1', weight: 250, openedAt: '2026-11-07T10:00:00.000Z', fraction: 0.4 },
      { id: 'p2', weight: 250, openedAt: '2026-11-10T10:00:00.000Z', fraction: 1 },
    ],
  });
  assert.equal(sheetEmptyLabel(twoOpen), 'Закончилась');
});

test('отметка уходит в самую старую открытую банку — как на backend', () => {
  const twoOpen = row({
    openPacks: [
      { id: 'late', weight: 250, openedAt: '2026-11-10T10:00:00.000Z', fraction: 1 },
      { id: 'early', weight: 250, openedAt: '2026-11-07T10:00:00.000Z', fraction: 0.4 },
    ],
  });
  assert.equal(markTargetPack(twoOpen)?.id, 'early');
  assert.equal(markTargetPack(row({ openPacks: [] })), null);
});

test('relativeDay: сегодня, вчера, иначе дата', () => {
  assert.equal(relativeDay('2026-11-19T09:00:00', NOW), 'сегодня');
  assert.equal(relativeDay('2026-11-18T23:30:00', NOW), 'вчера');
  assert.equal(relativeDay('2026-11-07T10:00:00', NOW), '7 ноя');
});

test('openPackLine: вскрытие и последняя отметка открытой банки', () => {
  const marks = [
    { at: '2026-11-12T10:00:00', fraction: 0.5 },
    { at: '2026-11-18T20:00:00', fraction: 0.25 },
  ];
  assert.equal(openPackLine(row(), marks, NOW), 'Открытая банка · вскрыта 7 ноя · отметка ¼ вчера');
  assert.equal(openPackLine(row(), [], NOW), 'Открытая банка · вскрыта 7 ноя · отметок нет');
  // Отметки ещё грузятся — про них молчим, а не пишем «нет».
  assert.equal(openPackLine(row(), null, NOW), 'Открытая банка · вскрыта 7 ноя');
  assert.equal(openPackLine(row({ openPacks: [], sealedCount: 2 }), null, NOW), 'Открытой банки нет · в запасе: 2');
  assert.equal(openPackLine(row({ openPacks: [], sealedCount: 0 }), null, NOW), 'Банок нет');
});

test('openPackLine: при двух открытых — про ту, что отмечается', () => {
  const twoOpen = row({
    openPacks: [
      { id: 'p1', weight: 250, openedAt: '2026-11-07T10:00:00.000Z', fraction: 0.4 },
      { id: 'p2', weight: 250, openedAt: '2026-11-10T10:00:00.000Z', fraction: 1 },
    ],
  });
  assert.equal(openPackLine(twoOpen, [], NOW), 'Открытая банка 1 из 2 · вскрыта 7 ноя · отметок нет');
});

test('в шторке пять долей: полная и ¾ ½ ⅓ ¼', () => {
  assert.deepEqual(
    SHEET_MARK_OPTIONS.map((option) => [option.label, option.value, option.hint ?? null]),
    [
      ['1', 1, 'полная'],
      ['¾', 0.75, null],
      ['½', 0.5, null],
      ['⅓', 1 / 3, null],
      ['¼', 0.25, null],
    ],
  );
});

test('сводка полки на телефоне — одна строка вместо KPI-плиток', () => {
  assert.equal(
    shelfMobileSummary({ counters: { all: 269 }, totals: { packs: 412 }, today: { grams: 126.4, bowls: 7.02 } }),
    '269 позиций · 412 банок · сегодня ≈ 126 г, 7 чаш',
  );
  assert.equal(
    shelfMobileSummary({ counters: { all: 1 }, totals: { packs: 2 }, today: { grams: 0, bowls: 0 } }),
    '1 позиция · 2 банки · сегодня ≈ 0 г, 0 чаш',
  );
});
