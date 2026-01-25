import { API_BASE_URL } from './config';
import {
  AuthTokens,
  ApiUser,
  Manufacturer,
  Mix,
  MixRating,
  MixRatingSummary,
  PreferenceProfile,
  RecommendationItem,
  SessionRating,
  SmokingSession,
  Tobacco,
} from './types';

export type AuthState = {
  tokens: AuthTokens | null;
  user: ApiUser | null;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: AuthTokens | null;
  onAuthUpdate?: (next: AuthState) => void;
};

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth?.accessToken) {
    headers.Authorization = `Bearer ${options.auth.accessToken}`;
  }

  const response = await fetch(url, {
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
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const sendMagicLink = (email: string) =>
  request<{ ok: true }>('/auth/magic-link', {
    method: 'POST',
    body: { email },
  });

export const verifyMagicLink = (token: string) =>
  request<{ accessToken: string; refreshToken: string; user: ApiUser }>(
    '/auth/verify',
    {
      method: 'POST',
      body: { token },
    },
  );

export const refreshToken = (refreshTokenValue: string) =>
  request<{ accessToken: string; refreshToken: string; user: ApiUser }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: { refreshToken: refreshTokenValue },
    },
  )
    .then((response) => ({
      tokens: { accessToken: response.accessToken, refreshToken: response.refreshToken },
      user: response.user,
    }))
    .catch(() => null);

export const getManufacturers = (search?: string) => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<{ items: Manufacturer[] }>(`/manufacturers${query}`);
};

export const getTobaccos = (params: {
  search?: string;
  manufacturerId?: string;
  profile?: string;
}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return request<{ items: Tobacco[] }>(`/tobaccos${query ? `?${query}` : ''}`);
};

export const getMixes = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  params?: { authorId?: string },
) => {
  const query = params?.authorId ? `?authorId=${encodeURIComponent(params.authorId)}` : '';
  return request<{ items: Mix[] }>(`/mixes${query}`, { auth, onAuthUpdate });
};

export const createMix = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { name: string; components: Array<{ tobaccoId: string; proportion: number }> },
) => request('/mixes', { method: 'POST', body: payload, auth, onAuthUpdate });

export const getSessions = (auth: AuthTokens, onAuthUpdate: RequestOptions['onAuthUpdate']) =>
  request<{ items: SmokingSession[] }>('/sessions', { auth, onAuthUpdate });

export const createSession = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { mixId: string; date: string; locationType: 'home' | 'lounge'; locationName?: string },
) => request<SmokingSession>('/sessions', { method: 'POST', body: payload, auth, onAuthUpdate });

export const getSessionRatings = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  sessionId?: string,
) => {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  return request<{ items: SessionRating[] }>(`/session-ratings${query}`, { auth, onAuthUpdate });
};

export const getMixRatings = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  mixId?: string,
) => {
  const query = mixId ? `?mixId=${encodeURIComponent(mixId)}` : '';
  return request<{ items: MixRating[] }>(`/mix-ratings${query}`, { auth, onAuthUpdate });
};

export const getMixRatingSummaries = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  mixId?: string,
) => {
  const query = mixId ? `?mixId=${encodeURIComponent(mixId)}` : '';
  return request<{ items: MixRatingSummary[] }>(`/mix-ratings/summary${query}`, {
    auth,
    onAuthUpdate,
  });
};

export const createSessionRating = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { sessionId: string; rating: number },
) => request('/session-ratings', { method: 'POST', body: payload, auth, onAuthUpdate });

export const createMixRating = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { mixId: string; rating: number },
) => request('/mix-ratings', { method: 'POST', body: payload, auth, onAuthUpdate });

export const getRecommendations = (auth: AuthTokens, onAuthUpdate: RequestOptions['onAuthUpdate']) =>
  request<{ items: RecommendationItem[] }>('/recommendations', {
    auth,
    onAuthUpdate,
  });

export const getPreferenceProfile = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
) => request<{ profile: PreferenceProfile | null }>('/preference-profile', { auth, onAuthUpdate });

export const upsertPreferenceProfile = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: {
    likedProfiles: string[];
    dislikedProfiles: string[];
    favoriteManufacturerIds: string[];
  },
) =>
  request<{ profile: PreferenceProfile }>('/preference-profile', {
    method: 'PUT',
    body: payload,
    auth,
    onAuthUpdate,
  });
