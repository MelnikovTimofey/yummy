import { FormEvent, KeyboardEvent, UIEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  onAuthUpdate?: (next: AuthState) => void;
  onOpenMix?: (mixId: string) => void;
};

const PROFILE_OPTIONS: Array<{ value: FlavorProfile; label: string }> = [
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

const FILTER_PAGE_SIZE = 40;
const FILTER_SCROLL_THRESHOLD = 48;

const appendUniqueById = <T extends { id: string }>(current: T[], next: T[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
};

const buildActiveFilterLabels = (
  params: {
    query: string;
    manufacturerLabels: string[];
    tobaccoLabels: string[];
    selectedProfiles: FlavorProfile[];
    selectedFlavors: string[];
    tags: string[];
    minRating: '' | '1' | '2' | '3' | '4' | '5';
    sortBy: 'newest' | 'rating' | 'popularity';
  },
) => {
  const labels: string[] = [];
  if (params.query) {
    labels.push(`Поиск: ${params.query}`);
  }
  if (params.manufacturerLabels.length) {
    labels.push(
      params.manufacturerLabels.length === 1
        ? `Бренд: ${params.manufacturerLabels[0]}`
        : `Бренды: ${params.manufacturerLabels.length}`,
    );
  }
  if (params.tobaccoLabels.length) {
    labels.push(
      params.tobaccoLabels.length === 1
        ? `Табак: ${params.tobaccoLabels[0]}`
        : `Табаки: ${params.tobaccoLabels.length}`,
    );
  }
  if (params.selectedProfiles.length) {
    labels.push(`Профили: ${params.selectedProfiles.length}`);
  }
  if (params.selectedFlavors.length) {
    labels.push(`Вкусы: ${params.selectedFlavors.length}`);
  }
  if (params.tags.length) {
    labels.push(`Теги: ${params.tags.join(', ')}`);
  }
  if (params.minRating) {
    labels.push(`Оценка: ${params.minRating}+`);
  }
  if (params.sortBy !== 'popularity') {
    labels.push(params.sortBy === 'rating' ? 'Сортировка: рейтинг' : 'Сортировка: дата');
  }
  return labels;
};

export const CatalogScreen = ({ authState, onAuthUpdate, onOpenMix }: CatalogScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);

  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [manufacturerSearchDraft, setManufacturerSearchDraft] = useState('');
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [selectedManufacturerIds, setSelectedManufacturerIds] = useState<string[]>([]);
  const [manufacturersStatus, setManufacturersStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [manufacturersOffset, setManufacturersOffset] = useState(0);
  const [manufacturersHasMore, setManufacturersHasMore] = useState(true);
  const [tobaccoSearchDraft, setTobaccoSearchDraft] = useState('');
  const [tobaccoSearch, setTobaccoSearch] = useState('');
  const [selectedTobaccoIds, setSelectedTobaccoIds] = useState<string[]>([]);
  const [tobaccosStatus, setTobaccosStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tobaccosOffset, setTobaccosOffset] = useState(0);
  const [tobaccosHasMore, setTobaccosHasMore] = useState(true);
  const [selectedProfiles, setSelectedProfiles] = useState<FlavorProfile[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<'' | '1' | '2' | '3' | '4' | '5'>('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('popularity');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [activeMix, setActiveMix] = useState<Mix | null>(null);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const mixId = (event.state as { catalogMixId?: string } | null)?.catalogMixId;
      if (!mixId) {
        setActiveMix(null);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setManufacturerSearch(manufacturerSearchDraft.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [manufacturerSearchDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTobaccoSearch(tobaccoSearchDraft.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [tobaccoSearchDraft]);

  useEffect(() => {
    let cancelled = false;
    const loadManufacturers = async () => {
      setManufacturersStatus('loading');
      try {
        const response = await getManufacturers({
          search: manufacturerSearch || undefined,
          limit: FILTER_PAGE_SIZE,
          offset: 0,
        });
        if (cancelled) {
          return;
        }

        setManufacturers(response.items);
        setManufacturersOffset(response.items.length);
        setManufacturersHasMore(response.items.length === FILTER_PAGE_SIZE);
        setManufacturersStatus('idle');
      } catch {
        if (cancelled) {
          return;
        }
        setManufacturers([]);
        setManufacturersOffset(0);
        setManufacturersHasMore(false);
        setManufacturersStatus('error');
      }
    };

    void loadManufacturers();
    return () => {
      cancelled = true;
    };
  }, [manufacturerSearch]);

  const loadMoreManufacturers = useCallback(async () => {
    if (!manufacturersHasMore || manufacturersStatus === 'loading') {
      return;
    }

    setManufacturersStatus('loading');
    try {
      const response = await getManufacturers({
        search: manufacturerSearch || undefined,
        limit: FILTER_PAGE_SIZE,
        offset: manufacturersOffset,
      });

      setManufacturers((current) => appendUniqueById(current, response.items));
      setManufacturersOffset((current) => current + response.items.length);
      setManufacturersHasMore(response.items.length === FILTER_PAGE_SIZE);
      setManufacturersStatus('idle');
    } catch {
      setManufacturersStatus('error');
    }
  }, [manufacturerSearch, manufacturersHasMore, manufacturersOffset, manufacturersStatus]);

  useEffect(() => {
    let cancelled = false;
    const loadTobaccos = async () => {
      setTobaccosStatus('loading');
      try {
        const response = await getTobaccos({
          manufacturerId: selectedManufacturerIds.length === 1 ? selectedManufacturerIds[0] : undefined,
          search: tobaccoSearch || undefined,
          limit: FILTER_PAGE_SIZE,
          offset: 0,
        });
        if (cancelled) {
          return;
        }

        setTobaccos(response.items);
        setTobaccosOffset(response.items.length);
        setTobaccosHasMore(response.items.length === FILTER_PAGE_SIZE);
        setTobaccosStatus('idle');
      } catch {
        if (cancelled) {
          return;
        }
        setTobaccos([]);
        setTobaccosOffset(0);
        setTobaccosHasMore(false);
        setTobaccosStatus('error');
      }
    };

    void loadTobaccos();
    return () => {
      cancelled = true;
    };
  }, [selectedManufacturerIds, tobaccoSearch]);

  const loadMoreTobaccos = useCallback(async () => {
    if (!tobaccosHasMore || tobaccosStatus === 'loading') {
      return;
    }

    setTobaccosStatus('loading');
    try {
      const response = await getTobaccos({
        manufacturerId: selectedManufacturerIds.length === 1 ? selectedManufacturerIds[0] : undefined,
        search: tobaccoSearch || undefined,
        limit: FILTER_PAGE_SIZE,
        offset: tobaccosOffset,
      });

      setTobaccos((current) => appendUniqueById(current, response.items));
      setTobaccosOffset((current) => current + response.items.length);
      setTobaccosHasMore(response.items.length === FILTER_PAGE_SIZE);
      setTobaccosStatus('idle');
    } catch {
      setTobaccosStatus('error');
    }
  }, [selectedManufacturerIds, tobaccoSearch, tobaccosHasMore, tobaccosOffset, tobaccosStatus]);

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      try {
        const mixesRequest = getMixes(authState.tokens, onAuthUpdate, {
          search: query || undefined,
          manufacturerIds: selectedManufacturerIds.length ? selectedManufacturerIds : undefined,
          tobaccoIds: selectedTobaccoIds.length ? selectedTobaccoIds : undefined,
          profiles: selectedProfiles.length ? selectedProfiles : undefined,
          flavors: selectedFlavors.length ? selectedFlavors : undefined,
          tags: selectedTags.length ? selectedTags : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          sort: sortBy,
        });
        const summariesRequest = authState.tokens
          ? getMixRatingSummaries(authState.tokens, onAuthUpdate)
          : Promise.resolve({ items: [] });
        const [mixesRes, summariesRes] = await Promise.all([mixesRequest, summariesRequest]);

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
    authState.tokens?.accessToken,
    minRating,
    onAuthUpdate,
    query,
    selectedFlavors,
    selectedManufacturerIds,
    selectedProfiles,
    selectedTags,
    selectedTobaccoIds,
    sortBy,
  ]);

  const onSubmitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(queryDraft.trim());
    if (tagDraft.trim()) {
      setSelectedTags((current) => {
        const nextTag = tagDraft.trim().toLowerCase();
        if (current.includes(nextTag)) {
          return current;
        }
        return [...current, nextTag];
      });
      setTagDraft('');
    }
  };

  const toggleProfile = (profile: FlavorProfile) => {
    setSelectedProfiles((current) =>
      current.includes(profile) ? current.filter((item) => item !== profile) : [...current, profile],
    );
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors((current) =>
      current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor],
    );
  };

  const resetFilters = () => {
    setQueryDraft('');
    setQuery('');
    setManufacturerSearchDraft('');
    setManufacturerSearch('');
    setSelectedManufacturerIds([]);
    setTobaccoSearchDraft('');
    setTobaccoSearch('');
    setSelectedTobaccoIds([]);
    setSelectedProfiles([]);
    setSelectedFlavors([]);
    setTagDraft('');
    setSelectedTags([]);
    setMinRating('');
    setSortBy('popularity');
  };

  const handleManufacturersScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= FILTER_SCROLL_THRESHOLD) {
      void loadMoreManufacturers();
    }
  };

  const handleTobaccosScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= FILTER_SCROLL_THRESHOLD) {
      void loadMoreTobaccos();
    }
  };

  const toggleManufacturer = (manufacturerId: string) => {
    setSelectedManufacturerIds((current) =>
      current.includes(manufacturerId)
        ? current.filter((item) => item !== manufacturerId)
        : [...current, manufacturerId],
    );
  };

  const toggleTobacco = (tobaccoId: string) => {
    setSelectedTobaccoIds((current) =>
      current.includes(tobaccoId)
        ? current.filter((item) => item !== tobaccoId)
        : [...current, tobaccoId],
    );
  };

  const totalLabel = useMemo(() => `${items.length} миксов`, [items.length]);
  const flavorOptions = useMemo(() => {
    const unique = new Set<string>();
    tobaccos.forEach((item) => {
      (item.flavors ?? []).forEach((flavor) => {
        const normalized = flavor.trim().toLowerCase();
        if (normalized) {
          unique.add(normalized);
        }
      });
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [tobaccos]);
  const tagSuggestions = useMemo(() => {
    const unique = new Set<string>();
    tobaccos.forEach((item) => {
      (item.flavorTags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          unique.add(normalized);
        }
      });
    });
    items.forEach((mix) => {
      (mix.tags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          unique.add(normalized);
        }
      });
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [items, tobaccos]);
  const filteredTagSuggestions = useMemo(() => {
    const normalizedDraft = tagDraft.trim().toLowerCase();
    return tagSuggestions
      .filter((tag) => !selectedTags.includes(tag))
      .filter((tag) => (normalizedDraft ? tag.includes(normalizedDraft) : true))
      .slice(0, 8);
  }, [selectedTags, tagDraft, tagSuggestions]);
  const hasFilters = Boolean(
    query ||
      selectedManufacturerIds.length ||
      selectedTobaccoIds.length ||
      selectedProfiles.length ||
      selectedFlavors.length ||
      selectedTags.length ||
      minRating ||
      sortBy !== 'popularity',
  );
  const selectedManufacturerLabels = useMemo(
    () =>
      selectedManufacturerIds
        .map((id) => manufacturers.find((item) => item.id === id)?.name)
        .filter((value): value is string => Boolean(value)),
    [manufacturers, selectedManufacturerIds],
  );
  const selectedTobaccoLabels = useMemo(
    () =>
      selectedTobaccoIds
        .map((id) => tobaccos.find((item) => item.id === id)?.name)
        .filter((value): value is string => Boolean(value)),
    [selectedTobaccoIds, tobaccos],
  );
  const addTag = useCallback((rawTag: string) => {
    const normalized = rawTag.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    setSelectedTags((current) => (current.includes(normalized) ? current : [...current, normalized]));
  }, []);
  const removeTag = useCallback((tag: string) => {
    setSelectedTags((current) => current.filter((item) => item !== tag));
  }, []);
  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagDraft);
      setTagDraft('');
    }
  };
  const activeFilterLabels = useMemo(
    () =>
      buildActiveFilterLabels({
        query,
        manufacturerLabels: selectedManufacturerLabels,
        tobaccoLabels: selectedTobaccoLabels,
        selectedProfiles,
        selectedFlavors,
        tags: selectedTags,
        minRating,
        sortBy,
      }),
    [
      minRating,
      query,
      selectedFlavors,
      selectedManufacturerLabels,
      selectedProfiles,
      selectedTags,
      selectedTobaccoLabels,
      sortBy,
    ],
  );

  if (activeMix) {
    return (
      <section className="sessions-layout">
        <article className="card mix-card">
          <div className="mix-header">
            <h3>{activeMix.name}</h3>
            <span className="chip">{activeMix.components.length} комп.</span>
          </div>
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
            Средняя: <b>{summaries[activeMix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
          </p>
          {!authState.tokens ? (
            <p className="hint">Для добавления в избранное и оценок войдите в аккаунт.</p>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-layout">
      <section className="catalog-hero">
        <h2>Каталог миксов</h2>
        <p>Фильтруйте по профилям, тегам, табакам и производителям как в стриминговых каталогах.</p>
      </section>

      <section className="catalog-body">
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
          <div className="catalog-tools-row">
            <div className="catalog-active-filters" aria-live="polite">
              {activeFilterLabels.length ? activeFilterLabels.map((label) => (
                <span key={label} className="filter-pill">{label}</span>
              )) : <span className="filter-pill muted">Фильтры не заданы</span>}
            </div>
            <button
              type="button"
              className="ghost-button catalog-reset-btn"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Сбросить фильтры
            </button>
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
              <span>Производитель (можно несколько)</span>
              <input
                className="search-input"
                type="search"
                value={manufacturerSearchDraft}
                onChange={(event) => setManufacturerSearchDraft(event.target.value)}
                placeholder="Поиск бренда"
              />
              <div className="filter-scrollbox" onScroll={handleManufacturersScroll}>
                <button
                  type="button"
                  className={`filter-option ${selectedManufacturerIds.length === 0 ? 'active' : ''}`}
                  onClick={() => setSelectedManufacturerIds([])}
                >
                  Все бренды
                </button>
                {manufacturers.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`filter-option ${selectedManufacturerIds.includes(item.id) ? 'active' : ''}`}
                    onClick={() => toggleManufacturer(item.id)}
                  >
                    {item.name}
                  </button>
                ))}
                <p className="filter-scroll-meta">
                  {manufacturersStatus === 'error'
                    ? 'Не удалось загрузить бренды'
                    : manufacturersStatus === 'loading'
                      ? 'Загрузка...'
                      : manufacturersHasMore
                        ? 'Прокрутите вниз для автоподгрузки'
                        : 'Все бренды загружены'}
                </p>
              </div>
            </label>
            <label className="filter-field">
              <span>Табак (можно несколько)</span>
              <input
                className="search-input"
                type="search"
                value={tobaccoSearchDraft}
                onChange={(event) => setTobaccoSearchDraft(event.target.value)}
                placeholder={selectedManufacturerIds.length === 1 ? 'Поиск табака выбранного бренда' : 'Поиск табака'}
              />
              <div className="filter-scrollbox" onScroll={handleTobaccosScroll}>
                <button
                  type="button"
                  className={`filter-option ${selectedTobaccoIds.length === 0 ? 'active' : ''}`}
                  onClick={() => setSelectedTobaccoIds([])}
                >
                  Любой табак
                </button>
                {tobaccos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`filter-option ${selectedTobaccoIds.includes(item.id) ? 'active' : ''}`}
                    onClick={() => toggleTobacco(item.id)}
                  >
                    {item.manufacturer.name} · {item.name}
                  </button>
                ))}
                <p className="filter-scroll-meta">
                  {tobaccosStatus === 'error'
                    ? 'Не удалось загрузить табаки'
                    : tobaccosStatus === 'loading'
                      ? 'Загрузка...'
                      : tobaccosHasMore
                        ? 'Прокрутите вниз для автоподгрузки'
                        : 'Все табаки загружены'}
                </p>
              </div>
            </label>
          </div>

          <div className="filter-field">
            <span>Теги (автодополнение)</span>
            <input
              className="search-input"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={onTagKeyDown}
              placeholder="Введите тег и нажмите Enter"
            />
            {filteredTagSuggestions.length ? (
              <div className="catalog-tag-suggestions">
                {filteredTagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="option-chip"
                    onClick={() => {
                      addTag(tag);
                      setTagDraft('');
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedTags.length ? (
              <div className="catalog-selected-tags">
                {selectedTags.map((tag) => (
                  <button key={tag} type="button" className="filter-pill" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </button>
                ))}
              </div>
            ) : null}
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

          <section className="card compact-card">
            <p className="card-title">Вкусы (можно несколько)</p>
            <div className="chip-grid">
              {flavorOptions.map((flavor) => (
                <button
                  key={flavor}
                  type="button"
                  className={`option-chip ${selectedFlavors.includes(flavor) ? 'liked' : ''}`}
                  onClick={() => toggleFlavor(flavor)}
                >
                  {flavor}
                </button>
              ))}
            </div>
          </section>
        </form>

        <section className="catalog-results">
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
              <article
                key={mix.id}
                className="mix-poster mix-poster-clickable"
                onClick={() => {
                  if (onOpenMix) {
                    onOpenMix(mix.id);
                    return;
                  }
                  window.history.pushState(
                    { ...(window.history.state ?? {}), catalogMixId: mix.id },
                    '',
                    window.location.href,
                  );
                  setActiveMix(mix);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (onOpenMix) {
                      onOpenMix(mix.id);
                      return;
                    }
                    window.history.pushState(
                      { ...(window.history.state ?? {}), catalogMixId: mix.id },
                      '',
                      window.location.href,
                    );
                    setActiveMix(mix);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="mix-poster-overlay">
                  <div className="mix-header">
                    <h3>{mix.name}</h3>
                    <span className="chip">{mix.components.length} комп.</span>
                  </div>
                  <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
                  <p className="mix-ratings">
                    Средняя: <b>{summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
                  </p>
                </div>
              </article>
            ))}
          </section>
        </section>
      </section>
    </section>
  );
};
