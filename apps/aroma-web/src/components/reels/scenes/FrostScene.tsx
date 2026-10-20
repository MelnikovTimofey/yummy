import { useId } from 'react';
import { breathe, loopPhase, SceneFrame, sceneColors, type SceneProps } from './kit';

// Направление градиента — от края внутрь: [x1, y1, x2, y2].
const EDGES = { top: [0, 0, 0, 1], bottom: [0, 1, 0, 0], left: [0, 0, 1, 0], right: [1, 0, 0, 0] } as const;
// Спад как у размытой внутренней тени мокапа (inset box-shadow): гаусс, а не линия.
const FALLOFF: Array<[number, number]> = [[0, 0.59], [0.25, 0.27], [0.5, 0.075], [0.75, 0.012], [1, 0]];

function Rim({ id, color, depth, opacity }: { id: string; color: string; depth: number; opacity: number }) {
  return (
    <>
      <defs>
        {Object.entries(EDGES).map(([edge, [x1, y1, x2, y2]]) => (
          <linearGradient key={edge} id={id + edge} x1={x1} y1={y1} x2={x2} y2={y2}>
            {FALLOFF.map(([offset, k]) => (
              <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity * k} />
            ))}
          </linearGradient>
        ))}
      </defs>
      <rect width="100%" height={depth} fill={`url(#${id}top)`} />
      <svg y="100%" overflow="visible">
        <rect y={-depth} width="100%" height={depth} fill={`url(#${id}bottom)`} />
      </svg>
      <rect width={depth} height="100%" fill={`url(#${id}left)`} />
      <svg x="100%" overflow="visible">
        <rect x={-depth} width={depth} height="100%" fill={`url(#${id}right)`} />
      </svg>
    </>
  );
}

/** Холод: иней дышит по краям, снежинки медленно падают с покачиванием и поворотом. */
export function FrostScene(props: SceneProps) {
  const uid = useId();
  const { c1, c2 } = sceneColors(props.spec);
  return (
    <SceneFrame {...props}>
      <g opacity={0.55 + 0.45 * breathe(loopPhase(props.frame))}>
        <Rim id={`${uid}far`} color={c2} depth={150} opacity={0.18} />
        <Rim id={`${uid}near`} color={c1} depth={60} opacity={0.55} />
      </g>
    </SceneFrame>
  );
}
