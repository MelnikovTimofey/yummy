import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  createSession,
  deleteSession,
  getMixes,
  getMixRatingSummaries,
  getSessions,
} from '../shared/apiClient';
import {
  AuthState,
  FlavorProfile,
  Mix,
  MixRatingSummary,
  SmokingSession,
} from '../shared/types';
import { AppButton, AppInput, AppSelect } from '@/ui-kit';
import { AddToSessionModal } from '@/ui/components/AddToSessionModal';
import { MixInfoModal } from '@/ui/components/MixInfoModal';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

type SessionsScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

type SessionsView = 'list' | 'compose';

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

const dedupe = <T,>(items: T[]) => Array.from(new Set(items));

const normalizeList = (items: string[]) =>
  dedupe(
    items
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0),
  );

const getMixProfiles = (mix: Mix) =>
  dedupe([
    ...(mix.flavorProfiles ?? []),
    ...mix.components.flatMap((component) => component.tobacco.flavorProfiles ?? []),
  ]);

const getMixFlavors = (mix: Mix) =>
  normalizeList([
    ...(mix.flavors ?? []),
    ...mix.components.flatMap((component) => component.tobacco.flavors ?? []),
  ]);

const getMixTags = (mix: Mix) =>
  normalizeList([
    ...(mix.tags ?? []),
    ...mix.components.flatMap((component) => component.tobacco.flavorTags ?? []),
  ]);

