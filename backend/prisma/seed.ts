import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, FlavorProfile } from '@prisma/client';

const prisma = new PrismaClient();

type TobaccoSeed = {
  manufacturer: string;
  website?: string | null;
  name: string;
  strength: number;
  description?: string | null;
  flavorTags: string[];
  flavors?: string[];
  // legacy compatibility
  flavor?: string[];
  sources?: string[];
};

type MixComponentSeed = {
  manufacturer: string;
  tobacco: string;
  proportion: number;
};

type MixSeed = {
  name: string;
  authorEmail: string;
  description?: string | null;
  tags?: string[];
  isUserMix?: boolean;
  components: MixComponentSeed[];
  sources?: string[];
};

const seedDir = path.join(__dirname, '..', 'seed');
const tobaccosPath = path.join(seedDir, 'tobaccos.json');
const mixesPath = path.join(seedDir, 'mixes.json');

const normalize = (value: string) => value.toLowerCase().trim();
const dedupe = <T>(items: T[]) => Array.from(new Set(items));
const normalizeList = (items: string[]) => dedupe(items.map((item) => normalize(item)).filter(Boolean));

const profileKeywords: Record<FlavorProfile, string[]> = {
  sweet: ['sweet', 'dessert', 'candy', 'cola', 'дыня', 'арбуз', 'манго', 'ананас', 'груша', 'яблок'],
  sour: ['sour', 'кисл'],
  spicy: ['spicy', 'spice', 'ginger', 'pepper', 'пряност', 'имбир', 'перец', 'кардамон', 'корица'],
  fresh: ['fresh', 'mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод', 'эвкалипт'],
  dessert: ['cream', 'milk', 'dessert', 'vanilla', 'coconut', 'сливк', 'молок', 'ваниль', 'кокос', 'печенье'],
  tobacco: ['tobacco', 'табак', 'cigar', 'сигар'],
  minty: ['mint', 'menthol', 'ice', 'cool', 'мят', 'ментол', 'лед', 'холод', 'эвкалипт'],
  fruity: [
    'fruit',
    'tropic',
    'melon',
    'watermelon',
    'mango',
    'pineapple',
    'pear',
    'apple',
    'grape',
    'peach',
    'kiwi',
    'фрукт',
    'тропич',
    'дыня',
    'арбуз',
    'манго',
    'ананас',
    'груша',
    'яблок',
    'виноград',
    'персик',
    'киви',
  ],
  floral_herbal: ['floral', 'herbal', 'tea', 'flower', 'цвет', 'цветоч', 'трав', 'чай', 'лемонграсс', 'фиалк', 'бузин'],
  citrus: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'bergamot', 'цитрус', 'лимон', 'лайм', 'апельсин', 'грейпфрут'],
  berry: ['berry', 'berries', 'strawberry', 'raspberry', 'blueberry', 'currant', 'ягод', 'клубник', 'малин', 'смородин', 'черник', 'ежевик', 'клюкв'],
  perfume: ['perfume', 'parfum', 'парфюм', 'дух', 'пудров', 'винтажн'],
};

const profileOnlyTagKeywords = [
  'цветоч',
  'травян',
  'цитрус',
  'ягод',
  'фрукт',
  'мят',
  'табач',
  'десерт',
  'пря',
  'парфюм',
  'вкусы',
];

const normalizeMetaTag = (value: string): string | null => {
  if (value.includes('редк')) {
    return 'редкие';
  }
  if (value.includes('напит') || value.includes('газиров') || value.includes('алког')) {
    return 'напитки';
  }
  if (value.includes('мят') || value.includes('ментол') || value.includes('холод') || value.includes('лед')) {
    return 'охлаждающий';
  }

  return null;
};

