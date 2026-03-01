import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  addFavorite,
  createMix,
  createMixRating,
  createSession,
  getManufacturers,
  getFavoriteMixIds,
  getMixById,
  getMixes,
  getMixRatings,
  getMixRatingSummaries,
  getTobaccos,
  removeFavorite,
} from '../shared/apiClient';
import {
  AuthState,
  FlavorProfile,
  Manufacturer,
  Mix,
  MixRating,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';
import { AppButton, AppInput, AppSelect, AppTextarea } from '@/ui-kit';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

type MixesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  openMixRequest?: {
    mode: 'detail' | 'create';
    mixId?: string;
    nonce: number;
  } | null;
};

type MixesView = 'list' | 'detail' | 'create';
type DraftComponent = {
  id: number;
  tobaccoId: string;
  proportion: string;
};

const PROFILE_OPTIONS: Array<{ value: '' | FlavorProfile; label: string }> = [
  { value: '', label: 'Все профили' },
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
  { value: 'perfume', label: 'Парфюм' },
];

const PROFILE_COLORS: Record<FlavorProfile, string> = {
  sweet: '#ff8a4a',
  sour: '#e3c64c',
  spicy: '#db5a54',
  fresh: '#53c0d8',
  dessert: '#d78bf5',
  tobacco: '#9c6f4f',
  minty: '#34bfa3',
  fruity: '#ff9f43',
  floral_herbal: '#79a96b',
  citrus: '#f3d250',
  berry: '#d65780',
  perfume: '#b58acb',
};

const PROFILE_VALUES = new Set<FlavorProfile>(Object.keys(PROFILE_COLORS) as FlavorProfile[]);
const SORT_OPTIONS = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'newest', label: 'По дате' },
] as const;
const MIN_RATING_OPTIONS = [
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5' },
] as const;

const sanitizeProfiles = (profiles: unknown[]) =>
  profiles
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile));

