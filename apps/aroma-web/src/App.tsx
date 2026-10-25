import { type PointerEvent as ReactPointerEvent, type ReactNode, FormEvent, Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, ClipboardList } from 'lucide-react';

import {
  BottomNav,
  BusyLabel,
  Chip,
  CTA,
  HeroSkeleton,
  Loading,
  MixListRow,
  MixRowsSkeleton,
  ProfileGlyph,
  RailSkeleton,
  RatingPill,
  SignatureBar,
  Sk,
  SmokeLoading,
  type BottomNavTab,
} from '@/components/aroma';
import { AnonFavoriteSheet } from '@/components/cabinet/AnonFavoriteSheet';
import { Cabinet, type CabinetHistory, type CabinetListSource } from '@/components/cabinet/Cabinet';
import { CabinetAnon } from '@/components/cabinet/CabinetAnon';
import { DeleteCabinetSheet } from '@/components/cabinet/DeleteCabinetSheet';
import { ForYou, RecsTabs } from '@/components/for-you/ForYou';
import { HeartButton } from '@/components/cabinet/HeartButton';
import { LoginWait } from '@/components/cabinet/LoginWait';
import { MixerInvite } from '@/components/mixer/MixerInvite';
import { MixerMasterCard, type MixerSmoke } from '@/components/mixer/MixerMasterCard';
import { MixerScreen } from '@/components/mixer/MixerScreen';
import { Feed } from '@/components/reels/Feed';
import { FeedEmpty } from '@/components/reels/FeedEmpty';
import { PullPeek } from '@/components/reels/PullPeek';
import { ReelsTeaser } from '@/components/reels/ReelsTeaser';
import { usePullPast } from '@/components/reels/usePullPast';
import {
  customDescription,
  isFavorite,
  missingTobacco,
  smokeBlockReason,
  withFavorite,
  withOwnRating,
  withoutFavorite,
  type GuestCabinetCard,
  type GuestCabinetItem,
  type GuestFavoriteItem,
  type GuestFavoritesResponse,
  type GuestHistoryResponse,
  type GuestMixRef,
} from '@/lib/cabinet';
import { byCountDesc, filterCatalogMixes, flavorsMatchedFirst, normalizeSearchText } from '@/lib/catalog';
import {
  COLD_NOTE,
  MOOD_DRAFT_NOTE,
  forYouSlots,
  moodTitle,
  recsScreen,
  submitPlan,
  type RecsTab,
  type GuestForYouCard,
  type GuestForYouResponse,
} from '@/lib/for-you-copy';
import { fetchAsGuest, guestSession } from '@/lib/guest-client';
import {
  canOfferLogin,
  clearPendingLogin,
  createLoginPoller,
  guestDeviceId,
  loginReturnView,
  readPendingLogin,
  savePendingLogin,
  type GuestLoginStart,
  type GuestLoginStatus,
  type GuestMe,
  type LoginOrigin,
  type PendingLogin,
} from '@/lib/guest-session';
import { MixerApiError, sendCustomMixSmoke } from '@/lib/mixer/api';
import { RequestError, guestErrorText } from '@/lib/request-error';
import { getProfileColor } from '@/lib/profile-color';
import { cn } from '@/lib/utils';
import { profileLabelMap, profileOptions } from '@/lib/profile-labels';
import { applyGuestRating } from '@/lib/rating';
import { forYouPage, recsPage, reelFeed, RECS_ON_SCREEN, type RecsPage } from '@/lib/reel-feed';
import { dedupeRails, railKindIcon, railOpenLabel } from '@/lib/showcase';

type GuestView =
  | 'access'
  | 'intro'
  | 'onboarding'
  | 'recommendations'
  | 'showcase'
  | 'reels'
  | 'catalog'
  | 'rail'
  | 'smoke-confirmation'
  | 'custom-confirmation'
  | 'mixer'
  | 'cabinet'
  | 'login';
type AppTab = 'recommendations' | 'showcase' | 'reels' | 'catalog' | 'cabinet';
type MixerReturnView = AppTab | 'rail';
type JourneyTab = 'intro' | 'onboarding';
type RailType = 'statistical' | 'prepared' | 'curated';
type MixSource = 'recommendations' | 'mood' | 'showcase' | 'reels' | 'catalog' | 'rail' | CabinetListSource;

type OnboardingOptions = {
  profiles: string[];
  flavors: string[];
  profileCounts: Record<string, number>;
  flavorCounts: Record<string, number>;
};

type RecommendedMix = MixCard & {
  matchedProfiles: string[];
  matchedFlavors: string[];
};

type ForYouData = GuestForYouResponse<MixCard, RecommendedMix>;

// «Под настроение» этого визита (#245, #388): `items: null` — подбора ещё нет,
// массив — выдача; `step` — шаг выбора, null — показан подбор. Живёт в памяти
// до конца визита или выхода из кабинета.
type Mood = {
  profiles: string[];
  flavors: string[];
  items: RecommendedMix[] | null;
  step: 1 | 2 | null;
};

type CatalogFilterTag = {
  kind: 'profile' | 'flavor';
  value: string;
};

type GuestAccessSuccess = {
  ok: true;
  accessGranted: true;
  message: string;
  issuedAt: string;
  nextStep: 'intro' | 'onboarding';
};

type IntroCard = {
  id: string;
  step: number;
  title: string;
  description: string;
  bullets: string[];
};

type MixCard = {
  id: string;
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  avgRating: number;
  ratingsCount: number;
  popularity: number;
  available: boolean;
  createdAt: string;
  components: Array<{
    id: string;
    name: string;
    manufacturer: string;
    flavors: string[];
    proportion: number;
  }>;
};

type HomeRail = {
  id: string;
  name: string;
  description: string;
  type: RailType;
  active: boolean;
  mixes: MixCard[];
  mixIds: string[];
};

type SelectedMix = {
  id: string;
  source: MixSource;
  mix: MixCard;
};

type MixRatingResult = {
  ok: true;
  mixId: string;
  value: number;
  averageRating: number;
  ratingCount: number;
  message?: string;
};

// `item` — строка кабинета (#244): откуда сердечко, статус наличия и
// собранный ли микс. `blockReason` — почему «Покурить» сейчас нельзя.
type MixModalState = {
  mix: MixCard;
  source: MixSource;
  item?: GuestCabinetItem;
  blockReason?: string | null;
};

const storageKeys = {
  ageConfirmed: 'aroma-age-confirmed',
  accessGranted: 'aroma-access-granted',
  introSeen: 'aroma-intro-seen',
  onboardingDone: 'aroma-onboarding-done',
  likedProfiles: 'aroma-liked-profiles',
  likedFlavors: 'aroma-liked-flavors',
};

const readStoredStringArray = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';
const requestTimeoutMs = 8000;

const mixUnavailableText = 'Этот микс сейчас недоступен по наличию.';
const noTasteText = 'Выберите хотя бы один профиль или вкус.';
// 404 на smoke-cta и оценке — микс сняли с наличия, пока гость смотрел карточку.
const mixGoneError = { 404: mixUnavailableText };
const noTasteError = { 400: noTasteText };


const railDescriptions: Record<RailType, string> = {
  statistical: 'Миксы, к которым гости возвращаются чаще всего.',
  prepared: 'Подборка для быстрого старта в фирменной стилистике ателье.',
  curated: 'Выразительные сочетания, которые чаще советуют мастера зала.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);


const formatPlainLabel = (value: string) =>
  value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatProfileLabel = (value: string) => profileLabelMap[value] ?? formatPlainLabel(value);

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
};

