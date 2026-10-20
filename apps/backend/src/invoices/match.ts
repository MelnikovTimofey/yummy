import { describeLine } from './brands';

export type CatalogTobacco = { id: string; manufacturer: string; lineName: string | null; name: string };

export type SupplierMemoryItem = { article?: string | null; normalizedName: string; tobaccoId: string };

export type MatchCandidate = {
  tobaccoId: string;
  confidence: number;
  reason: 'memory' | 'catalog' | 'no-brand';
};

// С этой уверенности предложение можно показывать как сопоставленное, ниже — как вариант для выбора.
export const CONFIDENT_MATCH = 80;

const MAX_CANDIDATES = 5;
const PHONETIC_MATCH = 0.9;
const STEM_MATCH = 0.8;
const MIN_STEM = 5;
const MIN_PHONETIC_KEY = 2;
const MIN_COMPOUND_KEY = 4;
// Без бренда из каталога тот же вкус бывает у любого производителя — уверенность не выше половины.
const NO_BRAND_FACTOR = 0.5;

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (value: string | null | undefined) => (value ? normalizeName(value).split(' ').filter(Boolean) : []);

// Русская транскрипция и английское написание расходятся в гласных и удвоениях, но совпадают
// в скелете согласных: «Блэккерент» и «Blackcurrant» — оба blkrnt, «Вирджин» и «Virgin» — vrjn.
// Начальная гласная остаётся меткой V: без неё «Облако» и «Black» дают один скелет blk.
const consonants = (token: string) =>
  [...token]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
    .replace(/dzh|zh/g, 'j')
    .replace(/ch/g, 'C')
    .replace(/sh/g, 'S')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/[cq]/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')
    .replace(/g(?=[eiy])/g, 'j');

const phoneticKey = (token: string) =>
  consonants(token)
    .replace(/^[aeiouy]+/, 'V')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1');

// Слова со скелетом из одной согласной различают гласные: «Ба» и «Boo» — разные вкусы.
// Гласные сводятся к классам по звучанию в транскрипции: «Ми» ~ «Me», «Ти» ~ «Tea», «Бу» ~ «Boo».
const shortKey = (token: string) =>
  consonants(token)
    .replace(/y(?=[aeiou])/g, 'j')
    .replace(/[eiy]/g, 'i')
    .replace(/[ou]/g, 'u')
    .replace(/([aiu])[aiu]+/g, '$1')
    .replace(/(.)\1+/g, '$1');

// Словоформы: «Барбарисовая» ~ «Барбарис», «Raspberry» ~ «Raspberries». Общая основа должна покрывать
// и бо́льшую часть длинного слова, иначе «Grape» совпало бы с «Grapefruit», а «Black» — с «Blackberry».
const sameStem = (a: string, b: string) => {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let prefix = 0;
  while (prefix < shorter.length && shorter[prefix] === longer[prefix]) {
    prefix += 1;
  }
  return prefix >= MIN_STEM && prefix >= 0.7 * shorter.length && prefix >= 0.6 * longer.length;
};

const tokenSimilarity = (a: string, b: string) => {
  if (a === b) {
    return 1;
  }
  if (!/\p{L}/u.test(a) || !/\p{L}/u.test(b)) {
    return 0;
  }
  // Скелет из одной согласной («то», «Tea», «Ми») совпадает слишком часто. У длинного слова
  // («Папайя», «Какао») его уточняют гласные, короткое сверяет shortTokenSimilarity.
  const key = phoneticKey(a);
  const same =
    key.length >= MIN_PHONETIC_KEY ? key === phoneticKey(b) : a.length >= MIN_STEM && shortKey(a) === shortKey(b);
  if (same) {
    return PHONETIC_MATCH;
  }
  return sameStem(a, b) ? STEM_MATCH : 0;
};

const shortTokenSimilarity = (a: string, b: string) =>
  /\p{L}/u.test(a) && shortKey(a) === shortKey(b) ? PHONETIC_MATCH : 0;

