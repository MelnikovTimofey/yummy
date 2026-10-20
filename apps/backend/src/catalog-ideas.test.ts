import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { bayesianRating, buildCatalogIdeas, type IdeaSourceTobacco } from './catalog-ideas';
import { prisma } from './db';
import { resetAppState } from './state';

// Issue #209: «Идеи» каталога — табаки не с полки в трёх подборках по
// статистике htreviews.

const tobacco = (overrides: Partial<IdeaSourceTobacco> & { id: string }): IdeaSourceTobacco => ({
  manufacturer: 'DARKSIDE',
  lineName: 'Core',
  name: overrides.id,
  flavorProfiles: [],
  flavors: [],
  onShelf: false,
  archived: false,
  sourceUrl: `https://htreviews.org/tobaccos/darkside/core/${overrides.id}`,
  rating: null,
  ratingsCount: null,
  reviewsCount: null,
  viewsCount: null,
  ...overrides,
});

const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

test('байесовская оценка не даёт 5,0 с тремя оценками обогнать 4,7 с тысячей', () => {
  assert.ok(bayesianRating(4.7, 1000) > bayesianRating(5, 3));
  assert.equal(bayesianRating(4.2, 10), 4.2);
  assert.equal(bayesianRating(null, null), 4.2);
});

test('идеи берут только табаки не с полки, не из архива и со ссылкой на htreviews', () => {
  const ideas = buildCatalogIdeas(
    [
      tobacco({ id: 'shelf', onShelf: true, viewsCount: 10, rating: 4.5, ratingsCount: 100 }),
      tobacco({ id: 'idea', viewsCount: 900, rating: 4.5, ratingsCount: 100 }),
      tobacco({ id: 'archived', archived: true, viewsCount: 900, rating: 4.5, ratingsCount: 100 }),
      tobacco({ id: 'manual', sourceUrl: null, viewsCount: 900, rating: 4.5, ratingsCount: 100 }),
    ],
    [],
  );

  assert.deepEqual(ids(ideas.popularOnShelfBrands), ['idea']);
  assert.deepEqual(ids(ideas.topRated), ['idea']);
});

test('популярное у брендов полки сортируется по просмотрам', () => {
  const ideas = buildCatalogIdeas(
    [
      tobacco({ id: 'shelf', onShelf: true }),
      tobacco({ id: 'quiet', viewsCount: 1200 }),
      tobacco({ id: 'loud', viewsCount: 96000 }),
      tobacco({ id: 'unknown-views' }),
      tobacco({ id: 'other-brand', manufacturer: 'Sebero', viewsCount: 500000 }),
      tobacco({ id: 'same-brand-other-case', manufacturer: ' darkside ', viewsCount: 5000 }),
    ],
    [],
  );

  assert.deepEqual(ids(ideas.popularOnShelfBrands), ['loud', 'same-brand-other-case', 'quiet']);
});

test('высокий рейтинг — по байесовской оценке и только с оценками', () => {
  const ideas = buildCatalogIdeas(
    [
      tobacco({ id: 'few-perfect', rating: 5, ratingsCount: 3 }),
      tobacco({ id: 'many-good', rating: 4.7, ratingsCount: 1000 }),
      tobacco({ id: 'mid', rating: 4.4, ratingsCount: 200 }),
      tobacco({ id: 'no-votes', rating: 5, ratingsCount: 0 }),
      tobacco({ id: 'no-stats' }),
    ],
    [],
  );

  assert.deepEqual(ids(ideas.topRated), ['many-good', 'mid', 'few-perfect']);
});

test('каждая подборка ограничена двенадцатью табаками', () => {
  const many = Array.from({ length: 20 }, (_, index) =>
    tobacco({ id: `t${index}`, viewsCount: index, rating: 4.5, ratingsCount: index + 1 }),
  );
  const ideas = buildCatalogIdeas([tobacco({ id: 'shelf', onShelf: true }), ...many], []);

  assert.equal(ideas.popularOnShelfBrands.length, 12);
  assert.equal(ideas.topRated.length, 12);
});

