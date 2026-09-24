import { createHash } from 'node:crypto';
import { createCustomMixSmokeEvent, getAllTobaccos, getAvailableMixCatalog } from './state';
import type {
  GuestCustomMixSmokeResponse,
  GuestMixerEvaluateResponse,
  GuestMixerHint,
  GuestMixerPaletteResponse,
} from './types';

type PaletteTobacco = GuestMixerPaletteResponse['tobaccos'][number];

export type MixerTobacco = PaletteTobacco & {
  officialStrength: string | null;
  communityStrength: string | null;
};

export type BowlComponent = { tobacco: MixerTobacco; proportion: number };

export type BowlInput = Array<{ tobaccoId: string; proportion: number }>;

export type Affinity = Record<string, number>;

type Character = GuestMixerEvaluateResponse['character'];

type SimilarCandidate = {
  id: string;
  name: string;
  avgRating: number;
  flavorProfiles: string[];
  components: Array<{ tobaccoId: string; proportion: number }>;
};

// Так тег холодка называет синк htreviews (integrations/htreviews/taxonomy.ts).
const COOLING_TAG = 'охлаждающий';
const TWIST_PROFILES = ['minty', 'spicy'];

const NEUTRAL_AFFINITY = 0.5;
const UNMET_AFFINITY = 0.3;
const MET_AFFINITY_FLOOR = 0.6;

const MONO_HARMONY = 70;
const MAX_COOLING = 20;
const MIN_BASE = 35;
const MAX_TWIST = 25;
const SIMILARITY_THRESHOLD = 30;

const unique = <T>(items: T[]) => Array.from(new Set(items));
const normalize = (value: string) => value.trim().toLowerCase();
const round2 = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const affinityKey = (left: string, right: string) => [left, right].sort().join('|');

// Сродство — насколько часто профили разных компонентов одной чаши встречаются
// вместе в миксах мастера. Нормируем по самой частой паре. Пара известных
// профилей, которую мастер ни разу не сводил, опускается ниже нейтрали: это
// слабый сигнал «не сочетают», а не отсутствие данных.
export const buildAffinity = (mixes: string[][][], profiles: string[]): Affinity => {
  const known = new Set<string>();
  const pairCounts = new Map<string, number>();

  for (const components of mixes) {
    const pairs = new Set<string>();
    components.forEach((left, index) => {
      left.forEach((profile) => known.add(profile));
      for (const right of components.slice(index + 1)) {
        left.forEach((a) => right.forEach((b) => pairs.add(affinityKey(a, b))));
      }
    });
    pairs.forEach((key) => pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1));
  }

  const maxCount = Math.max(0, ...pairCounts.values());
  const sorted = unique(profiles).sort();
  const affinity: Affinity = {};

  sorted.forEach((left, index) => {
    for (const right of sorted.slice(index)) {
      const key = affinityKey(left, right);
      const count = pairCounts.get(key) ?? 0;

      if (!known.has(left) || !known.has(right)) {
        affinity[key] = NEUTRAL_AFFINITY;
      } else if (!count) {
        affinity[key] = UNMET_AFFINITY;
      } else {
        affinity[key] = round2(MET_AFFINITY_FLOOR + (1 - MET_AFFINITY_FLOOR) * (count / maxCount));
      }
    }
  });

  return affinity;
};

const componentAffinity = (left: MixerTobacco, right: MixerTobacco, affinity: Affinity) => {
  const leftProfiles = unique(left.flavorProfiles.map(normalize));
  const rightProfiles = unique(right.flavorProfiles.map(normalize));
  if (!leftProfiles.length || !rightProfiles.length) {
    return NEUTRAL_AFFINITY;
  }

  const values = leftProfiles.flatMap((a) =>
    rightProfiles.map((b) => affinity[affinityKey(a, b)] ?? NEUTRAL_AFFINITY),
  );
  return sum(values) / values.length;
};

