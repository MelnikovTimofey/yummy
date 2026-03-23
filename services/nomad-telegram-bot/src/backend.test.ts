import assert from 'node:assert/strict';
import test from 'node:test';
import { NomadBackendClient } from './backend';

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

const buildConfig = () => ({
  telegramBotToken: 'bot-token',
  telegramApiBaseUrl: 'https://api.telegram.org',
  backendUrl: 'https://backend.example',
  backendAutomationToken: 'automation-token',
  allowedChatIds: [],
  broadcastChatIds: [],
  rotateChatIds: [],
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  broadcastHour: 9,
  broadcastMinute: 0,
});

test('ensureDailyCode calls automation endpoint with automation header', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-1',
          codeValue: 'NOMAD-2026',
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
    async () => new NomadBackendClient(buildConfig()).ensureDailyCode(),
  );

  assert.equal(result.state, 'created');
  assert.equal(result.item.id, 'daily-code-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/ensure');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-nomad-automation-key'], 'automation-token');
});

test('rotateDailyCode calls automation rotate endpoint', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-new',
          codeValue: 'NOMAD-2026-2',
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
    async () => new NomadBackendClient(buildConfig()).rotateDailyCode(),
  );

  assert.equal(result.state, 'rotated');
  assert.equal(result.item.id, 'daily-code-new');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/rotate');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-nomad-automation-key'], 'automation-token');
});

test('getCurrentDailyCode returns current active item when it exists', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        item: {
          id: 'daily-code-current',
          codeValue: 'NOMAD-2026',
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
    async () => new NomadBackendClient(buildConfig()).getCurrentDailyCode(),
  );

  assert.equal(result.item?.id, 'daily-code-current');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/daily-code/current');
  assert.equal(calls[0].init?.method, undefined);
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-nomad-automation-key'], 'automation-token');
});

test('getTelegramRecipients reads grouped automation recipients', async () => {
  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        items: [
          {
            id: 'telegram-allowed-1',
            chatId: '362223626',
            label: 'Основной чат',
            scope: 'allowed',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        allowedChatIds: [362223626],
        broadcastChatIds: [362223626],
        rotateChatIds: [],
      }),
    ],
    async () => new NomadBackendClient(buildConfig()).getTelegramRecipients(),
  );

  assert.equal(result.items.length, 1);
  assert.deepEqual(result.allowedChatIds, [362223626]);
  assert.deepEqual(result.broadcastChatIds, [362223626]);
  assert.deepEqual(result.rotateChatIds, []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://backend.example/automation/telegram/recipients');
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-nomad-automation-key'], 'automation-token');
});
