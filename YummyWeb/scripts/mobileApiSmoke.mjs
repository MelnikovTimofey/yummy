import fs from 'node:fs';
import path from 'node:path';

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001';
const mailpitBaseUrl = process.env.E2E_MAILPIT_BASE_URL ?? 'http://localhost:8025';
const authStateCacheFile =
  process.env.E2E_AUTH_STATE_FILE ??
  path.resolve(process.cwd(), '..', 'output', 'playwright', 'mobile-wave1', 'auth-state-cache.json');

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseJsonSafely = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadCachedAuthState = () => {
  if (!fs.existsSync(authStateCacheFile)) {
    return null;
  }
  const raw = fs.readFileSync(authStateCacheFile, 'utf8');
  const parsed = parseJsonSafely(raw);
  if (!parsed?.tokens?.accessToken || !parsed?.tokens?.refreshToken || !parsed?.user?.id) {
    return null;
  }
  return parsed;
};

const storeCachedAuthState = (state) => {
  fs.mkdirSync(path.dirname(authStateCacheFile), { recursive: true });
  fs.writeFileSync(authStateCacheFile, JSON.stringify(state, null, 2));
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = parseJsonSafely(text);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${url}: ${text}`);
  }

  return payload;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getMagicToken = async (email) => {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const messagesPayload = await requestJson(`${mailpitBaseUrl}/api/v1/messages?limit=40`);
    const message = messagesPayload?.messages?.find((item) =>
      item.To?.some((recipient) => recipient.Address === email),
    );

    if (message?.Snippet) {
      const tokenMatch = message.Snippet.match(/token=([^\s]+)/);
      if (tokenMatch?.[1]) {
        return tokenMatch[1];
      }
    }

    await sleep(400);
  }

  throw new Error('Magic token not found in Mailpit');
};

const createAuthSession = async () => {
  const email = `mobile.api.smoke.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

  await requestJson(`${apiBaseUrl}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const token = await getMagicToken(email);
  const verified = await requestJson(`${apiBaseUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  assertOk(Boolean(verified?.accessToken), 'accessToken is missing');
  assertOk(Boolean(verified?.refreshToken), 'refreshToken is missing');
  assertOk(Boolean(verified?.user?.id), 'user.id is missing');

  return {
    accessToken: verified.accessToken,
    refreshToken: verified.refreshToken,
    user: verified.user,
  };
};

const getValidAuthSession = async () => {
  const cached = loadCachedAuthState();
  if (cached) {
    const sessionsResponse = await fetch(`${apiBaseUrl}/sessions`, {
      headers: {
        Authorization: `Bearer ${cached.tokens.accessToken}`,
      },
    });
    if (sessionsResponse.ok) {
      return {
        accessToken: cached.tokens.accessToken,
        refreshToken: cached.tokens.refreshToken,
        user: cached.user,
      };
    }

    if (sessionsResponse.status === 401) {
      const refreshPayload = await requestJson(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cached.tokens.refreshToken }),
      });
      if (refreshPayload?.accessToken && refreshPayload?.refreshToken && refreshPayload?.user?.id) {
        const refreshedState = {
          tokens: {
            accessToken: refreshPayload.accessToken,
            refreshToken: refreshPayload.refreshToken,
          },
          user: refreshPayload.user,
        };
        storeCachedAuthState(refreshedState);
        return {
          accessToken: refreshedState.tokens.accessToken,
          refreshToken: refreshedState.tokens.refreshToken,
          user: refreshedState.user,
        };
      }
    }
  }

  const created = await createAuthSession();
  storeCachedAuthState({
    tokens: {
      accessToken: created.accessToken,
      refreshToken: created.refreshToken,
    },
    user: created.user,
  });
  return created;
};

const authHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

const main = async () => {
  console.log('[mobile-api-smoke] start');

  const health = await requestJson(`${apiBaseUrl}/health`);
  assertOk(health?.status === 'ok', 'health check failed');

  const rails = await requestJson(`${apiBaseUrl}/home/rails`);
  assertOk(Array.isArray(rails?.items), '/home/rails.items is not an array');
  assertOk(rails.items.length > 0, '/home/rails.items is empty');

  const mixes = await requestJson(`${apiBaseUrl}/mixes?limit=5`);
  assertOk(Array.isArray(mixes?.items), '/mixes.items is not an array');
  assertOk(mixes.items.length > 0, '/mixes.items is empty');

  const auth = await getValidAuthSession();

  const favorites = await requestJson(`${apiBaseUrl}/favorites`, {
    headers: authHeaders(auth.accessToken),
  });
  assertOk(Array.isArray(favorites?.items), '/favorites.items is not an array');

  const sessions = await requestJson(`${apiBaseUrl}/sessions`, {
    headers: authHeaders(auth.accessToken),
  });
  assertOk(Array.isArray(sessions?.items), '/sessions.items is not an array');

  const summaries = await requestJson(`${apiBaseUrl}/mix-ratings/summary`, {
    headers: authHeaders(auth.accessToken),
  });
  assertOk(Array.isArray(summaries?.items), '/mix-ratings/summary.items is not an array');

  const sessionCreated = await requestJson(`${apiBaseUrl}/sessions`, {
    method: 'POST',
    headers: authHeaders(auth.accessToken),
    body: JSON.stringify({
      mixId: mixes.items[0].id,
      date: new Date().toISOString(),
      locationType: 'home',
    }),
  });
  assertOk(Boolean(sessionCreated?.id), 'session create response has no id');

  const deleteResponse = await fetch(`${apiBaseUrl}/sessions/${sessionCreated.id}`, {
    method: 'DELETE',
    headers: authHeaders(auth.accessToken),
  });
  const deleteBodyRaw = await deleteResponse.text();
  const deleteBody = parseJsonSafely(deleteBodyRaw);

  assertOk(deleteResponse.status === 200, `DELETE /sessions/:id expected 200, got ${deleteResponse.status}`);
  assertOk(deleteBody?.ok === true, 'DELETE /sessions/:id expected { ok: true }');

  console.log('[mobile-api-smoke] success');
  console.log(
    JSON.stringify(
      {
        rails: rails.items.length,
        mixes: mixes.items.length,
        favorites: favorites.items.length,
        sessionsBeforeCreate: sessions.items.length,
        summaries: summaries.items.length,
        userId: auth.user.id,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error('[mobile-api-smoke] failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
