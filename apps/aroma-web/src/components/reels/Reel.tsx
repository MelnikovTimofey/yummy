import { lazy, Suspense } from 'react';
import { ChevronUp, Play } from 'lucide-react';
import { CTA, RatingPill } from '@/components/aroma';
import { HeartButton } from '@/components/cabinet/HeartButton';
import { ReelStill } from './ReelStill';

// Remotion — отдельным чанком при первом активном рилсе; пока он едет — статичный кадр.
const ReelPlayer = lazy(() => import('./ReelPlayer'));

export type ReelFeedMix = {
  id: string;
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  avgRating: number;
  ratingsCount: number;
  components: Array<{ id: string; name: string; manufacturer: string; proportion: number }>;
};

// Ramp состава — тот же, что в карточке микса (packages/design-tokens/profile-colors.css).
const COMPOSITION_PALETTE = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];
const formatPercent = (value: number) => `${Number(value.toFixed(1)).toString().replace('.', ',')}%`;

export type ReelProps = {
  mix: ReelFeedMix;
  /** Первый рилс продолжения Подбора (#349): кнопка «К подбору» сверху. */
  onBack: (() => void) | null;
  favorite: boolean;
  onFavorite: () => void;
  /** Активный рилс играет сцену; соседи — статичный кадр. */
  active: boolean;
  animated: boolean;
  paused: boolean;
  hint: boolean;
  gone: boolean;
  choosing: boolean;
  error: string;
  onTogglePause: () => void;
  onOpen: () => void;
  onChoose: () => void;
};

export function Reel({
  mix,
  onBack,
  favorite,
  onFavorite,
  active,
  animated,
  paused,
  hint,
  gone,
  choosing,
  error,
  onTogglePause,
  onOpen,
  onChoose,
}: ReelProps) {
  const components = [...mix.components].sort((left, right) => right.proportion - left.proportion);
  const playing = active && animated;

  return (
    <section className="reel" aria-label={mix.name}>
      {playing ? (
        <Suspense fallback={<ReelStill mix={mix} />}>
          <ReelPlayer mix={mix} playing={!paused} />
        </Suspense>
      ) : (
        <ReelStill mix={mix} />
      )}
      {playing ? (
        <button type="button" className="reel-tap" aria-label={paused ? 'Продолжить' : 'Пауза'} onClick={onTogglePause} />
      ) : null}
      {playing && paused ? (
        <span className="reel-paused" aria-hidden>
          <Play size={22} strokeWidth={1.8} />
        </span>
      ) : null}

      {/* Афиша (#314): сцена — фон, а не видео, поэтому название и описание по центру,
          а внизу только рейтинг, сердечко, состав и кнопки. */}
      <div className={active ? 'reel-poster reel-reveal' : 'reel-poster'}>
        <div className="reel-poster-top">
          {onBack ? (
            <button type="button" className="reel-back" onClick={onBack}>
              К подбору
            </button>
          ) : null}
        </div>
        <div className="reel-poster-center">
          <h2 className="reel-name">{mix.name}</h2>
          {mix.description ? (
            <p className="reel-desc">{mix.description}</p>
          ) : mix.flavors.length ? (
            <p className="reel-flavors">{mix.flavors.join(', ')}</p>
          ) : null}
        </div>
        <div className="reel-poster-bottom">
          {hint ? (
            <span className="reel-hint">
              <ChevronUp size={18} strokeWidth={1.8} aria-hidden />
              Листайте вверх
            </span>
          ) : null}
          <div className="reel-details">
            <div className="reel-meta">
              {mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} /> : null}
              <HeartButton on={favorite} onClick={onFavorite} />
            </div>
            {gone ? (
              <p className="reel-toast" role="status">
                Этот микс закончился. Листайте дальше.
              </p>
            ) : error ? (
              <p className="reel-toast" role="alert">
                {error}
              </p>
            ) : components.length ? (
              <ul className="reel-comp" aria-label="Состав микса">
                {components.map((component, index) => (
                  <li key={component.id}>
                    <span
                      className="reel-comp-dot"
                      style={{ background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length] }}
                      aria-hidden
                    />
                    {component.manufacturer ? (
                      <span className="reel-comp-maker">{component.manufacturer}</span>
                    ) : null}
                    <span className="reel-comp-name">{component.name}</span>
                    <span className="reel-comp-share">{formatPercent(component.proportion)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="reel-actions">
            <button type="button" className="aroma-mix-sheet-ghost" onClick={onOpen}>
              Подробнее
            </button>
            <CTA busy={choosing} disabled={gone} onClick={onChoose}>
              Покурить
            </CTA>
          </div>
        </div>
      </div>
    </section>
  );
}
