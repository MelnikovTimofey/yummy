import type { IntroCard, MixView, RailType, RailView } from './state';
import type { DailyAccessCodeView, StaffAccountView } from './access';

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

export type GuestIntroCardsResponse = {
  items: IntroCard[];
};

export type GuestCatalogMixesResponse = {
  filters: {
    profiles: string[];
    flavors: string[];
  };
  items: MixView[];
};

export type GuestHomeRailsResponse = {
  items: RailView[];
};

export type GuestMixRatingResponse = {
  item: MixView;
  rating: {
    value: number;
    avgRating: number;
    ratingsCount: number;
  };
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

export type StaffMixesResponse = {
  items: MixView[];
};

export type StaffRailsResponse = {
  items: RailView[];
};

export type StaffDailyAccessCodesResponse = {
  items: DailyAccessCodeView[];
};

export type StaffDailyAccessCodeMutationResponse = {
  item: DailyAccessCodeView;
};

export type StaffAccountsResponse = {
  items: StaffAccountView[];
};

export type StaffAccountMutationResponse = {
  item: StaffAccountView;
};

export type StaffMixMutationResponse = {
  item: MixView;
};

export type StaffRailMutationResponse = {
  item: RailView;
};

export type GuestRatingMutationResponse = GuestMixRatingResponse;

export type NomadRailType = RailType;
