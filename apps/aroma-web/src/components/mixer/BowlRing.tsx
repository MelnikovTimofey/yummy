import type { ReactNode, Ref } from 'react';

import { getProfileColor } from '@/lib/profile-color';
import type { PaletteTobacco } from '@/lib/mixer/types';

// Геометрия кольца в единицах viewBox — ею же пользуется засыпка (PourLayer).
export const RING_VIEWBOX = 188;
export const RING_RADIUS = 78;
const RING_STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type RingArc = { color: string; offset: number; length: number };

export const ringArcs = (tobaccos: PaletteTobacco[], shares: number[]): RingArc[] => {
  const gap = tobaccos.length > 1 ? 4 : 0;
  let offset = 0;
  return tobaccos.map((tobacco, index) => {
    const full = (CIRCUMFERENCE * (shares[index] ?? 0)) / 100;
    const arc = {
      color: getProfileColor(tobacco.flavorProfiles[0]),
      offset,
      length: Math.max(0, full - gap),
    };
    offset += full;
    return arc;
  });
};

export function BowlRing({
  tobaccos,
  shares,
  center,
  quick = false,
  ringRef,
}: {
  tobaccos: PaletteTobacco[];
  shares: number[];
  center: ReactNode;
  // Во время перетаскивания долей кольцо должно успевать за пальцем.
  quick?: boolean;
  ringRef?: Ref<HTMLDivElement>;
}) {
  const arcs = ringArcs(tobaccos, shares);
  const half = RING_VIEWBOX / 2;

  return (
    <div className="mixer-ring" ref={ringRef} data-quick={quick ? 'true' : undefined}>
      <span
        className="mixer-ring-halo"
        style={{ background: tobaccos[0] ? getProfileColor(tobaccos[0].flavorProfiles[0]) : 'transparent' }}
        aria-hidden
      />
      <svg viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`} aria-hidden>
        <circle cx={half} cy={half} r={RING_RADIUS} fill="none" stroke="var(--line)" strokeWidth={RING_STROKE} />
        {[0, 1, 2].map((index) => {
          const arc = arcs[index];
          return (
            <circle
              key={index}
              className="mixer-ring-seg"
              cx={half}
              cy={half}
              r={RING_RADIUS}
              fill="none"
              stroke={arc?.color ?? 'transparent'}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${arc?.length ?? 0} ${CIRCUMFERENCE}`}
              strokeDashoffset={arc ? -arc.offset : 0}
              transform={`rotate(-90 ${half} ${half})`}
            />
          );
        })}
      </svg>
      <div className="mixer-ring-center">{center}</div>
    </div>
  );
}
