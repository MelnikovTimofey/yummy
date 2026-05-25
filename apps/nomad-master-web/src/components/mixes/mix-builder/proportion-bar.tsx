import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { colorForTobacco } from './color-for-tobacco';
import { componentPercent, resizeFromHandle } from './rebalance';
import type { MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';

type ProportionBarProps = {
  components: MixEditorComponentInput[];
  onResize: (components: MixEditorComponentInput[]) => void;
};

export const ProportionBar = ({ components, onResize }: ProportionBarProps) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const handlePointerDown = (idx: number) => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(idx);
  };

  useEffect(() => {
    if (dragging == null) return;

    const onMove = (event: globalThis.PointerEvent) => {
      const node = barRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const percent = Math.round((x / rect.width) * 100);
      const next = resizeFromHandle(components, dragging, percent);
      if (next !== components) {
        onResize(next);
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, components, onResize]);

  if (!components.length) {
    return (
      <div className="proportion-bar proportion-bar--empty" aria-label="Пропорции состава">
        <div className="proportion-bar__seg proportion-bar__seg--empty" />
      </div>
    );
  }

  return (
    <div ref={barRef} className="proportion-bar" aria-label="Пропорции состава" role="presentation">
      {components.map((component, idx) => {
        const color = colorForTobacco(component.tobaccoId);
        const isLast = idx === components.length - 1;
        const percent = componentPercent(component);
        return (
          <div
            key={component.key}
            className="proportion-bar__seg"
            style={{ flex: `${percent} 0 0`, background: color.fill }}
            title={`${percent}%`}
          >
            {!isLast ? (
              <div
                className="proportion-bar__handle"
                data-dragging={dragging === idx}
                onPointerDown={handlePointerDown(idx)}
                role="separator"
                aria-orientation="vertical"
                aria-label={`Граница между сегментами ${idx + 1} и ${idx + 2}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
