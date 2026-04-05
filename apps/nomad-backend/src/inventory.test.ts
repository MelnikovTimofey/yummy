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

test('staff inventory endpoints expose filtered inventory with dependent mixes and mutate stock', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  const before = await app.inject({
    method: 'GET',
    url: '/staff/inventory/tobaccos?stock=out-of-stock&manufacturers=Nomad%20Reserve&flavors=%D0%BF%D0%B5%D1%80%D1%81%D0%B8%D0%BA&sort=dependentMixes&direction=desc',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(before.statusCode, 200);
  const beforeBody = before.json() as {
    items: Array<{
      id: string;
      inStock: boolean;
      description: string | null;
      country: string | null;
      productionStatus: string | null;
      flavorTags: string[];
      dependentMixCount: number;
      blockedDependentMixCount: number;
      dependentMixes: Array<{ id: string; guestVisible: boolean }>;
    }>;
    filters: {
      stock: string;
      manufacturers: string[];
      flavors: string[];
      options: {
        flavorTags: string[];
      };
    };
    sort: {
      field: string;
      direction: string;
    };
    meta: {
      totalItems: number;
      filteredItems: number;
      inStockCount: number;
      outOfStockCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  assert.equal(beforeBody.filters.stock, 'out-of-stock');
  assert.deepEqual(beforeBody.filters.manufacturers, ['Nomad Reserve']);
  assert.deepEqual(beforeBody.filters.flavors, ['персик']);
  assert.equal(beforeBody.sort.field, 'dependentMixes');
  assert.equal(beforeBody.sort.direction, 'desc');
  assert.equal(beforeBody.meta.totalItems, seedTobaccos.length);
  assert.equal(beforeBody.meta.filteredItems, 1);
  assert.equal(beforeBody.meta.inStockCount, 0);
  assert.equal(beforeBody.meta.outOfStockCount, 1);
  assert.equal(beforeBody.meta.page, 1);
  assert.equal(beforeBody.meta.pageSize, 1);
  assert.equal(beforeBody.meta.totalPages, 1);
  assert.equal(beforeBody.meta.hasNextPage, false);
  assert.equal(beforeBody.meta.hasPreviousPage, false);
  assert.equal(beforeBody.items[0]?.id, 'tobacco-peach-silk');
  assert.equal(beforeBody.items[0]?.inStock, false);
  assert.equal(beforeBody.items[0]?.description, null);
  assert.equal(beforeBody.items[0]?.country, null);
  assert.equal(beforeBody.items[0]?.productionStatus, null);
  assert.equal(beforeBody.items[0]?.dependentMixCount, 1);
  assert.equal(beforeBody.items[0]?.blockedDependentMixCount, 1);
  assert.equal(beforeBody.items[0]?.dependentMixes[0]?.id, 'mix-peach-mirage');
  assert.equal(beforeBody.items[0]?.dependentMixes[0]?.guestVisible, false);
  assert.equal(beforeBody.filters.options.flavorTags.includes('fruity'), true);

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

test('staff inventory list paginates filtered results', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const paged = await app.inject({
      method: 'GET',
      url: '/staff/inventory/tobaccos?page=2&pageSize=2&sort=name&direction=asc',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(paged.statusCode, 200);
    const body = paged.json() as {
      items: Array<{ id: string }>;
      meta: {
        filteredItems: number;
        page: number;
        pageSize: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    };

    assert.equal(body.items.length, 2);
    assert.equal(body.meta.filteredItems, seedTobaccos.length);
    assert.equal(body.meta.page, 2);
    assert.equal(body.meta.pageSize, 2);
    assert.equal(body.meta.totalPages, Math.ceil(seedTobaccos.length / 2));
    assert.equal(body.meta.hasNextPage, true);
    assert.equal(body.meta.hasPreviousPage, true);
  } finally {
    await app.close();
  }
});

test('staff can create tobacco entries for inventory and mix editors', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const created = await app.inject({
      method: 'POST',
      url: '/staff/inventory/tobaccos',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        manufacturer: 'Darkside',
        lineName: 'Core',
        name: 'Bounty Hunter',
        description: 'Кокосово-шоколадный профиль для новых миксов',
        country: 'Россия',
        officialStrength: 'medium',
        communityStrength: 'выше средней',
        productionStatus: 'в производстве',
        flavorProfiles: ['sweet'],
        flavors: ['кокос', 'шоколад'],
        flavorTags: ['dessert', 'coconut'],
        inStock: false,
      },
    });

    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      item: {
        id: string;
        manufacturer: string;
        lineName: string;
        name: string;
        inStock: boolean;
        flavorProfiles: string[];
        flavors: string[];
        flavorTags: string[];
      };
    };

    assert.equal(createdBody.item.manufacturer, 'Darkside');
    assert.equal(createdBody.item.lineName, 'Core');
    assert.equal(createdBody.item.name, 'Bounty Hunter');
    assert.equal(createdBody.item.inStock, false);
    assert.deepEqual(createdBody.item.flavorProfiles, ['sweet']);
    assert.deepEqual(createdBody.item.flavors, ['кокос', 'шоколад']);
    assert.deepEqual(createdBody.item.flavorTags, ['dessert', 'coconut']);

    const inventory = await app.inject({
      method: 'GET',
      url: '/staff/inventory/tobaccos?search=Darkside',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(inventory.statusCode, 200);
    const inventoryBody = inventory.json() as {
      items: Array<{ id: string; manufacturer: string; name: string }>;
    };
    assert.equal(
      inventoryBody.items.some((item) => item.id === createdBody.item.id && item.manufacturer === 'Darkside' && item.name === 'Bounty Hunter'),
      true,
    );

    const updated = await app.inject({
      method: 'PATCH',
      url: `/staff/inventory/tobaccos/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        manufacturer: 'Darkside',
        lineName: 'Shot',
        name: 'Bounty Hunter Remix',
        description: 'Обновлённый десертный профиль',
        country: 'Россия',
        officialStrength: 'strong',
        communityStrength: 'высокая',
        productionStatus: 'limited',
        flavorProfiles: ['sweet', 'tobacco'],
        flavors: ['кокос', 'шоколад', 'орех'],
        flavorTags: ['dessert', 'limited'],
        inStock: true,
      },
    });

    assert.equal(updated.statusCode, 200);
    const updatedBody = updated.json() as {
      item: {
        lineName: string;
        name: string;
        inStock: boolean;
        productionStatus: string | null;
        flavorProfiles: string[];
        flavors: string[];
      };
    };

    assert.equal(updatedBody.item.lineName, 'Shot');
    assert.equal(updatedBody.item.name, 'Bounty Hunter Remix');
    assert.equal(updatedBody.item.inStock, true);
    assert.equal(updatedBody.item.productionStatus, 'limited');
    assert.deepEqual(updatedBody.item.flavorProfiles, ['sweet', 'tobacco']);
    assert.deepEqual(updatedBody.item.flavors, ['кокос', 'шоколад', 'орех']);
  } finally {
    await app.close();
  }
});

test('staff inventory batch endpoint updates stock and rejects archive semantics', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  const batch = await app.inject({
    method: 'POST',
    url: '/staff/inventory/tobaccos/batch',
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      ids: ['tobacco-peach-silk', 'tobacco-mint-veil', 'missing-id'],
      action: 'set-out-of-stock',
    },
  });

  assert.equal(batch.statusCode, 200);
  const batchBody = batch.json() as {
    action: string;
    ids: string[];
    skippedIds: string[];
    processedCount: number;
    items: Array<{ id: string; inStock: boolean }>;
  };
  assert.equal(batchBody.action, 'set-out-of-stock');
  assert.deepEqual(batchBody.ids.sort(), ['tobacco-mint-veil', 'tobacco-peach-silk']);
  assert.deepEqual(batchBody.skippedIds, ['missing-id']);
  assert.equal(batchBody.processedCount, 2);
  assert.equal(batchBody.items.every((item) => item.inStock === false), true);

  const inventory = await app.inject({
    method: 'GET',
    url: '/staff/inventory/tobaccos?stock=out-of-stock',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(inventory.statusCode, 200);
  const inventoryBody = inventory.json() as { items: Array<{ id: string }> };
  assert.equal(inventoryBody.items.some((item) => item.id === 'tobacco-mint-veil'), true);
  assert.equal(inventoryBody.items.some((item) => item.id === 'tobacco-peach-silk'), true);

  const archive = await app.inject({
    method: 'POST',
    url: '/staff/inventory/tobaccos/batch',
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      ids: ['tobacco-peach-silk'],
      action: 'archive',
    },
  });

  assert.equal(archive.statusCode, 409);
  assert.match(archive.body, /product-approved contract/i);

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