// Жадно сопоставляет слова left со свободными словами right, занимая их в used.
const matchTokens = (
  left: string[],
  right: string[],
  used: Set<number>,
  score: (a: string, b: string) => number,
) => {
  let matched = 0;
  const unmatched: string[] = [];
  for (const token of left) {
    let best = 0;
    let bestIndex = -1;
    right.forEach((candidate, index) => {
      const value = used.has(index) ? 0 : score(token, candidate);
      if (value > best) {
        best = value;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      used.add(bestIndex);
      matched += best;
    } else {
      unmatched.push(token);
    }
  }
  return { matched, unmatched };
};

// Коэффициент Дайса по токенам: лишние слова с любой стороны снижают оценку. Короткие слова
// («Ми» ~ «Me») засчитываются только остатком к уже совпавшему длинному: «Пинк Ми» ~ «Pink Me».
const similarity = (left: string[], right: string[]) => {
  if (!left.length || !right.length) {
    return 0;
  }
  const used = new Set<number>();
  const strict = matchTokens(left, right, used, tokenSimilarity);
  const rest = strict.matched ? matchTokens(strict.unmatched, right, used, shortTokenSimilarity).matched : 0;
  return Math.max((2 * (strict.matched + rest)) / (left.length + right.length), compoundSimilarity(left, right));
};

// Слитное и раздельное написание: «Бабл Гам» ~ «Баблгам», «Black Berry» ~ «Blackberry».
const compoundSimilarity = (left: string[], right: string[]) => {
  if (left.length === right.length) {
    return 0;
  }
  const [a, b] = [left.join(''), right.join('')];
  if (a === b) {
    return 1;
  }
  const key = phoneticKey(a);
  return key.length >= MIN_COMPOUND_KEY && key === phoneticKey(b) ? PHONETIC_MATCH : 0;
};

const findInMemory = (line: { article?: string; name: string }, memory: SupplierMemoryItem[]) => {
  const article = line.article?.trim();
  const byArticle = article ? memory.find((item) => item.article?.trim() === article) : undefined;
  const normalized = normalizeName(line.name);
  return byArticle ?? memory.find((item) => item.normalizedName === normalized);
};

export const matchLine = (
  line: { article?: string; name: string },
  catalog: CatalogTobacco[],
  memory: SupplierMemoryItem[] = [],
): MatchCandidate[] => {
  const remembered = findInMemory(line, memory);
  const described = describeLine(line.name);

  const brand = described.brand?.toLowerCase();
  const ofBrand = brand ? catalog.filter((tobacco) => tobacco.manufacturer.toLowerCase() === brand) : [];
  const pool = ofBrand.length ? ofBrand : catalog;
  const factor = ofBrand.length ? 1 : NO_BRAND_FACTOR;
  const reason = ofBrand.length ? 'catalog' : 'no-brand';

  const flavors = [tokens(described.flavor), tokens(described.flavorAlt)];
  const lineTokens = tokens(described.line);

  const candidates = pool
    .filter((tobacco) => tobacco.id !== remembered?.tobaccoId)
    .map((tobacco) => {
      const nameTokens = tokens(tobacco.name);
      const score = Math.max(...flavors.map((flavor) => similarity(flavor, nameTokens)));
      return {
        candidate: { tobaccoId: tobacco.id, confidence: Math.round(score * factor * 100), reason } as MatchCandidate,
        lineScore: similarity(lineTokens, tokens(tobacco.lineName)),
      };
    })
    .filter(({ candidate }) => candidate.confidence > 0)
    .sort((a, b) => b.candidate.confidence - a.candidate.confidence || b.lineScore - a.lineScore)
    .slice(0, MAX_CANDIDATES)
    .map(({ candidate }) => candidate);

  return remembered
    ? [{ tobaccoId: remembered.tobaccoId, confidence: 100, reason: 'memory' }, ...candidates]
    : candidates;
};
