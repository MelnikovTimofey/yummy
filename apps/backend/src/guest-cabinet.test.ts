import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { config } from './config';
import { createGuestToken } from './auth';
import { prisma } from './db';
import { deleteMix, resetAppState } from './state';
import type { GuestFavoritesResponse, GuestHistoryResponse } from './types';

// История и избранное гостя (#240, PRD §8.9): события и оценки вошедшего гостя
// привязываются к нему, статусы строк — наличие, нет табака, больше не готовим.

const MIX = 'mix-citrus-scout';
const OTHER_MIX = 'mix-apple-wave';
const BOWL = [
  { tobaccoId: 'tobacco-citrus-breeze', proportion: 60 },
  { tobaccoId: 'tobacco-mint-veil', proportion: 40 },
];

type App = ReturnType<typeof buildApp>;

const createGuest = async (telegramId = '1001') => {
  const guest = await prisma.guestAccount.create({ data: { telegramId, consentAt: new Date() } });
  return { id: guest.id, headers: { authorization: `Bearer ${createGuestToken(guest.id).token}` } };
};

const smoke = (app: App, mixId: string, headers?: Record<string, string>) =>
  app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId }, headers });

const smokeCustom = (app: App, headers?: Record<string, string>) =>
  app.inject({ method: 'POST', url: '/guest/events/custom-mix-smoke', payload: { components: BOWL, name: 'Своё' }, headers });

const rate = (app: App, mixId: string, value: number, headers?: Record<string, string>) =>
  app.inject({ method: 'POST', url: `/guest/mixes/${mixId}/rating`, payload: { value }, headers });

const history = async (app: App, headers: Record<string, string>, query = '') => {
  const response = await app.inject({ method: 'GET', url: `/guest/me/history${query}`, headers });
  assert.equal(response.statusCode, 200);
  return response.json() as GuestHistoryResponse;
};

const favorites = async (app: App, headers: Record<string, string>) => {
  const response = await app.inject({ method: 'GET', url: '/guest/me/favorites', headers });
  assert.equal(response.statusCode, 200);
  return response.json() as GuestFavoritesResponse;
};

const firstTobaccoOf = async (mixId: string) => {
  const component = await prisma.mixComponent.findFirstOrThrow({ where: { mixId }, orderBy: { sortOrder: 'asc' }, include: { tobacco: true } });
  return component.tobacco;
};

