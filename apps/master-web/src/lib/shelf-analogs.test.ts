import test from 'node:test';
import assert from 'node:assert/strict';
import type { ShelfAnalog } from '@/contracts';
import { analogStock, analogToastText, moveAnalog, withoutAnalog } from './shelf-analogs';

// Аналоги на «Полке» (#482, мокап analogs @ a74ab4c2, экраны shelf и shelf-analogs).

const analog = (name: string, inStock = true, substituting = false): ShelfAnalog => ({
  tobaccoId: name.toLowerCase().replace(/\s+/g, '-'),
  manufacturer: 'Darkside',
  name,
  inStock,
  substituting,
});

test('порядок замены: ↑ ↓ меняют соседей, за края не выходят; × убирает', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(moveAnalog(ids, 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveAnalog(ids, 1, 1), ['a', 'c', 'b']);
  assert.deepEqual(moveAnalog(ids, 0, -1), ids);
  assert.deepEqual(moveAnalog(ids, 2, 1), ids);
  assert.deepEqual(withoutAnalog(ids, 'b'), ['a', 'c']);
});

test('тост «Сделать аналогом»: вторая строка называет миксы, которые стали видны гостю', () => {
  assert.equal(analogToastText('Red Rush', []), 'Аналог Red Rush.');
  assert.equal(
    analogToastText('Red Rush', [{ id: 'cosmos', name: 'Виноградный космос' }]),
    'Аналог Red Rush. «Виноградный космос» виден гостю с заменой.',
  );
  assert.equal(
    analogToastText('Red Rush', [
      { id: 'cosmos', name: 'Виноградный космос' },
      { id: 'jelly', name: 'Гранатовое желе' },
    ]),
    'Аналог Red Rush. «Виноградный космос», «Гранатовое желе» видны гостю с заменой.',
  );
});

test('наличие аналога в карточке: есть или закончился', () => {
  assert.equal(analogStock(analog('Lemon Shock')), 'есть');
  assert.equal(analogStock(analog('Lemonblast', false)), 'закончился');
});
