import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGuestApp as buildApp } from './test-app';
import { createGuestToken } from './auth';
import { prisma } from './db';
import { resetAppState } from './state';
import type { GuestCatalogMixesResponse, GuestFavoritesResponse, StaffMixesResponse } from './types';

// Аналоги в выдаче (#479, критерии приёмки #475 п.3–6): «Цитрусовый караван» —
// Citrus Breeze + Mint Veil; Citrus Breeze закончился, его аналог Apple Fizz на полке.

const MIX = 'mix-citrus-scout';
const GONE = 'tobacco-citrus-breeze';
const ANALOG = 'tobacco-apple-fizz';

type App = ReturnType<typeof buildApp>;

const linkAnalogs = (tobaccoId: string, analogId: string) =>
  prisma.tobaccoAnalog.createMany({
    data: [
      { tobaccoId, analogId, sortOrder: 0 },
      { tobaccoId: analogId, analogId: tobaccoId, sortOrder: 0 },
    ],
  });

const setStock = (id: string, inStock: boolean) => prisma.tobacco.update({ where: { id }, data: { inStock } });

const catalogMix = async (app: App) => {
  const response = await app.inject({ method: 'GET', url: '/guest/catalog/mixes' });
  assert.equal(response.statusCode, 200);
  return (response.json() as GuestCatalogMixesResponse).items.find((item) => item.id === MIX);
};

const staffHeaders = async (app: App) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
  assert.equal(response.statusCode, 200);
  return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
};

const staffMixes = async (app: App, headers: Record<string, string>, status = 'all') => {
  const response = await app.inject({ method: 'GET', url: `/staff/mixes?status=${status}&pageSize=100`, headers });
  assert.equal(response.statusCode, 200);
  return response.json() as StaffMixesResponse;
};

test.describe('аналоги в выдаче', () => {
  let app: App;

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
    await linkAnalogs(GONE, ANALOG);
    await setStock(GONE, false);
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('п.3: микс с заменой виден гостю, в составе — аналог, «Покурить» записывает пару', async () => {
    const mix = await catalogMix(app);
    assert.ok(mix, 'микс с заменой есть в каталоге');
    const gone = mix.components.find((item) => item.tobaccoId === GONE);
    assert.equal(gone?.substitute?.tobaccoId, ANALOG);
    assert.equal(gone?.substitute?.name, 'Apple Fizz');
    assert.equal(mix.components.find((item) => item.tobaccoId !== GONE)?.substitute, undefined);

    const recommendations = await app.inject({
      method: 'POST',
      url: '/guest/onboarding/recommendations',
      payload: { likedProfiles: ['citrus'], likedFlavors: [], limit: 12 },
    });
    const recommended = (recommendations.json() as { items: Array<{ id: string; components: Array<{ id: string; substitute?: { tobaccoId: string } }> }> }).items;
    assert.equal(recommended.find((item) => item.id === MIX)?.components.find((item) => item.id === GONE)?.substitute?.tobaccoId, ANALOG);

    const smoke = await app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId: MIX } });
    assert.equal(smoke.statusCode, 201);
    const event = await prisma.smokeCtaEvent.findFirstOrThrow({ where: { mixId: MIX } });
    assert.equal(event.substitutedFromId, GONE);
    assert.equal(event.substitutedToId, ANALOG);

    const rating = await app.inject({
      method: 'POST',
      url: `/guest/mixes/${MIX}/rating`,
      payload: { value: 5 },
      headers: { 'x-atelier-device': 'test-device-analogs0000' },
    });
    assert.equal(rating.statusCode, 200);
  });

  test('п.4: не хватает двух табаков — микса у гостя нет, даже с аналогами', async () => {
    await linkAnalogs('tobacco-mint-veil', 'tobacco-herbal-dawn');
    await setStock('tobacco-mint-veil', false);

    assert.equal(await catalogMix(app), undefined);
    const smoke = await app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId: MIX } });
    assert.equal(smoke.statusCode, 404);

    const headers = await staffHeaders(app);
    const blocked = (await staffMixes(app, headers, 'blocked')).items.find((item) => item.id === MIX);
    assert.equal(blocked?.status, 'blocked');
    assert.deepEqual(
      blocked?.missing.map((item) => item.tobaccoId),
      [GONE, 'tobacco-mint-veil'],
    );
    const dashboard = await app.inject({ method: 'GET', url: '/staff/dashboard/choices', headers });
    const { hiddenMixes } = (dashboard.json() as { signals: { hiddenMixes: Array<{ mixId: string }> } }).signals;
    assert.ok(hiddenMixes.some((item) => item.mixId === MIX));
  });

  test('п.5: в «Миксах» статус «с заменой» с парой, отдельно от «Виден гостю»', async () => {
    const headers = await staffHeaders(app);
    const all = await staffMixes(app, headers);
    const mix = all.items.find((item) => item.id === MIX);
    assert.equal(mix?.status, 'substituted');
    assert.equal(mix?.guestVisible, true);
    assert.deepEqual(mix?.substitution, {
      from: { tobaccoId: GONE, manufacturer: 'Ателье Reserve', name: 'Citrus Breeze' },
      to: { tobaccoId: ANALOG, manufacturer: 'North Wind', name: 'Apple Fizz' },
    });
    assert.equal(all.meta.substitutedCount, 1);

    assert.deepEqual(
      (await staffMixes(app, headers, 'substituted')).items.map((item) => item.id),
      [MIX],
    );
    assert.ok(!(await staffMixes(app, headers, 'guest-visible')).items.some((item) => item.id === MIX));
    assert.ok(!(await staffMixes(app, headers, 'blocked')).items.some((item) => item.id === MIX));

    const dashboard = await app.inject({ method: 'GET', url: '/staff/dashboard/choices', headers });
    const { hiddenMixes } = (dashboard.json() as { signals: { hiddenMixes: Array<{ mixId: string }> } }).signals;
    assert.ok(!hiddenMixes.some((item) => item.mixId === MIX));
  });

  test('п.6: табак вернулся на полку — исходный состав без замены', async () => {
    await setStock(GONE, true);
    const mix = await catalogMix(app);
    assert.ok(mix);
    assert.ok(mix.components.every((item) => item.substitute === undefined));

    const headers = await staffHeaders(app);
    assert.equal((await staffMixes(app, headers)).items.find((item) => item.id === MIX)?.status, 'visible');
  });

  test('кабинет: избранный микс с заменой доступен, в карточке — аналог', async () => {
    const guest = await prisma.guestAccount.create({ data: { telegramId: '4790', consentAt: new Date() } });
    const headers = { authorization: `Bearer ${createGuestToken(guest.id).token}` };
    const put = await app.inject({ method: 'PUT', url: `/guest/me/favorites/mixes/${MIX}`, headers });
    assert.ok(put.statusCode < 300);

    const response = await app.inject({ method: 'GET', url: '/guest/me/favorites', headers });
    const item = (response.json() as GuestFavoritesResponse).items.find((row) => row.ref.kind === 'catalog' && row.ref.mixId === MIX);
    assert.deepEqual(item?.status, { kind: 'available' });
    assert.equal(item?.card?.components.find((component) => component.tobaccoId === GONE)?.substitute?.tobaccoId, ANALOG);

    await setStock(ANALOG, false);
    const after = await app.inject({ method: 'GET', url: '/guest/me/favorites', headers });
    const blocked = (after.json() as GuestFavoritesResponse).items.find((row) => row.ref.kind === 'catalog' && row.ref.mixId === MIX);
    assert.deepEqual(blocked?.status, { kind: 'unavailable', missing: 'Ателье Reserve Citrus Breeze' });
  });
});
