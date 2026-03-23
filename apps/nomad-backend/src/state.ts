import { mixes as seedMixes, tobaccos as seedTobaccos } from './catalog';
import type { Tobacco } from './catalog';
import { getNomadDailyCodeWindow } from './daily-code';
import { prisma } from './db';
import { createSecretHash } from './auth';

export type RailType = 'statistical' | 'prepared' | 'curated';

export type IntroCard = {
  id: string;
  step: number;
  title: string;
  description: string;
  bullets: string[];
};

export type MixComponentView = {
  id: string;
  name: string;
  manufacturer: string;
  flavors: string[];
  proportion: number;
};

export type MixView = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  components: MixComponentView[];
  avgRating: number;
  ratingsCount: number;
  popularity: number;
  available: boolean;
  guestVisible: boolean;
  createdAt: string;
};

export type RailView = {
  id: string;
  name: string;
  description: string;
  type: RailType;
  active: boolean;
  mixIds: string[];
  mixes: MixView[];
  isSystem: boolean;
};

export type SmokeCtaEvent = {
  mixId: string;
  createdAt: string;
};

export type MixInput = {
  name: string;
  description: string;
  componentIds: string[];
  available?: boolean;
  popularity?: number;
  baseAvgRating?: number;
};

export type MixPatch = Partial<
  Pick<MixInput, 'name' | 'description' | 'componentIds' | 'available' | 'popularity' | 'baseAvgRating'>
>;

export type RailInput = {
  name: string;
  description: string;
  type?: RailType;
  mixIds: string[];
  active?: boolean;
};

export type RailPatch = Partial<Pick<RailInput, 'name' | 'description' | 'type' | 'mixIds' | 'active'>>;

type SeedIntroCard = IntroCard;
type SeedRail = {
  id: string;
  name: string;
  description: string;
  type: Exclude<RailType, 'statistical'>;
  mixIds: string[];
  active: boolean;
  isSystem: boolean;
};

type SeedStaffAccount = {
  id: string;
  login: string;
  password: string;
  passwordSalt: string;
  name: string;
  role: 'admin' | 'nomad';
  active: boolean;
};

type SeedDailyAccessCode = {
  id: string;
  code: string;
  codeValue: string;
  codeSalt: string;
  codeLabel: string;
  active: boolean;
};

type SeedTelegramRecipient = {
  id: string;
  chatId: string;
  label: string;
  scope: 'allowed' | 'broadcast' | 'rotate';
  active: boolean;
};

const introCards: SeedIntroCard[] = [
  {
    id: 'intro-onboarding',
    step: 1,
    title: 'Расскажите, что хочется покурить',
    description: 'Профили вкуса и любимые ноты помогают собрать рекомендации под текущее настроение.',
    bullets: ['Можно выбрать несколько профилей и вкусов.', 'Рекомендации учитывают наличие табаков.'],
  },
  {
    id: 'intro-mix-card',
    step: 2,
    title: 'Смотрите витрину и подборки',
    description: 'После рекомендаций можно перейти в витрину, открыть подборки от мастеров и изучить весь каталог.',
    bullets: ['Есть готовые подборки и рейлы от наших мастеров.', 'Карточка микса открывается отдельно и не требует прокрутки вниз.'],
  },
  {
    id: 'intro-catalog',
    step: 3,
    title: 'Открывайте каталог',
    description: 'Если хочется посмотреть больше вариантов, каталог покажет миксы по вкусам, профилям и табакам.',
    bullets: ['Фильтры помогают быстро сузить выбор.', 'Каталог подсвечивает миксы под ваши текущие предпочтения.'],
  },
  {
    id: 'intro-invite',
    step: 4,
    title: 'Перейдём в Арома Ателье',
    description: 'Сейчас соберём ваш первый подбор и покажем витрину, с которой удобно начать выбор.',
    bullets: ['Откройте карточку микса и выберите вариант для мастера.', 'Дальше останется только показать экран и оформить заказ.'],
  },
];

const seedStaffAccounts: SeedStaffAccount[] = [
  {
    id: 'staff-admin',
    login: 'admin',
    password: 'admin',
    passwordSalt: 'seed:staff-admin',
    name: 'Admin',
    role: 'admin',
    active: true,
  },
  {
    id: 'staff-nomad',
    login: 'nomad',
    password: 'nomad',
    passwordSalt: 'seed:staff-nomad',
    name: 'Nomad Staff',
    role: 'nomad',
    active: true,
  },
];

