// Иконки приложения (#586): знак «Дым» из public/logo-mark-oxblood.svg на угле
// #0f0f12. PNG коммитятся, сборка скрипт не запускает: `npm run icons`.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const source = readFileSync(`${publicDir}logo-mark-oxblood.svg`, 'utf8');

const [minX, minY, width, height] = source.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const mark = source.match(/<g[\s\S]*<\/g>/)[0];
const background = '#0f0f12';

// share — доля высоты холста под рисунок знака. Maskable Android обрезает до
// круга в 80 % холста, поэтому знак там мельче.
const icons = [
  { file: 'icon-192.png', size: 192, share: 0.62 },
  { file: 'icon-512.png', size: 512, share: 0.62 },
  { file: 'icon-maskable-512.png', size: 512, share: 0.44 },
  { file: 'apple-touch-icon.png', size: 180, share: 0.62 },
];

for (const { file, size, share } of icons) {
  const scale = (size * share) / height;
  const x = (size - width * scale) / 2;
  const y = (size - height * scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${background}"/>
<g transform="translate(${x} ${y}) scale(${scale}) translate(${-minX} ${-minY})">${mark}</g>
</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
  writeFileSync(`${publicDir}${file}`, png);
  console.log(`${file} ${size}×${size}`);
}
