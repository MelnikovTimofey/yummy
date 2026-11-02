import test from 'node:test';
import assert from 'node:assert/strict';
import { readSubstitute, showSubstitute } from './substitute';

// Замена в составе у гостя (#483, PRD §8.7 п.2): стоит табак с полки, пропорция — исходная.

test('компонент с заменой: бренд и название с полки, пропорция своя, отмечен', () => {
  const component = { id: 'lemonblast', manufacturer: 'Darkside', name: 'Lemonblast', proportion: 30 };
  const substitute = readSubstitute({ tobaccoId: 'lemon-shock', manufacturer: 'Black Burn', name: 'Lemon Shock', flavors: ['лимон'] });
  assert.deepEqual(showSubstitute(component, substitute), {
    id: 'lemonblast',
    manufacturer: 'Black Burn',
    name: 'Lemon Shock',
    proportion: 30,
    substituted: true,
  });
});

test('без замены компонент как есть', () => {
  const component = { manufacturer: 'Darkside', name: 'Cola', proportion: 25 };
  assert.deepEqual(showSubstitute(component, null), { ...component, substituted: false });
});

test('кривой substitute не подменяет компонент', () => {
  for (const value of [undefined, null, 'x', {}, { name: 'Lemon Shock' }, { manufacturer: 'Black Burn', name: '' }]) {
    assert.equal(readSubstitute(value), null, JSON.stringify(value));
  }
});
