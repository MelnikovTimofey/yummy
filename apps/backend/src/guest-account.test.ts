import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { resetAppState } from './state';
import { createGuestToken } from './auth';

// Вход гостя через бота по ссылке (#239): сайт создаёт код, бот подтверждает
// Telegram id, сайт забирает токен по статусу.

const BOT = 'aroma_atelier_client_bot';
const TELEGRAM_ID = '362000001';

type App = ReturnType<typeof buildApp>;

const startLogin = async (app: App, payload: object = { consent: true, likedProfiles: ['berry'], likedFlavors: ['мята'] }) => {
  const response = await app.inject({ method: 'POST', url: '/guest/auth/telegram/start', payload });
  assert.equal(response.statusCode, 201);
  return response.json() as { code: string; botUrl: string; expiresAt: string };
};

const confirm = (app: App, code: string, telegramId = TELEGRAM_ID, key = config.automationKey) =>
  app.inject({
    method: 'POST',
    url: '/automation/guest-login/confirm',
    headers: { 'x-atelier-automation-key': key },
    payload: { code, telegramId },
  });

const status = (app: App, code: string) =>
  app.inject({ method: 'GET', url: `/guest/auth/telegram/status?code=${encodeURIComponent(code)}` });

const loginGuest = async (app: App, payload?: object) => {
  const { code } = await startLogin(app, payload);
  assert.equal((await confirm(app, code)).statusCode, 200);
  const body = (await status(app, code)).json() as { status: string; token: string; created: boolean; me: { id: string } };
  assert.equal(body.status, 'ok');
  return body;
};

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

test.describe('guest login through the bot', () => {
  test.beforeEach(async () => {
    await resetAppState();
    config.guestLoginBotUsername = BOT;
  });

  test.after(() => {
    config.guestLoginBotUsername = null;
  });

  test('config exposes the bot username, or null when login is not set up', async () => {
    const app = buildApp();
    try {
      assert.deepEqual((await app.inject({ method: 'GET', url: '/guest/auth/telegram/config' })).json(), { botUsername: BOT });
      config.guestLoginBotUsername = null;
      assert.deepEqual((await app.inject({ method: 'GET', url: '/guest/auth/telegram/config' })).json(), { botUsername: null });
    } finally {
      await app.close();
    }
  });

  test('start returns a one-time code and a deep link to the bot', async () => {
    const app = buildApp();
    try {
      const body = await startLogin(app);
      assert.match(body.code, /^[A-Za-z0-9_-]{32}$/);
      assert.equal(body.botUrl, `https://t.me/${BOT}?start=${body.code}`);
      const ttl = new Date(body.expiresAt).getTime() - Date.now();
      assert.ok(ttl > 9 * 60 * 1000 && ttl <= 10 * 60 * 1000, String(ttl));
      assert.notEqual((await startLogin(app)).code, body.code);
    } finally {
      await app.close();
    }
  });

  test('start answers 503 when the login bot is not configured', async () => {
    config.guestLoginBotUsername = null;
    const app = buildApp();
    try {
      const response = await app.inject({ method: 'POST', url: '/guest/auth/telegram/start', payload: { consent: true } });
      assert.equal(response.statusCode, 503);
    } finally {
      await app.close();
    }
  });

  test('status is pending until the bot confirms; then it gives the token once', async () => {
    const app = buildApp();
    try {
      const { code } = await startLogin(app);
      assert.deepEqual((await status(app, code)).json(), { status: 'pending' });

      assert.equal((await confirm(app, code)).statusCode, 200);
      const done = (await status(app, code)).json() as {
        status: string; token: string; created: boolean; me: { likedProfiles: string[]; likedFlavors: string[]; historyCount: number; favoritesCount: number };
      };
      assert.equal(done.status, 'ok');
      assert.equal(done.created, true);
      assert.ok(done.token);
      assert.deepEqual(done.me.likedProfiles, ['berry']);
      assert.deepEqual(done.me.likedFlavors, ['мята']);
      assert.equal(done.me.historyCount, 0);
      assert.equal(done.me.favoritesCount, 0);

      assert.deepEqual((await status(app, code)).json(), { status: 'expired' });
    } finally {
      await app.close();
    }
  });

  test('only Telegram id is stored for the guest', async () => {
    const app = buildApp();
    try {
      await loginGuest(app);
      const account = await prisma.guestAccount.findUniqueOrThrow({ where: { telegramId: TELEGRAM_ID } });
      assert.deepEqual(Object.keys(account).sort(), ['consentAt', 'createdAt', 'id', 'likedFlavors', 'likedProfiles', 'telegramId', 'updatedAt']);
    } finally {
      await app.close();
    }
  });

  test('a new guest without consent gets consent-required and the code stays usable', async () => {
    const app = buildApp();
    try {
      const { code } = await startLogin(app, { consent: false });
      await confirm(app, code);
      assert.deepEqual((await status(app, code)).json(), { status: 'consent-required' });
      assert.equal(await prisma.guestAccount.count(), 0);
    } finally {
      await app.close();
    }
  });

  test('a returning guest logs in without consent; empty tastes keep the saved ones', async () => {
    const app = buildApp();
    try {
      const first = await loginGuest(app);
      const again = await loginGuest(app, { consent: false, likedProfiles: [], likedFlavors: [] });

      assert.equal(again.created, false);
      assert.equal(again.me.id, first.me.id);
      assert.deepEqual((again.me as unknown as { likedProfiles: string[] }).likedProfiles, ['berry']);

      const overwritten = await loginGuest(app, { likedProfiles: ['citrus'] });
      assert.deepEqual((overwritten.me as unknown as { likedProfiles: string[] }).likedProfiles, ['citrus']);
    } finally {
      await app.close();
    }
  });

  test('confirm needs the automation key and a live code', async () => {
    const app = buildApp();
    try {
      const { code } = await startLogin(app);
      assert.equal((await confirm(app, code, TELEGRAM_ID, 'wrong')).statusCode, 401);
      assert.equal((await confirm(app, 'no-such-code-no-such-code-123456')).statusCode, 404);

      await prisma.guestLoginCode.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await confirm(app, code)).statusCode, 410);
      assert.deepEqual((await status(app, code)).json(), { status: 'expired' });
    } finally {
      await app.close();
    }
  });

  test('a confirmed code cannot be re-confirmed by another Telegram account', async () => {
    const app = buildApp();
    try {
      const { code } = await startLogin(app);
      assert.equal((await confirm(app, code)).statusCode, 200);
      assert.equal((await confirm(app, code)).statusCode, 200);
      assert.equal((await confirm(app, code, '999')).statusCode, 410);
    } finally {
      await app.close();
    }
  });

  test('status of an unknown code is 404', async () => {
    const app = buildApp();
    try {
      assert.equal((await status(app, 'unknown')).statusCode, 404);
    } finally {
      await app.close();
    }
  });
});