export const SessionsScreen = ({ authState, onAuthUpdate }: SessionsScreenProps) => {
  const [items, setItems] = useState<SmokingSession[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [view, setView] = useState<SessionsView>('list');

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<FlavorProfile[]>([]);
  const [profileSearchDraft, setProfileSearchDraft] = useState('');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [flavorSearchDraft, setFlavorSearchDraft] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchDraft, setTagSearchDraft] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'popularity'>('popularity');

  const [sessionTargetMix, setSessionTargetMix] = useState<Mix | null>(null);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [infoMix, setInfoMix] = useState<Mix | null>(null);

  const load = async () => {
    if (!authState.tokens) {
      return;
    }

    setStatus('loading');
    try {
      const [sessionsRes, mixesRes, mixSummariesRes] = await Promise.all([
        getSessions(authState.tokens, onAuthUpdate),
        getMixes(authState.tokens, onAuthUpdate),
        getMixRatingSummaries(authState.tokens, onAuthUpdate),
      ]);

      setItems(sessionsRes.items);
      setMixes(mixesRes.items);
      setMixSummaries(
        mixSummariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
          acc[item.mixId] = item;
          return acc;
        }, {}),
      );
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void load();
  }, [authState.tokens]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  );

  const flavorOptions = useMemo(() => {
    const unique = new Set<string>();
    mixes.forEach((mix) => {
      getMixFlavors(mix).forEach((flavor) => unique.add(flavor));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [mixes]);

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    mixes.forEach((mix) => {
      getMixTags(mix).forEach((tag) => unique.add(tag));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [mixes]);

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

  const filteredMixes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matchesSearch = (mix: Mix) => {
      if (!query) {
        return true;
      }
      const source = [
        mix.name,
        mix.description ?? '',
        ...mix.components.map((component) => component.tobacco.name),
      ]
        .join(' ')
        .toLowerCase();
      return source.includes(query);
    };

    const matchesProfiles = (mix: Mix) => {
      if (!selectedProfiles.length) {
        return true;
      }
      const profiles = getMixProfiles(mix);
      return selectedProfiles.every((profile) => profiles.includes(profile));
    };

    const matchesFlavors = (mix: Mix) => {
      if (!selectedFlavors.length) {
        return true;
      }
      const flavors = getMixFlavors(mix);
      return selectedFlavors.every((flavor) => flavors.includes(flavor));
    };

    const matchesTags = (mix: Mix) => {
      if (!selectedTags.length) {
        return true;
      }
      const tags = getMixTags(mix);
      return selectedTags.every((tag) => tags.includes(tag));
    };

    return mixes
      .filter((mix) => matchesSearch(mix) && matchesProfiles(mix) && matchesFlavors(mix) && matchesTags(mix))
      .sort((left, right) => {
        if (sortBy === 'newest') {
          return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
        }
        if (sortBy === 'rating') {
          return (mixSummaries[right.id]?.avgRating ?? 0) - (mixSummaries[left.id]?.avgRating ?? 0);
        }
        return (mixSummaries[right.id]?.count ?? 0) - (mixSummaries[left.id]?.count ?? 0);
      });
  }, [mixSummaries, mixes, search, selectedFlavors, selectedProfiles, selectedTags, sortBy]);

  const canOpenCompose = mixes.length > 0;

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

  const hasFilters = Boolean(
    search || selectedProfiles.length || selectedFlavors.length || selectedTags.length || sortBy !== 'popularity',
  );

  const resetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setSelectedProfiles([]);
    setProfileSearchDraft('');
    setSelectedFlavors([]);
    setFlavorSearchDraft('');
    setSelectedTags([]);
    setTagSearchDraft('');
    setSortBy('popularity');
  };

  const onCreateSession = async (payload: { locationType: 'home' | 'lounge'; locationName?: string }) => {
    if (!authState.tokens || !sessionTargetMix) {
      return;
    }

    setSessionSubmitting(true);
    setFeedback(null);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId: sessionTargetMix.id,
        date: new Date().toISOString(),
        locationType: payload.locationType,
        locationName: payload.locationName,
      });
      setSessionTargetMix(null);
      setInfoMix(null);
      setFeedback('Сессия сохранена.');
      setView('list');
      await load();
    } catch {
      setFeedback('Не удалось сохранить сессию.');
    } finally {
      setSessionSubmitting(false);
    }
  };

  const onDeleteSession = async (sessionId: string) => {
    if (!authState.tokens) {
      return;
    }

    const confirmed = window.confirm('Удалить эту сессию?');
    if (!confirmed) {
      return;
    }

    setDeletingSessionId(sessionId);
    setFeedback(null);
    try {
      await deleteSession(authState.tokens, onAuthUpdate, sessionId);
      setItems((current) => current.filter((item) => item.id !== sessionId));
      setFeedback('Сессия удалена.');
    } catch {
      setFeedback('Не удалось удалить сессию.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  if (view === 'compose') {
    return (
      <section className="catalog-layout sessions-compose-layout">
        <AppButton variant="ghost" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к сессиям
        </AppButton>

        <section className="catalog-body">
          <form className="catalog-controls cinema-controls" onSubmit={onSubmitFilters}>
            <div className="search-row">
              <AppInput
                className="search-input"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Поиск микса по названию"
              />
              <AppButton type="submit" className="search-button catalog-find-btn">Найти</AppButton>
            </div>

            <div className="catalog-tools-row">
              <p className="hint">Нажмите карточку или `info`, чтобы добавить микс в сессию через попап.</p>
              <AppButton
                variant="ghost"
                className="ghost-button catalog-reset-btn"
                onClick={resetFilters}
                disabled={!hasFilters}
              >
                Сбросить фильтры
              </AppButton>
            </div>

            <label className="filter-field">
              <span>Сортировка</span>
              <AppSelect
                value={sortBy}
                onChange={(next) => setSortBy(next as 'newest' | 'rating' | 'popularity')}
                options={[
                  { value: 'popularity', label: 'По популярности' },
                  { value: 'rating', label: 'По рейтингу' },
                  { value: 'newest', label: 'По дате' },
                ]}
              />
            </label>

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
          </form>

          <section className="catalog-results">
            <section className="card catalog-summary">
              <p className="card-title">Выбор микса для сессии</p>
              <p className="card-text">{status === 'loading' ? 'Обновляем список...' : `${filteredMixes.length} миксов`}</p>
            </section>

            {status === 'loading' ? <p className="screen-status">Загрузка миксов...</p> : null}
            {status === 'error' ? <p className="screen-status error">Не удалось загрузить список миксов.</p> : null}
            {!filteredMixes.length && status === 'idle' ? <p className="screen-status">По фильтрам ничего не найдено.</p> : null}

            <section className="list-grid cinema-grid">
              {filteredMixes.map((mix) => (
                <MixPreviewCard
                  key={mix.id}
                  mix={mix}
                  size="grid"
                  onOpen={(currentMix) => setSessionTargetMix(currentMix)}
                  onOpenInfo={(currentMix) => setInfoMix(currentMix)}
                  ratingTagText={`★ ${mixSummaries[mix.id]?.avgRating?.toFixed(1).replace('.', ',') ?? '—'}`}
                  footerText="Добавить в сессию"
                />
              ))}
            </section>
          </section>
        </section>

        <MixInfoModal
          mix={infoMix}
          summary={infoMix ? mixSummaries[infoMix.id] : undefined}
          onOpenChange={(open) => {
            if (!open) {
              setInfoMix(null);
            }
          }}
          action={
            infoMix ? (
              <AppButton
                className="search-button session-info-action"
                onClick={() => {
                  setSessionTargetMix(infoMix);
                  setInfoMix(null);
                }}
              >
                Добавить в сессию
              </AppButton>
            ) : undefined
          }
        />

        <AddToSessionModal
          open={Boolean(sessionTargetMix)}
          mixName={sessionTargetMix?.name}
          submitting={sessionSubmitting}
          onOpenChange={(open) => {
            if (!open) {
              setSessionTargetMix(null);
            }
          }}
          onSubmit={onCreateSession}
        />
      </section>
    );
  }

  return (
    <section className="sessions-layout">
      <section className="card session-create-card">
        <p className="card-title">Сессии курения</p>
        <p className="card-text">Добавляйте новые сессии через выбор микса с фильтрами и быстрым сохранением.</p>
        <AppButton
          variant="ghost"
          className="session-open-compose"
          onClick={() => setView('compose')}
          disabled={!canOpenCompose}
        >
          Добавить сессию
        </AppButton>
        {!canOpenCompose ? <p className="hint">Сначала создайте хотя бы один микс.</p> : null}
        {feedback ? <p className="hint">{feedback}</p> : null}
      </section>

      {status === 'loading' ? <p className="screen-status">Загрузка сессий...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить сессии.</p> : null}
      {!sortedItems.length && status === 'idle' ? <p className="screen-status">Список сессий пока пуст.</p> : null}

      {sortedItems.length ? (
        <section className="card session-table-card">
          <div className="session-table-wrap">
            <table className="session-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Микс</th>
                  <th>Локация</th>
                  <th>Оценка</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleString('ru-RU')}</td>
                    <td>{item.mix.name}</td>
                    <td>{item.locationType === 'home' ? 'Дом' : `Лаунж · ${item.locationName ?? 'без названия'}`}</td>
                    <td>{mixSummaries[item.mix.id]?.avgRating?.toFixed(1) ?? '—'}</td>
                    <td>
                      <AppButton
                        variant="ghost"
                        className="session-delete-btn"
                        disabled={deletingSessionId === item.id}
                        onClick={() => {
                          void onDeleteSession(item.id);
                        }}
                      >
                        {deletingSessionId === item.id ? 'Удаляем...' : 'Удалить'}
                      </AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
};
