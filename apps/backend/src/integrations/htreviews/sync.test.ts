import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../../db';
import { resetAppState } from '../../state';
import {
  buildStatsData,
  collectBrandUrls,
  collectKnownLineUrls,
  decideTobaccoUpsert,
  loadShelfBrandUrls,
} from './sync';

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

// Issue #246: ночью синхронизируются только бренды того, что есть в точке, —
// иначе новые вкусы из счетов поставщика ждут ручного полного прогона.
test('бренды собираются из sourceUrl без дублей и мусора', () => {
  assert.deepEqual(
    collectBrandUrls([
      'https://htreviews.org/tobaccos/darkside/core/pink-mi',
      'https://htreviews.org/tobaccos/darkside/base/cola',
      'https://htreviews.org/tobaccos/musthave/main/pinkman',
      'https://htreviews.org/tobaccos/new/x/y',
      null,
    ]),
    [
      'https://htreviews.org/tobaccos/darkside',
      'https://htreviews.org/tobaccos/musthave',
    ],
  );
});

test('бренды точки — только у табаков htreviews в наличии и не в архиве', async () => {
  await resetAppState();
  const tobacco = (id: string, sourceUrl: string, extra: { inStock: boolean; archived?: boolean; sourceKind?: string }) =>
    prisma.tobacco.create({
      data: {
        id,
        manufacturer: id,
        name: id,
        sourceKind: extra.sourceKind ?? 'htreviews',
        sourceUrl,
        flavorProfiles: '[]',
        flavors: '[]',
        flavorTags: '[]',
        inStock: extra.inStock,
        archived: extra.archived ?? false,
      },
    });
  await tobacco('shelf-ds-core', 'https://htreviews.org/tobaccos/darkside/core/pink-mi', { inStock: true });
  await tobacco('shelf-ds-base', 'https://htreviews.org/tobaccos/darkside/base/cola', { inStock: true });
  await tobacco('shelf-mh-off', 'https://htreviews.org/tobaccos/musthave/main/pinkman', { inStock: false });
  await tobacco('shelf-sp-arch', 'https://htreviews.org/tobaccos/spectrum/hard/kiwi', { inStock: true, archived: true });
  await tobacco('shelf-manual', 'https://htreviews.org/tobaccos/duft/strong/pomelo', { inStock: true, sourceKind: 'manual' });

  const brandUrls = await loadShelfBrandUrls();

  assert.ok(brandUrls.includes('https://htreviews.org/tobaccos/darkside'));
  for (const brand of ['musthave', 'spectrum', 'duft']) {
    assert.ok(!brandUrls.includes(`https://htreviews.org/tobaccos/${brand}`), brand);
  }
});