const seedDailyAccessCodes: SeedDailyAccessCode[] = [
  {
    id: 'daily-code-default',
    code: 'NOMAD-2026',
    codeValue: 'NOMAD-2026',
    codeSalt: 'seed:daily-code-default',
    codeLabel: 'Базовый daily code',
    active: true,
  },
];

const seedTelegramRecipients: SeedTelegramRecipient[] = [];

const defaultRails: SeedRail[] = [
  {
    id: 'rail-prepared-fresh-line',
    name: 'Быстрый старт',
    description: 'Лёгкие и понятные миксы для первого выбора в зале.',
    type: 'prepared',
    mixIds: ['mix-citrus-scout', 'mix-apple-wave', 'mix-berry-dawn'],
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-prepared-sweet-line',
    name: 'Мягкая витрина',
    description: 'Сладкие, фруктовые и спокойные сочетания для длинного вечера.',
    type: 'prepared',
    mixIds: ['mix-silk-road', 'mix-grape-atelier', 'mix-iced-plum-night'],
    active: true,
    isSystem: false,
  },
  {
    id: 'rail-curated-evening-choice',
    name: 'От наших мастеров',
    description: 'Подборка, которую команда зала советует для более выразительного вкуса.',
    type: 'curated',
    mixIds: ['mix-amber-bazaar', 'mix-dark-market', 'mix-rose-afterglow'],
    active: true,
    isSystem: false,
  },
];

let bootstrapPromise: Promise<void> | null = null;

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeToken = (value: string) => value.trim().toLowerCase();

const slugify = (value: string) =>
  normalizeToken(value)
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';

const serializeList = (items: string[]) => JSON.stringify(unique(items.map((item) => item.trim()).filter(Boolean)));

const parseList = (value: string | null | undefined) => {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const isRailType = (value: string): value is RailType =>
  value === 'statistical' || value === 'prepared' || value === 'curated';

const mixViewSort = (left: MixView, right: MixView) => {
  if (right.avgRating !== left.avgRating) {
    return right.avgRating - left.avgRating;
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity;
  }

  return left.name.localeCompare(right.name, 'ru');
};

const mapTobacco = (record: {
  id: string;
  name: string;
  manufacturer: string;
  flavorProfiles: string;
  flavors: string;
  inStock: boolean;
}) => ({
  id: record.id,
  name: record.name,
  manufacturer: record.manufacturer,
  flavorProfiles: parseList(record.flavorProfiles),
  flavors: parseList(record.flavors),
  inStock: record.inStock,
});

const getMixFlavorShape = (components: Array<{ tobacco: { flavorProfiles: string; flavors: string; flavorTags: string } }>) => ({
  flavorProfiles: unique(components.flatMap((item) => parseList(item.tobacco.flavorProfiles))),
  flavors: unique(components.flatMap((item) => parseList(item.tobacco.flavors))),
  flavorTags: unique(components.flatMap((item) => parseList(item.tobacco.flavorTags))),
});

const mapMixView = (record: {
  id: string;
  name: string;
  description: string;
  available: boolean;
  popularity: number;
  baseAvgRating: number;
  createdAt: Date;
  flavorProfiles: string;
  flavors: string;
  flavorTags: string;
  components: Array<{
    tobaccoId: string;
    proportion: number;
    tobacco: {
      id: string;
      name: string;
      manufacturer: string;
      flavorProfiles: string;
      flavors: string;
      flavorTags: string;
      inStock: boolean;
    };
  }>;
  ratings: Array<{ value: number }>;
}): MixView => {
  const componentIds = record.components.map((item) => item.tobaccoId);
  const flavorShape = getMixFlavorShape(record.components);
  const ratingsCount = record.ratings.length;
  const avgRating = ratingsCount
    ? Number((record.ratings.reduce((sum, item) => sum + item.value, 0) / ratingsCount).toFixed(1))
    : Number(record.baseAvgRating.toFixed(1));
  const guestVisible = record.available && record.components.every((item) => item.tobacco.inStock);

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    componentIds,
    flavorProfiles: flavorShape.flavorProfiles.length ? flavorShape.flavorProfiles : parseList(record.flavorProfiles),
    flavors: flavorShape.flavors.length ? flavorShape.flavors : parseList(record.flavors),
    flavorTags: flavorShape.flavorTags.length ? flavorShape.flavorTags : parseList(record.flavorTags),
    components: record.components.map((item) => ({
      id: item.tobacco.id,
      name: item.tobacco.name,
      manufacturer: item.tobacco.manufacturer,
      flavors: parseList(item.tobacco.flavors),
      proportion: item.proportion,
    })),
    avgRating,
    ratingsCount,
    popularity: record.popularity,
    available: record.available,
    guestVisible,
    createdAt: record.createdAt.toISOString(),
  };
};

