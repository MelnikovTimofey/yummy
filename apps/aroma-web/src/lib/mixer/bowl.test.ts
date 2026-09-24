import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coolingShare,
  defaultShares,
  draftMixName,
  initialShelves,
  matchScore,
  moveBoundary,
  pairAffinity,
  poolForTurn,
  shelvesOf,
  splitWarning,
  trustMaster,
  underShelves,
  verdictForScore,
} from './bowl';
import type { PaletteTobacco } from './types';

const tobacco = (id: string, overrides: Partial<PaletteTobacco> = {}): PaletteTobacco => ({
  id,
  manufacturer: 'Darkside',
  name: id,
  flavorProfiles: ['berry'],
  flavors: [id],
  flavorTags: [],
  cooling: false,
  twist: false,
  mixCount: 0,
  ...overrides,
});

const affinity = { 'berry|dessert': 0.9, 'berry|minty': 0.8, 'dessert|minty': 0.4, 'berry|berry': 0.7 };

test('defaultShares — 100 / 65-35 / 55-35-10', () => {
  assert.deepEqual(defaultShares(1), [100]);
  assert.deepEqual(defaultShares(2), [65, 35]);
  assert.deepEqual(defaultShares(3), [55, 35, 10]);
});

test('pairAffinity симметрична, неизвестная пара — нейтральные 0,5', () => {
  const berry = tobacco('a', { flavorProfiles: ['berry'] });
  const dessert = tobacco('b', { flavorProfiles: ['dessert'] });
  const citrus = tobacco('c', { flavorProfiles: ['citrus'] });
  assert.equal(pairAffinity(berry, dessert, affinity), 0.9);
  assert.equal(pairAffinity(dessert, berry, affinity), 0.9);
  assert.equal(pairAffinity(berry, citrus, affinity), 0.5);
  assert.equal(pairAffinity(berry, tobacco('d', { flavorProfiles: [] }), affinity), 0.5);
});

test('pairAffinity усредняет пары профилей у многопрофильных табаков', () => {
  const left = tobacco('a', { flavorProfiles: ['berry', 'dessert'] });
  const right = tobacco('b', { flavorProfiles: ['minty'] });
  assert.equal(pairAffinity(left, right, affinity), (0.8 + 0.4) / 2);
});

test('matchScore взвешивает сродство произведением долей по умолчанию', () => {
  const base = tobacco('base', { flavorProfiles: ['berry'] });
  const accent = tobacco('accent', { flavorProfiles: ['dessert'] });
  const twist = tobacco('twist', { flavorProfiles: ['minty'] });

  assert.equal(matchScore([base, accent], affinity), 90);

  // 55·35·0,9 + 55·10·0,8 + 35·10·0,4 = 1732,5 + 440 + 140 = 2312,5
  // 55·35 + 55·10 + 35·10 = 2825 → 81,86…
  assert.equal(matchScore([base, accent, twist], affinity), 82);
  assert.equal(matchScore([base], affinity), null);
});

test('verdictForScore — ступени 85 / 70 / 55', () => {
  assert.equal(verdictForScore(85), 'classic');
  assert.equal(verdictForScore(84), 'confident');
  assert.equal(verdictForScore(70), 'confident');
  assert.equal(verdictForScore(55), 'bold');
  assert.equal(verdictForScore(54), 'ask-master');
});

test('moveBoundary двигает границу с шагом 5 и оставляет минимум 5', () => {
  assert.deepEqual(moveBoundary([65, 35], 0, 72), [70, 30]);
  assert.deepEqual(moveBoundary([65, 35], 0, 99), [95, 5]);
  assert.deepEqual(moveBoundary([65, 35], 0, -10), [5, 95]);
  assert.deepEqual(moveBoundary([55, 35, 10], 1, 97), [55, 40, 5]);
  assert.deepEqual(moveBoundary([55, 35, 10], 1, 50), [55, 5, 40]);
  assert.deepEqual(moveBoundary([55, 35, 10], 0, 30), [30, 60, 10]);
  const same = [65, 35];
  assert.equal(moveBoundary(same, 0, 66), same);
});