export const MixesScreen = ({ authState, onAuthUpdate, openMixRequest }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [favoriteMixIds, setFavoriteMixIds] = useState<Record<string, true>>({});
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);
  const [createTobaccos, setCreateTobaccos] = useState<Tobacco[]>([]);
  const [ownOnly, setOwnOnly] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [manufacturerId, setManufacturerId] = useState('');
  const [tobaccoId, setTobaccoId] = useState('');
  const [profile, setProfile] = useState<'' | FlavorProfile>('');
  const [minRating, setMinRating] = useState<'' | '1' | '2' | '3' | '4' | '5'>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('popularity');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [view, setView] = useState<MixesView>('list');
  const [reloadSignal, setReloadSignal] = useState(0);

  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [activeMix, setActiveMix] = useState<Mix | null>(null);
  const [activeMixStatus, setActiveMixStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createComponents, setCreateComponents] = useState<DraftComponent[]>([
    { id: 1, tobaccoId: '', proportion: '100' },
  ]);
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<string | null>(null);
  const [detailActionPending, setDetailActionPending] = useState(false);
  const nextDraftComponentId = useRef(2);

  useEffect(() => {
    getManufacturers()
      .then((response) => setManufacturers(response.items))
      .catch(() => setManufacturers([]));
  }, []);

  useEffect(() => {
    getTobaccos({ manufacturerId: manufacturerId || undefined, limit: 200 })
      .then((response) => {
        setTobaccos(response.items);
        setTobaccoId((current) =>
          current && !response.items.some((item) => item.id === current) ? '' : current,
        );
      })
      .catch(() => setTobaccos([]));
  }, [manufacturerId]);

  useEffect(() => {
    getTobaccos({ limit: 200 })
      .then((response) => setCreateTobaccos(response.items))
      .catch(() => setCreateTobaccos([]));
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!authState.tokens) {
        return;
      }

      try {
        const response = await getFavoriteMixIds(authState.tokens, onAuthUpdate);
        setFavoriteMixIds(
          response.items.reduce<Record<string, true>>((acc, mixId) => {
            acc[mixId] = true;
            return acc;
          }, {}),
        );
      } catch {
        setFavoriteMixIds({});
      }
    };

    void loadFavorites();
  }, [authState.tokens, onAuthUpdate, reloadSignal]);

  useEffect(() => {
    const loadRatings = async () => {
      if (!authState.tokens) {
        return;
      }

      try {
        const [ratingsRes, summariesRes] = await Promise.all([
          getMixRatings(authState.tokens, onAuthUpdate),
          getMixRatingSummaries(authState.tokens, onAuthUpdate),
        ]);

        setRatings(
          ratingsRes.items.reduce<Record<string, MixRating>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
        setSummaries(
          summariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
      } catch {
        setRatings({});
        setSummaries({});
      }
    };

    void loadRatings();
  }, [authState.tokens, onAuthUpdate]);

  useEffect(() => {
    const load = async () => {
      if (!authState.tokens) {
        return;
      }

      setStatus('loading');
      try {
        const mixesRes = await getMixes(authState.tokens, onAuthUpdate, {
          authorId: ownOnly ? authState.user?.id : undefined,
          search: search || undefined,
          manufacturerId: manufacturerId || undefined,
          tobaccoId: tobaccoId || undefined,
          profile: profile || undefined,
          tags: tags.length ? tags : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          sort: sortBy,
        });

        setItems(mixesRes.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [
    authState.tokens,
    authState.user?.id,
    manufacturerId,
    minRating,
    onAuthUpdate,
    ownOnly,
    profile,
    reloadSignal,
    search,
    sortBy,
    tags,
    tobaccoId,
  ]);

  useEffect(() => {
    const loadActiveMix = async () => {
      if (view !== 'detail' || !activeMixId || !authState.tokens) {
        return;
      }

      setActiveMixStatus('loading');
      try {
        const mix = await getMixById(authState.tokens, onAuthUpdate, activeMixId);
        setActiveMix(mix);
        setActiveMixStatus('idle');
      } catch {
        setActiveMix(null);
        setActiveMixStatus('error');
      }
    };

    void loadActiveMix();
  }, [activeMixId, authState.tokens, onAuthUpdate, view]);

  useEffect(() => {
    if (!openMixRequest) {
      return;
    }

    if (openMixRequest.mode === 'detail' && openMixRequest.mixId) {
      setActiveMixId(openMixRequest.mixId);
      setView('detail');
      return;
    }

    if (openMixRequest.mode === 'create') {
      onOpenCreateScreen();
    }
  }, [openMixRequest?.mode, openMixRequest?.mixId, openMixRequest?.nonce]);

  const sortedItems = useMemo(() => items, [items]);
  const sortedManufacturers = useMemo(
    () => [...manufacturers].sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })),
    [manufacturers],
  );
  const sortedTobaccos = useMemo(
    () =>
      [...tobaccos].sort((a, b) => {
        const byManufacturer = a.manufacturer.name.localeCompare(b.manufacturer.name, 'ru', {
          sensitivity: 'base',
        });
        if (byManufacturer !== 0) {
          return byManufacturer;
        }
        return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
      }),
    [tobaccos],
  );
  const sortedCreateTobaccos = useMemo(
    () =>
      [...createTobaccos].sort((a, b) => {
        const byManufacturer = a.manufacturer.name.localeCompare(b.manufacturer.name, 'ru', {
          sensitivity: 'base',
        });
        if (byManufacturer !== 0) {
          return byManufacturer;
        }
        return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
      }),
    [createTobaccos],
  );
  const hasFilters = Boolean(
    ownOnly || search || manufacturerId || tobaccoId || profile || minRating || tags.length || sortBy !== 'popularity',
  );
  const totalProportion = useMemo(
    () =>
      createComponents.reduce((sum, item) => {
        const value = Number.parseInt(item.proportion, 10);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [createComponents],
  );

  const hasInvalidComponentRows = createComponents.some((item) => {
    const value = Number.parseInt(item.proportion, 10);
    return !item.tobaccoId || !Number.isFinite(value) || value < 1 || value > 100;
  });

  const hasDuplicateTobaccos = useMemo(() => {
    const ids = createComponents.map((item) => item.tobaccoId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [createComponents]);

  const canSubmitCreateMix =
    Boolean(authState.tokens) &&
    createName.trim().length > 0 &&
    createComponents.length > 0 &&
    !hasInvalidComponentRows &&
    !hasDuplicateTobaccos &&
    totalProportion === 100 &&
    createStatus !== 'saving';

  const openMixDetail = (mixId: string) => {
    setActiveMixId(mixId);
    setView('detail');
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateComponents([{ id: 1, tobaccoId: '', proportion: '100' }]);
    nextDraftComponentId.current = 2;
  };

  const onOpenCreateScreen = () => {
    setCreateFeedback(null);
    setCreateStatus('idle');
    resetCreateForm();
    setView('create');
  };

  const onAddComponentRow = () => {
    setCreateComponents((current) => [
      ...current,
      { id: nextDraftComponentId.current++, tobaccoId: '', proportion: '0' },
    ]);
  };

  const onRemoveComponentRow = (id: number) => {
    setCreateComponents((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const onChangeComponentRow = (id: number, patch: Partial<DraftComponent>) => {
    setCreateComponents((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const onSubmitCreateMix = async () => {
    if (!authState.tokens || !canSubmitCreateMix) {
      return;
    }

    setCreateStatus('saving');
    setCreateFeedback(null);
    try {
      const response = await createMix(authState.tokens, onAuthUpdate, {
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        components: createComponents.map((item) => ({
          tobaccoId: item.tobaccoId,
          proportion: Number.parseInt(item.proportion, 10),
        })),
      });

      setCreateStatus('idle');
      setCreateFeedback('Микс создан.');
      setReloadSignal((current) => current + 1);
      setActiveMixId(response.id);
      setView('detail');
    } catch {
      setCreateStatus('error');
      setCreateFeedback('Не удалось создать микс.');
    }
  };

  const toggleFavorite = async (mixId: string) => {
    if (!authState.tokens) {
      return;
    }

    const isFavorite = Boolean(favoriteMixIds[mixId]);
    try {
      if (isFavorite) {
        await removeFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => {
          const next = { ...current };
          delete next[mixId];
          return next;
        });
      } else {
        await addFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => ({
          ...current,
          [mixId]: true,
        }));
      }
    } catch {
      // Ignore toggle errors and keep current state.
    }
  };

  const getMixTone = (mix: Mix) => {
    const palette = ['#d36f2a', '#2888d9', '#24a77c', '#8e56db', '#b74d8e', '#2fa7b2'];
    const source = `${mix.id}:${mix.name}`;
    const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const onSubmitFilters = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setTags(
      tagsDraft
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    );
  };

  const buildConicGradient = (segments: Array<{ value: number; color: string }>) => {
    if (!segments.length) {
      return 'conic-gradient(#2f2b2a 0 100%)';
    }

    let start = 0;
    const parts = segments.map((segment) => {
      const end = start + segment.value;
      const value = `${segment.color} ${start}% ${end}%`;
      start = end;
      return value;
    });
    return `conic-gradient(${parts.join(', ')})`;
  };

  const getTobaccoPieData = (mix: Mix) =>
    mix.components.map((component, index) => ({
      label: `${component.tobacco.manufacturer.name} ${component.tobacco.name}`,
      value: component.proportion,
      color: ['#3b80f5', '#26c281', '#d8873f', '#b96af0', '#e25f7c', '#79c251'][index % 6],
    }));

  const getFlavorPieData = (mix: Mix) => {
    const map = new Map<FlavorProfile, number>();
    for (const component of mix.components) {
      const profiles = sanitizeProfiles(component.tobacco.flavorProfiles ?? []);
      if (!profiles.length) {
        continue;
      }
      const share = component.proportion / profiles.length;
      for (const profile of profiles) {
        map.set(profile, (map.get(profile) ?? 0) + share);
      }
    }

    return Array.from(map.entries())
      .map(([profile, value]) => ({
        label: PROFILE_OPTIONS.find((item) => item.value === profile)?.label ?? profile,
        value: Number(value.toFixed(2)),
        color: PROFILE_COLORS[profile],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const onAddToSession = async (mixId: string) => {
    if (!authState.tokens) {
      return;
    }
    setDetailActionPending(true);
    setDetailFeedback(null);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId,
        date: new Date().toISOString(),
        locationType: 'home',
      });
      setDetailFeedback('Микс добавлен в сессию курения.');
    } catch {
      setDetailFeedback('Не удалось добавить микс в сессию.');
    } finally {
      setDetailActionPending(false);
    }
  };

  const onRateFromDetail = async (mixId: string, rating: number) => {
    if (!authState.tokens) {
      return;
    }
    setDetailActionPending(true);
    setDetailFeedback(null);
    try {
      const result = await createMixRating(authState.tokens, onAuthUpdate, { mixId, rating });
      setRatings((current) => ({
        ...current,
        [mixId]: result,
      }));
      setDetailFeedback('Оценка сохранена.');
      setReloadSignal((current) => current + 1);
    } catch {
      setDetailFeedback('Не удалось сохранить оценку.');
    } finally {
      setDetailActionPending(false);
    }
  };

  if (view === 'detail') {
    return (
      <section className="sessions-layout">
        {activeMixStatus === 'loading' ? <p className="screen-status">Загрузка карточки микса...</p> : null}
        {activeMixStatus === 'error' ? (
          <p className="screen-status error">Не удалось загрузить карточку микса.</p>
        ) : null}

        {activeMix ? (
          <article className="mix-detail-wrap">
            {(() => {
              const tobaccoPieData = getTobaccoPieData(activeMix);
              const flavorPieData = getFlavorPieData(activeMix);
              return (
                <>
            <section
              className="mix-detail-hero"
              style={{
                background: `linear-gradient(120deg, ${getMixTone(activeMix)}99 0%, #131313 60%, #090909 100%)`,
              }}
            >
              <h3>{activeMix.name}</h3>
              <div className="home-hero-meta">
                <span>
                  {activeMix.components
                    .slice(0, 3)
                    .map((component) => component.tobacco.name)
                    .join(' · ')}
                </span>
              </div>
              <div className="home-hero-actions">
                <AppButton
                  variant="ghost"
                  className="mix-detail-session-btn"
                  disabled={detailActionPending}
                  onClick={() => onAddToSession(activeMix.id)}
                >
                  Добавить в сессию
                </AppButton>
                <AppButton
                  variant="icon"
                  className={`mix-action-btn mix-fav-btn mix-detail-fav ${favoriteMixIds[activeMix.id] ? 'active' : ''}`}
                  disabled={detailActionPending}
                  onClick={() => toggleFavorite(activeMix.id)}
                  aria-label={favoriteMixIds[activeMix.id] ? 'Убрать из избранного' : 'Добавить в избранное'}
                >
                  <Heart className="mix-action-icon" aria-hidden="true" />
                </AppButton>
              </div>
            </section>

            <section className="card mix-card">
              <p className="mix-description">{activeMix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <div className="mix-components">
                {activeMix.components.map((component) => (
                  <div key={`${activeMix.id}:${component.tobacco.id}`} className="mix-component-row">
                    <span>
                      {component.tobacco.manufacturer.name} {component.tobacco.name}
                    </span>
                    <b>{component.proportion}%</b>
                  </div>
                ))}
              </div>
              <p className="mix-ratings">
                Моя оценка: <b>{ratings[activeMix.id]?.rating ?? 'нет'}</b>
                {' · '}
                Средняя: <b>{summaries[activeMix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
              </p>
              <div className="session-rating-row">
                {[1, 2, 3, 4, 5].map((score) => (
                  <AppButton
                    key={`${activeMix.id}:${score}`}
                    variant="ghost"
                    className={`score-btn ${ratings[activeMix.id]?.rating === score ? 'active' : ''}`}
                    disabled={detailActionPending}
                    onClick={() => onRateFromDetail(activeMix.id, score)}
                  >
                    {score}
                  </AppButton>
                ))}
              </div>
              <section className="mix-charts">
                <article className="mix-chart-card">
                  <p className="card-title">Диаграмма: вкусы табаков</p>
                  <div
                    className="mix-pie"
                    style={{
                      background: buildConicGradient(tobaccoPieData),
                    }}
                  />
                  <div className="mix-chart-legend">
                    {tobaccoPieData.map((item) => (
                      <div key={`${activeMix.id}:tob:${item.label}`} className="mix-chart-item">
                        <span className="mix-chart-dot" style={{ background: item.color }} />
                        <span>{item.label}</span>
                        <b>{item.value}%</b>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="mix-chart-card">
                  <p className="card-title">Диаграмма: профили вкуса</p>
                  <div
                    className="mix-pie"
                    style={{
                      background: buildConicGradient(flavorPieData),
                    }}
                  />
                  <div className="mix-chart-legend">
                    {flavorPieData.length ? (
                      flavorPieData.map((item) => (
                        <div key={`${activeMix.id}:flv:${item.label}`} className="mix-chart-item">
                          <span className="mix-chart-dot" style={{ background: item.color }} />
                          <span>{item.label}</span>
                          <b>{item.value.toFixed(1)}%</b>
                        </div>
                      ))
                    ) : (
                      <p className="hint">Недостаточно данных профилей для построения диаграммы.</p>
                    )}
                  </div>
                </article>
              </section>
              {detailFeedback ? <p className="hint">{detailFeedback}</p> : null}
              <p className="hint">
                Автор: {activeMix.author?.email ?? 'неизвестно'}
                {' · '}
                Создан: {activeMix.createdAt ? new Date(activeMix.createdAt).toLocaleDateString('ru-RU') : 'нет данных'}
              </p>
            </section>
                </>
              );
            })()}
          </article>
        ) : null}
      </section>
    );
  }

  if (view === 'create') {
    return (
      <section className="sessions-layout">
        <section className="card session-create-card">
          <p className="card-title">Создать микс</p>
          <div className="filter-field">
            <span>Название</span>
            <AppInput
              className="search-input"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Например, Яблочный вечер"
            />
          </div>

          <div className="filter-field">
            <span>Описание</span>
            <AppTextarea
              className="search-input form-textarea"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              placeholder="Кратко про вкус и крепость"
            />
          </div>

          <div className="mix-draft-list">
            {createComponents.map((item) => (
              <div key={item.id} className="mix-draft-row">
                <AppSelect
                  value={item.tobaccoId}
                  onChange={(next) => onChangeComponentRow(item.id, { tobaccoId: next })}
                  options={sortedCreateTobaccos.map((tobacco) => ({
                    value: tobacco.id,
                    label: `${tobacco.manufacturer.name} · ${tobacco.name}`,
                  }))}
                  emptyLabel="Выберите табак"
                />
                <AppInput
                  type="number"
                  min={1}
                  max={100}
                  value={item.proportion}
                  onChange={(event) => onChangeComponentRow(item.id, { proportion: event.target.value })}
                  placeholder="%"
                />
                <AppButton
                  variant="ghost"
                  className="score-btn"
                  onClick={() => onRemoveComponentRow(item.id)}
                  disabled={createComponents.length === 1}
                >
                  ×
                </AppButton>
              </div>
            ))}
          </div>

          <div className="mix-create-actions">
            <AppButton variant="ghost" className="ghost-button mix-draft-add" onClick={onAddComponentRow}>
              Добавить компонент
            </AppButton>
            <p className="hint">
              Сумма пропорций: <b>{totalProportion}%</b>
              {hasDuplicateTobaccos ? ' · есть повторяющиеся табаки' : ''}
            </p>
          </div>

          <AppButton
            className="search-button session-submit"
            onClick={onSubmitCreateMix}
            disabled={!canSubmitCreateMix}
          >
            {createStatus === 'saving' ? 'Сохраняем...' : 'Сохранить микс'}
          </AppButton>

          {createFeedback ? (
            <p className={`hint ${createStatus === 'error' ? 'screen-status error' : ''}`}>{createFeedback}</p>
          ) : null}
        </section>
      </section>
    );
  }

  return (
    <section className="catalog-layout">
      <form className="catalog-controls cinema-controls" onSubmit={onSubmitFilters}>
        <div className="search-row">
          <AppInput
            className="search-input"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Поиск по названию и описанию"
          />
          <AppButton type="submit" className="search-button">Найти</AppButton>
        </div>

        <AppButton className="search-button mix-create-trigger" onClick={onOpenCreateScreen}>
          Создать микс
        </AppButton>

        <div className="filters-row">
          <label className="filter-field">
            <span>Источник</span>
            <AppSelect
              value={ownOnly ? 'mine' : 'all'}
              onChange={(next) => setOwnOnly(next === 'mine')}
              options={[
                { value: 'all', label: 'Все миксы' },
                { value: 'mine', label: 'Только мои' },
              ]}
            />
          </label>

          <label className="filter-field">
            <span>Сортировка</span>
            <AppSelect
              value={sortBy}
              onChange={(next) => setSortBy(next as 'newest' | 'rating' | 'popularity')}
              options={SORT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Мин. оценка</span>
            <AppSelect
              value={minRating}
              onChange={(next) => setMinRating(next as '' | '1' | '2' | '3' | '4' | '5')}
              options={MIN_RATING_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              emptyLabel="Любая"
            />
          </label>
          <label className="filter-field">
            <span>Теги (через запятую)</span>
            <AppInput
              className="search-input"
              value={tagsDraft}
              onChange={(event) => setTagsDraft(event.target.value)}
              placeholder="ягодный, свежий"
            />
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Бренд</span>
            <AppSelect
              value={manufacturerId}
              onChange={setManufacturerId}
              options={sortedManufacturers.map((item) => ({ value: item.id, label: item.name }))}
              emptyLabel="Все бренды"
            />
          </label>

          <label className="filter-field">
            <span>Табак</span>
            <AppSelect
              value={tobaccoId}
              onChange={setTobaccoId}
              options={sortedTobaccos.map((item) => ({ value: item.id, label: `${item.manufacturer.name} · ${item.name}` }))}
              emptyLabel="Любой табак"
            />
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Профиль</span>
            <AppSelect
              value={profile}
              onChange={(next) => setProfile(next as '' | FlavorProfile)}
              options={PROFILE_OPTIONS.filter((item) => item.value !== '').map((item) => ({ value: item.value, label: item.label }))}
              emptyLabel="Все профили"
            />
          </label>
        </div>
      </form>

      <section className="card catalog-summary">
        <p className="card-title">Каталог миксов</p>
        <p className="card-text">
          {status === 'loading' ? 'Обновляем список...' : `${sortedItems.length} миксов`}
          {hasFilters ? ' · фильтры активны' : ''}
        </p>
      </section>

      {status === 'error' ? <p className="screen-status error">Не удалось загрузить миксы.</p> : null}

      {status !== 'error' && status !== 'loading' && !sortedItems.length ? (
        <p className="screen-status">По выбранным фильтрам миксы не найдены.</p>
      ) : null}

      <section className="list-grid cinema-grid">
        {sortedItems.map((mix) => (
          <MixPreviewCard
            key={mix.id}
            mix={mix}
            size="grid"
            onOpen={(currentMix) => openMixDetail(currentMix.id)}
            onToggleFavorite={(currentMix) => {
              void toggleFavorite(currentMix.id);
            }}
            isFavorite={Boolean(favoriteMixIds[mix.id])}
            favoriteGuest={!authState.tokens}
            favoriteTitle={!authState.tokens ? 'Войдите, чтобы управлять избранным' : undefined}
            footerText={`Моя: ${ratings[mix.id]?.rating ?? 'нет'} · Средняя: ${summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}`}
          />
        ))}
      </section>
    </section>
  );
};
