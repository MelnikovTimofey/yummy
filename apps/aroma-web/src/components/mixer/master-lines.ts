import type { PaletteTobacco, Turn, Verdict } from '@/lib/mixer/types';

// Реплики мастера на экране «Намиксуй». Тексты пишет владелец продукта (#128):
// по одной или несколько фраз на ключ, `{name}` подставляется там, где есть
// имя. Пустой ключ — мастер молчит, на экране остаётся прошлая реплика.
// Границы тона — .claude/skills/aroma-atelier-design/readme.md, раздел «Юмор».

export type MasterLineKey =
  | 'turn.base'
  | 'turn.accent'
  | 'turn.twist'
  | 'take.base.berry'
  | 'take.base.citrus'
  | 'take.base.dessert'
  | 'take.base.fresh'
  | 'take.base.minty'
  | 'take.base.fruity'
  | 'take.base.spicy'
  | 'take.base.tobacco'
  | 'take.base.floral_herbal'
  | 'take.base.sweet'
  | 'take.base.sour'
  | 'take.base.perfume'
  | 'take.accent.classic'
  | 'take.accent.confident'
  | 'take.accent.bold'
  | 'take.accent.ask-master'
  | 'take.twist.cooling'
  | 'take.twist.spicy'
  | 'skip'
  | 'skip.streak10'
  | 'deck.loop'
  | 'deck.empty'
  | 'rewind'
  | 'twist.skipped'
  | 'luck'
  | 'split.too-cold'
  | 'split.weak-base'
  | 'reveal.similar'
  | 'reveal.unique'
  | 'master-card';

export type MasterLines = Record<MasterLineKey, string[]>;

export const masterLines: MasterLines = {
  // Начало хода «Основа».
  'turn.base': [],
  // Начало хода «Акцент».
  'turn.accent': [],
  // Начало хода «Штрих».
  'turn.twist': [],

  // Взяли основу — по первому профилю табака.
  'take.base.berry': [],
  'take.base.citrus': [],
  'take.base.dessert': [],
  'take.base.fresh': [],
  'take.base.minty': [],
  'take.base.fruity': [],
  'take.base.spicy': [],
  'take.base.tobacco': [],
  'take.base.floral_herbal': [],
  'take.base.sweet': [],
  'take.base.sour': [],
  'take.base.perfume': [],

  // Взяли акцент — по ступени совпадения с чашей: 85+ / 70+ / 55+ / ниже.
  'take.accent.classic': [],
  'take.accent.confident': [],
  'take.accent.bold': [],
  'take.accent.ask-master': [],

  // Взяли штрих: с холодком (или мятный) / пряный.
  'take.twist.cooling': [],
  'take.twist.spicy': [],

  // Пропуск карты — звучит изредка, примерно на каждый пятый.
  skip: [],
  // Десятый пропуск подряд.
  'skip.streak10': [],
  // Колода пошла по второму кругу.
  'deck.loop': [],
  // На выбранных полках пусто.
  'deck.empty': [],
  // Вернули пропущенную карту.
  rewind: [],
  // «Без штриха».
  'twist.skipped': [],
  // «Доверюсь мастеру».
  luck: [],

  // После правки долей: холодка больше 20% / основа меньше 35%.
  'split.too-cold': [],
  'split.weak-base': [],

  // Раскрытие: есть похожий микс (`{name}` — его название) / похожего нет.
  'reveal.similar': [],
  'reveal.unique': [],

  // Подпись на карточке для мастера.
  'master-card': [],
};

export const pickMasterLine = (
  key: MasterLineKey,
  vars: Record<string, string> = {},
  rng: () => number = Math.random,
  lines: MasterLines = masterLines,
): string | null => {
  const options = lines[key];
  if (!options.length) {
    return null;
  }
  const line = options[Math.floor(rng() * options.length)];
  return line.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
};

const SKIP_LINE_CHANCE = 0.2;

export const skipLineKey = (streak: number, rng: () => number = Math.random): MasterLineKey | null => {
  if (streak === 10) return 'skip.streak10';
  return rng() < SKIP_LINE_CHANCE ? 'skip' : null;
};

// Реплика на «беру»: основа — по первому профилю табака, акцент — по ступени
// совпадения с чашей, штрих — холодок (или мятный) либо пряный.
export const takeLineKey = (
  turn: Turn,
  tobacco: Pick<PaletteTobacco, 'flavorProfiles' | 'cooling'>,
  verdict: Verdict,
): MasterLineKey | null => {
  const profiles = tobacco.flavorProfiles.map((profile) => profile.trim().toLowerCase());
  if (turn === 0) {
    const key = `take.base.${profiles[0]}`;
    return key in masterLines ? (key as MasterLineKey) : null;
  }
  if (turn === 1) {
    return `take.accent.${verdict}`;
  }
  if (tobacco.cooling || profiles.includes('minty')) return 'take.twist.cooling';
  if (profiles.includes('spicy')) return 'take.twist.spicy';
  return null;
};
