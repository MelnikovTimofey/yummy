import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { buildApp } from './app';
import { config } from './config';
import { resetAppState } from './state';

// Токен мастера отзывается сменой пароля, деактивацией и пересозданием учётки (#407).

type App = ReturnType<typeof buildApp>;

const login = async (app: App, loginName: string, password: string) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: loginName, password } });
  assert.equal(response.statusCode, 200);
  return (response.json() as { accessToken: string }).accessToken;
};

const me = (app: App, token: string) =>
  app.inject({ method: 'GET', url: '/staff/auth/me', headers: { authorization: `Bearer ${token}` } });

const createMaster = async (app: App, adminToken: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/access/accounts',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { login: 'bartender', name: 'Бармен', role: 'master', password: 'first-secret' },
  });
  assert.equal(response.statusCode, 201);
  return (response.json() as { item: { id: string } }).item.id;
};

const patch = (app: App, adminToken: string, id: string, payload: object) =>
  app.inject({ method: 'PATCH', url: `/staff/access/accounts/${id}`, headers: { authorization: `Bearer ${adminToken}` }, payload });

test.beforeEach(async () => {
  await resetAppState();
});

test('a password change revokes the tokens issued before it', async () => {
  const app = buildApp();
  try {
    const adminToken = await login(app, 'admin', 'admin');
    const id = await createMaster(app, adminToken);
    const masterToken = await login(app, 'bartender', 'first-secret');

    assert.equal((await patch(app, adminToken, id, { name: 'Старший бармен' })).statusCode, 200);
    assert.equal((await me(app, masterToken)).statusCode, 200, 'a rename keeps the session');

    assert.equal((await patch(app, adminToken, id, { password: 'second-secret' })).statusCode, 200);
    assert.equal((await me(app, masterToken)).statusCode, 401);
    assert.equal((await me(app, await login(app, 'bartender', 'second-secret'))).statusCode, 200);
  } finally {
    await app.close();
  }
});

test('a deactivated account stays logged out after reactivation', async () => {
  const app = buildApp();
  try {
    const adminToken = await login(app, 'admin', 'admin');
    const id = await createMaster(app, adminToken);
    const masterToken = await login(app, 'bartender', 'first-secret');

    await patch(app, adminToken, id, { active: false });
    await patch(app, adminToken, id, { active: true });
    assert.equal((await me(app, masterToken)).statusCode, 401);
  } finally {
    await app.close();
  }
});

test('a token does not carry over to a new account with the same login and role', async () => {
  const app = buildApp();
  try {
    const adminToken = await login(app, 'admin', 'admin');
    const id = await createMaster(app, adminToken);
    const masterToken = await login(app, 'bartender', 'first-secret');

    await app.inject({ method: 'DELETE', url: `/staff/access/accounts/${id}`, headers: { authorization: `Bearer ${adminToken}` } });
    await createMaster(app, adminToken);
    assert.equal((await me(app, masterToken)).statusCode, 401);
  } finally {
    await app.close();
  }
});

test('a token of the old format without the account id is not accepted', async () => {
  const app = buildApp();
  try {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({ login: 'admin', name: 'Админ', role: 'admin', issuedAt: now, expiresAt: now + 3600 })).toString('base64url');
    const signature = crypto.createHmac('sha256', config.tokenSecret).update(payload).digest('base64url');
    assert.equal((await me(app, `${payload}.${signature}`)).statusCode, 401);
  } finally {
    await app.close();
  }
});
