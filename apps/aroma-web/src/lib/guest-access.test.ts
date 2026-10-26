import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuestAccess, GUEST_ACCESS_KEY, sendWithAccess } from './guest-access';
import type { StorageLike } from './guest-session';

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

const NOW = Date.parse('2026-10-26T20:00:00Z');
const HOUR = 60 * 60_000;

test('доступа нет, пока гость не ввёл код', () => {
  const access = createGuestAccess(memoryStorage(), () => NOW);
  assert.equal(access.status(), 'none');
  assert.equal(access.token(), null);
});

test('введённый код открывает доступ до expiresAt, потом он устаревает', () => {
  let now = NOW;
  const storage = memoryStorage();
  const access = createGuestAccess(storage, () => now);
  let changes = 0;
  access.subscribe(() => {
    changes += 1;
  });

  access.grant('t1', new Date(NOW + 6 * HOUR).toISOString());
  assert.equal(access.status(), 'active');
  assert.equal(access.token(), 't1');
  assert.equal(access.expiresAt(), NOW + 6 * HOUR);
  assert.equal(changes, 1);

  now = NOW + 6 * HOUR;
  assert.equal(access.status(), 'expired');
  assert.equal(access.token(), null);

  // Доступ переживает перезагрузку: новая копия читает тот же storage.
  now = NOW + HOUR;
  assert.equal(createGuestAccess(storage, () => now).status(), 'active');
});

test('мусор в storage — доступа нет', () => {
  for (const stored of ['{', '"t1"', JSON.stringify({ token: 't1' }), JSON.stringify({ token: 1, expiresAt: NOW + HOUR })]) {
    const access = createGuestAccess(memoryStorage({ [GUEST_ACCESS_KEY]: stored }), () => NOW);
    assert.equal(access.status(), 'none', stored);
  }
});

test('403 на запросе с токеном — доступ устарел, остальные ответы его не трогают', async () => {
  const access = createGuestAccess(memoryStorage(), () => NOW);
  access.grant('t1', new Date(NOW + HOUR).toISOString());

  const sent: (string | null)[] = [];
  const ok = await sendWithAccess(access, async (token) => {
    sent.push(token);
    return new Response(null, { status: 401 });
  });
  assert.equal(ok.status, 401);
  assert.equal(access.status(), 'active');

  const denied = await sendWithAccess(access, async (token) => {
    sent.push(token);
    return new Response(null, { status: 403 });
  });
  assert.equal(denied.status, 403);
  assert.equal(access.status(), 'expired');
  assert.deepEqual(sent, ['t1', 't1']);
});

test('403 на старый токен не отменяет код, введённый тем временем в другой вкладке', async () => {
  const storage = memoryStorage();
  const access = createGuestAccess(storage, () => NOW);
  access.grant('old', new Date(NOW + HOUR).toISOString());

  await sendWithAccess(access, async () => {
    access.grant('new', new Date(NOW + 6 * HOUR).toISOString());
    return new Response(null, { status: 403 });
  });
  assert.equal(access.status(), 'active');
  assert.equal(access.token(), 'new');
});
