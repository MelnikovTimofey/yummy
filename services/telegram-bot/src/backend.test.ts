import assert from 'node:assert/strict';
import test from 'node:test';
import type { BotConfig } from './config';
import { BackendClient } from './backend';

type FetchCall = {
  url: string;
  init?: RequestInit;
};

const makeResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const withMockFetch = async <T>(responses: Array<Response | ((call: FetchCall) => Response)>, run: () => Promise<T>) => {
  const originalFetch = global.fetch;
  const calls: FetchCall[] = [];
  let index = 0;

  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    const next = responses[index++];
    if (!next) {
      throw new Error(`Unexpected fetch call: ${call.url}`);
    }

    return typeof next === 'function' ? next(call) : next;
  }) as typeof fetch;

  try {
    const result = await run();
    return { result, calls };
  } finally {
    global.fetch = originalFetch;
  }
};

const buildConfig = (): BotConfig => ({
  mode: 'staff',
  telegramBotToken: 'bot-token',
  telegramApiBaseUrl: 'https://api.telegram.org',
  backendUrl: 'https://backend.example',
  backendAutomationToken: 'automation-token',
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  broadcastHour: 9,
  broadcastMinute: 0,
  guestLoginReturnUrl: '',
});

test('ensureDailyCode calls automation endpoint with automation header', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-1',
          codeValue: 'ATL-2026',
          codeLabel: 'Код на 23.03.2026',
          active: true,
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        state: 'created',
        window: {
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
        },
      }),
    ],
    async () => new BackendClient(buildConfig()).ensureDailyCode(),
  );

  assert.equal(result.state, 'created');
  assert.equal(result.item.id, 'daily-code-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/ensure');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
});

test('rotateDailyCode calls automation rotate endpoint', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-new',
          codeValue: 'ATL-2026-2',
          codeLabel: 'Код на 23.03.2026 #2',
          active: true,
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        state: 'rotated',
        window: {
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
        },
      }),
    ],
    async () => new BackendClient(buildConfig()).rotateDailyCode(),
  );

  assert.equal(result.state, 'rotated');
  assert.equal(result.item.id, 'daily-code-new');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/rotate');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
});

test('getCurrentDailyCode returns current active item when it exists', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-current',
          codeValue: 'ATL-2026',
          codeLabel: 'Код на 23.03.2026',
          active: true,
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        window: {
          startsAt: '2026-03-22T21:00:00.000Z',
          endsAt: '2026-03-23T20:59:59.999Z',
        },
      }),
    ],
    async () => new BackendClient(buildConfig()).getCurrentDailyCode(),
  );

  assert.equal(result.item?.id, 'daily-code-current');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/current');
  assert.equal(calls[0].init?.method, undefined);
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
});

test('telegram operator automation endpoints read linked operator and link contact', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'telegram-operator-anna',
          name: 'Анна',
          phone: '+79991234567',
          active: true,
          linkedChatId: '362223626',
          linkedTelegramUserId: '998877',
          linkedUsername: 'anna_test',
          linkedDisplayName: 'Анна Тестовый',
          linkedAt: new Date().toISOString(),
          lastCodeRequestedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      makeResponse({
        item: {
          id: 'telegram-operator-anna',
          name: 'Анна',
          phone: '+79991234567',
          active: true,
          linkedChatId: '362223626',
          linkedTelegramUserId: '998877',
          linkedUsername: 'anna_test',
          linkedDisplayName: 'Анна Тестовый',
          linkedAt: new Date().toISOString(),
          lastCodeRequestedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    ],
    async () => {
      const client = new BackendClient(buildConfig());
      const current = await client.getTelegramOperatorByChatId(362223626);
      const linked = await client.linkTelegramOperator({
        phone: '+79991234567',
        chatId: '362223626',
        telegramUserId: '998877',
        username: 'anna_test',
      });
      return { current, linked };
    },
  );

  assert.equal(result.current.item?.id, 'telegram-operator-anna');
  assert.equal(result.linked.item.phone, '+79991234567');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://backend.example/automation/telegram/operators/by-chat/362223626');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
  assert.equal(calls[1].url, 'https://backend.example/automation/telegram/operators/link');
  assert.equal(calls[1].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    phone: '+79991234567',
    chatId: '362223626',
    telegramUserId: '998877',
    username: 'anna_test',
  });
});

