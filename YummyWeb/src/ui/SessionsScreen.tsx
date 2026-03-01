import { useEffect, useMemo, useState } from 'react';

import {
  createSession,
  deleteSession,
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
import { AppButton, AppInput } from '@/ui-kit';
import { MixInfoModal } from '@/ui/components/MixInfoModal';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

type SessionsScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

type SessionsView = 'list' | 'compose';

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
  const [saving, setSaving] = useState(false);
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
      setSelectedMixId((current) => current || mixesRes.items[0]?.id || '');
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void load();
  }, [authState.tokens]);

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

  const selectedMix = useMemo(
    () => mixes.find((item) => item.id === selectedMixId) ?? null,
    [mixes, selectedMixId],
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [items],
  );

  const canOpenCompose = mixes.length > 0;
  const canCreate =
    Boolean(selectedMixId) &&
    (locationType === 'home' || locationName.trim().length > 0) &&
    !saving;

  const openCompose = () => {
    if (!canOpenCompose) {
      return;
    }

    setFeedback(null);
    setLocationType('home');
    setLocationName('');
    setSelectedMixId((current) => current || mixes[0]?.id || '');
    setView('compose');
  };

  const onCreateSession = async () => {
    if (!authState.tokens || !canCreate || !selectedMixId) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId: selectedMixId,
        date: new Date().toISOString(),
        locationType,
        locationName: locationType === 'lounge' ? locationName.trim() : undefined,
      });
      setLocationName('');
      setFeedback('Сессия сохранена.');
      setView('list');
      await load();
    } catch {
      setFeedback('Не удалось сохранить сессию.');
    } finally {
      setSaving(false);
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
      <section className="sessions-layout">
        <AppButton variant="ghost" className="ghost-button screen-back-btn" onClick={() => setView('list')}>
          Назад к сессиям
        </AppButton>

        <section className="card session-compose-card">
          <p className="card-title">Добавить в сессию</p>
          <p className="hint">Нажмите на карточку микса ниже или откройте `info` для просмотра состава.</p>

          <div className="session-mix-preview">
            <p className="hint">
              Выбран микс: <b>{selectedMix?.name ?? 'не выбран'}</b>
            </p>
          </div>

          <div className="location-switch">
            <AppButton
              variant="ghost"
              className={`location-btn ${locationType === 'home' ? 'active' : ''}`}
              onClick={() => setLocationType('home')}
            >
              Дом
            </AppButton>
            <AppButton
              variant="ghost"
              className={`location-btn ${locationType === 'lounge' ? 'active' : ''}`}
              onClick={() => setLocationType('lounge')}
            >
              Лаунж
            </AppButton>
          </div>

          {locationType === 'lounge' ? (
            <AppInput
              className="search-input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Название лаунжа"
            />
          ) : null}

          <AppButton
            className="search-button session-submit"
            onClick={onCreateSession}
            disabled={!canCreate}
          >
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </AppButton>
          {feedback ? <p className="hint">{feedback}</p> : null}
        </section>

        <section className="catalog-controls cinema-controls">
          <div className="search-row">
            <AppInput
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

        <section className="list-grid cinema-grid">
          {filteredMixes.map((mix) => (
            <MixPreviewCard
              key={mix.id}
              mix={mix}
              size="grid"
              className={`session-mix-candidate ${selectedMixId === mix.id ? 'selected' : ''}`}
              onOpen={(currentMix) => setSelectedMixId(currentMix.id)}
              onOpenInfo={(currentMix) => setInfoMix(currentMix)}
              footerText={selectedMixId === mix.id ? 'Выбран для сохранения сессии' : 'Нажмите карточку, чтобы выбрать'}
            />
          ))}
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
                  setSelectedMixId(infoMix.id);
                  setInfoMix(null);
                }}
              >
                Выбрать микс для сессии
              </AppButton>
            ) : undefined
          }
        />
      </section>
    );
  }

  return (
    <section className="sessions-layout">
      <section className="card session-create-card">
        <p className="card-title">Сессии курения</p>
        <p className="card-text">Создавайте новые сессии с выбором микса и локации, затем сохраняйте в один шаг.</p>
        <AppButton className="search-button session-submit" onClick={openCompose} disabled={!canOpenCompose}>
          Добавить сессию
        </AppButton>
        {!canOpenCompose ? <p className="hint">Сначала создайте хотя бы один микс.</p> : null}
        {feedback ? <p className="hint">{feedback}</p> : null}
      </section>

      {status === 'loading' ? <p className="screen-status">Загрузка сессий...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить сессии.</p> : null}
      {!sortedItems.length && status === 'idle' ? <p className="screen-status">Список сессий пока пуст.</p> : null}

      <section className="list-grid">
        {sortedItems.map((item) => (
          <article key={item.id} className="card session-card session-entry-card">
            <div className="session-card-head">
              <div>
                <p className="session-card-title">{item.mix.name}</p>
                <p className="session-card-date">{new Date(item.date).toLocaleString('ru-RU')}</p>
              </div>
              <span className="chip">{item.mix.components.length} комп.</span>
            </div>
            <p className="mix-description session-card-location">
              {item.locationType === 'home' ? 'Дом' : `Лаунж · ${item.locationName ?? 'без названия'}`}
            </p>
            <p className="mix-ratings">
              Средняя оценка микса: <b>{mixSummaries[item.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
            </p>
            <div className="session-card-actions">
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
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