const deriveFlavorProfiles = (values: string[]) => {
  const normalizedValues = normalizeList(values);
  const matched = new Set<FlavorProfile>();

  for (const [profile, keywords] of Object.entries(profileKeywords)) {
    for (const keyword of keywords) {
      if (normalizedValues.some((value) => value.includes(keyword))) {
        matched.add(profile as FlavorProfile);
        break;
      }
    }
  }

  return Array.from(matched);
};

const deriveFlavor = (inputFlavor: string[] | undefined, inputFlavorTags: string[]) => {
  const direct = normalizeList(inputFlavor ?? []);
  const sanitizedDirect = direct.filter((raw) => {
    if (normalizeMetaTag(raw)) {
      return false;
    }
    if (profileOnlyTagKeywords.some((keyword) => raw.includes(keyword))) {
      return false;
    }
    return true;
  });
  if (sanitizedDirect.length) {
    return sanitizedDirect;
  }

  const inferred: string[] = [];
  for (const raw of normalizeList(inputFlavorTags)) {
    if (normalizeMetaTag(raw)) {
      continue;
    }
    if (profileOnlyTagKeywords.some((keyword) => raw.includes(keyword))) {
      continue;
    }
    inferred.push(raw);
  }

  return dedupe(inferred);
};

const deriveTobaccoFlavorTags = (inputFlavorTags: string[], flavor: string[], description?: string | null) => {
  const flavorSet = new Set(flavor);
  const tags: string[] = [];

  for (const raw of normalizeList(inputFlavorTags)) {
    if (flavorSet.has(raw)) {
      continue;
    }

    const normalized = normalizeMetaTag(raw);
    if (normalized) {
      tags.push(normalized);
    }
  }

  if (description) {
    const fromDescription = normalizeMetaTag(normalize(description));
    if (fromDescription) {
      tags.push(fromDescription);
    }
  }

  return dedupe(tags);
};

const extractTagsFromDescription = (description?: string | null) => {
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

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;

const ensureSeedUser = async (email: string) =>
  prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });

const upsertManufacturers = async (tobaccos: TobaccoSeed[]) => {
  const unique = new Map<string, string | null>();
  for (const tobacco of tobaccos) {
    if (!unique.has(tobacco.manufacturer)) {
      unique.set(tobacco.manufacturer, tobacco.website ?? null);
    }
  }

  const manufacturers = new Map<string, string>();
  for (const [name, website] of unique) {
    const saved = await prisma.manufacturer.upsert({
      where: { name },
      update: { website },
      create: { name, website }
    });
    manufacturers.set(name, saved.id);
  }

  return manufacturers;
};

const upsertTobaccos = async (
  tobaccos: TobaccoSeed[],
  manufacturerIds: Map<string, string>
) => {
  for (const tobacco of tobaccos) {
    const manufacturerId = manufacturerIds.get(tobacco.manufacturer);
    if (!manufacturerId) {
      throw new Error(`Missing manufacturer: ${tobacco.manufacturer}`);
    }

    const rawFlavorTags = normalizeList(tobacco.flavorTags ?? []);
    const flavors = deriveFlavor(tobacco.flavors ?? tobacco.flavor, rawFlavorTags);
    const flavorTags = deriveTobaccoFlavorTags(rawFlavorTags, flavors, tobacco.description);
    const flavorProfiles = deriveFlavorProfiles([
      ...flavors,
      ...rawFlavorTags,
      ...(tobacco.description ? [tobacco.description] : []),
    ]);

    await prisma.tobacco.upsert({
      where: {
        manufacturerId_name: {
          manufacturerId,
          name: tobacco.name
        }
      },
      update: {
        strength: tobacco.strength,
        description: tobacco.description ?? null,
        flavorTags,
        flavors,
        flavorProfiles
      },
      create: {
        manufacturerId,
        name: tobacco.name,
        strength: tobacco.strength,
        description: tobacco.description ?? null,
        flavorTags,
        flavors,
        flavorProfiles
      }
    });
  }
};

