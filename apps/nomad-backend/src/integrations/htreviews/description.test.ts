import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHtReviewsDescription } from './description';

test('buildHtReviewsDescription keeps direct page description when present', () => {
  const result = buildHtReviewsDescription({
    description: 'Яркий лайм с холодным послевкусием.',
    rawTags: ['Лайм', 'Холодок'],
    officialStrength: 'Средняя',
    communityStrength: 'Средняя',
    status: 'Выпускается',
  });

  assert.equal(result, 'Яркий лайм с холодным послевкусием.');
});

test('buildHtReviewsDescription builds factual fallback from tags and attributes', () => {
  const result = buildHtReviewsDescription({
    description: null,
    rawTags: ['Ягоды', 'Грейпфрут', 'Ягоды'],
    officialStrength: 'Средняя',
    communityStrength: 'Средняя',
    status: 'Выпускается',
  });

  assert.equal(
    result,
    'На HTReviews для этого вкуса отмечены теги: Ягоды, Грейпфрут. Официальная крепость на HTReviews — Средняя, по оценкам сообщества — Средняя. Статус на HTReviews — Выпускается.',
  );
});
