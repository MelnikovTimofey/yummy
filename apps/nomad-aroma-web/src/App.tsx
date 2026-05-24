import { FormEvent, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Chip, CTA, ProfileGlyph, RatingPill, SignatureBar } from '@/components/aroma';
import { getProfileColor } from '@/lib/profile-color';
import { cn } from '@/lib/utils';

type GuestView =
  | 'access'
  | 'intro'
  | 'onboarding'
  | 'recommendations'
  | 'showcase'
  | 'catalog'
  | 'rail'
  | 'smoke-confirmation';
type AppTab = 'recommendations' | 'showcase' | 'catalog';
type JourneyTab = 'intro' | 'onboarding';
type RailType = 'statistical' | 'prepared' | 'curated';
type MixSource = 'recommendations' | 'showcase' | 'catalog' | 'rail';

type OnboardingOptions = {
  profiles: string[];
  flavors: string[];
};

type CatalogFilters = {
  profiles?: string[];
  flavors?: string[];
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
};

type MixRatingResult = {
  ok: true;
  mixId: string;
  value: number;
  averageRating?: number;
  ratingCount?: number;
  message?: string;
};

type CatalogSort = 'popularity' | 'rating' | 'newest';

type MixModalState = {
  mix: MixCard;
  source: MixSource;
};

type ProfileOption = {
  value: string;
  label: string;
};

const storageKeys = {
  ageConfirmed: 'nomad-aroma-age-confirmed',
  accessGranted: 'nomad-aroma-access-granted',
  introSeen: 'nomad-aroma-intro-seen',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const profileOptions: ProfileOption[] = [
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
  { value: 'minty', label: 'Мятный' },
  { value: 'fruity', label: 'Фруктовый' },
  { value: 'floral_herbal', label: 'Цветочно-травяной' },
  { value: 'citrus', label: 'Цитрусовый' },
  { value: 'berry', label: 'Ягодный' },
  { value: 'perfume', label: 'Парфюмный' },
];

const profileLabelMap = profileOptions.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const railToneLabels: Record<RailType, string> = {
  statistical: 'Выбор гостей',
  prepared: 'Редакция',
  curated: 'Мастера',
};

const mixSourceLabels: Record<MixSource, string> = {
  recommendations: 'Подбор для вас',
  showcase: 'Из витрины',
  catalog: 'Из каталога',
  rail: 'Из подборки',
};

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'newest', label: 'Сначала новое' },
];