// Роли задаёт порядок ходов: основа, акцент, штрих. Штрих — роль третьего
// компонента, а не признак табака: пряный акцент не должен штрафоваться.
export const harmonyOf = (components: BowlComponent[], affinity: Affinity) => {
  if (components.length === 1) {
    return { harmony: MONO_HARMONY, hints: [{ kind: 'mono' }] as GuestMixerHint[] };
  }

  let weighted = 0;
  let weights = 0;
  components.forEach((left, index) => {
    for (const right of components.slice(index + 1)) {
      const weight = left.proportion * right.proportion;
      weighted += weight * componentAffinity(left.tobacco, right.tobacco, affinity);
      weights += weight;
    }
  });

  // Нейтральное сродство 0,5 даёт те же 70, что и моно-чаша.
  let harmony = 40 + 60 * (weighted / weights);
  const hints: GuestMixerHint[] = [];

  const cooling = sum(components.filter((item) => item.tobacco.cooling).map((item) => item.proportion));
  if (cooling > MAX_COOLING) {
    hints.push({ kind: 'too-cold', value: cooling });
    harmony -= (cooling - MAX_COOLING) * 0.5;
  }

  const base = components[0]!.proportion;
  if (base < MIN_BASE) {
    hints.push({ kind: 'weak-base' });
    harmony -= (MIN_BASE - base) * 0.6;
  }

  const twist = components[2]?.proportion ?? 0;
  if (twist > MAX_TWIST) {
    hints.push({ kind: 'heavy-twist' });
    harmony -= (twist - MAX_TWIST) * 0.5;
  }

  return { harmony: Math.max(0, Math.min(100, Math.round(harmony))), hints };
};

export const verdictOf = (harmony: number): GuestMixerEvaluateResponse['verdict'] => {
  if (harmony >= 85) return 'classic';
  if (harmony >= 70) return 'confident';
  if (harmony >= 55) return 'bold';
  return 'ask-master';
};

const PROFILE_CHARACTER: Record<string, Partial<Character>> = {
  sweet: { sweet: 1 },
  dessert: { sweet: 0.7, dense: 0.6 },
  fruity: { sweet: 0.5, sour: 0.2 },
  berry: { sweet: 0.5, sour: 0.3 },
  citrus: { sour: 0.8, fresh: 0.4 },
  sour: { sour: 1 },
  fresh: { fresh: 1 },
  minty: { fresh: 1 },
  spicy: { dense: 0.7 },
  tobacco: { dense: 1 },
  floral_herbal: { fresh: 0.4, dense: 0.2 },
  perfume: { sweet: 0.3, dense: 0.4 },
};

// Шкала htreviews (parser.ts) плюс словесные формы из карточек производителей.
const STRENGTH_LEVELS: Record<string, number> = {
  'легкая': 0,
  'средне-легкая': 0.25,
  'ниже средней': 0.25,
  'средняя': 0.5,
  'средне-крепкая': 0.75,
  'выше средней': 0.75,
  'крепкая': 1,
};

const strengthLevel = (value: string | null) =>
  value ? STRENGTH_LEVELS[normalize(value).replace(/ё/g, 'е').replace(/\s*-\s*/g, '-')] : undefined;

const tobaccoCharacter = (tobacco: MixerTobacco): Character => {
  const vectors = tobacco.flavorProfiles
    .map((profile) => PROFILE_CHARACTER[normalize(profile)])
    .filter((vector): vector is Partial<Character> => Boolean(vector));
  const mean = (axis: keyof Character) =>
    vectors.length ? sum(vectors.map((vector) => vector[axis] ?? 0)) / vectors.length : 0;

  const character = { sweet: mean('sweet'), sour: mean('sour'), fresh: mean('fresh'), dense: mean('dense') };
  const strength = strengthLevel(tobacco.communityStrength) ?? strengthLevel(tobacco.officialStrength);
  if (strength !== undefined) {
    character.dense = (character.dense + strength) / 2;
  }
  return character;
};

export const characterOf = (components: BowlComponent[]): Character => {
  const total: Character = { sweet: 0, sour: 0, fresh: 0, dense: 0 };
  for (const component of components) {
    const character = tobaccoCharacter(component.tobacco);
    const share = component.proportion / 100;
    total.sweet += character.sweet * share;
    total.sour += character.sour * share;
    total.fresh += character.fresh * share;
    total.dense += character.dense * share;
  }
  return {
    sweet: round2(total.sweet),
    sour: round2(total.sour),
    fresh: round2(total.fresh),
    dense: round2(total.dense),
  };
};

// Ноты берутся как есть — в картотеке они уже в именительном падеже.
export const nameOf = (components: BowlComponent[]) => {
  const [base, ...rest] = components;
  const noted = [base!, ...rest.filter((item) => !item.tobacco.cooling)];
  const iced = rest.some((item) => item.tobacco.cooling);
  const notes = unique(noted.map((item) => item.tobacco.flavors[0]?.trim() || item.tobacco.name));

  const joined = notes.length === 1 ? notes[0]! : `${notes.slice(0, -1).join(', ')} и ${notes[notes.length - 1]}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}${iced ? ' со льдом' : ''}`;
};

