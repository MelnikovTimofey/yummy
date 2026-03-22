import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
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

  const dashboard = await app.inject({
    method: 'GET',
    url: '/staff/dashboard/summary',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(dashboard.statusCode, 200);

  const dashboardBody = dashboard.json() as {
    inventory: { total: number; inStockCount: number; outOfStockCount: number };
    smokeCtaTotal: number;
    topMixes: Array<{ mixId: string; mixName: string; count: number; avgRating: number }>;
  };

  assert.equal(dashboardBody.inventory.total, 6);
  assert.equal(dashboardBody.smokeCtaTotal, 3);
  assert.deepEqual(dashboardBody.topMixes[0], {
    mixId: 'mix-citrus-scout',
    mixName: 'Цитрусовый караван',
    count: 2,
    avgRating: 4.8,
  });

  await app.close();
});
