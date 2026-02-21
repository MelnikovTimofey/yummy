import { useEffect, useMemo, useState } from 'react';
import {
  createSession,
  createSessionRating,
  getMixes,
  getMixRatingSummaries,
  getSessionRatings,
  getSessions,
} from '../shared/apiClient';
import {
  AuthState,
  Mix,
  MixRatingSummary,
  SessionRating,
  SmokingSession,
} from '../shared/types';

type SessionsScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

export const SessionsScreen = ({ authState, onAuthUpdate }: SessionsScreenProps) => {
  const [items, setItems] = useState<SmokingSession[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [sessionRatings, setSessionRatings] = useState<Record<string, SessionRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedMixId, setSelectedMixId] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');

  const load = async () => {
    if (!authState.tokens) {
      return;
    }

    setStatus('loading');
    try {
      const [sessionsRes, mixesRes, sessionRatingsRes, mixSummariesRes] = await Promise.all([
        getSessions(authState.tokens, onAuthUpdate),
        getMixes(authState.tokens, onAuthUpdate),
        getSessionRatings(authState.tokens, onAuthUpdate),
        getMixRatingSummaries(authState.tokens, onAuthUpdate),
      ]);

      setItems(sessionsRes.items);
      setMixes(mixesRes.items);
      setSessionRatings(
        sessionRatingsRes.items.reduce<Record<string, SessionRating>>((acc, item) => {
          acc[item.sessionId] = item;
          return acc;
        }, {}),
      );
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
      await load();
    } catch {
      setFeedback('Не удалось создать сессию.');
    }
  };

  const onRateSession = async (sessionId: string, rating: number) => {
    if (!authState.tokens) {
      return;
    }

    try {
      await createSessionRating(authState.tokens, onAuthUpdate, { sessionId, rating });
      setSessionRatings((current) => ({
        ...current,
        [sessionId]: {
          ...current[sessionId],
          id: current[sessionId]?.id ?? `${sessionId}:${rating}`,
          sessionId,
          rating,
        },
      }));
    } catch {
      setFeedback('Не удалось сохранить оценку.');
    }
  };

  const sortedItems = useMemo(() => items, [items]);

  return (
    <section className="sessions-layout">
      <section className="card session-create-card">
        <p className="card-title">Новая сессия</p>
        <div className="filter-field">
          <span>Микс</span>
          <select value={selectedMixId} onChange={(event) => setSelectedMixId(event.target.value)}>
            {mixes.map((mix) => (
              <option key={mix.id} value={mix.id}>
                {mix.name}
              </option>
            ))}
          </select>
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

        <button type="button" className="search-button session-submit" onClick={onCreateSession} disabled={!canCreate}>
          Создать сессию
        </button>
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
            <div className="session-rating-row">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={`${item.id}:${score}`}
                  type="button"
                  className={`score-btn ${sessionRatings[item.id]?.rating === score ? 'active' : ''}`}
                  onClick={() => onRateSession(item.id, score)}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="mix-ratings">
              Оценка сессии: <b>{sessionRatings[item.id]?.rating ?? 'нет'}</b>
              {' · '}
              Средняя оценка микса: <b>{mixSummaries[item.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
            </p>
          </article>
        ))}
      </section>
    </section>
  );
};
