import type {
  DashboardSummary,
  IntroCard,
  InventoryBatchResult,
  InventoryListResult,
  InventoryTobaccoView,
  MixListResult,
  MixView,
  RailType,
  RailView,
  StaffRailView,
} from './state';
import type { AuditEventView } from './audit';
import type {
  DailyAccessCodeView,
  StaffAccountView,
  TelegramAutomationStateView,
  TelegramOperatorView,
  TelegramRecipientView,
} from './access';

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
      proportion: number;
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
} & MixListResult;

export type StaffDashboardSummaryResponse = DashboardSummary;

export type StaffInventoryResponse = InventoryListResult;

export type StaffInventoryMutationResponse = {
  item: InventoryTobaccoView;
};

export type StaffInventoryBatchMutationResponse = InventoryBatchResult;

export type StaffRailsResponse = {
  items: StaffRailView[];
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

export type StaffTelegramRecipientsResponse = {
  items: TelegramRecipientView[];
};

export type StaffTelegramRecipientMutationResponse = {
  item: TelegramRecipientView;
};

export type StaffTelegramOperatorsResponse = {
  items: TelegramOperatorView[];
};

export type StaffTelegramOperatorMutationResponse = {
  item: TelegramOperatorView;
};

export type AutomationDailyCodeWindow = {
  startsAt: string;
  endsAt: string;
};

export type AutomationDailyCodeCurrentResponse = {
  item: DailyAccessCodeView | null;
  window: AutomationDailyCodeWindow;
};

export type AutomationDailyCodeEnsureResponse = {
  item: DailyAccessCodeView;
  window: AutomationDailyCodeWindow;
  state: 'existing' | 'created';
};

export type AutomationDailyCodeRotateResponse = {
  item: DailyAccessCodeView;
  window: AutomationDailyCodeWindow;
  state: 'rotated';
};

export type AutomationTelegramRecipientsResponse = {
  items: TelegramRecipientView[];
  allowedChatIds: number[];
  broadcastChatIds: number[];
  rotateChatIds: number[];
};

export type AutomationTelegramOperatorResponse = {
  item: TelegramOperatorView | null;
};

export type AutomationTelegramOperatorLinkResponse = {
  item: TelegramOperatorView;
};

export type AutomationTelegramStateResponse = {
  item: TelegramAutomationStateView;
};

export type StaffTelegramAutomationStateResponse = {
  item: TelegramAutomationStateView;
};

export type StaffAuditEventsResponse = {
  items: AuditEventView[];
};

export type StaffMixMutationResponse = {
  item: MixView;
};

export type StaffRailMutationResponse = {
  item: StaffRailView;
};

export type GuestRatingMutationResponse = GuestMixRatingResponse;

export type NomadRailType = RailType;
