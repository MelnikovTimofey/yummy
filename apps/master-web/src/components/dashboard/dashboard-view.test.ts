import test from 'node:test';
import assert from 'node:assert/strict';
import type { GuestChoices } from '@/contracts';
import { buildKpiTiles, noDataText, periodPressed } from './dashboard-view';

const kpi: GuestChoices['kpi'] = { choices: 621, ownMixes: 121, mixesChosen: 58, mixesOnShowcase: 64, avgRating: 4.6, ratingsCount: 87 };
const plain = (value: unknown) => (value === undefined ? null : String(value).replace(/ | /g, ' '));
const rows = (tiles: ReturnType<typeof buildKpiTiles>) => tiles.map((tile) => [tile.label, plain(tile.value), plain(tile.hint)]);

test('плитки дашборда: выборы, свои миксы, миксы с витрины, оценка гостей', () => {
  assert.deepEqual(rows(buildKpiTiles(kpi, false)), [
    ['Выборов', '621', '«Покурить» и свои миксы'],
    ['Свои миксы', '121', 'собраны в «Намиксуй»'],
    ['Миксов выбирали', '58', 'из 64 на витрине'],
    ['Оценка гостей', '4,6', 'по 87 оценкам'],
  ]);
  assert.deepEqual(rows(buildKpiTiles({ ...kpi, choices: 1250, avgRating: null, ratingsCount: 0 }, false)).map((row) => row.slice(1)), [
    ['1 250', '«Покурить» и свои миксы'],
    ['121', 'собраны в «Намиксуй»'],
    ['58', 'из 64 на витрине'],
    ['—', 'оценок нет'],
  ]);
  assert.equal(plain(buildKpiTiles({ ...kpi, ratingsCount: 1 }, false)[3].hint), 'по 1 оценке');
});

test('плитки на телефоне короче: под числом только витрина', () => {
  assert.deepEqual(rows(buildKpiTiles(kpi, true)), [
    ['Выборов', '621', null],
    ['Свои миксы', '121', null],
    ['Миксов', '58', 'из 64'],
    ['Оценка', '4,6', null],
  ]);
});

test('мало данных и пустой период: что случилось и что сделать', () => {
  const period = { key: 'custom' as const, from: '2026-11-04', to: '2026-11-04', days: 1, bucket: 'day' as const };
  assert.deepEqual(noDataText(period, 9), {
    title: 'Мало данных',
    text: '4 ноября: 9 выборов. Графики появятся с 20 выборов, выберите период длиннее.',
  });
  assert.deepEqual(noDataText({ ...period, from: '2026-10-01', to: '2026-10-05' }, 0), {
    title: 'Выборов нет',
    text: 'За 1 – 5 октября гости ничего не выбирали.',
  });
  assert.deepEqual(noDataText({ ...period, key: 'all' }, 0), { title: 'Выборов нет', text: 'Гости пока ничего не выбирали.' });
  assert.equal(noDataText({ ...period, key: 'all', from: '2026-10-06' }, 1).text, 'С 6 октября: 1 выбор. Графики появятся с 20 выборов, выберите период длиннее.');
});

test('сегмент периода: пока открыт календарь, нажаты «Даты»', () => {
  assert.equal(periodPressed('30d', { key: '30d' }, false), true);
  assert.equal(periodPressed('custom', { key: '30d' }, true), true);
  assert.equal(periodPressed('30d', { key: '30d' }, true), false);
  assert.equal(periodPressed('custom', { key: 'custom', from: '2026-10-13', to: '2026-10-26' }, false), true);
});
