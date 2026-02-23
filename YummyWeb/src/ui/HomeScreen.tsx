import { useEffect, useMemo, useState } from 'react';
import { addFavorite, getHomeRails, getMixes, getRecommendations } from '../shared/apiClient';
import { AuthState, HomeRail, Mix } from '../shared/types';

type HomeScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onOpenMix?: (mixId: string) => void;
  onOpenRail?: (type: HomeRail['type']) => void;
};

export const HomeScreen = ({ authState, onAuthUpdate, onOpenMix, onOpenRail }: HomeScreenProps) => {
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [usingFallback, setUsingFallback] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const buildLegacyFallbackRails = async () => {
    if (!authState.tokens) {
      return [] as HomeRail[];
    }

    const [recommendationsRes, mixesRes] = await Promise.all([
      getRecommendations(authState.tokens, onAuthUpdate).catch(() => ({ items: [] })),
      getMixes(authState.tokens, onAuthUpdate, {
        limit: 60,
        sort: 'popularity',
      }).catch(() => ({ items: [] })),
    ]);

    const recommendationMixes = recommendationsRes.items.map((item) => item.mix).slice(0, 20);
    const allMixes = mixesRes.items;
    const editorial = allMixes.filter((mix) => !mix.isUserMix).slice(0, 20);
    const analyticsTop = allMixes.slice(0, 20);
    const myMixes = allMixes.filter((mix) => mix.author?.id === authState.user?.id).slice(0, 20);

    const nextRails: HomeRail[] = [];
    if (recommendationMixes.length) {
      nextRails.push({
        id: 'recommendations-fallback',
        type: 'recommendations',
        title: 'Рекомендации для вас',
        size: 'hero',
        source: 'fallback',
        items: recommendationMixes,
      });
    }
    if (editorial.length) {
      nextRails.push({
        id: 'editorial-fallback',
        type: 'editorial',
        title: 'Выбор редакции',
        items: editorial,
      });
    }
    if (analyticsTop.length) {
      nextRails.push({
        id: 'analytics-fallback',
        type: 'analytics',
        title: 'Популярное сейчас',
        items: analyticsTop,
      });
    }
    if (myMixes.length) {
      nextRails.push({
        id: 'my-fallback',
        type: 'my-mixes',
        title: 'Мои миксы',
        items: myMixes,
      });
    }

    return nextRails;
  };

  const getMixTone = (mix: Mix) => {
    const palette = ['#dd8a29', '#2e95d6', '#188a68', '#7f4ddd', '#b9476d', '#24a178', '#3c7de6'];
    const source = `${mix.name}:${mix.id}`;
    const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const getComponentColor = (mix: Mix, index: number) => {
    const fallback = ['#37a0e4', '#e18837', '#35ba7c', '#b168f0', '#d05f7e', '#84b84a'];
    const profileColorMap: Record<string, string> = {
      sweet: '#f08d49',
      sour: '#dfc24a',
      spicy: '#d45b51',
      fresh: '#4eb9d4',
      dessert: '#cd7ff2',
      tobacco: '#9d704f',
    };
    const profile = mix.components[index]?.tobacco.flavorProfiles?.[0];
    return (profile && profileColorMap[profile]) || fallback[index % fallback.length];
  };

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setUsingFallback(false);
      try {
        const response = await getHomeRails(authState.tokens, onAuthUpdate);
        setRails(response.items);
        setStatus('idle');
      } catch {
        try {
          const fallbackRails = await buildLegacyFallbackRails();
          if (fallbackRails.length) {
            setRails(fallbackRails);
            setUsingFallback(true);
            setStatus('idle');
            return;
          }
        } catch {
          // noop
        }
        setStatus('error');
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate]);

  const heroMix = useMemo(() => rails[0]?.items[0] ?? null, [rails]);
  const genres = ['Рекомендации', 'Редакция', 'ТОП', 'Новые', 'Избранное', 'Мои миксы'];

  const onAddHeroToFavorite = async () => {
    if (!heroMix) {
      return;
    }
    if (!authState.tokens) {
      setFeedback('Войдите, чтобы добавить микс в избранное.');
      return;
    }
    setFeedback(null);
    try {
      await addFavorite(authState.tokens, onAuthUpdate, heroMix.id);
      setFeedback('Микс добавлен в избранное.');
    } catch {
      setFeedback('Не удалось добавить микс в избранное.');
    }
  };

  return (
    <section className="home-layout">
      {status === 'loading' ? <p className="screen-status">Загрузка главной...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить рейлы.</p> : null}
      {usingFallback ? (
        <p className="hint home-warning">Показан fallback-режим: перезапустите backend для полного набора рейлов.</p>
      ) : null}

      {heroMix ? (
        <section
          className="home-hero"
          style={{
            background: `linear-gradient(120deg, ${getMixTone(heroMix)}99 0%, #131313 60%, #0a0a0a 100%)`,
          }}
        >
          <span className="home-hero-badge">Премьера</span>
          <h2>{heroMix.name}</h2>
          <p>
            {heroMix.description?.trim() || 'Подборка вкусового микса с детальным составом и пропорциями.'}
          </p>
          <div className="home-hero-meta">
            <span className="rating-pill">{heroMix.components.length}</span>
            <span>{heroMix.components.map((component) => component.tobacco.name).slice(0, 3).join(' · ')}</span>
          </div>
          <div className="rail-ratio-bar">
            {heroMix.components.map((component, index) => (
              <span
                key={`${heroMix.id}:hero:${component.tobacco.id}`}
                className="rail-ratio-segment"
                style={{
                  width: `${component.proportion}%`,
                  background: getComponentColor(heroMix, index),
                }}
                title={`${component.tobacco.name} ${component.proportion}%`}
              />
            ))}
          </div>
          <div className="home-hero-actions">
            <button
              type="button"
              className="search-button"
              disabled={!onOpenMix}
              onClick={() => onOpenMix?.(heroMix.id)}
            >
              Карточка микса
            </button>
            <button type="button" className="ghost-button home-hero-secondary" onClick={onAddHeroToFavorite}>
              В избранное
            </button>
          </div>
          {feedback ? <p className="hint">{feedback}</p> : null}
        </section>
      ) : null}

      <section className="home-categories">
        {genres.map((item) => (
          <button key={item} type="button" className="home-category-chip">
            {item}
          </button>
        ))}
      </section>

      {rails.map((rail) => (
        <section key={rail.id} className={`home-rail ${rail.size === 'hero' ? 'hero' : ''}`}>
          <div className="home-rail-head">
            <h3 className="home-rail-title">{rail.title}</h3>
            <button
              type="button"
              className="home-link-btn"
              disabled={!onOpenRail}
              onClick={() => onOpenRail?.(rail.type)}
            >
              Смотреть всё
            </button>
          </div>
          <div className="home-rail-row">
            {rail.items.map((mix) => (
              <button
                key={`${rail.id}:${mix.id}`}
                type="button"
                className="home-item"
                disabled={!onOpenMix}
                onClick={() => onOpenMix?.(mix.id)}
                style={{
                  background: `linear-gradient(145deg, ${getMixTone(mix)}66 0%, #1a1a1a 70%, #121212 100%)`,
                }}
              >
                <div className="home-item-overlay">
                  <p className="home-item-title">{mix.name}</p>
                  <div className="rail-ratio-bar compact">
                    {mix.components.map((component, index) => (
                      <span
                        key={`${mix.id}:rail:${component.tobacco.id}`}
                        className="rail-ratio-segment"
                        style={{
                          width: `${component.proportion}%`,
                          background: getComponentColor(mix, index),
                        }}
                        title={`${component.tobacco.name} ${component.proportion}%`}
                      />
                    ))}
                  </div>
                  <p className="home-item-meta">
                    {mix.components
                      .slice(0, 2)
                      .map((component) => `${component.tobacco.manufacturer.name} ${component.tobacco.name}`)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
};
