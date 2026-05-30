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

test('guest intro cards describe the onboarding flow', async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/guest/intro/cards',
    });

    assert.equal(response.statusCode, 200);

    const body = response.json() as {
      items: Array<{ step: number; title: string; bullets: string[] }>;
    };

    assert.deepEqual(
      body.items.map((item) => item.step),
      [1, 2, 3, 4],
    );
    assert.equal(body.items[0]?.title, 'Расскажите, что хочется покурить');
    assert.equal(body.items[2]?.title, 'Открывайте каталог');
    assert.equal(body.items[3]?.title, 'Добро пожаловать в Арома Ателье');
    assert.equal(body.items[0]?.bullets.includes('Рекомендации учитывают наличие табаков.'), true);
  } finally {
    await app.close();
  }
});

test('guest catalog filters available mixes and rating updates change averages', async () => {
  const app = buildApp();

  try {
    const catalog = await app.inject({
      method: 'GET',
      url: '/guest/catalog/mixes?profiles=sweet&flavors=мед',
    });

    assert.equal(catalog.statusCode, 200);
    const catalogBody = catalog.json() as {
      filters: { profiles: string[]; flavors: string[] };
      items: Array<{ id: string; guestVisible: boolean; avgRating: number }>;
    };

    assert.deepEqual(catalogBody.filters, {
      profiles: ['sweet'],
      flavors: ['мед'],
    });
    assert.equal(catalogBody.items.every((item) => item.guestVisible), true);
    assert.equal(catalogBody.items.some((item) => item.id === 'mix-peach-mirage'), false);
    assert.equal(catalogBody.items[0]?.id, 'mix-silk-road');

    const rating = await app.inject({
      method: 'POST',
      url: '/guest/mixes/mix-silk-road/rating',
      payload: {
        value: 1,
      },
    });

    assert.equal(rating.statusCode, 200);
    const ratingBody = rating.json() as {
      item: { id: string; avgRating: number; ratingsCount: number };
      rating: { value: number };
    };

    assert.equal(ratingBody.item.id, 'mix-silk-road');
    assert.equal(ratingBody.item.avgRating, 1);
    assert.equal(ratingBody.item.ratingsCount, 1);
    assert.equal(ratingBody.rating.value, 1);

    const refreshedCatalog = await app.inject({
      method: 'GET',
      url: '/guest/catalog/mixes?profiles=sweet',
    });

    assert.equal(refreshedCatalog.statusCode, 200);
    const refreshedBody = refreshedCatalog.json() as {
      items: Array<{ id: string; avgRating: number }>;
    };

    assert.equal(refreshedBody.items.some((item) => item.id === 'mix-silk-road' && item.avgRating === 1), true);
  } finally {
    await app.close();
  }
});

