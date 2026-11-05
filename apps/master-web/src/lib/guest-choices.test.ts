import test from 'node:test';
import assert from 'node:assert/strict';
import type { GuestChoices } from '../contracts';
import {
  axisTicks,
  barWidth,
  calendarRightMonth,
  dayCount,
  monthGrid,
  pickRangeDay,
  profileSlices,
  rangeCaption,
  rangeLabel,
  signalRows,
  tickInterval,
  timelineRows,
} from './guest-choices';

test('диапазон периода: внутри месяца, через месяц, один день, всё время и через год', () => {
  assert.equal(rangeLabel({ key: '30d', from: '2026-10-06', to: '2026-11-04' }), '6 октября – 4 ноября');
  assert.equal(rangeLabel({ key: 'custom', from: '2026-10-13', to: '2026-10-26' }), '13 – 26 октября');
  assert.equal(rangeLabel({ key: 'custom', from: '2026-11-04', to: '2026-11-04' }), '4 ноября');
  assert.equal(rangeLabel({ key: 'all', from: '2026-10-06', to: '2026-11-04' }), 'с 6 октября');
  assert.equal(rangeLabel({ key: '90d', from: '2025-12-29', to: '2026-01-04' }), '29 декабря 2025 – 4 января 2026');
  assert.equal(rangeLabel({ key: 'all', from: '2025-12-29', to: '2026-01-04' }), 'с 29 декабря 2025');
});

test('подпись календаря: диапазон и число дней', () => {
  assert.equal(dayCount('2026-10-13', '2026-10-26'), 14);
  assert.equal(dayCount('2026-03-28', '2026-03-30'), 3);
  assert.equal(rangeCaption('2026-10-13', '2026-10-26'), '13 – 26 октября, 14 дней');
  assert.equal(rangeCaption('2026-11-04', '2026-11-04'), '4 ноября, 1 день');
});

test('столбцы динамики: по дням число и день недели, по неделям дата понедельника и диапазон', () => {
  const days = timelineRows([{ date: '2026-10-25', catalog: 28, own: 7 }], 'day');
  assert.deepEqual(days, [{ date: '2026-10-25', catalog: 28, own: 7, tick: '25', tip: '25 окт, вс' }]);
  const weeks = timelineRows(
    [
      { date: '2026-10-05', catalog: 88, own: 18 },
      { date: '2026-09-28', catalog: 0, own: 0 },
    ],
    'week',
  );
  assert.equal(weeks[0].tick, '5 окт');
  assert.equal(weeks[0].tip, '5 – 11 окт');
  assert.equal(weeks[1].tip, '28 сен – 4 окт');
});

test('подписи оси не налезают: месяц по дням через два, квартал по неделям все, телефон реже', () => {
  assert.equal(tickInterval(30, 'day', false), 2);
  assert.equal(tickInterval(7, 'day', false), 0);
  assert.equal(tickInterval(14, 'week', false), 0);
  assert.equal(tickInterval(53, 'week', false), 3);
  assert.equal(tickInterval(30, 'day', true), 5);
  assert.equal(tickInterval(7, 'day', true), 1);
});

test('вкусы: подписи в единственном числе, хвост после седьмого — «Другие»', () => {
  const few = profileSlices([
    { key: 'berry', label: 'Ягодные', share: 60 },
    { key: 'floral_herbal', label: 'Цветочно-травяные', share: 25 },
    { key: 'beverage', label: 'Напитки', share: 15 },
  ]);
  assert.deepEqual(
    few.map((slice) => [slice.label, slice.share, slice.color]),
    [
      ['Ягодный', 60, 'var(--profile-berry, var(--profile-fallback))'],
      ['Травяной', 25, 'var(--profile-floral-herbal, var(--profile-fallback))'],
      ['Напитки', 15, 'var(--profile-beverage, var(--profile-fallback))'],
    ],
  );

  const keys = ['berry', 'fruity', 'beverage', 'minty', 'citrus', 'dessert', 'floral_herbal', 'tobacco', 'spicy'];
  const many = profileSlices(keys.map((key, index) => ({ key, label: key, share: [24, 21, 14, 12, 10, 9, 6, 3, 1][index] })));
  assert.equal(many.length, 8);
  assert.deepEqual(many[7], { key: 'other', label: 'Другие', share: 4, color: 'var(--profile-fallback)' });
});

test('ширина столбца топа: доля от первого, но не уже подписи', () => {
  assert.equal(barWidth(96, 96), 100);
  assert.equal(barWidth(48, 96), 50);
  assert.equal(barWidth(3, 96), 18);
});

const signals = (patch: Partial<GuestChoices['signals']>): GuestChoices['signals'] => ({
  outPopular: [],
  hiddenMixes: [],
  emptyRails: [],
  ...patch,
});

