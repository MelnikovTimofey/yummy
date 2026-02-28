export type FlavorProfile =
  | 'sweet'
  | 'sour'
  | 'spicy'
  | 'fresh'
  | 'dessert'
  | 'tobacco'
  | 'minty'
  | 'fruity'
  | 'floral_herbal'
  | 'citrus'
  | 'berry'
  | 'perfume';

const normalize = (value: string) => value.toLowerCase().trim();

export const dedupe = <T>(items: T[]) => Array.from(new Set(items));

export const normalizeTextList = (items: string[]) =>
  dedupe(items.map((item) => normalize(item)).filter(Boolean));

const profileKeywords: Record<FlavorProfile, string[]> = {
  sweet: ['sweet', 'dessert', 'candy', 'cola', 'дыня', 'арбуз', 'манго', 'ананас', 'груша', 'яблок'],
  sour: ['sour', 'кисл'],
  spicy: ['spicy', 'spice', 'ginger', 'pepper', 'пряност', 'имбир', 'перец', 'кардамон', 'корица'],
  fresh: ['fresh', 'mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод', 'эвкалипт'],
  dessert: ['cream', 'milk', 'dessert', 'vanilla', 'coconut', 'сливк', 'молок', 'ваниль', 'кокос', 'печенье'],
  tobacco: ['tobacco', 'табак', 'cigar', 'сигар'],
  minty: ['mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод', 'эвкалипт'],
  fruity: [
    'fruit',
    'tropic',
    'melon',
    'watermelon',
    'mango',
    'pineapple',
    'pear',
    'apple',
    'grape',
    'peach',
    'kiwi',
    'фрукт',
    'тропич',
    'дыня',
    'арбуз',
    'манго',
    'ананас',
    'груша',
    'яблок',
    'виноград',
    'персик',
    'киви',
  ],
  floral_herbal: [
    'floral',
    'herbal',
    'tea',
    'flower',
    'цвет',
    'цветоч',
    'трав',
    'чай',
    'лемонграсс',
    'фиалк',
    'бузин',
  ],
  citrus: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'bergamot', 'цитрус', 'лимон', 'лайм', 'апельсин', 'грейпфрут'],
  berry: ['berry', 'berries', 'strawberry', 'raspberry', 'blueberry', 'currant', 'ягод', 'клубник', 'малин', 'смородин', 'черник', 'ежевик', 'клюкв'],
  perfume: ['perfume', 'parfum', 'парфюм', 'дух', 'пудров', 'винтажн'],
};

const profileOnlyTagKeywords = [
  'цветоч',
  'травян',
  'цитрус',
  'ягод',
  'фрукт',
  'мят',
  'табач',
  'десерт',
  'пря',
  'парфюм',
  'вкусы',
];

const normalizeMetaTag = (value: string): string | null => {
  if (value.includes('редк')) {
    return 'редкие';
  }
  if (value.includes('напит') || value.includes('газиров') || value.includes('алког')) {
    return 'напитки';
  }
  if (value.includes('мят') || value.includes('ментол') || value.includes('холод') || value.includes('лед')) {
    return 'охлаждающий';
  }

  return null;
};

export const deriveFlavorProfiles = (values: string[]) => {
  const normalizedValues = normalizeTextList(values);
  const matched = new Set<FlavorProfile>();

  for (const [profile, keywords] of Object.entries(profileKeywords)) {
    for (const keyword of keywords) {
      if (normalizedValues.some((value) => value.includes(keyword))) {
        matched.add(profile as FlavorProfile);
        break;
      }
    }
  }

  return Array.from(matched);
};

export const deriveFlavor = (inputFlavor: string[] | undefined, inputFlavorTags: string[]) => {
  const direct = normalizeTextList(inputFlavor ?? []);
  const sanitizedDirect = direct.filter((raw) => {
    if (normalizeMetaTag(raw)) {
      return false;
    }
    if (profileOnlyTagKeywords.some((keyword) => raw.includes(keyword))) {
      return false;
    }
    return true;
  });
  if (sanitizedDirect.length) {
    return sanitizedDirect;
  }

  const inferred: string[] = [];
  for (const raw of normalizeTextList(inputFlavorTags)) {
    if (normalizeMetaTag(raw)) {
      continue;
    }
    if (profileOnlyTagKeywords.some((keyword) => raw.includes(keyword))) {
      continue;
    }
    inferred.push(raw);
  }

  return dedupe(inferred);
};

export const deriveTobaccoFlavorTags = (
  inputFlavorTags: string[],
  flavor: string[],
  description?: string | null,
) => {
  const flavorSet = new Set(flavor);
  const tags: string[] = [];

  for (const raw of normalizeTextList(inputFlavorTags)) {
    if (flavorSet.has(raw)) {
      continue;
    }

    const normalized = normalizeMetaTag(raw);
    if (normalized) {
      tags.push(normalized);
    }
  }

  if (description) {
    const normalizedDescription = normalize(description);
    const fromDescription = normalizeMetaTag(normalizedDescription);
    if (fromDescription) {
      tags.push(fromDescription);
    }
  }

  return dedupe(tags);
};

const nameOverrides: Record<string, string> = {
  CACAO: 'Cacao',
  Cinnamon: 'Cinnamon Roll',
  'Earl Gray': 'Earl Grey',
  'Garnet Grape': 'Ruby Grape',
  'Must have Estragon': 'Estragon',
  Peppermint: 'Ice Mint',
  Rocket: 'Rocketman',
};

export const normalizeTobaccoName = (name: string) => nameOverrides[name] ?? name;

export const extractTagsFromDescription = (description?: string | null) => {
  if (!description) {
    return [];
  }

  const matches = description.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  return Array.from(
    new Set(
      matches
        .map((tag) => tag.slice(1).trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  );
};
