export type DesignViolation = {
  line: number;
  rule: 'color-literal' | 'emoji' | 'middot' | 'dash' | 'approx' | 'ellipsis';
  match: string;
};

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
const PICTOGRAPH = /\p{Extended_Pictographic}/gu;
// Не-иконочные символы, которые канон разрешает в интерфейсе.
const ALLOWED_SYMBOLS = new Set(['★', '✓', '←', '→', '↑', '↓', '↕', '×', '⌘']);
// Признаки генерации из канона (#348). Одиночный прочерк «—» в пустой ячейке
// разрешён, ловится только тире между частями фразы.
const MIDDOT = /\u00b7/g;
const PHRASE_DASH = /[ \t]\u2014[ \t]|\S[ \t]+\u2014$/g;
const APPROX = /\u2248/g;
const ELLIPSIS = /\u2026/g;
// Многоточие уместно только в состоянии процесса: «Сохраняем…», «Разбираем ${file}…».
const PROCESS_STATE =
  /(?:Сохраняем|Загружаем|Проверяем|Открываем|Собираем|Ждём|Удаляем|Считаем|Отмечаем|Выпускаем|Обновляем|Ставим|Принимаем|Ищем|Раскладываем|Разбираем)[^'"`<>\u2026]*\u2026/g;

// Комментарии заменяются пробелами с сохранением переводов строк, чтобы номера
// строк нарушений совпадали с исходником.
const blankComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) => comment.replace(/[^\n]/g, ' '));

export const findDesignViolations = (source: string): DesignViolation[] => {
  const violations: DesignViolation[] = [];

  blankComments(source)
    .split('\n')
    .forEach((text, index) => {
      for (const match of text.matchAll(COLOR_LITERAL)) {
        violations.push({ line: index + 1, rule: 'color-literal', match: match[0] });
      }
      for (const match of text.matchAll(PICTOGRAPH)) {
        if (!ALLOWED_SYMBOLS.has(match[0])) {
          violations.push({ line: index + 1, rule: 'emoji', match: match[0] });
        }
      }
      for (const [rule, pattern, line] of [
        ['middot', MIDDOT, text],
        ['dash', PHRASE_DASH, text],
        ['approx', APPROX, text],
        ['ellipsis', ELLIPSIS, text.replace(PROCESS_STATE, '')],
      ] as const) {
        for (const match of line.matchAll(pattern)) {
          violations.push({ line: index + 1, rule, match: match[0] });
        }
      }
    });

  return violations;
};