test('похоже на то, что быстро уходит: вкусы ходовых табаков полки из доступных миксов', () => {
  const ideas = buildCatalogIdeas(
    [
      tobacco({ id: 'cane-mint', name: 'Cane Mint', onShelf: true, flavorProfiles: ['minty'], flavors: ['мята', 'тростник'] }),
      tobacco({ id: 'bittersweet', name: 'Bittersweet', onShelf: true, flavorProfiles: ['citrus'], flavors: ['грейпфрут'] }),
      tobacco({ id: 'idle', name: 'Idle', onShelf: true, flavorProfiles: ['berry'], flavors: ['малина'] }),
      tobacco({ id: 'hidden', name: 'Hidden', onShelf: true, flavorProfiles: ['dessert'], flavors: ['ваниль'] }),
      tobacco({ id: 'ice-mint', name: 'Ice Mint', flavorProfiles: ['Minty'], flavors: ['мята', 'тростник'], rating: 4.4, ratingsCount: 820 }),
      tobacco({ id: 'mint-only', name: 'Mint Only', flavorProfiles: ['minty'], flavors: [], rating: 4.9, ratingsCount: 900 }),
      tobacco({ id: 'mint-weak', name: 'Mint Weak', flavorProfiles: ['minty'], flavors: [], rating: 3.5, ratingsCount: 900 }),
      tobacco({ id: 'lemonblast', name: 'Lemonblast', flavorProfiles: ['citrus'], flavors: [] }),
      tobacco({ id: 'raspberry', name: 'Raspberry', flavorProfiles: ['berry'], flavors: ['малина'] }),
      tobacco({ id: 'vanilla', name: 'Vanilla', flavorProfiles: ['dessert'], flavors: ['ваниль'] }),
      tobacco({ id: 'tobacco-ish', name: 'Tobacco-ish', flavorProfiles: ['tobacco'], flavors: ['табак'] }),
    ],
    [
      { available: true, componentIds: ['cane-mint', 'bittersweet'] },
      { available: true, componentIds: ['cane-mint', 'ice-mint'] },
      { available: false, componentIds: ['hidden', 'bittersweet'] },
    ],
  );

  // Ice Mint делит с Cane Mint профиль и два вкуса; остальные — по одному
  // общему, дальше решает байесовская оценка (без оценок — априорные 4,2).
  assert.deepEqual(ids(ideas.likeFastMoving), ['ice-mint', 'mint-only', 'lemonblast', 'mint-weak']);
  assert.deepEqual(
    ideas.likeFastMoving.map((item) => item.why),
    ['как Cane Mint', 'как Cane Mint', 'как Bittersweet', 'как Cane Mint'],
  );
});

test('элемент идеи несёт статистику и ссылку, но не флаги полки', () => {
  const ideas = buildCatalogIdeas(
    [
      tobacco({ id: 'shelf', onShelf: true }),
      tobacco({
        id: 'supernova',
        name: 'Supernova',
        flavorProfiles: ['minty'],
        flavors: ['мята'],
        rating: 4.6,
        ratingsCount: 2140,
        reviewsCount: 310,
        viewsCount: 96000,
      }),
    ],
    [],
  );

  assert.deepEqual(ideas.popularOnShelfBrands[0], {
    id: 'supernova',
    manufacturer: 'DARKSIDE',
    lineName: 'Core',
    name: 'Supernova',
    flavorProfiles: ['minty'],
    rating: 4.6,
    ratingsCount: 2140,
    reviewsCount: 310,
    viewsCount: 96000,
    sourceUrl: 'https://htreviews.org/tobaccos/darkside/core/supernova',
  });
});

const loginStaff = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    payload: { login: 'admin', password: 'admin' },
  });
  assert.equal(response.statusCode, 200);
  return (response.json() as { accessToken: string }).accessToken;
};

