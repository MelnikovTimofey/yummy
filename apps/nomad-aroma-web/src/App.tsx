import { FormEvent, useEffect, useState } from 'react';

type GuestStage = 'intro' | 'onboarding' | 'recommendations' | 'home' | 'catalog';
type MixSource = 'recommendation' | 'rail' | 'catalog';
type RailType = 'statistical' | 'prepared' | 'curated';

type OnboardingOptions = {
  profiles: string[];
  flavors: string[];
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
  score?: number;
  avgRating: number;
  popularity: number;
  available: boolean;
  components: Array<{
    id: string;
    name: string;
    manufacturer: string;
    flavors: string[];
  }>;
};

type SelectedMix = MixCard & {
  source: MixSource;
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

type MixRatingResult = {
  ok: true;
  mixId: string;
  value: number;
  averageRating?: number;
  ratingCount?: number;
  message?: string;
};

const storageKeys = {
  ageConfirmed: 'nomad-aroma-age-confirmed',
  accessGranted: 'nomad-aroma-access-granted',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const stageLabels: Record<GuestStage, string> = {
  intro: 'Знакомство',
  onboarding: 'Онбординг',
  recommendations: 'Рекомендации',
  home: 'Главная',
  catalog: 'Каталог',
};

const railTypeLabels: Record<RailType, string> = {
  statistical: 'Статистический',
  prepared: 'Предзаготовленный',
  curated: 'Собранный мастером',
};

const guestStages: GuestStage[] = ['intro', 'onboarding', 'recommendations', 'home', 'catalog'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatLabel = (value: string) =>
  value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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

const normalizeIntroCard = (item: unknown, index: number): IntroCard => {
  const record = isRecord(item) ? item : {};
  return {
    id: typeof record.id === 'string' && record.id ? record.id : `intro-${index}`,
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
    bullets: toStringList(record.bullets ?? record.points ?? record.steps ?? record.highlights ?? record.items),
  };
};

const normalizeMix = (item: unknown, index: number): MixCard => {
  const record = isRecord(item) ? item : {};
  const components = extractCollection(record, ['components', 'mixComponents', 'ingredients']).map((component, componentIndex) => {
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
    };
  });

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
    score:
      typeof record.score === 'number'
        ? record.score
        : typeof record.matchScore === 'number'
          ? record.matchScore
          : undefined,
    avgRating: toNumber(record.avgRating ?? record.averageRating ?? record.rating, 0),
    popularity: toNumber(record.popularity ?? record.smokeCtaCount ?? record.count, 0),
    available: toBoolean(record.available ?? record.inStock ?? record.isAvailable, true),
    components,
  };
};

const normalizeRail = (item: unknown, index: number): HomeRail => {
  const record = isRecord(item) ? item : {};
  const mixes = extractCollection(record, ['mixes', 'items', 'catalog', 'mixCards']).map((mix, mixIndex) =>
    normalizeMix(mix, mixIndex),
  );
  const mixIds = toStringList(record.mixIds ?? record.ids);
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
    mixIds: mixIds.length ? mixIds : mixes.map((mix) => mix.id),
  };
};

const buildCatalogPath = (profiles: string[], flavors: string[]) => {
  const searchParams = new URLSearchParams();

  if (profiles.length) {
    searchParams.set('profiles', profiles.join(','));
  }

  if (flavors.length) {
    searchParams.set('flavors', flavors.join(','));
  }

  const query = searchParams.toString();
  return query ? `/guest/catalog/mixes?${query}` : '/guest/catalog/mixes';
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
  return extractCollection(payload, ['cards', 'items', 'introCards']).map((item, index) => normalizeIntroCard(item, index));
};

const fetchHomeRails = async () => {
  const payload = await requestJson<unknown>('/guest/home/rails');
  return extractCollection(payload, ['rails', 'items']).map((item, index) => normalizeRail(item, index));
};

