import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGuestSession,
  createLoginPoller,
  GUEST_LOGIN_KEY,
  GUEST_TOKEN_KEY,
  canOfferLogin,
  clearPendingLogin,
  loginReturnView,
  readPendingLogin,
  savePendingLogin,
  sendWithGuestToken,
  type GuestLoginStatus,
  type StorageLike,
} from './guest-session';

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

const response = (status: number) => new Response(null, { status });

test('сессия хранит токен в storage и сообщает подписчикам о входе и выходе', () => {
  const storage = memoryStorage();
  const session = createGuestSession(storage);
  let changes = 0;
  session.subscribe(() => {
    changes += 1;
  });

  assert.equal(session.token(), null);
  session.signIn('t1');
  assert.equal(storage.data.get(GUEST_TOKEN_KEY), 't1');
  assert.equal(session.token(), 't1');

  session.signOut();
  assert.equal(session.token(), null);
  assert.equal(changes, 2);

  session.signOut();
  assert.equal(changes, 2, 'повторный выход без токена — не событие');
});

test('выход по старому токену не стирает новый, полученный в другой вкладке', () => {
  const storage = memoryStorage({ [GUEST_TOKEN_KEY]: 'new' });
  const session = createGuestSession(storage);

  session.signOut('old');

  assert.equal(session.token(), 'new');
});

test('запрос с необязательным токеном на 401 стирает токен и повторяется один раз анонимно', async () => {
  const session = createGuestSession(memoryStorage({ [GUEST_TOKEN_KEY]: 'stale' }));
  const sent: Array<string | null> = [];

  const result = await sendWithGuestToken(session, async (token) => {
    sent.push(token);
    return response(token ? 401 : 201);
  }, { anonymousRetry: true });

  assert.deepEqual(sent, ['stale', null]);
  assert.equal(result.status, 201);
  assert.equal(session.token(), null);
});

test('запрос кабинета на 401 стирает токен и не повторяется', async () => {
  const session = createGuestSession(memoryStorage({ [GUEST_TOKEN_KEY]: 'stale' }));
  const sent: Array<string | null> = [];

  const result = await sendWithGuestToken(session, async (token) => {
    sent.push(token);
    return response(401);
  }, { anonymousRetry: false });

  assert.deepEqual(sent, ['stale']);
  assert.equal(result.status, 401);
  assert.equal(session.token(), null);
});

test('без токена запрос уходит анонимно, а 401 токен не трогает', async () => {
  const storage = memoryStorage();
  const session = createGuestSession(storage);
  const sent: Array<string | null> = [];

  const result = await sendWithGuestToken(session, async (token) => {
    sent.push(token);
    return response(200);
  }, { anonymousRetry: true });

  assert.deepEqual(sent, [null]);
  assert.equal(result.status, 200);
});

test('ожидание входа переживает перезагрузку, пока код не истёк', () => {
  const storage = memoryStorage();
  const login = {
    code: 'c1',
    botUrl: 'https://t.me/bot?start=c1',
    expiresAt: '2026-10-20T12:10:00.000Z',
    pollSecret: 's1',
    origin: 'cabinet' as const,
    consent: true,
  };

  savePendingLogin(storage, login);
  assert.deepEqual(readPendingLogin(storage, new Date('2026-10-20T12:05:00.000Z')), login);

  assert.equal(readPendingLogin(storage, new Date('2026-10-20T12:10:00.000Z')), null);
  assert.equal(storage.data.has(GUEST_LOGIN_KEY), false, 'истёкшее ожидание стирается');
});

test('битое или чужое ожидание входа не читается', () => {
  assert.equal(readPendingLogin(memoryStorage({ [GUEST_LOGIN_KEY]: '{' }), new Date()), null);
  assert.equal(readPendingLogin(memoryStorage({ [GUEST_LOGIN_KEY]: '{"code":1}' }), new Date()), null);

  const storage = memoryStorage();
  savePendingLogin(storage, { code: 'c', botUrl: 'u', expiresAt: '2099-01-01T00:00:00Z', pollSecret: 's', origin: 'intro', consent: false });
  clearPendingLogin(storage);
  assert.equal(readPendingLogin(storage, new Date()), null);
});

test('ожидание без секрета опроса (сохранённое до его появления) не читается: без секрета статус не отдают', () => {
  const legacy = { code: 'c', botUrl: 'u', expiresAt: '2099-01-01T00:00:00Z', origin: 'intro', consent: true };
  assert.equal(readPendingLogin(memoryStorage({ [GUEST_LOGIN_KEY]: JSON.stringify(legacy) }), new Date()), null);
});

