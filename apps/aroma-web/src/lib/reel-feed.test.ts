import test from 'node:test';
import assert from 'node:assert/strict';
import type { GuestForYouPersonal } from './for-you-copy';
import { loadReelFeed, reelEntries, reelStrip } from './reel-feed';

const mixes = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (items: Array<{ mix: { id: string } }>) => items.map((item) => item.mix.id);

test('reelEntries: сначала подбор по онбордингу, затем остальной каталог без повторов', () => {
  const feed = reelEntries(mixes('c', 'a'), mixes('a', 'b', 'c', 'd'));
  assert.deepEqual(ids(feed), ['c', 'a', 'b', 'd']);
  assert.ok(feed.every((entry) => entry.slot === null && entry.reason === null && entry.hint === null));
});

test('reelEntries: без подбора лента — каталог в его порядке', () => {
  assert.deepEqual(ids(reelEntries([], mixes('a', 'b'))), ['a', 'b']);
});

test('reelEntries: повтор внутри подбора не дублирует рилс', () => {
  assert.deepEqual(ids(reelEntries(mixes('a', 'a'), mixes('a', 'b'))), ['a', 'b']);
});

// «Для вас» вошедшего гостя (#265): те же слоты и фразы, что на Подборе (#245).
const forYou = (hint: GuestForYouPersonal<{ id: string }>['hint']): GuestForYouPersonal<{ id: string }> => ({
  mode: 'personal',
  fresh: ['f1', 'f2', 'f3', 'f4', 'f5'].map((id) => ({
    mix: { id },
    reason: { kind: 'taste', profiles: [], flavors: ['черника'], likeMixName: null },
  })),
  sidestep: [{ mix: { id: 's1' }, reason: { kind: 'sidestep-neutral', toProfile: 'citrus' } }],
  again: [{ mix: { id: 'a1' }, reason: { kind: 'again', rating: 5, timesChosen: 5 } }],
  hint,
});

test('reelEntries: «Для вас» — новое во вкусе (герой и ещё три), шаг в сторону, снова, затем каталог', () => {
  const feed = reelEntries(forYou(null), mixes('a1', 'x', 'f1', 'f5', 'y'));
  assert.deepEqual(ids(feed), ['f1', 'f2', 'f3', 'f4', 's1', 'a1', 'x', 'f5', 'y']);
  assert.deepEqual(
    feed.slice(0, 6).map((entry) => entry.slot),
    ['Новое в вашем вкусе', 'Новое в вашем вкусе', 'Новое в вашем вкусе', 'Новое в вашем вкусе', 'Шаг в сторону', 'Снова'],
  );
  assert.equal(feed[0].reason, 'Черника, как в ваших любимых');
  assert.equal(feed[4].reason, 'Попробуйте что-то другое');
  assert.equal(feed[5].reason, 'Ваша оценка ★ 5, выбирали 5 раз');
  // После «Для вас» — без слота и причины, строки истории нет.
  assert.deepEqual(feed.slice(6).map((entry) => [entry.slot, entry.reason]), [[null, null], [null, null], [null, null]]);
  assert.ok(feed.every((entry) => entry.hint === null));
});

test('reelEntries: подсказка «Давно на одном вкусе» — первым «Шаг в сторону» с её текстом', () => {
  const feed = reelEntries(forYou({ kind: 'same-mix', mixName: 'Морозная ягода', count: 4, outOf: 5 }), []);
  assert.deepEqual(ids(feed), ['s1', 'f1', 'f2', 'f3', 'f4', 'a1']);
  assert.equal(feed[0].slot, 'Шаг в сторону');
  assert.equal(feed[0].hint, 'Четыре из пяти последних выборов: «Морозная ягода». Попробуйте что-то рядом.');
  assert.ok(feed.slice(1).every((entry) => entry.hint === null));
});

test('reelStrip: первые восемь рилсов в порядке ленты', () => {
  const catalog = mixes('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
  assert.deepEqual(ids(reelStrip(mixes('j', 'c'), catalog)), ['j', 'c', 'a', 'b', 'd', 'e', 'f', 'g']);
  assert.deepEqual(ids(reelStrip(forYou(null), catalog)), ['f1', 'f2', 'f3', 'f4', 's1', 'a1', 'a', 'b']);
});

const fakeApi = (head: ReturnType<typeof forYou> | Array<{ id: string }>, catalog: string[]) => {
  const calls = { head: 0, catalog: 0 };
  return {
    calls,
    fetchHead: async () => {
      calls.head += 1;
      return head;
    },
    fetchCatalog: async () => {
      calls.catalog += 1;
      return mixes(...catalog);
    },
  };
};

test('loadReelFeed: голова ленты и каталог не загружены — по одному запросу', async () => {
  const api = fakeApi(mixes('b'), ['a', 'b', 'c']);
  const feed = await loadReelFeed({ head: null, catalog: null, ...api });
  assert.deepEqual(ids(feed), ['b', 'a', 'c']);
  assert.deepEqual(api.calls, { head: 1, catalog: 1 });
});

test('loadReelFeed: уже загруженные «Для вас» и каталог переиспользуются без запросов', async () => {
  const api = fakeApi(mixes('x'), ['y']);
  const feed = await loadReelFeed({ head: forYou(null), catalog: mixes('z'), ...api });
  assert.deepEqual(ids(feed), ['f1', 'f2', 'f3', 'f4', 's1', 'a1', 'z']);
  assert.deepEqual(api.calls, { head: 0, catalog: 0 });
});

test('loadReelFeed: пустая голова (онбординг не пройден) — лента с каталога, без запроса подбора', async () => {
  const api = fakeApi(mixes('b'), ['a', 'b']);
  const feed = await loadReelFeed({ head: [], catalog: null, ...api });
  assert.deepEqual(ids(feed), ['a', 'b']);
  assert.deepEqual(api.calls, { head: 0, catalog: 1 });
});
