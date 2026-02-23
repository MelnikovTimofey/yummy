import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  addFavorite,
  createMix,
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

type MixesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
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
];

export const MixesScreen = ({ authState, onAuthUpdate }: MixesScreenProps) => {
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
  const [manufacturerId, setManufacturerId] = useState('');
  const [tobaccoId, setTobaccoId] = useState('');
  const [profile, setProfile] = useState<'' | FlavorProfile>('');
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
    onAuthUpdate,
    ownOnly,
    profile,
    reloadSignal,
    search,
    sortBy,
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

  const sortedItems = useMemo(() => items, [items]);
  const hasFilters = Boolean(ownOnly || search || manufacturerId || tobaccoId || profile || sortBy !== 'popularity');
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
  };

  if (view === 'detail') {
    return (
      <section className="sessions-layout">
        <button type="button" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к списку
        </button>

        {activeMixStatus === 'loading' ? <p className="screen-status">Загрузка карточки микса...</p> : null}
        {activeMixStatus === 'error' ? (
          <p className="screen-status error">Не удалось загрузить карточку микса.</p>
        ) : null}

        {activeMix ? (
          <article className="mix-detail-wrap">
            <section
              className="mix-detail-hero"
              style={{
                background: `linear-gradient(120deg, ${getMixTone(activeMix)}99 0%, #131313 60%, #090909 100%)`,
              }}
            >
              <span className="home-hero-badge">Карточка микса</span>
              <h3>{activeMix.name}</h3>
              <div className="home-hero-meta">
                <span className="rating-pill">{activeMix.components.length}</span>
                <span>
                  {activeMix.components
                    .slice(0, 3)
                    .map((component) => component.tobacco.name)
                    .join(' · ')}
                </span>
              </div>
              <div className="home-hero-actions">
                <button type="button" className="search-button">
                  Добавить в сессию
                </button>
                <button type="button" className="ghost-button home-hero-secondary" onClick={() => toggleFavorite(activeMix.id)}>
                  {favoriteMixIds[activeMix.id] ? 'Убрать из избранного' : 'В избранное'}
                </button>
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
              <p className="hint">
                Автор: {activeMix.author?.email ?? 'неизвестно'}
                {' · '}
                Создан: {activeMix.createdAt ? new Date(activeMix.createdAt).toLocaleDateString('ru-RU') : 'нет данных'}
              </p>
            </section>
          </article>
        ) : null}
      </section>
    );
  }

  if (view === 'create') {
    return (
      <section className="sessions-layout">
        <button type="button" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к списку
        </button>

        <section className="card session-create-card">
          <p className="card-title">Создать микс</p>
          <div className="filter-field">
            <span>Название</span>
            <input
              className="search-input"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Например, Яблочный вечер"
            />
          </div>

          <div className="filter-field">
            <span>Описание</span>
            <textarea
              className="search-input form-textarea"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              placeholder="Кратко про вкус и крепость"
            />
          </div>

          <div className="mix-draft-list">
            {createComponents.map((item) => (
              <div key={item.id} className="mix-draft-row">
                <select
                  value={item.tobaccoId}
                  onChange={(event) => onChangeComponentRow(item.id, { tobaccoId: event.target.value })}
                >
                  <option value="">Выберите табак</option>
                  {createTobaccos.map((tobacco) => (
                    <option key={tobacco.id} value={tobacco.id}>
                      {tobacco.manufacturer.name} · {tobacco.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={item.proportion}
                  onChange={(event) => onChangeComponentRow(item.id, { proportion: event.target.value })}
                  placeholder="%"
                />
                <button
                  type="button"
                  className="score-btn"
                  onClick={() => onRemoveComponentRow(item.id)}
                  disabled={createComponents.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mix-create-actions">
            <button type="button" className="ghost-button mix-draft-add" onClick={onAddComponentRow}>
              Добавить компонент
            </button>
            <p className="hint">
              Сумма пропорций: <b>{totalProportion}%</b>
              {hasDuplicateTobaccos ? ' · есть повторяющиеся табаки' : ''}
            </p>
          </div>

          <button
            type="button"
            className="search-button session-submit"
            onClick={onSubmitCreateMix}
            disabled={!canSubmitCreateMix}
          >
            {createStatus === 'saving' ? 'Сохраняем...' : 'Сохранить микс'}
          </button>

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
          <input
            className="search-input"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Поиск по названию и описанию"
          />
          <button type="submit" className="search-button">Найти</button>
        </div>

        <button type="button" className="search-button mix-create-trigger" onClick={onOpenCreateScreen}>
          Создать микс
        </button>

        <div className="filters-row">
          <label className="filter-field">
            <span>Источник</span>
            <select
              value={ownOnly ? 'mine' : 'all'}
              onChange={(event) => setOwnOnly(event.target.value === 'mine')}
            >
              <option value="all">Все миксы</option>
              <option value="mine">Только мои</option>
            </select>
          </label>

          <label className="filter-field">
            <span>Сортировка</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'newest' | 'rating' | 'popularity')}>
              <option value="popularity">По популярности</option>
              <option value="rating">По рейтингу</option>
              <option value="newest">По дате</option>
            </select>
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Бренд</span>
            <select value={manufacturerId} onChange={(event) => setManufacturerId(event.target.value)}>
              <option value="">Все бренды</option>
              {manufacturers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Табак</span>
            <select value={tobaccoId} onChange={(event) => setTobaccoId(event.target.value)}>
              <option value="">Любой табак</option>
              {tobaccos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Профиль</span>
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value as '' | FlavorProfile)}
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
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
          <article
            key={mix.id}
            className="mix-poster"
            style={{
              background: `linear-gradient(130deg, ${getMixTone(mix)}88 0%, #171717 60%, #101010 100%)`,
            }}
          >
            <div className="mix-poster-overlay">
              <div className="mix-header">
                <h3>{mix.name}</h3>
                <span className="chip">{mix.components.length} комп.</span>
              </div>
              <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <p className="mix-ratings">
                Моя: <b>{ratings[mix.id]?.rating ?? 'нет'}</b>
                {' · '}
                Средняя: <b>{summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
              </p>
              <div className="mix-actions cinema-actions">
                <button type="button" className="ghost-button" onClick={() => openMixDetail(mix.id)}>
                  Карточка
                </button>
                <button type="button" className="ghost-button" onClick={() => toggleFavorite(mix.id)}>
                  {favoriteMixIds[mix.id] ? 'Убрать из избранного' : 'В избранное'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
