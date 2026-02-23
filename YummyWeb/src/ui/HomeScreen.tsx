import { useEffect, useMemo, useRef, useState } from 'react';
import { addFavorite, getFavoriteMixIds, getHomeRails, getMixes, removeFavorite } from '../shared/apiClient';
import { AuthState, FlavorProfile, HomeRail, Mix } from '../shared/types';

type HomeScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onOpenMix?: (mixId: string) => void;
  onOpenRail?: (rail: HomeRail) => void;
};

const PROFILE_LABELS: Record<FlavorProfile, string> = {
  sweet: 'Сладкий',
  sour: 'Кислый',
  spicy: 'Пряный',
  fresh: 'Свежий',
  dessert: 'Десертный',
  tobacco: 'Табачный',
};

const dedupe = <T,>(items: T[]) => Array.from(new Set(items));

const getProfileTags = (mix: Mix) => {
  const direct = mix.flavorProfiles ?? [];
  if (direct.length) {
    return dedupe(direct);
  }
  return dedupe(mix.components.flatMap((component) => component.tobacco.flavorProfiles ?? []));
};

export const HomeScreen = ({ authState, onAuthUpdate, onOpenMix, onOpenRail }: HomeScreenProps) => {
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [favoriteMixIds, setFavoriteMixIds] = useState<Record<string, true>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [infoMix, setInfoMix] = useState<Mix | null>(null);
  const railRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setFeedback(null);
      try {
        const response = await getHomeRails(authState.tokens, onAuthUpdate);
        setRails(response.items);
        setStatus('idle');
      } catch {
        try {
          const fallback = await getMixes(authState.tokens, onAuthUpdate, {
            sort: 'popularity',
            limit: 20,
          });
          setRails([
            {
              id: 'recommendations-fallback',
              type: 'recommendations',
              title: 'Рекомендации для вас',
              source: 'fallback',
              items: fallback.items,
            },
          ]);
          setStatus('idle');
        } catch {
          setStatus('error');
        }
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!authState.tokens) {
        setFavoriteMixIds({});
        return;
      }

      try {
        const response = await getFavoriteMixIds(authState.tokens, onAuthUpdate);
        setFavoriteMixIds(
          response.items.reduce<Record<string, true>>((acc, mixId) => {
            acc[mixId] = true;
            return acc;
          }, {}),
        );
      } catch {
        setFavoriteMixIds({});
      }
    };

    void loadFavorites();
  }, [authState.tokens, onAuthUpdate, rails.length]);

  const orderedRails = useMemo(() => {
    const recommendations = rails.filter((rail) => rail.type === 'recommendations');
    const favorites = rails.filter((rail) => rail.type === 'favorites');
    const rest = rails.filter((rail) => rail.type !== 'recommendations' && rail.type !== 'favorites');
    return [...recommendations, ...favorites, ...rest];
  }, [rails]);

  const getMixTone = (mix: Mix) => {
    const palette = ['#a56e3f', '#7a5b46', '#556a5f', '#6e4f45', '#5f5869', '#8f704d'];
    const source = `${mix.name}:${mix.id}`;
    const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const onToggleFavorite = async (mixId: string) => {
    if (!authState.tokens) {
      setFeedback('Войдите, чтобы управлять избранным.');
      return;
    }

    setFeedback(null);
    const isFavorite = Boolean(favoriteMixIds[mixId]);
    try {
      if (isFavorite) {
        await removeFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => {
          const next = { ...current };
          delete next[mixId];
          return next;
        });
      } else {
        await addFavorite(authState.tokens, onAuthUpdate, mixId);
        setFavoriteMixIds((current) => ({
          ...current,
          [mixId]: true,
        }));
      }
    } catch {
      setFeedback('Не удалось обновить избранное.');
    }
  };

  const scrollRail = (railId: string, direction: -1 | 1) => {
    const row = railRefs.current[railId];
    if (!row) {
      return;
    }
    const card = row.querySelector<HTMLElement>('.home-item');
    const offset = card ? card.offsetWidth + 12 : Math.round(row.clientWidth * 0.8);
    row.scrollBy({ left: offset * direction, behavior: 'smooth' });
  };

  return (
    <section className="home-layout">
      {status === 'loading' ? <p className="screen-status">Загрузка главной...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить рейлы.</p> : null}
      {feedback ? <p className="hint">{feedback}</p> : null}

      {orderedRails.map((rail) => (
        <section key={rail.id} className="home-rail">
          <div className="home-rail-head">
            <button
              type="button"
              className="home-rail-title-btn"
              disabled={!onOpenRail}
              onClick={() => onOpenRail?.(rail)}
            >
              <h3 className="home-rail-title">{rail.title}</h3>
            </button>
            <button
              type="button"
              className="home-link-btn"
              disabled={!onOpenRail}
              onClick={() => onOpenRail?.(rail)}
            >
              Смотреть все
            </button>
          </div>

          <div className="home-rail-carousel">
            <button
              type="button"
              className="rail-nav-btn"
              onClick={() => scrollRail(rail.id, -1)}
              disabled={!rail.items.length}
              aria-label="Прокрутить влево"
            >
              ‹
            </button>

            <div
              className="home-rail-row"
              ref={(node) => {
                railRefs.current[rail.id] = node;
              }}
            >
              {rail.items.map((mix) => {
                const profileTags = getProfileTags(mix);
                return (
                  <article
                    key={`${rail.id}:${mix.id}`}
                    className="home-item"
                    onClick={() => onOpenMix?.(mix.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenMix?.(mix.id);
                      }
                    }}
                    style={{
                      background: `linear-gradient(145deg, ${getMixTone(mix)}b0 0%, #1a1715 74%, #120f0d 100%)`,
                    }}
                    role="button"
                    tabIndex={onOpenMix ? 0 : -1}
                    aria-disabled={!onOpenMix}
                  >
                    <div className="home-item-overlay">
                      <div className="home-item-head">
                        <p className="home-item-title">{mix.name}</p>
                        <div className="home-item-actions">
                          <button
                            type="button"
                            className="icon-btn info-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setInfoMix(mix);
                            }}
                            aria-label="Описание"
                          >
                            i
                          </button>
                          <button
                            type="button"
                            className={`icon-btn fav-icon ${favoriteMixIds[mix.id] ? 'active' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void onToggleFavorite(mix.id);
                            }}
                            disabled={!authState.tokens}
                            aria-label={favoriteMixIds[mix.id] ? 'Убрать из избранного' : 'Добавить в избранное'}
                          >
                            {favoriteMixIds[mix.id] ? '♥' : '♡'}
                          </button>
                        </div>
                      </div>
                      <p className="home-item-meta">
                        {mix.components
                          .slice(0, 3)
                          .map((component) => component.tobacco.name)
                          .join(' · ')}
                      </p>
                      <div className="profile-tags home-item-tags">
                        {profileTags.slice(0, 3).map((tag) => (
                          <span key={`${mix.id}:${tag}`} className="profile-tag">
                            {PROFILE_LABELS[tag]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="rail-nav-btn"
              onClick={() => scrollRail(rail.id, 1)}
              disabled={!rail.items.length}
              aria-label="Прокрутить вправо"
            >
              ›
            </button>
          </div>

          {!rail.items.length ? <p className="hint">В этом рейле пока нет элементов.</p> : null}
        </section>
      ))}

      {infoMix ? (
        <div className="popup-backdrop" onClick={() => setInfoMix(null)} role="presentation">
          <article className="popup-card" onClick={(event) => event.stopPropagation()}>
            <p className="card-title">Описание микса</p>
            <h3>{infoMix.name}</h3>
            <p className="card-text">{infoMix.description?.trim() || 'Описание пока не добавлено.'}</p>
            <p className="hint">
              Табаки: {infoMix.components.map((component) => component.tobacco.name).join(' · ')}
            </p>
            <button type="button" className="search-button" onClick={() => setInfoMix(null)}>
              Закрыть
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
};
