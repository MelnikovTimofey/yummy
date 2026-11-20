// Фото вкуса микса (#592): одно на все места — строка, герой Подбора, постер Витрины,
// шапка листа, фон рилса; тем же правилом — фото табака на карте Миксера (#611).
// Выбор по названию и flavors, как сцена рилса (reel-scene.ts), но независимо от неё:
// у Pineapple Mint фото ананаса, а мяту передают снежинки сцены.
//
// Правило: первый яркий вкус (фрукт, ягода, десерт, специя, кола, конфеты, мята) в
// названии (#610), затем первый по порядку flavors; нет ярких — первая база во flavors
// (сливки, чай, лёд, табак, травы, цветы, хвоя, вино, коктейль, пиво, благовония, парфюм, ром); flavors пустые — первая рисуемая
// категория (#615); ничего не узнано — null, на месте фото остаётся ProfileGlyph.

export type MixPhotoSize = '132' | 'sheet' | 'reel';
export type MixPhoto = { ingredient: string; variant: number };

type Ingredient = { id: string; words: string[]; variants: number; base?: true };

// Совпадение по подстроке в нижнем регистре, «ё» читается как «е». Порядок важен,
// когда во вкусе узнаётся больше одного слова: «шоколад» содержит «кола» и «колад»,
// «пина колада» — «кола», «лимонный
// пирог» — и лимон, и выпечку, «медовая дыня» — и мёд, и дыню; побеждает строка выше.
// variants — сколько фото у ингредиента в public/photos; список источников —
// photos/sources.json.
export const INGREDIENTS: Ingredient[] = [
  { id: 'chocolate', words: ['шоколад', 'какао'], variants: 1 },
  // Ананас выше колы: «Пина колада» и в названии, и во flavors — ананас.
  { id: 'pineapple', words: ['ананас', 'колад'], variants: 2 },
  { id: 'cola', words: ['кола', 'газиров', 'лимонад', 'энергетик', 'байкал', 'рутбир'], variants: 2 },
  { id: 'mint', words: ['мят', 'ментол', 'мохито', 'эвкалипт'], variants: 3 },
  { id: 'lemon', words: ['лимон', 'юдзу'], variants: 2 },
  { id: 'lime', words: ['лайм'], variants: 1 },
  { id: 'grapefruit', words: ['грейпфрут', 'помело'], variants: 1 },
  { id: 'orange', words: ['апельсин', 'мандарин', 'цитрус', 'клементин'], variants: 2 },
  { id: 'strawberry', words: ['клубник', 'земляник'], variants: 3 },
  { id: 'raspberry', words: ['малин'], variants: 1 },
  { id: 'blueberry', words: ['черник', 'голубик'], variants: 1 },
  { id: 'cherry', words: ['вишн', 'черешн'], variants: 2 },
  { id: 'grape', words: ['виноград'], variants: 2 },
  { id: 'currant', words: ['смородин'], variants: 1 },
  { id: 'forest-berries', words: ['ягод', 'ежевик', 'клюкв', 'барбарис', 'крыжовник', 'брусник', 'облепих', 'ирг', 'княженик', 'черемух', 'асаи'], variants: 3 },
  { id: 'mango', words: ['манго'], variants: 2 },
  { id: 'passionfruit', words: ['маракуй', 'гуав', 'папай'], variants: 1 },
  { id: 'peach', words: ['персик', 'абрикос', 'нектарин'], variants: 2 },
  { id: 'melon', words: ['дын'], variants: 1 },
  { id: 'watermelon', words: ['арбуз'], variants: 2 },
  { id: 'apple', words: ['яблок'], variants: 1 },
  { id: 'pear', words: ['груш'], variants: 1 },
  { id: 'banana', words: ['банан'], variants: 1 },
  { id: 'kiwi', words: ['киви', 'фейхоа'], variants: 1 },
  { id: 'coconut', words: ['кокос'], variants: 1 },
  { id: 'lychee', words: ['личи'], variants: 1 },
  { id: 'pomegranate', words: ['гранат'], variants: 1 },
  { id: 'fig', words: ['инжир', 'финик'], variants: 2 },
  { id: 'dragonfruit', words: ['питахай', 'питай', 'драгонфрут'], variants: 1 },
  { id: 'cactus', words: ['кактус', 'опунци'], variants: 2 },
  { id: 'popcorn', words: ['попкорн'], variants: 1 },
  { id: 'corn', words: ['кукуруз'], variants: 1 },
  { id: 'tomato', words: ['томат', 'помидор'], variants: 2 },
  { id: 'cucumber', words: ['огур'], variants: 1 },
  { id: 'chili', words: ['перец', 'перц', 'чили', 'халапень'], variants: 2 },
  { id: 'mushroom', words: ['гриб', 'шампиньон', 'трюфел'], variants: 2 },
  { id: 'vanilla', words: ['ванил'], variants: 1 },
  { id: 'caramel', words: ['карамел', 'ирис'], variants: 1 },
  { id: 'coffee', words: ['кофе'], variants: 1 },
  { id: 'nuts', words: ['орех', 'фисташ', 'миндал', 'фундук', 'арахис', 'халв'], variants: 1 },
  { id: 'honey', words: ['мед', 'кленов'], variants: 1 },
  { id: 'cinnamon', words: ['кориц', 'специ', 'кардамон', 'имбир', 'бадьян', 'гвоздик', 'анис'], variants: 1 },
  { id: 'bubblegum', words: ['жвачк', 'бабл'], variants: 1 },
  { id: 'candy', words: ['леденц', 'мармелад', 'конфет'], variants: 1 },
  { id: 'pastry', words: ['печень', 'пирог', 'кекс', 'вафл', 'чизкейк', 'булочк', 'торт', 'круассан', 'тирамису'], variants: 1 },
  { id: 'cream', words: ['сливоч', 'сливк', 'молок', 'молоч', 'морожен', 'йогурт', 'бейлис', 'сгущ'], variants: 2, base: true },
  // Слива ниже сливок: «слив» сидит внутри «сливочного» и «сливок».
  { id: 'plum', words: ['слив', 'алыч'], variants: 2 },
  { id: 'tea', words: ['чай', 'бергамот'], variants: 1, base: true },
  { id: 'ice', words: ['холод', 'лед', 'ледян', 'морозн', 'бустер'], variants: 1, base: true },
  { id: 'tobacco', words: ['табак', 'табачн', 'сигар'], variants: 2, base: true },
  { id: 'flowers', words: ['цветоч', 'роза', 'розов', 'жасмин', 'лаванд', 'бузин', 'фиалк', 'ромашк'], variants: 1, base: true },
  { id: 'herbs', words: ['базилик', 'тархун', 'травян', 'чабрец', 'розмарин', 'шалфей', 'лемонграсс'], variants: 1, base: true },
  { id: 'pine', words: ['хвой', 'можжевел', 'сосн', 'кедр'], variants: 1, base: true },
  // Напитки — база: «шампанское, клубника» — клубника. Вино ниже винограда: «виноград»
  // начинается с «вино».
  { id: 'wine', words: ['вино', 'винн', 'шампан', 'глинтвейн', 'сангри', 'просекко'], variants: 5, base: true },
  {
    id: 'cocktail',
    words: ['коктейл', 'маргарит', 'апероль', 'спритц', 'куба либре', 'текил', 'абсент', 'водк', 'космопол', 'амаретт', 'мартини', 'негрони', 'алкогол'],
    variants: 3,
    base: true,
  },
  { id: 'beer', words: ['пиво', 'пивн', 'стаут', 'гиннес'], variants: 2, base: true },
  // Благовония — дымные и древесные ноты; парфюм — флакон: на явном парфюмерном вкусе дымок был бы странным.
  { id: 'incense', words: ['ладан', 'благовон', 'сандал', 'пачул', 'древесн'], variants: 1, base: true },
  { id: 'perfume', words: ['парфюм', 'духи', 'одеколон', 'кашмир', 'мускус', 'амбр'], variants: 2, base: true },
  // Ром последним: «ром» сидит внутри «ромашки».
  { id: 'rum', words: ['ром', 'коньяк', 'виски', 'джин'], variants: 1, base: true },
];