export const findSimilarMix = (
  components: BowlComponent[],
  mixes: SimilarCandidate[],
): GuestMixerEvaluateResponse['similarMix'] => {
  const bowlShares = new Map(components.map((item) => [item.tobacco.id, item.proportion]));
  const bowlProfiles = new Set(components.flatMap((item) => item.tobacco.flavorProfiles.map(normalize)));

  let best: NonNullable<GuestMixerEvaluateResponse['similarMix']> | null = null;
  for (const mix of mixes) {
    const total = sum(mix.components.map((item) => item.proportion));
    const shared = sum(
      mix.components.map((item) => Math.min(bowlShares.get(item.tobaccoId) ?? 0, (item.proportion / total) * 100)),
    );

    const mixProfiles = new Set(mix.flavorProfiles.map(normalize));
    const union = new Set([...bowlProfiles, ...mixProfiles]).size;
    const overlap = [...bowlProfiles].filter((profile) => mixProfiles.has(profile)).length;
    const jaccard = union ? overlap / union : 0;

    const similarity = Math.round(0.7 * shared + 0.3 * jaccard * 100);
    if (
      similarity >= SIMILARITY_THRESHOLD
      && (!best || similarity > best.similarity || (similarity === best.similarity && mix.avgRating > best.avgRating))
    ) {
      best = { id: mix.id, name: mix.name, avgRating: mix.avgRating, similarity };
    }
  }

  return best;
};

const loadMixer = async () => {
  const tobaccos = await getAllTobaccos();
  const mixes = await getAvailableMixCatalog();
  // Сродство и счётчики строим по всем опубликованным миксам, а не только по
  // тем, что сейчас в наличии: знание мастера о сочетаниях от склада не зависит.
  const published = mixes.filter((mix) => mix.available);
  const profilesById = new Map(tobaccos.map((item) => [item.id, item.flavorProfiles.map(normalize)]));

  const palette: MixerTobacco[] = tobaccos
    .filter((item) => item.inStock && !item.archived)
    .map((item) => {
      const cooling = item.flavorTags.some((tag) => normalize(tag) === COOLING_TAG);
      return {
        id: item.id,
        manufacturer: item.manufacturer,
        name: item.name,
        flavorProfiles: item.flavorProfiles,
        flavors: item.flavors,
        flavorTags: item.flavorTags,
        cooling,
        twist: cooling || item.flavorProfiles.some((profile) => TWIST_PROFILES.includes(normalize(profile))),
        mixCount: published.filter((mix) => mix.componentIds.includes(item.id)).length,
        officialStrength: item.officialStrength,
        communityStrength: item.communityStrength,
      };
    })
    .sort((left, right) =>
      left.manufacturer.localeCompare(right.manufacturer, 'ru') || left.name.localeCompare(right.name, 'ru'),
    );

  const affinity = buildAffinity(
    published.map((mix) => mix.componentIds.map((id) => profilesById.get(id) ?? [])),
    palette.flatMap((item) => item.flavorProfiles.map(normalize)),
  );

  return { palette, affinity, guestMixes: mixes.filter((mix) => mix.guestVisible) };
};

export const getMixerPalette = async (): Promise<GuestMixerPaletteResponse> => {
  const { palette, affinity } = await loadMixer();
  return {
    tobaccos: palette.map(({ officialStrength, communityStrength, ...item }) => item),
    affinity,
  };
};

export const parseBowlInput = (body: unknown): BowlInput | { error: string } => {
  const components = (body as { components?: unknown } | null | undefined)?.components;
  if (!Array.isArray(components) || components.length < 1 || components.length > 3) {
    return { error: 'Bowl must have from 1 to 3 components' };
  }

  const parsed: BowlInput = [];
  for (const component of components as Array<{ tobaccoId?: unknown; proportion?: unknown } | null>) {
    const tobaccoId = typeof component?.tobaccoId === 'string' ? component.tobaccoId.trim() : '';
    const proportion = component?.proportion;
    if (!tobaccoId) {
      return { error: 'Tobacco id is required' };
    }
    if (typeof proportion !== 'number' || !Number.isInteger(proportion) || proportion < 5 || proportion % 5 !== 0) {
      return { error: 'Proportion must be a multiple of 5, at least 5' };
    }
    if (parsed.some((item) => item.tobaccoId === tobaccoId)) {
      return { error: 'Tobaccos must not repeat' };
    }
    parsed.push({ tobaccoId, proportion });
  }

  if (sum(parsed.map((item) => item.proportion)) !== 100) {
    return { error: 'Proportions must total exactly 100' };
  }

  return parsed;
};

