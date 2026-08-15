/* Раскладывает канон токенов по приложениям.
 *
 * Прямой @import из packages/ приложениям недоступен: docker build context у каждого
 * приложения — его собственный каталог (docker-compose.yml), а npm workspaces в репозитории
 * нет. Поэтому канон собирается в один файл и коммитится внутрь каждого приложения.
 *
 *   node sync.mjs           — перегенерировать apps/<app>/src/design-tokens.generated.css
 *   node sync.mjs --check   — только проверить; ненулевой код выхода, если файлы разошлись
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const targets = ['apps/aroma-web/src/design-tokens.generated.css', 'apps/master-web/src/design-tokens.generated.css'];

const HEADER = `/* СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать.
   Источник: packages/design-tokens/. Перегенерация: node packages/design-tokens/sync.mjs
   Правки здесь потеряются и уронят CI-проверку atelier-design-tokens. */\n`;

const TS_HEADER = `/* СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать.
   Источник: packages/design-tokens/profile-colors.css
   Перегенерация: node packages/design-tokens/sync.mjs */
`;

/** Собирает index.css в один файл, разворачивая относительные @import. */
function inline(entry) {
  const css = readFileSync(entry, 'utf8');
  return css.replace(/^@import url\("(\.\/[^"]+)"\);$/gm, (_, relative) => {
    const nested = join(dirname(entry), relative);
    return `/* ── ${relative.replace('./', '')} ── */\n${inline(nested).trimEnd()}`;
  });
}

/** Цвета профилей нужны гостю ещё и как строки в JS: к ним дописывается альфа
 *  (`${color}48` в halo-градиентах), поэтому var() там не подходит. Карта
 *  генерируется из того же profile-colors.css, чтобы копия не жила своей жизнью. */
function profileModule() {
  const css = readFileSync(join(here, 'profile-colors.css'), 'utf8');
  const entries = [...css.matchAll(/--profile-([a-z-]+):\s*(#[0-9a-f]{6});/g)]
    .map(([, name, hex]) => [name.replace(/-/g, '_'), hex]);
  const fallback = entries.find(([name]) => name === 'tobacco')?.[1];
  if (entries.length !== 12 || !fallback) {
    throw new Error(`profile-colors.css: ожидались 12 профилей и tobacco, найдено ${entries.length}`);
  }
  return [
    TS_HEADER,
    'export const PROFILE_COLORS: Record<string, string> = {',
    ...entries.map(([name, hex]) => `  ${name}: '${hex}',`),
    '};',
    '',
    `export const PROFILE_FALLBACK = '${fallback}';`,
    '',
  ].join('\n');
}

const bundle = HEADER + inline(join(here, 'index.css'));
const check = process.argv.includes('--check');
const drifted = [];

const artefacts = [
  ...targets.map((target) => [target, bundle]),
  ['apps/aroma-web/src/lib/profile-colors.generated.ts', profileModule()],
];

for (const [target, content] of artefacts) {
  const path = join(repoRoot, target);
  if (check) {
    let current = '';
    try {
      current = readFileSync(path, 'utf8');
    } catch {
      drifted.push(`${target} — отсутствует`);
      continue;
    }
    if (current !== content) drifted.push(`${target} — разошёлся с packages/design-tokens/`);
  } else {
    writeFileSync(path, content);
    console.log(`обновлён ${target}`);
  }
}

if (drifted.length > 0) {
  console.error('Токены разошлись с каноном:');
  for (const line of drifted) console.error(`  ${line}`);
  console.error('Запустите: node packages/design-tokens/sync.mjs');
  process.exit(1);
}

if (check) console.log('Токены синхронны с packages/design-tokens/.');
