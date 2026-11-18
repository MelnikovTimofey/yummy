// Фото вкусов (#592): исходники Unsplash из photos/sources.json → нарезанные WebP
// в public/photos. Файлы коммитятся, сборка скрипт не запускает: `npm run photos`.
// Исходники кэшируются во временной папке, повторный прогон не качает заново.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'public/photos');
const cacheDir = join(tmpdir(), 'aroma-mix-photos');
const sources = JSON.parse(readFileSync(join(root, 'photos/sources.json'), 'utf8'));

// Размеры @2x/@3x под места из канона: строка 44 и герой 64, постер Витрины 156×92,
// шапка листа 390×240, рилс 390×844.
const SIZES = { 132: [132, 132], poster: [312, 184], sheet: [780, 480], reel: [780, 1688] };
const QUALITY = 60;

mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

async function original({ unsplash }) {
  const file = join(cacheDir, `${unsplash}.jpg`);
  if (!existsSync(file)) {
    // fit=max вписывает в 2600×2600 без апскейла: хватает и на кроп рилса 1688 по высоте.
    const response = await fetch(`https://images.unsplash.com/${unsplash}?fm=jpg&q=90&fit=max&w=2600&h=2600`);
    if (!response.ok) throw new Error(`${unsplash}: HTTP ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  return file;
}

// Кроп вокруг точки focus (доли ширины и высоты), чтобы ягода не уехала из кадра
// на вертикальном рилсе и узком постере.
async function cut(file, [width, height], focus) {
  const meta = await sharp(file).metadata();
  const scale = Math.max(width / meta.width, height / meta.height);
  const scaledWidth = Math.round(meta.width * scale);
  const scaledHeight = Math.round(meta.height * scale);
  const clamp = (value, max) => Math.min(Math.max(Math.round(value), 0), max);
  return sharp(file)
    .resize(scaledWidth, scaledHeight)
    .extract({
      left: clamp(focus.x * scaledWidth - width / 2, scaledWidth - width),
      top: clamp(focus.y * scaledHeight - height / 2, scaledHeight - height),
      width,
      height,
    })
    .webp({ quality: QUALITY })
    .toBuffer();
}

const expected = new Set();
let total = 0;
for (const source of sources) {
  const file = await original(source);
  for (const [size, dimensions] of Object.entries(SIZES)) {
    const name = `${source.ingredient}-${source.variant}-${size}.webp`;
    const data = await cut(file, dimensions, source.focus ?? { x: 0.5, y: 0.5 });
    writeFileSync(join(outDir, name), data);
    expected.add(name);
    total += data.length;
  }
  console.log(`${source.ingredient}-${source.variant}`);
}

for (const name of readdirSync(outDir)) if (!expected.has(name)) rmSync(join(outDir, name));
console.log(`${expected.size} файлов, ${(total / 1024 / 1024).toFixed(1)} МБ`);