test('telegram automation state endpoints use automation header and payload', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'telegram-bot-status',
          health: 'healthy',
          lastHeartbeatAt: '2026-03-23T10:20:45.288Z',
          lastRotateAt: null,
          lastRotateCodeId: null,
          lastRotateCodeValue: null,
          lastBroadcastAt: null,
          lastBroadcastCodeId: null,
          lastBroadcastCodeValue: null,
          lastBroadcastDayKey: null,
          lastRequestAt: null,
          lastRequestChatId: null,
          lastRequestOperatorId: null,
          lastRequestOperatorName: null,
          lastRequestPhone: null,
          lastRequestCodeId: null,
          lastRequestCodeValue: null,
          lastErrorAt: null,
          lastErrorMessage: null,
          updatedAt: '2026-03-23T10:20:45.288Z',
        },
      }),
      makeResponse({
        item: {
          id: 'telegram-bot-status',
          health: 'healthy',
          lastHeartbeatAt: '2026-03-23T10:22:00.000Z',
          lastRotateAt: null,
          lastRotateCodeId: null,
          lastRotateCodeValue: null,
          lastBroadcastAt: null,
          lastBroadcastCodeId: null,
          lastBroadcastCodeValue: null,
          lastBroadcastDayKey: null,
          lastRequestAt: null,
          lastRequestChatId: null,
          lastRequestOperatorId: null,
          lastRequestOperatorName: null,
          lastRequestPhone: null,
          lastRequestCodeId: null,
          lastRequestCodeValue: null,
          lastErrorAt: null,
          lastErrorMessage: null,
          updatedAt: '2026-03-23T10:22:00.000Z',
        },
      }),
    ],
    async () => {
      const client = new BackendClient(buildConfig());
      const current = await client.getTelegramAutomationState();
      const reported = await client.reportTelegramAutomationState({
        event: 'heartbeat',
      });
      return { current, reported };
    },
  );

  assert.equal(result.current.item.health, 'healthy');
  assert.equal(result.reported.item.lastHeartbeatAt, '2026-03-23T10:22:00.000Z');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://backend.example/automation/telegram/state');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
  assert.equal(calls[1].url, 'https://backend.example/automation/telegram/state/report');
  assert.equal(calls[1].init?.method, 'POST');
  assert.equal((calls[1].init?.headers as Record<string, string>)['x-atelier-automation-key'], 'automation-token');
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    event: 'heartbeat',
  });
});

test('confirmGuestLogin posts code and telegram id with automation header and returns backend status', async () => {
  for (const status of [200, 404, 410, 500]) {
    const body = status === 200 ? { ok: true } : { error: 'nope' };
    const { result, calls } = await withMockFetch(
      [makeResponse(body, status)],
      async () => new BackendClient(buildConfig()).confirmGuestLogin({ code: 'login-code', telegramId: '4242' }),
    );

    assert.equal(result, status);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://backend.example/automation/guest-login/confirm');
    assert.equal(calls[0].init?.method, 'POST');
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers['x-atelier-automation-key'], 'automation-token');
    assert.equal(headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { code: 'login-code', telegramId: '4242' });
  }
});

test('confirmGuestLogin propagates network errors', async () => {
  await assert.rejects(
    withMockFetch(
      [() => {
        throw new TypeError('fetch failed');
      }],
      async () => new BackendClient(buildConfig()).confirmGuestLogin({ code: 'login-code', telegramId: '4242' }),
    ),
    /fetch failed/,
  );
});
