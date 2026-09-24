// Проверка соответствия Film Noir: цвета — только токены, эмодзи нет.
// Запуск: npm run lint:design (в CI — job atelier-master-build).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findDesignViolations } from '../src/lib/design-rules';

const root = join(import.meta.dirname, '..', 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

const violations = walk(root).flatMap((path) =>
  findDesignViolations(readFileSync(path, 'utf8')).map(
    (item) => `${relative(process.cwd(), path)}:${item.line} ${item.rule} «${item.match}»`,
  ),
);

if (violations.length) {
  console.error(violations.join('\n'));
  console.error(`\nНарушений дизайн-системы: ${violations.length}. Цвета берутся из токенов, эмодзи не используются.`);
  process.exit(1);
}

console.log('Дизайн-система: нарушений нет.');
