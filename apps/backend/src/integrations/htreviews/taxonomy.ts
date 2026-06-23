import type { NomadTaxonomyCandidate } from './types';

const FRUITY_TAGS = new Set([
  'абрикос',
  'алоэ',
  'айва',
  'ананас',
  'арбуз',
  'банан',
  'виноград',
  'вишня',
  'гранат',
  'груша',
  'гуава',
  'гуанабана',
  'дыня',
  'двойное яблоко',
  'дуриан',
  'джекфрут',
  'инжир',
  'кактус',
  'кивано',
  'киви',
  'кокос',
  'кумкват',
  'личи',
  'лонган',
  'манго',
  'мандарин',
  'маракуйя',
  'марула',
  'нектарин',
  'облепиха',
  'папайя',
  'персик',
  'питахайя',
  'ревень',
  'слива',
  'тамаринд',
  'фейхоа',
  'финик',
  'фрукты',
  'хурма',
  'яблоко',
  'юдзу',
]);

const BERRY_TAGS = new Set([
  'барбарис',
  'брусника',
  'бузина',
  'голубика',
  'ежевика',
  'земляника',
  'ирга',
  'кизил',
  'клубника',
  'клюква',
  'княженика',
  'красная смородина',
  'крыжовник',
  'малина',
  'морошка',
  'смородина',
  'черная смородина',
  'черника',
  'черешня',
  'ягоды',
]);

const CITRUS_TAGS = new Set([
  'апельсин',
  'бергамот',
  'грейпфрут',
  'лайм',
  'лимон',
  'помело',
  'цитрус',
  'юдзу',
]);

const MINTY_TAGS = new Set(['мята', 'ментол', 'холодок', 'эвкалипт']);

const FLORAL_HERBAL_TAGS = new Set([
  'базилик',
  'древесный',
  'жасмин',
  'зеленый чай',
  'кипарис',
  'клевер',
  'лаванда',
  'лемонграсс',
  'лотос',
  'мелисса',
  'можжевельник',
  'роза',
  'ромашка',
  'розмарин',
  'сакура',
  'сандал',
  'тархун',
  'травяной',
  'цветочный',
  'чай',
  'черный чай',
  'чабрец',
  'шалфей',
  'хвойный',
]);

const DESSERT_TAGS = new Set([
  'арахис',
  'булочка',
  'ваниль',
  'вафли',
  'выпечка',
  'десерт',
  'зефир',
  'жвачка',
  'ириска',
  'йогурт',
  'какао',
  'карамель',
  'кекс',
  'кленовый',
  'конфетный',
  'кунжут',
  'леденцы',
  'мармелад',
  'мед',
  'миндаль',
  'молоко',
  'мороженое',
  'нуга',
  'овсянка',
  'орех',
  'печенье',
  'пирог',
  'попкорн',
  'пончик',
  'пряник',
  'сгущенка',
  'сливочный',
  'тирамису',
  'фисташки',
  'чизкейк',
  'шоколад',
]);

const SPICY_TAGS = new Set([
  'анис',
  'гвоздика',
  'имбирь',
  'кардамон',
  'карри',
  'кашмир',
  'корица',
  'перец',
  'пряности',
  'специи',
  'шафран',
]);

const TOBACCO_TAGS = new Set(['табачный', 'сигара']);
const PERFUME_TAGS = new Set(['парфюм']);

const BEVERAGE_TAGS = new Set([
  'алкоголь',
  'апероль',
  'байкал',
  'бейлис',
  'вино',
  'виски',
  'водка',
  'газировка',
  'глинтвейн',
  'гуарана',
  'дайкири',
  'джин',
  'квас',
  'кофе',
  'кола',
  'коньяк',
  'космополитен',
  'куба либре',
  'лимонад',
  'лимончелло',
  'маргарита',
  'мастика',
  'мохито',
  'пиво',
  'пина колада',
  'портвейн',
  'ром',
  'рутбир',
  'самбука',
  'сангрия',
  'сидр',
  'текила',
  'тоник',
  'чай',
  'черный чай',
  'шампанское',
  'энергетик',
]);

