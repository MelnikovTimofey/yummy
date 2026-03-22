export type ApiError = {
  error: string;
};

export type GuestAccessSuccess = {
  ok: true;
  accessGranted: true;
  message: string;
  issuedAt: string;
  nextStep: 'intro' | 'onboarding';
};

export type OnboardingRecommendationsResponse = {
  onboarding: {
    likedProfiles: string[];
    likedFlavors: string[];
  };
  items: Array<{
    id: string;
    name: string;
    description: string;
    flavorProfiles: string[];
    flavors: string[];
    score: number;
    avgRating: number;
    popularity: number;
    components: Array<{
      id: string;
      name: string;
      manufacturer: string;
      flavors: string[];
    }>;
  }>;
};

export type StaffAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    login: string;
    name: string;
    role: 'admin' | 'nomad';
  };
};