const fetchMixViews = async () => {
  const records = await prisma.nomadMix.findMany({
    include: {
      components: {
        orderBy: { sortOrder: 'asc' },
        include: {
          tobacco: true,
        },
      },
      ratings: {
        select: {
          value: true,
        },
      },
    },
  });

  return records.map(mapMixView);
};

const validateMixComponents = async (componentIds: string[]) => {
  const normalized = unique(componentIds.map((id) => id.trim()).filter(Boolean));
  if (!normalized.length) {
    return { error: 'At least one component is required', componentIds: [] as string[] };
  }

  const tobaccos = await prisma.nomadTobacco.findMany({
    where: {
      id: {
        in: normalized,
      },
    },
    select: {
      id: true,
      flavorProfiles: true,
      flavors: true,
      flavorTags: true,
    },
  });

  const missing = normalized.filter((componentId) => !tobaccos.some((item) => item.id === componentId));
  if (missing.length) {
    return { error: `Unknown component ids: ${missing.join(', ')}`, componentIds: [] as string[] };
  }

  return {
    componentIds: normalized,
    flavorProfiles: unique(tobaccos.flatMap((item) => parseList(item.flavorProfiles))),
    flavors: unique(tobaccos.flatMap((item) => parseList(item.flavors))),
    flavorTags: unique(tobaccos.flatMap((item) => parseList(item.flavorTags))),
  };
};

const validateMixInput = async (payload: Partial<MixInput>) => {
  const name = payload.name?.trim();
  const description = payload.description?.trim();

  if (!name || !description) {
    return { error: 'Name and description are required' };
  }

  const componentValidation = await validateMixComponents(payload.componentIds ?? []);
  if ('error' in componentValidation) {
    return { error: componentValidation.error };
  }

  return {
    name,
    description,
    componentIds: componentValidation.componentIds,
    flavorProfiles: componentValidation.flavorProfiles,
    flavors: componentValidation.flavors,
    flavorTags: componentValidation.flavorTags,
    available: payload.available ?? true,
    popularity: typeof payload.popularity === 'number' ? payload.popularity : 0,
    baseAvgRating: typeof payload.baseAvgRating === 'number' ? payload.baseAvgRating : 4.5,
  };
};

const normalizeRailMixIds = async (mixIds: string[]) => {
  const normalized = unique(mixIds.map((id) => id.trim()).filter(Boolean));
  if (!normalized.length) {
    return { error: 'At least one mix is required', mixIds: [] as string[] };
  }

  const mixes = await prisma.nomadMix.findMany({
    where: {
      id: {
        in: normalized,
      },
    },
    select: {
      id: true,
    },
  });

  const missing = normalized.filter((mixId) => !mixes.some((item) => item.id === mixId));
  if (missing.length) {
    return { error: `Unknown mix ids: ${missing.join(', ')}`, mixIds: [] as string[] };
  }

  return { mixIds: normalized };
};

const validateRailInput = async (payload: Partial<RailInput>) => {
  const name = payload.name?.trim();
  const description = payload.description?.trim();
  const type = payload.type;

  if (!name || !description) {
    return { error: 'Name and description are required' };
  }

  if (type && type === 'statistical') {
    return { error: 'Statistical rails are read-only' };
  }

  const railType: Exclude<RailType, 'statistical'> = type ?? 'prepared';
  const railMixIds = await normalizeRailMixIds(payload.mixIds ?? []);
  if ('error' in railMixIds) {
    return { error: railMixIds.error };
  }

  return {
    name,
    description,
    type: railType,
    mixIds: railMixIds.mixIds,
    active: payload.active ?? true,
  };
};

