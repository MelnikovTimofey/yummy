import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { createGuestToken } from './auth';
import { prisma } from './db';
import { getAvailableMixCatalog, resetAppState } from './state';
import type { GuestForYouResponse } from './types';

// GET /guest/me/for-you (#241, PRD §6.5): выдача «Для вас» по данным гостя.

type App = ReturnType<typeof buildApp>;

const createGuest = async (likedProfiles: string[] = ['citrus']) => {
  const guest = await prisma.guestAccount.create({ data: { telegramId: '1001', consentAt: new Date(), likedProfiles } });
  return { id: guest.id, headers: { authorization: `Bearer ${createGuestToken(guest.id).token}` } };
};

const smoke = (app: App, mixId: string, headers: Record<string, string>) =>
  app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId }, headers });

const forYou = async (app: App, headers: Record<string, string>) => {
  const response = await app.inject({ method: 'GET', url: '/guest/me/for-you', headers });
  assert.equal(response.statusCode, 200);
  return response.json() as GuestForYouResponse;
};

test.describe('GET /guest/me/for-you', () => {
  let app: App;

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('needs a guest token', async () => {
    assert.equal((await app.inject({ method: 'GET', url: '/guest/me/for-you' })).statusCode, 401);
  });

  test('fewer than three picks — cold mode with recommendations by saved tastes', async () => {
    const guest = await createGuest(['citrus']);
    const [first] = (await getAvailableMixCatalog()).filter((mix) => mix.guestVisible);
    await smoke(app, first.id, guest.headers);

    const result = await forYou(app, guest.headers);
    assert.equal(result.mode, 'cold');
    if (result.mode !== 'cold') return;
    assert.equal(result.picks, 1);
    assert.deepEqual(result.onboarding.likedProfiles, ['citrus']);
    assert.ok(result.items.length > 0);
  });

  test('cold mode without saved tastes answers an empty list instead of an error', async () => {
    const guest = await createGuest([]);
    const result = await forYou(app, guest.headers);
    assert.equal(result.mode, 'cold');
    if (result.mode !== 'cold') return;
    assert.deepEqual(result.items, []);
  });

  // Критерий 6 из #151: пять раз подряд один микс → не больше одного повтора,
  // хотя бы один «Шаг в сторону», есть подсказка.
  test('five picks of one mix: one repeat at most, a sidestep and the hint', async () => {
    const guest = await createGuest();
    const visible = (await getAvailableMixCatalog()).filter((mix) => mix.guestVisible);
    const favorite = visible[0];
    for (let index = 0; index < 5; index += 1) {
      await smoke(app, favorite.id, guest.headers);
    }

    const result = await forYou(app, guest.headers);
    assert.equal(result.mode, 'personal');
    if (result.mode !== 'personal') return;

    const cards = [...result.fresh, ...result.sidestep, ...result.again];
    assert.ok(cards.filter((card) => card.mix.id === favorite.id).length <= 1);
    assert.equal(result.sidestep.length, 1);
    assert.deepEqual(result.hint, { kind: 'same-mix', mixName: favorite.name, count: 5, outOf: 5 });
    assert.ok(cards.every((card) => card.mix.guestVisible), 'only mixes in stock');
    assert.ok(result.fresh.length > 0);
  });

  test('custom mixes from the mixer count as picks', async () => {
    const guest = await createGuest();
    for (let index = 0; index < 3; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/guest/events/custom-mix-smoke',
        headers: guest.headers,
        payload: { components: [{ tobaccoId: 'tobacco-citrus-breeze', proportion: 100 }] },
      });
      assert.equal(response.statusCode, 201);
    }

    const result = await forYou(app, guest.headers);
    assert.equal(result.mode, 'personal');
  });
});
