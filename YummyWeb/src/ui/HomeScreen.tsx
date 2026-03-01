import { useEffect, useMemo, useRef, useState } from 'react';
import { addFavorite, getFavoriteMixIds, getHomeRails, getMixes, removeFavorite } from '../shared/apiClient';
import { AuthState, FlavorProfile, HomeRail, Mix } from '../shared/types';
import { AppBadge, AppButton, AppModal } from '@/ui-kit';

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
  const weightedProfiles = new Map<FlavorProfile, number>();
  const firstSeenOrder = new Map<FlavorProfile, number>();
  let seenCounter = 0;

  for (const component of mix.components) {
    const profiles = sanitizeProfiles(component.tobacco.flavorProfiles ?? []);
    if (!profiles.length) {
      continue;
    }

    const profileShare = component.proportion / profiles.length;
    for (const profile of profiles) {
      weightedProfiles.set(profile, (weightedProfiles.get(profile) ?? 0) + profileShare);
      if (!firstSeenOrder.has(profile)) {
        firstSeenOrder.set(profile, seenCounter);
        seenCounter += 1;
      }
    }
  }

  if (weightedProfiles.size) {
    const sortedByProportion = Array.from(weightedProfiles.keys()).sort((left, right) => {
      const diff = (weightedProfiles.get(right) ?? 0) - (weightedProfiles.get(left) ?? 0);
      if (Math.abs(diff) > 0.001) {
        return diff;
      }
      return (firstSeenOrder.get(left) ?? 0) - (firstSeenOrder.get(right) ?? 0);
    });

    const directProfiles = sanitizeProfiles(mix.flavorProfiles ?? []);
    const restFromDirect = directProfiles.filter((profile) => !weightedProfiles.has(profile));
    return [...sortedByProportion, ...restFromDirect];
  }

  const direct = sanitizeProfiles(mix.flavorProfiles ?? []);
  if (direct.length) {
    return direct;
  }

  return [];
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getNextRailScrollLeft = (
  cardOffsets: Array<{ left: number; right: number }>,
  currentScrollLeft: number,
  viewportWidth: number,
  direction: -1 | 1,
) => {
  if (!cardOffsets.length) {
    return currentScrollLeft;
  }

  const offsetTolerance = 1;
  const rightEdge = currentScrollLeft + viewportWidth - 1;

  if (direction === 1) {
    const nextHiddenCard = cardOffsets.find((card) => card.right > rightEdge);
    return nextHiddenCard ? nextHiddenCard.left : cardOffsets[cardOffsets.length - 1].left;
  }

  const previousHiddenCard = [...cardOffsets].reverse().find(
    (card) => card.left < currentScrollLeft - offsetTolerance,
  );
  return previousHiddenCard ? previousHiddenCard.left : 0;
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

  const scrollRail = (railRefKey: string, direction: -1 | 1) => {
    const row = railRefs.current[railRefKey];
    if (!row) {
      return;
    }

    const cards = Array.from(row.querySelectorAll<HTMLElement>('.home-item'));
    if (!cards.length) {
      return;
    }

    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    const cardOffsets = cards.map((card) => ({
      left: card.offsetLeft,
      right: card.offsetLeft + card.offsetWidth,
    }));

    const target = getNextRailScrollLeft(
      cardOffsets,
      row.scrollLeft,
      row.clientWidth,
      direction,
    );

    row.scrollTo({
      left: clamp(target, 0, maxScrollLeft),
      behavior: 'smooth',
    });
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

      {visibleRails.map((rail, railIndex) => {
        const railRefKey = `${rail.id}:${railIndex}`;
        return (
          <section key={`${rail.id}:${railIndex}`} className="home-rail">
            <div className="home-rail-head">
              <AppButton
                variant="ghost"
                className="home-rail-title-btn"
                disabled={!onOpenRail}
                onClick={() => onOpenRail?.(rail)}
              >
                <h3 className="home-rail-title">{rail.title}</h3>
              </AppButton>
              <AppButton
                variant="ghost"
                className="home-link-btn"
                disabled={!onOpenRail}
                onClick={() => onOpenRail?.(rail)}
              >
                Смотреть все
              </AppButton>
            </div>

            <div className="home-rail-carousel">
              <AppButton
                variant="ghost"
                className="rail-nav-btn"
                onClick={() => scrollRail(railRefKey, -1)}
                disabled={!rail.items.length}
                aria-label="Прокрутить влево"
              >
                ‹
              </AppButton>

              <div
                className="home-rail-row"
                ref={(node) => {
                  railRefs.current[railRefKey] = node;
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
                  const visibleProfileTags = profileTags.length > 2 ? profileTags.slice(0, 1) : profileTags.slice(0, 2);
                  const hiddenProfileTagsCount = profileTags.length - visibleProfileTags.length;
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
                            <AppButton
                              variant="icon"
                              className="icon-btn info-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                setInfoMix(mix);
                              }}
                              aria-label="Описание"
                            >
                              i
                            </AppButton>
                            <AppButton
                              variant="icon"
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
                            </AppButton>
                          </div>
                        </div>
                        <div className="home-item-body">
                          <p className="home-item-meta">
                            {flavorText}
                          </p>
                          <div className="home-item-tags">
                            {visibleProfileTags.map((tag) => (
                              <AppBadge key={`${mix.id}:${tag}`} tone="muted" className="profile-tag">
                                {PROFILE_LABELS[tag]}
                              </AppBadge>
                            ))}
                            {hiddenProfileTagsCount > 0 ? (
                              <AppBadge tone="muted" className="profile-tag profile-tag-more">
                                +{hiddenProfileTagsCount}
                              </AppBadge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <AppButton
                variant="ghost"
                className="rail-nav-btn"
                onClick={() => scrollRail(railRefKey, 1)}
                disabled={!rail.items.length}
                aria-label="Прокрутить вправо"
              >
                ›
              </AppButton>
            </div>
          </section>
        );
      })}

      <AppModal
        open={Boolean(infoMix)}
        onOpenChange={(open) => {
          if (!open) {
            setInfoMix(null);
          }
        }}
        title="Описание микса"
      >
        {infoMix ? (
          <div>
            <h3>{infoMix.name}</h3>
            <p className="card-text">{infoMix.description?.trim() || 'Описание пока не добавлено.'}</p>
            <p className="hint">
              Табаки: {infoMix.components.map((component) => `${component.tobacco.name} ${component.proportion}%`).join(' · ')}
            </p>
            <AppButton className="search-button" onClick={() => setInfoMix(null)}>
              Закрыть
            </AppButton>
          </div>
        ) : null}
      </AppModal>
    </section>
  );
};