const normalize = (flavor: string) => flavor.toLowerCase().replace(/ё/g, 'е');

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

// В названии слово узнаётся только с начала: «Отличный» не личи. Из нескольких
// подходящих основ побеждает самая длинная: «колада» — «колад», а не «кола».
// База в названии не берётся: «Морозная ягода» — ягоды, «Холодный чай» — по flavors.
// Сначала существительные, потом прилагательные: «Медовая дыня» — дыня, «Вишнёвая
// кола» — кола. «Лимонад» в названии — напиток со вкусом, а не фото газировки;
// «Байкальский» — про озеро, а не про газировку «Байкал».
const ADJECTIVE = /(ая|яя|ый|ий|ой|ое|ее|ые|ие|ую|юю)$/;

const tokenMatch = (token: string) => {
  if (token.startsWith('лимонад') || token.startsWith('байкальск')) return null;
  let best: { item: Ingredient; length: number } | null = null;
  for (const item of INGREDIENTS) {
    for (const word of item.words) {
      if (token.startsWith(word) && word.length > (best?.length ?? 0)) best = { item, length: word.length };
    }
  }
  return best && !best.item.base ? best.item : null;
};

const nameMatch = (name: string) => {
  const tokens = normalize(name).split(/[^a-zа-я0-9]+/).filter(Boolean);
  const ordered = [...tokens.filter((token) => !ADJECTIVE.test(token)), ...tokens.filter((token) => ADJECTIVE.test(token))];
  for (const token of ordered) {
    const own = tokenMatch(token);
    if (own) return own;
  }
  return null;
};

// Категория — последний шанс, только когда flavors пустые (английские названия вроде
// Wildberry): неузнанный вкус вроде кактуса фото чужой категории не получает.
// «Фруктовый», «Напитки», «Гастро» и «Парфюмный» одним фото не рисуются.
const PROFILE_PHOTO: Record<string, string> = {
  berry: 'forest-berries',
  citrus: 'orange',
  dessert: 'pastry',
  minty: 'mint',
  spicy: 'cinnamon',
  tobacco: 'tobacco',
  floral_herbal: 'flowers',
};

const profileMatch = (profiles: string[]) => {
  const id = profiles.map((profile) => PROFILE_PHOTO[profile]).find(Boolean);
  return id ? INGREDIENTS.find((item) => item.id === id)! : null;
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

export function pickMixPhoto(mix: { id: string; name?: string; flavors: string[]; flavorProfiles?: string[] }): MixPhoto | null {
  const flavors = mix.flavors.map(normalize);
  const ingredient =
    (mix.name ? nameMatch(mix.name) : null) ??
    firstMatch(flavors, VIVID) ??
    firstMatch(flavors, BASE) ??
    (flavors.length ? null : profileMatch(mix.flavorProfiles ?? []));
  if (!ingredient) return null;
  return { ingredient: ingredient.id, variant: (hash(mix.id) % ingredient.variants) + 1 };
}

export const mixPhotoSrc = (photo: MixPhoto, size: MixPhotoSize) => `/photos/${photo.ingredient}-${photo.variant}-${size}.webp`;
