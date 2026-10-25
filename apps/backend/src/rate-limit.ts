const PRUNE_ABOVE_KEYS = 10_000;

// Скользящее окно в памяти: backend — один процесс, после перезапуска окно начинается заново.
export const createRateLimit = (limit: number, windowMs: number) => {
  const hits = new Map<string, number[]>();

  const recent = (key: string, now: number) => {
    const fresh = (hits.get(key) ?? []).filter((at) => at > now - windowMs);
    if (fresh.length) {
      hits.set(key, fresh);
    } else {
      hits.delete(key);
    }
    return fresh;
  };

  return {
    retryAfterSeconds(key: string, now = Date.now()) {
      const fresh = recent(key, now);
      return fresh.length < limit ? 0 : Math.ceil((fresh[fresh.length - limit] + windowMs - now) / 1000);
    },

    record(key: string, now = Date.now()) {
      hits.set(key, [...recent(key, now), now]);
      if (hits.size > PRUNE_ABOVE_KEYS) {
        for (const stale of [...hits.keys()]) {
          recent(stale, now);
        }
      }
    },
  };
};
