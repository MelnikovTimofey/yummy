export type DesignViolation = {
  line: number;
  rule: 'color-literal' | 'emoji';
  match: string;
};

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
const PICTOGRAPH = /\p{Extended_Pictographic}/gu;
// Не-иконочные символы, которые канон разрешает в интерфейсе.
const ALLOWED_SYMBOLS = new Set(['★', '✓', '←', '→', '↑', '↓', '↕', '×', '⌘', '·']);

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
    });

  return violations;
};
