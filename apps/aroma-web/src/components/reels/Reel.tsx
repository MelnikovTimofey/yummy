import { lazy, Suspense } from 'react';
import { ChevronUp, Play } from 'lucide-react';
import { CTA, RatingPill } from '@/components/aroma';
import { HeartButton } from '@/components/cabinet/HeartButton';
import { HINT_TITLE } from '@/lib/for-you-copy';
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
  /** «Для вас» вошедшего гостя (#265): надпись слота над названием, причина
   *  под описанием и подсказка «Давно на одном вкусе». */
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

      {/* Афиша (#314): сцена — фон, а не видео, поэтому название и описание — по центру,
          а внизу только рейтинг, сердечко, состав и кнопки. */}
      <div className={active ? 'reel-poster reel-reveal' : 'reel-poster'}>
        <div className="reel-poster-top">
          {bubble ? (
            <section className="reel-bubble" aria-label={HINT_TITLE}>
              <p className="aroma-caps">{HINT_TITLE}</p>
              <p className="reel-bubble-text">{bubble}</p>
            </section>
          ) : null}
        </div>
        <div className="reel-poster-center">
          {slot ? <p className="aroma-caps reel-slot-name">{slot}</p> : null}
          <h2 className="reel-name">{mix.name}</h2>
          {mix.description ? (
            <p className="reel-desc">{mix.description}</p>
          ) : mix.flavors.length ? (
            // Неразрывный пробел держит точку при слове: строка не начинается с «·».
            <p className="reel-flavors">{mix.flavors.join('\u00a0· ')}</p>
          ) : null}
          {reason ? <p className="reel-reason">{reason}</p> : null}
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
              {mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} count={mix.ratingsCount} /> : null}
              <HeartButton on={favorite} onClick={onFavorite} />
            </div>
            {gone ? (
              <p className="reel-toast" role="status">
                Этот микс сейчас недоступен по наличию. Листайте дальше — остальные на месте.
              </p>
            ) : error ? (
              <p className="reel-toast" role="alert">
                {error}
              </p>
            ) : components.length ? (
              <>
                <div className="reel-bar" aria-hidden>
                  {components.map((component, index) => (
                    <span
                      key={component.id}
                      style={{ flexGrow: component.proportion, background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length] }}
                    />
                  ))}
                </div>
                <ul className={components.length === 1 ? 'reel-comp reel-comp-one' : 'reel-comp'} aria-label="Состав микса">
                  {components.map((component, index) => (
                    <li key={component.id}>
                      <span
                        className="reel-comp-dot"
                        style={{ background: COMPOSITION_PALETTE[index % COMPOSITION_PALETTE.length] }}
                        aria-hidden
                      />
                      <span className="reel-comp-text">
                        <span className="aroma-caps reel-comp-maker">{component.manufacturer}</span>
                        <span className="reel-comp-name">{component.name}</span>
                      </span>
                      <span className="reel-comp-share">{formatPercent(component.proportion)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div className="reel-actions">
            <button type="button" className="aroma-mix-sheet-ghost" onClick={onOpen}>
              Подробнее
            </button>
            <CTA pulse={!gone && !choosing} disabled={gone || choosing} onClick={onChoose}>
              {choosing ? 'Сохраняем…' : 'Покурить'}
            </CTA>
          </div>
        </div>
      </div>
    </section>
  );
}
