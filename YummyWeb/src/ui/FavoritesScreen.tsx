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
import { AppButton, AppInput, AppSelect } from '@/ui-kit';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

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
  { value: 'minty', label: 'Мятный' },
  { value: 'fruity', label: 'Фруктовый' },
  { value: 'floral_herbal', label: 'Цветочно-травяной' },
  { value: 'citrus', label: 'Цитрусовый' },
  { value: 'berry', label: 'Ягодный' },
  { value: 'perfume', label: 'Парфюм' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'По дате добавления' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'popularity', label: 'По популярности' },
] as const;
const MIN_RATING_OPTIONS = [
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5' },
] as const;

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
          <AppInput
            className="search-input"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Поиск по названию и описанию"
          />
          <AppButton type="submit" className="search-button">Найти</AppButton>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Сортировка</span>
            <AppSelect
              value={sortBy}
              onChange={(next) => setSortBy(next as 'newest' | 'rating' | 'popularity')}
              options={SORT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </label>

          <label className="filter-field">
            <span>Мин. оценка</span>
            <AppSelect
              value={minRating}
              onChange={(next) => setMinRating(next as '' | '1' | '2' | '3' | '4' | '5')}
              options={MIN_RATING_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              emptyLabel="Любая"
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

        <div className="filter-field">
          <span>Теги (через запятую)</span>
          <AppInput
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
          <MixPreviewCard
            key={favorite.id}
            mix={favorite.mix}
            size="grid"
            onOpen={(currentMix) => onOpenMix(currentMix.id)}
            onToggleFavorite={(currentMix) => {
              void onRemove(currentMix.id);
            }}
            isFavorite
            footerText={`Моя: ${ratings[favorite.mix.id]?.rating ?? 'нет'} · Средняя: ${summaries[favorite.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}`}
          />
        ))}
      </section>
    </section>
  );
};