const RARE_TAGS = new Set([
  'бекон',
  'гастрономия',
  'грибы',
  'курица',
  'кукуруза',
  'морковь',
  'мясо',
  'огурец',
  'рис',
  'сыр',
  'томат',
  'тыква',
  'чеснок',
]);

const PROFILE_ONLY_TAGS = new Set([
  'алкоголь',
  'газировка',
  'десерт',
  'конфетный',
  'парфюм',
  'специи',
  'табачный',
  'травяной',
  'фрукты',
  'цветочный',
  'цитрус',
  'ягоды',
]);

// Подмножество PROFILE_ONLY_TAGS — зонтичные категорийные теги htreviews.
// В fallback'е вкусов (issue #118) их не используем: как «вкус» они звучат
// грубо и лишь дублируют уже проставленную категорию.
const UMBRELLA_PROFILE_TAGS = new Set(['фрукты', 'ягоды', 'цитрус', 'десерт']);

const normalizeTag = (value: string) => value.toLowerCase().replace(/ё/g, 'е').trim();

const includesTag = (tag: string, collection: Set<string>) => collection.has(tag);

export const buildNomadTaxonomyCandidate = (rawTags: string[]): NomadTaxonomyCandidate => {
  const normalizedTags = Array.from(new Set(rawTags.map(normalizeTag).filter(Boolean)));
  const flavorProfiles = new Set<string>();
  const flavorTags = new Set<string>();
  const matchedSourceTags = new Set<string>();

  for (const tag of normalizedTags) {
    if (includesTag(tag, FRUITY_TAGS) || includesTag(tag, CITRUS_TAGS) || includesTag(tag, BERRY_TAGS)) {
      flavorProfiles.add('fruity');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, BERRY_TAGS)) {
      flavorProfiles.add('berry');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, CITRUS_TAGS)) {
      flavorProfiles.add('citrus');
      flavorProfiles.add('sour');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, MINTY_TAGS)) {
      flavorProfiles.add('minty');
      flavorProfiles.add('fresh');
      flavorTags.add('охлаждающий');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, DESSERT_TAGS)) {
      flavorProfiles.add('dessert');
      flavorProfiles.add('sweet');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, SPICY_TAGS)) {
      flavorProfiles.add('spicy');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, FLORAL_HERBAL_TAGS)) {
      flavorProfiles.add('floral_herbal');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, TOBACCO_TAGS)) {
      flavorProfiles.add('tobacco');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, PERFUME_TAGS)) {
      flavorProfiles.add('perfume');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, BEVERAGE_TAGS)) {
      flavorTags.add('напитки');
      matchedSourceTags.add(tag);
    }

    if (includesTag(tag, RARE_TAGS)) {
      flavorTags.add('редкие');
      matchedSourceTags.add(tag);
    }
  }

  const flavors = normalizedTags.filter((tag) => !PROFILE_ONLY_TAGS.has(tag));
  // Issue #118: если после фильтра не осталось ни одного вкуса (все теги —
  // profile-only), отдаём осмысленные profile-only теги (табачный, специи,
  // цветочный, парфюм, алкоголь, газировка, конфетный, травяной) как вкусы,
  // чтобы табак не оставался «недозаполненным». Зонтичные категорийные теги
  // (фрукты/ягоды/цитрус/десерт) во вкусы не возвращаем — они лишь дублируют
  // категорию. Табаки только с зонтичными тегами (или вовсе без тегов)
  // остаются без вкусов — это допустимо и обрабатывается в UI мастера.
  const flavorsWithFallback = flavors.length
    ? flavors
    : normalizedTags.filter((tag) => !UMBRELLA_PROFILE_TAGS.has(tag));
  const unmappedSourceTags = normalizedTags.filter((tag) => !matchedSourceTags.has(tag));

  return {
    flavorProfiles: Array.from(flavorProfiles).sort(),
    flavors: Array.from(new Set(flavorsWithFallback)).sort(),
    flavorTags: Array.from(flavorTags).sort(),
    unmappedSourceTags: Array.from(new Set(unmappedSourceTags)).sort(),
  };
};
