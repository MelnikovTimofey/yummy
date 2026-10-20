import { affinityKey, type Affinity } from './mixer';
import type { GuestForYouHint, GuestForYouReason } from './types';

// «Для вас» (PRD §6.5): rule-based подбор вошедшему гостю, который работает на
// открытие нового и не запирает в пузыре одного вкуса. Чистая функция: историю,
// миксы в наличии и сродство профилей подаёт маршрут /guest/me/for-you.

export type ForYouMix = {
  id: string;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  components: Array<{ tobaccoId: string; proportion: number }>;
};

export type ForYouHistoryEntry =
  | { kind: 'catalog'; at: Date; mixId: string | null; name: string; profiles: string[] }
  | { kind: 'custom'; at: Date; key: string; name: string; components: Array<{ tobaccoId: string; proportion: number }> };

export type ForYouInput<M extends ForYouMix = ForYouMix> = {
  now: Date;
  history: ForYouHistoryEntry[];
  ratings: Record<string, number>;
  favoriteMixIds: string[];
  onboarding: { likedProfiles: string[]; likedFlavors: string[] };
  mixes: M[];
  tobaccoProfiles: Record<string, string[]>;
  affinity: Affinity;
};

export type ForYouCard<M extends ForYouMix = ForYouMix> = { mix: M; reason: GuestForYouReason };

export type ForYouPersonal<M extends ForYouMix = ForYouMix> = {
  mode: 'personal';
  fresh: ForYouCard<M>[];
  sidestep: ForYouCard<M>[];
  again: ForYouCard<M>[];
  hint: GuestForYouHint | null;
};

export type ForYouResult<M extends ForYouMix = ForYouMix> = { mode: 'cold'; picks: number } | ForYouPersonal<M>;

// Числа — стартовые из PRD §6.5, уточняются по итогам пилота.
const MIN_PICKS = 3;
const SATURATION = 3;
const DECAY_AFTER_DAYS = 60;
const DECAY_FACTOR = 0.5;
const MAX_PER_LEADING = 2;
const FRESH_COUNT = 4;
const HINT_WINDOW = 5;
const HINT_THRESHOLD = 4;
const ONBOARDING_WEIGHT = 1;
const FAVORITE_WEIGHT = 1;
const FLAVOR_BONUS = 0.1;
const NEUTRAL_AFFINITY = 0.5;
const DAY_MS = 24 * 60 * 60 * 1000;

type Shares = Map<string, number>;

const equalShares = (profiles: string[]): Shares => {
  const unique = Array.from(new Set(profiles));
  return new Map(unique.map((profile) => [profile, 1 / unique.length]));
};

// Доля профиля в чаше: доля компонента делится поровну между профилями его
// табака. Табак, которого больше нет в каталоге, пропускается.
const componentShares = (
  components: Array<{ tobaccoId: string; proportion: number }>,
  tobaccoProfiles: Record<string, string[]>,
): Shares => {
  const known = components.filter((component) => tobaccoProfiles[component.tobaccoId]?.length);
  const total = known.reduce((sum, component) => sum + component.proportion, 0);
  const shares: Shares = new Map();
  if (!total) return shares;
  for (const component of known) {
    const profiles = Array.from(new Set(tobaccoProfiles[component.tobaccoId]));
    for (const profile of profiles) {
      shares.set(profile, (shares.get(profile) ?? 0) + component.proportion / total / profiles.length);
    }
  }
  return shares;
};

const mixShares = (mix: ForYouMix, tobaccoProfiles: Record<string, string[]>) => {
  const shares = componentShares(mix.components, tobaccoProfiles);
  return shares.size ? shares : equalShares(mix.flavorProfiles);
};

const leadingOf = (shares: Shares) => {
  let best: [string, number] | null = null;
  for (const entry of shares) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  return best?.[0] ?? '';
};

export const leadingProfile = (mix: ForYouMix, tobaccoProfiles: Record<string, string[]>) =>
  leadingOf(mixShares(mix, tobaccoProfiles));

const historyKey = (entry: ForYouHistoryEntry) =>
  entry.kind === 'catalog' ? `catalog:${entry.mixId ?? entry.name}` : `custom:${entry.key}`;

