import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGuestApp as buildApp } from './test-app';
import { prisma } from './db';
import { resetAppState } from './state';

test.beforeEach(async () => {
  await resetAppState();
});

test('guest access code is verified from persisted daily code storage', async () => {
  const app = buildApp();

  try {
    const success = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: {
        code: '1234',
      },
    });

    assert.equal(success.statusCode, 200);
    const successBody = success.json() as { accessGranted: boolean; nextStep: string };
    assert.equal(successBody.accessGranted, true);
    assert.equal(successBody.nextStep, 'intro');

    const failure = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: {
        code: 'WRONG-CODE',
      },
    });

    assert.equal(failure.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('staff login is resolved from persisted staff accounts', async () => {
  const app = buildApp();

  try {
    const login = await app.inject({
      method: 'POST',
      url: '/staff/auth/login',
      payload: {
        login: 'atelier',
        password: 'atelier',
      },
    });

    assert.equal(login.statusCode, 200);
    const loginBody = login.json() as {
      accessToken: string;
      user: { login: string; role: string; name: string };
    };

    assert.equal(loginBody.user.login, 'atelier');
    assert.equal(loginBody.user.role, 'master');
    assert.equal(loginBody.user.name, 'Ателье Staff');

    const me = await app.inject({
      method: 'GET',
      url: '/staff/auth/me',
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    assert.equal(me.statusCode, 200);
    const meBody = me.json() as { user: { login: string; role: string } };
    assert.equal(meBody.user.login, 'atelier');
    assert.equal(meBody.user.role, 'master');

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/staff/auth/login',
      payload: {
        login: 'atelier',
        password: 'wrong',
      },
    });

    assert.equal(wrongPassword.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('production backend on an empty base seeds no demo staff, daily code or operators', async () => {
  await prisma.$transaction([
    prisma.introCard.deleteMany(),
    prisma.dailyAccessCode.deleteMany(),
    prisma.telegramOperator.deleteMany(),
    prisma.auditEvent.deleteMany(),
    prisma.staffAccount.deleteMany(),
  ]);

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = buildApp();

  try {
    for (const [login, password] of [['admin', 'admin'], ['atelier', 'atelier']]) {
      const response = await app.inject({
        method: 'POST',
        url: '/staff/auth/login',
        payload: { login, password },
      });
      assert.equal(response.statusCode, 401);
    }

    const code = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: { code: '1234' },
    });
    assert.equal(code.statusCode, 401);

    assert.equal(await prisma.staffAccount.count(), 0);
    assert.equal(await prisma.dailyAccessCode.count(), 0);
    assert.equal(await prisma.telegramOperator.count(), 0);
    assert.ok(await prisma.introCard.count() > 0);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    await app.close();
  }
});
