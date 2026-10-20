// Правило выбора сцены рилса (#153, design/design_handoff_reels — «Правило выбора сцены»).
// Профили у миксов прода раздуты (4–8 штук) и не упорядочены по силе, поэтому сцена
// берётся из flavors; профили — запасной путь, flavorTags не используются.

// general — общая сцена, когда ни один вкус не узнан (решение владельца 2026-10-20).
export type SceneMotif = 'frost' | 'bloom' | 'juicy' | 'berry' | 'warm' | 'smoke' | 'general';

type FlavorMotif = Exclude<SceneMotif, 'general'>;

/** c1/c2 — id профилей: цвет сцены и цвет фигур второго мотива. */
export type ReelSceneSpec = { primary: SceneMotif; secondary: SceneMotif | null; c1: string; c2: string };

type Motif = { profile: string; alt: string; words: string[] };

// Словарь пополняется по мере появления новых вкусов в каталоге. Совпадение — по подстроке.
// Порядок ключей важен: при полном равенстве побеждает мотив выше.
const MOTIFS: Record<FlavorMotif, Motif> = {
  frost: { profile: 'minty', alt: 'fresh', words: ['холодок', 'мята', 'ментол', 'лёд', 'лед', 'ледян'] },
  bloom: {
    profile: 'floral_herbal',
    alt: 'perfume',
    words: ['цветочн', 'лаванда', 'ромашка', 'роза', 'бузина', 'жасмин', 'хвойн', 'базилик', 'тархун', 'травян', 'можжевельник', 'чай'],
  },
  juicy: {
    profile: 'citrus',
    alt: 'fruity',
    words: [
      'лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот', 'ананас', 'манго', 'банан', 'киви',
      'персик', 'яблоко', 'груша', 'арбуз', 'дыня', 'кокос', 'марула', 'кола', 'энергетик', 'огурец',
    ],
  },
  berry: {
    profile: 'berry',
    alt: 'fruity',
    words: ['малина', 'клубника', 'черника', 'вишня', 'ежевика', 'голубика', 'клюква', 'смородина', 'барбарис', 'виноград', 'ягод', 'ревень'],
  },
  warm: {
    profile: 'dessert',
    alt: 'spicy',
    words: [
      'ваниль', 'шоколад', 'какао', 'печенье', 'пирог', 'чизкейк', 'тирамису', 'молоко', 'булочка', 'корица',
      'кардамон', 'перец', 'кашмир', 'мед', 'мёд', 'орех', 'орчата', 'ром', 'жвачка',
    ],
  },
  smoke: { profile: 'tobacco', alt: 'spicy', words: ['табачн', 'сигар', 'бекон', 'томат', 'копчен'] },
};

const CITRUS = ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот'];
const SPICE = ['корица', 'кардамон', 'перец', 'кашмир'];

const countHits = (flavors: string[], words: string[]) => flavors.filter((flavor) => words.some((word) => flavor.includes(word))).length;

export function pickScene(mix: { flavors: string[]; flavorProfiles: string[] }): ReelSceneSpec {
  const flavors = mix.flavors.map((flavor) => flavor.toLowerCase());
  const scored = (Object.keys(MOTIFS) as FlavorMotif[])
    .map((id) => {
      const first = flavors.findIndex((flavor) => MOTIFS[id].words.some((word) => flavor.includes(word)));
      return { id, count: countHits(flavors, MOTIFS[id].words), first };
    })
    .filter((motif) => motif.count > 0)
    // Холод перебивает всё: самое яркое ощущение, и это пример клиента.
    .sort((a, b) => Number(b.id === 'frost') - Number(a.id === 'frost') || b.count - a.count || a.first - b.first);

  const colorOf = (id: FlavorMotif) => {
    if (id === 'juicy') return countHits(flavors, CITRUS) > 0 ? 'citrus' : 'fruity';
    if (id === 'warm') return countHits(flavors, SPICE) >= countHits(flavors, MOTIFS.warm.words) / 2 ? 'spicy' : 'dessert';
    return MOTIFS[id].profile;
  };

  if (scored.length === 0) {
    // Мотив вкуса по одному профилю не угадываем: профили у миксов раздуты и не
    // упорядочены. Неизвестный или пустой профиль — запасной цвет getProfileColor.
    const profile = mix.flavorProfiles[0] ?? '';
    return { primary: 'general', secondary: null, c1: profile, c2: profile };
  }

  const primary = scored[0].id;
  const secondary = scored[1]?.id ?? null;
  return { primary, secondary, c1: colorOf(primary), c2: secondary ? colorOf(secondary) : MOTIFS[primary].alt };
}
