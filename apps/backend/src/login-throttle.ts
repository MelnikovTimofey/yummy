const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IP = 10;
// Порог по логину выше, чем по IP: иначе любой может запереть админа, перебирая с одного адреса.
const MAX_FAILURES_PER_LOGIN = 20;
const PRUNE_ABOVE_KEYS = 10_000;

export type LoginThrottle = ReturnType<typeof createLoginThrottle>;

// Счётчики в памяти: backend — один процесс, после перезапуска окно просто начинается заново.
export const createLoginThrottle = () => {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number) => {
    const fresh = (failures.get(key) ?? []).filter((at) => at > now - WINDOW_MS);
    if (fresh.length) {
      failures.set(key, fresh);
    } else {
      failures.delete(key);
    }
    return fresh;
  };

  const waitSeconds = (key: string, limit: number, now: number) => {
    const fresh = recent(key, now);
    if (fresh.length < limit) {
      return 0;
    }
    return Math.ceil((fresh[fresh.length - limit] + WINDOW_MS - now) / 1000);
  };

  return {
    retryAfterSeconds(ip: string, login: string, now = Date.now()) {
      return Math.max(waitSeconds(`ip:${ip}`, MAX_FAILURES_PER_IP, now), waitSeconds(`login:${login}`, MAX_FAILURES_PER_LOGIN, now));
    },

    recordFailure(ip: string, login: string, now = Date.now()) {
      for (const key of [`ip:${ip}`, `login:${login}`]) {
        failures.set(key, [...recent(key, now), now]);
      }
      if (failures.size > PRUNE_ABOVE_KEYS) {
        for (const key of [...failures.keys()]) {
          recent(key, now);
        }
      }
    },

    recordSuccess(login: string) {
      failures.delete(`login:${login}`);
    },
  };
};
