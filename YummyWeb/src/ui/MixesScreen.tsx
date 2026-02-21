import { useEffect, useMemo, useState } from 'react';
import { getMixes, getMixRatings, getMixRatingSummaries } from '../shared/apiClient';
import { AuthState, Mix, MixRating, MixRatingSummary } from '../shared/types';

type MixesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

export const MixesScreen = ({ authState, onAuthUpdate }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      if (!authState.tokens) {
        return;
      }

      setStatus('loading');
      try {
        const [mixesRes, ratingsRes, summariesRes] = await Promise.all([
          getMixes(authState.tokens, onAuthUpdate),
          getMixRatings(authState.tokens, onAuthUpdate),
          getMixRatingSummaries(authState.tokens, onAuthUpdate),
        ]);

        setItems(mixesRes.items);
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
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate]);

  const sortedItems = useMemo(() => items, [items]);

  if (status === 'loading') {
    return <p className="screen-status">Загрузка миксов...</p>;
  }

  if (status === 'error') {
    return <p className="screen-status error">Не удалось загрузить миксы.</p>;
  }

  if (!sortedItems.length) {
    return <p className="screen-status">Пока нет доступных миксов.</p>;
  }

  return (
    <section className="list-grid">
      {sortedItems.map((mix) => (
        <article key={mix.id} className="card mix-card">
          <div className="mix-header">
            <h3>{mix.name}</h3>
            <span className="chip">{mix.components.length} комп.</span>
          </div>
          <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
          <div className="mix-components">
            {mix.components.map((component) => (
              <div key={`${mix.id}:${component.tobacco.id}`} className="mix-component-row">
                <span>
                  {component.tobacco.manufacturer.name} {component.tobacco.name}
                </span>
                <b>{component.proportion}%</b>
              </div>
            ))}
          </div>
          <p className="mix-ratings">
            Моя оценка: <b>{ratings[mix.id]?.rating ?? 'нет'}</b>
            {' · '}
            Средняя: <b>{summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
          </p>
        </article>
      ))}
    </section>
  );
};
