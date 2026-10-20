import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { reelCounter, type ReelEntry } from '@/lib/reel-feed';
import { Reel, type ReelFeedMix } from './Reel';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

type FeedProps<T extends ReelFeedMix> = {
  items: ReelEntry<T>[];
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
}: FeedProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animated = !useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = index * scroller.clientHeight;
    // Только при монтировании: дальше индекс ведёт прокрутка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || !scroller.clientHeight) return;
    const next = Math.min(items.length - 1, Math.max(0, Math.round(scroller.scrollTop / scroller.clientHeight)));
    if (next !== index) {
      setPaused(false);
      onIndexChange(next);
    }
  };

  return (
    <div className="reels-feed">
      <header className="reel-top">
        <h1 className="reel-title">Рилсы</h1>
        <p className="reel-count">{reelCounter(index, items.length)}</p>
      </header>
      <div className="reels" ref={scrollerRef} onScroll={onScroll}>
        {items.map(({ mix, slot, reason, hint: bubble }, i) => (
          <div key={mix.id} className="reel-slot">
            {Math.abs(i - index) <= 1 ? (
              <Reel
                mix={mix}
                slot={slot}
                reason={reason}
                bubble={bubble}
                favorite={isFavorite(mix)}
                onFavorite={() => onFavorite(mix)}
                active={i === index}
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
      </div>
    </div>
  );
}
