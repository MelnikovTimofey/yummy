import { lazy, Suspense } from 'react';
import { ChevronUp, Play } from 'lucide-react';
import { CTA, RatingPill } from '@/components/aroma';
import { HeartButton } from '@/components/cabinet/HeartButton';
import { HINT_TITLE } from '@/lib/for-you-copy';
import { profileLabelMap } from '@/lib/profile-labels';
import { ReelStill } from './ReelStill';

// Remotion — отдельным чанком при первом активном рилсе; пока он едет — статичный кадр.
const ReelPlayer = lazy(() => import('./ReelPlayer'));

export type ReelFeedMix = {
  id: string;
  name: string;
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
  /** «Для вас» вошедшего гостя (#265): надпись слота вместо профилей, причина
   *  под названием и подсказка «Давно на одном вкусе». */
  slot: string | null;
  reason: string | null;
  bubble: string | null;
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
  slot,
  reason,
  bubble,
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
  const profiles = mix.flavorProfiles.slice(0, 3).map((profile) => profileLabelMap[profile] ?? profile);
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

      <div className={active ? 'reel-dock reel-reveal' : 'reel-dock'}>
        {hint ? (
          <span className="reel-hint">
            <ChevronUp size={18} strokeWidth={1.8} aria-hidden />
            Листайте вверх
          </span>
        ) : null}
        {bubble ? (
          <section className="reel-bubble" aria-label={HINT_TITLE}>
            <p className="aroma-caps">{HINT_TITLE}</p>
            <p className="reel-bubble-text">{bubble}</p>
          </section>
        ) : null}
        {slot || profiles.length ? <p className="aroma-caps reel-profiles">{slot ?? profiles.join(' · ')}</p> : null}
        <div className="reel-name-row">
          <h2 className="reel-name">{mix.name}</h2>
          <HeartButton on={favorite} onClick={onFavorite} />
        </div>
        {reason ? <p className="reel-reason">{reason}</p> : null}
        {mix.ratingsCount > 0 ? (
          <div className="reel-meta">
            <RatingPill rating={mix.avgRating} count={mix.ratingsCount} />
          </div>
        ) : null}
        {mix.flavors.length ? <p className="reel-flavors">{mix.flavors.join(' · ')}</p> : null}
        {components.length ? (
          <ul className="aroma-mix-sheet-comp-list">
            {components.map((component, index) => (
              <li key={component.id} className="aroma-mix-sheet-comp-row">
                <span
                  className="aroma-mix-sheet-comp-dot"
                  style={{ background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length] }}
                  aria-hidden
                />
                <span className="aroma-caps aroma-mix-sheet-comp-maker">{component.manufacturer}</span>
                <span className="aroma-mix-sheet-comp-name">{component.name}</span>
                <span className="aroma-mix-sheet-comp-share">{formatPercent(component.proportion)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {gone ? (
          <p className="reel-toast" role="status">
            Этот микс сейчас недоступен по наличию. Листайте дальше — остальные на месте.
          </p>
        ) : error ? (
          <p className="reel-toast" role="alert">
            {error}
          </p>
        ) : null}
        <div className="reel-actions">
          <button type="button" className="aroma-mix-sheet-ghost" onClick={onOpen}>
            Подробнее
          </button>
          <CTA pulse={!gone && !choosing} disabled={gone || choosing} onClick={onChoose}>
            {choosing ? 'Сохраняем…' : 'Покурить'}
          </CTA>
        </div>
      </div>
    </section>
  );
}
