import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INGREDIENTS, mixPhotoSrc, pickMixPhoto } from './mix-photo';

const ingredientOf = (flavors: string[], id = 'mix-1') => pickMixPhoto({ id, flavors })?.ingredient ?? null;

test('pickMixPhoto: первый яркий вкус по порядку flavors', () => {
  assert.equal(ingredientOf(['ананас', 'мята']), 'pineapple');
  assert.equal(ingredientOf(['мята', 'ананас']), 'mint');
  assert.equal(ingredientOf(['корица', 'чёрный чай']), 'cinnamon');
});

test('pickMixPhoto: яркий вкус побеждает базу, даже если база раньше', () => {
  assert.equal(ingredientOf(['молоко', 'черника']), 'blueberry');
  assert.equal(ingredientOf(['чай', 'холодок', 'лимон']), 'lemon');
  assert.equal(ingredientOf(['табачный', 'банан']), 'banana');
});

test('pickMixPhoto: нет ярких — первая база', () => {
  assert.equal(ingredientOf(['чай', 'холодок']), 'tea');
  assert.equal(ingredientOf(['холодок', 'сливочный']), 'ice');
  assert.equal(ingredientOf(['сигара', 'ром']), 'tobacco');
  assert.equal(ingredientOf(['кактус', 'ром']), 'rum');
  assert.equal(ingredientOf(['чабрец', 'роза']), 'herbs');
  assert.equal(ingredientOf(['хвойный', 'вишня']), 'cherry');
});

test('pickMixPhoto: ничего не узнано или flavors пустые — null', () => {
  assert.equal(pickMixPhoto({ id: 'm', flavors: [] }), null);
  assert.equal(pickMixPhoto({ id: 'm', flavors: ['кактус', 'юдзу', 'бергамот'] }), null);
});

test('pickMixPhoto: синонимы и регистр', () => {
  assert.equal(ingredientOf(['Земляника']), 'strawberry');
  assert.equal(ingredientOf(['голубика']), 'blueberry');
  assert.equal(ingredientOf(['мандарин']), 'orange');
  assert.equal(ingredientOf(['энергетик']), 'cola');
  assert.equal(ingredientOf(['ЛЁД']), 'ice');
  assert.equal(ingredientOf(['мёд']), 'honey');
});

test('pickMixPhoto: подстрока не путает похожие слова', () => {
  assert.equal(ingredientOf(['шоколад']), 'chocolate');
  assert.equal(ingredientOf(['молочный шоколад']), 'chocolate');
  assert.equal(ingredientOf(['ромашка']), 'flowers');
  assert.equal(ingredientOf(['медовая дыня']), 'melon');
  assert.equal(ingredientOf(['лимонный пирог']), 'lemon');
});

test('pickMixPhoto: вариант частого ингредиента стабилен и различается между миксами', () => {
  const ids = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const variants = ids.map((id) => pickMixPhoto({ id, flavors: ['клубника'] })!.variant);
  assert.deepEqual(variants, ids.map((id) => pickMixPhoto({ id, flavors: ['клубника'] })!.variant));
  assert.ok(new Set(variants).size >= 2, `варианты: ${variants.join(', ')}`);
  const max = INGREDIENTS.find((item) => item.id === 'strawberry')!.variants;
  for (const variant of variants) assert.ok(variant >= 1 && variant <= max);
});

test('pickMixPhoto: у ингредиента с одним фото вариант всегда 1', () => {
  for (const id of ['a', 'b', 'c', 'd']) assert.equal(pickMixPhoto({ id, flavors: ['кокос'] })?.variant, 1);
});

// Миксы продуктового снапшота atelier_card (2026-11-18), все 15.
const SNAPSHOT: Array<[string, string[], string]> = [
  ['Морозная ягода', ['земляника', 'лесные ягоды', 'чёрный чай'], 'strawberry'],
  ['Космокола', ['кола', 'цветочный'], 'cola'],
  ['Тропики', ['банан', 'манго', 'йогурт'], 'banana'],
  ['Lemon Pineapple', ['лимон', 'ананас'], 'lemon'],
  ['Pirate Citrus', ['апельсин', 'мандарин', 'ром-пунш'], 'orange'],
  ['Cinnamon Red Tea', ['корица', 'чёрный чай'], 'cinnamon'],
  ['Melon Cola', ['дыня', 'кола'], 'melon'],
  ['Pineapple Mint', ['ананас', 'мята'], 'pineapple'],
  ['Молоко-Банан', ['молоко', 'банан'], 'banana'],
  ['Молоко-Черника', ['молоко', 'черника'], 'blueberry'],
  ['Лимонный пирог', ['лимонный пирог', 'молоко'], 'lemon'],
  ['Citrus Brazillian Rum', ['цитрусы', 'чай', 'ром'], 'orange'],
  ['Cookies Bramble Cinnamon', ['печенье', 'ежевика', 'корица'], 'pastry'],
  ['Bubble Fruit', ['бабл-гам', 'виноград', 'голубика', 'манго'], 'candy'],
  ['Fresh Time', ['чабрец', 'вишня', 'манго', 'лимон'], 'cherry'],
];

for (const [name, flavors, expected] of SNAPSHOT) {
  test(`pickMixPhoto: снапшот — «${name}»`, () => assert.equal(ingredientOf(flavors, name), expected));
}

test('mixPhotoSrc: путь к нарезанному файлу', () => {
  assert.equal(mixPhotoSrc({ ingredient: 'mango', variant: 2 }, '132'), '/photos/mango-2-132.webp');
  assert.equal(mixPhotoSrc({ ingredient: 'ice', variant: 1 }, 'reel'), '/photos/ice-1-reel.webp');
});

test('словарь и photos/sources.json совпадают: у каждого варианта есть источник', () => {
  const sources: Array<{ ingredient: string; variant: number }> = JSON.parse(
    readFileSync(new URL('../../photos/sources.json', import.meta.url), 'utf8'),
  );
  const expected = INGREDIENTS.flatMap((item) => Array.from({ length: item.variants }, (_, index) => `${item.id}-${index + 1}`)).sort();
  assert.deepEqual(sources.map((source) => `${source.ingredient}-${source.variant}`).sort(), expected);
});
