export type LineDescription = {
  brand?: string;
  line?: string;
  grams?: number;
  flavor: string;
  flavorAlt?: string;
  isTobacco: boolean;
};

// Каноническое написание — как manufacturer в каталоге; варианты сравниваются без учёта регистра.
const BRANDS: Array<[canonical: string, aliases: string[]]> = [
  ['DARKSIDE', ['darkside', 'dark side', 'дарксайд', 'дарк сайд']],
  ['Starline', ['starline', 'star line', 'старлайн']],
  ['Black Burn', ['black burn', 'blackburn', 'блэк берн', 'блек берн']],
  ['Sebero', ['sebero', 'себеро']],
  ['Сарма', ['сарма', 'sarma']],
  ['Хулиган', ['хулиган', 'хлгн', 'hooligan']],
  ['Blansh', ['blansh', 'бланш']],
  ['AHF Tobacco', ['ahf tobacco', 'ahf']],
  ['Bliss', ['bliss', 'блисс']],
  ['Deus', ['deus', 'деус']],
  ['Jent', ['jent', 'джент']],
  ['Overdose', ['overdose', 'овердоз']],
  ['Palitra', ['palitra', 'палитра']],
  ['Trofimoff’s', ['trofimoff’s', "trofimoff's", 'trofimoff', 'трофимофф']],
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const BRAND_PATTERNS = BRANDS.flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  .sort((a, b) => b.alias.length - a.alias.length)
  .map(({ canonical, alias }) => ({
    canonical,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(alias).replace(/ /g, '\\s*')}(?![\\p{L}\\p{N}])`, 'iu'),
  }));

const TOBACCO_PREFIX = /табак\s+для\s+кальяна/giu;
const WEIGHT = /(?<![\p{L}\p{N}.,])(\d+)\s*(?:гр|г|gr|g)\.?(?![\p{L}\p{N}])/iu;
const TRAILING_PARENS = /^(.*?)\(([^()]*)\)$/;

const clean = (value: string) =>
  value
    .replace(/["«»“”„]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '');

const isLatin = (value: string) => /[a-z]/i.test(value) && !/[а-яё]/i.test(value);
const isCyrillic = (value: string) => /[а-яё]/i.test(value);

const findBrand = (value: string) => {
  for (const { canonical, pattern } of BRAND_PATTERNS) {
    const match = pattern.exec(value);
    if (match) {
      return { canonical, rest: `${value.slice(0, match.index)} ${value.slice(match.index + match[0].length)}` };
    }
  }
  return null;
};

export const describeLine = (name: string): LineDescription => {
  const withoutPrefix = name.replace(TOBACCO_PREFIX, ' ');
  const brand = findBrand(withoutPrefix);
  const rest = brand ? brand.rest : withoutPrefix;

  // Вес обычно делит название на «линейка | вкус»: «Сарма 360 Крепкая 200гр Маракуйя».
  const weight = WEIGHT.exec(rest);
  const beforeWeight = weight ? rest.slice(0, weight.index) : rest;
  const afterWeight = weight ? clean(rest.slice(weight.index + weight[0].length)) : '';
  const lineParts = afterWeight ? [clean(beforeWeight)] : [];
  let flavor = afterWeight || clean(beforeWeight);
  let flavorAlt = '';

  // «Raspberries (Спелая лесная малина)» — перевод; «Кор (Блэккерент)» — линейка и вкус.
  const parens = TRAILING_PARENS.exec(flavor);
  if (parens) {
    const outside = clean(parens[1]);
    const inside = clean(parens[2]);
    if (outside && isLatin(outside) && isCyrillic(inside)) {
      flavor = outside;
      flavorAlt = inside;
    } else {
      lineParts.push(outside);
      flavor = inside;
    }
  }

  const line = lineParts.filter(Boolean).join(' ');
  const grams = weight ? Number(weight[1]) : undefined;
  return {
    ...(brand ? { brand: brand.canonical } : {}),
    ...(line ? { line } : {}),
    ...(grams !== undefined ? { grams } : {}),
    flavor,
    ...(flavorAlt ? { flavorAlt } : {}),
    isTobacco: Boolean(brand) || grams !== undefined,
  };
};
