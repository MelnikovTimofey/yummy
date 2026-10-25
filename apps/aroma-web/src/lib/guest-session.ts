// Кабинет гостя (#243): токен, ожидание входа через бота и опрос статуса.
// Без DOM — хранилище и таймеры приходят снаружи, чтобы логику можно было
// проверить в node:test. Контракт — apps/backend/src/types.ts, «Кабинет гостя».

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type GuestTaste = {
  likedProfiles: string[];
  likedFlavors: string[];
};

export type GuestMe = GuestTaste & {
  id: string;
  consentAt: string;
  historyCount: number;
  favoritesCount: number;
};

export type GuestLoginStart = {
  code: string;
  botUrl: string;
  expiresAt: string;
  pollSecret: string;
};

export type GuestLoginStatus =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'consent-required' }
  | { status: 'ok'; token: string; expiresAt: string; created: boolean; me: GuestMe };

export const GUEST_TOKEN_KEY = 'aroma-guest-token';
export const GUEST_LOGIN_KEY = 'aroma-guest-login';
export const GUEST_DEVICE_KEY = 'aroma-device-id';

// Анонимная оценка — одна с устройства: backend заменяет повторную по этому id.
export const guestDeviceId = (storage: StorageLike) => {
  const stored = storage.getItem(GUEST_DEVICE_KEY);
  if (stored && /^[A-Za-z0-9_-]{16,64}$/.test(stored)) {
    return stored;
  }
  const created = crypto.randomUUID();
  storage.setItem(GUEST_DEVICE_KEY, created);
  return created;
};

export const createGuestSession = (storage: StorageLike) => {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const token = () => storage.getItem(GUEST_TOKEN_KEY);

  return {
    token,
    signIn: (value: string) => {
      storage.setItem(GUEST_TOKEN_KEY, value);
      notify();
    },
    // `staleToken` — токен, на который пришёл 401: если за это время другая
    // вкладка уже вошла заново, новый токен не трогаем.
    signOut: (staleToken?: string) => {
      const current = token();
      if (current === null || (staleToken !== undefined && current !== staleToken)) return;
      storage.removeItem(GUEST_TOKEN_KEY);
      notify();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify,
  };
};

export type GuestSession = ReturnType<typeof createGuestSession>;

// Невалидный токен — 401 (backend не пишет молча анонимно). Токен стирается;
// гостевое событие повторяется один раз без него, запрос кабинета — нет.
export const sendWithGuestToken = async (
  session: GuestSession,
  send: (token: string | null) => Promise<Response>,
  { anonymousRetry }: { anonymousRetry: boolean },
) => {
  const token = session.token();
  const response = await send(token);
  if (response.status !== 401 || token === null) return response;

  session.signOut(token);
  return anonymousRetry ? send(null) : response;
};

// ── Ожидание входа ──

export type LoginOrigin = 'cabinet' | 'intro';

export type PendingLogin = GuestLoginStart & {
  origin: LoginOrigin;
  consent: boolean;
};

// Гость может вернуться из Telegram в новую вкладку (кнопка бота) или после
// перезагрузки — ожидание лежит в localStorage, пока код жив.
export const savePendingLogin = (storage: StorageLike, login: PendingLogin) =>
  storage.setItem(GUEST_LOGIN_KEY, JSON.stringify(login));

export const clearPendingLogin = (storage: StorageLike) => storage.removeItem(GUEST_LOGIN_KEY);

export const readPendingLogin = (storage: StorageLike, now: Date): PendingLogin | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(GUEST_LOGIN_KEY) ?? 'null');
  } catch {
    return null;
  }
  const record = (parsed ?? {}) as Partial<Record<keyof PendingLogin, unknown>>;
  if (
    typeof record.code !== 'string' ||
    typeof record.botUrl !== 'string' ||
    typeof record.expiresAt !== 'string' ||
    typeof record.pollSecret !== 'string' ||
    (record.origin !== 'cabinet' && record.origin !== 'intro')
  ) {
    return null;
  }
  if (!(new Date(record.expiresAt) > now)) {
    clearPendingLogin(storage);
    return null;
  }
  return {
    code: record.code,
    botUrl: record.botUrl,
    expiresAt: record.expiresAt,
    pollSecret: record.pollSecret,
    origin: record.origin,
    consent: record.consent === true,
  };
};

// Со знакомства вернувшийся гость идёт сразу на подбор по сохранённым вкусам.
export const loginReturnView = (origin: LoginOrigin, taste: GuestTaste) => {
  if (origin === 'cabinet') return 'cabinet';
  return taste.likedProfiles.length || taste.likedFlavors.length ? 'recommendations' : 'onboarding';
};

// `undefined` — конфиг ещё не пришёл, `null` — бот входа не настроен: кнопки нет.
export const canOfferLogin = (botUsername: string | null | undefined) => Boolean(botUsername);

// ── Опрос статуса ──

type Timers = {
  set: (fn: () => unknown, ms: number) => unknown;
  clear: (id: unknown) => void;
};

const browserTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

// Опрос раз в `intervalMs`. В скрытой вкладке не крутится — `wake()` на
// возврате в браузер сразу спрашивает статус. Единичный сбой сети (например,
// первый запрос после возврата из Telegram на iPhone) опрос не обрывает.
export const createLoginPoller = ({
  check,
  onSettled,
  onError,
  isHidden,
  intervalMs = 2000,
  maxFailures = 3,
  timers = browserTimers,
}: {
  check: () => Promise<GuestLoginStatus>;
  onSettled: (status: Exclude<GuestLoginStatus, { status: 'pending' }>) => void;
  onError: () => void;
  isHidden: () => boolean;
  intervalMs?: number;
  maxFailures?: number;
  timers?: Timers;
}) => {
  let running = false;
  let inFlight = false;
  let timer: unknown = null;
  let failures = 0;

  const cancelTimer = () => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };
  const schedule = () => {
    timer = timers.set(tick, intervalMs);
  };

  async function tick() {
    timer = null;
    if (!running || inFlight || isHidden()) return;

    inFlight = true;
    let status: GuestLoginStatus | null = null;
    try {
      status = await check();
    } catch {
      status = null;
    }
    inFlight = false;
    if (!running) return;

    if (status === null) {
      failures += 1;
      if (failures >= maxFailures) {
        running = false;
        onError();
      } else {
        schedule();
      }
      return;
    }

    failures = 0;
    if (status.status === 'pending') {
      schedule();
      return;
    }
    running = false;
    onSettled(status);
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      failures = 0;
      schedule();
    },
    stop: () => {
      running = false;
      cancelTimer();
    },
    wake: async () => {
      if (!running || inFlight) return;
      cancelTimer();
      await tick();
    },
  };
};