test('после входа гость возвращается в кабинет, а со знакомства — сразу на подбор', () => {
  assert.equal(loginReturnView('cabinet', { likedProfiles: [], likedFlavors: [] }), 'cabinet');
  assert.equal(loginReturnView('intro', { likedProfiles: ['berry'], likedFlavors: [] }), 'recommendations');
  assert.equal(loginReturnView('intro', { likedProfiles: [], likedFlavors: ['мята'] }), 'recommendations');
  // Сохранённых вкусов нет — подбирать не по чему, остаётся онбординг.
  assert.equal(loginReturnView('intro', { likedProfiles: [], likedFlavors: [] }), 'onboarding');
});

test('вход предлагается только с настроенным ботом', () => {
  assert.equal(canOfferLogin('aroma_atelier_client_bot'), true);
  assert.equal(canOfferLogin(null), false);
  assert.equal(canOfferLogin(undefined), false, 'пока конфиг не пришёл');
});

// ── Опрос статуса ──

const fakeTimers = () => {
  const queue = new Map<number, () => unknown>();
  let next = 1;
  return {
    pending: () => queue.size,
    set: (fn: () => unknown) => {
      const id = next++;
      queue.set(id, fn);
      return id;
    },
    clear: (id: unknown) => void queue.delete(id as number),
    // Выполнить все отложенные вызовы и дождаться их промисов.
    async run() {
      const due = [...queue.entries()];
      queue.clear();
      await Promise.all(due.map(([, fn]) => fn()));
    },
  };
};

const setup = (replies: Array<GuestLoginStatus | Error>, hidden = { value: false }) => {
  const timers = fakeTimers();
  const calls: string[] = [];
  const settled: GuestLoginStatus[] = [];
  let errors = 0;
  const poller = createLoginPoller({
    check: async () => {
      calls.push('check');
      const reply = replies.shift() ?? { status: 'pending' };
      if (reply instanceof Error) throw reply;
      return reply;
    },
    onSettled: (status) => settled.push(status),
    onError: () => {
      errors += 1;
    },
    isHidden: () => hidden.value,
    timers,
  });
  return { poller, timers, calls, settled, errors: () => errors };
};

test('опрос идёт раз в интервал, пока статус pending, и останавливается на итоге', async () => {
  const ok: GuestLoginStatus = {
    status: 'ok',
    token: 't',
    expiresAt: '',
    created: true,
    me: { id: 'g', consentAt: '', historyCount: 0, favoritesCount: 0, likedProfiles: [], likedFlavors: [] },
  };
  const { poller, timers, calls, settled } = setup([{ status: 'pending' }, ok]);

  poller.start();
  assert.equal(calls.length, 0, 'первый запрос — через интервал');
  await timers.run();
  assert.equal(calls.length, 1);
  await timers.run();
  assert.equal(calls.length, 2);
  assert.deepEqual(settled, [ok]);
  assert.equal(timers.pending(), 0);
});

test('в скрытой вкладке опрос на паузе и сразу повторяется при возврате', async () => {
  const hidden = { value: true };
  const { poller, timers, calls, settled } = setup([{ status: 'expired' }], hidden);

  poller.start();
  await timers.run();
  assert.equal(calls.length, 0);
  assert.equal(timers.pending(), 0, 'скрытая вкладка не крутит таймер');

  hidden.value = false;
  await poller.wake();
  assert.equal(calls.length, 1);
  assert.deepEqual(settled, [{ status: 'expired' }]);
});

test('возврат во вкладку не дублирует запрос, который ещё летит', async () => {
  let release: (status: GuestLoginStatus) => void = () => {};
  const timers = fakeTimers();
  let calls = 0;
  const poller = createLoginPoller({
    check: () => {
      calls += 1;
      return new Promise<GuestLoginStatus>((resolve) => {
        release = resolve;
      });
    },
    onSettled: () => {},
    onError: () => {},
    isHidden: () => false,
    timers,
  });

  poller.start();
  const tick = timers.run();
  await poller.wake();
  assert.equal(calls, 1);
  release({ status: 'pending' });
  await tick;
  assert.equal(timers.pending(), 1);
});

test('остановленный опрос не сообщает итог запроса, который успел уйти', async () => {
  let release: (status: GuestLoginStatus) => void = () => {};
  const timers = fakeTimers();
  const settled: GuestLoginStatus[] = [];
  const poller = createLoginPoller({
    check: () => new Promise<GuestLoginStatus>((resolve) => {
      release = resolve;
    }),
    onSettled: (status) => settled.push(status),
    onError: () => {},
    isHidden: () => false,
    timers,
  });

  poller.start();
  const tick = timers.run();
  poller.stop();
  release({ status: 'expired' });
  await tick;

  assert.deepEqual(settled, []);
  assert.equal(timers.pending(), 0);
});

test('единичный сбой сети не обрывает опрос, три подряд — ошибка', async () => {
  const fail = new Error('offline');
  const { poller, timers, calls, errors } = setup([fail, { status: 'pending' }, fail, fail, fail]);

  poller.start();
  for (let i = 0; i < 5; i += 1) await timers.run();

  assert.equal(calls.length, 5);
  assert.equal(errors(), 1);
  assert.equal(timers.pending(), 0);
});
