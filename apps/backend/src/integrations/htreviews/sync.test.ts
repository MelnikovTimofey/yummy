import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../../db';
import { resetAppState } from '../../state';
import {
  buildStatsData,
  collectBrandUrls,
  collectKnownLineUrls,
  decideTobaccoUpsert,
  filterLineUrlsByBrands,
  loadShelfBrandUrls,
  syncHtReviewsCatalog,
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

// Issue #249: при обходе по брендам известные линейки берутся только этих брендов.
test('известные линейки фильтруются по списку брендов', () => {
  assert.deepEqual(
    filterLineUrlsByBrands(
      [
        'https://htreviews.org/tobaccos/blansh/main',
        'https://htreviews.org/tobaccos/blanshx/main',
        'https://htreviews.org/tobaccos/darkside/core',
        'https://htreviews.org/tobaccos/musthave/main',
      ],
      ['https://htreviews.org/tobaccos/blansh', 'https://htreviews.org/tobaccos/darkside'],
    ),
    ['https://htreviews.org/tobaccos/blansh/main', 'https://htreviews.org/tobaccos/darkside/core'],
  );
});

// Issue #458: карточка табака не загрузилась (таймаут, 429) — выдача бренда
// даёт только статистику, а вкусы, статус и описание остаются прежними.
const listItem = (dataId: string, slug: string, name: string) => `
  <div class="tobacco_list_item " data-id="${dataId}">
    <a class="tobacco_list_item_image" href="https://htreviews.org/tobaccos/darkside/core/${slug}">
      <img data-src="https://htreviews.org/uploads/${slug}.webp" alt="${name}">
    </a>
    <div class="tobacco_list_item_name">
      <a class="tobacco_list_item_slug" href="https://htreviews.org/tobaccos/darkside/core/${slug}"><span>${name}</span></a>
      <a class="tobacco_list_item_brand_slug" href="https://htreviews.org/tobaccos/darkside"><span>Darkside</span></a>
      <a class="tobacco_list_item_line_slug" href="https://htreviews.org/tobaccos/darkside/core"><span>Core</span></a>
    </div>
    <div class="list_item_rating"><span>4.7</span></div>
    <div class="list_item_ratings_count"><span>237</span></div>
    <div class="list_item_reviews"><span>208</span></div>
    <div class="list_item_stats"><span>20.7k</span></div>
  </div>
`;

test('сбой загрузки карточки не затирает вкусы, статус и описание табака', async (t) => {
  await resetAppState();
  await prisma.tobacco.create({
    data: {
      id: 'ds-pink-mi',
      manufacturer: 'Darkside',
      lineName: 'Core',
      name: 'Pink Mi',
      description: 'Розовый грейпфрут.',
      sourceKind: 'htreviews',
      sourceUrl: 'https://htreviews.org/tobaccos/darkside/core/pink-mi',
      sourceExternalId: 'DS-PINK',
      sourceNumericId: '190397',
      country: 'Россия',
      officialStrength: 'Средняя',
      communityStrength: 'Средняя',
      productionStatus: 'Выпускается',
      rawSourceTags: '["Грейпфрут","Цитрусовые"]',
      flavorProfiles: '["Цитрусовые"]',
      flavors: '["Грейпфрут"]',
      flavorTags: '[]',
      rating: 4.1,
      viewsCount: 1000,
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === 'https://htreviews.org/tobaccos/darkside') {
      return new Response(
        `<div class="tobacco_list_items" data-count="2">
          ${listItem('190397', 'pink-mi', 'Pink Mi')}
          ${listItem('190398', 'new-cola', 'New Cola')}
        </div>`,
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
    return new Response('Too Many Requests', { status: 429 });
  }) as typeof globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const stats = await syncHtReviewsCatalog({
    brandUrls: ['https://htreviews.org/tobaccos/darkside'],
    knownLineUrls: [],
    delayMs: 0,
    requestTimeoutMs: 100,
  });

  assert.equal(stats.updated, 1);
  assert.equal(stats.created, 0);
  assert.equal(stats.skippedInactive, 1);
  assert.equal(await prisma.tobacco.count({ where: { name: 'New Cola' } }), 0);

  const tobacco = await prisma.tobacco.findUniqueOrThrow({ where: { id: 'ds-pink-mi' } });
  assert.deepEqual(
    {
      description: tobacco.description,
      sourceExternalId: tobacco.sourceExternalId,
      country: tobacco.country,
      officialStrength: tobacco.officialStrength,
      communityStrength: tobacco.communityStrength,
      productionStatus: tobacco.productionStatus,
      rawSourceTags: tobacco.rawSourceTags,
      flavorProfiles: tobacco.flavorProfiles,
      flavors: tobacco.flavors,
    },
    {
      description: 'Розовый грейпфрут.',
      sourceExternalId: 'DS-PINK',
      country: 'Россия',
      officialStrength: 'Средняя',
      communityStrength: 'Средняя',
      productionStatus: 'Выпускается',
      rawSourceTags: '["Грейпфрут","Цитрусовые"]',
      flavorProfiles: '["Цитрусовые"]',
      flavors: '["Грейпфрут"]',
    },
  );
  assert.equal(tobacco.rating, 4.7);
  assert.equal(tobacco.ratingsCount, 237);
  assert.ok(tobacco.statsSyncedAt);
});