const extractCollection = (payload: unknown, keys: string[]) => {
  const candidates: unknown[] = [payload];

  if (isRecord(payload) && payload.data !== undefined) {
    candidates.push(payload.data);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (!isRecord(candidate)) {
      continue;
    }

    for (const key of keys) {
      const value = candidate[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
};

const formatPercent = (value: number) => `${Number(value.toFixed(1)).toString().replace('.', ',')}%`;

const normalizeIntroCard = (item: unknown, index: number): IntroCard => {
  const record = isRecord(item) ? item : {};

  return {
    id: typeof record.id === 'string' && record.id ? record.id : `intro-${index}`,
    step: toNumber(record.step, index + 1),
    title:
      typeof record.title === 'string' && record.title
        ? record.title
        : typeof record.name === 'string' && record.name
          ? record.name
          : `Карточка ${index + 1}`,
    description:
      typeof record.description === 'string'
        ? record.description
        : typeof record.text === 'string'
          ? record.text
          : '',
    bullets: toStringList(record.bullets ?? record.points ?? record.steps ?? record.items),
  };
};

const normalizeMix = (item: unknown, index: number): MixCard => {
  const record = isRecord(item) ? item : {};
  const components = extractCollection(record, ['components', 'mixComponents', 'ingredients']).map(
    (component, componentIndex) => {
      const componentRecord = isRecord(component) ? component : {};

      return {
        id:
          typeof componentRecord.id === 'string' && componentRecord.id
            ? componentRecord.id
            : `component-${index}-${componentIndex}`,
        name:
          typeof componentRecord.name === 'string' && componentRecord.name
            ? componentRecord.name
            : 'Компонент',
        manufacturer:
          typeof componentRecord.manufacturer === 'string' && componentRecord.manufacturer
            ? componentRecord.manufacturer
            : '',
        flavors: toStringList(componentRecord.flavors),
        proportion: toNumber(componentRecord.proportion, Math.round(100 / Math.max(1, extractCollection(record, ['components']).length))),
      };
    },
  );

  return {
    id:
      typeof record.id === 'string' && record.id
        ? record.id
        : typeof record.mixId === 'string' && record.mixId
          ? record.mixId
          : `mix-${index}`,
    name:
      typeof record.name === 'string' && record.name
        ? record.name
        : typeof record.title === 'string' && record.title
          ? record.title
          : `Микс ${index + 1}`,
    description:
      typeof record.description === 'string'
        ? record.description
        : typeof record.subtitle === 'string'
          ? record.subtitle
          : '',
    flavorProfiles: toStringList(record.flavorProfiles ?? record.profiles ?? record.categories),
    flavors: toStringList(record.flavors ?? record.tastes),
    flavorTags: toStringList(record.flavorTags ?? record.tags ?? record.metaTags),
    avgRating: toNumber(record.avgRating ?? record.averageRating ?? record.rating, 0),
    ratingsCount: toNumber(record.ratingsCount, 0),
    popularity: toNumber(record.popularity ?? record.smokeCtaCount ?? record.count, 0),
    available: toBoolean(record.available ?? record.inStock ?? record.isAvailable, true),
    createdAt:
      typeof record.createdAt === 'string' && record.createdAt
        ? record.createdAt
        : new Date(0).toISOString(),
    components,
  };
};

const normalizeRail = (item: unknown, index: number): HomeRail => {
  const record = isRecord(item) ? item : {};
  const mixes = extractCollection(record, ['mixes', 'items', 'catalog', 'mixCards']).map((mix, mixIndex) =>
    normalizeMix(mix, mixIndex),
  );
  const railType = typeof record.type === 'string' ? record.type : typeof record.kind === 'string' ? record.kind : '';

  return {
    id:
      typeof record.id === 'string' && record.id
        ? record.id
        : typeof record.railId === 'string' && record.railId
          ? record.railId
          : `rail-${index}`,
    name:
      typeof record.name === 'string' && record.name
        ? record.name
        : typeof record.title === 'string' && record.title
          ? record.title
          : `Рейл ${index + 1}`,
    description:
      typeof record.description === 'string'
        ? record.description
        : typeof record.subtitle === 'string'
          ? record.subtitle
          : '',
    type: railType === 'statistical' || railType === 'prepared' || railType === 'curated' ? railType : 'prepared',
    active: toBoolean(record.active ?? record.isActive ?? record.enabled, true),
    mixes,
    mixIds: toStringList(record.mixIds ?? record.ids),
  };
};

// `auth` — запрос с токеном кабинета (#243): `optional` — гостевое событие, на
// 401 токен стирается и запрос повторяется анонимно; `required` — /guest/me*,
// на 401 гость выходит из кабинета.
const requestJson = async <T,>(path: string, options: RequestInit = {}, auth?: 'optional' | 'required'): Promise<T> => {
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers ?? {});

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;

  try {
    const url = `${apiBaseUrl}${path}`;
    const init = { ...options, headers, signal: AbortSignal.timeout(requestTimeoutMs) };
    response = auth
      ? await fetchAsGuest(url, init, { anonymousRetry: auth === 'optional' })
      : await fetch(url, init);
  } catch (cause) {
    // Без таймаута недоступный хост держит запрос до системного TCP-таймаута (~75 секунд).
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
    throw new RequestError(
      0,
      timedOut
        ? 'Ателье не ответило вовремя. Попробуйте ещё раз.'
        : 'Нет связи с Ателье. Попробуйте ещё раз.',
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new RequestError(response.status);
  }

  return payload as T;
};

const fetchGuestAccess = async (code: string) => {
  const payload = await requestJson<unknown>('/guest/access-code/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

  return payload as GuestAccessSuccess;
};

const toCountMap = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => [key, toNumber(count, 0)]),
  );
};

const fetchOnboardingOptions = async () => {
  const payload = await requestJson<unknown>('/guest/onboarding/options');
  const record = isRecord(payload) ? payload : {};

  return {
    profiles: toStringList(record.profiles ?? record.items ?? record.flavorProfiles),
    flavors: toStringList(record.flavors ?? record.items ?? record.flavorTags),
    profileCounts: toCountMap(record.profileCounts),
    flavorCounts: toCountMap(record.flavorCounts),
  } satisfies OnboardingOptions;
};

const fetchIntroCards = async () => {
  const payload = await requestJson<unknown>('/guest/intro/cards');
  return extractCollection(payload, ['items', 'cards', 'introCards']).map((item, index) => normalizeIntroCard(item, index));
};

const fetchHomeRails = async () => {
  const payload = await requestJson<unknown>('/guest/home/rails');
  return extractCollection(payload, ['items', 'rails']).map((item, index) => normalizeRail(item, index));
};

const fetchCatalogMixes = async () => {
  const payload = await requestJson<unknown>('/guest/catalog/mixes');
  return extractCollection(payload, ['items', 'mixes', 'catalog']).map((item, index) => normalizeMix(item, index));
};

const fetchRecommendations = async (payload: { likedProfiles: string[]; likedFlavors: string[] }) => {
  const response = await requestJson<unknown>('/guest/onboarding/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return toRecommendedMixes(response);
};

const toRecommendedMixes = (response: unknown) => {
  const record = isRecord(response) ? response : {};
  return extractCollection(record, ['items', 'mixes']).map((item, index) => {
    const itemRecord = isRecord(item) ? item : {};

    return {
      ...normalizeMix(item, index),
      matchedProfiles: toStringList(itemRecord.matchedProfiles),
      matchedFlavors: toStringList(itemRecord.matchedFlavors),
    } satisfies RecommendedMix;
  });
};

// «Для вас» (#245) — у вошедшего вместо POST /guest/onboarding/recommendations.
// В холодном режиме выдача та же, что у онбординга, по вкусам из кабинета.
const fetchForYou = async (): Promise<ForYouData> => {
  const response = await requestJson<GuestForYouResponse<unknown, unknown>>('/guest/me/for-you', {}, 'required');
  if (response.mode === 'cold') {
    return { ...response, items: toRecommendedMixes(response) };
  }
  const cards = (list: GuestForYouCard<unknown>[]) =>
    list.map((card, index) => ({ ...card, mix: normalizeMix(card.mix, index) }));
  return { ...response, fresh: cards(response.fresh), sidestep: cards(response.sidestep), again: cards(response.again) };
};

const sendSmokeCta = async (mixId: string) => {
  const payload = await requestJson<unknown>('/guest/events/smoke-cta', {
    method: 'POST',
    body: JSON.stringify({ mixId }),
  }, 'optional');

  return payload as { ok: true };
};

const sendMixRating = async (mixId: string, value: number) => {
  const payload = await requestJson<unknown>(`/guest/mixes/${mixId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ value }),
    headers: { 'x-atelier-device': guestDeviceId(localStorage) },
  }, 'optional');

  const record = isRecord(payload) ? payload : {};
  const ratingRecord = isRecord(record.rating) ? record.rating : {};
  const itemRecord = isRecord(record.item) ? record.item : {};

  return {
    ok: true as const,
    mixId:
      typeof record.mixId === 'string' && record.mixId
        ? record.mixId
        : typeof itemRecord.id === 'string' && itemRecord.id
          ? itemRecord.id
          : mixId,
    value: toNumber(record.value ?? ratingRecord.value ?? value, value),
    averageRating: toNumber(record.averageRating ?? ratingRecord.avgRating ?? itemRecord.avgRating, Number.NaN),
    ratingCount: toNumber(record.ratingCount ?? ratingRecord.ratingsCount ?? itemRecord.ratingsCount, Number.NaN),
    message: typeof record.message === 'string' ? record.message : undefined,
  } satisfies MixRatingResult;
};

// ── Кабинет гостя (#243) ──

const fetchLoginConfig = async () => {
  const payload = await requestJson<unknown>('/guest/auth/telegram/config');
  const record = isRecord(payload) ? payload : {};
  return typeof record.botUsername === 'string' && record.botUsername ? record.botUsername : null;
};

const startGuestLogin = (body: { consent: boolean; likedProfiles: string[]; likedFlavors: string[] }) =>
  requestJson<GuestLoginStart>('/guest/auth/telegram/start', { method: 'POST', body: JSON.stringify(body) });

// Неизвестный код — backend уже почистил его как просроченный.
const fetchGuestLoginStatus = async ({ code, pollSecret }: { code: string; pollSecret: string }) => {
  try {
    return await requestJson<GuestLoginStatus>('/guest/auth/telegram/status', {
      method: 'POST',
      body: JSON.stringify({ code, secret: pollSecret }),
    });
  } catch (cause) {
    if (cause instanceof RequestError && cause.status === 404) return { status: 'expired' } as const;
    throw cause;
  }
};

const fetchGuestMe = () => requestJson<GuestMe>('/guest/me', {}, 'required');

const saveGuestTaste = (taste: { likedProfiles: string[]; likedFlavors: string[] }) =>
  requestJson<GuestMe>('/guest/me/onboarding', { method: 'PUT', body: JSON.stringify(taste) }, 'required');

const deleteGuestAccount = () => requestJson<unknown>('/guest/me', { method: 'DELETE' }, 'required');

// История и избранное (#244). Избранное — один раз на старте, история — при
// открытии кабинета, на сердечко — PUT или DELETE.
const fetchGuestHistory = (before: string | null) =>
  requestJson<GuestHistoryResponse>(
    `/guest/me/history${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    {},
    'required',
  );

const fetchGuestFavorites = () => requestJson<GuestFavoritesResponse>('/guest/me/favorites', {}, 'required');

// 204 без тела: requestJson вернёт null.
const sendGuestFavorite = (ref: GuestMixRef, on: boolean) =>
  requestJson<unknown>(
    ref.kind === 'custom'
      ? `/guest/me/favorites/custom/${encodeURIComponent(ref.eventId)}`
      : `/guest/me/favorites/mixes/${encodeURIComponent(ref.mixId ?? '')}`,
    { method: on ? 'PUT' : 'DELETE' },
    'required',
  );

// Карточка из строки кабинета: каталожный микс «нет в наличии» не приходит в
// каталоге гостя, собранного там нет вовсе.
const cabinetItemToMix = (item: GuestCabinetItem, card: GuestCabinetCard): MixCard => ({
  id: item.ref.kind === 'custom' ? item.ref.eventId : item.ref.mixId ?? '',
  name: item.name,
  description: item.ref.kind === 'custom' ? customDescription(card, new Date()) : card.description,
  flavorProfiles: item.flavorProfiles,
  flavors: card.flavors,
  flavorTags: [],
  avgRating: 0,
  ratingsCount: 0,
  popularity: 0,
  available: item.status.kind === 'available',
  createdAt: '',
  components: card.components.map((component) => ({
    id: component.tobaccoId,
    name: component.name,
    manufacturer: component.manufacturer,
    flavors: [],
    proportion: component.proportion,
  })),
});

// Каталожный микс, открытый не из кабинета, в избранном — строка «в наличии».
const mixToCabinetItem = (mix: MixCard): GuestCabinetItem => ({
  ref: { kind: 'catalog', mixId: mix.id },
  name: mix.name,
  flavorProfiles: mix.flavorProfiles,
  status: { kind: 'available' },
  ownRating: null,
  card: {
    description: mix.description,
    flavors: mix.flavors,
    components: mix.components.map((component) => ({
      tobaccoId: component.id,
      manufacturer: component.manufacturer,
      name: component.name,
      proportion: component.proportion,
    })),
    harmony: null,
    madeAt: null,
  },
});

const EMPTY_HISTORY: CabinetHistory = { items: [], nextBefore: null, status: 'idle', loadingMore: false };

// `stale` — после выбора, оценки, сердечка или правки вкусов: «Для вас»
// пересобирается при следующем заходе на Подбор, а не под открытой карточкой.
type ForYouState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ForYouData | null;
  error: string;
  stale: boolean;
};

const EMPTY_FOR_YOU: ForYouState = { status: 'idle', data: null, error: '', stale: false };

// Как MIN_FOR_YOU_PICKS в apps/backend/src/for-you.ts: с этого числа выборов
// вернувшемуся гостю есть что показать и без сохранённых вкусов.
const FOR_YOU_MIN_PICKS = 3;

const TELEGRAM_ERROR = 'Telegram не ответил. Попробуйте ещё раз.';
const CONSENT_REQUIRED_ERROR = 'Кабинета ещё нет. Отметьте согласие и войдите снова.';
const SIGNED_IN_NOTICE = 'Вы вошли. Вкусы из онбординга сохранены в кабинете.';

type LoginState =
  | { phase: 'idle' }
  | { phase: 'starting'; origin: LoginOrigin }
  | ({ phase: 'waiting' | 'expired' } & PendingLogin);

// Ramp состава микса — слой данных, значения в packages/design-tokens/profile-colors.css
const COMPOSITION_PALETTE = [
  'var(--composition-1)',
  'var(--composition-2)',
  'var(--composition-3)',
  'var(--composition-4)',
  'var(--composition-5)',
];

const pluralize = (count: number, [one, few, many]: readonly [string, string, string]) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const pluralizeMixes = (count: number) => pluralize(count, ['микс', 'микса', 'миксов']);

// Порог в пикселях, после которого отпускание пальца закрывает лист.
const SWIPE_DISMISS_THRESHOLD = 110;

const useSwipeDownToClose = (onDismiss: () => void) => {
  const drag = useRef({ startY: 0, lastY: 0, active: false, pointerId: -1 });
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    drag.current = { startY: 0, lastY: 0, active: false, pointerId: -1 };
    setDragging(false);
    setOffset(0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.currentTarget.scrollTop > 0) return;
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      active: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current.pointerId !== event.pointerId) return;
    const delta = event.clientY - current.startY;
    current.lastY = event.clientY;
    if (!current.active) {
      if (delta > 8 && event.currentTarget.scrollTop <= 0) {
        current.active = true;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      } else {
        return;
      }
    }
    if (event.cancelable) event.preventDefault();
    setOffset(Math.max(0, delta));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current.pointerId !== event.pointerId) return;
    const delta = current.lastY - current.startY;
    const dismissed = current.active && delta > SWIPE_DISMISS_THRESHOLD;
    reset();
    if (dismissed) onDismiss();
  };

  return { offset, dragging, onPointerDown, onPointerMove, onPointerEnd, onPointerCancel: reset };
};

