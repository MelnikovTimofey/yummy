import { useId, type ReactNode } from 'react';
import { getProfileColor } from '@/lib/profile-color';
import type { ReelSceneSpec, SceneMotif } from '@/lib/reel-scene';

// Общее для сцен стиля B (design/design_handoff_reels — «Мотивы стиля B»).
// Сцена — чистая функция кадра: всё считается из frame и шума по seed, без Remotion,
// поэтому тот же код рисует и Player, и статичный кадр.

export const SCENE_FPS = 30;
/** Бесшовный цикл 6 с: кадр 180 совпадает с кадром 0. */
export const SCENE_FRAMES = 180;

export type SceneProps = { spec: ReelSceneSpec; seed: string; frame: number };

/** Детерминированный шум: один и тот же микс всегда выглядит одинаково. */
export function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Доля цикла 0…1 для кадра, со сдвигом фазы. */
export const loopPhase = (frame: number, shift = 0) => (((frame / SCENE_FRAMES + shift) % 1) + 1) % 1;

/** Плавное «дыхание» 0 → 1 → 0 за один период. */
export const breathe = (t: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t);

/** Кусочно-линейная кривая по ключам [доля, значение], как keyframes. */
function keys(t: number, points: Array<[number, number]>) {
  for (let i = 1; i < points.length; i += 1) {
    const [t1, v1] = points[i];
    const [t0, v0] = points[i - 1];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return points[points.length - 1][1];
}

/** Смесь двух #rrggbb: weight — доля первого цвета. */
export function mixHex(a: string, b: string, weight: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(channel(a, i) * weight + channel(b, i) * (1 - weight)).toString(16).padStart(2, '0'))
      .join('')
  );
}

export const sceneColors = (spec: ReelSceneSpec) => ({ c1: getProfileColor(spec.c1), c2: getProfileColor(spec.c2) });

// ── Фигуры: штрих в цвете профиля, без заливки, как знак «Дым». Центр — в (0, 0). ──

const SHAPES: Record<SceneMotif, ReactNode> = {
  frost: [0, 60, 120].map((r) => (
    <g key={r} transform={`rotate(${r})`} strokeWidth={1.2} strokeLinecap="round">
      <path d="M0 -11V11" />
      <path d="M-3 -8L0 -5L3 -8M-3 8L0 5L3 8" />
    </g>
  )),
  bloom: (
    <g strokeWidth={1.2}>
      <path d="M0 -11C6 -5 6 5 0 11C-6 5 -6 -5 0 -11Z" />
      <path d="M0 -8V8" strokeLinecap="round" />
    </g>
  ),
  juicy: (
    <g strokeWidth={1.2}>
      <circle r={10} />
      <circle r={7.5} />
      {[0, 60, 120].map((r) => (
        <path key={r} d="M0 -7.5V7.5" transform={`rotate(${r})`} />
      ))}
    </g>
  ),
  berry: (
    <g strokeWidth={1.2}>
      <circle cx={-4} cy={2} r={5} />
      <circle cx={4} cy={3} r={5} />
      <circle cx={0} cy={-4} r={5} />
    </g>
  ),
  warm: <path d="M0 8V-8" strokeWidth={1.4} strokeLinecap="round" />,
  // Струя 40×120 с центром в (0, 0); рисуется снизу вверх через dashoffset.
  smoke: null,
  general: <circle r={10} strokeWidth={1.2} />,
};

// ── Движение. y — в процентах высоты сцены, dx — в px, как сдвиги мокапа. ──

type Pose = { x: number; y: number; rotate: number; scale: number; opacity: number; draw?: number };
type Particle = { size: number; x: number; y: number; phase: number; dx: number };

const fall = (t: number, p: Particle): Pose => ({
  x: p.dx * Math.sin(Math.PI * t),
  y: -6 + 106 * t,
  rotate: 180 * t,
  scale: 1,
  opacity: keys(t, [[0, 0], [0.12, 0.95], [0.88, 0.85], [1, 0]]),
});

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

const MOTION: Record<SceneMotif, (t: number, p: Particle) => Pose> = {
  // Снежинки медленно падают с покачиванием и поворотом.
  frost: fall,
  // Лепестки плывут вверх, поворачиваясь.
  bloom: (t, p) => ({ x: p.dx * t, y: -74 * t, rotate: 220 * t, scale: 1, opacity: keys(t, [[0, 0], [0.15, 0.9], [1, 0]]) }),
  // Дольки поднимаются.
  juicy: (t, p) => ({ x: p.dx * t, y: 6 - 95 * t, rotate: 0, scale: 1, opacity: keys(t, [[0, 0], [0.15, 0.9], [1, 0]]) }),
  // Грозди медленно падают.
  berry: fall,
  // Искры поднимаются и мерцают.
  warm: (t, p) => ({
    x: p.dx * easeOut(t),
    y: -80 * easeOut(t),
    rotate: 0,
    scale: 1,
    opacity: keys(t, [[0, 0], [0.1, 1], [0.5, 0.5], [0.6, 0.95], [1, 0]]),
  }),
  // Струи прорисовываются снизу вверх, поднимаются и тают.
  smoke: (t, p) => ({
    x: p.dx * easeInOut(t),
    y: 6 - 72 * easeInOut(t),
    rotate: 0,
    scale: 0.6 + 1.2 * easeInOut(t),
    opacity: keys(t, [[0, 0], [0.25, 0.75], [1, 0]]),
    draw: 1 - 2 * t,
  }),
  // Кольца поднимаются, расходятся и тают — без намёка на конкретный вкус.
  general: (t, p) => ({
    x: p.dx * 0.3 * Math.sin(2 * Math.PI * t),
    y: -48 * easeInOut(t),
    rotate: 0,
    scale: 0.6 + 0.9 * t,
    opacity: keys(t, [[0, 0], [0.2, 0.8], [1, 0]]),
  }),
};

