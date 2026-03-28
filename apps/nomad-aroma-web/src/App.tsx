import { FormEvent, UIEvent, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type GuestView = 'access' | 'intro' | 'onboarding' | 'recommendations' | 'showcase' | 'catalog' | 'rail';
type AppTab = 'recommendations' | 'showcase' | 'catalog';
type JourneyTab = 'intro' | 'onboarding';
type RailType = 'statistical' | 'prepared' | 'curated';
type MixSource = 'recommendations' | 'showcase' | 'catalog' | 'rail';

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

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeToken = (value: string) => value.trim().toLowerCase();

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

const buildManufacturerKey = (value: string) => normalizeToken(value);

const getMixTone = (mix: MixCard) => {
  const palette = ['#6a1718', '#7d241c', '#8f3f22', '#5a1712', '#7b3021', '#4a1a16'];
  const source = `${mix.name}:${mix.id}`;
  const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const getMixFooterText = (mix: MixCard) => {
  const componentNames = unique(mix.components.map((item) => item.name));
  if (componentNames.length) {
    return componentNames.slice(0, 2).join(' · ');
  }

  if (mix.flavors.length) {
    return mix.flavors.slice(0, 3).join(' · ');
  }

  return 'Состав уточняется';
};

const getDominantProfile = (mix: MixCard) => mix.flavorProfiles[0] ?? null;

const formatRatingTag = (mix: MixCard) => `★ ${mix.avgRating.toFixed(1).replace('.', ',')}`;
const formatPercent = (value: number) => `${Number(value.toFixed(1)).toString().replace('.', ',')}%`;

const buildWeightedRows = (
  mix: MixCard,
  extractor: (component: MixCard['components'][number]) => string[],
) => {
  const weighted = new Map<string, number>();

  for (const component of mix.components) {
    const keys = unique(
      extractor(component)
        .map((item) => item.trim())
        .filter(Boolean),
    );

    if (!keys.length) {
      continue;
    }

    const share = component.proportion / keys.length;

    for (const key of keys) {
      weighted.set(key, (weighted.get(key) ?? 0) + share);
    }
  }

  return Array.from(weighted.entries())
    .map(([key, percent]) => ({ key, percent }))
    .sort((left, right) => right.percent - left.percent);
};

const buildEqualShareRows = (values: string[]) => {
  const items = unique(
    values
      .map((item) => item.trim())
      .filter(Boolean),
  );

  if (!items.length) {
    return [] as Array<{ key: string; percent: number }>;
  }

  const share = 100 / items.length;
  return items.map((key) => ({ key, percent: share }));
};

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

const fetchCatalogMixes = async () => {
  const payload = await requestJson<unknown>('/guest/catalog/mixes');
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

const MixTile = ({
  mix,
  size = 'grid',
  onOpen,
}: {
  mix: MixCard;
  size?: 'rail' | 'grid';
  onOpen: (mix: MixCard) => void;
}) => {
  const dominantProfile = getDominantProfile(mix);

  return (
    <Card asChild className={`mix-unified-card mix-unified-card-${size} interactive`}>
      <article
        onClick={() => onOpen(mix)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(mix);
          }
        }}
        role="button"
        tabIndex={0}
        style={{
          background: `linear-gradient(145deg, ${getMixTone(mix)}b0 0%, #1a1715 74%, #120f0d 100%)`,
        }}
        data-testid={`mix-card-${mix.id}`}
      >
        <div className="mix-unified-overlay">
          <div className="mix-unified-head">
            <div className="mix-unified-title-wrap">
              <p className="mix-unified-title">{mix.name}</p>
            </div>
            {!mix.available ? <Badge className="filter-pill muted">Нет в наличии</Badge> : null}
          </div>
          <div className="mix-unified-body">
            <p className="mix-unified-meta">{mix.flavors.length ? mix.flavors.slice(0, 3).join(' · ') : mix.description}</p>
            <div className="mix-unified-tags">
              <Badge className="profile-tag mix-rating-tag">{formatRatingTag(mix)}</Badge>
              {dominantProfile ? <Badge className="profile-tag">{formatProfileLabel(dominantProfile)}</Badge> : null}
            </div>
            <p className="mix-ratings mix-unified-footer">{getMixFooterText(mix)}</p>
          </div>
        </div>
      </article>
    </Card>
  );
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
  const tobaccoRows = [...mix.components]
    .sort((left, right) => right.proportion - left.proportion)
    .map((component) => ({
      key: `${component.manufacturer} ${component.name}`,
      percent: component.proportion,
    }));
  const flavorRows = buildWeightedRows(mix, (component) => component.flavors).slice(0, 4);
  const profileRows = buildEqualShareRows(mix.flavorProfiles).slice(0, 4);

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="mix-info-modal-shell guest-mix-modal"
      >
        <div className="mix-info-modal">
          <DialogDescription className="sr-only">Карточка выбранного микса с составом, рейтингом и действием выбора.</DialogDescription>
          <div className="mix-detail-top-row">
            <div className="mix-detail-top-main">
              <p className="card-title">{mixSourceLabels[source]}</p>
              <DialogTitle className="mix-info-name" id="guest-mix-modal-title">
                {mix.name}
              </DialogTitle>
            </div>
            <div className="mix-detail-top-actions">
              <Button
                className="search-button recommendation-session mix-detail-select-btn"
                type="button"
                onClick={() => onChoose()}
                disabled={!mix.available || chooseStatus === 'loading' || isSelected}
              >
                {chooseStatus === 'loading' ? 'Выбираем...' : isSelected ? 'Выбранный микс' : 'Выбрать микс'}
              </Button>
              <Button className="ghost-button mix-info-close-btn" variant="outline" type="button" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </div>

          <section className="mix-info-section">
            <p className="mix-info-section-title">О миксе</p>
            <p className="mix-info-description">{mix.description || 'Описание пока не добавлено.'}</p>
            <div className="mix-detail-tags">
              <Badge className="profile-tag mix-rating-tag">{formatRatingTag(mix)}</Badge>
              <Badge className="profile-tag">Выборов: {mix.popularity}</Badge>
              {mix.flavorProfiles.slice(0, 3).map((profile) => (
                <Badge className="profile-tag" key={`${mix.id}:${profile}`}>
                  {formatProfileLabel(profile)}
                </Badge>
              ))}
            </div>
          </section>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Что внутри микса</p>
            <div className="mix-ratio-stack">
              <div className="mix-ratio-group">
                <p className="mix-ratio-title">Табаки</p>
                <div className="mix-ratio-list">
                  {tobaccoRows.map((item) => (
                    <div className="mix-ratio-item" key={`${mix.id}:ratio:tobacco:${item.key}`}>
                      <div className="mix-info-row mix-info-row-compact">
                        <span className="mix-info-label">{item.key}</span>
                        <span className="mix-info-value">{formatPercent(item.percent)}</span>
                      </div>
                      <div className="rail-ratio-bar compact" aria-hidden="true">
                        <span className="rail-ratio-segment" style={{ width: `${item.percent}%`, background: '#f0c27b' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {flavorRows.length ? (
                <div className="mix-ratio-group">
                  <p className="mix-ratio-title">Вкусы</p>
                  <div className="mix-ratio-list">
                    {flavorRows.map((item) => (
                      <div className="mix-ratio-item" key={`${mix.id}:ratio:flavor:${item.key}`}>
                        <div className="mix-info-row mix-info-row-compact">
                          <span className="mix-info-label">{item.key}</span>
                          <span className="mix-info-value">{formatPercent(item.percent)}</span>
                        </div>
                        <div className="rail-ratio-bar compact" aria-hidden="true">
                          <span className="rail-ratio-segment" style={{ width: `${item.percent}%`, background: '#d17f43' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {profileRows.length ? (
                <div className="mix-ratio-group">
                  <p className="mix-ratio-title">Профили</p>
                  <div className="mix-ratio-list">
                    {profileRows.map((item) => (
                      <div className="mix-ratio-item" key={`${mix.id}:ratio:profile:${item.key}`}>
                        <div className="mix-info-row mix-info-row-compact">
                          <span className="mix-info-label">{formatProfileLabel(item.key)}</span>
                          <span className="mix-info-value">{formatPercent(item.percent)}</span>
                        </div>
                        <div className="rail-ratio-bar compact" aria-hidden="true">
                          <span className="rail-ratio-segment" style={{ width: `${item.percent}%`, background: '#8a3028' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Оценка</p>
            <div className="session-rating-row" role="group" aria-label="Оценка микса">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  className={cn('score-btn', ratingValue === value && 'active')}
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => onRate(value)}
                  disabled={ratingStatus === 'loading'}
                >
                  {value}
                </Button>
              ))}
            </div>
            <div className="recommendation-actions">
              {!mix.available ? <p className="screen-status error">Этот микс сейчас недоступен по наличию.</p> : null}
              {chooseError ? <p className="screen-status error">{chooseError}</p> : null}
              {ratingError ? <p className="screen-status error">{ratingError}</p> : null}
              {ratingStatus === 'loading' ? <p className="screen-status">Сохраняем оценку...</p> : null}
              {ratingMessage ? <p className="status ok">{ratingMessage}</p> : null}
            </div>
          </section>
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
  const introTrackRef = useRef<HTMLDivElement | null>(null);

  const [options, setOptions] = useState<OnboardingOptions>({ profiles: [], flavors: [] });
  const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [optionsError, setOptionsError] = useState('');
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [likedFlavors, setLikedFlavors] = useState<string[]>([]);

  const [recommendations, setRecommendations] = useState<MixCard[]>([]);
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recommendationError, setRecommendationError] = useState('');

  const [showcaseRails, setShowcaseRails] = useState<HomeRail[]>([]);
  const [showcaseStatus, setShowcaseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showcaseError, setShowcaseError] = useState('');

  const [catalogSourceMixes, setCatalogSourceMixes] = useState<MixCard[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [catalogError, setCatalogError] = useState('');

  const [selectedMix, setSelectedMix] = useState<SelectedMix | null>(null);
  const [mixModalState, setMixModalState] = useState<MixModalState | null>(null);
  const [chooseStatus, setChooseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [chooseError, setChooseError] = useState('');
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');

  const [selectedRail, setSelectedRail] = useState<HomeRail | null>(null);
  const [railSearch, setRailSearch] = useState('');

  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [manufacturerSearchDraft, setManufacturerSearchDraft] = useState('');
  const [tobaccoSearchDraft, setTobaccoSearchDraft] = useState('');
  const [profileSearchDraft, setProfileSearchDraft] = useState('');
  const [flavorSearchDraft, setFlavorSearchDraft] = useState('');
  const [selectedManufacturerIds, setSelectedManufacturerIds] = useState<string[]>([]);
  const [selectedTobaccoIds, setSelectedTobaccoIds] = useState<string[]>([]);
  const [selectedCatalogProfiles, setSelectedCatalogProfiles] = useState<string[]>([]);
  const [selectedCatalogFlavors, setSelectedCatalogFlavors] = useState<string[]>([]);
  const [appliedManufacturerIds, setAppliedManufacturerIds] = useState<string[]>([]);
  const [appliedTobaccoIds, setAppliedTobaccoIds] = useState<string[]>([]);
  const [appliedCatalogProfiles, setAppliedCatalogProfiles] = useState<string[]>([]);
  const [appliedCatalogFlavors, setAppliedCatalogFlavors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSort>('popularity');
  const [appliedSortBy, setAppliedSortBy] = useState<CatalogSort>('popularity');
  const [isCompactFilters, setIsCompactFilters] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(max-width: 768px)').matches,
  );
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 768px)').matches,
  );

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => {
      setIsCompactFilters(media.matches);
      if (!media.matches) {
        setFiltersOpen(true);
      }
    };

    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

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

  const loadCatalog = async () => {
    setCatalogStatus('loading');
    setCatalogError('');

    try {
      const mixes = await fetchCatalogMixes();
      setCatalogSourceMixes(mixes);
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

    if (introStatus === 'idle') {
      void loadIntroCards();
    }

    if (optionsStatus === 'idle') {
      void loadOnboardingOptions();
    }

    if (showcaseStatus === 'idle') {
      void loadShowcase();
    }

    if (catalogStatus === 'idle') {
      void loadCatalog();
    }
  }, [accessGranted, introStatus, optionsStatus, showcaseStatus, catalogStatus]);

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

  const applyCatalogFilters = () => {
    setQuery(queryDraft.trim());
    setAppliedManufacturerIds(selectedManufacturerIds);
    setAppliedTobaccoIds(selectedTobaccoIds);
    setAppliedCatalogProfiles(selectedCatalogProfiles);
    setAppliedCatalogFlavors(selectedCatalogFlavors);
    setAppliedSortBy(sortBy);
    if (isCompactFilters) {
      setFiltersOpen(false);
    }
  };

  const resetCatalogFilters = () => {
    setQueryDraft('');
    setQuery('');
    setManufacturerSearchDraft('');
    setTobaccoSearchDraft('');
    setProfileSearchDraft('');
    setFlavorSearchDraft('');
    setSelectedManufacturerIds([]);
    setSelectedTobaccoIds([]);
    setSelectedCatalogProfiles([]);
    setSelectedCatalogFlavors([]);
    setAppliedManufacturerIds([]);
    setAppliedTobaccoIds([]);
    setAppliedCatalogProfiles([]);
    setAppliedCatalogFlavors([]);
    setSortBy('popularity');
    setAppliedSortBy('popularity');
  };

  const primeCatalogFromOnboarding = (profiles: string[], flavors: string[]) => {
    setSelectedManufacturerIds([]);
    setSelectedTobaccoIds([]);
    setSelectedCatalogProfiles(profiles);
    setSelectedCatalogFlavors(flavors);
    setAppliedManufacturerIds([]);
    setAppliedTobaccoIds([]);
    setAppliedCatalogProfiles(profiles);
    setAppliedCatalogFlavors(flavors);
    setQueryDraft('');
    setQuery('');
    setSortBy('popularity');
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

  const onSubmitOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
    void sendSmokeCta(mix.id).catch(() => {
      // Ignore analytics errors in the guest flow so card opening stays instant.
    });
  };

  const onChooseMix = async (mix: MixCard, source: MixSource) => {
    setChooseStatus('loading');
    setChooseError('');

    try {
      setSelectedMix({
        id: mix.id,
        source,
      });
      setChooseStatus('ready');
    } catch (cause) {
      setChooseStatus('error');
      setChooseError(cause instanceof Error ? cause.message : 'Не удалось сохранить выбор.');
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
    setRailSearch('');
    resetCatalogFilters();
  };

  const availableProfileOptions = profileOptions.filter((option) =>
    !options.profiles.length || options.profiles.includes(option.value),
  );

  const availableCatalogProfileOptions = profileOptions.filter((option) =>
    catalogSourceMixes.some((mix) => mix.flavorProfiles.includes(option.value)),
  );

  const catalogManufacturers: Array<{ id: string; label: string }> = unique(
    catalogSourceMixes.flatMap((mix) => mix.components.map((component) => component.manufacturer)),
  )
    .sort((left, right) => left.localeCompare(right, 'ru'))
    .map((label) => ({
      id: buildManufacturerKey(label),
      label,
    }));

  const catalogTobaccos: Array<{ id: string; label: string }> = unique(
    catalogSourceMixes.flatMap((mix) => mix.components.map((component) => component.id)),
  )
    .map((id) => {
      const component = catalogSourceMixes.flatMap((mix) => mix.components).find((item) => item.id === id);
      return component
        ? {
            id,
            label: `${component.manufacturer} · ${component.name}`,
          }
        : null;
    })
    .filter((item): item is { id: string; label: string } => Boolean(item))
    .sort((left, right) => left.label.localeCompare(right.label, 'ru'));

  const catalogFlavorOptions = unique(catalogSourceMixes.flatMap((mix) => mix.flavors)).sort((left, right) =>
    left.localeCompare(right, 'ru'),
  );

  const filteredManufacturerOptions = catalogManufacturers.filter((item) =>
    manufacturerSearchDraft.trim()
      ? item.label.toLowerCase().includes(manufacturerSearchDraft.trim().toLowerCase())
      : true,
  );
  const filteredTobaccoOptions = catalogTobaccos.filter((item) =>
    tobaccoSearchDraft.trim() ? item.label.toLowerCase().includes(tobaccoSearchDraft.trim().toLowerCase()) : true,
  );
  const filteredProfileOptions = availableCatalogProfileOptions.filter((item) =>
    profileSearchDraft.trim() ? item.label.toLowerCase().includes(profileSearchDraft.trim().toLowerCase()) : true,
  );
  const filteredFlavorOptions = catalogFlavorOptions.filter((item) =>
    flavorSearchDraft.trim() ? item.toLowerCase().includes(flavorSearchDraft.trim().toLowerCase()) : true,
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
      !appliedManufacturerIds.length
        ? true
        : mix.components.some((component) => appliedManufacturerIds.includes(buildManufacturerKey(component.manufacturer))),
    )
    .filter((mix) =>
      !appliedTobaccoIds.length ? true : mix.components.some((component) => appliedTobaccoIds.includes(component.id)),
    )
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

  const activeFilterLabels = [
    ...(query ? [`Поиск: ${query}`] : []),
    ...(appliedManufacturerIds.length ? [`Бренды: ${appliedManufacturerIds.length}`] : []),
    ...(appliedTobaccoIds.length ? [`Табаки: ${appliedTobaccoIds.length}`] : []),
    ...(appliedCatalogProfiles.length ? [`Профили: ${appliedCatalogProfiles.length}`] : []),
    ...(appliedCatalogFlavors.length ? [`Вкусы: ${appliedCatalogFlavors.length}`] : []),
    ...(appliedSortBy !== 'popularity' ? [sortOptions.find((item) => item.value === appliedSortBy)?.label ?? 'Сортировка'] : []),
  ];

  const hasCatalogFilters =
    Boolean(query) ||
    appliedManufacturerIds.length > 0 ||
    appliedTobaccoIds.length > 0 ||
    appliedCatalogProfiles.length > 0 ||
    appliedCatalogFlavors.length > 0 ||
    appliedSortBy !== 'popularity';

  const selectedMixCard =
    selectedMix?.id
      ? recommendations
          .concat(catalogSourceMixes)
          .concat(showcaseRails.flatMap((rail) => rail.mixes))
          .find((mix) => mix.id === selectedMix.id) ?? null
      : null;

  const railItems = selectedRail
    ? selectedRail.mixes.filter((mix) => {
        if (!railSearch.trim()) {
          return true;
        }

        const haystack = `${mix.name} ${mix.description} ${mix.flavors.join(' ')}`.toLowerCase();
        return haystack.includes(railSearch.trim().toLowerCase());
      })
    : [];

  const introProgress = introCards.length ? `${introIndex + 1} из ${introCards.length}` : 'Загрузка';

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
      return (
        <header className="topbar">
          <div className="topbar-main-row topbar-main-row-compact">
            {renderBrand()}
          </div>
        </header>
      );
    }

    if (view === 'intro') {
      return null;
    }

    const activeTab: AppTab | null =
      view === 'recommendations' || view === 'showcase' || view === 'catalog'
        ? view
        : view === 'rail'
          ? 'showcase'
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
        {view === 'intro' || view === 'onboarding' ? renderJourneyNav(view) : null}
        {activeTab ? renderAppNav(activeTab) : null}
        {view === 'rail' && selectedRail ? (
          <div className="rail-breadcrumb">
            <Button className="ghost-button screen-back-btn" variant="outline" type="button" onClick={() => setView('showcase')}>
              Назад к витрине
            </Button>
            <Badge className="filter-pill">{selectedRail.name}</Badge>
          </div>
        ) : null}
      </header>
    );
  };

  const renderAccessView = () => (
    <section className="auth-layout">
      <Card className="auth-card guest-auth-card">
        <p className="card-title">Код доступа</p>
        <p className="card-text">
          Введите код, который подскажет команда зала. После этого откроется знакомство, подбор и гостевая витрина.
        </p>
        <form className="form" onSubmit={onSubmitAccessCode}>
          <label htmlFor="guest-access-code">Код</label>
          <Input
            id="guest-access-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Например, NOMAD-2026"
            autoComplete="one-time-code"
          />
          <label className="checkbox-row">
            <Checkbox
              id="guest-access-confirmation"
              className="checkbox-input"
              checked={ageConfirmed}
              onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
            />
            <span>Мне уже исполнилось 18 лет</span>
          </label>
          <Button type="submit" disabled={accessStatus === 'loading'}>
            {accessStatus === 'loading' ? 'Проверяем код...' : 'Далее'}
          </Button>
          {accessError ? <p className="screen-status error">{accessError}</p> : null}
        </form>
      </Card>
      <Card className="card compact-card">
        <p className="card-title">Что внутри</p>
        <p className="card-text">
          Сначала сервис познакомит с механикой, затем поможет выбрать вкусовые профили, соберёт рекомендации и покажет витрину с подборками.
        </p>
      </Card>
    </section>
  );

  const renderIntroView = () => (
    <section className="intro-stage">
      {introStatus === 'loading' ? <p className="screen-status">Загружаем знакомство...</p> : null}
      {introError ? <p className="screen-status error">{introError}</p> : null}

      {introCards.length ? (
        <div className="intro-slider-wrap">
          <div
            className="intro-slider-track"
            ref={introTrackRef}
            onScroll={(event: UIEvent<HTMLDivElement>) => {
              const node = event.currentTarget;
              const nextIndex = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
              if (nextIndex !== introIndex) {
                setIntroIndex(nextIndex);
              }
            }}
          >
            {introCards.map((card) => (
              <Card className="card intro-slide intro-slide-fullscreen" key={card.id}>
                <div className="intro-slide-kicker-row">
                  <p className="card-title">Шаг {card.step}</p>
                  <Badge className="filter-pill muted">Карточка {introProgress}</Badge>
                </div>
                <h3 className="intro-slide-title">{card.title}</h3>
                <p className="card-text">{card.description}</p>
                <ul className="intro-bullets">
                  {card.bullets.map((bullet) => (
                    <li key={`${card.id}:${bullet}`}>{bullet}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="intro-slider-controls">
            <div className="intro-dots">
              {introCards.map((card, index) => (
                <Button
                  key={card.id}
                  className={cn('intro-dot', index === introIndex && 'active')}
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => {
                    const track = introTrackRef.current;
                    if (!track) {
                      return;
                    }

                    track.scrollTo({
                      left: track.clientWidth * index,
                      behavior: 'smooth',
                    });
                    setIntroIndex(index);
                  }}
                  aria-label={`Открыть карточку ${index + 1}`}
                />
              ))}
            </div>
            <div className="cinema-actions">
              <Button className="ghost-button" variant="outline" type="button" onClick={finishIntro}>
                Пропустить
              </Button>
              <Button
                className="search-button"
                type="button"
                onClick={() => {
                  if (introIndex >= introCards.length - 1) {
                    finishIntro();
                    return;
                  }

                  const track = introTrackRef.current;
                  if (!track) {
                    return;
                  }

                  const nextIndex = introIndex + 1;
                  track.scrollTo({
                    left: track.clientWidth * nextIndex,
                    behavior: 'smooth',
                  });
                  setIntroIndex(nextIndex);
                }}
              >
                {introIndex >= introCards.length - 1 ? 'Далее к выбору вкусов' : 'Далее'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderOnboardingView = () => (
    <section className="catalog-layout">
      <Card className="card compact-card onboarding-copy-card">
        <p className="card-title">Предпочтения</p>
        <p className="card-text">Выберите профили и вкусы. По ним мы соберём подбор и подсветим релевантный каталог.</p>
      </Card>

      <form className="catalog-controls cinema-controls" onSubmit={onSubmitOnboarding}>
        <div className="catalog-tools-row">
          <div className="selection-summary">
            {likedProfiles.length ? (
              <div className="selection-group">
                <span className="selection-group-label">Профили</span>
                <div className="selection-chip-grid">
                  {likedProfiles.map((item) => (
                    <Badge className="selection-chip" key={item}>
                      {formatProfileLabel(item)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {likedFlavors.length ? (
              <div className="selection-group">
                <span className="selection-group-label">Вкусы</span>
                <div className="selection-chip-grid">
                  {likedFlavors.map((item) => (
                    <Badge className="selection-chip" key={item}>
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {!likedProfiles.length && !likedFlavors.length ? <Badge className="filter-pill muted">Ничего не выбрано</Badge> : null}
          </div>
        </div>

        <div className="filter-field">
          <span>Профили вкуса</span>
          {optionsStatus === 'loading' ? <p className="screen-status">Подтягиваем доступные профили...</p> : null}
          <div className="filter-scrollbox">
            {availableProfileOptions.map((option) => (
              <Button
                key={option.value}
                className={cn('filter-option', likedProfiles.includes(option.value) && 'active')}
                variant="outline"
                type="button"
                onClick={() =>
                  setLikedProfiles((current) =>
                    current.includes(option.value)
                      ? current.filter((item) => item !== option.value)
                      : [...current, option.value],
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="filter-field">
          <span>Вкусы</span>
          <div className="filter-scrollbox">
            {options.flavors.map((flavor) => (
              <Button
                key={flavor}
                className={cn('filter-option', likedFlavors.includes(flavor) && 'active')}
                variant="outline"
                type="button"
                onClick={() =>
                  setLikedFlavors((current) =>
                    current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor],
                  )
                }
              >
                {flavor}
              </Button>
            ))}
          </div>
        </div>

        {optionsError ? <p className="screen-status error">{optionsError}</p> : null}
        {recommendationError ? <p className="screen-status error">{recommendationError}</p> : null}

        <div className="cinema-actions">
          <Button className="search-button" type="submit" disabled={recommendationStatus === 'loading' || optionsStatus !== 'ready'}>
            {recommendationStatus === 'loading' ? 'Собираем подбор...' : 'Показать рекомендации'}
          </Button>
          <Button className="ghost-button" variant="outline" type="button" onClick={() => setView('catalog')}>
            Открыть каталог сразу
          </Button>
        </div>
      </form>
    </section>
  );

  const renderSelectedMixBar = () =>
    selectedMixCard && selectedMix ? (
      <div className="selected-mix-shell">
        <Card className="card compact-card selected-mix-bar">
          <div>
            <p className="card-title">Выбранный микс</p>
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

  const renderRecommendationsView = () => (
    <section className="recommendations-layout">
      <Card className="card catalog-summary">
        <p className="card-title">Подбор для вас</p>
        <p className="card-text">
          {recommendationStatus === 'loading'
            ? 'Собираем список миксов под выбранные вкусы...'
            : recommendations.length
              ? `Найдено ${recommendations.length} вариантов. Откройте карточку микса и посмотрите состав, рейтинг и детали.`
              : 'После выбора вкусов здесь появится персональный подбор.'}
        </p>
      </Card>

      {recommendationError ? <p className="screen-status error">{recommendationError}</p> : null}
      {!recommendations.length && recommendationStatus === 'ready' ? (
        <Card className="card compact-card">
          <p className="card-title">Ничего не найдено</p>
          <p className="card-text">Попробуйте изменить профили и вкусы или сразу перейти в каталог.</p>
          <div className="cinema-actions">
            <Button className="ghost-button" variant="outline" type="button" onClick={() => setView('onboarding')}>
              Изменить предпочтения
            </Button>
            <Button className="search-button" type="button" onClick={() => setView('catalog')}>
              Открыть каталог
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="list-grid cinema-grid">
        {recommendations.map((mix) => (
          <MixTile key={mix.id} mix={mix} onOpen={(currentMix) => openMix(currentMix, 'recommendations')} />
        ))}
      </section>

      <div className="cinema-actions">
        <Button className="ghost-button" variant="outline" type="button" onClick={() => setView('showcase')}>
          Перейти в витрину
        </Button>
        <Button className="ghost-button" variant="outline" type="button" onClick={() => setView('catalog')}>
          Открыть каталог
        </Button>
        <Button className="ghost-button" variant="outline" type="button" onClick={() => setView('onboarding')}>
          Изменить вкусы
        </Button>
      </div>
    </section>
  );

  const renderShowcaseView = () => (
    <section className="home-layout">
      <Card className="card compact-card">
        <p className="card-title">Витрина</p>
        <p className="card-text">
          Здесь собраны готовые подборки, выбор от наших мастеров и миксы, которые чаще выбирают гости.
        </p>
      </Card>

      {showcaseStatus === 'loading' ? <p className="screen-status">Загружаем витрину...</p> : null}
      {showcaseError ? <p className="screen-status error">{showcaseError}</p> : null}
      {!showcaseRails.length && showcaseStatus === 'ready' ? <p className="screen-status">Подборки пока не опубликованы.</p> : null}

      {showcaseRails.map((rail) => (
        <section className="home-rail" key={rail.id}>
          <div className="home-rail-head">
            <Button className="home-rail-title-btn" variant="ghost" type="button" onClick={() => {
              setSelectedRail(rail);
              setRailSearch('');
              setView('rail');
            }}>
              <div className="home-rail-title-line">
                <h3 className="home-rail-title">{rail.name}</h3>
                <Badge className="filter-pill">{railToneLabels[rail.type]}</Badge>
              </div>
              <p className="hint">{rail.description || railDescriptions[rail.type]}</p>
            </Button>
            <Button className="home-link-btn" variant="link" type="button" onClick={() => {
              setSelectedRail(rail);
              setRailSearch('');
              setView('rail');
            }}>
              Смотреть всё
            </Button>
          </div>
          <div className="home-rail-row">
            {rail.mixes.map((mix) => (
              <MixTile key={`${rail.id}:${mix.id}`} mix={mix} size="rail" onOpen={(currentMix) => openMix(currentMix, 'showcase')} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );

  const renderRailView = () => (
    <section className="catalog-layout">
      <Card className="card catalog-summary">
        <p className="card-title">{selectedRail ? railToneLabels[selectedRail.type] : 'Подборка'}</p>
        <p className="card-text">
          {selectedRail?.description || 'Откройте подборку и выберите микс, который хочется показать мастеру.'}
        </p>
      </Card>

      <section className="catalog-body">
        <form
          className="catalog-controls cinema-controls"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div className="search-row">
            <Input
              className="search-input"
              type="search"
              value={railSearch}
              onChange={(event) => setRailSearch(event.target.value)}
              placeholder="Поиск внутри подборки"
            />
          </div>
        </form>

        <section className="catalog-results">
          {!railItems.length ? <p className="screen-status">По этой подборке ничего не найдено.</p> : null}
          <section className="list-grid cinema-grid">
            {railItems.map((mix) => (
              <MixTile key={mix.id} mix={mix} onOpen={(currentMix) => openMix(currentMix, 'rail')} />
            ))}
          </section>
        </section>
      </section>
    </section>
  );

  const renderCatalogView = () => (
    <section className="catalog-layout">
      <section className="catalog-body">
        <form
          className="catalog-controls cinema-controls"
          onSubmit={(event) => {
            event.preventDefault();
            applyCatalogFilters();
          }}
        >
          <div className="search-row">
            <Input
              className="search-input"
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Поиск по названию и описанию"
            />
            {!isCompactFilters ? (
              <Button className="search-button catalog-find-btn" type="submit">
                Найти
              </Button>
            ) : null}
          </div>

          {isCompactFilters ? (
            <div className="catalog-mobile-tools">
              <Button
                className="ghost-button catalog-mobile-filters-toggle"
                variant="outline"
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? 'Скрыть фильтры' : hasCatalogFilters ? `Фильтры: ${activeFilterLabels.length}` : 'Показать фильтры'}
              </Button>
              <Button className="search-button catalog-mobile-inline-submit" type="submit">
                Найти
              </Button>
            </div>
          ) : null}

          <div className="catalog-tools-row">
            <div className="catalog-active-filters" aria-live="polite">
              {activeFilterLabels.length ? (
                activeFilterLabels.map((label) => (
                  <Badge className="filter-pill" key={label}>
                    {label}
                  </Badge>
                ))
              ) : (
                <Badge className="filter-pill muted">Фильтры не заданы</Badge>
              )}
            </div>
            <Button className="ghost-button catalog-reset-btn" variant="outline" type="button" onClick={resetCatalogFilters} disabled={!hasCatalogFilters}>
              Сбросить фильтры
            </Button>
          </div>

          {!isCompactFilters || filtersOpen ? (
            <div className="catalog-advanced-filters">
              <div className="filters-row">
                <label className="filter-field">
                  <span>Сортировка</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value as CatalogSort)}>
                    {sortOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="filter-field">
                <span>Профили вкуса</span>
                <Input
                  className="search-input"
                  type="search"
                  value={profileSearchDraft}
                  onChange={(event) => setProfileSearchDraft(event.target.value)}
                  placeholder="Поиск профиля"
                />
                <div className="filter-scrollbox">
                  <Button
                    className={cn('filter-option', selectedCatalogProfiles.length === 0 && 'active')}
                    variant="outline"
                    type="button"
                    onClick={() => setSelectedCatalogProfiles([])}
                  >
                    Любой профиль
                  </Button>
                  {filteredProfileOptions.map((option) => (
                    <Button
                      key={option.value}
                      className={cn('filter-option', selectedCatalogProfiles.includes(option.value) && 'active')}
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setSelectedCatalogProfiles((current) =>
                          current.includes(option.value)
                            ? current.filter((item) => item !== option.value)
                            : [...current, option.value],
                        )
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <span>Вкусы</span>
                <Input
                  className="search-input"
                  type="search"
                  value={flavorSearchDraft}
                  onChange={(event) => setFlavorSearchDraft(event.target.value)}
                  placeholder="Поиск вкуса"
                />
                <div className="filter-scrollbox">
                  <Button
                    className={cn('filter-option', selectedCatalogFlavors.length === 0 && 'active')}
                    variant="outline"
                    type="button"
                    onClick={() => setSelectedCatalogFlavors([])}
                  >
                    Любой вкус
                  </Button>
                  {filteredFlavorOptions.map((option) => (
                    <Button
                      key={option}
                      className={cn('filter-option', selectedCatalogFlavors.includes(option) && 'active')}
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setSelectedCatalogFlavors((current) =>
                          current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
                        )
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="filters-row">
                <label className="filter-field">
                  <span>Производитель</span>
                  <Input
                    className="search-input"
                    type="search"
                    value={manufacturerSearchDraft}
                    onChange={(event) => setManufacturerSearchDraft(event.target.value)}
                    placeholder="Поиск бренда"
                  />
                  <div className="filter-scrollbox">
                    <Button
                      className={cn('filter-option', selectedManufacturerIds.length === 0 && 'active')}
                      variant="outline"
                      type="button"
                      onClick={() => setSelectedManufacturerIds([])}
                    >
                      Все бренды
                    </Button>
                    {filteredManufacturerOptions.map((item) => (
                      <Button
                        key={item.id}
                        className={cn('filter-option', selectedManufacturerIds.includes(item.id) && 'active')}
                        variant="outline"
                        type="button"
                        onClick={() =>
                          setSelectedManufacturerIds((current) =>
                            current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id],
                          )
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </label>

                <label className="filter-field">
                  <span>Табак</span>
                  <Input
                    className="search-input"
                    type="search"
                    value={tobaccoSearchDraft}
                    onChange={(event) => setTobaccoSearchDraft(event.target.value)}
                    placeholder="Поиск табака"
                  />
                  <div className="filter-scrollbox">
                    <Button
                      className={cn('filter-option', selectedTobaccoIds.length === 0 && 'active')}
                      variant="outline"
                      type="button"
                      onClick={() => setSelectedTobaccoIds([])}
                    >
                      Любой табак
                    </Button>
                    {filteredTobaccoOptions.map((item) => (
                      <Button
                        key={item.id}
                        className={cn('filter-option', selectedTobaccoIds.includes(item.id) && 'active')}
                        variant="outline"
                        type="button"
                        onClick={() =>
                          setSelectedTobaccoIds((current) =>
                            current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id],
                          )
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </label>
              </div>
            </div>
          ) : null}
        </form>

        <section className="catalog-results">
          <Card className="card catalog-summary">
            <p className="card-title">Результат</p>
            <p className="card-text">
              {catalogStatus === 'loading'
                ? 'Обновляем каталог...'
                : `${filteredCatalogMixes.length} миксов${hasCatalogFilters ? ' · фильтры активны' : ''}`}
            </p>
          </Card>

          {catalogError ? <p className="screen-status error">{catalogError}</p> : null}
          {!filteredCatalogMixes.length && catalogStatus === 'ready' ? (
            <p className="screen-status">По выбранным фильтрам ничего не найдено.</p>
          ) : null}

          <section className="list-grid cinema-grid">
            {filteredCatalogMixes.map((mix) => (
              <MixTile key={mix.id} mix={mix} onOpen={(currentMix) => openMix(currentMix, 'catalog')} />
            ))}
          </section>
        </section>
      </section>
    </section>
  );

  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        {renderTopbar()}
        {accessGranted && view !== 'intro' ? renderSelectedMixBar() : null}
        <main className={view === 'intro' ? 'content content-intro' : 'content'}>
          {!accessGranted ? renderAccessView() : null}
          {accessGranted && view === 'intro' ? renderIntroView() : null}
          {accessGranted && view === 'onboarding' ? renderOnboardingView() : null}
          {accessGranted && view === 'recommendations' ? renderRecommendationsView() : null}
          {accessGranted && view === 'showcase' ? renderShowcaseView() : null}
          {accessGranted && view === 'catalog' ? renderCatalogView() : null}
          {accessGranted && view === 'rail' ? renderRailView() : null}
        </main>
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