test('GET /staff/catalog/ideas закрыт для гостей и отдаёт три подборки персоналу', async () => {
  await resetAppState();
  await prisma.tobacco.create({
    data: {
      id: 'htreviews-idea-mint',
      manufacturer: 'Ателье Reserve',
      name: 'Ледяная мята',
      sourceKind: 'htreviews',
      sourceUrl: 'https://htreviews.org/tobaccos/atelier/reserve/ice-mint',
      flavorProfiles: JSON.stringify(['fresh', 'minty']),
      flavors: JSON.stringify(['мята']),
      flavorTags: JSON.stringify([]),
      inStock: false,
      rating: 4.6,
      ratingsCount: 300,
      reviewsCount: 40,
      viewsCount: 5000,
    },
  });

  const app = buildApp();
  const anonymous = await app.inject({ method: 'GET', url: '/staff/catalog/ideas' });
  assert.equal(anonymous.statusCode, 401);

  const token = await loginStaff(app);
  const response = await app.inject({
    method: 'GET',
    url: '/staff/catalog/ideas',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as Record<'popularOnShelfBrands' | 'topRated' | 'likeFastMoving', Array<{ id: string; why?: string }>>;
  // Seed-табак не с полки (Peach Silk) — ручной, без sourceUrl, в идеи не попадает.
  assert.deepEqual(ids(body.popularOnShelfBrands), ['htreviews-idea-mint']);
  assert.deepEqual(ids(body.topRated), ['htreviews-idea-mint']);
  assert.deepEqual(ids(body.likeFastMoving), ['htreviews-idea-mint']);
  assert.match(body.likeFastMoving[0]?.why ?? '', /^как /);

  const inventory = await app.inject({
    method: 'GET',
    url: '/staff/inventory/tobaccos?ids=htreviews-idea-mint&archived=all',
    headers: { authorization: `Bearer ${token}` },
  });
  const item = (inventory.json() as { items: Array<Record<string, unknown>> }).items[0];
  assert.equal(item?.rating, 4.6);
  assert.equal(item?.ratingsCount, 300);
  assert.equal(item?.viewsCount, 5000);

  await app.close();
});

test('табак, который держат на полке, не становится идеей, даже без банок или на стопе', async () => {
  await resetAppState();
  const stats = {
    sourceKind: 'htreviews',
    flavorProfiles: JSON.stringify(['minty']),
    flavors: JSON.stringify(['мята']),
    flavorTags: JSON.stringify([]),
    inStock: false,
    rating: 4.6,
    ratingsCount: 300,
    viewsCount: 5000,
  };
  await prisma.tobacco.create({
    data: {
      ...stats,
      id: 'htreviews-kept-stopped',
      manufacturer: 'Ателье Reserve',
      name: 'Держим на стопе',
      sourceUrl: 'https://htreviews.org/tobaccos/atelier/reserve/kept',
      shelfItem: { create: { status: 'active', stopped: true, packWeight: 200 } },
    },
  });
  await prisma.tobacco.create({
    data: {
      ...stats,
      id: 'htreviews-planned',
      manufacturer: 'Ателье Reserve',
      name: 'В плане',
      sourceUrl: 'https://htreviews.org/tobaccos/atelier/reserve/planned',
      shelfItem: { create: { status: 'plan', packWeight: 200 } },
    },
  });

  const app = buildApp();
  const token = await loginStaff(app);
  const response = await app.inject({
    method: 'GET',
    url: '/staff/catalog/ideas',
    headers: { authorization: `Bearer ${token}` },
  });
  const body = response.json() as Record<'popularOnShelfBrands' | 'topRated' | 'likeFastMoving', Array<{ id: string }>>;
  const all = [...body.popularOnShelfBrands, ...body.topRated, ...body.likeFastMoving].map((item) => item.id);
  assert.ok(!all.includes('htreviews-kept-stopped'));
  // «В плане» — ещё идея: UI показывает её с меткой «в плане».
  assert.ok(all.includes('htreviews-planned'));

  await app.close();
});