export type UnavailableTobacco = { unavailableTobaccoId: string };

// Недоступен табак, которого нет в палитре: не найден, не в наличии или в архиве.
type ResolvedBowl = Awaited<ReturnType<typeof loadMixer>> & { components: BowlComponent[] };

const resolveBowl = async (input: BowlInput): Promise<ResolvedBowl | UnavailableTobacco> => {
  const mixer = await loadMixer();
  const byId = new Map(mixer.palette.map((item) => [item.id, item]));

  const components: BowlComponent[] = [];
  for (const item of input) {
    const tobacco = byId.get(item.tobaccoId);
    if (!tobacco) {
      return { unavailableTobaccoId: item.tobaccoId };
    }
    components.push({ tobacco, proportion: item.proportion });
  }

  return { ...mixer, components };
};

export const evaluateBowl = async (input: BowlInput): Promise<GuestMixerEvaluateResponse | UnavailableTobacco> => {
  const bowl = await resolveBowl(input);
  if ('unavailableTobaccoId' in bowl) {
    return bowl;
  }

  const { components, affinity, guestMixes } = bowl;
  const { harmony, hints } = harmonyOf(components, affinity);
  return {
    harmony,
    verdict: verdictOf(harmony),
    hints,
    character: characterOf(components),
    name: nameOf(components),
    similarMix: findSimilarMix(components, guestMixes),
  };
};

// --- «Покурить» на гостевом миксе -------------------------------------------

export type MixerSwipe = { turn: 0 | 1 | 2; tobaccoId: string; direction: 'left' | 'right' };

export type CustomMixSmokeInput = { components: BowlInput; name: string | null; swipes: MixerSwipe[] };

const MAX_NAME_LENGTH = 60;
const MAX_SWIPES = 500;

const parseSwipes = (swipes: unknown): MixerSwipe[] | null => {
  if (swipes === undefined || swipes === null) {
    return [];
  }
  if (!Array.isArray(swipes) || swipes.length > MAX_SWIPES) {
    return null;
  }

  const parsed: MixerSwipe[] = [];
  for (const swipe of swipes as Array<Record<string, unknown> | null>) {
    const { turn, tobaccoId, direction } = swipe ?? {};
    if (
      (turn !== 0 && turn !== 1 && turn !== 2)
      || typeof tobaccoId !== 'string'
      || !tobaccoId
      || (direction !== 'left' && direction !== 'right')
    ) {
      return null;
    }
    parsed.push({ turn, tobaccoId, direction });
  }
  return parsed;
};

export const parseCustomMixSmokeInput = (body: unknown): CustomMixSmokeInput | { error: string } => {
  const components = parseBowlInput(body);
  if ('error' in components) {
    return components;
  }

  const { name, swipes } = body as { name?: unknown; swipes?: unknown };
  const parsedSwipes = parseSwipes(swipes);
  if (!parsedSwipes) {
    return { error: `Swipes must be a list of up to ${MAX_SWIPES} { turn: 0-2, tobaccoId, direction: left|right }` };
  }

  // Array.from режет по кодовым точкам, чтобы не разорвать эмодзи пополам.
  const trimmed = typeof name === 'string' ? Array.from(name.trim()).slice(0, MAX_NAME_LENGTH).join('').trim() : '';
  return { components, name: trimmed || null, swipes: parsedSwipes };
};

// Сигнатура — набор табаков без долей и порядка: по ней сводятся одинаковые чаши.
export const signatureOf = (tobaccoIds: string[]) =>
  createHash('sha1').update([...tobaccoIds].sort().join('|')).digest('hex');

export const recordCustomMixSmoke = async (
  input: CustomMixSmokeInput,
): Promise<GuestCustomMixSmokeResponse | UnavailableTobacco> => {
  const bowl = await resolveBowl(input.components);
  if ('unavailableTobaccoId' in bowl) {
    return bowl;
  }

  const { components, affinity } = bowl;
  const { harmony } = harmonyOf(components, affinity);
  const signature = signatureOf(components.map((item) => item.tobacco.id));
  const { id } = await createCustomMixSmokeEvent({
    components: components.map(({ tobacco, proportion }) => ({
      tobaccoId: tobacco.id,
      manufacturer: tobacco.manufacturer,
      name: tobacco.name,
      proportion,
    })),
    signature,
    name: input.name ?? nameOf(components),
    harmony,
    swipes: input.swipes,
  });

  return { id, signature, harmony };
};
