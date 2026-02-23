import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getFavorites,
  getManufacturers,
  getMixRatings,
  getMixRatingSummaries,
  getTobaccos,
  removeFavorite,
} from '../shared/apiClient';
import {
  AuthState,
  FavoriteMix,
  FlavorProfile,
  Manufacturer,
  MixRating,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';

type FavoritesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onOpenMix: (mixId: string) => void;
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

export const FavoritesScreen = ({ authState, onAuthUpdate, onOpenMix }: FavoritesScreenProps) => {
  const [items, setItems] = useState<FavoriteMix[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [manufacturerId, setManufacturerId] = useState('');
  const [tobaccoId, setTobaccoId] = useState('');
  const [profile, setProfile] = useState<'' | FlavorProfile>('');
  const [minRating, setMinRating] = useState<'' | '1' | '2' | '3' | '4' | '5'>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('newest');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    getManufacturers()
      .then((response) => setManufacturers(response.items))
      .catch(() => setManufacturers([]));
  }, []);

  useEffect(() => {
    getTobaccos({
      manufacturerId: manufacturerId || undefined,
      limit: 200,
    })
      .then((response) => {
        setTobaccos(response.items);
        setTobaccoId((current) =>
          current && !response.items.some((item) => item.id === current) ? '' : current,
        );
      })
      .catch(() => setTobaccos([]));
  }, [manufacturerId]);

  useEffect(() => {
    if (!authState.tokens) {
      return;
    }

    const loadRatings = async () => {
      try {
        const [ratingsRes, summariesRes] = await Promise.all([
          getMixRatings(authState.tokens!, onAuthUpdate),
          getMixRatingSummaries(authState.tokens!, onAuthUpdate),
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
  }, [authState.tokens, onAuthUpdate, reloadSignal]);

  useEffect(() => {
    if (!authState.tokens) {
      return;
    }

    const load = async () => {
      setStatus('loading');
      setFeedback(null);
      try {
        const response = await getFavorites(authState.tokens!, onAuthUpdate, {
          search: search || undefined,
          manufacturerId: manufacturerId || undefined,
          tobaccoId: tobaccoId || undefined,
          profile: profile || undefined,
          tags: tags.length ? tags : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          sort: sortBy,
        });
        setItems(response.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [
    authState.tokens,
    manufacturerId,
    minRating,
    onAuthUpdate,
    profile,
    reloadSignal,
    search,
    sortBy,
    tags,
    tobaccoId,
  ]);

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

  const onRemove = async (mixId: string) => {
    if (!authState.tokens) {
      return;
    }

    setFeedback(null);
    try {
      await removeFavorite(authState.tokens, onAuthUpdate, mixId);
      setItems((current) => current.filter((item) => item.mixId !== mixId));
      setReloadSignal((current) => current + 1);
    } catch {
      setFeedback('Не удалось обновить избранное.');
    }
  };

  const hasFilters = Boolean(search || manufacturerId || tobaccoId || profile || tags.length || minRating || sortBy !== 'newest');
  const totalLabel = useMemo(() => `${items.length} миксов`, [items.length]);
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

        <div className="filters-row">
          <label className="filter-field">
            <span>Сортировка</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'newest' | 'rating' | 'popularity')}>
              <option value="newest">По дате добавления</option>
              <option value="rating">По рейтингу</option>
              <option value="popularity">По популярности</option>
            </select>
          </label>

          <label className="filter-field">
            <span>Мин. оценка</span>
            <select value={minRating} onChange={(event) => setMinRating(event.target.value as '' | '1' | '2' | '3' | '4' | '5')}>
              <option value="">Любая</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Бренд</span>
            <select value={manufacturerId} onChange={(event) => setManufacturerId(event.target.value)}>
              <option value="">Все бренды</option>
              {sortedManufacturers.map((item) => (
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
              {sortedTobaccos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.manufacturer.name} · {item.name}
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

        <div className="filter-field">
          <span>Теги (через запятую)</span>
          <input
            className="search-input"
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder="ягодный, вечерний, микс"
          />
        </div>
      </form>

      <section className="card catalog-summary">
        <p className="card-title">Избранное</p>
        <p className="card-text">
          {status === 'loading' ? 'Обновляем список...' : totalLabel}
          {hasFilters ? ' · фильтры активны' : ''}
        </p>
      </section>

      {feedback ? <p className="screen-status error">{feedback}</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить избранное.</p> : null}
      {status !== 'error' && status !== 'loading' && items.length === 0 ? (
        <p className="screen-status">Избранные миксы не найдены.</p>
      ) : null}

      <section className="list-grid cinema-grid">
        {items.map((favorite) => (
          <article
            key={favorite.id}
            className="mix-poster favorite-poster mix-poster-clickable"
            onClick={() => onOpenMix(favorite.mix.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenMix(favorite.mix.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="mix-poster-overlay">
              <div className="mix-header">
                <h3>{favorite.mix.name}</h3>
                <span className="chip">{favorite.mix.components.length} комп.</span>
              </div>
              <p className="mix-description">{favorite.mix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <p className="mix-ratings">
                Моя: <b>{ratings[favorite.mix.id]?.rating ?? 'нет'}</b>
                {' · '}
                Средняя: <b>{summaries[favorite.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
              </p>
              <div className="mix-actions cinema-actions icon-action-row">
                <button
                  type="button"
                  className="icon-btn fav-icon active"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onRemove(favorite.mix.id);
                  }}
                  aria-label="Убрать из избранного"
                >
                  ♥
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