test('сигналы: закончились популярные с брендом, скрытые миксы с хвостом, пустые рейлы', () => {
  const rows = signalRows(
    signals({
      outPopular: [
        { tobaccoId: 't1', name: 'Cane Mint' },
        { tobaccoId: 't2', name: 'Supernova' },
      ],
      hiddenMixes: ['Melon Cola', 'Ледяной лайм', 'Цитрусовый лёд', 'Киви', 'Груша'].map((mixName, index) => ({ mixId: `m${index}`, mixName })),
      emptyRails: [{ railId: 'r1', name: 'Новинки' }],
    }),
    [
      { tobaccoId: 't1', manufacturer: 'Black Burn', name: 'Cane Mint', choices: 81, stock: 'out', trial: false },
      { tobaccoId: 't2', manufacturer: 'Darkside', name: 'Supernova', choices: 47, stock: 'out', trial: false },
    ],
  );
  assert.deepEqual(rows, [
    { kind: 'out', text: 'Закончились популярные: Black Burn Cane Mint, Darkside Supernova.', action: 'К заказу' },
    { kind: 'hidden', text: 'Скрыты у гостя, нет табака: Melon Cola, Ледяной лайм, Цитрусовый лёд и ещё 2.', action: 'Миксы' },
    { kind: 'rail', text: 'Рейл «Новинки» пустой.', action: 'Рейлы' },
  ]);
});

test('сигналы в единственном числе и без топа (мало данных)', () => {
  const rows = signalRows(
    signals({
      outPopular: [{ tobaccoId: 't1', name: 'Cane Mint' }],
      hiddenMixes: [{ mixId: 'm1', mixName: 'Melon Cola' }],
      emptyRails: [
        { railId: 'r1', name: 'Новинки' },
        { railId: 'r2', name: 'Лето' },
      ],
    }),
    [],
  );
  assert.deepEqual(
    rows.map((row) => row.text),
    ['Закончился популярный: Cane Mint.', 'Скрыт у гостя, нет табака: Melon Cola.', 'Рейлы «Новинки», «Лето» пустые.'],
  );
  assert.deepEqual(signalRows(signals({}), []), []);
});

test('календарь: неделя с понедельника, дни соседних месяцев не выбираются', () => {
  const october = monthGrid(2026, 9);
  // 1 октября 2026 — четверг: впереди три дня сентября.
  assert.deepEqual(october.slice(0, 4).map((cell) => [cell.day, cell.outside]), [[28, true], [29, true], [30, true], [1, false]]);
  assert.equal(october[3].key, '2026-10-01');
  assert.equal(october.length % 7, 0);
  assert.equal(october.filter((cell) => !cell.outside).length, 31);
});

test('календарь: первый клик начинает диапазон, второй закрывает, раньше начала — меняются местами', () => {
  const start = pickRangeDay(null, '2026-10-13');
  assert.deepEqual(start, { from: '2026-10-13', to: null });
  assert.deepEqual(pickRangeDay(start, '2026-10-26'), { from: '2026-10-13', to: '2026-10-26' });
  assert.deepEqual(pickRangeDay(start, '2026-10-02'), { from: '2026-10-02', to: '2026-10-13' });
  assert.deepEqual(pickRangeDay({ from: '2026-10-13', to: '2026-10-26' }, '2026-10-20'), { from: '2026-10-20', to: null });
});

test('календарь: справа текущий месяц, а старый диапазон виден в левом месяце', () => {
  assert.deepEqual(calendarRightMonth(null, '2026-11-04', 2), { year: 2026, month: 10 });
  assert.deepEqual(calendarRightMonth({ from: '2026-10-13', to: '2026-10-26' }, '2026-11-04', 2), { year: 2026, month: 10 });
  assert.deepEqual(calendarRightMonth({ from: '2026-08-03', to: '2026-08-20' }, '2026-11-04', 2), { year: 2026, month: 8 });
  assert.deepEqual(calendarRightMonth({ from: '2026-08-03', to: '2026-08-20' }, '2026-11-04', 1), { year: 2026, month: 7 });
  assert.deepEqual(calendarRightMonth({ from: '2025-12-03', to: '2025-12-20' }, '2026-11-04', 2), { year: 2026, month: 0 });
});

test('шкала динамики: круглые деления, не больше пяти', () => {
  assert.deepEqual(axisTicks(36), [0, 10, 20, 30, 40]);
  assert.deepEqual(axisTicks(157), [0, 50, 100, 150, 200]);
  assert.deepEqual(axisTicks(7), [0, 2, 4, 6, 8]);
  assert.deepEqual(axisTicks(1), [0, 1]);
  assert.deepEqual(axisTicks(0), [0, 1]);
});