const MixDetailModal = ({
  state,
  selectedMixId,
  chooseStatus,
  chooseError,
  ratingValue,
  ratingStatus,
  ratingError,
  ratingMessage,
  favorite,
  onFavorite,
  onClose,
  onChoose,
  onRate,
}: {
  state: MixModalState | null;
  favorite: boolean;
  onFavorite: () => void;
  selectedMixId: string;
  chooseStatus: 'idle' | 'loading' | 'ready' | 'error';
  chooseError: string;
  ratingValue: number | null;
  ratingStatus: 'idle' | 'loading' | 'ready' | 'error';
  ratingError: string;
  ratingMessage: string;
  onClose: () => void;
  onChoose: () => void;
  onRate: (value: number) => void;
}) => {
  const mix = state?.mix;
  const source = state?.source;
  const swipe = useSwipeDownToClose(onClose);

  if (!mix || !source) {
    return null;
  }

  const custom = state.item?.ref.kind === 'custom';
  const blockReason = state.blockReason ?? (!mix.available ? mixUnavailableText : null);
  const canSmoke = !blockReason;
  const isSelected = !custom && selectedMixId === mix.id;
  const components = [...mix.components].sort(
    (left, right) => right.proportion - left.proportion,
  );
  const totalProportion = components.reduce((sum, item) => sum + item.proportion, 0) || 1;

  // Свайп вниз закрывает лист. Жест стартует только от верха прокрутки, чтобы не
  // конфликтовать с чтением длинного состава; ниже порога — лист пружинит назад.
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet"
        data-dragging={swipe.dragging ? 'true' : 'false'}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerEnd}
        onPointerCancel={swipe.onPointerCancel}
        style={{
          top: 'auto',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${swipe.offset}px)`,
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          width: 'min(calc(100vw - 16px), 540px)',
          maxHeight: '92dvh',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom))',
          borderTopLeftRadius: 'var(--r-guest-sheet)',
          borderTopRightRadius: 'var(--r-guest-sheet)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflowY: 'auto',
          background: 'var(--guest-sheet-bg)',
        }}
      >
        <span className="aroma-mix-sheet-handle" aria-hidden />
        <DialogDescription className="sr-only">
          Карточка микса
        </DialogDescription>

        <div className="aroma-mix-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-mix-sheet-head-text">
            <DialogTitle className="aroma-mix-sheet-title">{mix.name}</DialogTitle>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
            {custom ? <p className="aroma-mix-sheet-note">Собран вами</p> : null}
          </div>
          <HeartButton on={favorite} onClick={onFavorite} />
        </div>

        {mix.description ? (
          <p className="aroma-mix-sheet-desc">{mix.description}</p>
        ) : null}

        {mix.flavorProfiles.length || mix.flavors.length ? (
          <div className="aroma-mix-sheet-tags">
            {mix.flavorProfiles.slice(0, 3).map((profile) => (
              <Chip key={`profile-${profile}`} tier="lg" color={getProfileColor(profile)}>
                {formatProfileLabel(profile)}
              </Chip>
            ))}
            {mix.flavors.slice(0, 6).map((flavor) => (
              <Chip key={`flavor-${flavor}`}>{flavor}</Chip>
            ))}
          </div>
        ) : null}

        {components.length ? (
          <section className="aroma-mix-sheet-composition">
            <h3 className="aroma-label">Состав</h3>
            <div className="aroma-mix-sheet-stack">
              {components.map((component, index) => (
                <span
                  key={component.id}
                  className="aroma-mix-sheet-stack-segment"
                  style={{
                    flexGrow: component.proportion / totalProportion,
                    background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length],
                  }}
                  aria-hidden
                />
              ))}
            </div>
            <ul className="aroma-mix-sheet-comp-list">
              {components.map((component, index) => (
                <li key={component.id} className="aroma-mix-sheet-comp-row">
                  <span
                    className="aroma-mix-sheet-comp-dot"
                    style={{
                      background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length],
                    }}
                    aria-hidden
                  />
                  {component.manufacturer ? (
                    <span className="aroma-mix-sheet-comp-maker">{component.manufacturer}</span>
                  ) : null}
                  <span className="aroma-mix-sheet-comp-name">{component.name}</span>
                  <span className="aroma-mix-sheet-comp-share">
                    {formatPercent(component.proportion)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {custom ? null : (
        <section className="aroma-mix-sheet-rating">
          <h3 className="aroma-label">Ваша оценка</h3>
          <div
            className="aroma-mix-sheet-stars"
            role="group"
            aria-label="Оценка микса"
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const filled = ratingValue !== null && ratingValue >= value;
              return (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'aroma-mix-sheet-star',
                    filled && 'aroma-mix-sheet-star-on',
                  )}
                  onClick={() => onRate(value)}
                  disabled={ratingStatus === 'loading'}
                  aria-label={`Оценить на ${value}`}
                >
                  ★
                </button>
              );
            })}
          </div>
          {ratingMessage ? <p className="status ok">{ratingMessage}</p> : null}
          {ratingError ? <p className="screen-status error">{ratingError}</p> : null}
        </section>
        )}

        {blockReason ? <p className="screen-status error">{blockReason}</p> : null}
        {chooseError ? <p className="screen-status error">{chooseError}</p> : null}

        <div className="aroma-mix-sheet-actions">
          <button
            type="button"
            className="aroma-mix-sheet-ghost"
            onClick={onClose}
          >
            {source === 'reels' ? 'К рилсам' : 'Закрыть'}
          </button>
          <CTA
            pulse={canSmoke && !isSelected && chooseStatus !== 'loading'}
            busy={chooseStatus === 'loading'}
            disabled={!canSmoke || isSelected}
            onClick={onChoose}
          >
            {isSelected ? 'Уже в карточке' : 'Покурить'}
          </CTA>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Сразу видны самые частые вкусы, остальные — по «Все N вкусов» или поиску.
const CATALOG_SHEET_FLAVOR_LIMIT = 18;

const CatalogFiltersSheet = ({
  profiles,
  flavors,
  selected,
  resultCount,
  onToggle,
  onReset,
  onClose,
}: {
  profiles: string[];
  flavors: string[];
  selected: CatalogFilterTag[];
  resultCount: number;
  onToggle: (tag: CatalogFilterTag) => void;
  onReset: () => void;
  onClose: () => void;
}) => {
  const swipe = useSwipeDownToClose(onClose);
  const [flavorQuery, setFlavorQuery] = useState('');
  const [showAllFlavors, setShowAllFlavors] = useState(false);

  const isSelected = (kind: CatalogFilterTag['kind'], value: string) =>
    selected.some((tag) => tag.kind === kind && tag.value === value);
  const normalizedFlavorQuery = normalizeSearchText(flavorQuery);
  const visibleFlavors = normalizedFlavorQuery
    ? flavors.filter((flavor) => normalizeSearchText(flavor).includes(normalizedFlavorQuery))
    : showAllFlavors
      ? flavors
      : flavors.slice(0, CATALOG_SHEET_FLAVOR_LIMIT);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet aroma-catalog-sheet"
        data-dragging={swipe.dragging ? 'true' : 'false'}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerEnd}
        onPointerCancel={swipe.onPointerCancel}
        style={{
          top: 'auto',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${swipe.offset}px)`,
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          width: 'min(calc(100vw - 16px), 540px)',
          maxHeight: '92dvh',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom))',
          borderTopLeftRadius: 'var(--r-guest-sheet)',
          borderTopRightRadius: 'var(--r-guest-sheet)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflowY: 'auto',
          background: 'var(--guest-sheet-bg)',
        }}
      >
        <span className="aroma-mix-sheet-handle" aria-hidden />
        <DialogDescription className="sr-only">
          Характер и вкусы, по которым Каталог сужает выдачу.
        </DialogDescription>

        <div className="aroma-catalog-sheet-head">
          <DialogTitle className="aroma-mix-sheet-title">Фильтры</DialogTitle>
          {selected.length ? (
            <button type="button" className="aroma-onboarding-skip" onClick={onReset}>
              Сбросить
            </button>
          ) : null}
        </div>

        <section className="aroma-catalog-sheet-block">
          <h3 className="aroma-label">Характер</h3>
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Характер">
            {profiles.map((profile) => (
              <Chip
                key={profile}
                color={getProfileColor(profile)}
                active={isSelected('profile', profile)}
                onClick={() => onToggle({ kind: 'profile', value: profile })}
              >
                {formatProfileLabel(profile)}
              </Chip>
            ))}
          </div>
        </section>

        <section className="aroma-catalog-sheet-block">
          <h3 className="aroma-label">Вкусы</h3>
          <input
            type="search"
            className="aroma-catalog-sheet-search"
            value={flavorQuery}
            onChange={(event) => setFlavorQuery(event.target.value)}
            placeholder="Найти вкус"
            aria-label="Найти вкус"
            enterKeyHint="search"
            autoComplete="off"
          />
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Вкусы">
            {visibleFlavors.map((flavor) => (
              <Chip
                key={flavor}
                active={isSelected('flavor', flavor)}
                onClick={() => onToggle({ kind: 'flavor', value: flavor })}
              >
                {flavor}
              </Chip>
            ))}
          </div>
          {normalizedFlavorQuery && !visibleFlavors.length ? (
            <p className="aroma-catalog-sheet-hint">Такого вкуса в каталоге нет.</p>
          ) : null}
          {!normalizedFlavorQuery && !showAllFlavors && flavors.length > CATALOG_SHEET_FLAVOR_LIMIT ? (
            <button
              type="button"
              className="aroma-onboarding-skip aroma-catalog-sheet-more"
              onClick={() => setShowAllFlavors(true)}
            >
              {`Все ${flavors.length} ${pluralize(flavors.length, ['вкус', 'вкуса', 'вкусов'])}`}
            </button>
          ) : null}
        </section>

        <CTA disabled={!resultCount} onClick={onClose}>
          {resultCount ? `Показать ${resultCount} ${pluralizeMixes(resultCount)}` : 'Ничего не найдено'}
        </CTA>
      </DialogContent>
    </Dialog>
  );
};

