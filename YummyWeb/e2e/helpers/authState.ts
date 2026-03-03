import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';

type AuthState = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    id: string;
    email: string;
  };
};

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001';
const MAILPIT_BASE_URL = process.env.E2E_MAILPIT_BASE_URL ?? 'http://localhost:8025';
const AUTH_STATE_CACHE_FILE =
  process.env.E2E_AUTH_STATE_FILE ??
  path.resolve(process.cwd(), '..', 'output', 'playwright', 'mobile-wave1', 'auth-state-cache.json');

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const extractMagicToken = (snippet: string) => {
  const match = snippet.match(/token=([^\s]+)/);
  return match?.[1] ?? null;
};

const readCachedAuthState = (): AuthState | null => {
  if (!fs.existsSync(AUTH_STATE_CACHE_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(AUTH_STATE_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed?.tokens?.accessToken || !parsed?.tokens?.refreshToken || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedAuthState = (state: AuthState) => {
  fs.mkdirSync(path.dirname(AUTH_STATE_CACHE_FILE), { recursive: true });
  fs.writeFileSync(AUTH_STATE_CACHE_FILE, JSON.stringify(state, null, 2));
};

const tryRefreshCachedState = async (
  request: APIRequestContext,
  state: AuthState,
): Promise<AuthState | null> => {
  const refreshResponse = await request.post(`${API_BASE_URL}/auth/refresh`, {
    data: {
      refreshToken: state.tokens.refreshToken,
    },
  });
  if (!refreshResponse.ok()) {
    return null;
  }

  const payload = (await refreshResponse.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: { id?: string; email?: string };
  };
  if (!payload.accessToken || !payload.refreshToken || !payload.user?.id || !payload.user?.email) {
    return null;
  }

  const refreshed: AuthState = {
    tokens: {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    },
    user: {
      id: payload.user.id,
      email: payload.user.email,
    },
  };
  writeCachedAuthState(refreshed);
  return refreshed;
};

const getValidCachedState = async (request: APIRequestContext): Promise<AuthState | null> => {
  const cached = readCachedAuthState();
  if (!cached) {
    return null;
  }

  const sessionsResponse = await request.get(`${API_BASE_URL}/sessions`, {
    headers: {
      Authorization: `Bearer ${cached.tokens.accessToken}`,
    },
  });
  if (sessionsResponse.ok()) {
    return cached;
  }

  if (sessionsResponse.status() === 401) {
    return tryRefreshCachedState(request, cached);
  }

  return null;
};

export const createAuthState = async (request: APIRequestContext): Promise<AuthState> => {
  const validCached = await getValidCachedState(request);
  if (validCached) {
    return validCached;
  }

  const email = `mobile.wave1.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

  let magicRequested = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const magicResponse = await request.post(`${API_BASE_URL}/auth/magic-link`, {
      data: { email },
    });

    if (magicResponse.ok()) {
      magicRequested = true;
      break;
    }

    if (magicResponse.status() === 429) {
      await sleep(600 + attempt * 150);
      continue;
    }

    throw new Error(`Failed to request magic link (${magicResponse.status()})`);
  }

  if (!magicRequested) {
    throw new Error('Failed to request magic link (rate limited)');
  }

  let token: string | null = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const mailpitResponse = await request.get(`${MAILPIT_BASE_URL}/api/v1/messages?limit=30`);
    if (!mailpitResponse.ok()) {
      throw new Error(`Failed to read Mailpit messages (${mailpitResponse.status()})`);
    }

    const payload = (await mailpitResponse.json()) as {
      messages?: Array<{ To?: Array<{ Address?: string }>; Snippet?: string }>;
    };
    const message = payload.messages?.find((item) =>
      item.To?.some((recipient) => recipient.Address === email),
    );

    if (message?.Snippet) {
      token = extractMagicToken(message.Snippet);
      if (token) {
        break;
      }
    }

    await sleep(400);
  }

  if (!token) {
    throw new Error('Magic link token not found in Mailpit');
  }

  const verifyResponse = await request.post(`${API_BASE_URL}/auth/verify`, {
    data: { token },
  });
  if (!verifyResponse.ok()) {
    throw new Error(`Failed to verify magic link (${verifyResponse.status()})`);
  }

  const verified = (await verifyResponse.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: { id?: string; email?: string };
  };

  if (!verified.accessToken || !verified.refreshToken || !verified.user?.id || !verified.user?.email) {
    throw new Error('Invalid auth payload after verify');
  }

  const state: AuthState = {
    tokens: {
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    },
    user: {
      id: verified.user.id,
      email: verified.user.email,
    },
  };
  writeCachedAuthState(state);
  return state;
};
