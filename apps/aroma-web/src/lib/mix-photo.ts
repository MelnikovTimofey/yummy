// Фото вкуса микса (#592): одно на все места — строка, герой Подбора, постер Витрины,
// шапка листа, фон рилса. Выбор по flavors, как сцена рилса (reel-scene.ts), но независимо
// от неё: у Pineapple Mint фото ананаса, а мяту передают снежинки сцены.
//
// Правило: первый по порядку flavors яркий вкус (фрукт, ягода, десерт, специя, кола,
// конфеты, мята); нет ярких — первая база (сливки, чай, лёд, табак, ром, травы, цветы,
// хвоя); ничего не узнано — null, на месте фото остаётся ProfileGlyph.

export type MixPhotoSize = '132' | 'poster' | 'sheet' | 'reel';
export type MixPhoto = { ingredient: string; variant: number };

type Ingredient = { id: string; words: string[]; variants: number; base?: true };

// Совпадение по подстроке в нижнем регистре, «ё» читается как «е». Порядок важен,
// когда во вкусе узнаётся больше одного слова: «шоколад» содержит «кола», «лимонный
// пирог» — и лимон, и выпечку, «медовая дыня» — и мёд, и дыню; побеждает строка выше.
// variants — сколько фото у ингредиента в public/photos; список источников —
// photos/sources.json.
export const INGREDIENTS: Ingredient[] = [
  { id: 'chocolate', words: ['шоколад', 'какао'], variants: 1 },
  { id: 'cola', words: ['кола', 'газиров', 'лимонад', 'энергетик'], variants: 1 },
  { id: 'mint', words: ['мят', 'ментол'], variants: 3 },
  { id: 'lemon', words: ['лимон'], variants: 2 },
  { id: 'lime', words: ['лайм'], variants: 1 },
  { id: 'grapefruit', words: ['грейпфрут', 'помело'], variants: 1 },
  { id: 'orange', words: ['апельсин', 'мандарин', 'цитрус', 'клементин'], variants: 1 },
  { id: 'strawberry', words: ['клубник', 'земляник'], variants: 3 },
  { id: 'raspberry', words: ['малин'], variants: 1 },
  { id: 'blueberry', words: ['черник', 'голубик'], variants: 1 },
  { id: 'cherry', words: ['вишн', 'черешн'], variants: 2 },
  { id: 'grape', words: ['виноград'], variants: 2 },
  { id: 'currant', words: ['смородин'], variants: 1 },
  { id: 'forest-berries', words: ['ягод', 'ежевик', 'клюкв', 'барбарис', 'крыжовник'], variants: 1 },
  { id: 'mango', words: ['манго'], variants: 2 },
  { id: 'pineapple', words: ['ананас'], variants: 1 },
  { id: 'passionfruit', words: ['маракуй', 'гуав', 'папай'], variants: 1 },
  { id: 'peach', words: ['персик', 'абрикос', 'нектарин'], variants: 1 },
  { id: 'melon', words: ['дын'], variants: 1 },
  { id: 'watermelon', words: ['арбуз'], variants: 1 },
  { id: 'apple', words: ['яблок'], variants: 1 },
  { id: 'pear', words: ['груш'], variants: 1 },
  { id: 'banana', words: ['банан'], variants: 1 },
  { id: 'kiwi', words: ['киви', 'фейхоа'], variants: 1 },
  { id: 'coconut', words: ['кокос'], variants: 1 },
  { id: 'lychee', words: ['личи'], variants: 1 },
  { id: 'pomegranate', words: ['гранат'], variants: 1 },
  { id: 'vanilla', words: ['ванил'], variants: 1 },
  { id: 'caramel', words: ['карамел', 'ирис'], variants: 1 },
  { id: 'coffee', words: ['кофе'], variants: 1 },
  { id: 'nuts', words: ['орех', 'фисташ', 'миндал', 'фундук'], variants: 1 },
  { id: 'honey', words: ['мед'], variants: 1 },
  { id: 'cinnamon', words: ['кориц', 'специ', 'кардамон', 'имбир', 'бадьян', 'гвоздик'], variants: 1 },
  { id: 'candy', words: ['жвачк', 'бабл', 'леденц', 'мармелад', 'конфет'], variants: 1 },
  { id: 'pastry', words: ['печень', 'пирог', 'кекс', 'вафл', 'чизкейк', 'булочк', 'торт', 'круассан'], variants: 1 },
  { id: 'cream', words: ['сливоч', 'сливк', 'молок', 'молоч', 'морожен', 'йогурт', 'бейлис'], variants: 2, base: true },
  { id: 'tea', words: ['чай'], variants: 1, base: true },
  { id: 'ice', words: ['холод', 'лед', 'ледян', 'морозн'], variants: 1, base: true },
  { id: 'tobacco', words: ['табак', 'табачн', 'сигар'], variants: 1, base: true },
  { id: 'flowers', words: ['цветоч', 'роза', 'розов', 'жасмин', 'лаванд', 'бузин', 'фиалк', 'ромашк'], variants: 1, base: true },
  { id: 'herbs', words: ['базилик', 'тархун', 'травян', 'чабрец', 'розмарин', 'шалфей'], variants: 1, base: true },
  { id: 'pine', words: ['хвой', 'можжевел', 'сосн', 'кедр'], variants: 1, base: true },
  // Ром последним: «ром» сидит внутри «ромашки».
  { id: 'rum', words: ['ром', 'коньяк', 'виски', 'джин'], variants: 1, base: true },
];

const normalize = (flavor: string) => flavor.toLowerCase().replaceAll('ё', 'е');

const matchIn = (flavor: string, pool: Ingredient[]) => pool.find((item) => item.words.some((word) => flavor.includes(word)));

// Яркий вкус не должен уступить базе из-за подстроки внутри своего слова:
// «молочный шоколад» — шоколад, «ромашка» — цветы, а не ром.
const firstMatch = (flavors: string[], pool: Ingredient[]) => {
  for (const flavor of flavors) {
    const own = matchIn(flavor, INGREDIENTS);
    if (own && pool.includes(own)) return own;
  }
  return null;
};

const VIVID = INGREDIENTS.filter((item) => !item.base);
const BASE = INGREDIENTS.filter((item) => item.base);

// FNV-1a: стабильный вариант фото для микса, чтобы в одной ленте два клубничных
// микса не получили одно и то же фото.
const hash = (value: string) => {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return result;
};

export function pickMixPhoto(mix: { id: string; flavors: string[] }): MixPhoto | null {
  const flavors = mix.flavors.map(normalize);
  const ingredient = firstMatch(flavors, VIVID) ?? firstMatch(flavors, BASE);
  if (!ingredient) return null;
  return { ingredient: ingredient.id, variant: (hash(mix.id) % ingredient.variants) + 1 };
}

export const mixPhotoSrc = (photo: MixPhoto, size: MixPhotoSize) => `/photos/${photo.ingredient}-${photo.variant}-${size}.webp`;
