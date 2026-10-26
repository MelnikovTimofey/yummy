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
import type { CatalogIdeas } from './catalog-ideas';
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
  // Идёт в заголовке x-atelier-access на всех гостевых запросах (#435).
  accessToken: string;
  expiresAt: string;
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
    smokeCtaCount: number;
    components: Array<{
      id: string;
      name: string;
      manufacturer: string;
      flavors: string[];
      proportion: number;
    }>;
  }>;
};

export type GuestMixerPaletteResponse = {
  tobaccos: Array<{
    id: string;
    manufacturer: string;
    name: string;
    flavorProfiles: string[];
    flavors: string[];
    flavorTags: string[];
    cooling: boolean;
    twist: boolean;
    mixCount: number;
  }>;
  affinity: Record<string, number>;
};

export type GuestMixerHint = {
  kind: 'mono' | 'too-cold' | 'weak-base' | 'heavy-twist';
  value?: number;
};

export type GuestMixerEvaluateResponse = {
  harmony: number;
  verdict: 'classic' | 'confident' | 'bold' | 'ask-master';
  hints: GuestMixerHint[];
  character: { sweet: number; sour: number; fresh: number; dense: number };
  name: string;
  similarMix: { id: string; name: string; avgRating: number; ratingsCount: number; similarity: number } | null;
};

export type GuestCustomMixSmokeResponse = {
  id: string;
  signature: string;
  harmony: number;
};

// ── Кабинет гостя (#151, контракт зафиксирован в #238; маршруты — #239–#241) ──
//
// Токен гостя приходит в `Authorization: Bearer <token>`. На `/guest/me*` он
// обязателен (401 без него). На `smoke-cta`, `custom-mix-smoke` и
// `/mixes/:id/rating` — необязателен: без токена запись анонимная, как раньше,
// а невалидный токен — 401, чтобы клиент стёр его и повторил запрос анонимно
// (молча писать анонимно нельзя — гость потеряет запись в истории).

export type GuestTaste = {
  likedProfiles: string[];
  likedFlavors: string[];
};

export type GuestMe = GuestTaste & {
  id: string;
  consentAt: string;
  historyCount: number;
  favoritesCount: number;
};

// Вход через бота по ссылке (#239). POST /guest/auth/telegram/start → код и
// ссылка t.me/<бот>?start=<код>; сайт открывает приложение Telegram, гость жмёт
// «Запустить», бот подтверждает код (POST /automation/guest-login/confirm), а
// сайт опрашивает POST /guest/auth/telegram/status {code, secret} и получает токен
// один раз. `consent` обязателен для нового гостя — иначе статус `consent-required`;
// непустые вкусы текущего прохождения переносятся в учётку. Без бота — 503.
export type GuestLoginStartRequest = Partial<GuestTaste> & {
  consent?: boolean;
};

export type GuestLoginStartResponse = {
  code: string;
  botUrl: string;
  expiresAt: string;
  // Только инициатору: без него POST /guest/auth/telegram/status отвечает 404.
  pollSecret: string;
};

export type GuestAuthResponse = {
  token: string;
  expiresAt: string;
  created: boolean;
  me: GuestMe;
};

export type GuestLoginStatusResponse =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'consent-required' }
  | ({ status: 'ok' } & GuestAuthResponse);

// POST /automation/guest-login/confirm (ключ автоматизации, вызывает бот):
// 200 — подтверждено, 404 — кода нет, 410 — просрочен, использован или
// подтверждён другим Telegram-аккаунтом.
export type AutomationGuestLoginConfirmRequest = {
  code: string;
  telegramId: string;
};

// GET /guest/auth/telegram/config — бот входа для виджета; null, если вход не настроен.
export type GuestTelegramConfigResponse = {
  botUsername: string | null;
};

// PUT /guest/me/onboarding (тело — GuestTaste) → GuestMe. DELETE /guest/me → 204.

// Статус строки истории и избранного. `deleted` — мастер удалил или скрыл микс
// («Больше не готовим»); `unavailable` — нет табака в наличии, `missing` —
// первый отсутствующий в виде «бренд табак».
export type GuestMixStatus =
  | { kind: 'available' }
  | { kind: 'unavailable'; missing: string }
  | { kind: 'deleted' };

export type GuestMixRef =
  | { kind: 'catalog'; mixId: string | null }
  | { kind: 'custom'; eventId: string };

export type GuestCabinetComponent = {
  tobaccoId: string;
  manufacturer: string;
  name: string;
  proportion: number;
};

// Карточка из строки кабинета: у каталожного — текущий микс (null у удалённого
// или скрытого), у собранного — снимок события с гармонией и датой.
export type GuestCabinetCard = {
  description: string;
  flavors: string[];
  components: GuestCabinetComponent[];
  harmony: number | null;
  madeAt: string | null;
};

export type GuestCabinetItem = {
  ref: GuestMixRef;
  name: string;
  flavorProfiles: string[];
  status: GuestMixStatus;
  ownRating: number | null;
  card: GuestCabinetCard | null;
};

// GET /guest/me/history?before=<ISO>&limit=50 — по убыванию даты.
export type GuestHistoryItem = GuestCabinetItem & {
  id: string;
  at: string;
};

export type GuestHistoryResponse = {
  items: GuestHistoryItem[];
  nextBefore: string | null;
};

// GET /guest/me/favorites; PUT|DELETE /guest/me/favorites/mixes/:mixId и
// /guest/me/favorites/custom/:eventId — идемпотентны, чужое событие → 404.
export type GuestFavoriteItem = GuestCabinetItem & {
  id: string;
  addedAt: string;
};

export type GuestFavoritesResponse = {
  items: GuestFavoriteItem[];
};

// GET /guest/me/for-you (PRD §6.5). Причина — структура, фразу собирает
// aroma-web. Ведущий профиль микса — профиль с наибольшей суммарной долей
// по компонентам (как в гармонии, PRD §6.4).
export type GuestForYouReason =
  | { kind: 'again'; rating: number | null; timesChosen: number }
  | { kind: 'taste'; profiles: string[]; flavors: string[]; likeMixName: string | null }
  | { kind: 'sidestep'; fromProfile: string; toProfile: string }
  | { kind: 'sidestep-neutral'; toProfile: string };

export type GuestForYouCard = {
  mix: MixView;
  reason: GuestForYouReason;
};

export type GuestForYouHint =
  | { kind: 'same-mix'; mixName: string; count: number; outOf: number }
  | { kind: 'same-profile'; profile: string; count: number; outOf: number };

export type GuestForYouResponse =
  | ({ mode: 'cold'; picks: number } & OnboardingRecommendationsResponse)
  | {
      mode: 'personal';
      fresh: GuestForYouCard[];
      sidestep: GuestForYouCard[];
      again: GuestForYouCard[];
      hint: GuestForYouHint | null;
    };

export type StaffAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    login: string;
    name: string;
    role: 'admin' | 'master';
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

export type StaffCatalogIdeasResponse = CatalogIdeas;

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
