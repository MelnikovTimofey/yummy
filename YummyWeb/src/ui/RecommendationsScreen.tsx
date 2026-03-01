import { useEffect, useMemo, useState } from 'react';
import {
  createMixRating,
  createSession,
  getMixRatingSummaries,
  getMixRatings,
  getRecommendations,
  refreshRecommendations,
} from '../shared/apiClient';
import {
  AuthState,
  MixRating,
  MixRatingSummary,
  RecommendationItem,
  RecommendationSource,
} from '../shared/types';
import { AppBadge, AppButton } from '@/ui-kit';

type RecommendationsScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  refreshSignal?: number;
};

const getSourceLabel = (item: RecommendationItem) => {
  const source: RecommendationSource =
    item.source ?? (item.score !== null ? 'model' : 'cold_start');

  if (source === 'model') {
    return 'Модель';
  }
  if (source === 'top') {
    return 'Топ: оценка + сессии';
  }
  return 'Cold start';
};

export const RecommendationsScreen = ({
  authState,
  onAuthUpdate,
  refreshSignal,
}: RecommendationsScreenProps) => {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [mixRatings, setMixRatings] = useState<Record<string, MixRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    if (!authState.tokens) {
      return;
    }

    setStatus('loading');
    setFeedback(null);
    try {
      const [recommendationsRes, ratingsRes, summariesRes] = await Promise.all([
        getRecommendations(authState.tokens, onAuthUpdate),
        getMixRatings(authState.tokens, onAuthUpdate),
        getMixRatingSummaries(authState.tokens, onAuthUpdate),
      ]);

      setItems(recommendationsRes.items);
      setMixRatings(
        ratingsRes.items.reduce<Record<string, MixRating>>((acc, item) => {
          acc[item.mixId] = item;
          return acc;
        }, {}),
      );
      setMixSummaries(
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

  useEffect(() => {
    void load();
  }, [authState.tokens, refreshSignal]);

  const onAddToSession = async (mixId: string) => {
    if (!authState.tokens) {
      return;
    }

    setFeedback(null);
    try {
      await createSession(authState.tokens, onAuthUpdate, {
        mixId,
        date: new Date().toISOString(),
        locationType: 'home',
      });
      setFeedback('Рекомендация добавлена в сессию.');
    } catch {
      setFeedback('Не удалось добавить рекомендацию в сессию.');
    }
  };

  const onRateMix = async (mixId: string, rating: number) => {
    if (!authState.tokens) {
      return;
    }

    setFeedback(null);
    try {
      const response = await createMixRating(authState.tokens, onAuthUpdate, {
        mixId,
        rating,
      });
      setMixRatings((current) => ({
        ...current,
        [mixId]: response,
      }));
      setFeedback('Оценка сохранена.');
    } catch {
      setFeedback('Не удалось сохранить оценку.');
    }
  };

  const onRefreshRecommendations = async () => {
    if (!authState.tokens) {
      return;
    }

    setStatus('loading');
    setFeedback(null);
    try {
      const response = await refreshRecommendations(authState.tokens, onAuthUpdate, { limit: 20 });
      const [ratingsRes, summariesRes] = await Promise.all([
        getMixRatings(authState.tokens, onAuthUpdate),
        getMixRatingSummaries(authState.tokens, onAuthUpdate),
      ]);

      setItems(response.items);
      setMixRatings(
        ratingsRes.items.reduce<Record<string, MixRating>>((acc, item) => {
          acc[item.mixId] = item;
          return acc;
        }, {}),
      );
      setMixSummaries(
        summariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
          acc[item.mixId] = item;
          return acc;
        }, {}),
      );
      setFeedback(`Подборка пересчитана. Модельных рекомендаций: ${response.refreshedCount}.`);
      setStatus('idle');
    } catch {
      setStatus('error');
      setFeedback('Не удалось пересчитать рекомендации.');
    }
  };

  const recommendations = useMemo(() => items, [items]);

  return (
    <section className="recommendations-layout">
      <section className="card recommendation-controls">
        <p className="card-title">Источник рекомендаций</p>
        <p className="card-text">
          Приоритет: модель пользователя {'->'} топ по оценкам и сессиям {'->'} cold start fallback.
        </p>
        <AppButton
          className="search-button recommendation-refresh"
          onClick={() => void onRefreshRecommendations()}
        >
          Обновить рекомендации
        </AppButton>
        {feedback ? <p className="hint">{feedback}</p> : null}
      </section>

      {status === 'loading' ? <p className="screen-status">Загрузка рекомендаций...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить рекомендации.</p> : null}
      {status !== 'loading' && !recommendations.length ? (
        <p className="screen-status">Пока нет рекомендаций. Добавьте оценки и сессии.</p>
      ) : null}

      <section className="list-grid">
        {recommendations.map((item) => (
          <article key={item.mix.id} className="card mix-card recommendation-card">
            <div className="mix-header">
              <h3>{item.mix.name}</h3>
              <AppBadge tone="muted" className="chip">{item.mix.components.length} комп.</AppBadge>
            </div>
            <p className="mix-description">{item.mix.description?.trim() || 'Описание пока не добавлено.'}</p>
            <div className="mix-components">
              {item.mix.components.map((component) => (
                <div key={`${item.mix.id}:${component.tobacco.id}`} className="mix-component-row">
                  <span>
                    {component.tobacco.manufacturer.name} {component.tobacco.name}
                  </span>
                  <b>{component.proportion}%</b>
                </div>
              ))}
            </div>
            <p className="recommendation-source">{getSourceLabel(item)}</p>
            <div className="recommendation-actions">
              <AppButton className="search-button recommendation-session" onClick={() => onAddToSession(item.mix.id)}>
                В сессию
              </AppButton>
              <div className="session-rating-row">
                {[1, 2, 3, 4, 5].map((score) => (
                  <AppButton
                    key={`${item.mix.id}:${score}`}
                    variant="ghost"
                    className={`score-btn ${mixRatings[item.mix.id]?.rating === score ? 'active' : ''}`}
                    onClick={() => onRateMix(item.mix.id, score)}
                  >
                    {score}
                  </AppButton>
                ))}
              </div>
            </div>
            <p className="mix-ratings">
              Моя оценка: <b>{mixRatings[item.mix.id]?.rating ?? 'нет'}</b>
              {' · '}
              Средняя: <b>{mixSummaries[item.mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
            </p>
          </article>
        ))}
      </section>
    </section>
  );
};