const fetchCatalogMixes = async (profiles: string[], flavors: string[]) => {
  const payload = await requestJson<unknown>(buildCatalogPath(profiles, flavors));
  return extractCollection(payload, ['mixes', 'items', 'catalog']).map((item, index) => normalizeMix(item, index));
};

const fetchRecommendations = async (payload: { likedProfiles: string[]; likedFlavors: string[] }) => {
  const response = await requestJson<unknown>('/guest/onboarding/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const record = isRecord(response) ? response : {};
  const onboardingRecord = isRecord(record.onboarding) ? record.onboarding : null;

  return {
    items: extractCollection(record, ['items', 'mixes']).map((item, index) => normalizeMix(item, index)),
    onboarding: {
      likedProfiles: toStringList(onboardingRecord?.likedProfiles ?? payload.likedProfiles),
      likedFlavors: toStringList(onboardingRecord?.likedFlavors ?? payload.likedFlavors),
    },
  };
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

const toggleSelection = (value: string, items: string[]) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const formatRailType = (type: RailType) => railTypeLabels[type];

const MixCardView = ({
  mix,
  sourceLabel,
  actionLabel = 'Выбрать',
  chooseBusy = false,
  onChoose,
}: {
  mix: MixCard;
  sourceLabel?: string;
  actionLabel?: string;
  chooseBusy?: boolean;
  onChoose?: (mix: MixCard) => void;
}) => (
  <article className="mix-card">
    <div className="mix-card__head">
      <div className="mix-card__title-row">
        <div>
          <p className="eyebrow mix-card__eyebrow">{sourceLabel ?? 'Микс'}</p>
          <h3>{mix.name}</h3>
        </div>
        {!mix.available ? <span className="status-pill status-pill--muted">Нет в наличии</span> : null}
      </div>
      <p className="hint-text">{mix.description}</p>
    </div>

    <div className="hero-meta">
      {mix.score !== undefined ? <span className="pill">Score {mix.score.toFixed(0)}</span> : null}
      <span className="pill">Рейтинг {mix.avgRating.toFixed(1)}</span>
      <span className="pill">Популярность {mix.popularity}</span>
    </div>

    <div className="chip-row">
      {mix.flavorProfiles.map((profile) => (
        <span className="chip" key={`${mix.id}:${profile}`}>
          {formatLabel(profile)}
        </span>
      ))}
      {mix.flavorTags.map((tag) => (
        <span className="chip chip--subtle" key={`${mix.id}:tag:${tag}`}>
          {formatLabel(tag)}
        </span>
      ))}
    </div>

    <p className="meta-line">{mix.flavors.length ? `Вкусы: ${mix.flavors.join(', ')}` : 'Вкусы: не указаны'}</p>

    {mix.components.length ? (
      <ul className="component-list">
        {mix.components.map((component) => (
          <li key={component.id}>
            {component.name} · {component.manufacturer}
          </li>
        ))}
      </ul>
    ) : null}

    {onChoose ? (
      <button
        className="primary-btn"
        type="button"
        onClick={() => onChoose(mix)}
        disabled={chooseBusy || !mix.available}
      >
        {chooseBusy ? 'Сохраняем...' : actionLabel}
      </button>
    ) : null}
  </article>
);

const RailView = ({
  rail,
  onChooseMix,
  activeMixId,
  chooseBusyMixId,
}: {
  rail: HomeRail;
  onChooseMix: (mix: MixCard) => void;
  activeMixId: string;
  chooseBusyMixId: string;
}) => (
  <article className="rail-card">
    <div className="rail-card__head">
      <div>
        <p className="eyebrow">{formatRailType(rail.type)}</p>
        <h3>{rail.name}</h3>
      </div>
      <span className={rail.active ? 'status-pill status-pill--active' : 'status-pill status-pill--muted'}>
        {rail.active ? 'Активен' : 'Не активен'}
      </span>
    </div>
    <p className="hint-text">{rail.description}</p>
    {rail.mixes.length ? (
      <div className="mix-grid mix-grid--rail">
        {rail.mixes.map((mix) => (
          <MixCardView
            key={mix.id}
            mix={mix}
            sourceLabel="Рейл"
            actionLabel={activeMixId === mix.id ? 'Выбрано' : 'Выбрать'}
            chooseBusy={chooseBusyMixId === mix.id}
            onChoose={onChooseMix}
          />
        ))}
      </div>
    ) : rail.mixIds.length ? (
      <div className="empty-state">
        <p className="meta-line">Рейл пока содержит только идентификаторы миксов.</p>
        <div className="chip-row">
          {rail.mixIds.map((mixId) => (
            <span className="chip" key={`${rail.id}:${mixId}`}>
              {formatLabel(mixId)}
            </span>
          ))}
        </div>
      </div>
    ) : (
      <p className="meta-line">В этом рейле пока нет миксов.</p>
    )}
  </article>
);

const TabButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button className={active ? 'tab-button tab-button--active' : 'tab-button'} type="button" onClick={onClick}>
    {label}
  </button>
);

const RatingPicker = ({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: number | null;
  onChange: (value: number) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="rating-box">
    <div className="rating-row" role="group" aria-label="Оценка микса от 1 до 5">
      {[1, 2, 3, 4, 5].map((item) => (
        <button
          key={item}
          className={value === item ? 'rating-button rating-button--active' : 'rating-button'}
          type="button"
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
    <button className="secondary-btn" type="button" onClick={onSubmit} disabled={loading || value === null}>
      {loading ? 'Сохраняем оценку...' : 'Сохранить оценку'}
    </button>
  </div>
);

export const App = () => {
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(storageKeys.ageConfirmed) === 'true');
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(storageKeys.accessGranted) === 'true');
  const [stage, setStage] = useState<GuestStage>('intro');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [accessError, setAccessError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [options, setOptions] = useState<OnboardingOptions>({ profiles: [], flavors: [] });
  const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [optionsError, setOptionsError] = useState('');

  const [introCards, setIntroCards] = useState<IntroCard[]>([]);
  const [introStatus, setIntroStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [introError, setIntroError] = useState('');

  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [likedFlavors, setLikedFlavors] = useState<string[]>([]);
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendations, setRecommendations] = useState<MixCard[]>([]);

  const [homeRails, setHomeRails] = useState<HomeRail[]>([]);
  const [homeStatus, setHomeStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [homeError, setHomeError] = useState('');

  const [catalogProfilesFilter, setCatalogProfilesFilter] = useState<string[]>([]);
  const [catalogFlavorsFilter, setCatalogFlavorsFilter] = useState<string[]>([]);
  const [catalogMixes, setCatalogMixes] = useState<MixCard[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [catalogError, setCatalogError] = useState('');

  const [selectedMix, setSelectedMix] = useState<SelectedMix | null>(null);
  const [chooseStatus, setChooseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [chooseError, setChooseError] = useState('');
  const [choosingMixId, setChoosingMixId] = useState('');

  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');

  useEffect(() => {
    if (ageConfirmed) {
      localStorage.setItem(storageKeys.ageConfirmed, 'true');
    }
  }, [ageConfirmed]);

  useEffect(() => {
    if (accessGranted) {
      localStorage.setItem(storageKeys.accessGranted, 'true');
    }
  }, [accessGranted]);

  const loadOptions = async () => {
    setOptionsStatus('loading');
    setOptionsError('');

    try {
      const nextOptions = await fetchOnboardingOptions();
      setOptions(nextOptions);
      setOptionsStatus('ready');
    } catch (cause) {
      setOptionsStatus('error');
      setOptionsError(cause instanceof Error ? cause.message : 'Не удалось загрузить варианты онбординга');
    }
  };

  const loadIntroCards = async () => {
    setIntroStatus('loading');
    setIntroError('');

    try {
      const nextCards = await fetchIntroCards();
      setIntroCards(nextCards);
      setIntroStatus('ready');
    } catch (cause) {
      setIntroStatus('error');
      setIntroError(cause instanceof Error ? cause.message : 'Не удалось загрузить знакомство');
    }
  };

  const loadHomeRails = async () => {
    setHomeStatus('loading');
    setHomeError('');

    try {
      const nextRails = await fetchHomeRails();
      setHomeRails(nextRails);
      setHomeStatus('ready');
    } catch (cause) {
      setHomeStatus('error');
      setHomeError(cause instanceof Error ? cause.message : 'Не удалось загрузить рейлы');
    }
  };

  const loadCatalogMixes = async (profiles = catalogProfilesFilter, flavors = catalogFlavorsFilter) => {
    setCatalogStatus('loading');
    setCatalogError('');

    try {
      const nextMixes = await fetchCatalogMixes(profiles, flavors);
      setCatalogMixes(nextMixes);
      setCatalogStatus('ready');
    } catch (cause) {
      setCatalogStatus('error');
      setCatalogError(cause instanceof Error ? cause.message : 'Не удалось загрузить каталог');
    }
  };

  useEffect(() => {
    if (!accessGranted) {
      return;
    }

    if (optionsStatus === 'idle') {
      void loadOptions();
    }

    if (introStatus === 'idle') {
      void loadIntroCards();
    }

    if (homeStatus === 'idle') {
      void loadHomeRails();
    }

    if (catalogStatus === 'idle') {
      void loadCatalogMixes();
    }
  }, [accessGranted, optionsStatus, introStatus, homeStatus, catalogStatus]);

  const onAgeConfirm = () => {
    setAgeConfirmed(true);
  };

  const onReset = () => {
    setAgeConfirmed(false);
    setAccessGranted(false);
    setStage('intro');
    setCode('');
    setStatus('idle');
    setAccessError('');
    setSuccessMessage('');

    setOptions({ profiles: [], flavors: [] });
    setOptionsStatus('idle');
    setOptionsError('');

    setIntroCards([]);
    setIntroStatus('idle');
    setIntroError('');

    setLikedProfiles([]);
    setLikedFlavors([]);
    setRecommendationStatus('idle');
    setRecommendationError('');
    setRecommendations([]);

    setHomeRails([]);
    setHomeStatus('idle');
    setHomeError('');

    setCatalogProfilesFilter([]);
    setCatalogFlavorsFilter([]);
    setCatalogMixes([]);
    setCatalogStatus('idle');
    setCatalogError('');

    setSelectedMix(null);
    setChooseStatus('idle');
    setChooseError('');
    setChoosingMixId('');
    setRatingValue(null);
    setRatingStatus('idle');
    setRatingError('');
    setRatingMessage('');

    localStorage.removeItem(storageKeys.ageConfirmed);
    localStorage.removeItem(storageKeys.accessGranted);
  };

  const onSubmitAccessCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = code.trim();

    if (!trimmed) {
      setAccessError('Введите код доступа');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setAccessError('');

    try {
      const result = await fetchGuestAccess(trimmed);
      setAccessGranted(true);
      setStage(result.nextStep ?? 'intro');
      setSuccessMessage(result.message);
      setStatus('success');
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : 'Не удалось проверить код доступа');
      setStatus('error');
    }
  };

  const onSubmitOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!likedProfiles.length && !likedFlavors.length) {
      setRecommendationError('Выберите хотя бы один профиль или вкус');
      setRecommendationStatus('error');
      return;
    }

    setRecommendationStatus('loading');
    setRecommendationError('');

    try {
      const nextProfiles = [...likedProfiles];
      const nextFlavors = [...likedFlavors];
      const response = await fetchRecommendations({
        likedProfiles: nextProfiles,
        likedFlavors: nextFlavors,
      });

      setRecommendations(response.items);
      setCatalogProfilesFilter(nextProfiles);
      setCatalogFlavorsFilter(nextFlavors);
      void loadCatalogMixes(nextProfiles, nextFlavors);
      setRecommendationStatus('ready');
      setStage('recommendations');
    } catch (cause) {
      setRecommendationStatus('error');
      setRecommendationError(cause instanceof Error ? cause.message : 'Не удалось получить рекомендации');
    }
  };

  const onChooseMix = async (mix: MixCard, source: MixSource) => {
    setChooseStatus('loading');
    setChooseError('');
    setChoosingMixId(mix.id);

    try {
      await sendSmokeCta(mix.id);
      setSelectedMix({ ...mix, source });
      setRatingValue(null);
      setRatingStatus('idle');
      setRatingError('');
      setRatingMessage('');
      setChooseStatus('ready');
    } catch (cause) {
      setChooseStatus('error');
      setChooseError(cause instanceof Error ? cause.message : 'Не удалось записать действие');
    } finally {
      setChoosingMixId('');
    }
  };

  const onSaveRating = async () => {
    if (!selectedMix) {
      return;
    }

    if (ratingValue === null) {
      setRatingError('Выберите оценку от 1 до 5');
      setRatingStatus('error');
      return;
    }

    setRatingStatus('loading');
    setRatingError('');
    setRatingMessage('');

    try {
      const response = await sendMixRating(selectedMix.id, ratingValue);
      setSelectedMix((current) =>
        current
          ? {
              ...current,
              avgRating: response.averageRating ?? current.avgRating,
            }
          : current,
      );
      setRatingMessage(response.message ?? `Оценка ${response.value} сохранена`);
      setRatingStatus('ready');
    } catch (cause) {
      setRatingError(cause instanceof Error ? cause.message : 'Не удалось сохранить оценку');
      setRatingStatus('error');
    }
  };

  const clearSelectedMix = () => {
    setSelectedMix(null);
    setChooseStatus('idle');
    setChooseError('');
    setChoosingMixId('');
    setRatingValue(null);
    setRatingStatus('idle');
    setRatingError('');
    setRatingMessage('');
  };

  const renderStageNav = () => (
    <section className="card nav-card">
      <div className="nav-row">
        {guestStages.map((item) => (
          <TabButton key={item} label={stageLabels[item]} active={stage === item} onClick={() => setStage(item)} />
        ))}
      </div>
      <p className="meta-line">
        Данные из backend: знакомство, рекомендации, главная и каталог открыты как отдельные гостевые экраны.
      </p>
    </section>
  );

  const renderSelectedMix = () =>
    selectedMix ? (
      <section className="card selected-mix-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Выбранный микс</p>
            <h2>{selectedMix.name}</h2>
          </div>
          <div className="status-stack">
            <span className="status-pill status-pill--active">{selectedMix.source === 'recommendation' ? 'Из рекомендаций' : selectedMix.source === 'rail' ? 'Из рейла' : 'Из каталога'}</span>
            {chooseStatus === 'ready' ? <span className="status-pill status-pill--active">Выбор сохранён</span> : null}
          </div>
        </div>

        <p className="hint-text">{selectedMix.description}</p>
        <div className="hero-meta">
          <span className="pill">Рейтинг {selectedMix.avgRating.toFixed(1)}</span>
          <span className="pill">Популярность {selectedMix.popularity}</span>
          <span className="pill">{selectedMix.available ? 'В наличии' : 'Нет в наличии'}</span>
        </div>

        <div className="chip-row">
          {selectedMix.flavorProfiles.map((profile) => (
            <span className="chip" key={`${selectedMix.id}:profile:${profile}`}>
              {formatLabel(profile)}
            </span>
          ))}
          {selectedMix.flavorTags.map((tag) => (
            <span className="chip chip--subtle" key={`${selectedMix.id}:tag:${tag}`}>
              {formatLabel(tag)}
            </span>
          ))}
        </div>

        {selectedMix.components.length ? (
          <ul className="component-list">
            {selectedMix.components.map((component) => (
              <li key={component.id}>
                {component.name} · {component.manufacturer} · {component.flavors.join(', ')}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="rating-section">
          <div>
            <p className="meta-line">Оцените микс от 1 до 5</p>
            <p className="hint-text">Оценка отправляется отдельно и не мешает показу карточки мастеру.</p>
          </div>
          <RatingPicker
            value={ratingValue}
            onChange={setRatingValue}
            onSubmit={onSaveRating}
            loading={ratingStatus === 'loading'}
          />
        </div>

        {ratingError ? <p className="error-text">{ratingError}</p> : null}
        {ratingMessage ? <p className="success-text">{ratingMessage}</p> : null}

        <div className="card-actions">
          <button className="secondary-btn" type="button" onClick={clearSelectedMix}>
            Выбрать другой микс
          </button>
          <button className="secondary-btn" type="button" onClick={() => setStage('catalog')}>
            Перейти в каталог
          </button>
        </div>
      </section>
    ) : null;

  if (!ageConfirmed) {
    return (
      <main className="shell shell--guest">
        <section className="hero hero--guest">
          <p className="eyebrow">Nomad Aroma Atelier</p>
          <h1>Подтвердите возраст</h1>
          <p className="lead">Это гостевой сценарий Nomad. Для продолжения подтвердите, что вам есть 18 лет.</p>
        </section>

        <section className="card card--compact">
          <button className="primary-btn" type="button" onClick={onAgeConfirm}>
            Мне есть 18 лет
          </button>
          <button className="secondary-btn" type="button" onClick={onReset}>
            Я не могу продолжить
          </button>
        </section>
      </main>
    );
  }

  if (!accessGranted) {
    return (
      <main className="shell shell--guest">
        <section className="hero">
          <p className="eyebrow">Nomad Aroma Atelier</p>
          <h1>Ввод кода доступа</h1>
          <p className="lead">Введите ежедневный код, который сказал кальянный мастер или официант.</p>
        </section>

        <section className="card accent-card">
          <form className="code-form" onSubmit={onSubmitAccessCode}>
            <label className="field">
              <span className="field-label">Код доступа</span>
              <input
                className="text-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Например, NOMAD-2026"
                autoComplete="one-time-code"
                inputMode="text"
              />
            </label>

            {accessError ? <p className="error-text">{accessError}</p> : null}

            <button className="primary-btn" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Проверяем...' : 'Проверить код'}
            </button>
          </form>
        </section>

        <section className="card card--compact">
          <div className="pill">18+ подтвержден</div>
          <p className="meta-line">API: {apiBaseUrl}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--guest">
      <section className="hero hero--success">
        <p className="eyebrow">Гостевой контур Nomad</p>
        <h1>
          {stage === 'intro'
            ? 'Знакомство с сервисом'
            : stage === 'onboarding'
              ? 'Быстрый онбординг'
              : stage === 'recommendations'
                ? 'Рекомендации для вас'
                : stage === 'home'
                  ? 'Главная с рейлами'
                  : 'Каталог миксов'}
        </h1>
        <p className="lead">
          {successMessage ||
            'От знакомства до выбора микса и оценки - единый мобильный guest flow для гостей Nomad.'}
        </p>
      </section>

      {renderStageNav()}
      {renderSelectedMix()}

      {chooseError ? (
        <section className="card card--compact">
          <p className="error-text">{chooseError}</p>
        </section>
      ) : null}

      {stage === 'intro' ? (
        <section className="stage-shell">
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Знакомство</p>
                <h2>Как работает Арома Ателье</h2>
              </div>
              <div className="status-pill status-pill--active">Экран 1</div>
            </div>
            {introStatus === 'loading' ? <p className="meta-line">Загружаем карточки знакомства...</p> : null}
            {introError ? <p className="error-text">{introError}</p> : null}
            {introCards.length ? (
              <div className="intro-grid">
                {introCards.map((card) => (
                  <article className="intro-card" key={card.id}>
                    <p className="eyebrow">{card.title}</p>
                    <p className="hint-text">{card.description}</p>
                    {card.bullets.length ? (
                      <ul className="step-list">
                        {card.bullets.map((bullet) => (
                          <li key={`${card.id}:${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card card--compact card-actions">
            <button className="primary-btn" type="button" onClick={() => setStage('onboarding')}>
              Продолжить к онбордингу
            </button>
            <button className="secondary-btn" type="button" onClick={() => setStage('catalog')}>
              Открыть каталог
            </button>
          </section>
        </section>
      ) : null}

      {stage === 'onboarding' ? (
        <section className="stage-shell">
          <section className="card accent-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Онбординг</p>
                <h2>Что хочется покурить</h2>
              </div>
              <div className="status-pill status-pill--active">Экран 2</div>
            </div>
            <form className="onboarding-form" onSubmit={onSubmitOnboarding}>
              <div className="choice-group">
                <h3>Профили вкуса</h3>
                <div className="choice-grid">
                  {options.profiles.map((profile) => (
                    <button
                      className={likedProfiles.includes(profile) ? 'choice-chip choice-chip--active' : 'choice-chip'}
                      key={profile}
                      type="button"
                      onClick={() => setLikedProfiles((current) => toggleSelection(profile, current))}
                    >
                      {formatLabel(profile)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="choice-group">
                <h3>Вкусы</h3>
                <div className="choice-grid">
                  {options.flavors.map((flavor) => (
                    <button
                      className={likedFlavors.includes(flavor) ? 'choice-chip choice-chip--active' : 'choice-chip'}
                      key={flavor}
                      type="button"
                      onClick={() => setLikedFlavors((current) => toggleSelection(flavor, current))}
                    >
                      {formatLabel(flavor)}
                    </button>
                  ))}
                </div>
              </div>

              {optionsStatus === 'loading' ? <p className="hint-text">Загружаем варианты онбординга...</p> : null}
              {optionsError ? <p className="error-text">{optionsError}</p> : null}
              {recommendationError ? <p className="error-text">{recommendationError}</p> : null}

              <div className="card-actions">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={optionsStatus !== 'ready' || recommendationStatus === 'loading'}
                >
                  {recommendationStatus === 'loading' ? 'Подбираем...' : 'Показать рекомендации'}
                </button>
                <button className="secondary-btn" type="button" onClick={() => setStage('recommendations')}>
                  Перейти к рекомендациям
                </button>
              </div>
            </form>
          </section>

          <section className="card card--compact">
            <div className="pill">18+ и код подтверждены</div>
            <p className="meta-line">API: {apiBaseUrl}</p>
          </section>
        </section>
      ) : null}

      {stage === 'recommendations' ? (
        <section className="stage-shell">
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Рекомендации</p>
                <h2>Подборка из доступных миксов</h2>
              </div>
              <div className="status-pill status-pill--active">Экран 3</div>
            </div>
            <p className="hint-text">
              {recommendationStatus === 'ready'
                ? 'Ниже миксы, которые лучше всего совпадают с ответами онбординга и текущим наличием.'
                : 'После выбора ответов здесь появится персональная подборка.'}
            </p>
            {recommendationStatus === 'loading' ? <p className="meta-line">Подбираем рекомендации...</p> : null}
            {recommendationError ? <p className="error-text">{recommendationError}</p> : null}

            {recommendations.length ? (
              <div className="mix-grid">
                {recommendations.map((mix) => (
                  <MixCardView
                    key={mix.id}
                    mix={mix}
                    sourceLabel="Рекомендация"
                    chooseBusy={choosingMixId === mix.id}
                    onChoose={(nextMix) => void onChooseMix(nextMix, 'recommendation')}
                  />
                ))}
              </div>
            ) : (
              <p className="meta-line">Пока нет рекомендаций. Вернитесь на онбординг и выберите несколько ответов.</p>
            )}
          </section>

          <section className="card card--compact card-actions">
            <button className="secondary-btn" type="button" onClick={() => setStage('home')}>
              Перейти на главную
            </button>
            <button className="secondary-btn" type="button" onClick={() => setStage('catalog')}>
              Открыть каталог
            </button>
          </section>
        </section>
      ) : null}

      {stage === 'home' ? (
        <section className="stage-shell">
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Главная</p>
                <h2>Рейлы для быстрого просмотра</h2>
              </div>
              <div className="status-pill status-pill--active">Экран 4</div>
            </div>
            {homeStatus === 'loading' ? <p className="meta-line">Загружаем рейлы...</p> : null}
            {homeError ? <p className="error-text">{homeError}</p> : null}

            {homeRails.length ? (
              <div className="rail-stack">
                {homeRails.map((rail) => (
                  <RailView
                    key={rail.id}
                    rail={rail}
                    onChooseMix={(mix) => void onChooseMix(mix, 'rail')}
                    activeMixId={selectedMix?.id ?? ''}
                    chooseBusyMixId={choosingMixId}
                  />
                ))}
              </div>
            ) : (
              <p className="meta-line">Пока нет доступных рейлов.</p>
            )}
          </section>
        </section>
      ) : null}

      {stage === 'catalog' ? (
        <section className="stage-shell">
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Каталог</p>
                <h2>Самостоятельный выбор микса</h2>
              </div>
              <div className="status-pill status-pill--active">Экран 5</div>
            </div>
            <p className="hint-text">
              Используйте фильтры ниже, чтобы сузить каталог по профилям и вкусам, а потом выберите микс.
            </p>

            <div className="filter-shell">
              <div className="choice-group">
                <h3>Фильтр по профилям</h3>
                <div className="choice-grid">
                  {options.profiles.map((profile) => (
                    <button
                      className={
                        catalogProfilesFilter.includes(profile) ? 'choice-chip choice-chip--active' : 'choice-chip'
                      }
                      key={`catalog-profile:${profile}`}
                      type="button"
                      onClick={() => setCatalogProfilesFilter((current) => toggleSelection(profile, current))}
                    >
                      {formatLabel(profile)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="choice-group">
                <h3>Фильтр по вкусам</h3>
                <div className="choice-grid">
                  {options.flavors.map((flavor) => (
                    <button
                      className={
                        catalogFlavorsFilter.includes(flavor) ? 'choice-chip choice-chip--active' : 'choice-chip'
                      }
                      key={`catalog-flavor:${flavor}`}
                      type="button"
                      onClick={() => setCatalogFlavorsFilter((current) => toggleSelection(flavor, current))}
                    >
                      {formatLabel(flavor)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-actions">
                <button className="primary-btn" type="button" onClick={() => void loadCatalogMixes()}>
                  Обновить каталог
                </button>
                <button className="secondary-btn" type="button" onClick={() => setStage('home')}>
                  Смотреть рейлы
                </button>
              </div>
            </div>

            {catalogStatus === 'loading' ? <p className="meta-line">Загружаем каталог...</p> : null}
            {catalogError ? <p className="error-text">{catalogError}</p> : null}

            <div className="mix-grid mix-grid--catalog">
              {catalogMixes.length ? (
                catalogMixes.map((mix) => (
                  <MixCardView
                    key={mix.id}
                    mix={mix}
                    sourceLabel="Каталог"
                    chooseBusy={choosingMixId === mix.id}
                    onChoose={(nextMix) => void onChooseMix(nextMix, 'catalog')}
                  />
                ))
              ) : (
                <p className="meta-line">Каталог пока пуст или ещё загружается.</p>
              )}
            </div>
          </section>
        </section>
      ) : null}
    </main>
  );
};
