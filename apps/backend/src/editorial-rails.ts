// Редакторские (prepared) рейлы собираются не списками, а правилами над
// таксономией табаков микса: рейл описывает смысл («ягоды со льдом»), а
// `scripts/build-catalog-backup.ts` сам раскладывает по нему пул миксов из
// docs/data/mixes.md. Правила — в docs/data/preset-rails.md.

export type PoolSet = 'хиты' | 'ниша';

// Крепость (`officialStrength` каталога) участвует в правилах строчными: «крепкая».
export type RuleTobacco = { flavorProfiles: string[]; flavors: string[]; flavorTags: string[]; strength?: string | null };

export type PoolMix = {
  slug: string;
  set: PoolSet;
  components: Array<{ tobacco: RuleTobacco; proportion: number }>;
};

export type RailRule = {
  set: PoolSet | 'все';
  // Каждая группа — альтернативы через «|»; для рейла нужны все группы.
  lead: string[][];
  has: string[][];
  none: string[];
  maxComponents: number | null;
};

// Нота «ведёт» микс, если на табаки с ней приходится не меньше этой доли:
// 40% — это основа, а 10–25% — штрих (холодок, пряность, акцент).
export const LEAD_SHARE = 40;

const alternatives = (value: string) =>
  value
    .split(',')
    .map((group) => group.split('|').map((term) => term.trim()).filter(Boolean))
    .filter((group) => group.length);

export const parseRailRule = (text: string): RailRule => {
  const rule: RailRule = { set: 'все', lead: [], has: [], none: [], maxComponents: null };
  for (const part of text.split('·').map((item) => item.trim()).filter(Boolean)) {
    if (part === 'хиты' || part === 'ниша') {
      rule.set = part;
      continue;
    }
    const clause = part.match(/^(основа|есть|без)\s+(.+)$/);
    if (clause) {
      const groups = alternatives(clause[2]);
      if (clause[1] === 'основа') rule.lead.push(...groups);
      if (clause[1] === 'есть') rule.has.push(...groups);
      if (clause[1] === 'без') rule.none.push(...groups.flat());
      continue;
    }
    const limit = part.match(/^до\s+(\d+)\s+табак/);
    if (limit) {
      rule.maxComponents = Number(limit[1]);
      continue;
    }
    throw new Error(`Непонятная часть правила рейла: «${part}» (в «${text}»)`);
  }
  return rule;
};

const termsOf = (tobacco: RuleTobacco) => {
  const terms = new Set([...tobacco.flavorProfiles, ...tobacco.flavors, ...tobacco.flavorTags]);
  if (tobacco.strength) terms.add(tobacco.strength.toLowerCase());
  return terms;
};

export const termShares = (components: PoolMix['components']) => {
  const shares = new Map<string, number>();
  for (const { tobacco, proportion } of components) {
    for (const term of termsOf(tobacco)) shares.set(term, (shares.get(term) ?? 0) + proportion);
  }
  return shares;
};

// Доля группы альтернатив считается по табакам, а не суммой по терминам:
// табак с berry и fruity одновременно не должен засчитываться дважды.
const groupShare = (components: PoolMix['components'], group: string[]) =>
  components
    .filter(({ tobacco }) => group.some((term) => termsOf(tobacco).has(term)))
    .reduce((sum, { proportion }) => sum + proportion, 0);

export const matchesRule = (mix: PoolMix, rule: RailRule) => {
  if (rule.set !== 'все' && mix.set !== rule.set) return false;
  if (rule.maxComponents !== null && mix.components.length > rule.maxComponents) return false;
  if (rule.lead.some((group) => groupShare(mix.components, group) < LEAD_SHARE)) return false;
  if (rule.has.some((group) => groupShare(mix.components, group) === 0)) return false;
  return !rule.none.some((term) => groupShare(mix.components, [term]) > 0);
};

// Рейлы разбираются по очереди, миксы — в порядке пула (выше — востребованнее).
// Лимит рейлов на микс не даёт одному хиту заполнить всю Главную.
export const assignRails = (
  rails: Array<{ slug: string; rule: RailRule }>,
  pool: PoolMix[],
  limits: { maxSize: number; maxRailsPerMix: number },
) => {
  const usage = new Map<string, number>();
  const assigned = new Map<string, string[]>();
  for (const rail of rails) {
    const picked: string[] = [];
    for (const mix of pool) {
      if (picked.length >= limits.maxSize) break;
      if ((usage.get(mix.slug) ?? 0) >= limits.maxRailsPerMix) continue;
      if (!matchesRule(mix, rail.rule)) continue;
      picked.push(mix.slug);
      usage.set(mix.slug, (usage.get(mix.slug) ?? 0) + 1);
    }
    assigned.set(rail.slug, picked);
  }
  return assigned;
};

// --- Разбор docs/data --------------------------------------------------------

export type PoolComponentRef = { manufacturer: string; lineName: string; name: string; proportion: number };

export type PoolEntry = {
  slug: string;
  set: PoolSet;
  name: string;
  description: string;
  components: PoolComponentRef[];
};

const tableCells = (line: string) => {
  const row = line.trim();
  if (!row.startsWith('|')) return null;
  // `\|` — экранированная черта внутри ячейки (альтернативы в правиле рейла).
  return row
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
};

const SET_SLUG: Record<PoolSet, string> = { хиты: 'hit', ниша: 'niche' };

const parseComponent = (raw: string, slug: string): PoolComponentRef => {
  const match = raw.match(/^(.+?)\s+\/\s+(.*?)\s+\/\s+(.+?)\s+(\d+)\s*%$/);
  if (!match) throw new Error(`${slug}: компонент «${raw}» не в формате «производитель / линейка / название NN%»`);
  const lineName = match[2].trim();
  return {
    manufacturer: match[1].trim(),
    lineName: lineName === '—' ? '' : lineName,
    name: match[3].trim(),
    proportion: Number(match[4]),
  };
};

export const parsePool = (md: string): PoolEntry[] => {
  const pool: PoolEntry[] = [];
  let set: PoolSet | null = null;
  for (const line of md.split('\n')) {
    const heading = line.match(/^##\s+(Хиты|Ниша)(?:\s|$)/);
    if (heading) {
      set = heading[1] === 'Хиты' ? 'хиты' : 'ниша';
      continue;
    }
    const cells = tableCells(line);
    const num = cells ? Number(cells[0]) : NaN;
    if (!set || !cells || !Number.isInteger(num) || num < 1) continue;
    const slug = `${SET_SLUG[set]}-${String(num).padStart(2, '0')}`;
    const components = cells[2]
      .split('·')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => parseComponent(item, slug));
    const total = components.reduce((sum, item) => sum + item.proportion, 0);
    if (total !== 100) throw new Error(`${slug}: сумма долей ${total}%, а должна быть 100%`);
    pool.push({ slug, set, name: cells[1], description: cells[3], components });
  }
  return pool;
};

export type RailEntry = { slug: string; title: string; subtitle: string; rule: RailRule };

export const parseRails = (md: string): RailEntry[] =>
  md.split('\n').flatMap((line) => {
    const cells = tableCells(line);
    const slug = cells?.[0].match(/^`([a-z0-9-]+)`$/)?.[1];
    if (!cells || !slug || cells.length < 4) return [];
    return [{ slug, title: cells[1], subtitle: cells[2], rule: parseRailRule(cells[3].replace(/`/g, '')) }];
  });
