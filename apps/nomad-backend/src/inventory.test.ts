import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { tobaccos as seedTobaccos } from './catalog';
import { resetNomadState } from './state';

const loginStaff = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    payload: {
      login: 'admin',
      password: 'admin',
    },
  });

  assert.equal(response.statusCode, 200);

  const body = response.json() as { accessToken: string };
  return body.accessToken;
};

test.beforeEach(async () => {
  await resetNomadState();
});

test('staff inventory endpoints expose and mutate in-memory stock', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  const before = await app.inject({
    method: 'GET',
    url: '/staff/inventory/tobaccos',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(before.statusCode, 200);
  const beforeBody = before.json() as { items: Array<{ id: string; inStock: boolean }> };
  assert.equal(beforeBody.items.find((item) => item.id === 'tobacco-peach-silk')?.inStock, false);

  const patch = await app.inject({
    method: 'PATCH',
    url: '/staff/inventory/tobaccos/tobacco-peach-silk',
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      inStock: true,
    },
  });

  assert.equal(patch.statusCode, 200);
  const patchBody = patch.json() as { item: { id: string; inStock: boolean } };
  assert.equal(patchBody.item.id, 'tobacco-peach-silk');
  assert.equal(patchBody.item.inStock, true);

  const options = await app.inject({
    method: 'GET',
    url: '/guest/onboarding/options',
  });

  assert.equal(options.statusCode, 200);
  const optionsBody = options.json() as { profiles: string[]; flavors: string[] };
  assert.equal(optionsBody.flavors.includes('персик'), true);

  const recommendations = await app.inject({
    method: 'POST',
    url: '/guest/onboarding/recommendations',
    payload: {
      likedProfiles: ['sweet'],
      likedFlavors: ['персик'],
      limit: 3,
    },
  });

  assert.equal(recommendations.statusCode, 200);
  const recommendationsBody = recommendations.json() as { items: Array<{ id: string }> };
  assert.equal(recommendationsBody.items[0]?.id, 'mix-peach-mirage');

  await app.close();
});

test('smoke CTA events are recorded in dashboard summary', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  const firstClick = await app.inject({
    method: 'POST',
    url: '/guest/events/smoke-cta',
    payload: {
      mixId: 'mix-citrus-scout',
    },
  });

  const secondClick = await app.inject({
    method: 'POST',
    url: '/guest/events/smoke-cta',
    payload: {
      mixId: 'mix-citrus-scout',
    },
  });

  const thirdClick = await app.inject({
    method: 'POST',
    url: '/guest/events/smoke-cta',
    payload: {
      mixId: 'mix-silk-road',
    },
  });

  assert.equal(firstClick.statusCode, 201);
  assert.equal(secondClick.statusCode, 201);
  assert.equal(thirdClick.statusCode, 201);

  const firstRating = await app.inject({
    method: 'POST',
    url: '/guest/mixes/mix-citrus-scout/rating',
    payload: {
      value: 5,
    },
  });

  const secondRating = await app.inject({
    method: 'POST',
    url: '/guest/mixes/mix-silk-road/rating',
    payload: {
      value: 3,
    },
  });

  assert.equal(firstRating.statusCode, 200);
  assert.equal(secondRating.statusCode, 200);

  const dashboard = await app.inject({
    method: 'GET',
    url: '/staff/dashboard/summary?window=7d',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(dashboard.statusCode, 200);

  const dashboardBody = dashboard.json() as {
    window: { key: string; days: number };
    inventory: {
      total: number;
      inStockCount: number;
      outOfStockCount: number;
      manufacturers: Array<{ label: string; total: number }>;
      flavorProfiles: Array<{ key: string; label: string; total: number }>;
    };
    product: {
      smokeCtaTotal: number;
      ratingsTotal: number;
      avgGuestRating: number;
      topMixes: Array<{ mixId: string; mixName: string; smokeCtaCount: number; avgRating: number }>;
      topRatedMixes: Array<{ mixId: string; mixName: string; avgRating: number; ratingsCount: number }>;
      ratingDistribution: Array<{ value: number; count: number }>;
      activity: Array<{ date: string; smokeCtaCount: number; ratingsCount: number }>;
    };
    ops: {
      blockedByInventoryCount: number;
      blockedMixes: Array<{ mixId: string; mixName: string; missingComponents: string[] }>;
      railHealth: Array<{ railId: string; totalMixCount: number }>;
    };
  };

  assert.equal(dashboardBody.window.key, '7d');
  assert.equal(dashboardBody.window.days, 7);
  assert.equal(dashboardBody.inventory.total, seedTobaccos.length);
  assert.equal(dashboardBody.product.smokeCtaTotal, 3);
  assert.equal(dashboardBody.product.ratingsTotal, 2);
  assert.equal(dashboardBody.product.avgGuestRating, 4);
  assert.deepEqual(dashboardBody.product.topMixes[0], {
    mixId: 'mix-citrus-scout',
    mixName: 'Цитрусовый караван',
    smokeCtaCount: 2,
    avgRating: 5,
    ratingsCount: 1,
    popularity: 92,
  });
  assert.deepEqual(dashboardBody.product.topRatedMixes[0], {
    mixId: 'mix-citrus-scout',
    mixName: 'Цитрусовый караван',
    smokeCtaCount: 2,
    avgRating: 5,
    ratingsCount: 1,
    popularity: 92,
  });
  assert.equal(dashboardBody.inventory.manufacturers[0]?.label, 'Nomad Reserve');
  assert.equal(dashboardBody.inventory.flavorProfiles.some((item) => item.label === 'Свежие'), true);
  assert.equal(dashboardBody.product.ratingDistribution.find((item) => item.value === 5)?.count, 1);
  assert.equal(dashboardBody.ops.blockedByInventoryCount, 1);
  assert.equal(dashboardBody.ops.blockedMixes[0]?.mixId, 'mix-peach-mirage');
  assert.equal(dashboardBody.ops.blockedMixes[0]?.mixName, 'Персиковый мираж');
  assert.deepEqual(dashboardBody.ops.blockedMixes[0]?.missingComponents, ['Peach Silk']);
  assert.equal(dashboardBody.ops.railHealth[0]?.railId, 'rail-statistical-top');
  assert.equal(dashboardBody.product.activity.length, 7);
  assert.equal(
    dashboardBody.product.activity.reduce((sum, item) => sum + item.smokeCtaCount, 0),
    3,
  );
  assert.equal(
    dashboardBody.product.activity.reduce((sum, item) => sum + item.ratingsCount, 0),
    2,
  );

  await app.close();
});
