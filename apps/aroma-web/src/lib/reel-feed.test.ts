import test from 'node:test';
import assert from 'node:assert/strict';
import type { GuestForYouPersonal } from './for-you-copy';
import { forYouPage, recsPage, reelFeed } from './reel-feed';

const mixes = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

test('recsPage: на Подборе герой и четыре «Тоже подходят», остальное — в ленту', () => {
  const page = recsPage(mixes('a', 'b', 'c', 'd', 'e', 'f', 'g'));
  assert.deepEqual(ids(page.shown), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(ids(page.rest), ['f', 'g']);
});

test('reelFeed: продолжает Подбор — сначала не поместившийся подбор, затем каталог, без показанного', () => {
  const page = recsPage(mixes('a', 'b', 'c', 'd', 'e', 'f', 'g'));
  const feed = ids(reelFeed(page, mixes('x', 'a', 'f', 'e', 'y', 'g'), 1));
  assert.deepEqual(feed.slice(0, 2), ['f', 'g']);
  assert.deepEqual(feed.slice(2).sort(), ['x', 'y']);
});

test('reelFeed: повтор внутри подбора не дублирует рилс', () => {
  assert.deepEqual(ids(reelFeed({ shown: [], rest: mixes('a', 'a') }, mixes('a'), 1)), ['a']);
});

const catalog = mixes(...Array.from({ length: 30 }, (_, i) => `m${i}`));

test('reelFeed: каталог перемешан — с другим зерном другой порядок, с тем же зерном тот же', () => {
  const orders = new Set([1, 2, 3, 4, 5].map((seed) => ids(reelFeed(recsPage([]), catalog, seed)).join()));
  assert.equal(orders.size, 5);
  assert.deepEqual(reelFeed(recsPage([]), catalog, 7), reelFeed(recsPage([]), catalog, 7));
  assert.deepEqual(ids(reelFeed(recsPage([]), catalog, 7)).sort(), ids(catalog).sort());
});

test('reelFeed: перевес в пользу начала каталога — лучшие миксы в среднем ближе к началу ленты', () => {
  const position = (id: string) => {
    let sum = 0;
    for (let seed = 0; seed < 200; seed += 1) sum += ids(reelFeed(recsPage([]), catalog, seed)).indexOf(id);
    return sum / 200;
  };
  assert.ok(position('m0') < 10, `лучший микс в среднем на ${position('m0')}`);
  assert.ok(position('m29') > 20, `худший микс в среднем на ${position('m29')}`);
});

// «Для вас» вошедшего гостя (#245): на Подборе герой, три «Новое в вашем вкусе»,
// «Шаг в сторону» и «Снова» — их в ленте нет.
const forYou: GuestForYouPersonal<{ id: string }> = {
  mode: 'personal',
  fresh: ['f1', 'f2', 'f3', 'f4', 'f5'].map((id) => ({
    mix: { id },
    reason: { kind: 'taste', profiles: [], flavors: ['черника'], likeMixName: null },
  })),
  sidestep: [{ mix: { id: 's1' }, reason: { kind: 'sidestep-neutral', toProfile: 'citrus' } }],
  again: [{ mix: { id: 'a1' }, reason: { kind: 'again', rating: 5, timesChosen: 5 } }],
  hint: null,
};

test('forYouPage: показаны все слоты «Для вас», не поместившееся новое — в начале ленты', () => {
  const page = forYouPage(forYou);
  assert.deepEqual(ids(page.shown), ['f1', 'f2', 'f3', 'f4', 's1', 'a1']);
  const feed = ids(reelFeed(page, mixes('a1', 'x', 'f1', 'f5', 'y'), 1));
  assert.equal(feed[0], 'f5');
  assert.deepEqual(feed.slice(1).sort(), ['x', 'y']);
});
