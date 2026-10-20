import { useEffect } from 'react';
import { ReelStill, type ReelMix } from './ReelStill';

// Полоса рилсов над Подбором (#264, кадр entry-b): кружки со статичным кадром
// сцены, как Stories. Remotion здесь не рендерится: чанк ReelPlayer только
// подгружается в простое, чтобы раздел «Рилсы» открылся без задержки.
export function ReelStrip<T extends ReelMix & { name: string }>({ items, onOpen }: { items: T[]; onOpen: (index: number) => void }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const preload = () => void import('./ReelPlayer');
    // Safari без requestIdleCallback — обычный таймер.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="reel-strip-wrap">
      <ul className="reel-strip" role="list" aria-label="Рилсы">
        {items.map((mix, index) => (
          <li key={mix.id}>
            <button type="button" className="reel-strip-item" onClick={() => onOpen(index)}>
              <span className="reel-strip-thumb" aria-hidden>
                <ReelStill mix={mix} />
              </span>
              <span className="reel-strip-name">{mix.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
