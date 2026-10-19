import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStatsData, collectKnownLineUrls, decideTobaccoUpsert } from './sync';

// Issue #88: в каталог попадают только выпускаемые табаки, но уже заведённые
// обновляются всегда — иначе снятие с производства не дойдёт до productionStatus.

test('новый выпускаемый табак создаётся', () => {
  assert.equal(decideTobaccoUpsert('Выпускается', false), 'create');
});

test('новый неактуальный табак пропускается', () => {
  for (const status of ['Снят с производства', 'Лимитированный', 'Не известен', 'Шуточный 🙃', null]) {
    assert.equal(decideTobaccoUpsert(status, false), 'skip', String(status));
  }
});

test('существующий табак обновляется при любом статусе', () => {
  assert.equal(decideTobaccoUpsert('Выпускается', true), 'update');
  assert.equal(decideTobaccoUpsert('Снят с производства', true), 'update');
  assert.equal(decideTobaccoUpsert(null, true), 'update');
});

test('статус сравнивается без учёта пробелов по краям', () => {
  assert.equal(decideTobaccoUpsert(' Выпускается ', false), 'create');
});

test('известные линейки собираются из sourceUrl без дублей и мусора (issue #92)', () => {
  assert.deepEqual(
    collectKnownLineUrls([
      'https://htreviews.org/tobaccos/duft/duft-lineika-strong/pomelo',
      'https://htreviews.org/tobaccos/duft/duft-lineika-strong/cola',
      'https://htreviews.org/tobaccos/spectrum/hard-line/kiwi',
      'https://htreviews.org/tobaccos/duft',
      null,
    ]),
    [
      'https://htreviews.org/tobaccos/duft/duft-lineika-strong',
      'https://htreviews.org/tobaccos/spectrum/hard-line',
    ],
  );
});

// Issue #209: статистика htreviews питает «Идеи» каталога. Пропуск в выдаче
// парсера не должен затирать уже сохранённое значение.

const SYNCED_AT = new Date('2026-10-20T10:00:00.000Z');

test('статистика htreviews пишется вместе с отметкой синхронизации', () => {
  assert.deepEqual(
    buildStatsData({ rating: 4.6, ratingsCount: 2140, reviewsCount: 310, viewsCount: 96000 }, SYNCED_AT),
    { rating: 4.6, ratingsCount: 2140, reviewsCount: 310, viewsCount: 96000, statsSyncedAt: SYNCED_AT },
  );
});

test('пропущенные парсером значения не затирают сохранённые', () => {
  assert.deepEqual(
    buildStatsData({ rating: 4.1, ratingsCount: null, reviewsCount: null, viewsCount: 1200 }, SYNCED_AT),
    { rating: 4.1, viewsCount: 1200, statsSyncedAt: SYNCED_AT },
  );
});

test('без статистики отметка синхронизации не сдвигается', () => {
  assert.deepEqual(
    buildStatsData({ rating: null, ratingsCount: null, reviewsCount: null, viewsCount: null }, SYNCED_AT),
    {},
  );
});

test('нулевые счётчики — это значение, а не пропуск', () => {
  assert.deepEqual(
    buildStatsData({ rating: null, ratingsCount: 0, reviewsCount: 0, viewsCount: 0 }, SYNCED_AT),
    { ratingsCount: 0, reviewsCount: 0, viewsCount: 0, statsSyncedAt: SYNCED_AT },
  );
});
