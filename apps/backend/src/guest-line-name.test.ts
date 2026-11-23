import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from './generated/prisma/client';
import { buildGuestApp as buildApp } from './test-app';
import { createGuestToken } from './auth';
import { prisma } from './db';
import { resetAppState } from './state';
import type { GuestCatalogMixesResponse, GuestHistoryResponse, GuestMixerPaletteResponse } from './types';

// Линейка в гостевом контракте (#626, Р5 #621): мастер по карточке гостя берёт
// «Sebero Black», а не «Sebero Classic». «Цитрусовый караван» — Citrus Breeze + Mint Veil.

const MIX = 'mix-citrus-scout';
const BREEZE = 'tobacco-citrus-breeze';
const VEIL = 'tobacco-mint-veil';
const ANALOG = 'tobacco-apple-fizz';
const BOWL = [
  { tobaccoId: BREEZE, proportion: 60 },
  { tobaccoId: VEIL, proportion: 40 },
];

type App = ReturnType<typeof buildApp>;

const setLine = (id: string, lineName: string) => prisma.tobacco.update({ where: { id }, data: { lineName } });

const catalogMix = async (app: App) => {
  const response = await app.inject({ method: 'GET', url: '/guest/catalog/mixes' });
  assert.equal(response.statusCode, 200);
  const mix = (response.json() as GuestCatalogMixesResponse).items.find((item) => item.id === MIX);
  assert.ok(mix);
  return mix;
};

test.describe('линейка в гостевом контракте', () => {
  let app: App;

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
    await setLine(BREEZE, 'Black');
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('компоненты микса в каталоге и в Подборе несут lineName, без линейки — пустая строка', async () => {
    const mix = await catalogMix(app);
    assert.equal(mix.components.find((item) => item.tobaccoId === BREEZE)?.lineName, 'Black');
    assert.equal(mix.components.find((item) => item.tobaccoId === VEIL)?.lineName, '');

    const response = await app.inject({
      method: 'POST',
      url: '/guest/onboarding/recommendations',
      payload: { likedProfiles: ['citrus'], likedFlavors: [], limit: 12 },
    });
    const items = (response.json() as { items: Array<{ id: string; components: Array<{ id: string; lineName?: string }> }> }).items;
    assert.equal(items.find((item) => item.id === MIX)?.components.find((item) => item.id === BREEZE)?.lineName, 'Black');
  });

  test('замена аналогом несёт линейку аналога', async () => {
    await setLine(ANALOG, 'Classic');
    await prisma.tobaccoAnalog.createMany({
      data: [
        { tobaccoId: BREEZE, analogId: ANALOG, sortOrder: 0 },
        { tobaccoId: ANALOG, analogId: BREEZE, sortOrder: 0 },
      ],
    });
    await prisma.tobacco.update({ where: { id: BREEZE }, data: { inStock: false } });

    const mix = await catalogMix(app);
    const gone = mix.components.find((item) => item.tobaccoId === BREEZE);
    assert.equal(gone?.substitute?.tobaccoId, ANALOG);
    assert.equal(gone?.substitute?.lineName, 'Classic');
  });

  test('палитра Миксера несёт lineName', async () => {
    const response = await app.inject({ method: 'GET', url: '/guest/mixer/palette' });
    const palette = (response.json() as GuestMixerPaletteResponse).tobaccos;
    assert.equal(palette.find((item) => item.id === BREEZE)?.lineName, 'Black');
    assert.equal(palette.find((item) => item.id === VEIL)?.lineName, '');
  });

  test('собранный микс: линейка в событии и в истории; у старого события без поля — пустая строка', async () => {
    const guest = await prisma.guestAccount.create({ data: { telegramId: '2001', consentAt: new Date() } });
    const headers = { authorization: `Bearer ${createGuestToken(guest.id).token}` };
    const smoke = await app.inject({ method: 'POST', url: '/guest/events/custom-mix-smoke', payload: { components: BOWL, name: 'Своё' }, headers });
    assert.equal(smoke.statusCode, 201);

    const event = await prisma.customMixSmokeEvent.findFirstOrThrow({ where: { guestId: guest.id } });
    assert.equal((event.components as Array<{ tobaccoId: string; lineName?: string }>).find((item) => item.tobaccoId === BREEZE)?.lineName, 'Black');

    const history = async () => {
      const response = await app.inject({ method: 'GET', url: '/guest/me/history', headers });
      assert.equal(response.statusCode, 200);
      const custom = (response.json() as GuestHistoryResponse).items.find((item) => item.ref.kind === 'custom');
      return custom?.card?.components.find((item) => item.tobaccoId === BREEZE);
    };
    assert.equal((await history())?.lineName, 'Black');

    const legacy = (event.components as Array<Record<string, unknown>>).map(({ lineName: _drop, ...rest }) => rest);
    await prisma.customMixSmokeEvent.update({ where: { id: event.id }, data: { components: legacy as Prisma.InputJsonValue } });
    assert.equal((await history())?.lineName, '');
  });
});
