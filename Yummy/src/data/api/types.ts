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
  description?: string | null;
  strength: number;
  flavorProfiles: string[];
  flavorTags: string[];
  flavors: string[];
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
  description?: string | null;
  flavorProfiles?: string[];
  flavors?: string[];
  tags?: string[];
  isUserMix?: boolean;
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