const railDescriptions: Record<RailType, string> = {
  statistical: 'Миксы, к которым гости возвращаются чаще всего.',
  prepared: 'Подборка для быстрого старта в стилистике Nomad Lounge.',
  curated: 'Выразительные сочетания, которые чаще советуют мастера зала.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unique = (items: string[]): string[] => Array.from(new Set(items));


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

const extractErrorMessage = (payload: unknown, fallback: string) => {
  if (isRecord(payload) && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallback;
};

const buildCatalogQuery = (filters: CatalogFilters) => {
  const params = new URLSearchParams();

  unique((filters.profiles ?? []).map((item) => item.trim()).filter(Boolean)).forEach((profile) => {
    params.append('profiles', profile);
  });
  unique((filters.flavors ?? []).map((item) => item.trim()).filter(Boolean)).forEach((flavor) => {
    params.append('flavors', flavor);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
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
            : 'Nomad',
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

const requestJson = async <T,>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers ?? {});

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Запрос не выполнен'));
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

const fetchOnboardingOptions = async () => {
  const payload = await requestJson<unknown>('/guest/onboarding/options');
  const record = isRecord(payload) ? payload : {};

  return {
    profiles: toStringList(record.profiles ?? record.items ?? record.flavorProfiles),
    flavors: toStringList(record.flavors ?? record.items ?? record.flavorTags),
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

const fetchCatalogMixes = async (filters: CatalogFilters = {}) => {
  const payload = await requestJson<unknown>(`/guest/catalog/mixes${buildCatalogQuery(filters)}`);
  return extractCollection(payload, ['items', 'mixes', 'catalog']).map((item, index) => normalizeMix(item, index));
};

const fetchRecommendations = async (payload: { likedProfiles: string[]; likedFlavors: string[] }) => {
  const response = await requestJson<unknown>('/guest/onboarding/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const record = isRecord(response) ? response : {};
  return extractCollection(record, ['items', 'mixes']).map((item, index) => normalizeMix(item, index));
};

const sendSmokeCta = async (mixId: string) => {
  const payload = await requestJson<unknown>('/guest/events/smoke-cta', {
    method: 'POST',
    body: JSON.stringify({ mixId }),
  });

  return payload as { ok: true };
};

const sendMixRating = async (mixId: string, value: number) => {
  const payload = await requestJson<unknown>(`/guest/mixes/${mixId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });

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

const COMPOSITION_PALETTE = ['#d8ab68', '#c08a4a', '#a23048', '#7a9560', '#7fb5a3'];

const pluralizeMixes = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'микс';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'микса';
  return 'миксов';
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
  onClose,
  onChoose,
  onRate,
}: {
  state: MixModalState | null;
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

  if (!mix || !source) {
    return null;
  }

  const isSelected = selectedMixId === mix.id;
  const components = [...mix.components].sort(
    (left, right) => right.proportion - left.proportion,
  );
  const totalProportion = components.reduce((sum, item) => sum + item.proportion, 0) || 1;
  const haloColor = getProfileColor(mix.flavorProfiles[0]);

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet"
        style={{
          top: 'auto',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(calc(100vw - 16px), 540px)',
          maxHeight: '92dvh',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom))',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflowY: 'auto',
          background: `radial-gradient(circle at 88% 0%, ${haloColor}50 0%, transparent 50%), linear-gradient(180deg, rgba(40,15,16,0.98) 0%, rgba(20,9,10,0.98) 100%)`,
        }}
      >
        <span className="aroma-mix-sheet-handle" aria-hidden />
        <DialogDescription className="sr-only">
          Карточка микса с составом, рейтингом и действием «Покурить».
        </DialogDescription>

        <div className="aroma-mix-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-mix-sheet-head-text">
            <p className="aroma-caps">{mixSourceLabels[source]}</p>
            <DialogTitle className="aroma-mix-sheet-title">{mix.name}</DialogTitle>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
        </div>

        {mix.description ? (
          <p className="aroma-mix-sheet-desc">{mix.description}</p>
        ) : null}

        {mix.flavorProfiles.length || mix.flavors.length ? (
          <div className="aroma-mix-sheet-tags">
            {mix.flavorProfiles.slice(0, 3).map((profile) => (
              <Chip
                key={`profile-${profile}`}
                tier="lg"
                active
                color={getProfileColor(profile)}
              >
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
            <p className="aroma-caps">Состав микса</p>
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
                  <span className="aroma-caps aroma-mix-sheet-comp-maker">
                    {component.manufacturer}
                  </span>
                  <span className="aroma-mix-sheet-comp-name">{component.name}</span>
                  <span className="aroma-mix-sheet-comp-share">
                    {formatPercent(component.proportion)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="aroma-mix-sheet-rating">
          <p className="aroma-caps">Ваша оценка</p>
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

        {!mix.available ? (
          <p className="screen-status error">Этот микс сейчас недоступен по наличию.</p>
        ) : null}
        {chooseError ? <p className="screen-status error">{chooseError}</p> : null}

        <div className="aroma-mix-sheet-actions">
          <button
            type="button"
            className="aroma-mix-sheet-ghost"
            onClick={onClose}
          >
            Закрыть
          </button>
          <CTA
            pulse={mix.available && !isSelected && chooseStatus !== 'loading'}
            disabled={!mix.available || chooseStatus === 'loading' || isSelected}
            onClick={onChoose}
          >
            {chooseStatus === 'loading'
              ? 'Сохраняем…'
              : isSelected
                ? 'Уже в карточке'
                : 'Покурить'}
          </CTA>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const App = () => {
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(storageKeys.ageConfirmed) === 'true');
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(storageKeys.accessGranted) === 'true');
  const [introSeen, setIntroSeen] = useState(() => localStorage.getItem(storageKeys.introSeen) === 'true');
  const [view, setView] = useState<GuestView>(() => {
    const granted = localStorage.getItem(storageKeys.accessGranted) === 'true';
    const seen = localStorage.getItem(storageKeys.introSeen) === 'true';
    return granted ? (seen ? 'onboarding' : 'intro') : 'access';
  });

  const [code, setCode] = useState('');
  const [accessStatus, setAccessStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [accessError, setAccessError] = useState('');

  const [introCards, setIntroCards] = useState<IntroCard[]>([]);
  const [introStatus, setIntroStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [introError, setIntroError] = useState('');
  const [introIndex, setIntroIndex] = useState(0);

  const [options, setOptions] = useState<OnboardingOptions>({ profiles: [], flavors: [] });
  const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [optionsError, setOptionsError] = useState('');
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [likedFlavors, setLikedFlavors] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);

  const [recommendations, setRecommendations] = useState<MixCard[]>([]);
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
  const [chooseError, setChooseError] = useState('');
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');

  const [selectedRail, setSelectedRail] = useState<HomeRail | null>(null);

  const [query, setQuery] = useState('');
  const [appliedCatalogProfiles, setAppliedCatalogProfiles] = useState<string[]>([]);
  const [appliedCatalogFlavors, setAppliedCatalogFlavors] = useState<string[]>([]);
  const [appliedSortBy, setAppliedSortBy] = useState<CatalogSort>('popularity');
  const [catalogPopoverOpen, setCatalogPopoverOpen] = useState(false);
  const [activeShowcaseRailId, setActiveShowcaseRailId] = useState<string | null>(null);
  const [railProfileFilters, setRailProfileFilters] = useState<string[]>([]);

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
    if (!accessGranted) {
      setView('access');
      return;
    }

    if (view === 'access') {
      setView(introSeen ? 'onboarding' : 'intro');
    }
  }, [accessGranted, introSeen, view]);

  const loadIntroCards = async () => {
    setIntroStatus('loading');
    setIntroError('');

    try {
      const items = await fetchIntroCards();
      setIntroCards(items);
      setIntroStatus('ready');
    } catch (cause) {
      setIntroStatus('error');
      setIntroError(cause instanceof Error ? cause.message : 'Не удалось загрузить знакомство');
    }
  };

  const loadOnboardingOptions = async () => {
    setOptionsStatus('loading');
    setOptionsError('');

    try {
      const nextOptions = await fetchOnboardingOptions();
      setOptions(nextOptions);
      setOptionsStatus('ready');
    } catch (cause) {
      setOptionsStatus('error');
      setOptionsError(cause instanceof Error ? cause.message : 'Не удалось загрузить варианты вкусов');
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
      setShowcaseError(cause instanceof Error ? cause.message : 'Не удалось загрузить витрину');
    }
  };

  const loadCatalog = async (filters: CatalogFilters = {}) => {
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;
    setCatalogStatus('loading');
    setCatalogError('');

    try {
      const mixes = await fetchCatalogMixes(filters);
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
      setCatalogError(cause instanceof Error ? cause.message : 'Не удалось загрузить каталог');
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

    void loadCatalog({
      profiles: appliedCatalogProfiles,
      flavors: appliedCatalogFlavors,
    });
  }, [accessGranted, appliedCatalogProfiles, appliedCatalogFlavors]);

  useEffect(() => {
    if (view === 'onboarding') {
      setOnboardingStep(1);
    }
  }, [view]);

  useEffect(() => {
    if (!showcaseRails.length) {
      if (activeShowcaseRailId !== null) {
        setActiveShowcaseRailId(null);
      }
      return;
    }
    if (!showcaseRails.some((rail) => rail.id === activeShowcaseRailId)) {
      setActiveShowcaseRailId(showcaseRails[0].id);
    }
  }, [showcaseRails, activeShowcaseRailId]);

  useEffect(() => {
    setRailProfileFilters([]);
  }, [selectedRail?.id]);

  const updateMixInList = (items: MixCard[], mixId: string, updater: (mix: MixCard) => MixCard) =>
    items.map((mix) => (mix.id === mixId ? updater(mix) : mix));

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
    setAppliedCatalogProfiles([]);
    setAppliedCatalogFlavors([]);
    setAppliedSortBy('popularity');
  };

  const primeCatalogFromOnboarding = (profiles: string[], flavors: string[]) => {
    setAppliedCatalogProfiles(profiles);
    setAppliedCatalogFlavors(flavors);
    setQuery('');
    setAppliedSortBy('popularity');
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
      setView(introSeen ? 'onboarding' : 'intro');
      setAccessStatus('success');
    } catch (cause) {
      setAccessStatus('error');
      setAccessError(cause instanceof Error ? cause.message : 'Не удалось проверить код доступа.');
    }
  };

  const submitOnboarding = async () => {
    if (!likedProfiles.length && !likedFlavors.length) {
      setRecommendationStatus('error');
      setRecommendationError('Выберите хотя бы один профиль или вкус.');
      return;
    }

    setRecommendationStatus('loading');
    setRecommendationError('');

    try {
      const nextRecommendations = await fetchRecommendations({
        likedProfiles,
        likedFlavors,
      });
      setRecommendations(nextRecommendations);
      setRecommendationStatus('ready');
      setView('recommendations');
      primeCatalogFromOnboarding([...likedProfiles], [...likedFlavors]);
    } catch (cause) {
      setRecommendationStatus('error');
      setRecommendationError(cause instanceof Error ? cause.message : 'Не удалось собрать рекомендации.');
    }
  };

  const openMix = (mix: MixCard, source: MixSource) => {
    setMixModalState({ mix, source });
    setChooseStatus(selectedMix?.id === mix.id ? 'ready' : 'idle');
    setChooseError('');
    setRatingStatus('idle');
    setRatingError('');
    setRatingMessage('');
    setRatingValue(null);
  };

  const onChooseMix = async (mix: MixCard, source: MixSource) => {
    setChooseStatus('loading');
    setChooseError('');
    const previousMix = selectedMix;

    try {
      await sendSmokeCta(mix.id);
      setSelectedMix({
        id: mix.id,
        source,
      });
      setChooseStatus('ready');
      setMixModalState(null);
      setView('smoke-confirmation');
    } catch (cause) {
      setSelectedMix(previousMix);
      setChooseStatus('error');
      setChooseError(cause instanceof Error ? cause.message : 'Не удалось зафиксировать "Выбрать".');
    }
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
      syncMixEverywhere(mixModalState.mix.id, (mix) => ({
        ...mix,
        avgRating: Number.isFinite(result.averageRating ?? Number.NaN) ? (result.averageRating as number) : mix.avgRating,
      }));
      setRatingStatus('ready');
      setRatingMessage(result.message ?? `Оценка ${result.value} сохранена.`);
    } catch (cause) {
      setRatingStatus('error');
      setRatingError(cause instanceof Error ? cause.message : 'Не удалось сохранить оценку.');
    }
  };

  const onResetAccess = () => {
    setAccessGranted(false);
    setAccessStatus('idle');
    setAccessError('');
    setCode('');
    setView('access');
    setRecommendations([]);
    setRecommendationStatus('idle');
    setRecommendationError('');
    setSelectedMix(null);
    setMixModalState(null);
    setChooseStatus('idle');
    setChooseError('');
    setRatingStatus('idle');
    setRatingError('');
    setRatingMessage('');
    setRatingValue(null);
    setSelectedRail(null);
    resetCatalogFilters();
  };

  const availableProfileOptions = profileOptions.filter((option) =>
    !options.profiles.length || options.profiles.includes(option.value),
  );

  const filteredCatalogMixes = catalogSourceMixes
    .filter((mix) => mix.available)
    .filter((mix) => {
      if (!query) {
        return true;
      }

      const haystack = [
        mix.name,
        mix.description,
        ...mix.flavors,
        ...mix.components.map((component) => component.name),
        ...mix.components.map((component) => component.manufacturer),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query.toLowerCase());
    })
    .filter((mix) =>
      !appliedCatalogProfiles.length ? true : mix.flavorProfiles.some((profile) => appliedCatalogProfiles.includes(profile)),
    )
    .filter((mix) => (!appliedCatalogFlavors.length ? true : mix.flavors.some((flavor) => appliedCatalogFlavors.includes(flavor))))
    .sort((left, right) => {
      if (appliedSortBy === 'rating' && right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      if (appliedSortBy === 'newest') {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      if (right.popularity !== left.popularity) {
        return right.popularity - left.popularity;
      }

      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      return left.name.localeCompare(right.name, 'ru');
    });

  const selectedMixCard =
    selectedMix?.id
      ? recommendations
          .concat(catalogSourceMixes)
          .concat(showcaseRails.flatMap((rail) => rail.mixes))
          .find((mix) => mix.id === selectedMix.id) ?? null
      : null;

  const renderBrand = () => (
    <Button variant="ghost" type="button" className="brand-wrap brand-home-btn" onClick={() => setView(accessGranted ? 'recommendations' : 'access')}>
      <div>
        <p className="brand">nomad</p>
        <p className="tagline">лаунж · арома ателье</p>
      </div>
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
        <div className="aroma-onboarding-bar" role="progressbar" aria-valuemin={0} aria-valuemax={2} aria-valuenow={onboardingStep}>
          <span className="aroma-onboarding-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="aroma-caps aroma-onboarding-count">{`${onboardingStep}/2`}</span>
      </div>
    );
  };

  const renderAppNav = (activeTab: AppTab) => (
    <nav className="topbar-nav-list guest-app-nav" aria-label="Гостевая навигация">
      {([
        { key: 'recommendations', label: 'Подбор' },
        { key: 'showcase', label: 'Витрина' },
        { key: 'catalog', label: 'Каталог' },
      ] as Array<{ key: AppTab; label: string }>).map((item) => (
        <Button
          key={item.key}
          className={cn('tab', activeTab === item.key && 'active')}
          variant="ghost"
          type="button"
          onClick={() => setView(item.key)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );

  const renderTopbar = () => {
    if (!accessGranted) {
      return null;
    }

    if (view === 'smoke-confirmation') {
      return null;
    }

    if (view === 'rail') {
      return null;
    }

    const activeTab: AppTab | null =
      view === 'recommendations' || view === 'showcase' || view === 'catalog'
        ? view
        : null;

    return (
      <header className="topbar">
        <div className="topbar-main-row topbar-main-row-compact">
          {renderBrand()}
          <div className="topbar-right">
            <Button className="header-auth-btn" variant="outline" type="button" onClick={onResetAccess}>
              Новый код
            </Button>
          </div>
        </div>
        {view === 'intro' ? renderJourneyNav('intro') : null}
        {view === 'onboarding' ? renderOnboardingProgress() : null}
        {activeTab ? renderAppNav(activeTab) : null}
      </header>
    );
  };

  const renderAccessView = () => {
    const codeReady = code.length >= 4;
    const cantSubmit = !ageConfirmed || !codeReady || accessStatus === 'loading';

    return (
      <section className="aroma-access">
        <div className="aroma-access-halo" aria-hidden />
        <div className="aroma-access-body">
          <div>
            <span className="aroma-access-brand">nomad</span>
            <p className="aroma-access-tagline">Арома Ателье · Лаундж</p>
          </div>

          <form className="aroma-access-form" onSubmit={onSubmitAccessCode}>
            <div className="aroma-access-code-block">
              <label htmlFor="guest-access-code" className="aroma-caps aroma-access-code-label">
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
                Спросите у мастера зала — действует до 06:00.
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

            <CTA
              type="submit"
              disabled={cantSubmit}
              pulse={!cantSubmit}
            >
              {accessStatus === 'loading' ? 'Проверяем код…' : 'Войти в Ателье'}
            </CTA>

            {accessError ? (
              <p className="screen-status error aroma-access-error">{accessError}</p>
            ) : null}
          </form>

          <p className="aroma-access-footer">18+ · Курение вредит здоровью</p>
        </div>
      </section>
    );
  };

  const renderIntroView = () => {
    if (introStatus === 'loading') {
      return <p className="screen-status">Загружаем знакомство...</p>;
    }
    if (introError) {
      return <p className="screen-status error">{introError}</p>;
    }
    if (!introCards.length) {
      return null;
    }

    const currentIndex = Math.min(introIndex, introCards.length - 1);
    const card = introCards[currentIndex];
    const isLast = currentIndex === introCards.length - 1;
    const totalLabel = String(introCards.length).padStart(2, '0');
    const stepLabel = String(currentIndex + 1).padStart(2, '0');

    const goNext = () => {
      if (isLast) {
        finishIntro();
        return;
      }
      setIntroIndex(currentIndex + 1);
    };

    return (
      <div className="aroma-intro">
        <span className="aroma-intro-watermark" aria-hidden>{stepLabel}</span>

        <div className="aroma-intro-body">
          <p className="aroma-caps aroma-intro-caps">{`Шаг ${stepLabel} · из ${totalLabel}`}</p>
          <div className="aroma-intro-content">
            <h1 className="aroma-intro-title">{card.title}</h1>
            <p className="aroma-intro-text">{card.description}</p>
          </div>
        </div>

        <div className="aroma-intro-dock">
          <div className="aroma-intro-pips" role="tablist" aria-label="Прогресс знакомства">
            {introCards.map((_, i) => (
              <span
                key={i}
                className={cn('aroma-intro-pip', i === currentIndex && 'aroma-intro-pip-active')}
                aria-hidden
              />
            ))}
          </div>
          <CTA pulse={isLast} onClick={goNext}>
            {isLast ? 'Перейти к подбору' : 'Дальше'}
          </CTA>
          {!isLast && (
            <button
              type="button"
              className="aroma-intro-skip"
              onClick={finishIntro}
            >
              Пропустить знакомство
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOnboardingView = () => {
    const toggleProfile = (value: string) =>
      setLikedProfiles((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    const toggleFlavor = (value: string) =>
      setLikedFlavors((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    const goNext = () => {
      if (onboardingStep === 1) {
        setOnboardingStep(2);
        return;
      }
      void submitOnboarding();
    };
    const ctaDisabled =
      onboardingStep === 1
        ? optionsStatus !== 'ready'
        : recommendationStatus === 'loading' || optionsStatus !== 'ready';
    const ctaLabel =
      onboardingStep === 1
        ? 'Далее'
        : recommendationStatus === 'loading'
          ? 'Собираем подбор…'
          : 'Показать подбор';

    return (
      <div className="aroma-onboarding">
        <div className="aroma-onboarding-body">
          {onboardingStep === 1 ? (
            <>
              <p className="aroma-caps">Шаг 1 · Профили</p>
              <h1 className="aroma-onboarding-title">С чего начнём?</h1>
              <p className="aroma-onboarding-hint">
                Несколько касаний по профилям, и мы поймём, в какую сторону смотреть.
              </p>
              {optionsStatus === 'loading' ? (
                <p className="screen-status">Подтягиваем доступные профили…</p>
              ) : null}
              <div className="aroma-onboarding-profile-grid">
                {availableProfileOptions.map((option) => {
                  const active = likedProfiles.includes(option.value);
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
                        style={{
                          background: color,
                          boxShadow: active ? `0 0 0 4px ${color}22` : undefined,
                        }}
                        aria-hidden
                      />
                      <span className="aroma-profile-card-label">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="aroma-caps">Шаг 2 · Вкусы</p>
              <h1 className="aroma-onboarding-title">Любимые ноты</h1>
              <p className="aroma-onboarding-hint">
                Опционально — но так подбор станет точнее.
              </p>
              <div className="aroma-onboarding-flavor-wrap">
                {options.flavors.map((flavor) => (
                  <Chip
                    key={flavor}
                    active={likedFlavors.includes(flavor)}
                    onClick={() => toggleFlavor(flavor)}
                  >
                    {flavor}
                  </Chip>
                ))}
              </div>
              {likedProfiles.length ? (
                <div className="aroma-onboarding-selected">
                  <p className="aroma-caps">Сейчас выбрано</p>
                  <div className="aroma-onboarding-selected-row">
                    {likedProfiles.map((profileId) => (
                      <span key={profileId} className="aroma-onboarding-profile-tag">
                        <span
                          className="aroma-onboarding-profile-tag-dot"
                          style={{ background: getProfileColor(profileId) }}
                          aria-hidden
                        />
                        {formatProfileLabel(profileId)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
          {optionsError ? <p className="screen-status error">{optionsError}</p> : null}
          {recommendationError ? <p className="screen-status error">{recommendationError}</p> : null}
        </div>

        <div className="aroma-onboarding-dock">
          <div className="aroma-onboarding-pips" aria-hidden>
            <span className={cn('aroma-onboarding-pip', onboardingStep >= 1 && 'aroma-onboarding-pip-on')} />
            <span className={cn('aroma-onboarding-pip', onboardingStep >= 2 && 'aroma-onboarding-pip-on')} />
          </div>
          <CTA pulse={onboardingStep === 2 && !ctaDisabled} onClick={goNext} disabled={ctaDisabled}>
            {ctaLabel}
          </CTA>
          <button
            type="button"
            className="aroma-onboarding-skip"
            onClick={() => setView('catalog')}
          >
            Открыть каталог сразу
          </button>
        </div>
      </div>
    );
  };

  const renderSelectedMixBar = () =>
    selectedMixCard && selectedMix ? (
      <div className="selected-mix-shell">
        <Card className="card compact-card selected-mix-bar">
          <div>
            <p className="card-title">Карточка для мастера</p>
            <p className="card-text">
              {selectedMixCard.name} · {mixSourceLabels[selectedMix.source]}
            </p>
          </div>
          <div className="cinema-actions">
            <Button
              className="ghost-button"
              variant="outline"
              type="button"
              onClick={() => openMix(selectedMixCard, selectedMix.source)}
            >
              Открыть карточку
            </Button>
          </div>
        </Card>
      </div>
    ) : null;

  const renderRecommendationsView = () => {
    if (recommendationStatus === 'loading') {
      return <p className="screen-status">Собираем подбор…</p>;
    }
    if (recommendationError) {
      return <p className="screen-status error">{recommendationError}</p>;
    }
    if (!recommendations.length) {
      return (
        <section className="aroma-recs-empty">
          <p className="aroma-caps">
            {recommendationStatus === 'ready' ? 'Подбор не найден' : 'Подбор пока пуст'}
          </p>
          <h1 className="aroma-recs-empty-title">
            {recommendationStatus === 'ready' ? 'Ничего не найдено' : 'Сначала выберите вкусы'}
          </h1>
          <p className="aroma-recs-empty-text">
            {recommendationStatus === 'ready'
              ? 'Попробуйте изменить профили и вкусы или сразу перейти в каталог.'
              : 'Откройте предпочтения, чтобы мы собрали подбор под текущее настроение, или сразу посмотрите весь каталог.'}
          </p>
          <div className="aroma-recs-empty-actions">
            <CTA onClick={() => setView('onboarding')}>
              {recommendationStatus === 'ready' ? 'Изменить вкусы' : 'Открыть предпочтения'}
            </CTA>
            <button
              type="button"
              className="aroma-onboarding-skip"
              onClick={() => setView('catalog')}
            >
              Открыть каталог
            </button>
          </div>
        </section>
      );
    }

    const [hero, ...rest] = recommendations;
    const heroColor = getProfileColor(hero.flavorProfiles[0]);
    const heroComponents = [...hero.components]
      .sort((left, right) => right.proportion - left.proportion)
      .slice(0, 4);

    return (
      <section className="aroma-recs">
        <p className="aroma-caps">Лучшее совпадение</p>
        <article
          className="aroma-recs-hero"
          style={{
            background: `radial-gradient(circle at 80% 0%, ${heroColor}55 0%, transparent 55%), linear-gradient(180deg, rgba(34,15,16,0.96) 0%, rgba(22,11,12,0.88) 100%)`,
          }}
        >
          <div className="aroma-recs-hero-head">
            <ProfileGlyph profiles={hero.flavorProfiles} size={64} />
            <div className="aroma-recs-hero-head-text">
              <h2 className="aroma-recs-hero-title">{hero.name}</h2>
              <p className="aroma-recs-hero-desc">{hero.description}</p>
            </div>
          </div>
          <SignatureBar profiles={hero.flavorProfiles} height={6} />
          {heroComponents.length ? (
            <div className="aroma-recs-composition">
              {heroComponents.map((component) => (
                <div className="aroma-recs-comp-row" key={component.id}>
                  <span className="aroma-caps aroma-recs-comp-maker">{component.manufacturer}</span>
                  <span className="aroma-recs-comp-name">{component.name}</span>
                  <span className="aroma-recs-comp-share">{Math.round(component.proportion)}%</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="aroma-recs-hero-meta">
            <RatingPill rating={hero.avgRating} />
            <span className="aroma-caps">{`${hero.popularity} выборов`}</span>
          </div>
          <CTA
            pulse
            disabled={chooseStatus === 'loading'}
            onClick={() => void onChooseMix(hero, 'recommendations')}
          >
            {chooseStatus === 'loading' && selectedMix?.id === hero.id ? 'Сохраняем…' : 'Покурить'}
          </CTA>
        </article>

        {rest.length ? (
          <>
            <p className="aroma-caps">Тоже подходят</p>
            <div className="aroma-recs-list">
              {rest.slice(0, 4).map((mix) => (
                <button
                  key={mix.id}
                  type="button"
                  className="aroma-recs-row"
                  onClick={() => openMix(mix, 'recommendations')}
                >
                  <div className="aroma-recs-row-main">
                    <h3 className="aroma-recs-row-name">{mix.name}</h3>
                    <SignatureBar profiles={mix.flavorProfiles} height={3} />
                    <p className="aroma-recs-row-flavors">
                      {mix.flavors.slice(0, 3).join(' · ')}
                    </p>
                  </div>
                  <RatingPill rating={mix.avgRating} />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    );
  };

  const renderShowcaseView = () => {
    if (showcaseStatus === 'loading') {
      return <p className="screen-status">Загружаем витрину…</p>;
    }
    if (showcaseError) {
      return <p className="screen-status error">{showcaseError}</p>;
    }
    if (!showcaseRails.length) {
      return <p className="screen-status">Подборки пока не опубликованы.</p>;
    }

    const activeRail =
      showcaseRails.find((rail) => rail.id === activeShowcaseRailId) ?? showcaseRails[0];

    const openRail = () => {
      setSelectedRail(activeRail);
      setView('rail');
    };

    return (
      <section className="aroma-showcase">
        <div className="aroma-showcase-tabs" role="tablist">
          {showcaseRails.map((rail) => {
            const isActive = rail.id === activeRail.id;
            return (
              <button
                key={rail.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'aroma-showcase-tab',
                  isActive && 'aroma-showcase-tab-on',
                )}
                onClick={() => setActiveShowcaseRailId(rail.id)}
              >
                <span className="aroma-caps aroma-showcase-tab-kicker">
                  {railToneLabels[rail.type]}
                </span>
                <span className="aroma-showcase-tab-title">{rail.name}</span>
              </button>
            );
          })}
        </div>

        <div className="aroma-showcase-list">
          {activeRail.mixes.map((mix, index) => {
            const isHero = index === 0;
            const profileColor = getProfileColor(mix.flavorProfiles[0]);
            return (
              <button
                key={`${activeRail.id}:${mix.id}`}
                type="button"
                className={cn(
                  'aroma-showcase-row',
                  isHero && 'aroma-showcase-row-hero',
                )}
                onClick={() => openMix(mix, 'showcase')}
                style={
                  isHero
                    ? {
                        background: `radial-gradient(circle at 80% 0%, ${profileColor}44 0%, transparent 55%), rgba(28,13,13,0.84)`,
                      }
                    : undefined
                }
              >
                <ProfileGlyph profiles={mix.flavorProfiles} size={isHero ? 60 : 44} />
                <div className="aroma-showcase-row-main">
                  <h3 className="aroma-showcase-row-name">{mix.name}</h3>
                  {mix.flavors.length ? (
                    <p className="aroma-showcase-row-flavors">
                      {mix.flavors.slice(0, 3).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <RatingPill rating={mix.avgRating} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="aroma-onboarding-skip aroma-showcase-rail-link"
          onClick={openRail}
        >
          Смотреть весь рейл
        </button>
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
    const components = [...mix.components].sort(
      (left, right) => right.proportion - left.proportion,
    );
    const profileLabels = mix.flavorProfiles.map(formatProfileLabel).join(' · ');

    return (
      <section className="aroma-smoke-confirmation">
        <div className="aroma-smoke-confirmation-topbar">
          <button
            type="button"
            className="aroma-smoke-confirmation-done"
            onClick={() => setView('recommendations')}
          >
            Готово
          </button>
        </div>

        <div className="aroma-smoke-confirmation-stack">
          <p className="aroma-caps aroma-smoke-confirmation-kicker">Покажите мастеру</p>
          <ProfileGlyph profiles={mix.flavorProfiles} size={96} />
          <h1 className="aroma-smoke-confirmation-title">{mix.name}</h1>
          {profileLabels ? (
            <p className="aroma-caps aroma-smoke-confirmation-profiles">{profileLabels}</p>
          ) : null}
          <SignatureBar profiles={mix.flavorProfiles} height={3} />
        </div>

        {components.length ? (
          <section className="aroma-smoke-confirmation-composition">
            <p className="aroma-caps">Состав</p>
            <ul className="aroma-smoke-confirmation-comp-list">
              {components.map((component) => (
                <li key={component.id} className="aroma-smoke-confirmation-comp-row">
                  <div className="aroma-smoke-confirmation-comp-text">
                    <span className="aroma-smoke-confirmation-comp-name">
                      {component.name}
                    </span>
                    <span className="aroma-caps aroma-smoke-confirmation-comp-maker">
                      {component.manufacturer}
                    </span>
                  </div>
                  <span className="aroma-smoke-confirmation-comp-share">
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
          onClick={() => setView('recommendations')}
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
          <div className="aroma-rail-topbar-text">
            <p className="aroma-caps">
              {`Витрина · ${railToneLabels[rail.type]}`}
            </p>
            <p className="aroma-rail-meta">
              {`${rail.mixes.length} ${pluralizeMixes(rail.mixes.length)}`}
            </p>
          </div>
          <button
            type="button"
            className="aroma-rail-code"
            onClick={onResetAccess}
          >
            Новый код
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
            <button
              key={`${rail.id}:${mix.id}`}
              type="button"
              className="aroma-rail-row"
              onClick={() => openMix(mix, 'rail')}
            >
              <ProfileGlyph profiles={mix.flavorProfiles} size={60} />
              <div className="aroma-rail-row-main">
                <h3 className="aroma-rail-row-name">{mix.name}</h3>
                {mix.flavors.length ? (
                  <p className="aroma-rail-row-flavors">
                    {mix.flavors.slice(0, 3).join(' · ')}
                  </p>
                ) : null}
              </div>
              <RatingPill rating={mix.avgRating} />
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderCatalogView = () => {
    const toggleCatalogProfile = (value: string) =>
      setAppliedCatalogProfiles((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    const toggleCatalogFlavor = (value: string) =>
      setAppliedCatalogFlavors((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    const hasPopoverIndicator =
      appliedCatalogFlavors.length > 0 || appliedSortBy !== 'popularity';
    const hasAnyFilter =
      Boolean(query) ||
      appliedCatalogProfiles.length > 0 ||
      appliedCatalogFlavors.length > 0 ||
      appliedSortBy !== 'popularity';

    return (
      <section className="aroma-catalog">
        <div className="aroma-catalog-rail">
          <div className="aroma-catalog-search-row">
            <input
              type="search"
              className="aroma-catalog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию и описанию"
              autoComplete="off"
            />
            <button
              type="button"
              className="aroma-catalog-icon-btn"
              onClick={() => setCatalogPopoverOpen((current) => !current)}
              aria-label="Фильтры и сортировка"
              aria-expanded={catalogPopoverOpen}
            >
              <span aria-hidden>⚙</span>
              {hasPopoverIndicator ? (
                <span className="aroma-catalog-icon-dot" aria-hidden />
              ) : null}
            </button>
          </div>
          <div className="aroma-catalog-chip-scroll">
            {availableProfileOptions.map((option) => (
              <Chip
                key={option.value}
                tier="lg"
                color={getProfileColor(option.value)}
                active={appliedCatalogProfiles.includes(option.value)}
                onClick={() => toggleCatalogProfile(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        {catalogPopoverOpen ? (
          <div className="aroma-catalog-popover" role="dialog" aria-label="Фильтры каталога">
            <p className="aroma-caps">Сортировка</p>
            <div className="aroma-catalog-sort">
              {sortOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'aroma-catalog-sort-btn',
                    appliedSortBy === item.value && 'aroma-catalog-sort-btn-on',
                  )}
                  onClick={() => setAppliedSortBy(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="aroma-caps">Вкусы</p>
            <div className="aroma-catalog-flavor-wrap">
              {options.flavors.map((flavor) => (
                <Chip
                  key={flavor}
                  active={appliedCatalogFlavors.includes(flavor)}
                  onClick={() => toggleCatalogFlavor(flavor)}
                >
                  {flavor}
                </Chip>
              ))}
            </div>
            <CTA onClick={() => setCatalogPopoverOpen(false)}>Готово</CTA>
          </div>
        ) : null}

        <div className="aroma-catalog-meta">
          <p className="aroma-caps">
            {catalogStatus === 'loading'
              ? 'Обновляем…'
              : `Найдено · ${filteredCatalogMixes.length}`}
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

        {catalogError ? <p className="screen-status error">{catalogError}</p> : null}
        {!filteredCatalogMixes.length && catalogStatus === 'ready' ? (
          <p className="screen-status">По выбранным фильтрам ничего не найдено.</p>
        ) : null}

        <div className="aroma-catalog-list">
          {filteredCatalogMixes.map((mix) => (
            <button
              key={mix.id}
              type="button"
              className="aroma-catalog-row"
              onClick={() => openMix(mix, 'catalog')}
            >
              <ProfileGlyph profiles={mix.flavorProfiles} size={44} />
              <div className="aroma-catalog-row-main">
                <h3 className="aroma-catalog-row-name">{mix.name}</h3>
                {mix.flavors.length ? (
                  <p className="aroma-catalog-row-flavors">
                    {mix.flavors.slice(0, 3).join(' · ')}
                  </p>
                ) : null}
              </div>
              <RatingPill rating={mix.avgRating} />
            </button>
          ))}
        </div>
      </section>
    );
  };


  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        {!accessGranted ? (
          renderAccessView()
        ) : view === 'smoke-confirmation' ? (
          renderSmokeConfirmationView()
        ) : (
          <>
            {renderTopbar()}
            {view !== 'intro' ? renderSelectedMixBar() : null}
            <main className={view === 'intro' ? 'content content-intro' : 'content'}>
              {view === 'intro' ? renderIntroView() : null}
              {view === 'onboarding' ? renderOnboardingView() : null}
              {view === 'recommendations' ? renderRecommendationsView() : null}
              {view === 'showcase' ? renderShowcaseView() : null}
              {view === 'catalog' ? renderCatalogView() : null}
              {view === 'rail' ? renderRailView() : null}
            </main>
          </>
        )}
      </div>

      <MixDetailModal
        state={mixModalState}
        selectedMixId={selectedMix?.id ?? ''}
        chooseStatus={chooseStatus}
        chooseError={chooseError}
        ratingValue={ratingValue}
        ratingStatus={ratingStatus}
        ratingError={ratingError}
        ratingMessage={ratingMessage}
        onClose={() => setMixModalState(null)}
        onChoose={() => {
          if (mixModalState) {
            void onChooseMix(mixModalState.mix, mixModalState.source);
          }
        }}
        onRate={(value) => void onSaveRating(value)}
      />
    </div>
  );
};
