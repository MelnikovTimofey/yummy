// Детерминированный hue по id — каждый табак получает стабильный цвет
// сегмента в ProportionBar и border в ComponentCard. Алгоритм взят
// из прототипа master/data.jsx (colorForTobacco) и сохранён 1-в-1.

const COMPONENT_HUES = [38, 200, 160, 80, 320, 260, 20, 120];

export type TobaccoColor = {
  fill: string;
  soft: string;
  border: string;
  text: string;
};

export const colorForTobacco = (id: string): TobaccoColor => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = COMPONENT_HUES[h % COMPONENT_HUES.length];
  return {
    fill: `oklch(0.65 0.13 ${hue})`,
    soft: `oklch(0.65 0.13 ${hue} / 0.14)`,
    border: `oklch(0.65 0.13 ${hue} / 0.4)`,
    text: `oklch(0.78 0.12 ${hue})`,
  };
};
