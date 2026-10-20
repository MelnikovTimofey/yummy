import test from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogIdea, CatalogIdeas } from '../contracts';
import {
  formatHtRating,
  formatRatingsCount,
  formatViews,
  ideaSections,
} from './catalog-ideas';

const nbsp = ' ';

test('formatHtRating: одна цифра после запятой, без данных — тире', () => {
  assert.equal(formatHtRating(4.62), '4,6');
  assert.equal(formatHtRating(5), '5,0');
  assert.equal(formatHtRating(null), '—');
});

test('formatRatingsCount: число с разрядами и склонением', () => {
  assert.equal(formatRatingsCount(2140), `2${nbsp}140 оценок`);
  assert.equal(formatRatingsCount(1), '1 оценка');
  assert.equal(formatRatingsCount(3), '3 оценки');
  assert.equal(formatRatingsCount(null), 'нет оценок');
});

test('formatViews: тысячи и миллионы сокращаются', () => {
  assert.equal(formatViews(null), '—');
  assert.equal(formatViews(640), '640');
  assert.equal(formatViews(1250), '1,3 тыс.');
  assert.equal(formatViews(5000), '5 тыс.');
  assert.equal(formatViews(96400), '96 тыс.');
  assert.equal(formatViews(999_600), '1 млн');
  assert.equal(formatViews(1_480_000), '1,5 млн');
});

const idea = (id: string): CatalogIdea => ({
  id,
  manufacturer: 'DARKSIDE',
  lineName: '',
  name: id,
  flavorProfiles: [],
  rating: 4.5,
  ratingsCount: 100,
  reviewsCount: 10,
  viewsCount: 1000,
  sourceUrl: `https://htreviews.org/${id}`,
  why: null,
});

const ideas: CatalogIdeas = {
  popularOnShelfBrands: [idea('a'), idea('b')],
  topRated: [idea('c')],
  likeFastMoving: [],
};

test('ideaSections: подборки по порядку мокапа, пустые скрыты', () => {
  const sections = ideaSections(ideas, new Map());
  assert.deepEqual(sections.map((section) => section.title), ['Популярное у ваших брендов', 'Высокий рейтинг']);
  assert.equal(sections[0].hint, 'Бренды полки, отсортированы по просмотрам на htreviews');
  assert.deepEqual(sections[0].items.map((item) => item.id), ['a', 'b']);
});

test('ideaSections: что уже на полке — не идея, план остаётся с меткой', () => {
  const sections = ideaSections(ideas, new Map([['a', 'active'], ['c', 'plan']]));
  assert.deepEqual(sections[0].items.map((item) => item.id), ['b']);
  assert.deepEqual(sections[1].items.map((item) => item.id), ['c']);
  assert.deepEqual(ideaSections(ideas, new Map([['a', 'active'], ['b', 'active'], ['c', 'active']])), []);
});
