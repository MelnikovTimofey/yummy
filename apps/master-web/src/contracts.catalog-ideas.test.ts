import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalogIdeas, normalizeInventoryTobacco, normalizeShelfRow } from './contracts';

const idea = {
  id: 't1',
  manufacturer: 'DARKSIDE',
  lineName: 'Core',
  name: 'Supernova',
  flavorProfiles: ['minty', 'minty'],
  rating: 4.62,
  ratingsCount: 2140,
  reviewsCount: 310,
  viewsCount: 96400,
  sourceUrl: 'https://htreviews.org/tobaccos/darkside/core/supernova',
};

test('normalizeCatalogIdeas читает три подборки', () => {
  const ideas = normalizeCatalogIdeas({
    popularOnShelfBrands: [idea],
    topRated: [{ ...idea, id: 't2', rating: null, ratingsCount: null, viewsCount: null }],
    likeFastMoving: [{ ...idea, id: 't3', why: 'как Cane Mint' }],
  });

  assert.equal(ideas.popularOnShelfBrands.length, 1);
  const [first] = ideas.popularOnShelfBrands;
  assert.equal(first.manufacturer, 'DARKSIDE');
  assert.deepEqual(first.flavorProfiles, ['minty']);
  assert.equal(first.rating, 4.62);
  assert.equal(first.ratingsCount, 2140);
  assert.equal(first.viewsCount, 96400);
  assert.equal(first.sourceUrl, 'https://htreviews.org/tobaccos/darkside/core/supernova');
  assert.equal(first.why, null);

  const [noStats] = ideas.topRated;
  assert.equal(noStats.rating, null);
  assert.equal(noStats.ratingsCount, null);
  assert.equal(noStats.viewsCount, null);

  assert.equal(ideas.likeFastMoving[0].why, 'как Cane Mint');
});

test('normalizeCatalogIdeas: пустой или чужой ответ — пустые подборки', () => {
  const empty = { popularOnShelfBrands: [], topRated: [], likeFastMoving: [] };
  assert.deepEqual(normalizeCatalogIdeas(null), empty);
  assert.deepEqual(normalizeCatalogIdeas({ topRated: 'x' }), empty);
});

test('normalizeInventoryTobacco читает статистику htreviews', () => {
  const item = normalizeInventoryTobacco({ id: 't1', name: 'Supernova', rating: 4.6, ratingsCount: 2140, viewsCount: 96400 });
  assert.equal(item.rating, 4.6);
  assert.equal(item.ratingsCount, 2140);
  assert.equal(item.viewsCount, 96400);

  const bare = normalizeInventoryTobacco({ id: 't2', name: 'Своя карточка' });
  assert.equal(bare.rating, null);
  assert.equal(bare.ratingsCount, null);
  assert.equal(bare.viewsCount, null);
});

test('normalizeShelfRow читает ссылку на htreviews', () => {
  const url = 'https://htreviews.org/tobaccos/black-burn/raspberries';
  assert.equal(normalizeShelfRow({ tobacco: { id: 't1', sourceUrl: url } }).tobacco.sourceUrl, url);
  assert.equal(normalizeShelfRow({ tobacco: { id: 't1', sourceUrl: '' } }).tobacco.sourceUrl, null);
  assert.equal(normalizeShelfRow({ tobacco: { id: 't1' } }).tobacco.sourceUrl, null);
});
