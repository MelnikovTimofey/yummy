import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

import { moveBoundary } from '@/lib/mixer/bowl';
import { getProfileColor } from '@/lib/profile-color';
import type { PaletteTobacco } from '@/lib/mixer/types';

export const ROLE_LABELS = ['Основа', 'Акцент', 'Штрих'] as const;

const r = 'var(--r-guest-control)';

// Полоса долей с бегунками на границах: шаг 5%, минимум 5% на компонент,
// клавиши ← → двигают сфокусированную границу.
export function ProportionSplit({
  tobaccos,
  shares,
  onChange,
  onCommit,
}: {
  tobaccos: PaletteTobacco[];
  shares: number[];
  onChange: (shares: number[]) => void;
  // Отпустили бегунок или нажали клавишу — пора прокомментировать доли.
  onCommit: (shares: number[]) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ index: number; pointerId: number } | null>(null);
  const latest = useRef(shares);
  latest.current = shares;

  const boundaries = shares.slice(0, -1).map((_, index) =>
    shares.slice(0, index + 1).reduce((sum, share) => sum + share, 0),
  );

  const moveTo = (index: number, clientX: number) => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar) return;
    const next = moveBoundary(latest.current, index, ((clientX - bar.left) / bar.width) * 100);
    if (next !== latest.current) {
      latest.current = next;
      onChange(next);
    }
  };

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    dragging.current = { index, pointerId: event.pointerId };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = dragging.current;
    if (!current || current.pointerId !== event.pointerId) return;
    moveTo(current.index, event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = dragging.current;
    if (!current || current.pointerId !== event.pointerId) return;
    dragging.current = null;
    onCommit(latest.current);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0;
    if (!step) return;
    event.preventDefault();
    // Не даём стрелкам уйти в обработчик свайпов экрана.
    event.stopPropagation();
    const next = moveBoundary(shares, index, boundaries[index] + step);
    if (next === shares) return;
    onChange(next);
    onCommit(next);
  };

  return (
    <div className="mixer-split">
      <span className="aroma-caps">Доли · тяните бегунки</span>
      <div className="mixer-split-bar" ref={barRef}>
        {tobaccos.map((tobacco, index) => (
          <div
            key={tobacco.id}
            className="mixer-split-seg"
            style={{
              flexBasis: `${shares[index]}%`,
              background: getProfileColor(tobacco.flavorProfiles[0]),
              borderRadius: `${index === 0 ? r : '0'} ${index === tobaccos.length - 1 ? `${r} ${r}` : '0 0'} ${index === 0 ? r : '0'}`,
            }}
          >
            {shares[index] >= 10 ? `${shares[index]}%` : ''}
          </div>
        ))}
        {boundaries.map((position, index) => (
          <div
            key={index}
            className="mixer-split-handle"
            role="slider"
            tabIndex={0}
            aria-label={`Граница: ${tobaccos[index].name} / ${tobaccos[index + 1].name}`}
            aria-valuemin={5}
            aria-valuemax={95}
            aria-valuenow={position}
            aria-valuetext={`${ROLE_LABELS[index]} ${shares[index]}%, ${ROLE_LABELS[index + 1].toLowerCase()} ${shares[index + 1]}%`}
            style={{ left: `${position}%` }}
            onPointerDown={onPointerDown(index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown(index)}
          />
        ))}
      </div>
      <ul className="mixer-split-legend">
        {tobaccos.map((tobacco, index) => (
          <li key={tobacco.id}>
            <span
              className="mixer-dot"
              style={{ background: getProfileColor(tobacco.flavorProfiles[0]) }}
              aria-hidden
            />
            {`${ROLE_LABELS[index]} · `}
            <b>{`${tobacco.manufacturer} ${tobacco.name}`.trim()}</b>
            {` ${shares[index]}%`}
          </li>
        ))}
      </ul>
    </div>
  );
}