test.describe('guest session', () => {
  test.beforeEach(async () => {
    await resetAppState();
    config.guestLoginBotUsername = BOT;
  });

  test.after(() => {
    config.guestLoginBotUsername = null;
  });

  test('/guest/me needs a guest token; a staff token is not accepted, and vice versa', async () => {
    const app = buildApp();
    try {
      const guest = await loginGuest(app);
      assert.equal((await app.inject({ method: 'GET', url: '/guest/me' })).statusCode, 401);
      assert.equal((await app.inject({ method: 'GET', url: '/guest/me', headers: bearer(guest.token) })).statusCode, 200);

      const staff = (await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } })).json() as { accessToken: string };
      assert.equal((await app.inject({ method: 'GET', url: '/guest/me', headers: bearer(staff.accessToken) })).statusCode, 401);
      assert.equal((await app.inject({ method: 'GET', url: '/staff/auth/me', headers: bearer(guest.token) })).statusCode, 401);
    } finally {
      await app.close();
    }
  });

  test('an expired guest token is rejected', async () => {
    const app = buildApp();
    try {
      const guest = await loginGuest(app);
      const expired = createGuestToken(guest.me.id, -1).token;
      assert.equal((await app.inject({ method: 'GET', url: '/guest/me', headers: bearer(expired) })).statusCode, 401);
    } finally {
      await app.close();
    }
  });

  test('/guest/me counts history and favorites of the guest', async () => {
    const app = buildApp();
    try {
      const guest = await loginGuest(app);
      await prisma.smokeCtaEvent.create({ data: { mixId: 'mix-citrus-scout', guestId: guest.me.id, mixName: 'Снимок' } });
      await prisma.customMixSmokeEvent.create({ data: { guestId: guest.me.id, components: [], signature: 's', name: 'Своё', harmony: 60 } });
      await prisma.guestFavorite.create({ data: { guestId: guest.me.id, mixId: 'mix-citrus-scout', mixName: 'Снимок' } });

      const me = (await app.inject({ method: 'GET', url: '/guest/me', headers: bearer(guest.token) })).json() as { historyCount: number; favoritesCount: number };
      assert.equal(me.historyCount, 2);
      assert.equal(me.favoritesCount, 1);
    } finally {
      await app.close();
    }
  });

  test('PUT /guest/me/onboarding overwrites tastes and validates the body', async () => {
    const app = buildApp();
    try {
      const guest = await loginGuest(app);
      const ok = await app.inject({
        method: 'PUT', url: '/guest/me/onboarding', headers: bearer(guest.token),
        payload: { likedProfiles: ['citrus', 'fresh'], likedFlavors: [] },
      });
      assert.equal(ok.statusCode, 200);
      assert.deepEqual((ok.json() as { likedProfiles: string[] }).likedProfiles, ['citrus', 'fresh']);

      const bad = await app.inject({
        method: 'PUT', url: '/guest/me/onboarding', headers: bearer(guest.token),
        payload: { likedProfiles: 'citrus', likedFlavors: [] },
      });
      assert.equal(bad.statusCode, 400);
    } finally {
      await app.close();
    }
  });

  test('DELETE /guest/me removes the account and favorites, events stay without the guest', async () => {
    const app = buildApp();
    try {
      const guest = await loginGuest(app);
      const event = await prisma.smokeCtaEvent.create({ data: { mixId: 'mix-citrus-scout', guestId: guest.me.id, mixName: 'Снимок' } });
      await prisma.guestFavorite.create({ data: { guestId: guest.me.id, mixId: 'mix-citrus-scout', mixName: 'Снимок' } });

      assert.equal((await app.inject({ method: 'DELETE', url: '/guest/me', headers: bearer(guest.token) })).statusCode, 204);
      assert.equal((await app.inject({ method: 'GET', url: '/guest/me', headers: bearer(guest.token) })).statusCode, 401);
      assert.equal(await prisma.guestAccount.count(), 0);
      assert.equal(await prisma.guestFavorite.count(), 0);
      assert.equal((await prisma.smokeCtaEvent.findUniqueOrThrow({ where: { id: event.id } })).guestId, null);
    } finally {
      await app.close();
    }
  });
});
