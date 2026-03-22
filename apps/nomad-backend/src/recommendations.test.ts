import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app';
import { getInStockMixes, getOnboardingOptions, getRecommendations } from './recommendations';

test('onboarding options include only in-stock profiles and flavors', () => {
  const options = getOnboardingOptions();

  assert.equal(options.profiles.includes('fresh'), true);
  assert.equal(options.flavors.includes('персик'), false);
});

test('recommendations exclude mixes with out-of-stock components', () => {
  const recommendationIds = getInStockMixes().map((item) => item.id);

  assert.equal(recommendationIds.includes('mix-peach-mirage'), false);
});

test('recommendations rank citrus and fresh mix first for matching onboarding', () => {
  const recommendations = getRecommendations({
    likedProfiles: ['fresh', 'citrus'],
    likedFlavors: ['лимон', 'мята'],
  });

  assert.equal(recommendations[0]?.id, 'mix-citrus-scout');
});

test('guest onboarding endpoint returns ranked recommendation list', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/guest/onboarding/recommendations',
    payload: {
      likedProfiles: ['sweet'],
      likedFlavors: ['мед'],
      limit: 3,
    },
  });

  assert.equal(response.statusCode, 200);

  const body = response.json() as {
    items: Array<{ id: string }>;
    onboarding: { likedProfiles: string[] };
  };

  assert.equal(body.items.length, 3);
  assert.deepEqual(body.onboarding.likedProfiles, ['sweet']);
  assert.equal(body.items[0]?.id, 'mix-silk-road');

  await app.close();
});
