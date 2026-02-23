import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, FlavorProfile } from '@prisma/client';

const prisma = new PrismaClient();

type TobaccoSeed = {
  manufacturer: string;
  website?: string | null;
  name: string;
  strength: number;
  line?: string | null;
  description?: string | null;
  flavorTags: string[];
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

const normalize = (value: string) => value.toLowerCase();

// Heuristic mapping from flavor tags to FlavorProfile enum values.
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
    'maracu',
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
    'марула',
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
    'кола'
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
    'бергамот'
  ],
  spicy: [
    'spicy',
    'spice',
    'ginger',
    'pepper',
    'пряност',
    'имбир'
  ],
  fresh: [
    'fresh',
    'mint',
    'menthol',
    'ice',
    'cool',
    'мят',
    'ментол',
    'лед',
    'холод'
  ],
  dessert: [
    'cream',
    'milk',
    'dessert',
    'vanilla',
    'coconut',
    'сливк',
    'молок',
    'ваниль',
    'кокос'
  ],
  tobacco: ['tobacco', 'табак', 'cigar', 'сигар']
};

const deriveFlavorProfiles = (tags: string[]) => {
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

    const flavorProfiles = deriveFlavorProfiles(tobacco.flavorTags);

    await prisma.tobacco.upsert({
      where: {
        manufacturerId_name: {
          manufacturerId,
          name: tobacco.name
        }
      },
      update: {
        strength: tobacco.strength,
        line: tobacco.line ?? null,
        description: tobacco.description ?? null,
        flavorTags: tobacco.flavorTags,
        flavorProfiles
      },
      create: {
        manufacturerId,
        name: tobacco.name,
        strength: tobacco.strength,
        line: tobacco.line ?? null,
        description: tobacco.description ?? null,
        flavorTags: tobacco.flavorTags,
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
        }
      });
      if (!tobacco) {
        throw new Error(`Missing tobacco: ${component.manufacturer} ${tobaccoName}`);
      }

      for (const profile of tobacco.flavorProfiles) {
        mixProfileSet.add(profile);
      }

      mixComponents.set(
        tobacco.id,
        (mixComponents.get(tobacco.id) ?? 0) + component.proportion
      );
    }

    const componentList = Array.from(mixComponents.entries()).map(
      ([tobaccoId, proportion]) => ({ tobaccoId, proportion })
    );
    const tags = Array.from(
      new Set(
        [...(mix.tags ?? []), ...extractTagsFromDescription(mix.description)].map((item) =>
          item.trim().toLowerCase(),
        ),
      ),
    ).filter((item) => item.length > 0);
    const flavorProfiles = Array.from(mixProfileSet);

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
