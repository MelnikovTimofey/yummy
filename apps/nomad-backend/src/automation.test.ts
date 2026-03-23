import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { config } from './config';
import { createNomadDailyCodeValue, getNomadDailyCodeWindow } from './daily-code';
import { resetNomadState } from './state';

const automationHeaders = {
  'x-nomad-automation-key': config.automationKey,
};

const login = async (app: ReturnType<typeof buildApp>, loginName: string, password: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    payload: {
      login: loginName,
      password,
    },
  });

  assert.equal(response.statusCode, 200);
  return (response.json() as { accessToken: string }).accessToken;
};

test.beforeEach(async () => {
  await resetNomadState();
});

test('daily code windows are aligned to the Moscow day boundary', () => {
  const referenceDate = new Date('2026-03-23T21:30:00.000Z');
  const window = getNomadDailyCodeWindow(referenceDate);

  assert.equal(window.startsAt.toISOString(), '2026-03-23T21:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-03-24T21:00:00.000Z');
  assert.equal(createNomadDailyCodeValue(referenceDate).startsWith('NOMAD-20260324-'), true);
});

test('automation endpoints require the automation key', async () => {
  const app = buildApp();

  try {
    const missing = await app.inject({
      method: 'GET',
      url: '/automation/daily-code/current',
    });

    assert.equal(missing.statusCode, 401);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/automation/daily-code/current',
      headers: {
        'x-nomad-automation-key': 'wrong-key',
      },
    });

    assert.equal(forbidden.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('automation can read, ensure and rotate the current daily code', async () => {
  const app = buildApp();

  try {
    const current = await app.inject({
      method: 'GET',
      url: '/automation/daily-code/current',
      headers: automationHeaders,
    });

    assert.equal(current.statusCode, 200);
    const currentBody = current.json() as {
      item: { id: string; codeValue: string; active: boolean };
      window: { startsAt: string; endsAt: string };
    };

    assert.equal(currentBody.item?.codeValue, 'NOMAD-2026');
    assert.equal(currentBody.item?.active, true);
    assert.ok(currentBody.window.startsAt.endsWith('Z'));
    assert.ok(currentBody.window.endsAt.endsWith('Z'));

    const ensured = await app.inject({
      method: 'POST',
      url: '/automation/daily-code/ensure',
      headers: automationHeaders,
    });

    assert.equal(ensured.statusCode, 200);
    const ensuredBody = ensured.json() as {
      item: { id: string; codeValue: string; active: boolean };
      state: 'existing' | 'created';
    };

    assert.equal(ensuredBody.state, 'existing');
    assert.equal(ensuredBody.item.codeValue, currentBody.item.codeValue);
    assert.equal(ensuredBody.item.active, true);

    const rotated = await app.inject({
      method: 'POST',
      url: '/automation/daily-code/rotate',
      headers: automationHeaders,
    });

    assert.equal(rotated.statusCode, 200);
    const rotatedBody = rotated.json() as {
      item: { id: string; codeValue: string; active: boolean };
      state: 'rotated';
    };

    assert.equal(rotatedBody.state, 'rotated');
    assert.equal(rotatedBody.item.active, true);
    assert.notEqual(rotatedBody.item.codeValue, currentBody.item.codeValue);

    const oldCode = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: {
        code: currentBody.item.codeValue,
      },
    });

    assert.equal(oldCode.statusCode, 401);

    const newCode = await app.inject({
      method: 'POST',
      url: '/guest/access-code/verify',
      payload: {
        code: rotatedBody.item.codeValue,
      },
    });

    assert.equal(newCode.statusCode, 200);

    const refreshed = await app.inject({
      method: 'POST',
      url: '/automation/daily-code/ensure',
      headers: automationHeaders,
    });

    assert.equal(refreshed.statusCode, 200);
    const refreshedBody = refreshed.json() as {
      item: { codeValue: string; active: boolean };
      state: 'existing' | 'created';
    };

    assert.equal(refreshedBody.state, 'existing');
    assert.equal(refreshedBody.item.codeValue, rotatedBody.item.codeValue);
    assert.equal(refreshedBody.item.active, true);
  } finally {
    await app.close();
  }
});

test('automation can read active telegram recipients grouped by scope', async () => {
  const app = buildApp();

  try {
    const adminToken = await login(app, 'admin', 'admin');

    await app.inject({
      method: 'POST',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        chatId: '362223626',
        label: 'Allowed chat',
        scope: 'allowed',
        active: true,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        chatId: '362223626',
        label: 'Broadcast chat',
        scope: 'broadcast',
        active: true,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/staff/access/telegram-recipients',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        chatId: '999999',
        label: 'Inactive rotate',
        scope: 'rotate',
        active: false,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/automation/telegram/recipients',
      headers: automationHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      items: Array<{ chatId: string; scope: string; active: boolean }>;
      allowedChatIds: number[];
      broadcastChatIds: number[];
      rotateChatIds: number[];
    };

    assert.equal(body.items.length, 2);
    assert.deepEqual(body.allowedChatIds, [362223626]);
    assert.deepEqual(body.broadcastChatIds, [362223626]);
    assert.deepEqual(body.rotateChatIds, []);
  } finally {
    await app.close();
  }
});
