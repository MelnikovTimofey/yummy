import assert from 'node:assert/strict';
import test from 'node:test';
import { TelegramClient } from './telegram';

test('setMyCommands posts command list to Bot API', async () => {
  const originalFetch = global.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
  }) as typeof fetch;

  try {
    await new TelegramClient('bot-token', 'https://tg.example').setMyCommands([
      { command: 'code', description: 'показать код' },
    ]);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://tg.example/botbot-token/setMyCommands');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    commands: [{ command: 'code', description: 'показать код' }],
  });
});
