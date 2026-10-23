import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FeedEnd } from './FeedEnd';
import { PullPeek } from './PullPeek';
import { Reel, type ReelFeedMix } from './Reel';
import { usePullPast } from './usePullPast';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

type FeedProps<T extends ReelFeedMix> = {
  items: T[];
  /** Индекс живёт выше экрана: «Готово» после «Покурить» возвращает на тот же рилс. */
  index: number;
  onIndexChange: (index: number) => void;
  hint: boolean;
  goneIds: string[];
  choice: { mixId: string; status: 'loading' | 'error'; error: string } | null;
  onOpen: (mix: T) => void;
  onChoose: (mix: T) => void;
  isFavorite: (mix: T) => boolean;
  onFavorite: (mix: T) => void;
  onMixer: () => void;
  /** Лента продолжает Подбор (#349): «К подбору» и свайп вниз на первом рилсе. */
  onBack: (() => void) | null;
};

// Лента «Рилсы» (#263): вертикальная прокрутка со снапом — один жест, один рилс.
// Рендерятся только активный рилс и соседи, дальше — пустые слоты той же высоты.
export function Feed<T extends ReelFeedMix>({
  items,
  index,
  onIndexChange,
  hint,
  goneIds,
  choice,
  onOpen,
  onChoose,
  isFavorite,
  onFavorite,
  onMixer,
  onBack,
}: FeedProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Слайд-приглашение после последнего микса — не рилс: индекс ленты на нём
  // не меняется, только последний рилс перестаёт играть.
  const [atEnd, setAtEnd] = useState(false);
  const animated = !useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion);
  const travel = usePullPast(scrollerRef, 'top', Boolean(onBack) && index === 0, () => onBack?.());

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = index * scroller.clientHeight;
    // Только при монтировании: дальше индекс ведёт прокрутка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || !scroller.clientHeight) return;
    const position = Math.max(0, Math.round(scroller.scrollTop / scroller.clientHeight));
    setAtEnd(position >= items.length);
    const next = Math.min(items.length - 1, position);
    if (next !== index) {
      setPaused(false);
      onIndexChange(next);
    }
  };

  return (
    <div className="pull-host" data-pulling={travel ? '' : undefined}>
      <div className="reels-feed" style={travel ? { transform: `translateY(${travel / 2}px)` } : undefined}>
        {/* Без видимой шапки: экран целиком отдан сцене (#290). Заголовок — для скринридера. */}
        <h1 className="reels-heading">Рилсы</h1>
        <div className="reels" ref={scrollerRef} onScroll={onScroll}>
          {items.map((mix, i) => (
            <div key={mix.id} className="reel-slot">
              {Math.abs(i - index) <= 1 ? (
                <Reel
                  mix={mix}
                  onBack={i === 0 ? onBack : null}
                  favorite={isFavorite(mix)}
                  onFavorite={() => onFavorite(mix)}
                  active={i === index && !atEnd}
                  animated={animated}
                  paused={paused}
                  hint={hint && i === 0}
                  gone={goneIds.includes(mix.id)}
                  choosing={choice?.mixId === mix.id && choice.status === 'loading'}
                  error={choice?.mixId === mix.id && choice.status === 'error' ? choice.error : ''}
                  onTogglePause={() => setPaused((current) => !current)}
                  onOpen={() => onOpen(mix)}
                  onChoose={() => onChoose(mix)}
                />
              ) : null}
            </div>
          ))}
          <div className="reel-slot">
            <FeedEnd onMixer={onMixer} />
          </div>
        </div>
      </div>
      <PullPeek edge="top" travel={travel} mix={null} />
    </div>
  );
}