test.describe('guest cabinet: history and favorites', () => {
  let app: App;

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('smoke CTA and custom mix with a guest token land in the guest history; without a token — anonymous as before', async () => {
    const guest = await createGuest();
    assert.equal((await smoke(app, MIX, guest.headers)).statusCode, 201);
    assert.equal((await smokeCustom(app, guest.headers)).statusCode, 201);
    assert.equal((await smoke(app, OTHER_MIX)).statusCode, 201);

    assert.equal(await prisma.smokeCtaEvent.count({ where: { guestId: guest.id } }), 1);
    assert.equal(await prisma.customMixSmokeEvent.count({ where: { guestId: guest.id } }), 1);
    assert.equal(await prisma.smokeCtaEvent.count({ where: { guestId: null } }), 1);
  });

  test('an invalid guest token is 401 on guest events and rating — the client drops it and retries anonymously', async () => {
    const bad = { authorization: 'Bearer broken.token' };
    assert.equal((await smoke(app, MIX, bad)).statusCode, 401);
    assert.equal((await smokeCustom(app, bad)).statusCode, 401);
    assert.equal((await rate(app, MIX, 5, bad)).statusCode, 401);
    assert.equal(await prisma.smokeCtaEvent.count(), 0);
  });

  test('a signed-in guest re-rating a mix replaces the rating instead of adding one', async () => {
    const guest = await createGuest();
    await rate(app, MIX, 2, guest.headers);
    const second = (await rate(app, MIX, 5, guest.headers)).json() as { rating: { avgRating: number; ratingsCount: number } };

    assert.equal(second.rating.ratingsCount, 1);
    assert.equal(second.rating.avgRating, 5);
    await rate(app, MIX, 3);
    await rate(app, MIX, 3);
    assert.equal(await prisma.mixRating.count({ where: { mixId: MIX } }), 3);
  });

  test('history: catalog and custom picks newest first, with own rating and kind', async () => {
    const guest = await createGuest();
    await smoke(app, MIX, guest.headers);
    await smokeCustom(app, guest.headers);
    await rate(app, MIX, 4, guest.headers);

    const { items, nextBefore } = await history(app, guest.headers);
    assert.equal(nextBefore, null);
    assert.equal(items.length, 2);
    assert.equal(items[0].ref.kind, 'custom');
    assert.equal(items[0].name, 'Своё');
    assert.equal(items[0].ownRating, null);
    assert.ok(items[0].flavorProfiles.length > 0);
    assert.deepEqual(items[1].ref, { kind: 'catalog', mixId: MIX });
    assert.equal(items[1].ownRating, 4);
    assert.deepEqual(items[1].status, { kind: 'available' });
    assert.ok(new Date(items[0].at) >= new Date(items[1].at));
  });

  test('history is the guest\'s own and is paginated by a cursor', async () => {
    const guest = await createGuest();
    const other = await createGuest('2002');
    for (let index = 0; index < 5; index += 1) {
      await smoke(app, MIX, guest.headers);
    }
    await smoke(app, MIX, other.headers);

    const first = await history(app, guest.headers, '?limit=3');
    assert.equal(first.items.length, 3);
    assert.ok(first.nextBefore);
    const second = await history(app, guest.headers, `?limit=3&before=${encodeURIComponent(first.nextBefore!)}`);
    assert.equal(second.items.length, 2);
    assert.equal(second.nextBefore, null);
    const ids = new Set([...first.items, ...second.items].map((item) => item.id));
    assert.equal(ids.size, 5);
  });

  test('history needs a guest token', async () => {
    assert.equal((await app.inject({ method: 'GET', url: '/guest/me/history' })).statusCode, 401);
  });

  test('status: a missing tobacco is named, a deleted or hidden mix is «deleted»', async () => {
    const guest = await createGuest();
    await smoke(app, MIX, guest.headers);
    await smoke(app, OTHER_MIX, guest.headers);
    await smokeCustom(app, guest.headers);

    const tobacco = await firstTobaccoOf(MIX);
    await prisma.tobacco.update({ where: { id: tobacco.id }, data: { inStock: false } });
    await prisma.tobacco.update({ where: { id: 'tobacco-mint-veil' }, data: { inStock: false } });
    await prisma.mix.update({ where: { id: OTHER_MIX }, data: { available: false } });

    const { items } = await history(app, guest.headers);
    const byRef = (predicate: (item: (typeof items)[number]) => boolean) => items.find(predicate)!;
    assert.deepEqual(byRef((item) => item.ref.kind === 'catalog' && item.ref.mixId === MIX).status, {
      kind: 'unavailable',
      missing: `${tobacco.manufacturer} ${tobacco.name}`,
    });
    assert.deepEqual(byRef((item) => item.ref.kind === 'catalog' && item.ref.mixId === OTHER_MIX).status, { kind: 'deleted' });
    // Первый отсутствующий — по порядку чаши: если табак MIX стоит в ней первым, назван он.
    const customMissing = BOWL[0].tobaccoId === tobacco.id ? `${tobacco.manufacturer} ${tobacco.name}` : 'Ателье Reserve Mint Veil';
    assert.deepEqual(byRef((item) => item.ref.kind === 'custom').status, { kind: 'unavailable', missing: customMissing });

    await deleteMix(MIX);
    const after = await history(app, guest.headers);
    const deleted = after.items.find((item) => item.ref.kind === 'catalog' && item.ref.mixId === null)!;
    assert.deepEqual(deleted.status, { kind: 'deleted' });
    assert.ok(deleted.name);
  });

  test('favorites: PUT and DELETE are idempotent, catalog and custom mixes', async () => {
    const guest = await createGuest();
    const custom = (await smokeCustom(app, guest.headers)).json() as { id: string };
    const put = (url: string) => app.inject({ method: 'PUT', url, headers: guest.headers });
    const del = (url: string) => app.inject({ method: 'DELETE', url, headers: guest.headers });

    assert.equal((await put(`/guest/me/favorites/mixes/${MIX}`)).statusCode, 204);
    assert.equal((await put(`/guest/me/favorites/mixes/${MIX}`)).statusCode, 204);
    assert.equal((await put(`/guest/me/favorites/custom/${custom.id}`)).statusCode, 204);

    const list = await favorites(app, guest.headers);
    assert.equal(list.items.length, 2);
    assert.deepEqual(list.items.map((item) => item.ref.kind).sort(), ['catalog', 'custom']);

    assert.equal((await del(`/guest/me/favorites/mixes/${MIX}`)).statusCode, 204);
    assert.equal((await del(`/guest/me/favorites/mixes/${MIX}`)).statusCode, 204);
    assert.equal((await favorites(app, guest.headers)).items.length, 1);
  });

  test('favorites: unknown mix and someone else\'s custom mix are 404', async () => {
    const guest = await createGuest();
    const other = await createGuest('2002');
    const foreign = (await smokeCustom(app, other.headers)).json() as { id: string };
    const anonymous = (await smokeCustom(app)).json() as { id: string };

    assert.equal((await app.inject({ method: 'PUT', url: '/guest/me/favorites/mixes/no-such-mix', headers: guest.headers })).statusCode, 404);
    assert.equal((await app.inject({ method: 'PUT', url: `/guest/me/favorites/custom/${foreign.id}`, headers: guest.headers })).statusCode, 404);
    assert.equal((await app.inject({ method: 'PUT', url: `/guest/me/favorites/custom/${anonymous.id}`, headers: guest.headers })).statusCode, 404);
  });

  test('a favorite mix the master deleted stays with its name and «deleted» status', async () => {
    const guest = await createGuest();
    await app.inject({ method: 'PUT', url: `/guest/me/favorites/mixes/${MIX}`, headers: guest.headers });
    const name = (await prisma.mix.findUniqueOrThrow({ where: { id: MIX } })).name;

    await deleteMix(MIX);

    const { items } = await favorites(app, guest.headers);
    assert.equal(items.length, 1);
    assert.deepEqual(items[0].ref, { kind: 'catalog', mixId: null });
    assert.equal(items[0].name, name);
    assert.deepEqual(items[0].status, { kind: 'deleted' });
  });

  test('/guest/me counts follow the guest\'s picks and favorites', async () => {
    config.guestLoginBotUsername = null;
    const guest = await createGuest();
    await smoke(app, MIX, guest.headers);
    await smokeCustom(app, guest.headers);
    await app.inject({ method: 'PUT', url: `/guest/me/favorites/mixes/${MIX}`, headers: guest.headers });

    const me = (await app.inject({ method: 'GET', url: '/guest/me', headers: guest.headers })).json() as { historyCount: number; favoritesCount: number };
    assert.equal(me.historyCount, 2);
    assert.equal(me.favoritesCount, 1);
  });
});
