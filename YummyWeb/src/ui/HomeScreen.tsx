import { useEffect, useMemo, useRef, useState } from 'react';
import { addFavorite, getFavoriteMixIds, getHomeRails, getMixes, getMixRatingSummaries, removeFavorite } from '../shared/apiClient';
import { AuthState, FlavorProfile, HomeRail, Mix, MixRatingSummary } from '../shared/types';
import { AppButton, AppModal } from '@/ui-kit';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

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

const PROFILE_VALUES = new Set<FlavorProfile>(Object.keys(PROFILE_LABELS) as FlavorProfile[]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const dedupe = <T,>(items: T[]) => Array.from(new Set(items));

const formatPercent = (value: number) => `${Number(value.toFixed(1)).toString().replace('.', ',')}%`;

const sanitizeProfiles = (profiles: unknown[]) =>
  dedupe(
    profiles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile)),
  );

const sanitizeFlavors = (flavors: unknown[]) =>
  dedupe(
    flavors
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );

const buildWeightedRows = <TKey extends string>(
  mix: Mix,
  extractor: (component: Mix['components'][number]) => TKey[],
): Array<{ key: TKey; percent: number }> => {
  const weighted = new Map<TKey, number>();
  for (const component of mix.components) {
    const keys = dedupe(extractor(component));
    if (!keys.length) {
      continue;
    }
    const share = component.proportion / keys.length;
    for (const key of keys) {
      weighted.set(key, (weighted.get(key) ?? 0) + share);
    }
  }
  return Array.from(weighted.entries())
    .map(([key, percent]) => ({ key, percent }))
    .sort((left, right) => right.percent - left.percent);
};

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
  const infoMixDetails = useMemo(() => {
    if (!infoMix) {
      return null;
    }

    const tobaccoRows = infoMix.components
      .map((component) => ({
        label: `${component.tobacco.manufacturer.name} ${component.tobacco.name}`,
        percent: component.proportion,
      }))
      .sort((left, right) => right.percent - left.percent);

    const flavorRows = buildWeightedRows(infoMix, (component) => sanitizeFlavors(component.tobacco.flavors ?? []));
    const fallbackFlavors = flavorRows.length
      ? flavorRows
      : sanitizeFlavors(infoMix.flavors ?? []).map((flavor) => ({
          key: flavor,
          percent: 100 / Math.max(1, sanitizeFlavors(infoMix.flavors ?? []).length),
        }));

    const profileRows = buildWeightedRows(infoMix, (component) => sanitizeProfiles(component.tobacco.flavorProfiles ?? []));
    const fallbackProfiles = profileRows.length
      ? profileRows
      : sanitizeProfiles(infoMix.flavorProfiles ?? []).map((profile) => ({
          key: profile,
          percent: 100 / Math.max(1, sanitizeProfiles(infoMix.flavorProfiles ?? []).length),
        }));
    const summary = mixSummaries[infoMix.id];
    const avgRating = summary?.avgRating;

    return {
      description: infoMix.description?.trim() ?? '',
      tobaccoRows,
      flavorRows: fallbackFlavors,
      profileRows: fallbackProfiles,
      ratingAverage: avgRating === null || avgRating === undefined ? '—' : avgRating.toFixed(1).replace('.', ','),
      ratingCount: summary ? String(summary.count) : '—',
    };
  }, [infoMix, mixSummaries]);

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
                    ratingTagText={
                      authState.tokens
                        ? `★ ${mixSummaries[mix.id]?.avgRating?.toFixed(1).replace('.', ',') ?? '—'}`
                        : undefined
                    }
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
        title="Состав микса"
        contentClassName="mix-info-modal-shell"
      >
        {infoMix && infoMixDetails ? (
          <div className="mix-info-modal">
            <h3 className="mix-info-name">{infoMix.name}</h3>

            <section className="mix-info-section">
              <p className="mix-info-section-title">Оценка</p>
              <ul className="mix-info-list">
                <li className="mix-info-row">
                  <span className="mix-info-label">Средняя</span>
                  <span className="mix-info-value">{infoMixDetails.ratingAverage}</span>
                </li>
                <li className="mix-info-row">
                  <span className="mix-info-label">Количество оценок</span>
                  <span className="mix-info-value">{infoMixDetails.ratingCount}</span>
                </li>
              </ul>
            </section>

            <section className="mix-info-section">
              <p className="mix-info-section-title">Табаки и пропорции</p>
              <ul className="mix-info-list">
                {infoMixDetails.tobaccoRows.map((item) => (
                  <li key={`${infoMix.id}:tobacco:${item.label}`} className="mix-info-row">
                    <span className="mix-info-label">{item.label}</span>
                    <span className="mix-info-value">{formatPercent(item.percent)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mix-info-section">
              <p className="mix-info-section-title">Вкусы и пропорции</p>
              {infoMixDetails.flavorRows.length ? (
                <ul className="mix-info-list">
                  {infoMixDetails.flavorRows.map((item) => (
                    <li key={`${infoMix.id}:flavor:${item.key}`} className="mix-info-row">
                      <span className="mix-info-label">{item.key}</span>
                      <span className="mix-info-value">{formatPercent(item.percent)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mix-info-empty">Нет данных по вкусам.</p>
              )}
            </section>

            <section className="mix-info-section">
              <p className="mix-info-section-title">Вкусовые профили</p>
              {infoMixDetails.profileRows.length ? (
                <ul className="mix-info-list">
                  {infoMixDetails.profileRows.map((item) => (
                    <li key={`${infoMix.id}:profile:${item.key}`} className="mix-info-row">
                      <span className="mix-info-label">{PROFILE_LABELS[item.key]}</span>
                      <span className="mix-info-value">{formatPercent(item.percent)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mix-info-empty">Профили не указаны.</p>
              )}
            </section>

            {infoMixDetails.description ? (
              <section className="mix-info-section">
                <p className="mix-info-section-title">Описание</p>
                <p className="mix-info-description">{infoMixDetails.description}</p>
              </section>
            ) : null}

            <AppButton variant="ghost" className="ghost-button mix-info-close-btn" onClick={() => setInfoMix(null)}>
              Закрыть
            </AppButton>
          </div>
        ) : null}
      </AppModal>
    </section>
  );
};
