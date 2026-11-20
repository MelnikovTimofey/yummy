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
  assert.equal(ingredientOf(['грибы', 'ром']), 'rum');
  assert.equal(ingredientOf(['чабрец', 'роза']), 'herbs');
  assert.equal(ingredientOf(['хвойный', 'вишня']), 'cherry');
});

test('pickMixPhoto: ничего не узнано или flavors пустые — null', () => {
  assert.equal(pickMixPhoto({ id: 'm', flavors: [] }), null);
  assert.equal(pickMixPhoto({ id: 'm', flavors: ['грибы', 'парфюм'] }), null);
});

// Пробелы на полке и в каталоге (аудит 2026-11-20): вкусы, которые узнаются
// фото уже существующего ингредиента.
test('pickMixPhoto: редкие вкусы на фото близкого ингредиента', () => {
  for (const flavor of ['брусника', 'облепиха', 'ирга', 'княженика', 'черёмуха', 'асаи']) assert.equal(ingredientOf([flavor]), 'forest-berries', flavor);
  for (const flavor of ['байкал', 'рутбир']) assert.equal(ingredientOf([flavor]), 'cola', flavor);
  for (const flavor of ['арахис', 'халва']) assert.equal(ingredientOf([flavor]), 'nuts', flavor);
  for (const flavor of ['мохито', 'эвкалипт']) assert.equal(ingredientOf([flavor]), 'mint', flavor);
  assert.equal(ingredientOf(['тирамису']), 'pastry');
  assert.equal(ingredientOf(['сгущёнка']), 'cream');
  assert.equal(ingredientOf(['лемонграсс']), 'herbs');
  assert.equal(ingredientOf(['анис']), 'cinnamon');
  assert.equal(ingredientOf(['кленовый']), 'honey');
  assert.equal(ingredientOf(['юдзу']), 'lemon');
  assert.equal(ingredientOf(['бергамот']), 'tea');
  assert.equal(ingredientOf(['бустер']), 'ice');
});

test('pickMixPhoto: «пина колада» во flavors — ананас, а не кола', () => {
  assert.equal(ingredientOf(['пина колада']), 'pineapple');
  assert.equal(ingredientOf(['кола']), 'cola');
  assert.equal(ingredientOf(['шоколад']), 'chocolate');
});

// flavors пустые у табаков с английскими названиями (Wildberry, Forest Mix):
// фото по категории, если она однозначно рисуется.
const byProfiles = (flavorProfiles: string[], flavors: string[] = [], name?: string) =>
  pickMixPhoto({ id: 'mix-1', name, flavors, flavorProfiles })?.ingredient ?? null;

test('pickMixPhoto: flavors пустые — фото по первой рисуемой категории', () => {
  assert.equal(byProfiles(['fruity', 'berry']), 'forest-berries');
  assert.equal(byProfiles(['citrus']), 'orange');
  assert.equal(byProfiles(['dessert']), 'pastry');
  assert.equal(byProfiles(['minty']), 'mint');
  assert.equal(byProfiles(['fruity', 'gastro', 'perfume', 'beverage']), null);
});

