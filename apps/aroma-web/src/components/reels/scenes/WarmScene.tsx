import { useId } from 'react';
import { breathe, loopPhase, mixHex, SceneFrame, sceneColors, type SceneProps } from './kit';

/** Тепло: свечение снизу, искры поднимаются и мерцают. */
export function WarmScene(props: SceneProps) {
  const uid = useId();
  const { c1 } = sceneColors(props.spec);
  // Свечение дышит дважды за цикл — период 3 с, как в мокапе.
  const glow = 0.7 + 0.3 * breathe(loopPhase(props.frame * 2));
  return (
    <SceneFrame {...props}>
      <defs>
        <radialGradient id={`${uid}glow`} cx={0.5} cy={1} r={1} gradientTransform="translate(0.5 1) scale(0.6 0.7) translate(-0.5 -1)">
          <stop offset={0} stopColor={mixHex(c1, '#ffffff', 0.94)} stopOpacity={0.9} />
          <stop offset={0.45} stopColor={c1} stopOpacity={0.35} />
          <stop offset={0.75} stopColor={c1} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x="-10%" y="50%" width="120%" height="60%" fill={`url(#${uid}glow)`} opacity={glow} />
    </SceneFrame>
  );
}
