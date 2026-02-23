import { API_BASE_URL } from './api';
import {
  AuthState,
  ApiUser,
  AuthTokens,
  FavoriteMix,
  FlavorProfile,
  HomeRail,
  Manufacturer,
  Mix,
  MixRating,
  MixRatingSummary,
  PreferenceProfile,
  RecommendationItem,
  SmokingSession,
  Tobacco,
} from './types';

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

export const getHomeRails = (
  auth?: AuthTokens | null,
  onAuthUpdate?: RequestOptions['onAuthUpdate'],
) =>
  request<{ items: HomeRail[] }>('/home/rails', {
    auth: auth ?? undefined,
    onAuthUpdate,
  });

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

export const getMixes = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  params?: {
    authorId?: string;
    isUserMix?: boolean;
    search?: string;
    manufacturerId?: string;
    manufacturerIds?: string[];
    tobaccoId?: string;
    tobaccoIds?: string[];
    profile?: FlavorProfile;
    profiles?: FlavorProfile[];
    tag?: string;
    tags?: string[];
    minRating?: number;
    sort?: 'newest' | 'rating' | 'popularity';
    limit?: number;
    offset?: number;
  },
) => {
  const query = Object.entries(params ?? {})
    .flatMap(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return [];
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return [];
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join('&');

  return request<{ items: Mix[] }>(`/mixes${query ? `?${query}` : ''}`, {
    auth,
    onAuthUpdate,
  });
};

export const getMixById = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  mixId: string,
) =>
  request<Mix>(`/mixes/${encodeURIComponent(mixId)}`, {
    auth,
    onAuthUpdate,
  });

export const createMix = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: {
    name: string;
    description?: string;
    components: Array<{ tobaccoId: string; proportion: number }>;
  },
) => request<Mix>('/mixes', { method: 'POST', body: payload, auth, onAuthUpdate });

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

export const createMixRating = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { mixId: string; rating: number },
) => request<MixRating>('/mix-ratings', { method: 'POST', body: payload, auth, onAuthUpdate });

export const getRecommendations = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
) =>
  request<{ items: RecommendationItem[] }>('/recommendations', {
    auth,
    onAuthUpdate,
  });

export const refreshRecommendations = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload?: { limit?: number },
) =>
  request<{ ok: true; refreshedCount: number; items: RecommendationItem[] }>(
    '/recommendations/refresh',
    {
      method: 'POST',
      body: payload ?? {},
      auth,
      onAuthUpdate,
    },
  );

export const getSessions = (auth: AuthTokens, onAuthUpdate: RequestOptions['onAuthUpdate']) =>
  request<{ items: SmokingSession[] }>('/sessions', {
    auth,
    onAuthUpdate,
  });

export const createSession = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: { mixId: string; date: string; locationType: 'home' | 'lounge'; locationName?: string },
) => request<SmokingSession>('/sessions', { method: 'POST', body: payload, auth, onAuthUpdate });

export const getManufacturers = (search?: string) => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<{ items: Manufacturer[] }>(`/manufacturers${query}`);
};

export const getTobaccos = (params: {
  search?: string;
  manufacturerId?: string;
  profile?: FlavorProfile;
  limit?: number;
  offset?: number;
}) => {
  const query = Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return request<{ items: Tobacco[] }>(`/tobaccos${query ? `?${query}` : ''}`);
};

export const getPreferenceProfile = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
) =>
  request<{ profile: PreferenceProfile | null }>('/preference-profile', {
    auth,
    onAuthUpdate,
  });

export const upsertPreferenceProfile = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  payload: {
    likedProfiles: FlavorProfile[];
    dislikedProfiles: FlavorProfile[];
    favoriteManufacturerIds: string[];
  },
) =>
  request<{ profile: PreferenceProfile }>('/preference-profile', {
    method: 'PUT',
    body: payload,
    auth,
    onAuthUpdate,
  });

export const getFavoriteMixIds = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
) =>
  request<{ items: string[] }>('/favorites/ids', {
    auth,
    onAuthUpdate,
  });

export const getFavorites = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  params?: {
    search?: string;
    manufacturerId?: string;
    manufacturerIds?: string[];
    tobaccoId?: string;
    tobaccoIds?: string[];
    profile?: FlavorProfile;
    profiles?: FlavorProfile[];
    tag?: string;
    tags?: string[];
    minRating?: number;
    sort?: 'newest' | 'rating' | 'popularity';
    limit?: number;
    offset?: number;
  },
) => {
  const query = Object.entries(params ?? {})
    .flatMap(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return [];
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return [];
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join('&');

  return request<{ items: FavoriteMix[] }>(`/favorites${query ? `?${query}` : ''}`, {
    auth,
    onAuthUpdate,
  });
};

export const addFavorite = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  mixId: string,
) => request('/favorites', { method: 'POST', body: { mixId }, auth, onAuthUpdate });

export const removeFavorite = (
  auth: AuthTokens,
  onAuthUpdate: RequestOptions['onAuthUpdate'],
  mixId: string,
) => request(`/favorites/${encodeURIComponent(mixId)}`, { method: 'DELETE', auth, onAuthUpdate });
