// Проверка соответствия Film Noir в обоих приложениях: цвета только из токенов,
// без эмодзи и признаков генерации из канона (#348).
// Запуск: npm run lint:design (в CI — job atelier-design-lint).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findDesignViolations } from '../src/lib/design-rules';

const apps = join(import.meta.dirname, '..', '..');
// В гостевом приложении цветовые литералы остаются у canvas и сцен рилсов: они
// рисуют пиксели и CSS-токены не читают. Палитра профилей генерируется из токенов.
const roots = [
  { src: join(apps, 'master-web', 'src'), colors: true },
  { src: join(apps, 'aroma-web', 'src'), colors: false },
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

const violations = roots.flatMap(({ src, colors }) =>
  walk(src).flatMap((path) =>
    findDesignViolations(readFileSync(path, 'utf8'))
      .filter((item) => colors || item.rule !== 'color-literal')
      .map((item) => `${relative(process.cwd(), path)}:${item.line} ${item.rule} «${item.match}»`),
  ),
);

if (violations.length) {
  console.error(violations.join('\n'));
  console.error(`\nНарушений дизайн-системы: ${violations.length}. Цвета берутся из токенов, без эмодзи, middot, тире между частями фразы, «≈» и многоточия вне состояний процесса.`);
  process.exit(1);
}

console.log('Дизайн-система: нарушений нет.');