export const App = () => {
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(storageKeys.ageConfirmed) === 'true');
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(storageKeys.accessGranted) === 'true');
  const [introSeen, setIntroSeen] = useState(() => localStorage.getItem(storageKeys.introSeen) === 'true');
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem(storageKeys.onboardingDone) === 'true');
  const [view, setView] = useState<GuestView>(() => {
    const granted = localStorage.getItem(storageKeys.accessGranted) === 'true';
    const seen = localStorage.getItem(storageKeys.introSeen) === 'true';
    const done = localStorage.getItem(storageKeys.onboardingDone) === 'true';
    if (!granted) {
      return 'access';
    }
    if (!guestSession.token() && readPendingLogin(localStorage, new Date())) {
      return 'login';
    }
    if (!seen) {
      return 'intro';
    }
    if (!done) {
      return 'onboarding';
    }
    const hasPreferences = readStoredStringArray(storageKeys.likedProfiles).length > 0
      || readStoredStringArray(storageKeys.likedFlavors).length > 0;
    return hasPreferences ? 'recommendations' : 'catalog';
  });

  const [code, setCode] = useState('');
  const [accessStatus, setAccessStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [accessError, setAccessError] = useState('');

  const [introCards, setIntroCards] = useState<IntroCard[]>([]);
  const [introStatus, setIntroStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [introError, setIntroError] = useState('');

  const [options, setOptions] = useState<OnboardingOptions>({
    profiles: [],
    flavors: [],
    profileCounts: {},
    flavorCounts: {},
  });
  const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [optionsError, setOptionsError] = useState('');
  const [likedProfiles, setLikedProfiles] = useState<string[]>(() => readStoredStringArray(storageKeys.likedProfiles));
  const [likedFlavors, setLikedFlavors] = useState<string[]>(() => readStoredStringArray(storageKeys.likedFlavors));
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  // Повторный вход в предпочтения: тот же экран онбординга, но выход по «←»
  // ведёт в подбор, а правки чипов остаются черновиком до «Показать подбор».
  const [editingPreferences, setEditingPreferences] = useState(false);
  const preferencesSnapshotRef = useRef<{ profiles: string[]; flavors: string[] } | null>(null);

  const [recommendations, setRecommendations] = useState<RecommendedMix[]>([]);
  // Полная картотека для онбординга: каталог в catalogSourceMixes живёт под
  // фильтрами гостя, а счётчик подходящих миксов должен считаться по всей
  // картотеке независимо от того, что гость нафильтровал в каталоге (#36).
  const [onboardingMixes, setOnboardingMixes] = useState<MixCard[]>([]);
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recommendationError, setRecommendationError] = useState('');

  const [showcaseRails, setShowcaseRails] = useState<HomeRail[]>([]);
  const [showcaseStatus, setShowcaseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showcaseError, setShowcaseError] = useState('');

  const [catalogSourceMixes, setCatalogSourceMixes] = useState<MixCard[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [catalogError, setCatalogError] = useState('');
  const catalogRequestRef = useRef(0);

  const [selectedMix, setSelectedMix] = useState<SelectedMix | null>(null);
  const [mixModalState, setMixModalState] = useState<MixModalState | null>(null);
  const [chooseStatus, setChooseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  // Микс, чей «Покурить» сейчас уходит: selectedMix меняется только после ответа.
  const [pendingMixId, setPendingMixId] = useState<string | null>(null);
  const [chooseError, setChooseError] = useState('');
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');

  const [selectedRail, setSelectedRail] = useState<HomeRail | null>(null);
  const [mixerReturnView, setMixerReturnView] = useState<MixerReturnView>('showcase');

  const [query, setQuery] = useState('');
  // Метки в порядке выбора: «Убрать последний фильтр» в пустой выдаче снимает именно последний.
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilterTag[]>([]);
  const [catalogFiltersOpen, setCatalogFiltersOpen] = useState(false);
  const [railProfileFilters, setRailProfileFilters] = useState<string[]>([]);

  // ── Кабинет гостя (#243) ──
  const guestToken = useSyncExternalStore(guestSession.subscribe, guestSession.token);
  const signedIn = guestToken !== null;
  // undefined — конфиг входа ещё не запрашивали или он не пришёл.
  const [botUsername, setBotUsername] = useState<string | null | undefined>(undefined);
  const loginConfigRequestedRef = useRef(false);
  const [me, setMe] = useState<GuestMe | null>(null);
  const [meStatus, setMeStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [cabinetError, setCabinetError] = useState('');
  const [cabinetNotice, setCabinetNotice] = useState('');
  const [login, setLogin] = useState<LoginState>(() => {
    const pending = guestSession.token() ? null : readPendingLogin(localStorage, new Date());
    return pending ? { phase: 'waiting', ...pending } : { phase: 'idle' };
  });
  const [loginError, setLoginError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');
  const preferencesReturnRef = useRef<'recommendations' | 'cabinet'>('recommendations');
  // История и избранное (#244). null — избранное ещё не пришло.
  const [history, setHistory] = useState<CabinetHistory>(EMPTY_HISTORY);
  const [favorites, setFavorites] = useState<GuestFavoriteItem[] | null>(null);
  const favoritesRequestedRef = useRef(false);
  const [anonHeartOpen, setAnonHeartOpen] = useState(false);
  // Карточка для мастера — последний выбор гостя: микс каталога (selectedMix)
  // или собранный (customSmoke). Новый выбор сбрасывает другой.
  const [customSmoke, setCustomSmoke] = useState<MixerSmoke | null>(null);
  const [customReturnView, setCustomReturnView] = useState<GuestView>('cabinet');
  // «Для вас» и «Под настроение» (#245).
  const [forYou, setForYou] = useState<ForYouState>(EMPTY_FOR_YOU);
  const forYouRequestRef = useRef(0);
  const [recsTab, setRecsTab] = useState<RecsTab>('for-you');
  const [mood, setMood] = useState<Mood | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Лента «Рилсы» (#263). Индекс — здесь, а не в ленте: «Готово» после
  // «Покурить» возвращает на тот же рилс. `loadId` пересоздаёт ленту с начала.
  // `continues` — лента продолжает непустой Подбор: на первом рилсе есть путь назад (#349).
  const [reels, setReels] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    items: MixCard[];
    continues: boolean;
    error: string;
    loadId: number;
  }>({ status: 'idle', items: [], continues: false, error: '', loadId: 0 });
  const [reelIndex, setReelIndex] = useState(0);
  const [reelSwiped, setReelSwiped] = useState(false);
  // Миксы, на которые smoke-cta ответил 404: табак кончился, пока гость листал.
  const [goneReels, setGoneReels] = useState<string[]>([]);
  const [reelChoice, setReelChoice] = useState<{ mixId: string; status: 'loading' | 'error'; error: string } | null>(null);

  useEffect(() => {
    if (ageConfirmed) {
      localStorage.setItem(storageKeys.ageConfirmed, 'true');
    } else {
      localStorage.removeItem(storageKeys.ageConfirmed);
    }
  }, [ageConfirmed]);

  useEffect(() => {
    if (accessGranted) {
      localStorage.setItem(storageKeys.accessGranted, 'true');
    } else {
      localStorage.removeItem(storageKeys.accessGranted);
    }
  }, [accessGranted]);

  useEffect(() => {
    if (introSeen) {
      localStorage.setItem(storageKeys.introSeen, 'true');
    } else {
      localStorage.removeItem(storageKeys.introSeen);
    }
  }, [introSeen]);

  useEffect(() => {
    if (onboardingDone) {
      localStorage.setItem(storageKeys.onboardingDone, 'true');
    } else {
      localStorage.removeItem(storageKeys.onboardingDone);
    }
  }, [onboardingDone]);

  // Пока идёт правка, выбор чипов — черновик: сохранение откладывается до
  // «Показать подбор», иначе сохранённые предпочтения разойдутся с показанным
  // подбором, а после перезагрузки он пересоберётся по неподтверждённому.
  useEffect(() => {
    if (editingPreferences) {
      return;
    }
    localStorage.setItem(storageKeys.likedProfiles, JSON.stringify(likedProfiles));
  }, [likedProfiles, editingPreferences]);

  useEffect(() => {
    if (editingPreferences) {
      return;
    }
    localStorage.setItem(storageKeys.likedFlavors, JSON.stringify(likedFlavors));
  }, [likedFlavors, editingPreferences]);

  useEffect(() => {
    if (!accessGranted) {
      setView('access');
      return;
    }

    if (view === 'access') {
      setView(introSeen ? (onboardingDone ? 'recommendations' : 'onboarding') : 'intro');
    }
  }, [accessGranted, introSeen, onboardingDone, view]);

  const loadIntroCards = async () => {
    setIntroStatus('loading');
    setIntroError('');

    try {
      const items = await fetchIntroCards();
      setIntroCards(items);
      setIntroStatus('ready');
    } catch (cause) {
      setIntroStatus('error');
      setIntroError(guestErrorText(cause));
    }
  };

  const loadOnboardingOptions = async () => {
    setOptionsStatus('loading');
    setOptionsError('');

    try {
      const [nextOptions, nextMixes] = await Promise.all([
        fetchOnboardingOptions(),
        fetchCatalogMixes(),
      ]);
      setOptions(nextOptions);
      setOnboardingMixes(nextMixes);
      setOptionsStatus('ready');
    } catch (cause) {
      setOptionsStatus('error');
      setOptionsError(guestErrorText(cause));
    }
  };

  const loadShowcase = async () => {
    setShowcaseStatus('loading');
    setShowcaseError('');

    try {
      const rails = await fetchHomeRails();
      setShowcaseRails(rails);
      setShowcaseStatus('ready');
    } catch (cause) {
      setShowcaseStatus('error');
      setShowcaseError(guestErrorText(cause));
    }
  };

  const loadCatalog = async () => {
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;
    setCatalogStatus('loading');
    setCatalogError('');

    try {
      const mixes = await fetchCatalogMixes();
      if (catalogRequestRef.current !== requestId) {
        return;
      }
      setCatalogSourceMixes(mixes);
      setCatalogStatus('ready');
    } catch (cause) {
      if (catalogRequestRef.current !== requestId) {
        return;
      }
      setCatalogStatus('error');
      setCatalogError(guestErrorText(cause));
    }
  };

  useEffect(() => {
    if (!accessGranted) {
      return;
    }

    if (introStatus === 'idle') {
      void loadIntroCards();
    }

    if (optionsStatus === 'idle') {
      void loadOnboardingOptions();
    }

    if (showcaseStatus === 'idle') {
      void loadShowcase();
    }

  }, [accessGranted, introStatus, optionsStatus, showcaseStatus]);

  useEffect(() => {
    if (!accessGranted) {
      return;
    }

    void loadCatalog();
  }, [accessGranted]);

  useEffect(() => {
    if (view === 'onboarding') {
      setOnboardingStep(1);
    }
  }, [view]);

  useEffect(() => {
    setRailProfileFilters([]);
  }, [selectedRail?.id]);

  const updateMixInList = <T extends MixCard>(items: T[], mixId: string, updater: (mix: MixCard) => MixCard) =>
    items.map((mix) => (mix.id === mixId ? ({ ...mix, ...updater(mix) } as T) : mix));

  const syncMixEverywhere = (mixId: string, updater: (mix: MixCard) => MixCard) => {
    setRecommendations((current) => updateMixInList(current, mixId, updater));
    setCatalogSourceMixes((current) => updateMixInList(current, mixId, updater));
    setShowcaseRails((current) =>
      current.map((rail) => ({
        ...rail,
        mixes: updateMixInList(rail.mixes, mixId, updater),
      })),
    );
    setSelectedRail((current) =>
      current
        ? {
            ...current,
            mixes: updateMixInList(current.mixes, mixId, updater),
          }
        : current,
    );
    setMixModalState((current) =>
      current && current.mix.id === mixId
        ? {
            ...current,
            mix: updater(current.mix),
          }
        : current,
    );
  };

  const resetCatalogFilters = () => {
    setQuery('');
    setCatalogFilters([]);
  };

  const openPreferencesEditing = (returnTo: 'recommendations' | 'cabinet' = 'recommendations') => {
    preferencesSnapshotRef.current = { profiles: likedProfiles, flavors: likedFlavors };
    preferencesReturnRef.current = returnTo;
    setEditingPreferences(true);
    setView('onboarding');
  };

  const cancelPreferencesEditing = () => {
    const snapshot = preferencesSnapshotRef.current;
    if (snapshot) {
      setLikedProfiles(snapshot.profiles);
      setLikedFlavors(snapshot.flavors);
    }
    preferencesSnapshotRef.current = null;
    setEditingPreferences(false);
    setView(preferencesReturnRef.current);
  };

  const finishIntro = () => {
    setIntroSeen(true);
    setView('onboarding');
  };

  const onSubmitAccessCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ageConfirmed) {
      setAccessStatus('error');
      setAccessError('Подтвердите, что вам уже исполнилось 18 лет.');
      return;
    }

    if (!code.trim()) {
      setAccessStatus('error');
      setAccessError('Введите код доступа.');
      return;
    }

    setAccessStatus('loading');
    setAccessError('');

    try {
      const result = await fetchGuestAccess(code.trim());
      setAccessGranted(true);
      setView(introSeen ? (onboardingDone ? 'recommendations' : 'onboarding') : 'intro');
      setAccessStatus('success');
    } catch (cause) {
      setAccessStatus('error');
      setAccessError(guestErrorText(cause, { 401: 'Код не подошёл. Уточните его у мастера зала.' }));
    }
  };

  const loadRecommendations = async (profiles: string[], flavors: string[]) => {
    setRecommendationStatus('loading');
    setRecommendationError('');

    try {
      const nextRecommendations = await fetchRecommendations({
        likedProfiles: profiles,
        likedFlavors: flavors,
      });
      setRecommendations(nextRecommendations);
      setRecommendationStatus('ready');
      return true;
    } catch (cause) {
      setRecommendationStatus('error');
      setRecommendationError(guestErrorText(cause, noTasteError));
      return false;
    }
  };

  const submitOnboarding = async (moodMode = false) => {
    const moodDraft = moodMode ? mood : null;
    const taste = moodDraft
      ? { likedProfiles: moodDraft.profiles, likedFlavors: moodDraft.flavors }
      : { likedProfiles, likedFlavors };
    if (!taste.likedProfiles.length && !taste.likedFlavors.length) {
      setSubmitError(noTasteText);
      return;
    }

    const plan = submitPlan({ mood: Boolean(moodDraft), signedIn: guestSession.token() !== null });
    setSubmitting(true);
    setSubmitError('');
    try {
      if (plan.saveTaste) {
        setMe(await saveGuestTaste(taste));
      }
      if (plan.load === 'for-you') {
        invalidateForYou();
      } else {
        const items = await fetchRecommendations(taste);
        if (moodDraft) {
          setMood({ ...moodDraft, items, step: null });
        } else {
          setRecommendations(items);
          setRecommendationStatus('ready');
          setRecommendationError('');
        }
      }
    } catch (cause) {
      setSubmitError(guestErrorText(cause, noTasteError));
      return;
    } finally {
      setSubmitting(false);
    }

    if (plan.keepTaste) {
      setOnboardingDone(true);
      preferencesSnapshotRef.current = null;
      setEditingPreferences(false);
    }
    setView('recommendations');
  };

  // ── «Для вас» (#245) ──

  const invalidateForYou = () => setForYou((current) => ({ ...current, stale: true }));

  // Пока идёт пересборка, на экране остаётся прежняя выдача.
  // Возвращает выдачу и ленте рилсов (#265): та же выдача, второго запроса нет.
  const loadForYou = async () => {
    const requestId = forYouRequestRef.current + 1;
    forYouRequestRef.current = requestId;
    setForYou((current) => ({ ...current, status: 'loading', error: '', stale: false }));
    try {
      const data = await fetchForYou();
      if (forYouRequestRef.current === requestId) setForYou({ status: 'ready', data, error: '', stale: false });
      return data;
    } catch (cause) {
      if (forYouRequestRef.current === requestId) {
        setForYou((current) => ({ ...current, status: 'error', error: guestErrorText(cause) }));
      }
      throw cause;
    }
  };

  const changeRecsTab = (tab: RecsTab) => {
    setRecsTab(tab);
    setSubmitError('');
    if (tab === 'mood') setMood((current) => current ?? { profiles: [], flavors: [], items: null, step: 1 });
  };

  // «Изменить» — к выбору с теми же профилями; прежний подбор остаётся до «Показать подбор».
  const editMood = () => {
    setMood((current) => current && { ...current, step: 1 });
    setSubmitError('');
  };

  // ── Кабинет гостя (#243) ──

  const saveTasteToCabinet = async (taste: { likedProfiles: string[]; likedFlavors: string[] }) => {
    try {
      setMe(await saveGuestTaste(taste));
      setCabinetError('');
    } catch (cause) {
      if (guestSession.token()) setCabinetError(guestErrorText(cause));
    }
  };

  const loadMe = async () => {
    setMeStatus('loading');
    setCabinetError('');
    try {
      setMe(await fetchGuestMe());
      setMeStatus('ready');
    } catch (cause) {
      setMeStatus('error');
      if (guestSession.token()) setCabinetError(guestErrorText(cause));
    }
  };

  // Конфиг входа нужен только экранам с кнопкой входа: у анонима, который туда
  // не заходит, новых запросов нет.
  useEffect(() => {
    if (!accessGranted || signedIn || botUsername !== undefined || loginConfigRequestedRef.current) {
      return;
    }
    if (view !== 'cabinet' && view !== 'intro') {
      return;
    }
    loginConfigRequestedRef.current = true;
    fetchLoginConfig()
      .then(setBotUsername)
      .catch(() => {
        loginConfigRequestedRef.current = false;
      });
  }, [accessGranted, signedIn, botUsername, view]);

  // Вошедший гость узнаёт себя на старте и при повторном открытии кабинета после сбоя.
  useEffect(() => {
    if (!accessGranted || !signedIn) {
      return;
    }
    if (meStatus === 'idle' || (meStatus === 'error' && view === 'cabinet')) {
      void loadMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessGranted, signedIn, view]);

  // Выход, удаление или 401 на /guest/me* — кабинет снова анонимный.
  useEffect(() => {
    if (!signedIn) {
      setMe(null);
      setMeStatus('idle');
      setCabinetNotice('');
      setCabinetError('');
      setHistory(EMPTY_HISTORY);
      setFavorites(null);
      favoritesRequestedRef.current = false;
    }
  }, [signedIn]);

  // Вход и выход меняют источник Подбора: у вошедшего — «Для вас», у анонима —
  // подбор по вкусам устройства. Прежняя выдача другого режима не нужна.
  useEffect(() => {
    forYouRequestRef.current += 1;
    setForYou(EMPTY_FOR_YOU);
    setRecsTab('for-you');
    setMood(null);
    if (signedIn) {
      setRecommendations([]);
      setRecommendationStatus('idle');
      setRecommendationError('');
    }
  }, [signedIn]);

  // «Для вас» — при заходе на Подбор, если выдачи ещё нет, она устарела или
  // прошлый запрос сорвался.
  const forYouNeedsLoad = forYou.status === 'idle' || forYou.status === 'error' || forYou.stale;
  useEffect(() => {
    if (!accessGranted || !signedIn || view !== 'recommendations' || !forYouNeedsLoad || forYou.status === 'loading') {
      return;
    }
    loadForYou().catch(() => {
      // Ошибку Подбор показывает из состояния.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessGranted, signedIn, view, forYou.status === 'idle']);

  // Избранное — один раз на старте у вошедшего: из него сердечко на любой карточке.
  useEffect(() => {
    if (!accessGranted || !signedIn || favoritesRequestedRef.current) {
      return;
    }
    favoritesRequestedRef.current = true;
    fetchGuestFavorites()
      .then((response) => setFavorites(response.items))
      .catch(() => {
        // Повторим при следующей смене экрана.
        favoritesRequestedRef.current = false;
      });
  }, [accessGranted, signedIn, view]);

  // История — при каждом открытии кабинета: после «Покурить» там новая строка.
  useEffect(() => {
    if (!accessGranted || !signedIn || view !== 'cabinet') {
      return;
    }
    let cancelled = false;
    setHistory((current) => ({ ...current, status: 'loading' }));
    fetchGuestHistory(null)
      .then((response) => {
        if (!cancelled) setHistory({ items: response.items, nextBefore: response.nextBefore, status: 'ready', loadingMore: false });
      })
      .catch(() => {
        if (!cancelled) setHistory((current) => ({ ...current, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [accessGranted, signedIn, view]);

  const loadMoreHistory = async () => {
    if (!history.nextBefore || history.loadingMore) {
      return;
    }
    setHistory((current) => ({ ...current, loadingMore: true }));
    try {
      const response = await fetchGuestHistory(history.nextBefore);
      setHistory((current) => ({
        ...current,
        items: [...current.items, ...response.items],
        nextBefore: response.nextBefore,
        loadingMore: false,
      }));
    } catch {
      setHistory((current) => ({ ...current, loadingMore: false }));
    }
  };

  const countPick = () => {
    if (guestSession.token()) {
      setMe((current) => (current ? { ...current, historyCount: current.historyCount + 1 } : current));
      invalidateForYou();
    }
  };

  const completeLogin = (token: string | null, nextMe: GuestMe, origin: LoginOrigin) => {
    clearPendingLogin(localStorage);
    setLogin({ phase: 'idle' });
    setLoginError('');
    setCabinetError('');
    setMe(nextMe);
    setMeStatus('ready');
    if (token) {
      guestSession.signIn(token);
    }

    const savedTaste = nextMe.likedProfiles.length > 0 || nextMe.likedFlavors.length > 0;
    const tasteChanged =
      JSON.stringify([nextMe.likedProfiles, nextMe.likedFlavors]) !== JSON.stringify([likedProfiles, likedFlavors]);
    // Подбор вошедшего — «Для вас» с backend, поэтому вкусы кабинета только
    // переносим на устройство, без отдельного подбора по ним.
    if (savedTaste) {
      setOnboardingDone(true);
      if (tasteChanged) {
        setLikedProfiles(nextMe.likedProfiles);
        setLikedFlavors(nextMe.likedFlavors);
      }
    }
    if (origin === 'intro') {
      setIntroSeen(true);
    }

    // Вернувшемуся гостю с историей выборов есть что показать в «Для вас» и без вкусов.
    const hasForYou = origin === 'intro' && nextMe.historyCount >= FOR_YOU_MIN_PICKS;
    if (hasForYou) {
      setOnboardingDone(true);
    }
    const next = hasForYou ? 'recommendations' : loginReturnView(origin, nextMe);
    setCabinetNotice(next === 'cabinet' ? SIGNED_IN_NOTICE : '');
    setView(next);
  };

  const failLogin = (origin: LoginOrigin, message: string, to: GuestView = origin) => {
    clearPendingLogin(localStorage);
    setLogin({ phase: 'idle' });
    setLoginError(message);
    setView(to);
  };

  const beginLogin = async (origin: LoginOrigin, consent: boolean) => {
    setLogin({ phase: 'starting', origin });
    setLoginError('');
    try {
      const started = await startGuestLogin({ consent, likedProfiles, likedFlavors });
      const pending: PendingLogin = {
        code: started.code,
        botUrl: started.botUrl,
        expiresAt: started.expiresAt,
        pollSecret: started.pollSecret,
        origin,
        consent,
      };
      savePendingLogin(localStorage, pending);
      setLogin({ phase: 'waiting', ...pending });
      setView('login');
      // Та же вкладка, а не window.open: после await жест гостя уже потерян, и
      // Safari на iPhone блокирует всплывающее окно. Переход на t.me открывает
      // приложение Telegram, страница остаётся и ждёт подтверждения.
      window.location.href = started.botUrl;
    } catch {
      failLogin(origin, TELEGRAM_ERROR);
    }
  };

  const cancelLogin = () => {
    const origin = login.phase === 'idle' ? 'cabinet' : login.origin;
    clearPendingLogin(localStorage);
    setLogin({ phase: 'idle' });
    setView(origin);
  };

  const onLoginSettled = (status: Exclude<GuestLoginStatus, { status: 'pending' }>) => {
    if (login.phase !== 'waiting') {
      return;
    }
    const { origin } = login;
    if (status.status === 'ok') {
      completeLogin(status.token, status.me, origin);
      return;
    }
    if (status.status === 'consent-required') {
      failLogin(origin, CONSENT_REQUIRED_ERROR, 'cabinet');
      return;
    }
    // Код мог погасить соседняя вкладка, куда гость вернулся по кнопке бота:
    // тогда токен уже лежит в localStorage.
    if (guestSession.token()) {
      fetchGuestMe()
        .then((nextMe) => completeLogin(null, nextMe, origin))
        .catch(() => failLogin(origin, TELEGRAM_ERROR));
      return;
    }
    clearPendingLogin(localStorage);
    setLogin({ ...login, phase: 'expired' });
  };

  const loginHandlersRef = useRef({ onLoginSettled, onLoginError: () => {} });
  loginHandlersRef.current = {
    onLoginSettled,
    onLoginError: () => failLogin(login.phase === 'idle' ? 'cabinet' : login.origin, TELEGRAM_ERROR),
  };

  const pollingCode = view === 'login' && login.phase === 'waiting' ? login.code : null;
  const pollSecret = login.phase === 'waiting' ? login.pollSecret : '';

  useEffect(() => {
    if (!pollingCode) {
      return;
    }
    const poller = createLoginPoller({
      check: () => fetchGuestLoginStatus({ code: pollingCode, pollSecret }),
      onSettled: (status) => loginHandlersRef.current.onLoginSettled(status),
      onError: () => loginHandlersRef.current.onLoginError(),
      isHidden: () => document.visibilityState === 'hidden',
    });
    const wake = () => {
      if (document.visibilityState === 'visible') {
        void poller.wake();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('pageshow', wake);
    poller.start();
    wake();
    return () => {
      poller.stop();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('pageshow', wake);
    };
  }, [pollingCode, pollSecret]);

  const logout = () => {
    guestSession.signOut();
  };

  const confirmDeleteCabinet = async () => {
    setDeleteStatus('loading');
    setDeleteError('');
    try {
      await deleteGuestAccount();
      guestSession.signOut();
    } catch (cause) {
      // 401 — учётки уже нет, гость и так вышел.
      if (guestSession.token()) {
        setDeleteStatus('error');
        setDeleteError(guestErrorText(cause));
        return;
      }
    }
    setDeleteStatus('idle');
    setDeleteOpen(false);
  };

  // После перезагрузки рекомендации теряются (живут только в state) — восстанавливаем
  // их с бэка по сохранённым предпочтениям, чтобы не гонять гостя через онбординг заново.
  // У вошедшего Подбор — «Для вас», POST подбора не нужен.
  useEffect(() => {
    if (!accessGranted || !onboardingDone || signedIn) {
      return;
    }
    if (recommendationStatus !== 'idle' || recommendations.length) {
      return;
    }
    if (!likedProfiles.length && !likedFlavors.length) {
      return;
    }

    void loadRecommendations(likedProfiles, likedFlavors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessGranted, onboardingDone, signedIn]);

  const openMix = (mix: MixCard, source: MixSource, item?: GuestCabinetItem) => {
    setMixModalState({ mix, source, item, blockReason: item ? smokeBlockReason(item.status) : null });
    setChooseStatus(selectedMix?.id === mix.id ? 'ready' : 'idle');
    setChooseError('');
    setRatingStatus('idle');
    setRatingError('');
    setRatingMessage('');
    setRatingValue(item?.ownRating ?? null);
  };

  // Строка кабинета: микс в наличии берём из каталога, если он уже загружен.
  const openCabinetItem = (item: GuestCabinetItem, source: CabinetListSource) => {
    if (!item.card) {
      return;
    }
    const live =
      item.ref.kind === 'catalog' && item.ref.mixId && item.status.kind === 'available' ? findCatalogMix(item.ref.mixId) : undefined;
    openMix(live ?? cabinetItemToMix(item, item.card), source, item);
  };

  const modalRef: GuestMixRef | null = mixModalState
    ? mixModalState.item?.ref ?? { kind: 'catalog', mixId: mixModalState.mix.id }
    : null;
  const modalFavorite = Boolean(modalRef && signedIn && isFavorite(favorites, modalRef));

  // Сердечко карточки и рилса (#265): локально сразу, на сбой — откат. У гостя
  // без входа — шторка «Избранное живёт в кабинете».
  const toggleFavorite = async (item: GuestCabinetItem) => {
    if (!signedIn) {
      setAnonHeartOpen(true);
      return;
    }
    const on = !isFavorite(favorites, item.ref);
    const previous = favorites ?? [];
    setFavorites(on ? withFavorite(previous, item, new Date()) : withoutFavorite(previous, item.ref));
    try {
      await sendGuestFavorite(item.ref, on);
      invalidateForYou();
    } catch {
      if (guestSession.token()) setFavorites(previous);
    }
  };

  const isFavoriteMix = (mix: MixCard) => signedIn && isFavorite(favorites, { kind: 'catalog', mixId: mix.id });

  // «Войти» из шторки сердечка — в кабинет, к согласию и входу через Telegram.
  const loginFromHeart = () => {
    setAnonHeartOpen(false);
    setMixModalState(null);
    setLoginError('');
    setView('cabinet');
  };

  // Собранный микс из кабинета: то же событие, что «Покурить» в «Намиксуй».
  // Сбой события не задерживает гостя — карточка мастеру открывается всё
  // равно; 409 — табак закончился, причина остаётся на карточке.
  const onSmokeCustom = async (item: GuestCabinetItem, card: GuestCabinetCard) => {
    setChooseStatus('loading');
    setChooseError('');
    let harmony = card.harmony;
    try {
      const result = await sendCustomMixSmoke({
        components: card.components.map(({ tobaccoId, proportion }) => ({ tobaccoId, proportion })),
        name: item.name,
        swipes: [],
      });
      harmony = result.harmony ?? harmony;
      countPick();
    } catch (cause) {
      if (cause instanceof MixerApiError && cause.status === 409) {
        const missing = missingTobacco(card, cause.tobaccoId);
        setChooseStatus('idle');
        setMixModalState((current) =>
          current && {
            ...current,
            blockReason: missing
              ? smokeBlockReason({ kind: 'unavailable', missing })
              : 'Один из табаков только что закончился. Покурить этот микс сегодня не получится.',
          },
        );
        return;
      }
    }
    setChooseStatus('idle');
    setMixModalState(null);
    setCustomSmoke({
      name: item.name,
      profiles: item.flavorProfiles.slice(0, 3),
      components: card.components.map((component) => ({
        id: component.tobaccoId,
        manufacturer: component.manufacturer,
        name: component.name,
        proportion: component.proportion,
      })),
      harmony,
    });
    setSelectedMix(null);
    setCustomReturnView('cabinet');
    setView('custom-confirmation');
  };

  const openMixer = (from: MixerReturnView) => {
    setMixerReturnView(from);
    setView('mixer');
  };

  // Похожий микс с раскрытия «Намиксуй» — из полной картотеки онбординга.
  const findCatalogMix = (mixId: string) =>
    onboardingMixes.find((mix) => mix.id === mixId) ?? catalogSourceMixes.find((mix) => mix.id === mixId);

  const onChooseMix = async (mix: MixCard, source: MixSource) => {
    setChooseStatus('loading');
    setChooseError('');
    setPendingMixId(mix.id);
    const previousMix = selectedMix;

    try {
      await sendSmokeCta(mix.id);
      countPick();
      setSelectedMix({
        id: mix.id,
        source,
        mix,
      });
      setCustomSmoke(null);
      setChooseStatus('ready');
      setMixModalState(null);
      setView('smoke-confirmation');
    } catch (cause) {
      setSelectedMix(previousMix);
      if (source === 'reels' && cause instanceof RequestError && cause.status === 404) {
        setGoneReels((current) => [...current, mix.id]);
        setChooseStatus('idle');
        setMixModalState(null);
        return;
      }
      setChooseStatus('error');
      setChooseError(guestErrorText(cause, mixGoneError));
    } finally {
      setPendingMixId(null);
    }
  };

  // Подбор глазами ленты (#349): у вошедшего — «Для вас» (personal) или подбор
  // по вкусам кабинета (cold), у гостя без входа — подбор по онбордингу, в
  // «Под настроение» — его подбор. null — ещё не загружен или гость выбирает вкусы.
  const forYouRecsPage = (data: ForYouData): RecsPage<MixCard> =>
    data.mode === 'personal' ? forYouPage(data) : recsPage(data.items);
  const hasTaste = onboardingDone && (likedProfiles.length > 0 || likedFlavors.length > 0);
  const recsMode = signedIn ? recsScreen(recsTab, mood) : 'for-you';
  const shownRecs: RecsPage<MixCard> | null =
    recsMode === 'pick'
      ? null
      : recsMode === 'result' && mood?.items
        ? recsPage(mood.items)
        : signedIn
          ? forYou.data
            ? forYouRecsPage(forYou.data)
            : null
          : !hasTaste
            ? recsPage([])
            : recommendationStatus === 'ready'
              ? recsPage(recommendations)
              : null;
  // Рилсы после Подбора — для тизера в его конце и кадра при дотягивании.
  const continuation =
    shownRecs?.shown.length && catalogStatus === 'ready' ? reelFeed(shownRecs, catalogSourceMixes) : null;

  // Лента продолжает Подбор (#349) — из тизера и из панели одна и та же.
  // Устаревший «Для вас» пересобирается тем же запросом, что сделал бы Подбор.
  // Каталог, если уже загружен, не запрашивается заново.
  const openReels = async () => {
    const loadId = reels.loadId + 1;
    const page = recsMode === 'for-you' && signedIn && forYou.stale ? null : shownRecs;
    setReelIndex(0);
    setReelSwiped(false);
    setReelChoice(null);
    setView('reels');
    setReels((current) => ({ ...current, status: 'loading', error: '', loadId }));
    try {
      const fetchPage = async () =>
        signedIn ? forYouRecsPage(await loadForYou()) : recsPage(await fetchRecommendations({ likedProfiles, likedFlavors }));
      const [shown, catalog] = await Promise.all([
        page ?? fetchPage(),
        catalogStatus === 'ready' ? catalogSourceMixes : fetchCatalogMixes(),
      ]);
      const items = reelFeed(shown, catalog);
      setReels((current) =>
        current.loadId === loadId
          ? { status: 'ready', items, continues: shown.shown.length > 0, error: '', loadId }
          : current,
      );
    } catch (cause) {
      setReels((current) => (current.loadId === loadId ? { ...current, status: 'error', error: guestErrorText(cause) } : current));
    }
  };

  // Назад с первого рилса — в конец Подбора, к тизеру.
  const recsAtEnd = useRef(false);
  const backToRecs = () => {
    recsAtEnd.current = true;
    setView('recommendations');
  };

  const mainRef = useRef<HTMLElement>(null);
  const recsTravel = usePullPast(mainRef, 'bottom', view === 'recommendations' && continuation !== null, () => void openReels());

  useEffect(() => {
    const main = mainRef.current;
    if (view !== 'recommendations' || !recsAtEnd.current || !main) return;
    recsAtEnd.current = false;
    main.scrollTop = main.scrollHeight;
  }, [view]);

  // «Покурить» прямо из рилса: то же событие smoke-cta и тот же экран «Покажите
  // мастеру». 404 — микс кончился: CTA гаснет, лента остаётся на месте.
  const onChooseReel = async (mix: MixCard) => {
    setReelChoice({ mixId: mix.id, status: 'loading', error: '' });
    try {
      await sendSmokeCta(mix.id);
    } catch (cause) {
      if (cause instanceof RequestError && cause.status === 404) {
        setGoneReels((current) => [...current, mix.id]);
        setReelChoice(null);
      } else {
        setReelChoice({ mixId: mix.id, status: 'error', error: guestErrorText(cause) });
      }
      return;
    }
    setReelChoice(null);
    countPick();
    setSelectedMix({ id: mix.id, source: 'reels', mix });
    setCustomSmoke(null);
    setChooseStatus('ready');
    setView('smoke-confirmation');
  };

  const onSaveRating = async (value: number) => {
    if (!mixModalState) {
      return;
    }

    setRatingValue(value);
    setRatingStatus('loading');
    setRatingError('');
    setRatingMessage('');

    try {
      const result = await sendMixRating(mixModalState.mix.id, value);
      syncMixEverywhere(mixModalState.mix.id, (mix) => applyGuestRating(mix, result));
      setHistory((current) => ({ ...current, items: withOwnRating(current.items, mixModalState.mix.id, result.value) }));
      setFavorites((current) => current && withOwnRating(current, mixModalState.mix.id, result.value));
      if (guestSession.token()) invalidateForYou();
      setRatingStatus('ready');
      setRatingMessage(result.message ?? `Оценка ${result.value} сохранена.`);
    } catch (cause) {
      setRatingStatus('error');
      setRatingError(guestErrorText(cause, mixGoneError));
    }
  };

  const availableProfileOptions = profileOptions.filter((option) =>
    !options.profiles.length || options.profiles.includes(option.value),
  );

  const catalogProfiles = catalogFilters.filter((tag) => tag.kind === 'profile').map((tag) => tag.value);
  const catalogFlavors = catalogFilters.filter((tag) => tag.kind === 'flavor').map((tag) => tag.value);
  const filteredCatalogMixes = filterCatalogMixes(catalogSourceMixes, {
    query,
    profiles: catalogProfiles,
    flavors: catalogFlavors,
  });

  const selectedMixCard =
    selectedMix?.id
      ? ([
          ...recommendations,
          ...catalogSourceMixes,
          ...showcaseRails.flatMap((rail) => rail.mixes),
        ] as MixCard[]).find((mix) => mix.id === selectedMix.id) ?? selectedMix.mix
      : null;

  const renderBrand = () => (
    <Button variant="ghost" type="button" className="brand-wrap brand-home-btn" onClick={() => setView(accessGranted ? 'recommendations' : 'access')}>
      <img className="brand-mark" src="/logo-mark-oxblood.svg" width="15" height="22" alt="" aria-hidden />
      <span className="brand">Арома Ателье</span>
    </Button>
  );

  const renderJourneyNav = (activeTab: JourneyTab) => (
    <nav className="topbar-nav-list guest-stage-nav" aria-label="Маршрут знакомства">
      {(['intro', 'onboarding'] as JourneyTab[]).map((item) => (
        <Button
          key={item}
          className={cn('tab', activeTab === item && 'active')}
          variant="ghost"
          type="button"
          onClick={() => setView(item)}
        >
          {item === 'intro' ? 'Знакомство' : 'Предпочтения'}
        </Button>
      ))}
    </nav>
  );

  const renderOnboardingProgress = () => {
    const percent = onboardingStep === 1 ? 50 : 100;
    const onBack = () => {
      if (onboardingStep === 2) {
        setOnboardingStep(1);
      } else if (editingPreferences) {
        cancelPreferencesEditing();
      } else {
        setView('intro');
      }
    };
    return (
      <div className="aroma-onboarding-progress" aria-label="Прогресс онбординга">
        <button
          type="button"
          className="aroma-onboarding-back"
          onClick={onBack}
          aria-label="Назад"
        >
          ←
        </button>
        <div
          className="aroma-onboarding-bar"
          role="progressbar"
          aria-label={`Шаг ${onboardingStep} из 2`}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={onboardingStep}
        >
          <span className="aroma-onboarding-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="aroma-onboarding-step" aria-hidden>
          {onboardingStep} из 2
        </span>
      </div>
    );
  };

  // Карточка для мастера (#289) — иконкой в шапке, а не панелью под ней: место на
  // экране нужнее самим миксам. Точка — метка, что карточка есть.
  const renderMasterCardButton = () => {
    const openCard = customSmoke
      ? () => {
          setCustomReturnView(view);
          setView('custom-confirmation');
        }
      : selectedMixCard && selectedMix
        ? () => openMix(selectedMixCard, selectedMix.source)
        : null;
    if (!openCard) {
      return null;
    }
    const name = customSmoke?.name ?? selectedMixCard?.name;
    return (
      <button
        type="button"
        className="topbar-icon-btn topbar-master-card"
        onClick={openCard}
        aria-label={`Карточка для мастера: ${name}`}
        title="Карточка для мастера"
      >
        <ClipboardList size={20} strokeWidth={1.8} aria-hidden />
        <span className="topbar-master-card-dot" aria-hidden />
      </button>
    );
  };

  const renderTopbar = () => {
    if (!accessGranted) {
      return null;
    }

    if (view === 'smoke-confirmation' || view === 'custom-confirmation' || view === 'mixer') {
      return null;
    }

    if (view === 'rail') {
      return null;
    }

    return (
      <header className="topbar">
        <div className="topbar-main-row">
          {renderBrand()}
          {renderMasterCardButton()}
        </div>
        {view === 'intro' ? renderJourneyNav('intro') : null}
        {view === 'onboarding' ? renderOnboardingProgress() : null}
      </header>
    );
  };

  const renderAccessView = () => {
    const codeReady = code.length >= 4;
    const cantSubmit = !ageConfirmed || !codeReady || accessStatus === 'loading';

    return (
      <section className="aroma-access">
        <div className="aroma-access-body">
          <div>
            <img className="aroma-access-mark" src="/logo-mark.svg" width="44" height="64" alt="" aria-hidden />
            <span className="aroma-access-brand">Арома<br />Ателье</span>
            <p className="aroma-access-tagline">Подбор кальянных миксов</p>
          </div>

          <form className="aroma-access-form" onSubmit={onSubmitAccessCode}>
            <div className="aroma-access-code-block">
              <label htmlFor="guest-access-code" className="aroma-access-code-label">
                Код мастера
              </label>
              <input
                id="guest-access-code"
                className="aroma-access-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={4}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <p className="aroma-access-code-hint">
                Код скажет мастер зала. Он действует до конца суток.
              </p>
            </div>

            <label className="aroma-access-age">
              <button
                type="button"
                role="checkbox"
                aria-checked={ageConfirmed}
                className={cn(
                  'aroma-access-age-dot',
                  ageConfirmed && 'aroma-access-age-dot-on',
                )}
                onClick={() => setAgeConfirmed(!ageConfirmed)}
              >
                {ageConfirmed ? <span aria-hidden>✓</span> : null}
              </button>
              <span className="aroma-access-age-text">
                Мне есть 18. Понимаю, что курение вредит здоровью.
              </span>
            </label>

            <CTA type="submit" disabled={cantSubmit} busy={accessStatus === 'loading'}>
              Войти в Ателье
            </CTA>

            {accessError ? (
              <p className="screen-status error aroma-access-error">{accessError}</p>
            ) : null}
          </form>

          <p className="aroma-access-footer">
            <span className="aroma-age-badge">18+</span>
            Курение вредит здоровью
          </p>
        </div>
      </section>
    );
  };

  const renderIntroView = () => {
    if (introStatus === 'loading') {
      return <SmokeLoading label="Загружаем знакомство" />;
    }
    if (introError) {
      return <p className="screen-status error">{introError}</p>;
    }
    if (!introCards.length) {
      return null;
    }

    // Одно окно вместо карусели: приветствие — последняя карточка знакомства,
    // остальные — короткий список того, что будет дальше.
    const welcome = introCards[introCards.length - 1];
    const steps = introCards.slice(0, -1);

    return (
      <div className="aroma-intro">
        <div className="aroma-intro-body">
          <div className="aroma-intro-content">
            <h1 className="aroma-intro-title">{welcome.title}</h1>
            <p className="aroma-intro-text">{welcome.description}</p>
          </div>
          {steps.length ? (
            <ol className="aroma-intro-steps">
              {steps.map((step, index) => (
                <li key={step.id} className="aroma-intro-step">
                  <span className="aroma-intro-step-num" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="aroma-intro-step-copy">
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="aroma-intro-dock">
          <CTA onClick={finishIntro}>
            Начать подбор
          </CTA>
          {!signedIn && canOfferLogin(botUsername) ? (
            <button
              type="button"
              className="cab-returning"
              disabled={login.phase === 'starting'}
              onClick={() => void beginLogin('intro', false)}
            >
              <span>Уже были у нас?</span>
              <span className="cab-returning-cta busy-inline">
                <BusyLabel busy={login.phase === 'starting'}>Войти через Telegram</BusyLabel>
              </span>
            </button>
          ) : null}
          {loginError ? (
            <p className="cab-error" role="alert">
              {loginError}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  // Выбор вкусов: онбординг или вкладка «Под настроение» (#388). Во вкладке
  // выбор живёт в черновике визита и не трогает сохранённые вкусы (#245).
  const renderTastePicker = (moodMode: boolean) => {
    const draft =
      moodMode && mood
        ? { profiles: mood.profiles, flavors: mood.flavors }
        : { profiles: likedProfiles, flavors: likedFlavors };
    const step = moodMode ? mood?.step ?? 1 : onboardingStep;
    const setStep = (next: 1 | 2) =>
      moodMode ? setMood((current) => current && { ...current, step: next }) : setOnboardingStep(next);
    const likedProfilesNow = draft.profiles;
    const likedFlavorsNow = draft.flavors;
    // Миксы, попадающие под текущий выбор. Семантика та же, что у фильтров
    // каталога: профиль ИЛИ-внутри-группы, между группами — И.
    const mixesUnderProfiles = likedProfilesNow.length
      ? onboardingMixes.filter((mix) =>
          mix.flavorProfiles.some((profile) => likedProfilesNow.includes(profile)),
        )
      : onboardingMixes;
    const matchingMixes = likedFlavorsNow.length
      ? mixesUnderProfiles.filter((mix) => mix.flavors.some((flavor) => likedFlavorsNow.includes(flavor)))
      : mixesUnderProfiles;
    // Вкус, которого нет ни в одном миксе с выбранными профилями, гасим — но
    // оставляем кликабельным, чтобы гость не упирался в тупик.
    const flavorGivesNothing = (flavor: string) =>
      likedProfilesNow.length > 0 && !mixesUnderProfiles.some((mix) => mix.flavors.includes(flavor));
    const catalogueIsEmpty = !onboardingMixes.length && optionsStatus === 'ready';

    const toggled = (current: string[], value: string) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    const toggleProfile = (value: string) =>
      moodMode
        ? setMood((current) => current && { ...current, profiles: toggled(current.profiles, value) })
        : setLikedProfiles((current) => toggled(current, value));
    const toggleFlavor = (value: string) =>
      moodMode
        ? setMood((current) => current && { ...current, flavors: toggled(current.flavors, value) })
        : setLikedFlavors((current) => toggled(current, value));
    const goNext = () => {
      if (step === 1) {
        setStep(2);
        return;
      }
      void submitOnboarding(moodMode);
    };
    const ctaDisabled =
      step === 1
        ? optionsStatus !== 'ready'
        : submitting || optionsStatus !== 'ready' || (likedFlavorsNow.length > 0 && !matchingMixes.length);
    const ctaLabel = step === 1 ? 'Далее' : 'Показать подбор';
    const flavorsHint = 'Можно пропустить. Бледные вкусы не встречаются в миксах с выбранными профилями.';

    const profileGrid = (
      <>
        {optionsStatus === 'loading' ? <SmokeLoading label="Загружаем профили" className="loading-smoke-block" /> : null}
        <div className="aroma-onboarding-profile-grid">
          {availableProfileOptions.map((option) => {
            const active = likedProfilesNow.includes(option.value);
            const color = getProfileColor(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={cn('aroma-profile-card', active && 'aroma-profile-card-on')}
                onClick={() => toggleProfile(option.value)}
                aria-pressed={active}
              >
                <span
                  className="aroma-profile-card-dot"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="aroma-profile-card-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      </>
    );
    const flavorChips = (
      <div className="aroma-onboarding-flavor-wrap">
        {options.flavors.map((flavor) => {
          const givesNothing = flavorGivesNothing(flavor);

          return (
            <Chip
              key={flavor}
              active={likedFlavorsNow.includes(flavor)}
              dimmed={givesNothing}
              ariaLabel={givesNothing ? `${flavor}, нет миксов с выбранными профилями` : undefined}
              onClick={() => toggleFlavor(flavor)}
            >
              {flavor}
            </Chip>
          );
        })}
      </div>
    );
    const errors = (
      <>
        {optionsError ? <p className="screen-status error">{optionsError}</p> : null}
        {submitError ? <p className="screen-status error">{submitError}</p> : null}
      </>
    );
    const tally = (
      <p className="aroma-onboarding-tally" aria-live="polite">
        {catalogueIsEmpty
          ? 'Картотека миксов пока пуста'
          : matchingMixes.length
            ? `${pluralize(matchingMixes.length, ['Подходит', 'Подходят', 'Подходят'])} ${matchingMixes.length} ${pluralizeMixes(matchingMixes.length)}`
            : 'Под такой набор миксов нет. Снимите один из вкусов.'}
      </p>
    );
    const cta = (
      <CTA onClick={goNext} disabled={ctaDisabled} busy={step === 2 && submitting}>
        {ctaLabel}
      </CTA>
    );

    if (moodMode) {
      return (
        <section className="aroma-recs fy-mood-pick">
          {renderRecsTabs()}
          {step === 1 ? (
            <>
              <p className="aroma-onboarding-hint">{MOOD_DRAFT_NOTE}</p>
              {profileGrid}
            </>
          ) : (
            <>
              <div className="fy-mood-step">
                <button type="button" className="aroma-rail-back" onClick={() => setStep(1)} aria-label="Назад к профилям">
                  ←
                </button>
                <p className="aroma-onboarding-hint">{flavorsHint}</p>
              </div>
              {flavorChips}
            </>
          )}
          {errors}
          <div className="aroma-onboarding-dock fy-mood-dock">
            {tally}
            {cta}
          </div>
        </section>
      );
    }

    return (
      <div className="aroma-onboarding">
        <div className="aroma-onboarding-body">
          {step === 1 ? (
            <>
              <h1 className="aroma-onboarding-title">С чего начнём?</h1>
              <p className="aroma-onboarding-hint">
                {catalogueIsEmpty
                  ? 'Миксов пока нет. Подбор появится, когда мастер их добавит.'
                  : 'Можно выбрать несколько.'}
              </p>
              {profileGrid}
            </>
          ) : (
            <>
              <h1 className="aroma-onboarding-title">Любимые ноты</h1>
              <p className="aroma-onboarding-hint">{flavorsHint}</p>
              {flavorChips}
            </>
          )}
          {errors}
        </div>

        <div className="aroma-onboarding-dock">
          {tally}
          {cta}
          {editingPreferences ? null : (
            <button
              type="button"
              className="aroma-onboarding-skip"
              onClick={() => {
                setOnboardingDone(true);
                setView('catalog');
              }}
            >
              Открыть каталог сразу
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRecsTabs = () => <RecsTabs value={recsTab} onChange={changeRecsTab} />;

  // Силуэт Подбора (#394): вкладки известны до ответа и стоят сразу.
  const renderRecsLoading = (prelude?: ReactNode) => (
    <section className="aroma-recs">
      {prelude}
      <Loading label="Загружаем подбор">
        <HeroSkeleton />
        <div className="aroma-recs-section-row">
          <h2 className="aroma-recs-section-title">Тоже подходят</h2>
        </div>
        <MixRowsSkeleton count={2} />
      </Loading>
    </section>
  );

  // Подбор: у вошедшего — вкладки «Для вас» (#245) и «Под настроение» этого
  // визита (#388), у анонима — подбор по вкусам устройства, как раньше.
  const renderRecommendationsView = () => {
    if (recsMode === 'pick') {
      return renderTastePicker(true);
    }
    if (recsMode === 'result' && mood?.items) {
      return renderOnboardingRecs(mood.items, 'ready', {
        source: 'mood',
        editChip: false,
        prelude: (
          <>
            {renderRecsTabs()}
            <div className="aroma-recs-section-row">
              <h2 className="aroma-recs-section-title">{moodTitle(mood)}</h2>
              <button type="button" className="aroma-text-link" onClick={editMood}>
                Изменить
              </button>
            </div>
          </>
        ),
      });
    }

    if (signedIn) {
      const { data } = forYou;
      if (!data) {
        return forYou.status === 'error' ? (
          <p className="screen-status error">{forYou.error}</p>
        ) : (
          renderRecsLoading(renderRecsTabs())
        );
      }
      if (data.mode === 'personal') {
        return (
          <ForYou
            slots={forYouSlots(data)}
            choosingId={pendingMixId}
            chooseDisabled={chooseStatus === 'loading'}
            onOpen={(mix) => openMix(mix, 'recommendations')}
            onChoose={(mix) => void onChooseMix(mix, 'recommendations')}
            tabs={renderRecsTabs()}
          />
        );
      }
      const hasTaste = data.onboarding.likedProfiles.length > 0 || data.onboarding.likedFlavors.length > 0;
      return renderOnboardingRecs(data.items, hasTaste ? 'ready' : 'idle', {
        source: 'recommendations',
        editChip: true,
        prelude: (
          <>
            {renderRecsTabs()}
            {data.items.length ? <p className="fy-cold">{COLD_NOTE}</p> : null}
          </>
        ),
      });
    }

    if (recommendationStatus === 'loading') {
      return renderRecsLoading();
    }
    if (recommendationError) {
      return <p className="screen-status error">{recommendationError}</p>;
    }
    return renderOnboardingRecs(recommendations, recommendationStatus, { source: 'recommendations', editChip: true });
  };

  const renderOnboardingRecs = (
    items: RecommendedMix[],
    status: 'idle' | 'loading' | 'ready' | 'error',
    { source, editChip, prelude }: { source: MixSource; editChip: boolean; prelude?: ReactNode },
  ) => {
    if (!items.length) {
      // Над вкладками уже есть h1.
      const EmptyTitle = prelude ? 'h2' : 'h1';
      return (
        <section className={cn('aroma-recs-empty', prelude && 'aroma-recs-empty-tabs')}>
          {prelude}
          <EmptyTitle className="aroma-recs-empty-title">
            {status === 'ready' ? 'Ничего не найдено' : 'Сначала выберите вкусы'}
          </EmptyTitle>
          <div className="aroma-recs-empty-actions">
            <CTA onClick={() => (source === 'mood' ? editMood() : openPreferencesEditing())}>
              {status === 'ready' ? 'Изменить вкусы' : 'Открыть предпочтения'}
            </CTA>
            <button
              type="button"
              className="aroma-onboarding-skip"
              onClick={() => setView('catalog')}
            >
              Открыть каталог
            </button>
          </div>
          {status === 'ready' ? (
            <MixerInvite note onOpen={() => openMixer('recommendations')} />
          ) : null}
        </section>
      );
    }

    const hasAnyMatch = items.some(
      (mix) => mix.matchedProfiles.length > 0 || mix.matchedFlavors.length > 0,
    );
    const [hero, ...rest] = items;
    const heroComponents = [...hero.components]
      .sort((left, right) => right.proportion - left.proportion)
      .slice(0, 4);

    return (
      <section className="aroma-recs">
        {prelude}
        {hasAnyMatch ? null : (
          <p className="aroma-recs-fallback-note">Точных совпадений нет. Вот самые близкие миксы.</p>
        )}
        <article className="aroma-recs-hero">
          <div className="aroma-recs-hero-head">
            <ProfileGlyph profiles={hero.flavorProfiles} size={64} />
            <div className="aroma-recs-hero-head-text">
              <h2 className="aroma-recs-hero-title">{hero.name}</h2>
              <p className="aroma-recs-hero-desc">{hero.description}</p>
            </div>
          </div>
          <SignatureBar profiles={hero.flavorProfiles} height={6} />
          <div className="aroma-recs-match-row">
            {hero.flavorProfiles.map((profile) => (
              <Chip
                key={`hero-profile-${profile}`}
                tier="sm"
                active={hero.matchedProfiles.includes(profile)}
                color={getProfileColor(profile)}
              >
                {formatProfileLabel(profile)}
              </Chip>
            ))}
            {hero.flavors.slice(0, 4).map((flavor) => (
              <Chip key={`hero-flavor-${flavor}`} tier="sm" active={hero.matchedFlavors.includes(flavor)}>
                {flavor}
              </Chip>
            ))}
          </div>
          {heroComponents.length ? (
            <div className="aroma-recs-composition">
              {heroComponents.map((component) => (
                <div className="aroma-recs-comp-row" key={component.id}>
                  {component.manufacturer ? (
                    <span className="aroma-recs-comp-maker">{component.manufacturer}</span>
                  ) : null}
                  <span className="aroma-recs-comp-name">{component.name}</span>
                  <span className="aroma-recs-comp-share">{Math.round(component.proportion)}%</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="aroma-recs-hero-meta">
            {hero.ratingsCount > 0 ? <RatingPill rating={hero.avgRating} /> : null}
            {hero.popularity > 0 ? (
              <span className="aroma-recs-hero-count">
                {`${hero.popularity} ${pluralize(hero.popularity, ['выбор', 'выбора', 'выборов'])}`}
              </span>
            ) : null}
          </div>
          <CTA
            busy={pendingMixId === hero.id}
            disabled={chooseStatus === 'loading'}
            onClick={() => void onChooseMix(hero, source)}
          >
            Покурить
          </CTA>
        </article>

        {rest.length || editChip ? (
          <div className="aroma-recs-section-row">
            {rest.length ? <h2 className="aroma-recs-section-title">Тоже подходят</h2> : <span />}
            {editChip ? (
              <button type="button" className="aroma-text-link" onClick={() => openPreferencesEditing()}>
                Изменить вкусы
              </button>
            ) : null}
          </div>
        ) : null}
        {rest.length ? (
          <div className="aroma-recs-list">
            {rest.slice(0, RECS_ON_SCREEN - 1).map((mix) => (
              <MixListRow
                key={mix.id}
                profiles={mix.flavorProfiles}
                name={mix.name}
                sub={
                  mix.flavors.length
                    ? mix.flavors.slice(0, 3).map((flavor, index) => (
                        <Fragment key={`${mix.id}-${flavor}`}>
                          {index ? ', ' : ''}
                          <span className={cn(mix.matchedFlavors.includes(flavor) && 'aroma-recs-flavor-on')}>
                            {flavor}
                          </span>
                        </Fragment>
                      ))
                    : null
                }
                aside={mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} /> : null}
                onClick={() => openMix(mix, source)}
              />
            ))}
          </div>
        ) : null}

        <MixerInvite note onOpen={() => openMixer('recommendations')} />
      </section>
    );
  };

  const renderShowcaseView = () => {
    if (showcaseStatus === 'loading') {
      return (
        <section className="aroma-showcase">
          <MixerInvite onOpen={() => openMixer('showcase')} />
          <Loading label="Загружаем витрину">
            {[210, 160, 180].map((width) => (
              <RailSkeleton key={width} titleWidth={width} />
            ))}
          </Loading>
        </section>
      );
    }
    if (showcaseError) {
      return <p className="screen-status error">{showcaseError}</p>;
    }
    if (!showcaseRails.length) {
      return (
        <section className="aroma-showcase">
          <MixerInvite onOpen={() => openMixer('showcase')} />
          <p className="screen-status">Подборки пока не опубликованы.</p>
        </section>
      );
    }

    // Полки по образцу Okko (#175): заголовок с шевроном открывает подборку,
    // под ним лента постеров, около двух на ширину экрана.
    return (
      <section className="aroma-showcase">
        <MixerInvite onOpen={() => openMixer('showcase')} />
        {dedupeRails(
          showcaseRails.map((rail) => ({ ...rail, mixes: rail.mixes.filter((mix) => mix.available) })),
        ).map((rail) => {
          const { mixes } = rail;
          const KindIcon = railKindIcon(rail);
          const openRail = () => {
            setSelectedRail(rail);
            setView('rail');
          };

          return (
            <section key={rail.id} className="aroma-showcase-rail">
              <h2 className="aroma-showcase-rail-head">
                <button
                  type="button"
                  className="aroma-showcase-rail-open"
                  onClick={openRail}
                  aria-label={railOpenLabel(rail)}
                >
                  <KindIcon className="aroma-showcase-rail-icon" size={16} strokeWidth={1.8} aria-hidden />
                  <span className="aroma-showcase-rail-title">{rail.name}</span>
                  <ChevronRight className="aroma-showcase-rail-chevron" size={22} strokeWidth={1.8} aria-hidden />
                </button>
              </h2>

              <div className="aroma-showcase-scroller">
                {mixes.map((mix) => {
                  const [firstProfile, secondProfile = firstProfile] = mix.flavorProfiles;
                  return (
                    <button
                      key={`${rail.id}:${mix.id}`}
                      type="button"
                      className="aroma-showcase-card"
                      onClick={() => openMix(mix, 'showcase')}
                      style={{
                        background: `radial-gradient(circle at 88% 0%, ${getProfileColor(firstProfile)}8c 0%, transparent 62%), radial-gradient(circle at 0% 100%, ${getProfileColor(secondProfile)}4d 0%, transparent 58%), var(--guest-card-bg)`,
                      }}
                    >
                      <span className="aroma-showcase-card-top">
                        <ProfileGlyph profiles={mix.flavorProfiles} size={28} />
                        {mix.ratingsCount > 0 ? (
                          <RatingPill rating={mix.avgRating} style={{ padding: '2px 7px', fontSize: 10.5 }} />
                        ) : null}
                      </span>
                      <span className="aroma-showcase-card-name">{mix.name}</span>
                      <span className="aroma-showcase-card-signature">
                        <SignatureBar profiles={mix.flavorProfiles} height={2} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
    );
  };

  const renderSmokeConfirmationView = () => {
    if (!selectedMixCard) {
      return (
        <section className="aroma-smoke-confirmation">
          <p className="screen-status">Микс не выбран.</p>
          <CTA onClick={() => setView('recommendations')}>К рекомендациям</CTA>
        </section>
      );
    }

    const mix = selectedMixCard;
    const doneView: GuestView =
      selectedMix?.source === 'history' || selectedMix?.source === 'favorites'
        ? 'cabinet'
        : selectedMix?.source === 'reels'
          ? 'reels'
          : 'recommendations';
    const components = [...mix.components].sort(
      (left, right) => right.proportion - left.proportion,
    );
    const profileLabels = mix.flavorProfiles
      .map((profile, index) =>
        index ? formatProfileLabel(profile).toLowerCase() : formatProfileLabel(profile),
      )
      .join(', ');

    return (
      <section className="aroma-smoke-confirmation">
        <div className="aroma-smoke-confirmation-topbar">
          <p className="aroma-smoke-confirmation-note">Покажите мастеру</p>
          <button
            type="button"
            className="aroma-smoke-confirmation-done"
            onClick={() => setView(doneView)}
          >
            Готово
          </button>
        </div>

        <div className="aroma-smoke-confirmation-stack">
          <ProfileGlyph profiles={mix.flavorProfiles} size={96} />
          <h1 className="aroma-smoke-confirmation-title">{mix.name}</h1>
          {profileLabels ? (
            <p className="aroma-smoke-confirmation-profiles">{profileLabels}</p>
          ) : null}
          <SignatureBar profiles={mix.flavorProfiles} height={3} />
        </div>

        {components.length ? (
          <section className="aroma-smoke-confirmation-composition" aria-label="Состав">
            <ul className="aroma-mix-sheet-comp-list">
              {components.map((component, index) => (
                <li key={component.id} className="aroma-mix-sheet-comp-row">
                  <span
                    className="aroma-mix-sheet-comp-dot"
                    style={{
                      background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length],
                    }}
                    aria-hidden
                  />
                  {component.manufacturer ? (
                    <span className="aroma-mix-sheet-comp-maker">{component.manufacturer}</span>
                  ) : null}
                  <span className="aroma-mix-sheet-comp-name">{component.name}</span>
                  <span className="aroma-mix-sheet-comp-share">
                    {formatPercent(component.proportion)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          className="aroma-mix-sheet-ghost aroma-smoke-confirmation-rate"
          onClick={() => setView(doneView)}
        >
          Оценить, когда соберут
        </button>
      </section>
    );
  };

  const renderRailView = () => {
    if (!selectedRail) {
      return (
        <section className="aroma-rail">
          <p className="screen-status">Подборка не выбрана.</p>
          <CTA onClick={() => setView('showcase')}>К витрине</CTA>
        </section>
      );
    }

    const rail = selectedRail;
    const railProfileSet = new Set<string>();
    rail.mixes.forEach((mix) => {
      mix.flavorProfiles.forEach((profile) => railProfileSet.add(profile));
    });
    const railProfileOptions = Array.from(railProfileSet);

    const toggleRailProfile = (profile: string) =>
      setRailProfileFilters((current) =>
        current.includes(profile)
          ? current.filter((item) => item !== profile)
          : [...current, profile],
      );

    const visibleMixes = railProfileFilters.length
      ? rail.mixes.filter((mix) =>
          mix.flavorProfiles.some((profile) => railProfileFilters.includes(profile)),
        )
      : rail.mixes;

    return (
      <section className="aroma-rail">
        <header className="aroma-rail-topbar">
          <button
            type="button"
            className="aroma-rail-back"
            onClick={() => setView('showcase')}
            aria-label="Назад к витрине"
          >
            ←
          </button>
        </header>

        <div className="aroma-rail-intro">
          <h1 className="aroma-rail-title">{rail.name}</h1>
          {rail.description ? (
            <p className="aroma-rail-desc">{rail.description}</p>
          ) : null}
        </div>

        {railProfileOptions.length ? (
          <div className="aroma-rail-chip-scroll">
            <Chip
              tier="lg"
              active={railProfileFilters.length === 0}
              onClick={() => setRailProfileFilters([])}
            >
              Все
            </Chip>
            {railProfileOptions.map((profile) => (
              <Chip
                key={profile}
                tier="lg"
                color={getProfileColor(profile)}
                active={railProfileFilters.includes(profile)}
                onClick={() => toggleRailProfile(profile)}
              >
                {formatProfileLabel(profile)}
              </Chip>
            ))}
          </div>
        ) : null}

        {!visibleMixes.length ? (
          <p className="screen-status">По выбранным профилям ничего не найдено.</p>
        ) : null}

        <div className="aroma-rail-list">
          {visibleMixes.map((mix) => (
            <MixListRow
              key={`${rail.id}:${mix.id}`}
              profiles={mix.flavorProfiles}
              name={mix.name}
              sub={mix.flavors.slice(0, 3).join(', ')}
              aside={mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} /> : null}
              onClick={() => openMix(mix, 'rail')}
            />
          ))}
        </div>
      </section>
    );
  };

  const renderCatalogView = () => {
    const removeCatalogFilter = (tag: CatalogFilterTag) =>
      setCatalogFilters((current) =>
        current.filter((item) => item.kind !== tag.kind || item.value !== tag.value),
      );
    const catalogFilterLabel = (tag: CatalogFilterTag) =>
      tag.kind === 'profile' ? formatProfileLabel(tag.value) : tag.value;
    const lastCatalogFilter = catalogFilters[catalogFilters.length - 1];
    const hasAnyFilter = Boolean(query.trim()) || catalogFilters.length > 0;
    const isEmpty = !filteredCatalogMixes.length && catalogStatus === 'ready';

    return (
      <section className="aroma-catalog">
        <div className="aroma-catalog-rail">
          <div className="aroma-catalog-search-row">
            <input
              type="search"
              className="aroma-catalog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              placeholder="Микс, вкус, табак"
              aria-label="Поиск по каталогу"
              enterKeyHint="search"
              autoComplete="off"
            />
            <button
              type="button"
              className={cn(
                'aroma-catalog-filter-btn',
                catalogFilters.length > 0 && 'aroma-catalog-filter-btn-on',
              )}
              onClick={() => setCatalogFiltersOpen(true)}
              aria-label={catalogFilters.length ? `Фильтры, выбрано ${catalogFilters.length}` : 'Фильтры'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M2 4h12M5 8h6M7 12h2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>Фильтры</span>
              {catalogFilters.length ? (
                <span className="aroma-catalog-filter-count">{catalogFilters.length}</span>
              ) : null}
            </button>
          </div>
          {catalogFilters.length ? (
            <div className="aroma-catalog-tags" role="group" aria-label="Выбранные фильтры">
              {catalogFilters.map((tag) => (
                <Chip
                  key={`${tag.kind}-${tag.value}`}
                  active
                  color={tag.kind === 'profile' ? getProfileColor(tag.value) : undefined}
                  ariaLabel={`Убрать фильтр ${catalogFilterLabel(tag)}`}
                  onClick={() => removeCatalogFilter(tag)}
                >
                  {catalogFilterLabel(tag)}
                  <span className="aroma-catalog-tag-x" aria-hidden>×</span>
                </Chip>
              ))}
            </div>
          ) : null}
        </div>

        {isEmpty ? null : (
          <div className="aroma-catalog-meta">
            <p className="aroma-catalog-count">
              {catalogStatus === 'loading' ? (
                <Sk className="sk-line" style={{ width: 64 }} />
              ) : (
                `${filteredCatalogMixes.length} ${pluralizeMixes(filteredCatalogMixes.length)}`
              )}
            </p>
            {hasAnyFilter ? (
              <button
                type="button"
                className="aroma-onboarding-skip"
                onClick={resetCatalogFilters}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        )}

        {catalogError ? <p className="screen-status error">{catalogError}</p> : null}
        {isEmpty ? (
          <div className="aroma-catalog-empty">
            <p className="aroma-catalog-empty-text">
              {lastCatalogFilter
                ? 'Ничего не найдено. Уберите один из фильтров.'
                : 'Ничего не найдено. Измените запрос.'}
            </p>
            <div className="aroma-catalog-empty-actions">
              {lastCatalogFilter ? (
                <>
                  <button
                    type="button"
                    className="aroma-catalog-empty-btn"
                    onClick={() => removeCatalogFilter(lastCatalogFilter)}
                  >
                    {`Убрать: ${catalogFilterLabel(lastCatalogFilter).toLowerCase()}`}
                  </button>
                  <button
                    type="button"
                    className="aroma-onboarding-skip"
                    onClick={resetCatalogFilters}
                  >
                    Сбросить всё
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="aroma-catalog-empty-btn"
                  onClick={() => setQuery('')}
                >
                  Очистить поиск
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="aroma-catalog-list">
          {catalogStatus === 'loading' && !filteredCatalogMixes.length ? (
            <Loading label="Загружаем каталог">
              <MixRowsSkeleton count={5} />
            </Loading>
          ) : null}
          {filteredCatalogMixes.map((mix) => (
            <MixListRow
              key={mix.id}
              profiles={mix.flavorProfiles}
              name={mix.name}
              sub={flavorsMatchedFirst(mix.flavors, query, catalogFlavors).slice(0, 3).join(', ')}
              aside={mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} /> : null}
              onClick={() => openMix(mix, 'catalog')}
            />
          ))}
        </div>
      </section>
    );
  };


  const renderCabinetView = () =>
    signedIn ? (
      <Cabinet
        me={me}
        loading={meStatus === 'loading'}
        error={cabinetError}
        notice={cabinetNotice}
        history={history}
        favorites={favorites}
        onOpen={openCabinetItem}
        onMoreHistory={() => void loadMoreHistory()}
        onGoRecs={() => setView('recommendations')}
        onEditTastes={() => openPreferencesEditing('cabinet')}
        onLogout={logout}
        onDelete={() => {
          setDeleteError('');
          setDeleteStatus('idle');
          setDeleteOpen(true);
        }}
      />
    ) : (
      <CabinetAnon
        canLogin={canOfferLogin(botUsername)}
        starting={login.phase === 'starting'}
        error={loginError}
        onLogin={() => void beginLogin('cabinet', true)}
      />
    );

  const renderLoginView = () => (
    <LoginWait
      expired={login.phase !== 'waiting'}
      botUrl={login.phase === 'waiting' ? login.botUrl : ''}
      restarting={login.phase === 'starting'}
      onRestart={() => {
        if (login.phase === 'expired') {
          void beginLogin(login.origin, login.consent);
        }
      }}
      onCancel={cancelLogin}
    />
  );

  // Нижняя панель (#168) — на табах и в подборке; из неё же Миксер, который вернёт сюда.
  const navReturnView: MixerReturnView | null =
    view === 'recommendations' ||
    view === 'showcase' ||
    view === 'reels' ||
    view === 'catalog' ||
    view === 'rail' ||
    view === 'cabinet'
      ? view
      : null;

  const openTab = (tab: Exclude<BottomNavTab, 'mixer'>) => {
    setCabinetNotice('');
    setLoginError('');
    if (tab === 'reels') {
      void openReels();
    } else {
      setView(tab);
    }
  };

  const renderBottomNav = () =>
    navReturnView ? (
      <BottomNav
        value={navReturnView === 'rail' ? 'showcase' : navReturnView}
        onChange={(tab) => (tab === 'mixer' ? openMixer(navReturnView) : openTab(tab))}
      />
    ) : null;

  // Лента «Рилсы» (#263): на всю высоту над панелью, без шапки «Арома Ателье».
  const renderReelsView = () => {
    if (reels.status === 'error' && !reels.items.length) {
      return <p className="screen-status error reels-status">{reels.error}</p>;
    }
    if (reels.status !== 'ready') {
      return <SmokeLoading label="Собираем ленту" className="reels-status" />;
    }
    if (!reels.items.length && !reels.continues) {
      return <FeedEmpty onRecs={() => setView('recommendations')} />;
    }
    return (
      <Feed
        key={reels.loadId}
        items={reels.items}
        index={Math.max(0, Math.min(reelIndex, reels.items.length - 1))}
        onIndexChange={(next) => {
          setReelIndex(next);
          setReelSwiped(true);
          setReelChoice(null);
        }}
        hint={!reelSwiped}
        goneIds={goneReels}
        choice={reelChoice}
        onOpen={(mix) => openMix(mix, 'reels')}
        onChoose={(mix) => void onChooseReel(mix)}
        isFavorite={isFavoriteMix}
        onFavorite={(mix) => void toggleFavorite(mixToCabinetItem(mix))}
        onMixer={() => openMixer('reels')}
        onBack={reels.continues ? backToRecs : null}
      />
    );
  };

  return (
    <div className="app-bg">
      <div className="phone-shell">
        {!accessGranted ? (
          renderAccessView()
        ) : view === 'smoke-confirmation' ? (
          renderSmokeConfirmationView()
        ) : view === 'custom-confirmation' && customSmoke ? (
          <section className="mixer">
            <MixerMasterCard
              name={customSmoke.name}
              profiles={customSmoke.profiles}
              components={customSmoke.components}
              harmony={customSmoke.harmony}
              footnote={null}
              onDone={() => setView(customReturnView)}
            />
          </section>
        ) : view === 'reels' ? (
          <>
            {renderReelsView()}
            {renderBottomNav()}
          </>
        ) : view === 'mixer' ? (
          <MixerScreen
            likedProfiles={likedProfiles}
            onSmoked={(card) => {
              setCustomSmoke(card);
              setSelectedMix(null);
            }}
            onExit={() => {
              // В «Намиксуй» гость мог нажать «Покурить» — это тоже выбор для «Для вас».
              invalidateForYou();
              setView(mixerReturnView);
            }}
            onNavigate={(tab) => {
              invalidateForYou();
              openTab(tab);
            }}
            canOpenMix={(mixId) => Boolean(findCatalogMix(mixId))}
            onOpenMix={(mixId) => {
              const mix = findCatalogMix(mixId);
              if (mix) openMix(mix, 'catalog');
            }}
          />
        ) : (
          <>
            {renderTopbar()}
            <div className="pull-host" data-pulling={recsTravel ? '' : undefined}>
              <main
                ref={mainRef}
                className={cn(
                  'content',
                  (view === 'intro' || view === 'onboarding') && `content-${view}`,
                  view === 'recommendations' && recsMode === 'pick' && 'content-mood-pick',
                )}
                style={recsTravel ? { transform: `translateY(${-recsTravel / 2}px)` } : undefined}
              >
                {view === 'intro' ? renderIntroView() : null}
                {view === 'onboarding' ? renderTastePicker(false) : null}
                {view === 'recommendations' && chooseError && !mixModalState ? (
                  <p className="screen-status error">{chooseError}</p>
                ) : null}
                {view === 'recommendations' ? renderRecommendationsView() : null}
                {view === 'recommendations' && continuation ? (
                  <ReelsTeaser
                    label={continuation.length ? `Ещё ${continuation.length} ${pluralizeMixes(continuation.length)} в рилсах` : 'Других миксов нет'}
                    onOpen={() => void openReels()}
                  />
                ) : null}
                {view === 'showcase' ? renderShowcaseView() : null}
                {view === 'catalog' ? renderCatalogView() : null}
                {view === 'rail' ? renderRailView() : null}
                {view === 'cabinet' ? renderCabinetView() : null}
                {view === 'login' ? renderLoginView() : null}
              </main>
              <PullPeek edge="bottom" travel={recsTravel} mix={continuation?.[0] ?? null} />
            </div>
            {renderBottomNav()}
          </>
        )}
      </div>

      {catalogFiltersOpen ? (
        <CatalogFiltersSheet
          profiles={byCountDesc(
            availableProfileOptions.map((option) => option.value),
            options.profileCounts,
            formatProfileLabel,
          )}
          flavors={byCountDesc(options.flavors, options.flavorCounts)}
          selected={catalogFilters}
          resultCount={filteredCatalogMixes.length}
          onToggle={(tag) =>
            setCatalogFilters((current) =>
              current.some((item) => item.kind === tag.kind && item.value === tag.value)
                ? current.filter((item) => item.kind !== tag.kind || item.value !== tag.value)
                : [...current, tag],
            )
          }
          onReset={() => setCatalogFilters([])}
          onClose={() => setCatalogFiltersOpen(false)}
        />
      ) : null}

      <DeleteCabinetSheet
        open={deleteOpen && signedIn}
        deleting={deleteStatus === 'loading'}
        error={deleteError}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDeleteCabinet()}
      />

      <MixDetailModal
        state={mixModalState}
        favorite={modalFavorite}
        onFavorite={() => {
          if (mixModalState) void toggleFavorite(mixModalState.item ?? mixToCabinetItem(mixModalState.mix));
        }}
        selectedMixId={selectedMix?.id ?? ''}
        chooseStatus={chooseStatus}
        chooseError={chooseError}
        ratingValue={ratingValue}
        ratingStatus={ratingStatus}
        ratingError={ratingError}
        ratingMessage={ratingMessage}
        onClose={() => setMixModalState(null)}
        onChoose={() => {
          const item = mixModalState?.item;
          if (item?.ref.kind === 'custom' && item.card) {
            void onSmokeCustom(item, item.card);
          } else if (mixModalState) {
            void onChooseMix(mixModalState.mix, mixModalState.source);
          }
        }}
        onRate={(value) => void onSaveRating(value)}
      />

      <AnonFavoriteSheet open={anonHeartOpen && !signedIn} onClose={() => setAnonHeartOpen(false)} onLogin={loginFromHeart} />
    </div>
  );
};
