import { FlavorProfile } from '../../../../backend/node_modules/@prisma/client';

const normalize = (value: string) => value.toLowerCase().trim();

const profileKeywords: Record<FlavorProfile, string[]> = {
  sweet: [
    'sweet',
    'dessert',
    'berry',
    'fruit',
    'candy',
    'ice cream',
    'melon',
    'watermelon',
    'mango',
    'pineapple',
    'passion',
    'pear',
    'apple',
    'grape',
    'cherry',
    'cola',
    'дыня',
    'арбуз',
    'манго',
    'ананас',
    'маракуй',
    'груша',
    'яблок',
    'виноград',
    'вишн',
    'черешн',
    'ягод',
    'малина',
    'брусника',
    'барбарис',
    'лимонад',
    'кола',
  ],
  sour: [
    'sour',
    'citrus',
    'lemon',
    'lime',
    'orange',
    'grapefruit',
    'bergamot',
    'кисл',
    'цитрус',
    'лимон',
    'лайм',
    'апельсин',
    'грейпфрут',
    'бергамот',
  ],
  spicy: ['spicy', 'spice', 'ginger', 'pepper', 'пряност', 'имбир'],
  fresh: ['fresh', 'mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод'],
  dessert: ['cream', 'milk', 'dessert', 'vanilla', 'coconut', 'сливк', 'молок', 'ваниль', 'кокос'],
  tobacco: ['tobacco', 'табак', 'cigar', 'сигар'],
};

const nameOverrides: Record<string, string> = {
  CACAO: 'Cacao',
  Cinnamon: 'Cinnamon Roll',
  'Earl Gray': 'Earl Grey',
  'Garnet Grape': 'Ruby Grape',
  'Must have Estragon': 'Estragon',
  Peppermint: 'Ice Mint',
  Rocket: 'Rocketman',
};

export const normalizeTobaccoName = (name: string) => nameOverrides[name] ?? name;

export const deriveFlavorProfiles = (tags: string[]) => {
  const normalizedTags = tags.map((tag) => normalize(tag));
  const matched = new Set<FlavorProfile>();

  for (const [profile, keywords] of Object.entries(profileKeywords)) {
    for (const keyword of keywords) {
      if (normalizedTags.some((tag) => tag.includes(keyword))) {
        matched.add(profile as FlavorProfile);
        break;
      }
    }
  }

  return Array.from(matched);
};

export const extractTagsFromDescription = (description?: string | null) => {
  if (!description) {
    return [];
  }

  const matches = description.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  return Array.from(
    new Set(
      matches
        .map((tag) => tag.slice(1).trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  );
};

export const dedupe = <T>(items: T[]) => Array.from(new Set(items));
