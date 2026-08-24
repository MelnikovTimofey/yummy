import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app';
import { deleteMix, resetAppState } from './state';
import { mixes as mixFixtures } from './catalog';
import { getInStockMixes, getOnboardingOptions, getRecommendations } from './recommendations';

test.beforeEach(async () => {
  await resetAppState();
});

test('onboarding options include only profiles and flavors of guest catalogue mixes', async () => {
  const options = await getOnboardingOptions();

  assert.equal(options.profiles.includes('fresh'), true);
  // Персик лежит в миксе, выпавшем из каталога по наличию.
  assert.equal(options.flavors.includes('персик'), false);
  // Дыня в наличии есть, а микса с ней нет — выбирать её бессмысленно.
  assert.equal(options.flavors.includes('дыня'), false);
});

test('every onboarding option is backed by at least one mix', async () => {
  const options = await getOnboardingOptions();
  const mixes = await getInStockMixes();

  const backsProfile = (profile: string) =>
    mixes.some((mix) => mix.flavorProfiles.some((item) => item.toLowerCase() === profile.toLowerCase()));
  const backsFlavor = (flavor: string) =>
    mixes.some((mix) => mix.flavors.some((item) => item.toLowerCase() === flavor.toLowerCase()));

  assert.equal(options.profiles.every(backsProfile), true);
  assert.equal(options.flavors.every(backsFlavor), true);
});

test('onboarding options carry the mix count behind every entry', async () => {
  const options = await getOnboardingOptions();
  const mixes = await getInStockMixes();

  const mintMixes = mixes.filter((mix) => mix.flavors.some((flavor) => flavor.toLowerCase() === 'мята')).length;
  assert.ok(mintMixes > 0);
  assert.equal(options.flavorCounts['мята'], mintMixes);

  assert.equal(options.profiles.every((profile) => (options.profileCounts[profile] ?? 0) > 0), true);
  assert.equal(options.flavors.every((flavor) => (options.flavorCounts[flavor] ?? 0) > 0), true);
});

test('onboarding options degrade to empty lists on an empty catalogue', async () => {
  for (const mix of mixFixtures) {
    await deleteMix(mix.id);
  }

  const options = await getOnboardingOptions();

  assert.deepEqual(options.profiles, []);
  assert.deepEqual(options.flavors, []);
  assert.deepEqual(options.profileCounts, {});
  assert.deepEqual(options.flavorCounts, {});
});

test('recommendations exclude mixes with out-of-stock components', async () => {
  const recommendationIds = (await getInStockMixes()).map((item) => item.id);

  assert.equal(recommendationIds.includes('mix-peach-mirage'), false);
});

test('recommendations report which profiles and flavors matched the guest choice', async () => {
  const [top] = await getRecommendations({
    likedProfiles: ['citrus'],
    likedFlavors: ['лимон'],
  });

  assert.equal(top?.matchedProfiles.includes('citrus'), true);
  assert.deepEqual(top?.matchedFlavors, ['лимон']);
});

test('recommendations report an empty match when the guest choice overlaps nothing', async () => {
  const items = await getRecommendations({
    likedProfiles: [],
    likedFlavors: ['вкус, которого нет в картотеке'],
  });

  // Скоринг мягкий и всё равно отдаёт список — но выдавать его за подобранное нельзя.
  assert.ok(items.length > 0);
  assert.equal(
    items.every((item) => item.matchedProfiles.length === 0 && item.matchedFlavors.length === 0),
    true,
  );
});

test('recommendations rank citrus and fresh mix first for matching onboarding', async () => {
  const recommendations = await getRecommendations({
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
