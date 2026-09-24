import type { PaletteTobacco, Turn, Verdict } from './types';

type Rng = () => number;

const DEFAULT_SHARES: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [55, 35, 10],
};

export const defaultShares = (count: number) => [...(DEFAULT_SHARES[count] ?? [])];

const NEUTRAL_AFFINITY = 0.5;

const profilesOf = (tobacco: PaletteTobacco) =>
  Array.from(new Set(tobacco.flavorProfiles.map((profile) => profile.trim().toLowerCase())));

// Формулы — зеркало harmonyOf из apps/backend/src/mixer.ts (#125): совпадение
// на карте обязано сходиться с тем, что evaluate покажет на раскрытии.
// Сродство пары табаков — среднее по всем парам их профилей.
export const pairAffinity = (
  left: PaletteTobacco,
  right: PaletteTobacco,
  affinity: Record<string, number>,
) => {
  const leftProfiles = profilesOf(left);
  const rightProfiles = profilesOf(right);
  if (!leftProfiles.length || !rightProfiles.length) {
    return NEUTRAL_AFFINITY;
  }
  const values = leftProfiles.flatMap((a) =>
    rightProfiles.map((b) => affinity[[a, b].sort().join('|')] ?? NEUTRAL_AFFINITY),
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const MONO_HARMONY = 70;
const MAX_COOLING = 20;
const MIN_BASE = 35;
const MAX_TWIST = 25;

export const harmonyOf = (
  tobaccos: PaletteTobacco[],
  shares: number[],
  affinity: Record<string, number>,
) => {
  if (tobaccos.length < 2) {
    return MONO_HARMONY;
  }
  let weighted = 0;
  let weights = 0;
  for (let i = 0; i < tobaccos.length; i += 1) {
    for (let j = i + 1; j < tobaccos.length; j += 1) {
      const weight = shares[i] * shares[j];
      weighted += pairAffinity(tobaccos[i], tobaccos[j], affinity) * weight;
      weights += weight;
    }
  }
  let harmony = 40 + 60 * (weighted / weights);

  const cooling = coolingShare(tobaccos, shares);
  if (cooling > MAX_COOLING) harmony -= (cooling - MAX_COOLING) * 0.5;
  if (shares[0] < MIN_BASE) harmony -= (MIN_BASE - shares[0]) * 0.6;
  // Штрих — по роли: третий компонент чаши, а не флаг twist у табака.
  const twist = shares[2] ?? 0;
  if (twist > MAX_TWIST) harmony -= (twist - MAX_TWIST) * 0.5;

  return Math.max(0, Math.min(100, Math.round(harmony)));
};

// Совпадение на карте — гармония чаши с этой картой при долях по умолчанию.
export const matchScore = (tobaccos: PaletteTobacco[], affinity: Record<string, number>) =>
  harmonyOf(tobaccos, defaultShares(tobaccos.length), affinity);

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
// Правило — как nameOf в backend (#125): первые ноты через запятую и «и»,
// холодок после основы — суффикс «со льдом».
export const draftMixName = (tobaccos: PaletteTobacco[]) => {
  if (!tobaccos.length) {
    return '';
  }
  const [base, ...rest] = tobaccos;
  const named = [base, ...rest.filter((tobacco) => !tobacco.cooling)];
  const iced = rest.some((tobacco) => tobacco.cooling);
  const notes = Array.from(new Set(named.map((tobacco) => tobacco.flavors[0]?.trim() || tobacco.name)));
  const joined =
    notes.length === 1 ? notes[0] : `${notes.slice(0, -1).join(', ')} и ${notes[notes.length - 1]}`;
  return `${capitalize(joined)}${iced ? ' со льдом' : ''}`;
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
      .map((tobacco) => ({ tobacco, score: matchScore([...current, tobacco], affinity) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
    ids.push(pickOne(best, rng).tobacco.id);
  }

  return ids;
};