const historyShares = (entry: ForYouHistoryEntry, input: ForYouInput) => {
  if (entry.kind === 'custom') return componentShares(entry.components, input.tobaccoProfiles);
  const live = input.mixes.find((mix) => mix.id === entry.mixId);
  return live ? mixShares(live, input.tobaccoProfiles) : equalShares(entry.profiles);
};

const newestFirst = (history: ForYouHistoryEntry[]) => [...history].sort((left, right) => right.at.getTime() - left.at.getTime());

// Оценка 5 усиливает вклад микса в полтора раза, 1 — ослабляет вдвое.
const ratingFactor = (rating: number | undefined) => (rating ? 1 + (rating - 3) * 0.25 : 1);

export const tasteProfile = (input: ForYouInput): Record<string, number> => {
  const taste: Record<string, number> = {};
  const add = (shares: Shares, weight: number) => {
    for (const [profile, share] of shares) taste[profile] = (taste[profile] ?? 0) + share * weight;
  };

  const seen = new Map<string, number>();
  for (const entry of newestFirst(input.history)) {
    const key = historyKey(entry);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > SATURATION) continue;
    const decay = input.now.getTime() - entry.at.getTime() > DECAY_AFTER_DAYS * DAY_MS ? DECAY_FACTOR : 1;
    const rating = entry.kind === 'catalog' && entry.mixId ? input.ratings[entry.mixId] : undefined;
    add(historyShares(entry, input), decay * ratingFactor(rating));
  }

  add(equalShares(input.onboarding.likedProfiles), ONBOARDING_WEIGHT * input.onboarding.likedProfiles.length);
  for (const mix of input.mixes.filter((item) => input.favoriteMixIds.includes(item.id))) {
    add(mixShares(mix, input.tobaccoProfiles), FAVORITE_WEIGHT);
  }
  return taste;
};

const buildHint = (history: ForYouHistoryEntry[], leadingOfEntry: (entry: ForYouHistoryEntry) => string): GuestForYouHint | null => {
  const window = newestFirst(history).slice(0, HINT_WINDOW);
  const top = <T>(values: T[]) => {
    const counts = new Map<T, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return [...counts].sort((left, right) => right[1] - left[1])[0];
  };

  const [mixKey, mixCount] = top(window.map(historyKey));
  if (mixCount >= HINT_THRESHOLD) {
    const name = window.find((entry) => historyKey(entry) === mixKey)!.name;
    return { kind: 'same-mix', mixName: name, count: mixCount, outOf: window.length };
  }
  const [profile, profileCount] = top(window.map(leadingOfEntry));
  if (profile && profileCount >= HINT_THRESHOLD) {
    return { kind: 'same-profile', profile, count: profileCount, outOf: window.length };
  }
  return null;
};