test('guest home rails include statistical rails for CTA and ratings', async () => {
  const app = buildApp();

  try {
    await app.inject({
      method: 'POST',
      url: '/guest/events/smoke-cta',
      payload: {
        mixId: 'mix-citrus-scout',
      },
    });

    await app.inject({
      method: 'POST',
      url: '/guest/events/smoke-cta',
      payload: {
        mixId: 'mix-berry-dawn',
      },
    });

    await app.inject({
      method: 'POST',
      url: '/guest/mixes/mix-citrus-scout/rating',
      payload: {
        value: 1,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/guest/mixes/mix-berry-dawn/rating',
      payload: {
        value: 5,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/guest/home/rails',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      items: Array<{ id: string; type: string; mixes: Array<{ id: string; avgRating: number }> }>;
    };

    const ctaRail = body.items.find((item) => item.id === 'rail-statistical-top');
    const ratedRail = body.items.find((item) => item.id === 'rail-statistical-rated');
    assert.equal(ctaRail?.type, 'statistical');
    assert.equal(ratedRail?.type, 'statistical');
    assert.equal(ctaRail?.mixes[0]?.id, 'mix-berry-dawn');
    assert.equal(ratedRail?.mixes[0]?.id, 'mix-berry-dawn');
    assert.equal(ratedRail?.mixes[0]?.avgRating, 5);
  } finally {
    await app.close();
  }
});

test('staff can manage mixes and rails', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const createdMix = await app.inject({
      method: 'POST',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Лаймовая ночь',
        description: 'Свежий микс для вечернего зала',
        components: [
          {
            tobaccoId: 'tobacco-citrus-breeze',
            proportion: 60,
            sortOrder: 0,
          },
          {
            tobaccoId: 'tobacco-mint-veil',
            proportion: 40,
            sortOrder: 1,
          },
        ],
        available: true,
      },
    });

    assert.equal(createdMix.statusCode, 201);
    const createdMixBody = createdMix.json() as {
      item: { id: string; available: boolean; guestVisible: boolean; components: Array<{ tobaccoId: string; proportion: number }> };
    };

    assert.equal(createdMixBody.item.available, true);
    assert.equal(createdMixBody.item.guestVisible, true);
    assert.deepEqual(
      createdMixBody.item.components.map((item) => ({ tobaccoId: item.tobaccoId, proportion: item.proportion })),
      [
        { tobaccoId: 'tobacco-citrus-breeze', proportion: 60 },
        { tobaccoId: 'tobacco-mint-veil', proportion: 40 },
      ],
    );

    const listMixes = await app.inject({
      method: 'GET',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(listMixes.statusCode, 200);
    const listMixesBody = listMixes.json() as {
      items: Array<{ id: string }>;
    };

    assert.equal(listMixesBody.items.some((item) => item.id === createdMixBody.item.id), true);

    const updatedMix = await app.inject({
      method: 'PATCH',
      url: `/staff/mixes/${createdMixBody.item.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        available: false,
      },
    });

    assert.equal(updatedMix.statusCode, 200);
    const updatedMixBody = updatedMix.json() as {
      item: { id: string; available: boolean; guestVisible: boolean };
    };

    assert.equal(updatedMixBody.item.id, createdMixBody.item.id);
    assert.equal(updatedMixBody.item.available, false);
    assert.equal(updatedMixBody.item.guestVisible, false);

    const createdRail = await app.inject({
      method: 'POST',
      url: '/staff/rails',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Новая витрина',
        description: 'Ручная подборка для VIP-зала',
        type: 'prepared',
        mixIds: [createdMixBody.item.id],
        active: true,
      },
    });

    assert.equal(createdRail.statusCode, 201);
    const createdRailBody = createdRail.json() as {
      item: { id: string; type: string; active: boolean; mixIds: string[]; editable: boolean; readOnlyReason: string };
    };

    assert.equal(createdRailBody.item.type, 'curated');
    assert.equal(createdRailBody.item.active, true);
    assert.deepEqual(createdRailBody.item.mixIds, [createdMixBody.item.id]);
    assert.equal(createdRailBody.item.editable, true);
    assert.equal(createdRailBody.item.readOnlyReason, '');

    const patchedRail = await app.inject({
      method: 'PATCH',
      url: `/staff/rails/${createdRailBody.item.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        active: false,
      },
    });

    assert.equal(patchedRail.statusCode, 200);
    const patchedRailBody = patchedRail.json() as {
      item: { id: string; active: boolean };
    };

    assert.equal(patchedRailBody.item.id, createdRailBody.item.id);
    assert.equal(patchedRailBody.item.active, false);

    const patchStatisticalRail = await app.inject({
      method: 'PATCH',
      url: '/staff/rails/rail-statistical-top',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        description: 'Попытка редактирования',
      },
    });

    assert.equal(patchStatisticalRail.statusCode, 400);
    assert.equal(
      (patchStatisticalRail.json() as { error: string }).error,
      'Статистический рейл формируется автоматически и доступен только для просмотра.',
    );

    const staffRails = await app.inject({
      method: 'GET',
      url: '/staff/rails',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(staffRails.statusCode, 200);
    const staffRailsBody = staffRails.json() as {
      items: Array<{ type: string; id: string; editable: boolean; readOnlyReason: string }>;
    };

    assert.equal(
      staffRailsBody.items.some(
        (item) =>
          item.type === 'statistical'
          && item.editable === false
          && item.readOnlyReason === 'Статистический рейл формируется автоматически и доступен только для просмотра.',
      ),
      true,
    );
    assert.equal(staffRailsBody.items.some((item) => item.id === 'rail-statistical-rated' && item.editable === false), true);
    assert.equal(staffRailsBody.items.some((item) => item.id === createdRailBody.item.id), true);
  } finally {
    await app.close();
  }
});

test('staff can delete a mix and it disappears from its rails', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const createdMix = await app.inject({
      method: 'POST',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Микс на удаление',
        description: 'Временный микс для проверки удаления',
        components: [
          {
            tobaccoId: 'tobacco-citrus-breeze',
            proportion: 50,
            sortOrder: 0,
          },
          {
            tobaccoId: 'tobacco-mint-veil',
            proportion: 50,
            sortOrder: 1,
          },
        ],
        available: true,
      },
    });

    assert.equal(createdMix.statusCode, 201);
    const mixId = createdMix.json().item.id as string;

    const createdRail = await app.inject({
      method: 'POST',
      url: '/staff/rails',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Рейл с удаляемым миксом',
        description: 'Подборка, из которой микс уйдёт при удалении',
        type: 'curated',
        mixIds: [mixId],
        active: true,
      },
    });

    assert.equal(createdRail.statusCode, 201);
    const railId = createdRail.json().item.id as string;

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/staff/mixes/${mixId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(deleted.statusCode, 200);
    assert.equal((deleted.json() as { item: { id: string } }).item.id, mixId);

    const listMixes = await app.inject({
      method: 'GET',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(listMixes.statusCode, 200);
    assert.equal(
      (listMixes.json() as { items: Array<{ id: string }> }).items.some((item) => item.id === mixId),
      false,
    );

    const staffRails = await app.inject({
      method: 'GET',
      url: '/staff/rails',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(staffRails.statusCode, 200);
    const rail = (staffRails.json() as { items: Array<{ id: string; mixIds: string[] }> }).items.find(
      (item) => item.id === railId,
    );
    assert.ok(rail, 'рейл сохраняется после удаления микса');
    assert.equal(rail!.mixIds.includes(mixId), false);

    const deleteMissing = await app.inject({
      method: 'DELETE',
      url: `/staff/mixes/${mixId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(deleteMissing.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('staff mixes list supports filters and validates component proportions', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const invalidMix = await app.inject({
      method: 'POST',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Неконсистентный микс',
        description: 'Сумма процентов не равна 100',
        components: [
          {
            tobaccoId: 'tobacco-citrus-breeze',
            proportion: 30,
            sortOrder: 0,
          },
          {
            tobaccoId: 'tobacco-mint-veil',
            proportion: 30,
            sortOrder: 1,
          },
        ],
      },
    });

    assert.equal(invalidMix.statusCode, 400);
    assert.equal(invalidMix.json().error, 'Component proportions must total exactly 100');

    const createdMix = await app.inject({
      method: 'POST',
      url: '/staff/mixes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Микс для рейлов',
        description: 'Микс с ягодным профилем',
        components: [
          {
            tobaccoId: 'tobacco-berry-oasis',
            proportion: 55,
            sortOrder: 0,
          },
          {
            tobaccoId: 'tobacco-mint-veil',
            proportion: 45,
            sortOrder: 1,
          },
        ],
        available: true,
        popularity: 22,
      },
    });

    assert.equal(createdMix.statusCode, 201);
    const createdMixId = createdMix.json().item.id as string;

    const createdRail = await app.inject({
      method: 'POST',
      url: '/staff/rails',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Ягодный рейл',
        description: 'Ручная подборка для дегустации',
        mixIds: [createdMixId],
        type: 'curated',
        active: true,
      },
    });

    assert.equal(createdRail.statusCode, 201);

    const filtered = await app.inject({
      method: 'GET',
      url: '/staff/mixes?status=guest-visible&railState=in-rails&manufacturers=Nomad%20Reserve&flavors=%D0%BC%D0%B0%D0%BB%D0%B8%D0%BD%D0%B0&sort=rails&direction=desc',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(filtered.statusCode, 200);
    const filteredBody = filtered.json() as {
      items: Array<{ id: string; railMemberships: Array<{ name: string }> }>;
      filters: {
        status: string;
        railState: string;
        manufacturers: string[];
        flavors: string[];
      };
      sort: {
        field: string;
        direction: string;
      };
      meta: {
        filteredItems: number;
        inRailsCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    };

    assert.equal(filteredBody.items.some((item) => item.id === createdMixId), true);
    assert.equal(
      filteredBody.items.find((item) => item.id === createdMixId)?.railMemberships.some((membership) => membership.name === 'Ягодный рейл'),
      true,
    );
    assert.equal(filteredBody.filters.status, 'guest-visible');
    assert.equal(filteredBody.filters.railState, 'in-rails');
    assert.deepEqual(filteredBody.filters.manufacturers, ['Nomad Reserve']);
    assert.deepEqual(filteredBody.filters.flavors, ['малина']);
    assert.equal(filteredBody.sort.field, 'rails');
    assert.equal(filteredBody.sort.direction, 'desc');
    assert.equal(filteredBody.meta.filteredItems >= 1, true);
    assert.equal(filteredBody.meta.inRailsCount >= 1, true);
    assert.equal(filteredBody.meta.page, 1);
    assert.equal(filteredBody.meta.pageSize, filteredBody.meta.filteredItems);
    assert.equal(filteredBody.meta.totalPages >= 1, true);
  } finally {
    await app.close();
  }
});

test('staff mixes list paginates catalog results', async () => {
  const app = buildApp();
  const token = await loginStaff(app);

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/staff/mixes?page=2&pageSize=2&sort=name&direction=asc',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
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
    assert.equal(body.meta.filteredItems >= body.items.length, true);
    assert.equal(body.meta.page, 2);
    assert.equal(body.meta.pageSize, 2);
    assert.equal(body.meta.totalPages >= 2, true);
    assert.equal(body.meta.hasNextPage, true);
    assert.equal(body.meta.hasPreviousPage, true);
  } finally {
    await app.close();
  }
});
