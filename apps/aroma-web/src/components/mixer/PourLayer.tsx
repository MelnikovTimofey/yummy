import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import { RING_RADIUS, RING_VIEWBOX, type RingArc } from './BowlRing';

export type PourRequest = {
  from: DOMRect;
  ring: DOMRect;
  arc: RingArc;
};

export type PourLayerHandle = {
  pour: (request: PourRequest) => void;
};

type Grain = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  qx: number;
  qy: number;
  t0: number;
  duration: number;
  rotation: number;
  spin: number;
  length: number;
  color: string;
};

const GRAINS = 110;
const FADE_MS = 320;

const mixHex = (from: string, to: string, t: number) => {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
};

// Щепотка табака дугой из карты в сегмент нового компонента. Крупинки — в
// цвете профиля с табачными оттенками: это слой данных, а не второй акцент.
export function PourLayer({ ref }: { ref: Ref<PourLayerHandle> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grains = useRef<Grain[]>([]);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useImperativeHandle(ref, () => ({
    pour: ({ from, ring, arc }) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      const host = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(host.width * dpr);
      const height = Math.round(host.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const scale = ring.width / RING_VIEWBOX;
      const cx = ring.left - host.left + ring.width / 2;
      const cy = ring.top - host.top + ring.height / 2;
      const start = -Math.PI / 2 + arc.offset / RING_RADIUS;
      const end = start + Math.max(0.05, arc.length / RING_RADIUS);
      const ox = from.left - host.left + from.width / 2;
      const oy = from.top - host.top + from.height * 0.45;
      const now = performance.now();

      for (let k = 0; k < GRAINS; k += 1) {
        const angle = start + (end - start) * (0.06 + 0.88 * Math.random());
        const radius = (RING_RADIUS + (Math.random() - 0.5) * 18) * scale;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x0 = ox + (Math.random() - 0.5) * from.width * 0.5;
        const y0 = oy + (Math.random() - 0.5) * from.height * 0.3;
        const shade = Math.random();
        grains.current.push({
          x0,
          y0,
          x1,
          y1,
          qx: (x0 + x1) / 2 + (Math.random() - 0.5) * 60,
          qy: Math.min(y0, y1) - 30 - Math.random() * 50,
          t0: now + Math.random() * 360,
          duration: 520 + Math.random() * 200,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 6,
          length: 2 + Math.random() * 2.5,
          color:
            shade < 0.55
              ? mixHex(arc.color, '#2a1a12', Math.random() * 0.45)
              : shade < 0.9
                ? arc.color
                : mixHex(arc.color, '#f4efea', 0.18),
        });
      }

      const tick = (time: number) => {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        grains.current = grains.current.filter((grain) => time < grain.t0 + grain.duration + FADE_MS);
        for (const grain of grains.current) {
          let progress = (time - grain.t0) / grain.duration;
          if (progress < 0) continue;
          let x: number;
          let y: number;
          let alpha = 1;
          if (progress < 1) {
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            const rest = 1 - eased;
            x = rest * rest * grain.x0 + 2 * rest * eased * grain.qx + eased * eased * grain.x1;
            y = rest * rest * grain.y0 + 2 * rest * eased * grain.qy + eased * eased * grain.y1;
          } else {
            x = grain.x1;
            y = grain.y1;
            alpha = Math.max(0, 1 - (time - grain.t0 - grain.duration) / FADE_MS);
            progress = 1;
          }
          context.save();
          context.globalAlpha = alpha;
          context.translate(x, y);
          context.rotate(grain.rotation + grain.spin * progress);
          context.fillStyle = grain.color;
          context.fillRect(-grain.length / 2, -0.8, grain.length, 1.6);
          context.restore();
        }
        if (grains.current.length) {
          frame.current = requestAnimationFrame(tick);
        } else {
          frame.current = 0;
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      if (!frame.current) {
        frame.current = requestAnimationFrame(tick);
      }
    },
  }));

  return <canvas ref={canvasRef} className="mixer-pour" aria-hidden />;
}