export const buildForYou = <M extends ForYouMix>(input: ForYouInput<M>): ForYouResult<M> => {
  if (input.history.length < MIN_PICKS) {
    return { mode: 'cold', picks: input.history.length };
  }

  const taste = tasteProfile(input);
  const maxTaste = Math.max(...Object.values(taste), 1e-9);
  const favoriteProfiles = Object.entries(taste)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([profile]) => profile);

  const leadingById = new Map(input.mixes.map((mix) => [mix.id, leadingProfile(mix, input.tobaccoProfiles)]));
  const leadingOfEntry = (entry: ForYouHistoryEntry) => leadingOf(historyShares(entry, input));
  const historyLeading = new Set(input.history.map(leadingOfEntry));
  const chosen = new Set(input.history.flatMap((entry) => (entry.kind === 'catalog' && entry.mixId ? [entry.mixId] : [])));

  const likedFlavors = new Set([
    ...input.onboarding.likedFlavors,
    ...input.mixes.filter((mix) => chosen.has(mix.id)).flatMap((mix) => mix.flavors),
  ]);
  const score = (mix: M) => {
    let value = 0;
    for (const [profile, share] of mixShares(mix, input.tobaccoProfiles)) value += share * (taste[profile] ?? 0) / maxTaste;
    return value + FLAVOR_BONUS * mix.flavors.filter((flavor) => likedFlavors.has(flavor)).length;
  };
  const byScore = (left: M, right: M) => score(right) - score(left) || left.name.localeCompare(right.name, 'ru');

  const picked = new Set<string>();
  const perLeading = new Map<string, number>();
  const take = (mix: M) => {
    picked.add(mix.id);
    const leading = leadingById.get(mix.id)!;
    perLeading.set(leading, (perLeading.get(leading) ?? 0) + 1);
  };
  const fits = (mix: M) => !picked.has(mix.id) && (perLeading.get(leadingById.get(mix.id)!) ?? 0) < MAX_PER_LEADING;

  // «Снова» — один любимый микс из наличия: лучший по оценке, затем по числу выборов.
  const timesChosen = (mixId: string) => input.history.filter((entry) => entry.kind === 'catalog' && entry.mixId === mixId).length;
  const again = input.mixes
    .filter((mix) => chosen.has(mix.id))
    .sort((left, right) =>
      (input.ratings[right.id] ?? 0) - (input.ratings[left.id] ?? 0)
      || timesChosen(right.id) - timesChosen(left.id)
      || left.name.localeCompare(right.name, 'ru'))
    .slice(0, 1)
    .map((mix): ForYouCard<M> => {
      take(mix);
      return { mix, reason: { kind: 'again', rating: input.ratings[mix.id] ?? null, timesChosen: timesChosen(mix.id) } };
    });

  // «Шаг в сторону» — ведущий профиль, которого не было в истории, с лучшим сродством
  // к любимым профилям. Без lift > 1 — ближайший по сродству с нейтральной причиной.
  const pairing = (mix: M) => {
    const to = leadingById.get(mix.id)!;
    let best = { from: '', value: NEUTRAL_AFFINITY };
    for (const from of favoriteProfiles.filter((profile) => profile !== to)) {
      const value = input.affinity[affinityKey(from, to)] ?? NEUTRAL_AFFINITY;
      if (!best.from || value > best.value) best = { from, value };
    }
    return best;
  };
  const unchosen = input.mixes.filter((mix) => !chosen.has(mix.id));
  const novel = unchosen.filter((mix) => !historyLeading.has(leadingById.get(mix.id)!));
  const sidestepPool = (novel.length ? novel : unchosen).filter(fits);
  const sidestepMix = [...sidestepPool].sort((left, right) => pairing(right).value - pairing(left).value || byScore(left, right))[0];
  const sidestep: ForYouCard<M>[] = [];
  if (sidestepMix) {
    take(sidestepMix);
    const { from, value } = pairing(sidestepMix);
    const to = leadingById.get(sidestepMix.id)!;
    sidestep.push({
      mix: sidestepMix,
      reason: value > NEUTRAL_AFFINITY && novel.includes(sidestepMix)
        ? { kind: 'sidestep', fromProfile: from, toProfile: to }
        : { kind: 'sidestep-neutral', toProfile: to },
    });
  }

  // «Новое в вашем вкусе» — герой и три строки из невыбранных, по совпадению со вкусом.
  const fresh: ForYouCard<M>[] = [];
  for (const mix of [...unchosen].sort(byScore)) {
    if (fresh.length === FRESH_COUNT) break;
    if (!fits(mix)) continue;
    take(mix);
    const profiles = mix.flavorProfiles
      .filter((profile) => (taste[profile] ?? 0) > 0)
      .sort((left, right) => (taste[right] ?? 0) - (taste[left] ?? 0))
      .slice(0, 2);
    const like = newestFirst(input.history).find((entry) => leadingOfEntry(entry) === leadingById.get(mix.id));
    fresh.push({
      mix,
      reason: {
        kind: 'taste',
        profiles,
        flavors: mix.flavors.filter((flavor) => likedFlavors.has(flavor)).slice(0, 2),
        likeMixName: like?.name ?? null,
      },
    });
  }

  return {
    mode: 'personal',
    fresh,
    sidestep,
    again,
    hint: sidestep.length ? buildHint(input.history, leadingOfEntry) : null,
  };
};