const nextMixId = async (name: string) => {
  const prefix = `mix-${slugify(name)}`;
  const total = await prisma.nomadMix.count({
    where: {
      id: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}-${total + 1}`;
};

const nextRailId = async (name: string) => {
  const prefix = `rail-${slugify(name)}`;
  const total = await prisma.nomadRail.count({
    where: {
      id: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}-${total + 1}`;
};

const seedNomadStorage = async () => {
  const currentCodeWindow = getNomadDailyCodeWindow();

  await prisma.$transaction(async (tx) => {
    await tx.nomadSmokeCtaEvent.deleteMany();
    await tx.nomadMixRating.deleteMany();
    await tx.nomadRailMix.deleteMany();
    await tx.nomadMixComponent.deleteMany();
    await tx.nomadRail.deleteMany();
    await tx.nomadMix.deleteMany();
    await tx.nomadTobacco.deleteMany();
    await tx.nomadIntroCard.deleteMany();
    await tx.nomadDailyAccessCode.deleteMany();
    await tx.nomadTelegramRecipient.deleteMany();
    await tx.nomadTelegramAutomationState.deleteMany();
    await tx.nomadAuditEvent.deleteMany();
    await tx.nomadStaffAccount.deleteMany();

    await tx.nomadStaffAccount.createMany({
      data: seedStaffAccounts.map((account) => ({
        id: account.id,
        login: account.login,
        passwordHash: createSecretHash(account.password, account.passwordSalt),
        passwordSalt: account.passwordSalt,
        name: account.name,
        role: account.role,
        active: account.active,
      })),
    });

    await tx.nomadDailyAccessCode.createMany({
      data: seedDailyAccessCodes.map((code) => ({
        id: code.id,
        codeValue: code.code,
        codeHash: createSecretHash(code.code, code.codeSalt),
        codeSalt: code.codeSalt,
        codeLabel: code.codeLabel,
        active: code.active,
        startsAt: currentCodeWindow.startsAt,
        endsAt: currentCodeWindow.endsAt,
      })),
    });

    await tx.nomadTelegramRecipient.createMany({
      data: seedTelegramRecipients.map((recipient) => ({
        id: recipient.id,
        chatId: recipient.chatId,
        label: recipient.label,
        scope: recipient.scope,
        active: recipient.active,
      })),
    });

    await tx.nomadIntroCard.createMany({
      data: introCards.map((card) => ({
        id: card.id,
        step: card.step,
        title: card.title,
        description: card.description,
        bullets: serializeList(card.bullets),
      })),
    });

    await tx.nomadTobacco.createMany({
      data: seedTobaccos.map((tobacco) => ({
        id: tobacco.id,
        manufacturer: tobacco.manufacturer,
        name: tobacco.name,
        description: null,
        flavorProfiles: serializeList(tobacco.flavorProfiles),
        flavors: serializeList(tobacco.flavors),
        flavorTags: '[]',
        inStock: tobacco.inStock,
      })),
    });

    await tx.nomadMix.createMany({
      data: seedMixes.map((mix) => {
        const components = mix.componentIds
          .map((componentId) => seedTobaccos.find((item) => item.id === componentId))
          .filter((item): item is (typeof seedTobaccos)[number] => Boolean(item));

        return {
          id: mix.id,
          name: mix.name,
          description: mix.description,
          flavorProfiles: serializeList(unique(components.flatMap((item) => item.flavorProfiles))),
          flavors: serializeList(unique(components.flatMap((item) => item.flavors))),
          flavorTags: '[]',
          available: true,
          popularity: mix.popularity,
          baseAvgRating: mix.avgRating,
        };
      }),
    });

    await tx.nomadMixComponent.createMany({
      data: seedMixes.flatMap((mix) =>
        mix.componentIds.map((componentId, index) => ({
          mixId: mix.id,
          tobaccoId: componentId,
          proportion: Math.round(100 / Math.max(1, mix.componentIds.length)),
          sortOrder: index,
        })),
      ),
    });

    await tx.nomadRail.createMany({
      data: defaultRails.map((rail) => ({
        id: rail.id,
        name: rail.name,
        description: rail.description,
        type: rail.type,
        active: rail.active,
        isSystem: rail.isSystem,
      })),
    });

    await tx.nomadRailMix.createMany({
      data: defaultRails.flatMap((rail) =>
        rail.mixIds.map((mixId, index) => ({
          railId: rail.id,
          mixId,
          sortOrder: index,
        })),
      ),
    });
  });
};

export const ensureNomadState = async () => {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
    const tobaccoCount = await prisma.nomadTobacco.count();
    if (!tobaccoCount) {
      await seedNomadStorage();
    }
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
};

export const resetNomadState = async () => {
  await seedNomadStorage();
};

export const getGuestIntroCards = async () => {
  await ensureNomadState();

  const records = await prisma.nomadIntroCard.findMany({
    orderBy: {
      step: 'asc',
    },
  });

  return records.map((record) => ({
    id: record.id,
    step: record.step,
    title: record.title,
    description: record.description,
    bullets: parseList(record.bullets),
  }));
};

export const getInventoryTobaccos = async () => {
  await ensureNomadState();

  const records = await prisma.nomadTobacco.findMany({
    orderBy: [
      { inStock: 'desc' },
      { name: 'asc' },
    ],
  });

  return records.map(mapTobacco);
};

export const getTobaccoById = async (id: string) => {
  await ensureNomadState();

  const tobacco = await prisma.nomadTobacco.findUnique({
    where: { id },
  });

  return tobacco ? mapTobacco(tobacco) : null;
};

export const updateTobaccoInStock = async (id: string, inStock: boolean) => {
  await ensureNomadState();

  const current = await prisma.nomadTobacco.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const updated = await prisma.nomadTobacco.update({
    where: { id },
    data: { inStock },
  });

  return mapTobacco(updated);
};

export const getAvailableMixCatalog = async () => {
  await ensureNomadState();
  return (await fetchMixViews()).sort(mixViewSort);
};

export const getMixById = async (id: string) => {
  const mixes = await getAvailableMixCatalog();
  return mixes.find((mix) => mix.id === id) ?? null;
};

export const getGuestCatalogMixes = async (filters?: { profiles?: string[]; flavors?: string[] }) => {
  const profiles = unique((filters?.profiles ?? []).map(normalizeToken).filter(Boolean));
  const flavors = unique((filters?.flavors ?? []).map(normalizeToken).filter(Boolean));

  return (await getAvailableMixCatalog())
    .filter((mix) => mix.guestVisible)
    .filter((mix) => {
      const profileMatches = !profiles.length || mix.flavorProfiles.some((profile) => profiles.includes(normalizeToken(profile)));
      const flavorMatches = !flavors.length || mix.flavors.some((flavor) => flavors.includes(normalizeToken(flavor)));
      return profileMatches && flavorMatches;
    })
    .sort((left, right) => {
      const leftMatches = [
        ...left.flavorProfiles.map(normalizeToken).filter((profile) => profiles.includes(profile)),
        ...left.flavors.map(normalizeToken).filter((flavor) => flavors.includes(flavor)),
      ].length;
      const rightMatches = [
        ...right.flavorProfiles.map(normalizeToken).filter((profile) => profiles.includes(profile)),
        ...right.flavors.map(normalizeToken).filter((flavor) => flavors.includes(flavor)),
      ].length;

      if (rightMatches !== leftMatches) {
        return rightMatches - leftMatches;
      }

      return mixViewSort(left, right);
    });
};

const buildStatisticalRail = async (): Promise<RailView> => {
  const [mixes, events] = await Promise.all([
    getAvailableMixCatalog(),
    prisma.nomadSmokeCtaEvent.findMany({
      select: {
        mixId: true,
      },
    }),
  ]);

  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const ranked = mixes
    .filter((mix) => mix.guestVisible)
    .map((mix) => ({
      mix,
      smokeCtaCount: counts[mix.id] ?? 0,
    }))
    .sort((left, right) => {
      if (right.smokeCtaCount !== left.smokeCtaCount) {
        return right.smokeCtaCount - left.smokeCtaCount;
      }

      if (right.mix.avgRating !== left.mix.avgRating) {
        return right.mix.avgRating - left.mix.avgRating;
      }

      if (right.mix.popularity !== left.mix.popularity) {
        return right.mix.popularity - left.mix.popularity;
      }

      return left.mix.id.localeCompare(right.mix.id);
    })
    .slice(0, 3)
    .map(({ mix }) => mix);

  return {
    id: 'rail-statistical-top',
    name: 'Больше всего выбирают',
    description: 'Миксы, которые выбирают чаще всего и лучше оценивают гости.',
    type: 'statistical',
    active: true,
    mixIds: ranked.map((mix) => mix.id),
    mixes: ranked,
    isSystem: true,
  };
};

const buildRailViews = async (guestOnly: boolean) => {
  await ensureNomadState();

  const [mixes, rails] = await Promise.all([
    getAvailableMixCatalog(),
    prisma.nomadRail.findMany({
      where: guestOnly
        ? {
            active: true,
            isSystem: false,
          }
        : undefined,
      include: {
        mixes: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: [
        { active: 'desc' },
        { updatedAt: 'desc' },
      ],
    }),
  ]);

  const mixMap = new Map(mixes.map((mix) => [mix.id, mix]));

  return rails
    .filter((rail) => !rail.isSystem)
    .map((rail) => {
      const type = isRailType(rail.type) ? rail.type : 'prepared';
      const mixIds = rail.mixes.map((item) => item.mixId);
      const railMixes = mixIds
        .map((mixId) => mixMap.get(mixId))
        .filter((mix): mix is MixView => Boolean(mix))
        .filter((mix) => (guestOnly ? mix.guestVisible : true));

      return {
        id: rail.id,
        name: rail.name,
        description: rail.description,
        type,
        active: rail.active,
        mixIds,
        mixes: railMixes,
        isSystem: rail.isSystem,
      } satisfies RailView;
    });
};

export const getGuestHomeRails = async () => {
  const rails = [await buildStatisticalRail(), ...(await buildRailViews(true))];
  return rails.filter((rail) => rail.type === 'statistical' || rail.mixes.length > 0);
};

export const getStaffMixes = async () => getAvailableMixCatalog();

export const createMix = async (payload: Partial<MixInput>) => {
  await ensureNomadState();

  const validated = await validateMixInput(payload);
  if ('error' in validated) {
    return validated;
  }

  const id = await nextMixId(validated.name);

  await prisma.$transaction(async (tx) => {
    await tx.nomadMix.create({
      data: {
        id,
        name: validated.name,
        description: validated.description,
        flavorProfiles: serializeList(validated.flavorProfiles),
        flavors: serializeList(validated.flavors),
        flavorTags: serializeList(validated.flavorTags),
        available: validated.available,
        popularity: validated.popularity,
        baseAvgRating: validated.baseAvgRating,
      },
    });

    await tx.nomadMixComponent.createMany({
      data: validated.componentIds.map((componentId, index) => ({
        mixId: id,
        tobaccoId: componentId,
        proportion: Math.round(100 / Math.max(1, validated.componentIds.length)),
        sortOrder: index,
      })),
    });
  });

  return getMixById(id);
};

export const updateMix = async (id: string, payload: MixPatch) => {
  await ensureNomadState();

  const current = await prisma.nomadMix.findUnique({
    where: { id },
    include: {
      components: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!current) {
    return null;
  }

  const nextName = typeof payload.name === 'string' ? payload.name.trim() : current.name;
  const nextDescription = typeof payload.description === 'string' ? payload.description.trim() : current.description;

  if (!nextName || !nextDescription) {
    return { error: 'Name and description are required' };
  }

  const nextComponentIds = Array.isArray(payload.componentIds)
    ? payload.componentIds
    : current.components.map((item) => item.tobaccoId);
  const componentValidation = await validateMixComponents(nextComponentIds);
  if ('error' in componentValidation) {
    return { error: componentValidation.error };
  }

  await prisma.$transaction(async (tx) => {
    await tx.nomadMix.update({
      where: { id },
      data: {
        name: nextName,
        description: nextDescription,
        flavorProfiles: serializeList(componentValidation.flavorProfiles),
        flavors: serializeList(componentValidation.flavors),
        flavorTags: serializeList(componentValidation.flavorTags),
        available: typeof payload.available === 'boolean' ? payload.available : current.available,
        popularity: typeof payload.popularity === 'number' ? payload.popularity : current.popularity,
        baseAvgRating: typeof payload.baseAvgRating === 'number' ? payload.baseAvgRating : current.baseAvgRating,
      },
    });

    if (Array.isArray(payload.componentIds)) {
      await tx.nomadMixComponent.deleteMany({
        where: { mixId: id },
      });

      await tx.nomadMixComponent.createMany({
        data: componentValidation.componentIds.map((componentId, index) => ({
          mixId: id,
          tobaccoId: componentId,
          proportion: Math.round(100 / Math.max(1, componentValidation.componentIds.length)),
          sortOrder: index,
        })),
      });
    }
  });

  return getMixById(id);
};

export const getStaffRails = async () => [await buildStatisticalRail(), ...(await buildRailViews(false))];

export const createRail = async (payload: Partial<RailInput>) => {
  await ensureNomadState();

  const validated = await validateRailInput(payload);
  if ('error' in validated) {
    return validated;
  }

  const id = await nextRailId(validated.name);

  await prisma.$transaction(async (tx) => {
    await tx.nomadRail.create({
      data: {
        id,
        name: validated.name,
        description: validated.description,
        type: validated.type,
        active: validated.active,
        isSystem: false,
      },
    });

    await tx.nomadRailMix.createMany({
      data: validated.mixIds.map((mixId, index) => ({
        railId: id,
        mixId,
        sortOrder: index,
      })),
    });
  });

  return (await getStaffRails()).find((rail) => rail.id === id) ?? null;
};

export const updateRail = async (id: string, payload: RailPatch) => {
  await ensureNomadState();

  if (id === 'rail-statistical-top') {
    return { error: 'Statistical rail is read-only' };
  }

  const current = await prisma.nomadRail.findUnique({
    where: { id },
    include: {
      mixes: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!current) {
    return null;
  }

  const nextName = typeof payload.name === 'string' ? payload.name.trim() : current.name;
  const nextDescription = typeof payload.description === 'string' ? payload.description.trim() : current.description;

  if (!nextName || !nextDescription) {
    return { error: 'Name and description are required' };
  }

  const nextType = payload.type ?? (isRailType(current.type) ? current.type : 'prepared');
  if (nextType === 'statistical') {
    return { error: 'Statistical rails are read-only' };
  }

  const nextMixIds = Array.isArray(payload.mixIds)
    ? payload.mixIds
    : current.mixes.map((item) => item.mixId);
  const railMixIds = await normalizeRailMixIds(nextMixIds);
  if ('error' in railMixIds) {
    return { error: railMixIds.error };
  }

  await prisma.$transaction(async (tx) => {
    await tx.nomadRail.update({
      where: { id },
      data: {
        name: nextName,
        description: nextDescription,
        type: nextType,
        active: typeof payload.active === 'boolean' ? payload.active : current.active,
      },
    });

    if (Array.isArray(payload.mixIds)) {
      await tx.nomadRailMix.deleteMany({
        where: { railId: id },
      });

      await tx.nomadRailMix.createMany({
        data: railMixIds.mixIds.map((mixId, index) => ({
          railId: id,
          mixId,
          sortOrder: index,
        })),
      });
    }
  });

  return (await getStaffRails()).find((rail) => rail.id === id) ?? null;
};

export const recordSmokeCtaEvent = async (mixId: string) => {
  await ensureNomadState();

  const event = await prisma.nomadSmokeCtaEvent.create({
    data: { mixId },
  });

  return {
    mixId: event.mixId,
    createdAt: event.createdAt.toISOString(),
  } satisfies SmokeCtaEvent;
};

export const getSmokeCtaEvents = async () => {
  await ensureNomadState();

  const events = await prisma.nomadSmokeCtaEvent.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  return events.map((event) => ({
    mixId: event.mixId,
    createdAt: event.createdAt.toISOString(),
  }));
};

export const rateMix = async (id: string, value: number) => {
  await ensureNomadState();

  const mix = await prisma.nomadMix.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!mix) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return { error: 'Rating value must be between 1 and 5' };
  }

  await prisma.nomadMixRating.create({
    data: {
      mixId: id,
      value,
      source: 'guest',
    },
  });

  return getMixById(id);
};

export const getInventorySummary = async () => {
  await ensureNomadState();

  const [total, inStockCount] = await Promise.all([
    prisma.nomadTobacco.count(),
    prisma.nomadTobacco.count({
      where: {
        inStock: true,
      },
    }),
  ]);

  return {
    total,
    inStockCount,
    outOfStockCount: total - inStockCount,
  };
};

export const getSmokeCtaSummary = async () => {
  await ensureNomadState();

  const [mixes, events] = await Promise.all([
    getAvailableMixCatalog(),
    prisma.nomadSmokeCtaEvent.findMany({
      select: {
        mixId: true,
      },
    }),
  ]);

  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const topMixes = mixes
    .map((mix) => ({
      mixId: mix.id,
      mixName: mix.name,
      count: counts[mix.id] ?? 0,
      avgRating: mix.avgRating,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      return left.mixId.localeCompare(right.mixId);
    });

  return {
    smokeCtaTotal: events.length,
    topMixes,
  };
};
