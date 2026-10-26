import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { createGuestAccessToken, createGuestToken, GUEST_ACCESS_HEADER } from './auth';
import { prisma } from './db';
import { resetAppState } from './state';

test.beforeEach(async () => {
  await resetAppState();
});

const HOUR_MS = 60 * 60_000;

test('the daily code grants guest access for 6 hours from entry', async () => {
  const app = buildApp();
  try {
    const before = Date.now();
    const response = await app.inject({ method: 'POST', url: '/guest/access-code/verify', payload: { code: '1234' } });
    assert.equal(response.statusCode, 200);

    const body = response.json() as { accessToken: string; expiresAt: string };
    assert.ok(body.accessToken);
    const ttl = new Date(body.expiresAt).getTime() - before;
    assert.ok(ttl > 6 * HOUR_MS - 60_000 && ttl <= 6 * HOUR_MS + 1000, `ttl ${ttl}`);

    const catalog = await app.inject({
      method: 'GET',
      url: '/guest/catalog/mixes',
      headers: { [GUEST_ACCESS_HEADER]: body.accessToken },
    });
    assert.equal(catalog.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('guest endpoints without valid access answer 403 — not 401, which drops the cabinet', async () => {
  const app = buildApp();
  try {
    const guest = await prisma.guestAccount.create({ data: { telegramId: '4350001', consentAt: new Date() } });
    const cabinet = createGuestToken(guest.id).token;
    const staffLogin = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'atelier', password: 'atelier' } });
    const staffToken = (staffLogin.json() as { accessToken: string }).accessToken;
    const expired = createGuestAccessToken(-1).token;

    for (const access of [undefined, 'garbage', expired, cabinet, staffToken]) {
      const headers = access ? { [GUEST_ACCESS_HEADER]: access } : {};
      for (const [method, url] of [
        ['GET', '/guest/intro/cards'],
        ['GET', '/guest/catalog/mixes'],
        ['GET', '/guest/home/rails'],
        ['POST', '/guest/events/smoke-cta'],
        ['GET', '/guest/auth/telegram/config'],
      ] as const) {
        const response = await app.inject({ method, url, headers });
        assert.equal(response.statusCode, 403, `${method} ${url} with ${access ?? 'no access'}`);
      }
    }

    const me = await app.inject({ method: 'GET', url: '/guest/me', headers: { authorization: `Bearer ${cabinet}` } });
    assert.equal(me.statusCode, 403);

    const meWithAccess = await app.inject({
      method: 'GET',
      url: '/guest/me',
      headers: { authorization: `Bearer ${cabinet}`, [GUEST_ACCESS_HEADER]: createGuestAccessToken().token },
    });
    assert.equal(meWithAccess.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('the code entry, staff and health stay open without guest access', async () => {
  const app = buildApp();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: '/guest/access-code/verify', payload: { code: 'WRONG' } })).statusCode, 401);
    const login = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'atelier', password: 'atelier' } });
    assert.equal(login.statusCode, 200);
  } finally {
    await app.close();
  }
});

// Токен доступа идёт на каждом гостевом запросе: без кэша preflight браузер
// слал бы OPTIONS перед каждым GET каталога.
test('CORS preflight allows the access header and is cached by the browser', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/guest/catalog/mixes',
      headers: {
        origin: 'http://127.0.0.1:5174',
        'access-control-request-method': 'GET',
        'access-control-request-headers': GUEST_ACCESS_HEADER,
      },
    });
    assert.equal(response.statusCode, 204);
    assert.match(String(response.headers['access-control-allow-headers']), new RegExp(GUEST_ACCESS_HEADER));
    assert.equal(response.headers['access-control-max-age'], '7200');
  } finally {
    await app.close();
  }
});
