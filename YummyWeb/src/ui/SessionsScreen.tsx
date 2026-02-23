import { useEffect, useMemo, useState } from 'react';
import {
  createSession,
  getMixes,
  getMixRatingSummaries,
  getSessions,
} from '../shared/apiClient';
import {
  AuthState,
  Mix,
  MixRatingSummary,
  SmokingSession,
} from '../shared/types';

type SessionsScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

type SessionsView = 'list' | 'create' | 'pick-mix';

export const SessionsScreen = ({ authState, onAuthUpdate }: SessionsScreenProps) => {
  const [items, setItems] = useState<SmokingSession[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [view, setView] = useState<SessionsView>('list');

  const [selectedMixId, setSelectedMixId] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');
  const [pickSearch, setPickSearch] = useState('');

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
      setSelectedMixId((current) => current || mixesRes.items[0]?.id || '');
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void load();
  }, [authState.tokens]);

  const canCreate = Boolean(selectedMixId) && (locationType === 'home' || locationName.trim().length > 0);

  const onCreateSession = async () => {
    if (!authState.tokens || !canCreate) {
      return;
    }

    setFeedback(null);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId: selectedMixId,
        date: new Date().toISOString(),
        locationType,
        locationName: locationType === 'lounge' ? locationName.trim() : undefined,
      });
      setLocationName('');
      setFeedback('Сессия создана.');
      setView('list');
      await load();
    } catch {
      setFeedback('Не удалось создать сессию.');
    }
  };

  const sortedItems = useMemo(() => items, [items]);
  const selectedMix = useMemo(
    () => mixes.find((item) => item.id === selectedMixId) ?? null,
    [mixes, selectedMixId],
  );
  const canOpenCreate = mixes.length > 0;
  const filteredMixes = useMemo(() => {
    const query = pickSearch.trim().toLowerCase();
    if (!query) {
      return mixes;
    }

    return mixes.filter((mix) => {
      const source = [
        mix.name,
        mix.description ?? '',
        ...mix.components.map((component) => component.tobacco.name),
      ]
        .join(' ')
        .toLowerCase();
      return source.includes(query);
    });
  }, [mixes, pickSearch]);

  const onOpenCreate = () => {
    if (!canOpenCreate) {
      return;
    }

    setFeedback(null);
    setLocationType('home');
    setLocationName('');
    setSelectedMixId((current) => current || mixes[0]?.id || '');
    setView('create');
  };

  if (view === 'pick-mix') {
    return (
      <section className="sessions-layout">
        <button type="button" className="ghost-button screen-back-btn" onClick={() => setView('create')}>
          Назад к созданию
        </button>

        <section className="catalog-controls cinema-controls">
          <div className="search-row">
            <input
              className="search-input"
              type="search"
              value={pickSearch}
              onChange={(event) => setPickSearch(event.target.value)}
              placeholder="Поиск микса по подстроке"
            />
          </div>
        </section>

        {status === 'loading' ? <p className="screen-status">Загрузка миксов...</p> : null}
        {status === 'error' ? <p className="screen-status error">Не удалось загрузить список миксов.</p> : null}

        <section className="list-grid">
          {filteredMixes.map((mix) => (
            <article key={mix.id} className="card mix-card">
              <div className="mix-header">
                <h3>{mix.name}</h3>
                <span className="chip">{mix.components.length} комп.</span>
              </div>
              <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
              <button
                type="button"
                className="search-button session-select-mix-btn"
                onClick={() => {
                  setSelectedMixId(mix.id);
                  setView('create');
                }}
              >
                Выбрать микс
              </button>
            </article>
          ))}
        </section>
      </section>
    );
  }

  if (view === 'create') {
    return (
      <section className="sessions-layout">
        <button type="button" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к сессиям
        </button>

        <section className="card session-create-card">
          <p className="card-title">Новая сессия</p>

          <div className="session-mix-preview">
            <p className="hint">
              Выбран микс:{' '}
              <b>{selectedMix?.name ?? 'не выбран'}</b>
            </p>
            <button type="button" className="ghost-button session-change-mix-btn" onClick={() => setView('pick-mix')}>
              Выбрать микс
            </button>
          </div>

          <div className="location-switch">
            <button
              type="button"
              className={`location-btn ${locationType === 'home' ? 'active' : ''}`}
              onClick={() => setLocationType('home')}
            >
              Дом
            </button>
            <button
              type="button"
              className={`location-btn ${locationType === 'lounge' ? 'active' : ''}`}
              onClick={() => setLocationType('lounge')}
            >
              Лаунж
            </button>
          </div>

          {locationType === 'lounge' ? (
            <input
              className="search-input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Название лаунжа"
            />
          ) : null}

          <button
            type="button"
            className="search-button session-submit"
            onClick={onCreateSession}
            disabled={!canCreate}
          >
            Создать сессию
          </button>
          {feedback ? <p className="hint">{feedback}</p> : null}
        </section>
      </section>
    );
  }

  return (
    <section className="sessions-layout">
      <section className="card session-create-card">
        <p className="card-title">Новая сессия</p>
        <p className="card-text">Создание вынесено на отдельный экран выбора микса и параметров сессии.</p>
        <button type="button" className="search-button session-submit" onClick={onOpenCreate} disabled={!canOpenCreate}>
          Создать сессию
        </button>
        {!canOpenCreate ? <p className="hint">Сначала создайте хотя бы один микс.</p> : null}
        {feedback ? <p className="hint">{feedback}</p> : null}
      </section>

      {status === 'loading' ? <p className="screen-status">Загрузка сессий...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить сессии.</p> : null}

      <section className="list-grid">
        {sortedItems.map((item) => (
          <article key={item.id} className="card session-card">
            <div className="mix-header">
              <h3>{item.mix.name}</h3>
              <span className="chip">{item.mix.components.length} комп.</span>
            </div>
            <p className="mix-description">
              {item.locationType === 'home' ? 'Дом' : `Лаунж · ${item.locationName ?? 'без названия'}`}
            </p>
            <p className="hint">{new Date(item.date).toLocaleString('ru-RU')}</p>
            <p className="mix-ratings">
              Средняя оценка микса: <b>{mixSummaries[item.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
            </p>
          </article>
        ))}
      </section>
    </section>
  );
};
