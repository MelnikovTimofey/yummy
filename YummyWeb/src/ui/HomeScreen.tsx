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
  minty: 'Мятный',
  fruity: 'Фруктовый',
  floral_herbal: 'Цветочно-травяной',
  citrus: 'Цитрусовый',
  berry: 'Ягодный',
  perfume: 'Парфюм',
};

const dedupe = <T,>(items: T[]) => Array.from(new Set(items));
const PROFILE_VALUES = new Set<FlavorProfile>(Object.keys(PROFILE_LABELS) as FlavorProfile[]);

const sanitizeProfiles = (profiles: unknown[]) =>
  dedupe(
    profiles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile)),
  );

const getProfileTags = (mix: Mix) => {
  const direct = mix.flavorProfiles ?? [];
  if (direct.length) {
    return sanitizeProfiles(direct);
  }
  return sanitizeProfiles(
    mix.components.flatMap((component) => component.tobacco.flavorProfiles ?? []),
  );
};

const getFlavorLabels = (mix: Mix) => {
  const fromMix = dedupe(
    (mix.flavors ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  if (fromMix.length) {
    return fromMix;
  }

  return dedupe(
    mix.components.flatMap((component) =>
      (component.tobacco.flavors ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
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

  useEffect(() => {
    if (!infoMix) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInfoMix(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [infoMix]);

  const orderedRails = useMemo(() => {
    const recommendations = rails.filter((rail) => rail.type === 'recommendations');
    const favorites = rails.filter((rail) => rail.type === 'favorites');
    const rest = rails.filter((rail) => rail.type !== 'recommendations' && rail.type !== 'favorites');
    return [...recommendations, ...favorites, ...rest];
  }, [rails]);
  const visibleRails = useMemo(() => orderedRails.filter((rail) => rail.items.length > 0), [orderedRails]);

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
      {!authState.tokens ? (
        <p className="hint home-guest-note">В гостевом режиме часть действий доступна после входа: избранное, сессии и персональные рекомендации.</p>
      ) : null}

      {!visibleRails.length && status === 'idle' ? <p className="screen-status">Нет доступных подборок.</p> : null}

      {visibleRails.map((rail) => (
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
                const flavorLabels = getFlavorLabels(mix);
                const flavorText = flavorLabels.length
                  ? flavorLabels.slice(0, 3).join(' · ')
                  : profileTags.length
                    ? profileTags.slice(0, 2).map((tag) => PROFILE_LABELS[tag].toLowerCase()).join(' · ')
                    : 'вкус не указан';
                const isMixClickable = Boolean(onOpenMix);
                return (
                  <article
                    key={`${rail.id}:${mix.id}`}
                    className={`home-item ${isMixClickable ? 'interactive' : 'static'}`}
                    onClick={isMixClickable ? () => onOpenMix?.(mix.id) : undefined}
                    onKeyDown={isMixClickable ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenMix?.(mix.id);
                      }
                    } : undefined}
                    style={{
                      background: `linear-gradient(145deg, ${getMixTone(mix)}b0 0%, #1a1715 74%, #120f0d 100%)`,
                    }}
                    role={isMixClickable ? 'button' : undefined}
                    tabIndex={isMixClickable ? 0 : undefined}
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
                            className={`icon-btn fav-icon ${favoriteMixIds[mix.id] ? 'active' : ''} ${!authState.tokens ? 'guest' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void onToggleFavorite(mix.id);
                            }}
                            aria-pressed={Boolean(favoriteMixIds[mix.id])}
                            aria-label={favoriteMixIds[mix.id] ? 'Убрать из избранного' : 'Добавить в избранное'}
                            title={!authState.tokens ? 'Войдите, чтобы управлять избранным' : undefined}
                          >
                            {favoriteMixIds[mix.id] ? '♥' : '♡'}
                          </button>
                        </div>
                      </div>
                      <p className="home-item-meta">
                        {flavorText}
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

        </section>
      ))}

      {infoMix ? (
        <div className="popup-backdrop" onClick={() => setInfoMix(null)} role="presentation">
          <article className="popup-card" onClick={(event) => event.stopPropagation()}>
            <p className="card-title">Описание микса</p>
            <h3>{infoMix.name}</h3>
            <p className="card-text">{infoMix.description?.trim() || 'Описание пока не добавлено.'}</p>
            <p className="hint">
              Табаки: {infoMix.components.map((component) => `${component.tobacco.name} ${component.proportion}%`).join(' · ')}
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
