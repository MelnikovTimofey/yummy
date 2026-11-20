// Доступ гостя по коду дня (#435): токен от backend на 6 часов, идёт заголовком
// на каждом гостевом запросе. Без DOM — storage и часы приходят снаружи.
import type { StorageLike } from './guest-session';

export const GUEST_ACCESS_KEY = 'aroma-access';
export const GUEST_ACCESS_HEADER = 'x-atelier-access';

// `expired` — код был, но устарел: экран кода объясняет, почему просит снова.
export type GuestAccessStatus = 'none' | 'active' | 'expired';

type Stored = { token: string; expiresAt: number };

const read = (storage: StorageLike): Stored | null => {
  try {
    const parsed = JSON.parse(storage.getItem(GUEST_ACCESS_KEY) ?? 'null') as Partial<Stored> | null;
    return typeof parsed?.token === 'string' && typeof parsed.expiresAt === 'number'
      ? { token: parsed.token, expiresAt: parsed.expiresAt }
      : null;
  } catch {
    return null;
  }
};

export const createGuestAccess = (storage: StorageLike, now: () => number = Date.now) => {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const status = (): GuestAccessStatus => {
    const stored = read(storage);
    if (!stored) return 'none';
    return stored.expiresAt > now() ? 'active' : 'expired';
  };

  return {
    status,
    token: () => (status() === 'active' ? read(storage)!.token : null),
    expiresAt: () => read(storage)?.expiresAt ?? null,
    grant: (token: string, expiresAt: string) => {
      storage.setItem(GUEST_ACCESS_KEY, JSON.stringify({ token, expiresAt: Date.parse(expiresAt) }));
      notify();
    },
    // Backend не принял токен раньше срока (часы гостя врут) — доступ устарел.
    // `staleToken`: если другая вкладка уже ввела новый код, его не трогаем.
    expire: (staleToken: string) => {
      const stored = read(storage);
      if (stored?.token !== staleToken) return;
      storage.setItem(GUEST_ACCESS_KEY, JSON.stringify({ token: stored.token, expiresAt: 0 }));
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

export type GuestAccess = ReturnType<typeof createGuestAccess>;

// 403 — backend не принял доступ: гость снова видит экран кода. 401 — про
// токен кабинета, его разбирает sendWithGuestToken.
export const sendWithAccess = async (access: GuestAccess, send: (token: string | null) => Promise<Response>) => {
  const token = access.token();
  const response = await send(token);
  if (response.status === 403 && token !== null) access.expire(token);
  return response;
};
