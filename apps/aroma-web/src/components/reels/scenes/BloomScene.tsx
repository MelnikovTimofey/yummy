import { breathe, loopPhase, mixHex, SceneFrame, sceneColors, type SceneProps } from './kit';

// Лепесток растёт из центра цветка вверх: основание в (0, 0), 76 × 110.
const PETAL = 'M0 0C-30 0 -38 -40 -38 -66C-38 -96 -20 -110 0 -110C20 -110 38 -96 38 -66C38 -40 30 0 0 0Z';

/** Цветы и травы: цветок из пяти лепестков раскрывается и медленно вращается, мелкие лепестки плывут вверх. */
export function BloomScene(props: SceneProps) {
  const t = loopPhase(props.frame);
  const { c1 } = sceneColors(props.spec);
  // Пять одинаковых лепестков: поворот на 144° за цикл совпадает с началом — цикл бесшовный.
  const open = 0.72 + 0.28 * breathe(t);
  return (
    <SceneFrame {...props}>
      <svg x="50%" y="34%" overflow="visible">
        <g transform={`rotate(${(144 * t).toFixed(2)})`} fill="none" stroke={mixHex(c1, '#ffffff', 0.8)} strokeWidth={1.4} opacity={0.85}>
          {[0, 72, 144, 216, 288].map((r) => (
            <path key={r} d={PETAL} transform={`rotate(${r}) scale(${open.toFixed(3)})`} />
          ))}
        </g>
      </svg>
    </SceneFrame>
  );
}
