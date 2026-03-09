import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  getFavorites,
  getMixRatings,
  getMixRatingSummaries,
  getTobaccos,
  removeFavorite,
} from '../shared/apiClient';
import {
  AuthState,
  FavoriteMix,
  FlavorProfile,
  Mix,
  MixRating,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';
import { AppButton, AppInput, AppSelect } from '@/ui-kit';
import { MixInfoModal } from '@/ui/components/MixInfoModal';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';
import { useMediaQuery } from '@/ui/hooks/useMediaQuery';

type FavoritesScreenProps = {
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

const buildActiveFilterLabels = (params: {
  query: string;
  profiles: FlavorProfile[];
  flavors: string[];
  tags: string[];
  sortBy: 'newest' | 'rating' | 'popularity';
}) => {
  const labels: string[] = [];
  if (params.query) {
    labels.push(`Поиск: ${params.query}`);
  }
  if (params.profiles.length) {
    labels.push(`Профили: ${params.profiles.length}`);
  }
  if (params.flavors.length) {
    labels.push(`Вкусы: ${params.flavors.length}`);
  }
  if (params.tags.length) {
    labels.push(`Теги: ${params.tags.length}`);
  }
  if (params.sortBy !== 'newest') {
    labels.push(params.sortBy === 'rating' ? 'Сортировка: рейтинг' : 'Сортировка: популярность');
  }
  return labels;
};

export const FavoritesScreen = ({ authState, onAuthUpdate, onOpenMix }: FavoritesScreenProps) => {
  const isCompactFilters = useMediaQuery('(max-width: 768px)');
  const [items, setItems] = useState<FavoriteMix[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('newest');

  const [selectedProfiles, setSelectedProfiles] = useState<FlavorProfile[]>([]);
  const [profileSearchDraft, setProfileSearchDraft] = useState('');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [flavorSearchDraft, setFlavorSearchDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchDraft, setTagSearchDraft] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [infoMix, setInfoMix] = useState<Mix | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return !window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    getTobaccos({ limit: 200 })
      .then((response) => setTobaccos(response.items))
      .catch(() => setTobaccos([]));
  }, []);

  useEffect(() => {
    if (!isCompactFilters) {
      setFiltersOpen(true);
    }
  }, [isCompactFilters]);

  useEffect(() => {
    if (!authState.tokens) {
      return;
    }

    const loadRatings = async () => {
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
  }, [authState.tokens, onAuthUpdate, reloadSignal]);

  useEffect(() => {
    if (!authState.tokens) {
      return;
    }

    const load = async () => {
      setStatus('loading');
      setFeedback(null);
      try {
        const response = await getFavorites(authState.tokens, onAuthUpdate, {
          search: search || undefined,
          profiles: selectedProfiles.length ? selectedProfiles : undefined,
          flavors: selectedFlavors.length ? selectedFlavors : undefined,
          tags: selectedTags.length ? selectedTags : undefined,
          sort: sortBy,
        });
        setItems(response.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate, reloadSignal, search, selectedFlavors, selectedProfiles, selectedTags, sortBy]);

  const onSubmitFilters = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
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

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }, []);

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

  const resetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setSortBy('newest');
    setSelectedProfiles([]);
    setProfileSearchDraft('');
    setSelectedFlavors([]);
    setFlavorSearchDraft('');
    setSelectedTags([]);
    setTagSearchDraft('');
  };

  const hasFilters = Boolean(
    search || selectedProfiles.length || selectedFlavors.length || selectedTags.length || sortBy !== 'newest',
  );

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

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    tobaccos.forEach((item) => {
      (item.flavorTags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          unique.add(normalized);
        }
      });
    });
    items.forEach((favorite) => {
      (favorite.mix.tags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          unique.add(normalized);
        }
      });
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [items, tobaccos]);

  const filteredProfileOptions = useMemo(() => {
    const query = profileSearchDraft.trim().toLowerCase();
    return PROFILE_OPTIONS.filter((option) =>
      query ? option.label.toLowerCase().includes(query) : true,
    );
  }, [profileSearchDraft]);

  const filteredFlavorOptions = useMemo(() => {
    const query = flavorSearchDraft.trim().toLowerCase();
    return flavorOptions.filter((flavor) => (query ? flavor.includes(query) : true));
  }, [flavorOptions, flavorSearchDraft]);

  const filteredTagOptions = useMemo(() => {
    const query = tagSearchDraft.trim().toLowerCase();
    return tagOptions.filter((tag) => (query ? tag.includes(query) : true));
  }, [tagOptions, tagSearchDraft]);

  const totalLabel = useMemo(() => `${items.length} миксов`, [items.length]);

  const activeFilterLabels = useMemo(
    () =>
      buildActiveFilterLabels({
        query: search,
        profiles: selectedProfiles,
        flavors: selectedFlavors,
        tags: selectedTags,
        sortBy,
      }),
    [search, selectedProfiles, selectedFlavors, selectedTags, sortBy],
  );
  const showAdvancedFilters = !isCompactFilters || filtersOpen;
  const compactFilterButtonLabel = filtersOpen
    ? 'Скрыть фильтры'
    : hasFilters
      ? `Фильтры: ${activeFilterLabels.length || 1}`
      : 'Показать фильтры';

  return (
    <section className="catalog-layout">
      <section className="catalog-body">
        <form className="catalog-controls cinema-controls" onSubmit={onSubmitFilters}>
          <div className="search-row">
            <AppInput
              className="search-input"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Поиск по названию и описанию"
            />
            <AppButton type="submit" className="search-button catalog-find-btn">Найти</AppButton>
          </div>

          {isCompactFilters ? (
            <div className="catalog-mobile-tools">
              <AppButton
                variant="outline"
                className="catalog-mobile-filters-toggle"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                data-testid="favorites-filters-toggle"
              >
                {compactFilterButtonLabel}
              </AppButton>
            </div>
          ) : null}

          <div className="catalog-tools-row">
            <div className="catalog-active-filters" aria-live="polite">
              {activeFilterLabels.length ? activeFilterLabels.map((label) => (
                <span key={label} className="filter-pill">{label}</span>
              )) : <span className="filter-pill muted">Фильтры не заданы</span>}
            </div>
            <AppButton
              variant="ghost"
              className="ghost-button catalog-reset-btn"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Сбросить фильтры
            </AppButton>
          </div>

          {showAdvancedFilters ? (
            <div className="catalog-advanced-filters" data-testid="favorites-advanced-filters">
              <div className="filter-field">
                <span>Сортировка</span>
                <AppSelect
                  value={sortBy}
                  onChange={(next) => setSortBy(next as 'newest' | 'rating' | 'popularity')}
                  options={SORT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                />
              </div>

              <div className="filter-field">
                <span>Теги (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={tagSearchDraft}
                  onChange={(event) => setTagSearchDraft(event.target.value)}
                  placeholder="Поиск по тегам"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedTags.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedTags([])}
                  >
                    Любые теги
                  </AppButton>
                  {filteredTagOptions.map((tag) => (
                    <AppButton
                      key={tag}
                      variant="ghost"
                      className={`filter-option ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </AppButton>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <span>Профили вкуса (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={profileSearchDraft}
                  onChange={(event) => setProfileSearchDraft(event.target.value)}
                  placeholder="Поиск профиля"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedProfiles.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedProfiles([])}
                  >
                    Любой профиль
                  </AppButton>
                  {filteredProfileOptions.map((option) => (
                    <AppButton
                      key={option.value}
                      variant="ghost"
                      className={`filter-option ${selectedProfiles.includes(option.value) ? 'active' : ''}`}
                      onClick={() => toggleProfile(option.value)}
                    >
                      {option.label}
                    </AppButton>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <span>Вкусы (можно несколько)</span>
                <AppInput
                  className="search-input"
                  type="search"
                  value={flavorSearchDraft}
                  onChange={(event) => setFlavorSearchDraft(event.target.value)}
                  placeholder="Поиск вкуса"
                />
                <div className="filter-scrollbox">
                  <AppButton
                    variant="ghost"
                    className={`filter-option ${selectedFlavors.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedFlavors([])}
                  >
                    Любой вкус
                  </AppButton>
                  {filteredFlavorOptions.map((flavor) => (
                    <AppButton
                      key={flavor}
                      variant="ghost"
                      className={`filter-option ${selectedFlavors.includes(flavor) ? 'active' : ''}`}
                      onClick={() => toggleFlavor(flavor)}
                    >
                      {flavor}
                    </AppButton>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </form>

        <section className="catalog-results">
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
                currentUserId={authState.user?.id}
                size="grid"
                onOpen={(currentMix) => onOpenMix(currentMix.id)}
                onOpenInfo={(currentMix) => setInfoMix(currentMix)}
                onToggleFavorite={(currentMix) => {
                  void onRemove(currentMix.id);
                }}
                isFavorite
                ratingTagText={`★ ${summaries[favorite.mix.id]?.avgRating?.toFixed(1).replace('.', ',') ?? '—'}`}
                footerText={`Моя: ${ratings[favorite.mix.id]?.rating ?? 'нет'}`}
              />
            ))}
          </section>
        </section>
      </section>

      <MixInfoModal
        mix={infoMix}
        summary={infoMix ? summaries[infoMix.id] : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setInfoMix(null);
          }
        }}
      />
    </section>
  );
};
