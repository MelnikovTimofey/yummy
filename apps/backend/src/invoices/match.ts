import { describeLine } from './brands';

export type CatalogTobacco = { id: string; manufacturer: string; lineName: string | null; name: string };

export type SupplierMemoryItem = { article?: string | null; normalizedName: string; tobaccoId: string };

export type MatchCandidate = {
  tobaccoId: string;
  confidence: number;
  reason: 'memory' | 'catalog' | 'no-brand';
};

const MAX_CANDIDATES = 5;
const PHONETIC_MATCH = 0.9;
const MIN_PHONETIC_KEY = 2;
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
  й: 'i',
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
const phoneticKey = (token: string) =>
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
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/^[aeiouy]+/, 'V')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1');

const tokenSimilarity = (a: string, b: string) => {
  if (a === b) {
    return 1;
  }
  if (!/\p{L}/u.test(a) || !/\p{L}/u.test(b)) {
    return 0;
  }
  // Скелет из одной согласной («то», «Tea», «Ми») совпадает слишком часто.
  const key = phoneticKey(a);
  return key.length >= MIN_PHONETIC_KEY && key === phoneticKey(b) ? PHONETIC_MATCH : 0;
};

// Коэффициент Дайса по токенам: лишние слова с любой стороны снижают оценку.
const similarity = (left: string[], right: string[]) => {
  if (!left.length || !right.length) {
    return 0;
  }
  const used = new Set<number>();
  let matched = 0;
  for (const token of left) {
    let best = 0;
    let bestIndex = -1;
    right.forEach((candidate, index) => {
      const score = used.has(index) ? 0 : tokenSimilarity(token, candidate);
      if (score > best) {
        best = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      used.add(bestIndex);
      matched += best;
    }
  }
  return (2 * matched) / (left.length + right.length);
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
