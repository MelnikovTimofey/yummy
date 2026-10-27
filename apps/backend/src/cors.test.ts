import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { config, parseOrigins } from './config';

const preflight = (app: ReturnType<typeof buildApp>, origin: string) =>
  app.inject({
    method: 'OPTIONS',
    url: '/guest/events/smoke-cta',
    headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
  });

test.describe('CORS', () => {
  const initial = config.corsOrigins;

  test.afterEach(() => {
    config.corsOrigins = initial;
  });

  test('with a list of origins only those get CORS headers', async () => {
    config.corsOrigins = ['https://aroma.example', 'https://master.aroma.example'];
    const app = buildApp();
    try {
      for (const origin of config.corsOrigins) {
        assert.equal((await preflight(app, origin)).headers['access-control-allow-origin'], origin);
      }
      assert.equal((await preflight(app, 'https://evil.example')).headers['access-control-allow-origin'], undefined);

      const health = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://evil.example' } });
      assert.equal(health.statusCode, 200);
      assert.equal(health.headers['access-control-allow-origin'], undefined);
    } finally {
      await app.close();
    }
  });

  test('without a list (local runs) any origin is allowed', async () => {
    config.corsOrigins = null;
    const app = buildApp();
    try {
      assert.equal((await preflight(app, 'http://127.0.0.1:5174')).headers['access-control-allow-origin'], 'http://127.0.0.1:5174');
    } finally {
      await app.close();
    }
  });

  test('preflight allows every method the fronts send cross-origin', async () => {
    config.corsOrigins = ['https://aroma.example'];
    const app = buildApp();
    try {
      const response = await preflight(app, 'https://aroma.example');
      const allowed = String(response.headers['access-control-allow-methods']).split(/,\s*/);
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        assert.ok(allowed.includes(method), `${method} не разрешён: ${allowed}`);
      }
    } finally {
      await app.close();
    }
  });

  test('origins are parsed from a comma separated list', () => {
    assert.deepEqual(parseOrigins(' https://a.example, https://b.example/ ,'), ['https://a.example', 'https://b.example']);
    assert.equal(parseOrigins(''), null);
    assert.equal(parseOrigins(undefined), null);
  });
});