test('pickMixPhoto: категория не перебивает flavors и название', () => {
  assert.equal(byProfiles(['berry'], ['грибы']), null);
  assert.equal(byProfiles(['berry'], ['лимон']), 'lemon');
  assert.equal(byProfiles(['berry'], [], 'Арбузный рай'), 'watermelon');
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
  ['Bubble Fruit', ['бабл-гам', 'виноград', 'голубика', 'манго'], 'bubblegum'],
  ['Fresh Time', ['чабрец', 'вишня', 'манго', 'лимон'], 'cherry'],
];

for (const [name, flavors, expected] of SNAPSHOT) {
  test(`pickMixPhoto: снапшот — «${name}»`, () => assert.equal(ingredientOf(flavors, name), expected));
}

// Название (#610): гость читает «Кола с чёрной ванилью» и ждёт колу, даже если
// первым во flavors стоит грейпфрут из табака «Имперская кола».
const byName = (name: string, flavors: string[]) => pickMixPhoto({ id: 'mix-1', name, flavors })?.ingredient ?? null;

test('pickMixPhoto: яркий вкус из названия раньше flavors', () => {
  assert.equal(byName('Кола с чёрной ванилью', ['грейпфрут', 'кола', 'сандал', 'ваниль']), 'cola');
  assert.equal(byName('Морозная ягода', ['черника', 'мята']), 'forest-berries');
  assert.equal(byName('Кола-ваниль', ['кола', 'ваниль']), 'cola');
  assert.equal(byName('Шоколадный бриз', ['мята']), 'chocolate');
});

test('pickMixPhoto: в названии нет яркого вкуса — выбор по flavors, как раньше', () => {
  assert.equal(byName('Летний вечер', ['манго', 'лайм']), 'mango');
  assert.equal(byName('Холодный чай', ['лимон']), 'lemon');
  assert.equal(byName('Сигарный клуб', []), null);
});

test('pickMixPhoto: в названии вкус узнаётся только с начала слова', () => {
  assert.equal(byName('Отличный выбор', ['манго']), 'mango');
  assert.equal(byName('Пина колада', ['ананас', 'кокос']), 'pineapple');
  assert.equal(byName('Wildberry', ['черника']), 'blueberry');
});

// Случаи из выгрузки прода 2026-11-20: главное слово названия — существительное,
// прилагательное только уточняет; «лимонад» в названии — напиток, а не кола.
test('pickMixPhoto: в названии существительное раньше прилагательного', () => {
  assert.equal(byName('Медовая дыня', ['дыня']), 'melon');
  assert.equal(byName('Вишнёвая кола', ['кола', 'вишня']), 'cola');
  assert.equal(byName('Банановый сникерс', ['карамель', 'банан']), 'banana');
  assert.equal(byName('Тропический фреш с яркой ягодой', ['черная смородина', 'ананас']), 'forest-berries');
});

test('pickMixPhoto: «лимонад» в названии не делает фото колой', () => {
  assert.equal(byName('Лавандовый лимонад', ['лимон', 'лаванда']), 'lemon');
  assert.equal(byName('Инжирный лимонад с персиком', ['персик', 'инжир', 'лимон']), 'peach');
});

test('pickMixPhoto: «Байкальский» в названии — не газировка «Байкал»', () => {
  assert.equal(byName('Чабрец Байкальский', ['чабрец']), 'herbs');
  assert.equal(byName('Байкал с лимоном', ['байкал', 'лимон']), 'cola');
});

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

// Вторая партия фото (#622): ингредиенты, выбранные владельцем 2026-11-20.
test('pickMixPhoto: новые ингредиенты', () => {
  const cases: Array<[string, string]> = [
    ['кактус', 'cactus'], ['питахайя', 'dragonfruit'], ['слива', 'plum'], ['чернослив', 'plum'],
    ['попкорн', 'popcorn'], ['кукуруза', 'corn'], ['перец чили', 'chili'], ['томат', 'tomato'],
    ['огурец', 'cucumber'], ['инжир', 'fig'], ['финик', 'fig'], ['жвачка', 'bubblegum'], ['бабл-гам', 'bubblegum'],
    ['вино', 'wine'], ['шампанское', 'wine'], ['глинтвейн', 'wine'], ['сангрия', 'wine'],
    ['маргарита', 'cocktail'], ['апероль', 'cocktail'], ['куба либре', 'cocktail'], ['текила', 'cocktail'],
  ];
  for (const [flavor, expected] of cases) assert.equal(ingredientOf([flavor]), expected, flavor);
});

test('pickMixPhoto: новые слова не перехватывают старые', () => {
  assert.equal(ingredientOf(['виноград']), 'grape');
  assert.equal(ingredientOf(['сливочный']), 'cream');
  assert.equal(ingredientOf(['сливки']), 'cream');
  assert.equal(ingredientOf(['леденцы']), 'candy');
  assert.equal(byName('Виноградный сок', ['виноград']), 'grape');
  assert.equal(byName('Сливочная карамель', ['карамель']), 'caramel');
  assert.equal(byName('Сливовый джем', ['слива']), 'plum');
});

test('pickMixPhoto: вино и коктейль — база, фрукт важнее', () => {
  assert.equal(ingredientOf(['шампанское', 'клубника']), 'strawberry');
  assert.equal(ingredientOf(['маргарита', 'лайм']), 'lime');
  assert.equal(ingredientOf(['глинтвейн', 'холодок']), 'wine');
  assert.equal(byName('Шампанское', ['шампанское']), 'wine');
});
