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

/** Собирает index.css в один файл, разворачивая относительные @import. */
function inline(entry) {
  const css = readFileSync(entry, 'utf8');
  return css.replace(/^@import url\("(\.\/[^"]+)"\);$/gm, (_, relative) => {
    const nested = join(dirname(entry), relative);
    return `/* ── ${relative.replace('./', '')} ── */\n${inline(nested).trimEnd()}`;
  });
}

const bundle = HEADER + inline(join(here, 'index.css'));
const check = process.argv.includes('--check');
const drifted = [];

for (const target of targets) {
  const path = join(repoRoot, target);
  if (check) {
    let current = '';
    try {
      current = readFileSync(path, 'utf8');
    } catch {
      drifted.push(`${target} — отсутствует`);
      continue;
    }
    if (current !== bundle) drifted.push(`${target} — разошёлся с packages/design-tokens/`);
  } else {
    writeFileSync(path, bundle);
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
