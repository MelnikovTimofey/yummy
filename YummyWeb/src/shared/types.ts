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

export type FlavorProfile = 'sweet' | 'sour' | 'spicy' | 'fresh' | 'dessert' | 'tobacco';

export type Tobacco = {
  id: string;
  name: string;
  description?: string | null;
  strength: number;
  line?: string | null;
  flavorProfiles: FlavorProfile[];
  flavorTags: string[];
  manufacturer: Manufacturer;
};

export type Mix = {
  id: string;
  name: string;
  description?: string | null;
  isUserMix?: boolean;
  createdAt?: string;
  author?: ApiUser;
  components: Array<{
    proportion: number;
    tobacco: {
      id: string;
      name: string;
      description?: string | null;
      strength?: number;
      line?: string | null;
      flavorProfiles?: FlavorProfile[];
      flavorTags?: string[];
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

export type RecommendationSource = 'model' | 'top' | 'cold_start';

export type RecommendationItem = {
  score: number | null;
  source?: RecommendationSource;
  mix: Mix;
};

export type SmokingSession = {
  id: string;
  date: string;
  locationType: 'home' | 'lounge';
  locationName?: string | null;
  mix: Mix;
};

export type SessionRating = {
  id: string;
  sessionId: string;
  rating: number;
};

export type PreferenceProfile = {
  id: string;
  userId: string;
  likedProfiles: FlavorProfile[];
  dislikedProfiles: FlavorProfile[];
  favoriteManufacturerIds: string[];
};

export type AuthState = {
  tokens: AuthTokens | null;
  user: ApiUser | null;
};
