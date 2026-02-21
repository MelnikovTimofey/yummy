import { API_BASE_URL } from './api';
import { AuthState, ApiUser, AuthTokens, Mix, MixRating, MixRatingSummary } from './types';

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: AuthTokens | null;
  onAuthUpdate?: (next: AuthState) => void;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth?.accessToken) {
    headers.Authorization = `Bearer ${options.auth.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && options.auth?.refreshToken && options.onAuthUpdate) {
    const refreshed = await refreshToken(options.auth.refreshToken);
    if (refreshed) {
      options.onAuthUpdate({ tokens: refreshed.tokens, user: refreshed.user });
      return request<T>(path, {
        ...options,
        auth: refreshed.tokens,
      });
    }

    options.onAuthUpdate({ tokens: null, user: null });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const sendMagicLink = (email: string) =>
  request<{ ok: true }>('/auth/magic-link', {
    method: 'POST',
    body: { email },
  });

export const verifyMagicLink = (token: string) =>
  request<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/verify', {
    method: 'POST',
    body: { token },
  });

export const refreshToken = (refreshTokenValue: string) =>
  request<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: refreshTokenValue },
  })
    .then((response) => ({
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      },
      user: response.user,
    }))
    .catch(() => null);

export const getMixes = (auth: AuthTokens, onAuthUpdate: RequestOptions['onAuthUpdate']) =>
  request<{ items: Mix[] }>('/mixes', {
    auth,
    onAuthUpdate,
  });

export const getMixRatings = (auth: AuthTokens, onAuthUpdate: RequestOptions['onAuthUpdate']) =>
  request<{ items: MixRating[] }>('/mix-ratings', {
    auth,
    onAuthUpdate,
  });

export const getMixRatingSummaries = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
) =>
  request<{ items: MixRatingSummary[] }>('/mix-ratings/summary', {
    auth,
    onAuthUpdate,
  });
