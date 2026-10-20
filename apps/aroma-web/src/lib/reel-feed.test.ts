import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReelFeed, orderReelFeed, reelCounter, reelStrip } from './reel-feed';

const mixes = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);
const TASTE = { likedProfiles: ['minty'], likedFlavors: ['черника'] };

test('orderReelFeed: сначала подбор по онбордингу, затем остальной каталог без повторов', () => {
  const feed = orderReelFeed(mixes('c', 'a'), mixes('a', 'b', 'c', 'd'));
  assert.deepEqual(ids(feed), ['c', 'a', 'b', 'd']);
});

test('orderReelFeed: без подбора лента — каталог в его порядке', () => {
  assert.deepEqual(ids(orderReelFeed([], mixes('a', 'b'))), ['a', 'b']);
});

test('orderReelFeed: повтор внутри подбора не дублирует рилс', () => {
  assert.deepEqual(ids(orderReelFeed(mixes('a', 'a'), mixes('a', 'b'))), ['a', 'b']);
});

const fakeApi = (recommended: string[], catalog: string[]) => {
  const calls = { recommendations: [] as unknown[], catalog: 0 };
  return {
    calls,
    fetchRecommendations: async (taste: unknown) => {
      calls.recommendations.push(taste);
      return mixes(...recommended);
    },
    fetchCatalog: async () => {
      calls.catalog += 1;
      return mixes(...catalog);
    },
  };
};

test('loadReelFeed: гость прошёл онбординг — подбор по его вкусам, затем каталог', async () => {
  const api = fakeApi(['b'], ['a', 'b', 'c']);
  const feed = await loadReelFeed({ taste: TASTE, recommendations: null, catalog: null, ...api });
  assert.deepEqual(ids(feed), ['b', 'a', 'c']);
  assert.deepEqual(api.calls.recommendations, [TASTE]);
  assert.equal(api.calls.catalog, 1);
});

test('loadReelFeed: гость не прошёл онбординг — лента начинается с каталога, без запроса подбора', async () => {
  const api = fakeApi(['b'], ['a', 'b']);
  const feed = await loadReelFeed({ taste: null, recommendations: null, catalog: null, ...api });
  assert.deepEqual(ids(feed), ['a', 'b']);
  assert.deepEqual(api.calls.recommendations, []);
});

test('loadReelFeed: пустые вкусы — как без онбординга', async () => {
  const api = fakeApi(['b'], ['a', 'b']);
  await loadReelFeed({ taste: { likedProfiles: [], likedFlavors: [] }, recommendations: null, catalog: null, ...api });
  assert.deepEqual(api.calls.recommendations, []);
});

test('loadReelFeed: уже загруженные каталог и подбор переиспользуются без запросов', async () => {
  const api = fakeApi(['x'], ['y']);
  const feed = await loadReelFeed({
    taste: TASTE,
    recommendations: mixes('c'),
    catalog: mixes('a', 'c'),
    ...api,
  });
  assert.deepEqual(ids(feed), ['c', 'a']);
  assert.deepEqual(api.calls.recommendations, []);
  assert.equal(api.calls.catalog, 0);
});

test('loadReelFeed: загруженный каталог переиспользуется и при свежем подборе', async () => {
  const api = fakeApi(['c'], ['y']);
  const feed = await loadReelFeed({ taste: TASTE, recommendations: null, catalog: mixes('a', 'c'), ...api });
  assert.deepEqual(ids(feed), ['c', 'a']);
  assert.equal(api.calls.catalog, 0);
});

test('reelCounter: номер и всего — двумя цифрами', () => {
  assert.equal(reelCounter(4, 33), '05 · из 33');
  assert.equal(reelCounter(0, 7), '01 · из 07');
  assert.equal(reelCounter(119, 120), '120 · из 120');
});

test('reelStrip: первые восемь миксов в порядке ленты', () => {
  const catalog = mixes('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
  assert.deepEqual(ids(reelStrip(mixes('j', 'c'), catalog)), ['j', 'c', 'a', 'b', 'd', 'e', 'f', 'g']);
  assert.deepEqual(ids(reelStrip([], mixes('a', 'b'))), ['a', 'b']);
});
