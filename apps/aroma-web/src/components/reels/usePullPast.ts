import { useEffect, useRef, useState, type RefObject } from 'react';

/** Ход пальца сверх края, после которого отпускание срабатывает (#349). */
export const PULL_THRESHOLD = 120;

// Дотягивание за край прокрутки (#349): Подбор → рилсы снизу, первый рилс →
// Подбор сверху. Считается только жест, начатый у края: инерция прокрутки до
// края порог не набирает. `travel` — ход пальца сверх края, 0 — жеста нет.
export function usePullPast(
  scrollerRef: RefObject<HTMLElement | null>,
  edge: 'top' | 'bottom',
  enabled: boolean,
  onPull: () => void,
) {
  const [travel, setTravel] = useState(0);
  const onPullRef = useRef(onPull);
  onPullRef.current = onPull;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !enabled) return;
    let startY: number | null = null;
    let current = 0;
    const atEdge = () =>
      edge === 'top'
        ? scroller.scrollTop <= 0
        : scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    const update = (next: number) => {
      current = next;
      setTravel(next);
    };

    const onStart = (event: TouchEvent) => {
      startY = event.touches.length === 1 && atEdge() ? event.touches[0].clientY : null;
    };
    const onMove = (event: TouchEvent) => {
      if (startY === null) return;
      const delta = (event.touches[0].clientY - startY) * (edge === 'top' ? 1 : -1);
      if (delta <= 0) {
        update(0);
        return;
      }
      event.preventDefault();
      update(delta);
    };
    const onEnd = () => {
      if (startY === null) return;
      startY = null;
      const pulled = current >= PULL_THRESHOLD;
      update(0);
      if (pulled) onPullRef.current();
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onEnd);
    return () => {
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
      setTravel(0);
    };
  }, [scrollerRef, edge, enabled]);

  return travel;
}
