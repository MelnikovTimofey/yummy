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

export type Tobacco = {
  id: string;
  name: string;
  strength: number;
  line?: string | null;
  flavorProfiles: string[];
  flavorTags: string[];
  manufacturer: Manufacturer;
};

export type RecommendationItem = {
  score: number | null;
  mix: {
    id: string;
    name: string;
    components: Array<{
      proportion: number;
      tobacco: {
        id: string;
        name: string;
        manufacturer: Manufacturer;
      };
    }>;
  };
};

export type Mix = {
  id: string;
  name: string;
  components: Array<{
    proportion: number;
    tobacco: {
      id: string;
      name: string;
      manufacturer: Manufacturer;
    };
  }>;
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

export type PreferenceProfile = {
  id: string;
  userId: string;
  likedProfiles: string[];
  dislikedProfiles: string[];
  favoriteManufacturerIds: string[];
};
