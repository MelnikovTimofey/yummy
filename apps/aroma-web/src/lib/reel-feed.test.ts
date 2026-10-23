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
  const page = recsPage(mixes('a', 'b', 'c', 'd', 'e', 'f'));
  assert.deepEqual(ids(reelFeed(page, mixes('x', 'a', 'f', 'e', 'y'))), ['f', 'x', 'y']);
});

test('reelFeed: Подбор пуст — лента весь каталог в его порядке', () => {
  assert.deepEqual(ids(reelFeed(recsPage([]), mixes('a', 'b'))), ['a', 'b']);
});

test('reelFeed: повтор внутри подбора не дублирует рилс', () => {
  assert.deepEqual(ids(reelFeed({ shown: [], rest: mixes('a', 'a') }, mixes('a', 'b'))), ['a', 'b']);
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
  assert.deepEqual(ids(reelFeed(page, mixes('a1', 'x', 'f1', 'f5', 'y'))), ['f5', 'x', 'y']);
});
