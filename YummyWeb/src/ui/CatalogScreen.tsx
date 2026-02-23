import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getManufacturers,
  getMixes,
  getMixRatingSummaries,
  getTobaccos,
} from '../shared/apiClient';
import {
  AuthState,
  FlavorProfile,
  Manufacturer,
  Mix,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';

type CatalogScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onOpenMix: (mixId: string) => void;
};

const PROFILE_OPTIONS: Array<{ value: FlavorProfile; label: string }> = [
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
];

export const CatalogScreen = ({ authState, onAuthUpdate, onOpenMix }: CatalogScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);

  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [tobaccoId, setTobaccoId] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<FlavorProfile[]>([]);
  const [tagsDraft, setTagsDraft] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<'' | '1' | '2' | '3' | '4' | '5'>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('popularity');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

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

    const load = async () => {
      setStatus('loading');
      try {
        const [mixesRes, summariesRes] = await Promise.all([
          getMixes(authState.tokens!, onAuthUpdate, {
            search: query || undefined,
            manufacturerId: manufacturerId || undefined,
            tobaccoId: tobaccoId || undefined,
            profiles: selectedProfiles.length ? selectedProfiles : undefined,
            tags: tags.length ? tags : undefined,
            minRating: minRating ? Number(minRating) : undefined,
            sort: sortBy,
          }),
          getMixRatingSummaries(authState.tokens!, onAuthUpdate),
        ]);

        setItems(mixesRes.items);
        setSummaries(
          summariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
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
    query,
    selectedProfiles,
    sortBy,
    tags,
    tobaccoId,
  ]);

  const onSubmitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(queryDraft.trim());
    setTags(
      tagsDraft
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    );
  };

  const toggleProfile = (profile: FlavorProfile) => {
    setSelectedProfiles((current) =>
      current.includes(profile) ? current.filter((item) => item !== profile) : [...current, profile],
    );
  };

  const totalLabel = useMemo(() => `${items.length} миксов`, [items.length]);
  const hasFilters = Boolean(
    query ||
      manufacturerId ||
      tobaccoId ||
      selectedProfiles.length ||
      tags.length ||
      minRating ||
      sortBy !== 'popularity',
  );

  return (
    <section className="catalog-layout">
      <section className="catalog-hero">
        <h2>Каталог миксов</h2>
        <p>Фильтруйте по профилям, тегам, табакам и производителям как в стриминговых каталогах.</p>
      </section>

      <form className="catalog-controls cinema-controls" onSubmit={onSubmitSearch}>
        <div className="search-row">
          <input
            className="search-input"
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Поиск по названию и описанию"
          />
          <button type="submit" className="search-button">Найти</button>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Сортировка</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'newest' | 'rating' | 'popularity')}>
              <option value="popularity">По популярности</option>
              <option value="rating">По рейтингу</option>
              <option value="newest">По дате</option>
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
            <span>Производитель</span>
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

        <div className="filter-field">
          <span>Теги (через запятую)</span>
          <input
            className="search-input"
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder="ягодный, свежий, вечерний"
          />
        </div>

        <section className="card compact-card">
          <p className="card-title">Профили вкуса</p>
          <div className="chip-grid">
            {PROFILE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`option-chip ${selectedProfiles.includes(option.value) ? 'liked' : ''}`}
                onClick={() => toggleProfile(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </form>

      <section className="card catalog-summary">
        <p className="card-title">Результат</p>
        <p className="card-text">
          {status === 'loading' ? 'Обновляем список...' : totalLabel}
          {hasFilters ? ' · фильтры активны' : ''}
        </p>
      </section>

      {status === 'error' ? <p className="screen-status error">Не удалось загрузить каталог миксов.</p> : null}
      {status !== 'error' && status !== 'loading' && !items.length ? (
        <p className="screen-status">По выбранным фильтрам ничего не найдено.</p>
      ) : null}

      <section className="list-grid cinema-grid">
        {items.map((mix) => (
          <article key={mix.id} className="mix-poster">
            <div className="mix-poster-overlay">
              <div className="mix-header">
                <h3>{mix.name}</h3>
                <span className="chip">{mix.components.length} комп.</span>
              </div>
              <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <p className="mix-ratings">
                Средняя: <b>{summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
              </p>
              <div className="mix-actions cinema-actions">
                <button type="button" className="ghost-button" onClick={() => onOpenMix(mix.id)}>
                  Карточка
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
