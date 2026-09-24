import test from 'node:test';
import assert from 'node:assert/strict';
import { compositionColor } from './composition-color';

// Доли состава — слой данных: цвет берётся из ramp `--composition-*` канона,
// а не из хэша имени вне палитры (#98).
test('compositionColor берёт цвет доли из ramp по позиции компонента', () => {
  assert.equal(compositionColor(0), 'var(--composition-1)');
  assert.equal(compositionColor(4), 'var(--composition-5)');
  assert.equal(compositionColor(5), 'var(--composition-1)');
});
