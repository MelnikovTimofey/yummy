import { useEffect, useMemo, useRef, useState } from 'react';
import { addFavorite, getFavoriteMixIds, getHomeRails, getMixes, getMixRatingSummaries, removeFavorite } from '../shared/apiClient';
import { AuthState, HomeRail, Mix, MixRatingSummary } from '../shared/types';
import { AppButton, AppModal } from '@/ui-kit';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

type HomeScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onOpenMix?: (mixId: string) => void;
  onOpenRail?: (rail: HomeRail) => void;
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
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
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
    const loadRatingSummaries = async () => {
      if (!authState.tokens) {
        setMixSummaries({});
        return;
      }

      try {
        const response = await getMixRatingSummaries(authState.tokens, onAuthUpdate);
        setMixSummaries(
          response.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
      } catch {
        setMixSummaries({});
      }
    };

    void loadRatingSummaries();
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

    const cards = Array.from(row.querySelectorAll<HTMLElement>('.home-rail-card'));
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
                {rail.items.map((mix) => (
                  <MixPreviewCard
                    key={`${rail.id}:${mix.id}`}
                    mix={mix}
                    size="rail"
                    className="home-rail-card"
                    onOpen={onOpenMix ? (currentMix) => onOpenMix(currentMix.id) : undefined}
                    onOpenInfo={(currentMix) => {
                      setInfoMix(currentMix);
                    }}
                    onToggleFavorite={(currentMix) => {
                      void onToggleFavorite(currentMix.id);
                    }}
                    isFavorite={Boolean(favoriteMixIds[mix.id])}
                    favoriteGuest={!authState.tokens}
                    favoriteTitle={!authState.tokens ? 'Войдите, чтобы управлять избранным' : undefined}
                    footerText={authState.tokens ? `Средняя: ${mixSummaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}` : undefined}
                  />
                ))}
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
