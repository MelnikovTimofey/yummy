import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { createRateLimit } from './rate-limit';
import { resetAppState } from './state';

// Гостевая запись открыта без кода (код дня — ритуал на клиенте): сервер не даёт
// накручивать оценки и аналитику — одна оценка с устройства, лимиты по IP.

const MIX = 'mix-silk-road';
const HIDDEN_MIX = 'mix-peach-mirage';

type App = ReturnType<typeof buildApp>;

const rate = (app: App, mixId: string, value: number, device: string | null, ip = '203.0.113.10') =>
  app.inject({
    method: 'POST',
    url: `/guest/mixes/${mixId}/rating`,
    payload: { value },
    headers: { 'x-forwarded-for': ip, ...(device ? { 'x-atelier-device': device } : {}) },
  });

const smoke = (app: App, ip: string) =>
  app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId: MIX }, headers: { 'x-forwarded-for': ip } });

test.beforeEach(async () => {
  await resetAppState();
});

test('an anonymous device rates a mix once: a repeat replaces its rating', async () => {
  const app = buildApp();
  try {
    await rate(app, MIX, 1, 'device-aaaaaaaaaaaaaaaa');
    const repeat = (await rate(app, MIX, 5, 'device-aaaaaaaaaaaaaaaa')).json() as { rating: { avgRating: number; ratingsCount: number } };
    assert.deepEqual([repeat.rating.ratingsCount, repeat.rating.avgRating], [1, 5]);

    const other = (await rate(app, MIX, 3, 'device-bbbbbbbbbbbbbbbb')).json() as { rating: { avgRating: number; ratingsCount: number } };
    assert.deepEqual([other.rating.ratingsCount, other.rating.avgRating], [2, 4]);
  } finally {
    await app.close();
  }
});

test('an anonymous rating needs a well-formed device id', async () => {
  const app = buildApp();
  try {
    assert.equal((await rate(app, MIX, 5, null)).statusCode, 400);
    assert.equal((await rate(app, MIX, 5, 'short')).statusCode, 400);
    assert.equal((await rate(app, MIX, 5, 'bad device id with spaces!!')).statusCode, 400);
  } finally {
    await app.close();
  }
});

test('a mix that guests cannot pick cannot be rated', async () => {
  const app = buildApp();
  try {
    assert.equal((await rate(app, HIDDEN_MIX, 5, 'device-aaaaaaaaaaaaaaaa')).statusCode, 404);
  } finally {
    await app.close();
  }
});

test('guest writes from one IP are limited, other IPs are not affected', async () => {
  const app = buildApp();
  try {
    for (let index = 0; index < 60; index += 1) {
      assert.equal((await smoke(app, '203.0.113.10')).statusCode, 201);
    }
    const blocked = await smoke(app, '203.0.113.10');
    assert.equal(blocked.statusCode, 429);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
    assert.equal((await rate(app, MIX, 5, 'device-aaaaaaaaaaaaaaaa', '203.0.113.10')).statusCode, 429);

    assert.equal((await smoke(app, '203.0.113.20')).statusCode, 201);
  } finally {
    await app.close();
  }
});

test('wrong access codes from one IP are limited, right ones do not count', async () => {
  const app = buildApp();
  const verify = (code: string) =>
    app.inject({ method: 'POST', url: '/guest/access-code/verify', payload: { code }, headers: { 'x-forwarded-for': '203.0.113.10' } });
  try {
    for (let index = 0; index < 30; index += 1) {
      assert.equal((await verify('1234')).statusCode, 200);
    }
    for (let index = 0; index < 20; index += 1) {
      assert.equal((await verify('0000')).statusCode, 401);
    }
    assert.equal((await verify('1234')).statusCode, 429);
  } finally {
    await app.close();
  }
});

test('login starts through the bot from one IP are limited', async () => {
  const app = buildApp();
  try {
    let last = 0;
    for (let index = 0; index < 21; index += 1) {
      last = (await app.inject({
        method: 'POST',
        url: '/guest/auth/telegram/start',
        payload: { consent: true },
        headers: { 'x-forwarded-for': '203.0.113.10' },
      })).statusCode;
    }
    assert.equal(last, 429);
  } finally {
    await app.close();
  }
});

test('rate limit window slides', () => {
  const limit = createRateLimit(2, 60_000);
  limit.record('k', 0);
  limit.record('k', 10_000);
  assert.equal(limit.retryAfterSeconds('k', 20_000), 40);
  assert.equal(limit.retryAfterSeconds('k', 60_000), 0);
});

test('«Покурить» for a mix that guests cannot pick is 404', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'POST', url: '/guest/events/smoke-cta', payload: { mixId: HIDDEN_MIX } });
    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});
