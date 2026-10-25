import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { requiredSecret } from './config';
import { createLoginThrottle } from './login-throttle';
import { resetAppState } from './state';

test.beforeEach(async () => {
  await resetAppState();
});

const login = (app: ReturnType<typeof buildApp>, password: string, ip = '203.0.113.10', user = 'admin') =>
  app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    headers: { 'x-forwarded-for': ip },
    payload: { login: user, password },
  });

test('staff login is blocked for an IP after repeated failures, even with the right password', async () => {
  const app = buildApp();

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await login(app, 'wrong')).statusCode, 401);
    }

    const blocked = await login(app, 'admin');
    assert.equal(blocked.statusCode, 429);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
    assert.match((blocked.json() as { error: string }).error, /Слишком много попыток/);

    assert.equal((await login(app, 'admin', '203.0.113.20')).statusCode, 200);
  } finally {
    await app.close();
  }
});

test('the client IP is the last X-Forwarded-For hop, so a forged leading value does not reset the limit', async () => {
  const app = buildApp();

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login(app, 'wrong', `198.51.100.${attempt}, 203.0.113.10`);
    }

    assert.equal((await login(app, 'admin', '198.51.100.99, 203.0.113.10')).statusCode, 429);
  } finally {
    await app.close();
  }
});

test('a login is locked after failures from many IPs, other logins are not', async () => {
  const app = buildApp();

  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await login(app, 'wrong', `198.51.100.${attempt}`);
    }

    assert.equal((await login(app, 'admin', '203.0.113.30')).statusCode, 429);
    assert.equal((await login(app, 'atelier', '203.0.113.30', 'atelier')).statusCode, 200);
  } finally {
    await app.close();
  }
});

test('a successful login clears the login failure count', () => {
  const throttle = createLoginThrottle();
  const now = 1_000_000;

  for (let attempt = 0; attempt < 19; attempt += 1) {
    throttle.recordFailure(`198.51.100.${attempt}`, 'admin', now);
  }
  throttle.recordSuccess('admin');
  throttle.recordFailure('198.51.100.200', 'admin', now);

  assert.equal(throttle.retryAfterSeconds('203.0.113.1', 'admin', now), 0);
});

test('failures expire after the window', () => {
  const throttle = createLoginThrottle();
  const now = 1_000_000;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    throttle.recordFailure('203.0.113.10', 'admin', now);
  }

  assert.ok(throttle.retryAfterSeconds('203.0.113.10', 'admin', now) > 0);
  assert.equal(throttle.retryAfterSeconds('203.0.113.10', 'admin', now + 15 * 60 * 1000), 0);
});

test('automation key is still required and checked', async () => {
  const app = buildApp();

  try {
    const missing = await app.inject({ method: 'GET', url: '/automation/daily-code/current' });
    assert.equal(missing.statusCode, 401);

    const wrong = await app.inject({
      method: 'GET',
      url: '/automation/daily-code/current',
      headers: { 'x-atelier-automation-key': 'atelier-local-automation-key-x' },
    });
    assert.equal(wrong.statusCode, 401);

    const right = await app.inject({
      method: 'GET',
      url: '/automation/daily-code/current',
      headers: { 'x-atelier-automation-key': 'atelier-local-automation-key' },
    });
    assert.equal(right.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('secrets fall back to local defaults outside production only', () => {
  assert.equal(requiredSecret('ATELIER_TOKEN_SECRET', 'local', {}), 'local');
  assert.equal(requiredSecret('ATELIER_TOKEN_SECRET', 'local', { NODE_ENV: 'production', ATELIER_TOKEN_SECRET: ' s3cret ' }), 's3cret');
  assert.throws(
    () => requiredSecret('ATELIER_TOKEN_SECRET', 'local', { NODE_ENV: 'production', ATELIER_TOKEN_SECRET: ' ' }),
    /ATELIER_TOKEN_SECRET/,
  );
});
