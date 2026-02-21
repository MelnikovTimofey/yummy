export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ApiUser = {
  id: string;
  email: string;
};

export type Manufacturer = {
  id: string;
  name: string;
  website?: string | null;
};

export type Mix = {
  id: string;
  name: string;
  description?: string | null;
  components: Array<{
    proportion: number;
    tobacco: {
      id: string;
      name: string;
      manufacturer: Manufacturer;
    };
  }>;
};

export type MixRating = {
  id: string;
  mixId: string;
  rating: number;
  source: 'direct' | 'derived';
};

export type MixRatingSummary = {
  mixId: string;
  avgRating: number | null;
  count: number;
};

export type AuthState = {
  tokens: AuthTokens | null;
  user: ApiUser | null;
};
