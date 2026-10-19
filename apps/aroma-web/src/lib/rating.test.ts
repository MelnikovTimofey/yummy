import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGuestRating } from './rating';

// У микса без оценок avgRating — базовая из Мастера; первая оценка гостя должна
// сразу сделать «★» видимым (#185).
test('applyGuestRating переносит среднюю и число оценок из ответа', () => {
  const mix = { id: 'm1', avgRating: 4.5, ratingsCount: 0 };

  assert.deepEqual(applyGuestRating(mix, { averageRating: 5, ratingCount: 1 }), {
    id: 'm1',
    avgRating: 5,
    ratingsCount: 1,
  });
});

test('applyGuestRating без чисел в ответе оставляет среднюю и добавляет одну оценку', () => {
  const mix = { id: 'm1', avgRating: 4.2, ratingsCount: 3 };

  assert.deepEqual(applyGuestRating(mix, { averageRating: Number.NaN, ratingCount: Number.NaN }), {
    id: 'm1',
    avgRating: 4.2,
    ratingsCount: 4,
  });
});