// Числа — из PARTICLES доски: n — фигур у главного мотива, nSecondary — у второго (треть).
const PARTICLES: Record<SceneMotif, { n: number; nSecondary: number; size: [number, number]; y: [number, number] }> = {
  frost: { n: 26, nSecondary: 9, size: [10, 18], y: [-8, 10] },
  bloom: { n: 12, nSecondary: 4, size: [14, 22], y: [70, 100] },
  juicy: { n: 16, nSecondary: 6, size: [16, 26], y: [80, 105] },
  berry: { n: 16, nSecondary: 3, size: [16, 24], y: [10, 60] },
  warm: { n: 26, nSecondary: 9, size: [12, 18], y: [85, 105] },
  smoke: { n: 7, nSecondary: 3, size: [30, 44], y: [70, 100] },
  general: { n: 14, nSecondary: 0, size: [16, 30], y: [40, 100] },
};

function makeParticles(motif: SceneMotif, rand: () => number, count: number): Particle[] {
  const cfg = PARTICLES[motif];
  return Array.from({ length: count }, () => {
    const size = cfg.size[0] + rand() * (cfg.size[1] - cfg.size[0]);
    const x = rand() * 100;
    const y = cfg.y[0] + rand() * (cfg.y[1] - cfg.y[0]);
    const phase = rand();
    const dx = Math.round((rand() - 0.5) * 80);
    rand(); // размытие стиля A — не используется, но держит ту же последовательность шума, что на доске
    return { size, x, y, phase, dx };
  });
}

function ParticleLayer({ motif, particles, color, frame }: { motif: SceneMotif; particles: Particle[]; color: string; frame: number }) {
  const stroke = mixHex(color, '#ffffff', 0.8);
  return (
    <g fill="none" stroke={stroke}>
      {particles.map((p, i) => {
        const pose = MOTION[motif](loopPhase(frame, p.phase), p);
        if (pose.opacity <= 0.001) return null;
        return (
          <svg key={i} x={`${p.x}%`} y={`${p.y + pose.y}%`} overflow="visible">
            <g transform={`translate(${pose.x.toFixed(2)} 0) rotate(${pose.rotate.toFixed(2)}) scale(${pose.scale.toFixed(3)})`} opacity={pose.opacity.toFixed(3)}>
              {motif === 'smoke' ? (
                <path
                  d="M20 118C4 96 36 78 20 58C6 40 32 22 22 2"
                  transform={`scale(${(p.size / 40).toFixed(3)}) translate(-20 -60)`}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={pose.draw}
                />
              ) : (
                <g transform={`scale(${(p.size / 24).toFixed(3)})`}>{SHAPES[motif]}</g>
              )}
            </g>
          </svg>
        );
      })}
    </g>
  );
}

/** Каркас сцены: тёмный фон с ореолом цвета профиля, слой мотива и фигуры. */
export function SceneFrame({ spec, seed, frame, children }: SceneProps & { children?: ReactNode }) {
  const uid = useId();
  const { c1, c2 } = sceneColors(spec);
  const rand = seeded(seed);
  const primary = makeParticles(spec.primary, rand, PARTICLES[spec.primary].n);
  const secondary = spec.secondary ? makeParticles(spec.secondary, rand, PARTICLES[spec.secondary].nSecondary) : [];
  return (
    <svg width="100%" height="100%" style={{ display: 'block', position: 'absolute', inset: 0 }} aria-hidden focusable="false">
      <defs>
        <radialGradient id={`${uid}bg`} cx={0.5} cy={0.3} r={1} gradientTransform="translate(0.5 0.3) scale(1.2 0.8) translate(-0.5 -0.3)">
          <stop offset={0} stopColor={mixHex(c1, '#141417', 0.22)} />
          <stop offset={0.62} stopColor="#121215" />
          <stop offset={1} stopColor="#0e0e11" />
        </radialGradient>
        <radialGradient id={`${uid}halo`} cx={0.5} cy={0.38} r={1} gradientTransform="translate(0.5 0.38) scale(0.7 0.5) translate(-0.5 -0.38)">
          <stop offset={0} stopColor={c1} stopOpacity={0.2} />
          <stop offset={0.7} stopColor={c1} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${uid}bg)`} />
      <rect width="100%" height="100%" fill={`url(#${uid}halo)`} opacity={0.7 + 0.3 * breathe(loopPhase(frame))} />
      {children}
      <ParticleLayer motif={spec.primary} particles={primary} color={c1} frame={frame} />
      {spec.secondary ? <ParticleLayer motif={spec.secondary} particles={secondary} color={c2} frame={frame} /> : null}
    </svg>
  );
}
