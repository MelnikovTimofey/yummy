import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { resetAppState } from './state';

// Мелочи доступа (#415): длина пароля, случайная соль, /meta только персоналу, seed не на проде.

type App = ReturnType<typeof buildApp>;

const adminToken = async (app: App) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
  return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
};

const createAccount = (app: App, headers: Record<string, string>, login: string, password: string) =>
  app.inject({
    method: 'POST',
    url: '/staff/access/accounts',
    headers,
    payload: { login, name: 'Бармен', role: 'master', password },
  });

test.beforeEach(async () => {
  await resetAppState();
});

test('a staff password shorter than 10 characters is rejected on create and on change', async () => {
  const app = buildApp();
  try {
    const headers = await adminToken(app);
    const short = await createAccount(app, headers, 'bartender', 'short-pw');
    assert.equal(short.statusCode, 400);
    assert.match((short.json() as { error: string }).error, /не короче 10 символов/);

    const created = await createAccount(app, headers, 'bartender', 'long-enough-pw');
    assert.equal(created.statusCode, 201);
    const id = (created.json() as { item: { id: string } }).item.id;

    const change = await app.inject({ method: 'PATCH', url: `/staff/access/accounts/${id}`, headers, payload: { password: 'tiny' } });
    assert.equal(change.statusCode, 400);
    const rename = await app.inject({ method: 'PATCH', url: `/staff/access/accounts/${id}`, headers, payload: { name: 'Старший бармен' } });
    assert.equal(rename.statusCode, 200, 'an edit without a password is not affected');
  } finally {
    await app.close();
  }
});

test('passwords and manual daily codes get a random salt', async () => {
  const app = buildApp();
  try {
    const headers = await adminToken(app);
    await createAccount(app, headers, 'first', 'same-password-123');
    await createAccount(app, headers, 'second', 'same-password-123');
    const accounts = await prisma.staffAccount.findMany({ where: { login: { in: ['first', 'second'] } } });
    assert.equal(accounts.length, 2);
    assert.notEqual(accounts[0].passwordHash, accounts[1].passwordHash);
    for (const account of accounts) {
      assert.doesNotMatch(account.passwordSalt, /^seed:/);
    }

    const code = await app.inject({
      method: 'POST',
      url: '/staff/access/daily-codes',
      headers,
      payload: { codeValue: 'ATL-2027', codeLabel: 'Вечерний код' },
    });
    assert.equal(code.statusCode, 201);
    const stored = await prisma.dailyAccessCode.findFirstOrThrow({ where: { codeValue: 'ATL-2027' } });
    assert.doesNotMatch(stored.codeSalt, /^seed:/);
  } finally {
    await app.close();
  }
});

test('/meta is for staff only', async () => {
  const app = buildApp();
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/meta' })).statusCode, 401);
    assert.equal((await app.inject({ method: 'GET', url: '/meta', headers: await adminToken(app) })).statusCode, 200);
  } finally {
    await app.close();
  }
});

test('prisma seed refuses to run with NODE_ENV=production', () => {
  const backend = path.resolve(__dirname, '..');
  const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], {
    cwd: backend,
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://nobody:nothing@127.0.0.1:1/none' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /NODE_ENV=production/);
});
