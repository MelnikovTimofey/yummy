import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { resetNomadState } from './state';

test.beforeEach(async () => {
  await resetNomadState();
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
        login: 'nomad',
        password: 'nomad',
      },
    });

    assert.equal(login.statusCode, 200);
    const loginBody = login.json() as {
      accessToken: string;
      user: { login: string; role: string; name: string };
    };

    assert.equal(loginBody.user.login, 'nomad');
    assert.equal(loginBody.user.role, 'nomad');
    assert.equal(loginBody.user.name, 'Nomad Staff');

    const me = await app.inject({
      method: 'GET',
      url: '/staff/auth/me',
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    assert.equal(me.statusCode, 200);
    const meBody = me.json() as { user: { login: string; role: string } };
    assert.equal(meBody.user.login, 'nomad');
    assert.equal(meBody.user.role, 'nomad');

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/staff/auth/login',
      payload: {
        login: 'nomad',
        password: 'wrong',
      },
    });

    assert.equal(wrongPassword.statusCode, 401);
  } finally {
    await app.close();
  }
});
