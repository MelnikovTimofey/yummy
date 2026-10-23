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

// Эмодзи в системе нет; разрешённые символы — ★ ✓ ← → ↑ ↓ × ⌘ ↕ (#102).
test('findDesignViolations ловит эмодзи, но не разрешённые символы', () => {
  const source = ["const a = 'Готово 🔥';", "const b = '★ 4,8 ⌘K ✓ ← ↕';"].join('\n');

  assert.deepEqual(
    findDesignViolations(source).map((item) => [item.line, item.rule]),
    [[1, 'emoji']],
  );
});

// Признаки генерации из канона (#348): middot, тире между частями фразы, «≈»,
// многоточие вне состояний процесса.
test('findDesignViolations ловит middot, тире между частями фразы и «≈»', () => {
  const source = [
    "const a = `${brand} · ${line}`;",
    "const b = 'Активен — гость видит на витрине';",
    '        Цифры с последней синхронизации, отзывы —',
    "const c = `≈ ${grams} г`;",
  ].join('\n');

  assert.deepEqual(
    findDesignViolations(source).map((item) => [item.line, item.rule]),
    [
      [1, 'middot'],
      [2, 'dash'],
      [3, 'dash'],
      [4, 'approx'],
    ],
  );
});

test('findDesignViolations пропускает одиночный прочерк и диапазон дат', () => {
  const source = [
    "const a = value ?? '—';",
    '<td>—</td>',
    '              —',
    'return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;',
    '// Код смены — строкой (#366)',
  ].join('\n');

  assert.deepEqual(findDesignViolations(source), []);
});

test('findDesignViolations пускает многоточие только в состояниях процесса', () => {
  const source = [
    "{saving ? 'Сохраняем…' : 'Сохранить'}",
    '<p className="meta-line">Загружаем полку…</p>',
    "{uploading ? `Разбираем ${uploading}…` : 'Перетащите PDF'}",
    'placeholder="Название, бренд, вкус…"',
    "`Ещё ${hidden}…`",
  ].join('\n');

  assert.deepEqual(
    findDesignViolations(source).map((item) => [item.line, item.rule]),
    [
      [4, 'ellipsis'],
      [5, 'ellipsis'],
    ],
  );
});
