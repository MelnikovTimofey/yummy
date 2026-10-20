import test from 'node:test';
import assert from 'node:assert/strict';
import { pickScene } from './reel-scene';

// Фикстуры — flavors и flavorProfiles миксов витрины прода 2026-10-15
// (design/design_handoff_showcase_compact/showcase-data.js).
const MIXES = {
  // RULE_EXAMPLES доски design/design_handoff_reels (screens/rule.png)
  'Морозная ягода': { flavors: ['чай', 'холодок'], flavorProfiles: ['floral_herbal', 'spicy', 'berry', 'fruity', 'fresh', 'minty'] },
  'Ледяное яблоко с клюквой': { flavors: ['мята', 'яблоко', 'клюква'], flavorProfiles: ['fresh', 'fruity', 'minty', 'berry'] },
  'Френч-коктейль': {
    flavors: ['лаванда', 'лимонад', 'джин', 'можжевельник', 'лимон', 'холодок'],
    flavorProfiles: ['floral_herbal', 'citrus', 'fruity', 'sour', 'spicy', 'fresh', 'minty'],
  },
  'Сычуаньская ёлка': { flavors: ['базилик', 'перец', 'хвойный', 'холодок'], flavorProfiles: ['floral_herbal', 'spicy', 'fresh', 'minty'] },
  'Тропики': { flavors: ['банан', 'манго'], flavorProfiles: ['fruity'] },
  'Вишня, шоколад и кашмир': {
    flavors: ['мята', 'шоколад', 'вишня', 'кашмир'],
    flavorProfiles: ['dessert', 'fresh', 'minty', 'sweet', 'fruity', 'spicy'],
  },
  'Банан на сигарной базе': { flavors: ['банан', 'чай', 'сигара', 'табачный'], flavorProfiles: ['fruity', 'floral_herbal', 'spicy', 'tobacco'] },
  'Бергамот и индийское лето': { flavors: ['бергамот'], flavorProfiles: ['citrus', 'fruity', 'sour'] },
  // SCENE_EXAMPLES доски (screens/scenes.png), кроме «Ледяного яблока» — оно выше
  'Цветочный коктейль': { flavors: ['маргарита', 'цветочный'], flavorProfiles: ['berry', 'floral_herbal', 'fruity'] },
  'Цитрусовый баланс': { flavors: ['апельсин', 'лайм', 'лимон'], flavorProfiles: ['citrus', 'fruity', 'sour'] },
  'Ягодная классика': { flavors: ['клубника', 'ревень', 'красная смородина', 'черная смородина'], flavorProfiles: ['berry', 'fruity'] },
  'Белый чай с кедровым орехом': { flavors: ['чай', 'орех', 'кардамон', 'ваниль'], flavorProfiles: ['floral_herbal', 'dessert', 'sweet', 'spicy'] },
  'Томат с перцем': { flavors: ['томат', 'перец', 'табачный'], flavorProfiles: ['spicy', 'tobacco'] },
};

const RULE_EXAMPLES = [
  ['Морозная ягода', { primary: 'frost', secondary: 'bloom', c1: 'minty', c2: 'floral_herbal' }],
  ['Ледяное яблоко с клюквой', { primary: 'frost', secondary: 'juicy', c1: 'minty', c2: 'fruity' }],
  ['Френч-коктейль', { primary: 'frost', secondary: 'bloom', c1: 'minty', c2: 'floral_herbal' }],
  ['Сычуаньская ёлка', { primary: 'frost', secondary: 'bloom', c1: 'minty', c2: 'floral_herbal' }],
  ['Тропики', { primary: 'juicy', secondary: null, c1: 'fruity', c2: 'fruity' }],
  ['Вишня, шоколад и кашмир', { primary: 'frost', secondary: 'warm', c1: 'minty', c2: 'spicy' }],
  ['Банан на сигарной базе', { primary: 'smoke', secondary: 'juicy', c1: 'tobacco', c2: 'fruity' }],
  ['Бергамот и индийское лето', { primary: 'juicy', secondary: null, c1: 'citrus', c2: 'fruity' }],
] as const;

