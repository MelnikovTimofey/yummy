import test from 'node:test';
import assert from 'node:assert/strict';
import { findDesignViolations } from './design-rules';

// Цвета живут в токенах Film Noir: литерал в TSX — дрейф мимо канона (#102).
test('findDesignViolations ловит цветовые литералы в коде', () => {
  const source = [
    "const a = { background: '#b04a3e' };",
    'const b = `oklch(0.65 0.13 ${hue})`;',
    "const c = 'rgba(0, 0, 0, 0.4)';",
    "const d = 'hsl(10 40% 50%)';",
  ].join('\n');

  assert.deepEqual(
    findDesignViolations(source).map((item) => [item.line, item.rule]),
    [
      [1, 'color-literal'],
      [2, 'color-literal'],
      [3, 'color-literal'],
      [4, 'color-literal'],
    ],
  );
});

test('findDesignViolations пропускает токены, хэш-маршруты и комментарии', () => {
  const source = [
    "const a = { background: 'var(--accent)' };",
    "window.location.hash = '#access';",
    '// в прототипе было oklch(0.65 0.13 38) — см. #98',
    '/* #b04a3e */',
  ].join('\n');

  assert.deepEqual(findDesignViolations(source), []);
});

// Эмодзи в системе нет; разрешённые символы — ★ ✓ ← → ↑ ↓ × ⌘ · ↕ (#102).
test('findDesignViolations ловит эмодзи, но не разрешённые символы', () => {
  const source = ["const a = 'Готово 🔥';", "const b = '★ 4,8 · ⌘K ✓ ← ↕';"].join('\n');

  assert.deepEqual(
    findDesignViolations(source).map((item) => [item.line, item.rule]),
    [[1, 'emoji']],
  );
});