test('coolingShare и splitWarning', () => {
  const tobaccos = [tobacco('a'), tobacco('b'), tobacco('ice', { cooling: true })];
  assert.equal(coolingShare(tobaccos, [55, 20, 25]), 25);
  assert.equal(splitWarning(tobaccos, [55, 20, 25]), 'split.too-cold');
  assert.equal(splitWarning(tobaccos, [30, 60, 10]), 'split.weak-base');
  assert.equal(splitWarning(tobaccos, [55, 35, 10]), null);
});

test('draftMixName: первые ноты через запятую и «и», холодный штрих — «со льдом»', () => {
  const strawberry = tobacco('a', { flavors: ['земляника', 'лесные ягоды'] });
  const tea = tobacco('b', { flavors: ['чёрный чай'] });
  const ice = tobacco('c', { flavors: ['ледяная мята'], cooling: true, twist: true });
  const ginger = tobacco('d', { flavors: ['имбирь'], twist: true });
  const noFlavors = tobacco('e', { name: 'Supernova', flavors: [] });

  assert.equal(draftMixName([]), '');
  assert.equal(draftMixName([strawberry]), 'Земляника');
  assert.equal(draftMixName([strawberry, tea]), 'Земляника и чёрный чай');
  assert.equal(draftMixName([strawberry, tea, ice]), 'Земляника и чёрный чай со льдом');
  assert.equal(draftMixName([strawberry, tea, ginger]), 'Земляника, чёрный чай и имбирь');
  assert.equal(draftMixName([noFlavors]), 'Supernova');
});

test('poolForTurn: акцент без основы, штрих только из twist', () => {
  const palette = [
    tobacco('a'),
    tobacco('b'),
    tobacco('ice', { twist: true, cooling: true }),
    tobacco('pepper', { twist: true }),
  ];
  assert.equal(poolForTurn(palette, 0, []).length, 4);
  assert.deepEqual(poolForTurn(palette, 1, ['a']).map((item) => item.id), ['b', 'ice', 'pepper']);
  assert.deepEqual(poolForTurn(palette, 2, ['a', 'pepper']).map((item) => item.id), ['ice']);
});

test('полки: профили в порядке каталога, мультивыбор по «или», пусто — «Все»', () => {
  const palette = [
    tobacco('a', { flavorProfiles: ['dessert'] }),
    tobacco('b', { flavorProfiles: ['berry', 'fresh'] }),
    tobacco('c', { flavorProfiles: ['citrus'] }),
  ];
  assert.deepEqual(shelvesOf(palette, ['berry', 'citrus', 'dessert', 'fresh']), ['berry', 'citrus', 'dessert', 'fresh']);
  assert.deepEqual(underShelves(palette, ['fresh', 'citrus']).map((item) => item.id), ['b', 'c']);
  assert.equal(underShelves(palette, []).length, 3);

  assert.deepEqual(initialShelves(palette, ['citrus', 'perfume']), ['citrus']);
  assert.deepEqual(initialShelves(palette, ['perfume']), []);
});

test('trustMaster дособирает оставшиеся ходы без повторов', () => {
  const palette = [
    tobacco('a', { flavorProfiles: ['berry'] }),
    tobacco('b', { flavorProfiles: ['dessert'] }),
    tobacco('c', { flavorProfiles: ['dessert'] }),
    tobacco('ice', { flavorProfiles: ['minty'], twist: true, cooling: true }),
  ];
  const fromStart = trustMaster(palette, affinity, [], () => 0);
  assert.equal(fromStart.length, 3);
  assert.equal(new Set(fromStart).size, 3);
  assert.equal(fromStart[2], 'ice');
  // Основа — не холодок: холодок идёт штрихом.
  assert.notEqual(fromStart[0], 'ice');

  const fromAccent = trustMaster(palette, affinity, ['a'], () => 0);
  assert.equal(fromAccent[0], 'a');
  assert.equal(fromAccent.length, 3);

  // Штриха в наличии нет — чаша из двух.
  const noTwist = trustMaster(palette.slice(0, 3), affinity, [], () => 0);
  assert.equal(noTwist.length, 2);
});
