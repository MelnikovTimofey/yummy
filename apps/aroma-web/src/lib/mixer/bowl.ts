import type { PaletteTobacco, Turn, Verdict } from './types';

type Rng = () => number;

const DEFAULT_SHARES: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [55, 35, 10],
};

export const defaultShares = (count: number) => [...(DEFAULT_SHARES[count] ?? [])];

const NEUTRAL_AFFINITY = 0.5;

const profileAffinity = (left: string, right: string, affinity: Record<string, number>) => {
  const key = [left, right].sort().join('|');
  return affinity[key] ?? NEUTRAL_AFFINITY;
};

// У табака может быть несколько профилей — сродство пары табаков берём
// средним по всем парам их профилей.
export const pairAffinity = (
  left: PaletteTobacco,
  right: PaletteTobacco,
  affinity: Record<string, number>,
) => {
  if (!left.flavorProfiles.length || !right.flavorProfiles.length) {
    return NEUTRAL_AFFINITY;
  }
  let sum = 0;
  let count = 0;
  for (const a of left.flavorProfiles) {
    for (const b of right.flavorProfiles) {
      sum += profileAffinity(a, b, affinity);
      count += 1;
    }
  }
  return sum / count;
};

// Совпадение на карте — сродство профилей, взвешенное произведением долей по
// умолчанию, без штрафов: итог со штрафами считает backend на раскрытии.
export const matchScore = (tobaccos: PaletteTobacco[], affinity: Record<string, number>) => {
  if (tobaccos.length < 2) {
    return null;
  }
  const shares = defaultShares(tobaccos.length);
  let weighted = 0;
  let weights = 0;
  for (let i = 0; i < tobaccos.length; i += 1) {
    for (let j = i + 1; j < tobaccos.length; j += 1) {
      const weight = shares[i] * shares[j];
      weighted += pairAffinity(tobaccos[i], tobaccos[j], affinity) * weight;
      weights += weight;
    }
  }
  return Math.round((weighted / weights) * 100);
};

export const verdictForScore = (score: number): Verdict =>
  score >= 85 ? 'classic' : score >= 70 ? 'confident' : score >= 55 ? 'bold' : 'ask-master';

const STEP = 5;
const MIN_SHARE = 5;

// Граница `index` лежит между компонентами index и index + 1.
export const moveBoundary = (shares: number[], index: number, target: number) => {
  const before = shares.slice(0, index).reduce((sum, share) => sum + share, 0);
  const after = before + shares[index] + shares[index + 1];
  const snapped = Math.round(target / STEP) * STEP;
  const position = Math.max(before + MIN_SHARE, Math.min(after - MIN_SHARE, snapped));
  if (position - before === shares[index]) {
    return shares;
  }
  const next = [...shares];
  next[index] = position - before;
  next[index + 1] = after - position;
  return next;
};

export const coolingShare = (tobaccos: PaletteTobacco[], shares: number[]) =>
  tobaccos.reduce((sum, tobacco, index) => sum + (tobacco.cooling ? shares[index] ?? 0 : 0), 0);

export const splitWarning = (tobaccos: PaletteTobacco[], shares: number[]) => {
  if (coolingShare(tobaccos, shares) > 20) return 'split.too-cold' as const;
  if (tobaccos.length > 1 && shares[0] < 35) return 'split.weak-base' as const;
  return null;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Черновик имени, пока идут свайпы; на раскрытии его заменяет имя из evaluate.
// Правило то же, что у backend (#125): первые ноты через запятую и «и»,
// охлаждающий штрих — суффикс «со льдом».
export const draftMixName = (tobaccos: PaletteTobacco[]) => {
  if (!tobaccos.length) {
    return '';
  }
  const coldTwist = tobaccos.length === 3 && tobaccos[2].cooling;
  const named = coldTwist ? tobaccos.slice(0, 2) : tobaccos;
  const notes = named.map((tobacco) => tobacco.flavors[0] ?? tobacco.name);
  const joined =
    notes.length === 1 ? notes[0] : `${notes.slice(0, -1).join(', ')} и ${notes[notes.length - 1]}`;
  return capitalize(coldTwist ? `${joined} со льдом` : joined);
};

export const poolForTurn = (palette: PaletteTobacco[], turn: Turn, chosen: string[]) =>
  palette.filter(
    (tobacco) => !chosen.slice(0, turn).includes(tobacco.id) && (turn < 2 || tobacco.twist),
  );

export const shelvesOf = (tobaccos: PaletteTobacco[], order: string[]) => {
  const present = new Set(tobaccos.flatMap((tobacco) => tobacco.flavorProfiles));
  const known = order.filter((profile) => present.has(profile));
  const rest = [...present].filter((profile) => !order.includes(profile)).sort();
  return [...known, ...rest];
};

export const underShelves = (tobaccos: PaletteTobacco[], shelves: string[]) =>
  shelves.length
    ? tobaccos.filter((tobacco) => tobacco.flavorProfiles.some((profile) => shelves.includes(profile)))
    : tobaccos;

// Первая колода — по профилям онбординга; если по ним пусто — «Все».
export const initialShelves = (tobaccos: PaletteTobacco[], liked: string[]) => {
  const present = new Set(tobaccos.flatMap((tobacco) => tobacco.flavorProfiles));
  const shelves = liked.filter((profile) => present.has(profile));
  return underShelves(tobaccos, shelves).length ? shelves : [];
};

const pickOne = <T>(items: T[], rng: Rng) => items[Math.floor(rng() * items.length)];

// «Доверюсь мастеру»: дособрать оставшиеся ходы. Основа и акцент — без
// холодка (он идёт штрихом), акцент и штрих — из четырёх лучших по совпадению.
export const trustMaster = (
  palette: PaletteTobacco[],
  affinity: Record<string, number>,
  chosen: string[],
  rng: Rng = Math.random,
) => {
  const ids = [...chosen];
  const byId = new Map(palette.map((tobacco) => [tobacco.id, tobacco]));

  for (let turn = ids.length as Turn; turn <= 2; turn = (turn + 1) as Turn) {
    const pool = poolForTurn(palette, turn, ids).filter(
      (tobacco) => !ids.includes(tobacco.id) && (turn === 2 || !tobacco.cooling),
    );
    if (!pool.length) {
      break;
    }
    if (turn === 0) {
      ids.push(pickOne(pool, rng).id);
      continue;
    }
    const current = ids.map((id) => byId.get(id)).filter((item): item is PaletteTobacco => Boolean(item));
    const best = pool
      .map((tobacco) => ({ tobacco, score: matchScore([...current, tobacco], affinity) ?? 0 }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
    ids.push(pickOne(best, rng).tobacco.id);
  }

  return ids;
};
