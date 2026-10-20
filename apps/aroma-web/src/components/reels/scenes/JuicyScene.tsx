import { loopPhase, mixHex, SceneFrame, sceneColors, type SceneProps } from './kit';

/** Сок: кольцо медленно вращается, дольки поднимаются. */
export function JuicyScene(props: SceneProps) {
  const t = loopPhase(props.frame);
  const { c1 } = sceneColors(props.spec);
  return (
    <SceneFrame {...props}>
      <svg x="50%" y="30%" overflow="visible">
        <g fill="none" stroke={mixHex(c1, '#ffffff', 0.75)}>
          <circle r={100} strokeWidth={1.4} />
          {/* Двенадцать штрихов дают вращению опору; 90° за цикл кратны шагу 30° — цикл бесшовный. */}
          <circle r={93} strokeWidth={0.8} opacity={0.5} pathLength={12} strokeDasharray="0.3 0.7" transform={`rotate(${(90 * t).toFixed(2)})`} />
        </g>
      </svg>
    </SceneFrame>
  );
}