const SCENE_EXAMPLES = [
  ['Ледяное яблоко с клюквой', { primary: 'frost', secondary: 'juicy', c1: 'minty', c2: 'fruity' }],
  ['Цветочный коктейль', { primary: 'bloom', secondary: null, c1: 'floral_herbal', c2: 'perfume' }],
  ['Цитрусовый баланс', { primary: 'juicy', secondary: null, c1: 'citrus', c2: 'fruity' }],
  ['Ягодная классика', { primary: 'berry', secondary: null, c1: 'berry', c2: 'fruity' }],
  ['Белый чай с кедровым орехом', { primary: 'warm', secondary: 'bloom', c1: 'dessert', c2: 'floral_herbal' }],
  ['Томат с перцем', { primary: 'smoke', secondary: 'warm', c1: 'tobacco', c2: 'spicy' }],
] as const;

for (const [name, expected] of RULE_EXAMPLES) {
  test(`pickScene: таблица доски — «${name}»`, () => {
    assert.deepEqual(pickScene(MIXES[name]), expected);
  });
}

for (const [name, expected] of SCENE_EXAMPLES) {
  test(`pickScene: пример сцены ${expected.primary} — «${name}»`, () => {
    assert.deepEqual(pickScene(MIXES[name]), expected);
  });
}

test('pickScene: при равном числе вкусов побеждает мотив, чей вкус раньше в списке', () => {
  assert.equal(pickScene({ flavors: ['вишня', 'лимон'], flavorProfiles: [] }).primary, 'berry');
  assert.equal(pickScene({ flavors: ['лимон', 'вишня'], flavorProfiles: [] }).primary, 'juicy');
});

test('pickScene: Холод перебивает мотив с бо́льшим числом вкусов', () => {
  const scene = pickScene({ flavors: ['вишня', 'малина', 'клубника', 'мята'], flavorProfiles: ['berry'] });
  assert.equal(scene.primary, 'frost');
  assert.equal(scene.secondary, 'berry');
});

test('pickScene: «Тепло» — «Пряный», если пряностей не меньше половины, иначе «Десертный»', () => {
  assert.equal(pickScene({ flavors: ['корица', 'ваниль'], flavorProfiles: [] }).c1, 'spicy');
  assert.equal(pickScene({ flavors: ['корица', 'ваниль', 'шоколад'], flavorProfiles: [] }).c1, 'dessert');
});

// Ни один вкус не узнан — отдельная общая сцена (решение владельца 2026-10-20):
// мотив вкуса по одному профилю не угадываем, цвет — первого профиля.
test('pickScene: неузнанные вкусы — общая сцена в цвете первого профиля', () => {
  assert.deepEqual(pickScene({ flavors: ['маргарита'], flavorProfiles: ['berry', 'minty'] }), {
    primary: 'general',
    secondary: null,
    c1: 'berry',
    c2: 'berry',
  });
  assert.equal(pickScene({ flavors: [], flavorProfiles: ['fresh'] }).primary, 'general');
  assert.equal(pickScene({ flavors: ['маргарита'], flavorProfiles: ['tobacco'] }).primary, 'general');
});

test('pickScene: неузнанный вкус рядом с узнанным не мешает', () => {
  assert.deepEqual(pickScene({ flavors: ['маргарита', 'малина'], flavorProfiles: ['minty'] }), {
    primary: 'berry',
    secondary: null,
    c1: 'berry',
    c2: 'fruity',
  });
});

test('pickScene: нет ни вкусов, ни профилей — общая сцена в запасном цвете', () => {
  assert.deepEqual(pickScene({ flavors: [], flavorProfiles: [] }), {
    primary: 'general',
    secondary: null,
    c1: '',
    c2: '',
  });
});

test('pickScene: регистр вкуса не важен', () => {
  assert.equal(pickScene({ flavors: ['Холодок'], flavorProfiles: [] }).primary, 'frost');
});
