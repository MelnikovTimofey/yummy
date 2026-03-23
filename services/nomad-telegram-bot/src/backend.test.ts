import assert from 'node:assert/strict';
import test from 'node:test';
import { NomadBackendClient } from './backend';
import { buildDailyCodeLabel, buildDailyCodeValue, buildMoscowWindow } from './time';

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
  backendAutomationToken: '',
  backendAdminLogin: 'admin',
  backendAdminPassword: 'admin',
  allowedChatIds: [],
  broadcastChatIds: [],
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  broadcastHour: 9,
  broadcastMinute: 0,
  codePrefix: 'NOMAD',
  codeLabelPrefix: 'Код на',
});

test('ensureDailyCode creates a new daily code via backend CRUD', async () => {
  const window = buildMoscowWindow(new Date());
  const codeValue = buildDailyCodeValue('NOMAD', window.dayKey);
  const codeLabel = buildDailyCodeLabel(window.dayKey);

  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        accessToken: 'staff-token',
        user: { login: 'admin', name: 'Admin', role: 'admin' },
      }),
      makeResponse({ items: [] }),
      makeResponse({
        item: {
          id: 'daily-code-1',
          codeValue,
          codeLabel,
          active: true,
          startsAt: window.startsAt.toISOString(),
          endsAt: window.endsAt.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    ],
    async () => new NomadBackendClient(buildConfig()).ensureDailyCode(),
  );

  assert.equal(result.state, 'created');
  assert.equal(result.item.id, 'daily-code-1');
  assert.equal(calls[0].url, 'https://backend.example/staff/auth/login');
  assert.equal(calls[1].url, 'https://backend.example/staff/access/daily-codes');
  assert.equal(calls[2].url, 'https://backend.example/staff/access/daily-codes');
  assert.match(String(calls[1].init?.headers && (calls[1].init.headers as Record<string, string>).authorization), /Bearer staff-token/);
});

test('rotateDailyCode deactivates existing code and creates a fresh one', async () => {
  const window = buildMoscowWindow(new Date());
  const nextCodeValue = buildDailyCodeValue('NOMAD', window.dayKey, 2);
  const nextCodeLabel = buildDailyCodeLabel(window.dayKey, 2);

  const { result, calls } = await withMockFetch(
    [
      makeResponse({
        accessToken: 'staff-token',
        user: { login: 'admin', name: 'Admin', role: 'admin' },
      }),
      makeResponse({
        items: [
          {
            id: 'daily-code-old',
            codeValue: buildDailyCodeValue('NOMAD', window.dayKey),
            codeLabel: buildDailyCodeLabel(window.dayKey),
            active: true,
            startsAt: window.startsAt.toISOString(),
            endsAt: window.endsAt.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      makeResponse({
        item: {
          id: 'daily-code-old',
          codeValue: buildDailyCodeValue('NOMAD', window.dayKey),
          codeLabel: buildDailyCodeLabel(window.dayKey),
          active: false,
          startsAt: window.startsAt.toISOString(),
          endsAt: window.endsAt.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      makeResponse({
        item: {
          id: 'daily-code-new',
          codeValue: nextCodeValue,
          codeLabel: nextCodeLabel,
          active: true,
          startsAt: window.startsAt.toISOString(),
          endsAt: window.endsAt.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    ],
    async () => new NomadBackendClient(buildConfig()).rotateDailyCode(),
  );

  assert.equal(result.state, 'rotated');
  assert.equal(result.item.id, 'daily-code-new');
  assert.equal(calls.length, 4);
  assert.equal(calls[2].url, 'https://backend.example/staff/access/daily-codes/daily-code-old');
  assert.equal(calls[3].url, 'https://backend.example/staff/access/daily-codes');
});

test('getCurrentDailyCode returns current active item when it exists', async () => {
  const window = buildMoscowWindow(new Date());

  const { result } = await withMockFetch(
    [
      makeResponse({
        accessToken: 'staff-token',
        user: { login: 'admin', name: 'Admin', role: 'admin' },
      }),
      makeResponse({
        items: [
          {
            id: 'daily-code-current',
            codeValue: buildDailyCodeValue('NOMAD', window.dayKey),
            codeLabel: buildDailyCodeLabel(window.dayKey),
            active: true,
            startsAt: window.startsAt.toISOString(),
            endsAt: window.endsAt.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    ],
    async () => new NomadBackendClient(buildConfig()).getCurrentDailyCode(),
  );

  assert.equal(result.item?.id, 'daily-code-current');
});
