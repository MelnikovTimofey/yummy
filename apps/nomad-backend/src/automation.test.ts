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

test('automation can link operator chat by phone and resolve it later', async () => {
  const app = buildApp();

  try {
    const linked = await app.inject({
      method: 'POST',
      url: '/automation/telegram/operators/link',
      headers: automationHeaders,
      payload: {
        phone: '+7 (999) 123-45-67',
        chatId: '362223626',
        telegramUserId: '998877',
        username: 'anna_nomad',
        firstName: 'Анна',
        lastName: 'Nomad',
      },
    });

    assert.equal(linked.statusCode, 200);
    const linkedBody = linked.json() as {
      item: {
        id: string;
        name: string;
        phone: string;
        linkedChatId: string | null;
        linkedTelegramUserId: string | null;
      };
    };

    assert.equal(linkedBody.item.id, 'telegram-operator-anna');
    assert.equal(linkedBody.item.phone, '+79991234567');
    assert.equal(linkedBody.item.linkedChatId, '362223626');
    assert.equal(linkedBody.item.linkedTelegramUserId, '998877');

    const resolved = await app.inject({
      method: 'GET',
      url: '/automation/telegram/operators/by-chat/362223626',
      headers: automationHeaders,
    });

    assert.equal(resolved.statusCode, 200);
    const resolvedBody = resolved.json() as {
      item: {
        id: string;
        linkedChatId: string | null;
      } | null;
    };

    assert.equal(resolvedBody.item?.id, 'telegram-operator-anna');
    assert.equal(resolvedBody.item?.linkedChatId, '362223626');
  } finally {
    await app.close();
  }
});

test('automation can report and read telegram bot state', async () => {
  const app = buildApp();

  try {
    const initial = await app.inject({
      method: 'GET',
      url: '/automation/telegram/state',
      headers: automationHeaders,
    });

    assert.equal(initial.statusCode, 200);
    const initialBody = initial.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastHeartbeatAt: string | null;
        lastBroadcastAt: string | null;
        lastErrorAt: string | null;
      };
    };

    assert.equal(initialBody.item.health, 'unknown');
    assert.equal(initialBody.item.lastHeartbeatAt, null);
    assert.equal(initialBody.item.lastBroadcastAt, null);
    assert.equal(initialBody.item.lastErrorAt, null);

    const heartbeat = await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: automationHeaders,
      payload: {
        event: 'heartbeat',
      },
    });

    assert.equal(heartbeat.statusCode, 200);
    const heartbeatBody = heartbeat.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastHeartbeatAt: string | null;
      };
    };

    assert.equal(heartbeatBody.item.health, 'healthy');
    assert.ok(heartbeatBody.item.lastHeartbeatAt);

    const broadcast = await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: automationHeaders,
      payload: {
        event: 'broadcast',
        codeId: 'daily-code-default',
        codeValue: 'NOMAD-2026',
        dayKey: '2026-03-23',
      },
    });

    assert.equal(broadcast.statusCode, 200);
    const broadcastBody = broadcast.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastBroadcastAt: string | null;
        lastBroadcastCodeId: string | null;
        lastBroadcastCodeValue: string | null;
        lastBroadcastDayKey: string | null;
      };
    };

    assert.equal(broadcastBody.item.health, 'healthy');
    assert.ok(broadcastBody.item.lastBroadcastAt);
    assert.equal(broadcastBody.item.lastBroadcastCodeId, 'daily-code-default');
    assert.equal(broadcastBody.item.lastBroadcastCodeValue, 'NOMAD-2026');
    assert.equal(broadcastBody.item.lastBroadcastDayKey, '2026-03-23');

    const error = await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: automationHeaders,
      payload: {
        event: 'error',
        message: 'Telegram request timeout',
      },
    });

    assert.equal(error.statusCode, 200);
    const errorBody = error.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastErrorAt: string | null;
        lastErrorMessage: string | null;
      };
    };

    assert.equal(errorBody.item.health, 'error');
    assert.ok(errorBody.item.lastErrorAt);
    assert.equal(errorBody.item.lastErrorMessage, 'Telegram request timeout');

    const rotate = await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: automationHeaders,
      payload: {
        event: 'rotate',
        codeId: 'daily-code-rotated',
        codeValue: 'NOMAD-20260323-FA2481',
      },
    });

    assert.equal(rotate.statusCode, 200);
    const rotateBody = rotate.json() as {
      item: {
        health: 'unknown' | 'healthy' | 'stale' | 'error';
        lastRotateAt: string | null;
        lastRotateCodeId: string | null;
        lastRotateCodeValue: string | null;
      };
    };

    assert.equal(rotateBody.item.health, 'healthy');
    assert.ok(rotateBody.item.lastRotateAt);
    assert.equal(rotateBody.item.lastRotateCodeId, 'daily-code-rotated');
    assert.equal(rotateBody.item.lastRotateCodeValue, 'NOMAD-20260323-FA2481');

    await app.inject({
      method: 'POST',
      url: '/automation/telegram/operators/link',
      headers: automationHeaders,
      payload: {
        phone: '+79991234567',
        chatId: '362223626',
      },
    });

    const request = await app.inject({
      method: 'POST',
      url: '/automation/telegram/state/report',
      headers: automationHeaders,
      payload: {
        event: 'request',
        chatId: '362223626',
        codeId: 'daily-code-default',
        codeValue: 'NOMAD-2026',
      },
    });

    assert.equal(request.statusCode, 200);
    const requestBody = request.json() as {
      item: {
        lastRequestAt: string | null;
        lastRequestChatId: string | null;
        lastRequestOperatorId: string | null;
        lastRequestOperatorName: string | null;
        lastRequestPhone: string | null;
        lastRequestCodeId: string | null;
        lastRequestCodeValue: string | null;
      };
    };

    assert.ok(requestBody.item.lastRequestAt);
    assert.equal(requestBody.item.lastRequestChatId, '362223626');
    assert.equal(requestBody.item.lastRequestOperatorId, 'telegram-operator-anna');
    assert.equal(requestBody.item.lastRequestOperatorName, 'Анна');
    assert.equal(requestBody.item.lastRequestPhone, '+79991234567');
    assert.equal(requestBody.item.lastRequestCodeId, 'daily-code-default');
    assert.equal(requestBody.item.lastRequestCodeValue, 'NOMAD-2026');
  } finally {
    await app.close();
  }
});