const upsertMixes = async (mixes: MixSeed[]) => {
  const nameOverrides: Record<string, string> = {
    CACAO: 'Cacao',
    Cinnamon: 'Cinnamon Roll',
    'Earl Gray': 'Earl Grey',
    'Garnet Grape': 'Ruby Grape',
    'Must have Estragon': 'Estragon',
    Peppermint: 'Ice Mint',
    Rocket: 'Rocketman',
  };

  const normalizeTobaccoName = (name: string) => nameOverrides[name] ?? name;

  for (const mix of mixes) {
    const author = await ensureSeedUser(mix.authorEmail);

    const mixComponents = new Map<string, number>();
    const mixProfileSet = new Set<FlavorProfile>();
    const mixFlavorSet = new Set<string>();
    const mixTagSet = new Set<string>(
      [...(mix.tags ?? []), ...extractTagsFromDescription(mix.description)]
        .map((item) => normalize(item))
        .filter((item) => item.length > 0),
    );

    for (const component of mix.components) {
      const tobaccoName = normalizeTobaccoName(component.tobacco);
      const manufacturer = await prisma.manufacturer.findUnique({
        where: { name: component.manufacturer }
      });
      if (!manufacturer) {
        throw new Error(`Missing manufacturer: ${component.manufacturer}`);
      }

      const tobacco = await prisma.tobacco.findUnique({
        where: {
          manufacturerId_name: {
            manufacturerId: manufacturer.id,
            name: tobaccoName
          }
        },
        select: {
          id: true,
          flavorProfiles: true,
          flavors: true,
          flavorTags: true,
        },
      });
      if (!tobacco) {
        throw new Error(`Missing tobacco: ${component.manufacturer} ${tobaccoName}`);
      }

      for (const profile of tobacco.flavorProfiles) {
        mixProfileSet.add(profile);
      }

      for (const item of tobacco.flavors) {
        mixFlavorSet.add(normalize(item));
      }

      for (const tag of tobacco.flavorTags) {
        mixTagSet.add(normalize(tag));
      }

      mixComponents.set(
        tobacco.id,
        (mixComponents.get(tobacco.id) ?? 0) + component.proportion
      );
    }

    const componentList = Array.from(mixComponents.entries()).map(
      ([tobaccoId, proportion]) => ({ tobaccoId, proportion })
    );
    const tags = Array.from(mixTagSet).filter((item) => item.length > 0);
    const flavorProfiles = Array.from(mixProfileSet);
    const flavors = Array.from(mixFlavorSet);

    const existing = await prisma.mix.findFirst({
      where: {
        name: mix.name,
        authorId: author.id
      }
    });

    if (existing) {
      await prisma.mixComponent.deleteMany({
        where: { mixId: existing.id }
      });

      await prisma.mix.update({
        where: { id: existing.id },
        data: {
          description: mix.description ?? null,
          tags,
          flavorProfiles,
          flavors,
          isUserMix: mix.isUserMix ?? false,
          components: {
            create: componentList
          }
        }
      });
    } else {
      await prisma.mix.create({
        data: {
          name: mix.name,
          description: mix.description ?? null,
          tags,
          flavorProfiles,
          flavors,
          isUserMix: mix.isUserMix ?? false,
          authorId: author.id,
          components: {
            create: componentList
          }
        }
      });
    }
  }
};

const main = async () => {
  if (!fs.existsSync(tobaccosPath)) {
    throw new Error(`Seed file not found: ${tobaccosPath}`);
  }
  if (!fs.existsSync(mixesPath)) {
    throw new Error(`Seed file not found: ${mixesPath}`);
  }

  const tobaccos = readJson<TobaccoSeed[]>(tobaccosPath);
  const mixes = readJson<MixSeed[]>(mixesPath);

  const manufacturerIds = await upsertManufacturers(tobaccos);
  await upsertTobaccos(tobaccos, manufacturerIds);
  await upsertMixes(mixes);
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
