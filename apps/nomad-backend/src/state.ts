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
  tobaccoId: string;
  name: string;
  manufacturer: string;
  flavors: string[];
  proportion: number;
  sortOrder: number;
};

export type MixRailMembershipView = {
  id: string;
  name: string;
  type: RailType;
  active: boolean;
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
  updatedAt: string;
  railMemberships: MixRailMembershipView[];
  railCount: number;
  activeRailCount: number;
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

export type StaffRailView = RailView & {
  editable: boolean;
  readOnlyReason: string;
};

export type SmokeCtaEvent = {
  mixId: string;
  createdAt: string;
};

export type DashboardWindowKey = '7d' | '14d' | '30d';

export type DashboardWindow = {
  key: DashboardWindowKey;
  label: string;
  days: number;
  startsAt: string;
  endsAt: string;
};

export type DashboardBreakdownItem = {
  key: string;
  label: string;
  total: number;
  inStockCount: number;
  outOfStockCount: number;
};

export type DashboardMixMetric = {
  mixId: string;
  mixName: string;
  smokeCtaCount: number;
  avgRating: number;
  ratingsCount: number;
  popularity: number;
};

export type DashboardRatingDistributionItem = {
  value: number;
  count: number;
};

export type DashboardActivityPoint = {
  date: string;
  smokeCtaCount: number;
  ratingsCount: number;
};

export type DashboardBlockedMix = {
  mixId: string;
  mixName: string;
  missingComponents: string[];
  railNames: string[];
  smokeCtaCount: number;
};

export type DashboardRailHealthItem = {
  railId: string;
  name: string;
  type: RailType;
  active: boolean;
  totalMixCount: number;
  visibleMixCount: number;
  hiddenMixCount: number;
};

export type InventoryStockFilter = 'all' | 'in-stock' | 'out-of-stock';

export type InventorySortField = 'stock' | 'name' | 'manufacturer' | 'updatedAt' | 'dependentMixes';

export type InventorySortDirection = 'asc' | 'desc';

export type InventoryDependentMixView = {
  id: string;
  name: string;
  available: boolean;
  guestVisible: boolean;
  avgRating: number;
  popularity: number;
};

export type InventoryTobaccoView = {
  id: string;
  name: string;
  manufacturer: string;
  lineName: string;
  country: string | null;
  officialStrength: string | null;
  communityStrength: string | null;
  productionStatus: string | null;
  description: string | null;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  inStock: boolean;
  updatedAt: string;
  dependentMixCount: number;
  blockedDependentMixCount: number;
  dependentMixes: InventoryDependentMixView[];
};

export type InventoryListQuery = {
  search?: string;
  stock?: InventoryStockFilter;
  manufacturers?: string[];
  flavorProfiles?: string[];
  flavors?: string[];
  flavorTags?: string[];
  sort?: InventorySortField;
  direction?: InventorySortDirection;
  page?: number;
  pageSize?: number;
};

export type TobaccoInput = {
  manufacturer: string;
  lineName?: string;
  name: string;
  description?: string;
  country?: string;
  officialStrength?: string;
  communityStrength?: string;
  productionStatus?: string;
  flavorProfiles?: string[];
  flavors?: string[];
  flavorTags?: string[];
  inStock?: boolean;
};

export type TobaccoPatch = Partial<TobaccoInput>;

export type MixStatusFilter = 'all' | 'guest-visible' | 'hidden' | 'blocked';

export type MixRailFilter = 'all' | 'in-rails' | 'without-rails';

export type MixSortField = 'popularity' | 'avgRating' | 'name' | 'updatedAt' | 'rails';

export type MixSortDirection = 'asc' | 'desc';

export type MixListQuery = {
  search?: string;
  status?: MixStatusFilter;
  railState?: MixRailFilter;
  manufacturers?: string[];
  flavorProfiles?: string[];
  flavors?: string[];
  flavorTags?: string[];
  sort?: MixSortField;
  direction?: MixSortDirection;
  page?: number;
  pageSize?: number;
};

export type MixListResult = {
  items: MixView[];
  filters: {
    search: string;
    status: MixStatusFilter;
    railState: MixRailFilter;
    manufacturers: string[];
    flavorProfiles: string[];
    flavors: string[];
    flavorTags: string[];
    options: {
      manufacturers: string[];
      flavorProfiles: string[];
      flavors: string[];
      flavorTags: string[];
    };
  };
  sort: {
    field: MixSortField;
    direction: MixSortDirection;
  };
  meta: {
    totalItems: number;
    filteredItems: number;
    guestVisibleCount: number;
    hiddenCount: number;
    blockedCount: number;
    inRailsCount: number;
    withoutRailsCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type InventoryBatchAction = 'set-in-stock' | 'set-out-of-stock' | 'archive';

export type InventoryListResult = {
  items: InventoryTobaccoView[];
  filters: {
    search: string;
    stock: InventoryStockFilter;
    manufacturers: string[];
    flavorProfiles: string[];
    flavors: string[];
    flavorTags: string[];
    options: {
      manufacturers: string[];
      flavorProfiles: string[];
      flavors: string[];
      flavorTags: string[];
    };
  };
  sort: {
    field: InventorySortField;
    direction: InventorySortDirection;
  };
  meta: {
    totalItems: number;
    filteredItems: number;
    inStockCount: number;
    outOfStockCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type InventoryBatchResult = {
  action: Exclude<InventoryBatchAction, 'archive'>;
  ids: string[];
  skippedIds: string[];
  processedCount: number;
  items: InventoryTobaccoView[];
};

export type DashboardSummary = {
  window: DashboardWindow;
  inventory: {
    total: number;
    inStockCount: number;
    outOfStockCount: number;
    manufacturers: DashboardBreakdownItem[];
    flavorProfiles: DashboardBreakdownItem[];
    topFlavors: DashboardBreakdownItem[];
  };
  product: {
    smokeCtaTotal: number;
    ratingsTotal: number;
    avgGuestRating: number;
    topMixes: DashboardMixMetric[];
    topRatedMixes: DashboardMixMetric[];
    ratingDistribution: DashboardRatingDistributionItem[];
    activity: DashboardActivityPoint[];
  };
  ops: {
    guestVisibleMixesCount: number;
    hiddenMixesCount: number;
    blockedByInventoryCount: number;
    activeRailsCount: number;
    emptyActiveRailsCount: number;
    blockedMixes: DashboardBlockedMix[];
    railHealth: DashboardRailHealthItem[];
  };
};

export type MixInput = {
  name: string;
  description: string;
  componentIds?: string[];
  components?: Array<{
    tobaccoId?: string;
    proportion?: number;
    sortOrder?: number;
  }>;
  available?: boolean;
  popularity?: number;
  baseAvgRating?: number;
};

export type MixPatch = Partial<
  Pick<MixInput, 'name' | 'description' | 'componentIds' | 'components' | 'available' | 'popularity' | 'baseAvgRating'>
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

type SeedTelegramOperator = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  linkedChatId?: string | null;
  linkedTelegramUserId?: string | null;
  linkedUsername?: string | null;
  linkedDisplayName?: string | null;
  linkedAt?: string | null;
  lastCodeRequestedAt?: string | null;
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
    title: 'Добро пожаловать в Арома Ателье',
    description: 'Давайте приступим: соберём ваш первый подбор и покажем витрину, с которой удобно начать выбор.',
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

const seedTelegramOperators: SeedTelegramOperator[] = [
  {
    id: 'telegram-operator-anna',
    name: 'Анна',
    phone: '+79991234567',
    active: true,
  },
  {
    id: 'telegram-operator-ilya',
    name: 'Илья',
    phone: '+79997654321',
    active: true,
  },
];

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

const canResetNomadState = () =>
  process.env.NODE_ENV === 'test'
  || process.env.NOMAD_ALLOW_STATE_RESET === '1';

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeToken = (value: string) => value.trim().toLowerCase();

const normalizeOptionalText = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeTextList = (items: string[] | undefined) =>
  unique((items ?? []).map((item) => item.trim()).filter(Boolean));

const slugify = (value: string) =>
  normalizeToken(value)
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';

const dashboardWindowConfig: Record<DashboardWindowKey, { label: string; days: number }> = {
  '7d': { label: '7 дней', days: 7 },
  '14d': { label: '14 дней', days: 14 },
  '30d': { label: '30 дней', days: 30 },
};

const flavorProfileLabels: Record<string, string> = {
  sweet: 'Сладкие',
  sour: 'Кислые',
  spicy: 'Пряные',
  fresh: 'Свежие',
  dessert: 'Десертные',
  tobacco: 'Табачные',
  minty: 'Мятные',
  fruity: 'Фруктовые',
  floral_herbal: 'Цветочно-травяные',
  citrus: 'Цитрусовые',
  berry: 'Ягодные',
  perfume: 'Парфюмные',
};

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

const isDashboardWindowKey = (value: string): value is DashboardWindowKey =>
  value === '7d' || value === '14d' || value === '30d';

const isInventoryStockFilter = (value: string): value is InventoryStockFilter =>
  value === 'all' || value === 'in-stock' || value === 'out-of-stock';

const isInventorySortField = (value: string): value is InventorySortField =>
  value === 'stock' || value === 'name' || value === 'manufacturer' || value === 'updatedAt' || value === 'dependentMixes';

const isInventorySortDirection = (value: string): value is InventorySortDirection => value === 'asc' || value === 'desc';

export const normalizeDashboardWindowKey = (value: unknown): DashboardWindowKey => {
  if (typeof value !== 'string') {
    return '14d';
  }

  return isDashboardWindowKey(value) ? value : '14d';
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toDayKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const buildDashboardWindow = (key: DashboardWindowKey) => {
  const config = dashboardWindowConfig[key];
  const endsAtDate = endOfDay(new Date());
  const startsAtDate = startOfDay(new Date());
  startsAtDate.setDate(startsAtDate.getDate() - (config.days - 1));

  return {
    key,
    label: config.label,
    days: config.days,
    startsAtDate,
    endsAtDate,
    startsAt: startsAtDate.toISOString(),
    endsAt: endsAtDate.toISOString(),
  };
};

const buildInventoryBreakdown = (
  values: Array<{
    key: string;
    label: string;
    inStock: boolean;
  }>,
): DashboardBreakdownItem[] => {
  const stats = new Map<string, DashboardBreakdownItem>();

  for (const value of values) {
    const current = stats.get(value.key) ?? {
      key: value.key,
      label: value.label,
      total: 0,
      inStockCount: 0,
      outOfStockCount: 0,
    };

    current.total += 1;
    if (value.inStock) {
      current.inStockCount += 1;
    } else {
      current.outOfStockCount += 1;
    }

    stats.set(value.key, current);
  }

  return [...stats.values()].sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    if (right.inStockCount !== left.inStockCount) {
      return right.inStockCount - left.inStockCount;
    }

    return left.label.localeCompare(right.label, 'ru');
  });
};

const mapIntroCardRecord = (record: {
  id: string;
  step: number;
  title: string;
  description: string;
  bullets: string;
}): IntroCard => ({
  id: record.id,
  step: record.step,
  title: record.title,
  description: record.description,
  bullets: parseList(record.bullets),
});

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

const syncIntroCards = async () => {
  const existingCards = await prisma.nomadIntroCard.findMany();
  const existingById = new Map(existingCards.map((card) => [card.id, card]));
  const expectedIds = new Set(introCards.map((card) => card.id));

  await prisma.$transaction(async (tx) => {
    for (const staleCard of existingCards) {
      if (!expectedIds.has(staleCard.id)) {
        await tx.nomadIntroCard.delete({
          where: {
            id: staleCard.id,
          },
        });
      }
    }

    for (const card of introCards) {
      const current = existingById.get(card.id);

      if (!current) {
        await tx.nomadIntroCard.create({
          data: {
            id: card.id,
            step: card.step,
            title: card.title,
            description: card.description,
            bullets: serializeList(card.bullets),
          },
        });
        continue;
      }

      const nextBullets = serializeList(card.bullets);
      const needsUpdate =
        current.step !== card.step ||
        current.title !== card.title ||
        current.description !== card.description ||
        current.bullets !== nextBullets;

      if (needsUpdate) {
        await tx.nomadIntroCard.update({
          where: {
            id: card.id,
          },
          data: {
            step: card.step,
            title: card.title,
            description: card.description,
            bullets: nextBullets,
          },
        });
      }
    }
  });
};

const mapTobacco = (record: {
  id: string;
  name: string;
  manufacturer: string;
  lineName: string;
  country: string | null;
  officialStrength: string | null;
  communityStrength: string | null;
  productionStatus: string | null;
  description: string | null;
  flavorProfiles: string;
  flavors: string;
  flavorTags: string;
  inStock: boolean;
  updatedAt: Date;
}) => ({
  id: record.id,
  name: record.name,
  manufacturer: record.manufacturer,
  lineName: record.lineName,
  country: record.country,
  officialStrength: record.officialStrength,
  communityStrength: record.communityStrength,
  productionStatus: record.productionStatus,
  description: record.description,
  flavorProfiles: parseList(record.flavorProfiles),
  flavors: parseList(record.flavors),
  flavorTags: parseList(record.flavorTags),
  inStock: record.inStock,
  updatedAt: record.updatedAt.toISOString(),
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
  updatedAt: Date;
  flavorProfiles: string;
  flavors: string;
  flavorTags: string;
  components: Array<{
    tobaccoId: string;
    proportion: number;
    sortOrder: number;
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
  railMixes: Array<{
    rail: {
      id: string;
      name: string;
      type: string;
      active: boolean;
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
  const railMemberships = record.railMixes.map((item) => ({
    id: item.rail.id,
    name: item.rail.name,
    type: item.rail.type as RailType,
    active: item.rail.active,
  }));

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
      tobaccoId: item.tobacco.id,
      name: item.tobacco.name,
      manufacturer: item.tobacco.manufacturer,
      flavors: parseList(item.tobacco.flavors),
      proportion: item.proportion,
      sortOrder: item.sortOrder,
    })),
    avgRating,
    ratingsCount,
    popularity: record.popularity,
    available: record.available,
    guestVisible,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    railMemberships,
    railCount: railMemberships.length,
    activeRailCount: railMemberships.filter((item) => item.active).length,
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
      railMixes: {
        include: {
          rail: {
            select: {
              id: true,
              name: true,
              type: true,
              active: true,
            },
          },
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

const normalizeMixStatusFilter = (value: unknown): MixStatusFilter => {
  if (value === 'guest-visible' || value === 'hidden' || value === 'blocked') {
    return value;
  }

  return 'all';
};

const normalizeMixRailFilter = (value: unknown): MixRailFilter => {
  if (value === 'in-rails' || value === 'without-rails') {
    return value;
  }

  return 'all';
};

const normalizeMixSortField = (value: unknown): MixSortField => {
  if (value === 'name' || value === 'avgRating' || value === 'updatedAt' || value === 'rails') {
    return value;
  }

  return 'popularity';
};

const normalizeMixSortDirection = (value: unknown): MixSortDirection => {
  return value === 'asc' || value === 'desc' ? value : 'desc';
};

const matchesMixStatus = (mix: MixView, status: MixStatusFilter) => {
  switch (status) {
    case 'guest-visible':
      return mix.guestVisible;
    case 'hidden':
      return !mix.available;
    case 'blocked':
      return mix.available && !mix.guestVisible;
    case 'all':
    default:
      return true;
  }
};

const matchesMixRailState = (mix: MixView, railState: MixRailFilter) => {
  switch (railState) {
    case 'in-rails':
      return mix.railCount > 0;
    case 'without-rails':
      return mix.railCount === 0;
    case 'all':
    default:
      return true;
  }
};

const mixViewSortBy = (
  left: MixView,
  right: MixView,
  field: MixSortField,
  direction: MixSortDirection,
) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  const by = (value: number) => value * multiplier;

  switch (field) {
    case 'name': {
      const result = left.name.localeCompare(right.name, 'ru');
      if (result !== 0) {
        return result * multiplier;
      }
      break;
    }
    case 'avgRating': {
      if (left.avgRating !== right.avgRating) {
        return by(left.avgRating - right.avgRating);
      }
      break;
    }
    case 'updatedAt': {
      const result = left.updatedAt.localeCompare(right.updatedAt);
      if (result !== 0) {
        return result * multiplier;
      }
      break;
    }
    case 'rails': {
      if (left.railCount !== right.railCount) {
        return by(left.railCount - right.railCount);
      }
      break;
    }
    case 'popularity':
    default: {
      if (left.popularity !== right.popularity) {
        return by(left.popularity - right.popularity);
      }
      break;
    }
  }

  return mixViewSort(left, right);
};

const normalizeInventoryStockFilter = (value: unknown): InventoryStockFilter => {
  if (typeof value !== 'string') {
    return 'all';
  }

  return isInventoryStockFilter(value) ? value : 'all';
};

const normalizeInventorySortField = (value: unknown): InventorySortField => {
  if (typeof value !== 'string') {
    return 'stock';
  }

  return isInventorySortField(value) ? value : 'stock';
};

const normalizeInventorySortDirection = (value: unknown): InventorySortDirection => {
  if (typeof value !== 'string') {
    return 'desc';
  }

  return isInventorySortDirection(value) ? value : 'desc';
};

const normalizeInventorySelections = (items: string[] | undefined) =>
  unique((items ?? []).map(normalizeToken).filter(Boolean));

const DEFAULT_STAFF_PAGE_SIZE = 25;
const MAX_STAFF_PAGE_SIZE = 100;

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  return normalized >= 1 ? normalized : fallback;
};

const normalizeStaffPage = (value: unknown) => normalizePositiveInteger(value, 1);

const normalizeStaffPageSize = (value: unknown) =>
  Math.min(MAX_STAFF_PAGE_SIZE, normalizePositiveInteger(value, DEFAULT_STAFF_PAGE_SIZE));

const resolveInventorySelections = (options: string[], selected: string[]) => {
  if (!selected.length) {
    return [] as string[];
  }

  return options.filter((item) => selected.includes(normalizeToken(item)));
};

const matchesInventorySelection = (values: string[], selected: string[]) => {
  if (!selected.length) {
    return true;
  }

  const normalized = values.map(normalizeToken);
  return selected.map(normalizeToken).some((item) => normalized.includes(item));
};

const inventoryMixSort = (left: InventoryDependentMixView, right: InventoryDependentMixView) => {
  if (left.guestVisible !== right.guestVisible) {
    return left.guestVisible ? -1 : 1;
  }

  if (left.available !== right.available) {
    return left.available ? -1 : 1;
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity;
  }

  if (right.avgRating !== left.avgRating) {
    return right.avgRating - left.avgRating;
  }

  return left.name.localeCompare(right.name, 'ru');
};

const buildInventoryTobaccoView = (
  tobacco: ReturnType<typeof mapTobacco>,
  allMixes: MixView[],
): InventoryTobaccoView => {
  const dependentMixes = allMixes
    .filter((mix) => mix.componentIds.includes(tobacco.id))
    .map((mix) => ({
      id: mix.id,
      name: mix.name,
      available: mix.available,
      guestVisible: mix.guestVisible,
      avgRating: mix.avgRating,
      popularity: mix.popularity,
    }))
    .sort(inventoryMixSort);

  return {
    ...tobacco,
    dependentMixCount: dependentMixes.length,
    blockedDependentMixCount: dependentMixes.filter((mix) => mix.available && !mix.guestVisible).length,
    dependentMixes,
  };
};

const inventoryTobaccoSort = (
  left: InventoryTobaccoView,
  right: InventoryTobaccoView,
  field: InventorySortField,
  direction: InventorySortDirection,
) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  const by = (value: number) => value * multiplier;

  switch (field) {
    case 'name': {
      const result = left.name.localeCompare(right.name, 'ru');
      if (result !== 0) {
        return result * multiplier;
      }
      break;
    }
    case 'manufacturer': {
      const manufacturerResult = left.manufacturer.localeCompare(right.manufacturer, 'ru');
      if (manufacturerResult !== 0) {
        return manufacturerResult * multiplier;
      }
      break;
    }
    case 'updatedAt': {
      const result = left.updatedAt.localeCompare(right.updatedAt);
      if (result !== 0) {
        return result * multiplier;
      }
      break;
    }
    case 'dependentMixes': {
      if (left.dependentMixCount !== right.dependentMixCount) {
        return by(left.dependentMixCount - right.dependentMixCount);
      }
      break;
    }
    case 'stock':
    default: {
      if (left.inStock !== right.inStock) {
        return by(Number(left.inStock) - Number(right.inStock));
      }
      break;
    }
  }

  return left.name.localeCompare(right.name, 'ru');
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

const distributeMixComponentProportions = (componentIds: string[]) => {
  if (!componentIds.length) {
    return [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }>;
  }

  const base = Math.floor(100 / componentIds.length);
  const remainder = 100 - base * componentIds.length;

  return componentIds.map((tobaccoId, index) => ({
    tobaccoId,
    proportion: base + (index < remainder ? 1 : 0),
    sortOrder: index,
  }));
};

const validateStructuredMixComponents = async (
  components: Array<{ tobaccoId?: string; proportion?: number; sortOrder?: number }>,
) => {
  const normalized = components
    .map((component, index) => ({
      tobaccoId: component.tobaccoId?.trim() ?? '',
      proportion: typeof component.proportion === 'number' ? Math.round(component.proportion) : NaN,
      sortOrder: typeof component.sortOrder === 'number' && Number.isFinite(component.sortOrder) ? component.sortOrder : index,
      sourceIndex: index,
    }))
    .filter((component) => component.tobaccoId)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.sourceIndex - right.sourceIndex;
    })
    .map((component, index) => ({
      tobaccoId: component.tobaccoId,
      proportion: component.proportion,
      sortOrder: index,
    }));

  if (!normalized.length) {
    return { error: 'At least one component is required', components: [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }> };
  }

  const seen = new Set<string>();
  for (const component of normalized) {
    if (seen.has(component.tobaccoId)) {
      return {
        error: `Duplicate component id: ${component.tobaccoId}`,
        components: [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }>,
      };
    }
    seen.add(component.tobaccoId);

    if (!Number.isInteger(component.proportion) || component.proportion <= 0 || component.proportion > 100) {
      return {
        error: `Invalid component proportion for ${component.tobaccoId}`,
        components: [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }>,
      };
    }
  }

  const total = normalized.reduce((sum, component) => sum + component.proportion, 0);
  if (total !== 100) {
    return {
      error: 'Component proportions must total exactly 100',
      components: [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }>,
    };
  }

  const componentValidation = await validateMixComponents(normalized.map((component) => component.tobaccoId));
  if ('error' in componentValidation) {
    return {
      error: componentValidation.error,
      components: [] as Array<{ tobaccoId: string; proportion: number; sortOrder: number }>,
    };
  }

  return {
    components: normalized,
    componentIds: componentValidation.componentIds,
    flavorProfiles: componentValidation.flavorProfiles,
    flavors: componentValidation.flavors,
    flavorTags: componentValidation.flavorTags,
  };
};

const resolveMixComponentsInput = async (payload: Partial<MixInput>) => {
  if (Array.isArray(payload.components)) {
    return validateStructuredMixComponents(payload.components);
  }

  const componentValidation = await validateMixComponents(payload.componentIds ?? []);
  if ('error' in componentValidation) {
    return { error: componentValidation.error };
  }

  return {
    components: distributeMixComponentProportions(componentValidation.componentIds),
    componentIds: componentValidation.componentIds,
    flavorProfiles: componentValidation.flavorProfiles,
    flavors: componentValidation.flavors,
    flavorTags: componentValidation.flavorTags,
  };
};

const validateMixInput = async (payload: Partial<MixInput>) => {
  const name = payload.name?.trim();
  const description = payload.description?.trim();

  if (!name || !description) {
    return { error: 'Name and description are required' };
  }

  const componentValidation = await resolveMixComponentsInput(payload);
  if ('error' in componentValidation) {
    return { error: componentValidation.error };
  }

  return {
    name,
    description,
    components: componentValidation.components,
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

  if (!name || !description) {
    return { error: 'Name and description are required' };
  }

  const railMixIds = await normalizeRailMixIds(payload.mixIds ?? []);
  if ('error' in railMixIds) {
    return { error: railMixIds.error };
  }

  return {
    name,
    description,
    type: 'curated' as const,
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

const nextTobaccoId = async (manufacturer: string, lineName: string, name: string) => {
  const prefix = `tobacco-${slugify(`${manufacturer} ${lineName} ${name}`)}`;
  const total = await prisma.nomadTobacco.count({
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

type NomadStorageTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const wipeNomadStorage = async (tx: NomadStorageTx) => {
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
  await tx.nomadTelegramOperator.deleteMany();
  await tx.nomadTelegramAutomationState.deleteMany();
  await tx.nomadAuditEvent.deleteMany();
  await tx.nomadStaffAccount.deleteMany();
};

const insertNomadOperationalState = async (
  tx: NomadStorageTx,
  currentCodeWindow: ReturnType<typeof getNomadDailyCodeWindow>,
) => {
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

  await tx.nomadTelegramOperator.createMany({
    data: seedTelegramOperators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      phone: operator.phone,
      active: operator.active,
      linkedChatId: operator.linkedChatId ?? null,
      linkedTelegramUserId: operator.linkedTelegramUserId ?? null,
      linkedUsername: operator.linkedUsername ?? null,
      linkedDisplayName: operator.linkedDisplayName ?? null,
      linkedAt: operator.linkedAt ? new Date(operator.linkedAt) : null,
      lastCodeRequestedAt: operator.lastCodeRequestedAt ? new Date(operator.lastCodeRequestedAt) : null,
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
};

const insertNomadSeedCatalog = async (tx: NomadStorageTx) => {
  await tx.nomadTobacco.createMany({
    data: seedTobaccos.map((tobacco) => ({
      id: tobacco.id,
      manufacturer: tobacco.manufacturer,
      name: tobacco.name,
      description: null,
      flavorProfiles: serializeList(tobacco.flavorProfiles),
      flavors: serializeList(tobacco.flavors),
      flavorTags: serializeList(tobacco.flavorTags),
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
        flavorTags: serializeList(unique(components.flatMap((item) => item.flavorTags))),
        available: true,
        popularity: mix.popularity,
        baseAvgRating: mix.avgRating,
      };
    }),
  });

  await tx.nomadMixComponent.createMany({
    data: seedMixes.flatMap((mix) =>
      distributeMixComponentProportions(mix.componentIds).map((component) => ({
        mixId: mix.id,
        tobaccoId: component.tobaccoId,
        proportion: component.proportion,
        sortOrder: component.sortOrder,
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
};

// Production-bootstrap: только staff/коды/recipients/operators/intro. Каталог
// табаков и миксы наполняются отдельно через `npm run sync:htreviews`. Этап 1
// разводит production-данные и тестовую фикстуру seed-каталога.
const bootstrapNomadOperationalState = async () => {
  const currentCodeWindow = getNomadDailyCodeWindow();
  await prisma.$transaction(async (tx) => {
    await insertNomadOperationalState(tx, currentCodeWindow);
  });
};

// Полный test-reset: чистит всё и переустанавливает seed-каталог как фикстуру.
const resetNomadStorageWithSeedCatalog = async () => {
  const currentCodeWindow = getNomadDailyCodeWindow();
  await prisma.$transaction(async (tx) => {
    await wipeNomadStorage(tx);
    await insertNomadOperationalState(tx, currentCodeWindow);
    await insertNomadSeedCatalog(tx);
  });
};

export const ensureNomadState = async () => {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
    const staffAccountCount = await prisma.nomadStaffAccount.count();
    if (!staffAccountCount) {
      await bootstrapNomadOperationalState();
    }
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
};

export const resetNomadState = async () => {
  if (!canResetNomadState()) {
    throw new Error('resetNomadState is disabled outside test mode. Set NOMAD_ALLOW_STATE_RESET=1 for explicit maintenance runs.');
  }

  await resetNomadStorageWithSeedCatalog();
};

export const getGuestIntroCards = async () => {
  await ensureNomadState();
  await syncIntroCards();

  const records = await prisma.nomadIntroCard.findMany({
    orderBy: {
      step: 'asc',
    },
  });

  return records.map(mapIntroCardRecord);
};

export const getInventoryTobaccos = async (query: InventoryListQuery = {}): Promise<InventoryListResult> => {
  await ensureNomadState();

  const [records, mixes] = await Promise.all([
    prisma.nomadTobacco.findMany(),
    fetchMixViews(),
  ]);

  const items = records.map((record) => buildInventoryTobaccoView(mapTobacco(record), mixes));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const stock = normalizeInventoryStockFilter(query.stock);
  const manufacturers = normalizeInventorySelections(query.manufacturers);
  const flavorProfiles = normalizeInventorySelections(query.flavorProfiles);
  const flavors = normalizeInventorySelections(query.flavors);
  const flavorTags = normalizeInventorySelections(query.flavorTags);
  const sort = normalizeInventorySortField(query.sort);
  const direction = normalizeInventorySortDirection(query.direction);
  const paginationEnabled = query.page !== undefined || query.pageSize !== undefined;
  const searchTokens = search
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);

  const filteredItems = items
    .filter((item) => {
      if (stock === 'in-stock' && !item.inStock) {
        return false;
      }

      if (stock === 'out-of-stock' && item.inStock) {
        return false;
      }

      if (!matchesInventorySelection([item.manufacturer], manufacturers)) {
        return false;
      }

      if (!matchesInventorySelection(item.flavorProfiles, flavorProfiles)) {
        return false;
      }

      if (!matchesInventorySelection(item.flavors, flavors)) {
        return false;
      }

      if (!matchesInventorySelection(item.flavorTags, flavorTags)) {
        return false;
      }

      if (!searchTokens.length) {
        return true;
      }

      const haystack = [
        item.name,
        item.manufacturer,
        item.lineName,
        item.officialStrength ?? '',
        item.communityStrength ?? '',
        ...item.flavorProfiles,
        ...item.flavors,
        ...item.flavorTags,
        ...item.dependentMixes.map((mix) => mix.name),
      ]
        .map(normalizeToken)
        .join(' ');

      return searchTokens.every((token) => haystack.includes(token));
    })
    .sort((left, right) => inventoryTobaccoSort(left, right, sort, direction));

  const pageSize = paginationEnabled ? normalizeStaffPageSize(query.pageSize) : Math.max(filteredItems.length, 1);
  const requestedPage = paginationEnabled ? normalizeStaffPage(query.page) : 1;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const paginatedItems = filteredItems.slice(start, start + pageSize);

  const manufacturerOptions = unique(items.map((item) => item.manufacturer)).sort((left, right) => left.localeCompare(right, 'ru'));
  const flavorProfileOptions = unique(items.flatMap((item) => item.flavorProfiles)).sort((left, right) =>
    left.localeCompare(right, 'ru'),
  );
  const flavorOptions = unique(items.flatMap((item) => item.flavors)).sort((left, right) => left.localeCompare(right, 'ru'));
  const flavorTagOptions = unique(items.flatMap((item) => item.flavorTags)).sort((left, right) => left.localeCompare(right, 'ru'));

  return {
    items: paginatedItems,
    filters: {
      search,
      stock,
      manufacturers: resolveInventorySelections(manufacturerOptions, manufacturers),
      flavorProfiles: resolveInventorySelections(flavorProfileOptions, flavorProfiles),
      flavors: resolveInventorySelections(flavorOptions, flavors),
      flavorTags: resolveInventorySelections(flavorTagOptions, flavorTags),
      options: {
        manufacturers: manufacturerOptions,
        flavorProfiles: flavorProfileOptions,
        flavors: flavorOptions,
        flavorTags: flavorTagOptions,
      },
    },
    sort: {
      field: sort,
      direction,
    },
    meta: {
      totalItems: items.length,
      filteredItems: filteredItems.length,
      inStockCount: filteredItems.filter((item) => item.inStock).length,
      outOfStockCount: filteredItems.filter((item) => !item.inStock).length,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getTobaccoById = async (id: string) => {
  await ensureNomadState();

  const tobacco = await prisma.nomadTobacco.findUnique({
    where: { id },
  });

  return tobacco ? mapTobacco(tobacco) : null;
};

export const createTobacco = async (payload: Partial<TobaccoInput>) => {
  await ensureNomadState();

  const manufacturer = payload.manufacturer?.trim();
  const name = payload.name?.trim();
  const lineName = payload.lineName?.trim() ?? '';

  if (!manufacturer || !name) {
    return { error: 'Manufacturer and name are required' };
  }

  const existing = await prisma.nomadTobacco.findFirst({
    where: {
      manufacturer,
      lineName,
      name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return { error: 'Такой табак уже существует в каталоге' };
  }

  const id = await nextTobaccoId(manufacturer, lineName, name);

  await prisma.nomadTobacco.create({
    data: {
      id,
      manufacturer,
      lineName,
      name,
      description: normalizeOptionalText(payload.description),
      country: normalizeOptionalText(payload.country),
      officialStrength: normalizeOptionalText(payload.officialStrength),
      communityStrength: normalizeOptionalText(payload.communityStrength),
      productionStatus: normalizeOptionalText(payload.productionStatus),
      flavorProfiles: serializeList(normalizeTextList(payload.flavorProfiles)),
      flavors: serializeList(normalizeTextList(payload.flavors)),
      flavorTags: serializeList(normalizeTextList(payload.flavorTags)),
      inStock: typeof payload.inStock === 'boolean' ? payload.inStock : true,
    },
  });

  return (await getInventoryTobaccos({ sort: 'name', direction: 'asc' })).items.find((item) => item.id === id) ?? null;
};

export const updateTobacco = async (id: string, payload: TobaccoPatch) => {
  await ensureNomadState();

  const current = await prisma.nomadTobacco.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const manufacturer = typeof payload.manufacturer === 'string' ? payload.manufacturer.trim() : current.manufacturer;
  const lineName = typeof payload.lineName === 'string' ? payload.lineName.trim() : current.lineName;
  const name = typeof payload.name === 'string' ? payload.name.trim() : current.name;

  if (!manufacturer || !name) {
    return { error: 'Manufacturer and name are required' };
  }

  const duplicate = await prisma.nomadTobacco.findFirst({
    where: {
      manufacturer,
      lineName,
      name,
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    return { error: 'Такой табак уже существует в каталоге' };
  }

  await prisma.nomadTobacco.update({
    where: { id },
    data: {
      manufacturer,
      lineName,
      name,
      description: typeof payload.description === 'string' ? normalizeOptionalText(payload.description) : current.description,
      country: typeof payload.country === 'string' ? normalizeOptionalText(payload.country) : current.country,
      officialStrength: typeof payload.officialStrength === 'string'
        ? normalizeOptionalText(payload.officialStrength)
        : current.officialStrength,
      communityStrength: typeof payload.communityStrength === 'string'
        ? normalizeOptionalText(payload.communityStrength)
        : current.communityStrength,
      productionStatus: typeof payload.productionStatus === 'string'
        ? normalizeOptionalText(payload.productionStatus)
        : current.productionStatus,
      flavorProfiles: Array.isArray(payload.flavorProfiles)
        ? serializeList(normalizeTextList(payload.flavorProfiles))
        : current.flavorProfiles,
      flavors: Array.isArray(payload.flavors)
        ? serializeList(normalizeTextList(payload.flavors))
        : current.flavors,
      flavorTags: Array.isArray(payload.flavorTags)
        ? serializeList(normalizeTextList(payload.flavorTags))
        : current.flavorTags,
      inStock: typeof payload.inStock === 'boolean' ? payload.inStock : current.inStock,
    },
  });

  return (await getInventoryTobaccos({ sort: 'name', direction: 'asc' })).items.find((item) => item.id === id) ?? null;
};

export const updateTobaccoInStock = async (id: string, inStock: boolean) => {
  await ensureNomadState();

  const current = await prisma.nomadTobacco.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  await prisma.nomadTobacco.update({
    where: { id },
    data: { inStock },
  });

  return (await getInventoryTobaccos()).items.find((item) => item.id === id) ?? null;
};

export const batchUpdateTobaccoInStock = async (
  ids: string[],
  action: Exclude<InventoryBatchAction, 'archive'>,
): Promise<InventoryBatchResult> => {
  await ensureNomadState();

  const normalizedIds = unique(ids.map((id) => id.trim()).filter(Boolean));
  if (!normalizedIds.length) {
    return {
      action,
      ids: [],
      skippedIds: [],
      processedCount: 0,
      items: [],
    };
  }

  const nextInStock = action === 'set-in-stock';
  const currentItems = await prisma.nomadTobacco.findMany({
    where: {
      id: {
        in: normalizedIds,
      },
    },
  });
  const currentIds = currentItems.map((item) => item.id);
  const skippedIds = normalizedIds.filter((id) => !currentIds.includes(id));

  await prisma.nomadTobacco.updateMany({
    where: {
      id: {
        in: currentIds,
      },
    },
    data: {
      inStock: nextInStock,
    },
  });

  const refreshed = await getInventoryTobaccos({
    sort: 'name',
    direction: 'asc',
  });
  const items = refreshed.items.filter((item) => currentIds.includes(item.id));

  return {
    action,
    ids: currentIds,
    skippedIds,
    processedCount: items.length,
    items,
  };
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

const buildMostSelectedRail = async (): Promise<RailView> => {
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

const buildTopRatedRail = async (): Promise<RailView> => {
  const mixes = await getAvailableMixCatalog();

  const ranked = mixes
    .filter((mix) => mix.guestVisible)
    .sort((left, right) => {
      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      if (right.ratingsCount !== left.ratingsCount) {
        return right.ratingsCount - left.ratingsCount;
      }

      if (right.popularity !== left.popularity) {
        return right.popularity - left.popularity;
      }

      return left.name.localeCompare(right.name, 'ru');
    })
    .slice(0, 3);

  return {
    id: 'rail-statistical-rated',
    name: 'Лучшие оценки',
    description: 'Миксы с самыми сильными оценками гостей и устойчивым качеством вкуса.',
    type: 'statistical',
    active: true,
    mixIds: ranked.map((mix) => mix.id),
    mixes: ranked,
    isSystem: true,
  };
};

const buildStatisticalRails = async (): Promise<RailView[]> => [await buildMostSelectedRail(), await buildTopRatedRail()];

const statisticalRailReadOnlyReason = 'Статистический рейл формируется автоматически и доступен только для просмотра.';

const toStaffRailView = (rail: RailView): StaffRailView => ({
  ...rail,
  editable: rail.type !== 'statistical',
  readOnlyReason: rail.type === 'statistical' ? statisticalRailReadOnlyReason : '',
});

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
  const rails = [...(await buildStatisticalRails()), ...(await buildRailViews(true))];
  return rails.filter((rail) => rail.type === 'statistical' || rail.mixes.length > 0);
};

export const getStaffMixes = async (query: MixListQuery = {}): Promise<MixListResult> => {
  await ensureNomadState();

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const normalizedSearch = normalizeToken(search);
  const status = normalizeMixStatusFilter(query.status);
  const railState = normalizeMixRailFilter(query.railState);
  const manufacturers = normalizeInventorySelections(query.manufacturers);
  const flavorProfiles = normalizeInventorySelections(query.flavorProfiles);
  const flavors = normalizeInventorySelections(query.flavors);
  const flavorTags = normalizeInventorySelections(query.flavorTags);
  const sortField = normalizeMixSortField(query.sort);
  const sortDirection = normalizeMixSortDirection(query.direction);
  const paginationEnabled = query.page !== undefined || query.pageSize !== undefined;
  const allItems = await getAvailableMixCatalog();

  const options = {
    manufacturers: unique(allItems.flatMap((item) => item.components.map((component) => component.manufacturer))).sort((left, right) =>
      left.localeCompare(right, 'ru')),
    flavorProfiles: unique(allItems.flatMap((item) => item.flavorProfiles)).sort((left, right) => left.localeCompare(right, 'ru')),
    flavors: unique(allItems.flatMap((item) => item.flavors)).sort((left, right) => left.localeCompare(right, 'ru')),
    flavorTags: unique(allItems.flatMap((item) => item.flavorTags)).sort((left, right) => left.localeCompare(right, 'ru')),
  };

  const resolvedFilters = {
    manufacturers: resolveInventorySelections(options.manufacturers, manufacturers),
    flavorProfiles: resolveInventorySelections(options.flavorProfiles, flavorProfiles),
    flavors: resolveInventorySelections(options.flavors, flavors),
    flavorTags: resolveInventorySelections(options.flavorTags, flavorTags),
  };

  const filteredItems = allItems
    .filter((mix) => matchesMixStatus(mix, status))
    .filter((mix) => matchesMixRailState(mix, railState))
    .filter((mix) =>
      !normalizedSearch
      || [
        mix.name,
        mix.description,
        ...mix.flavorProfiles,
        ...mix.flavors,
        ...mix.flavorTags,
        ...mix.components.flatMap((component) => [component.name, component.manufacturer, ...component.flavors]),
        ...mix.railMemberships.map((membership) => membership.name),
      ].some((value) => normalizeToken(value).includes(normalizedSearch)))
    .filter((mix) => matchesInventorySelection(mix.components.map((component) => component.manufacturer), resolvedFilters.manufacturers))
    .filter((mix) => matchesInventorySelection(mix.flavorProfiles, resolvedFilters.flavorProfiles))
    .filter((mix) => matchesInventorySelection(mix.flavors, resolvedFilters.flavors))
    .filter((mix) => matchesInventorySelection(mix.flavorTags, resolvedFilters.flavorTags))
    .sort((left, right) => mixViewSortBy(left, right, sortField, sortDirection));

  const pageSize = paginationEnabled ? normalizeStaffPageSize(query.pageSize) : Math.max(filteredItems.length, 1);
  const requestedPage = paginationEnabled ? normalizeStaffPage(query.page) : 1;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const paginatedItems = filteredItems.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    filters: {
      search,
      status,
      railState,
      manufacturers: resolvedFilters.manufacturers,
      flavorProfiles: resolvedFilters.flavorProfiles,
      flavors: resolvedFilters.flavors,
      flavorTags: resolvedFilters.flavorTags,
      options,
    },
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    meta: {
      totalItems: allItems.length,
      filteredItems: filteredItems.length,
      guestVisibleCount: filteredItems.filter((item) => item.guestVisible).length,
      hiddenCount: filteredItems.filter((item) => !item.available).length,
      blockedCount: filteredItems.filter((item) => item.available && !item.guestVisible).length,
      inRailsCount: filteredItems.filter((item) => item.railCount > 0).length,
      withoutRailsCount: filteredItems.filter((item) => item.railCount === 0).length,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

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
      data: validated.components.map((component) => ({
        mixId: id,
        tobaccoId: component.tobaccoId,
        proportion: component.proportion,
        sortOrder: component.sortOrder,
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

  const componentValidation = await resolveMixComponentsInput(
    Array.isArray(payload.components) || Array.isArray(payload.componentIds)
      ? payload
      : {
          components: current.components.map((item) => ({
            tobaccoId: item.tobaccoId,
            proportion: item.proportion,
            sortOrder: item.sortOrder,
          })),
        },
  );
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

    if (Array.isArray(payload.components) || Array.isArray(payload.componentIds)) {
      await tx.nomadMixComponent.deleteMany({
        where: { mixId: id },
      });

      await tx.nomadMixComponent.createMany({
        data: componentValidation.components.map((component) => ({
          mixId: id,
          tobaccoId: component.tobaccoId,
          proportion: component.proportion,
          sortOrder: component.sortOrder,
        })),
      });
    }
  });

  return getMixById(id);
};

export const getStaffRails = async (): Promise<StaffRailView[]> => {
  return [...(await buildStatisticalRails()), ...(await buildRailViews(false))].map(toStaffRailView);
};

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

  if (id.startsWith('rail-statistical-')) {
    return { error: statisticalRailReadOnlyReason };
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
    return { error: statisticalRailReadOnlyReason };
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

export const getDashboardSummary = async (windowKey: DashboardWindowKey = '14d'): Promise<DashboardSummary> => {
  await ensureNomadState();

  const window = buildDashboardWindow(windowKey);
  const [inventoryRecords, mixes, rails, smokeEvents, ratingEvents, blockedMixRecords] = await Promise.all([
    prisma.nomadTobacco.findMany({
      orderBy: [{ manufacturer: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        manufacturer: true,
        name: true,
        flavorProfiles: true,
        flavors: true,
        inStock: true,
      },
    }),
    getAvailableMixCatalog(),
    getStaffRails(),
    prisma.nomadSmokeCtaEvent.findMany({
      where: {
        createdAt: {
          gte: window.startsAtDate,
          lte: window.endsAtDate,
        },
      },
      select: {
        mixId: true,
        createdAt: true,
      },
    }),
    prisma.nomadMixRating.findMany({
      where: {
        createdAt: {
          gte: window.startsAtDate,
          lte: window.endsAtDate,
        },
      },
      select: {
        mixId: true,
        value: true,
        createdAt: true,
      },
    }),
    prisma.nomadMix.findMany({
      where: {
        available: true,
      },
      select: {
        id: true,
        name: true,
        components: {
          orderBy: { sortOrder: 'asc' },
          select: {
            tobacco: {
              select: {
                name: true,
                inStock: true,
              },
            },
          },
        },
        railMixes: {
          select: {
            rail: {
              select: {
                name: true,
                active: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const smokeCounts = smokeEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const ratingStats = ratingEvents.reduce<Record<string, { sum: number; count: number }>>((acc, event) => {
    const current = acc[event.mixId] ?? { sum: 0, count: 0 };
    current.sum += event.value;
    current.count += 1;
    acc[event.mixId] = current;
    return acc;
  }, {});

  const activityByDay = new Map<string, DashboardActivityPoint>();
  for (let dayOffset = 0; dayOffset < window.days; dayOffset += 1) {
    const current = startOfDay(window.startsAtDate);
    current.setDate(window.startsAtDate.getDate() + dayOffset);
    const date = toDayKey(current);
    activityByDay.set(date, {
      date,
      smokeCtaCount: 0,
      ratingsCount: 0,
    });
  }

  for (const event of smokeEvents) {
    const key = toDayKey(event.createdAt);
    const current = activityByDay.get(key);
    if (current) {
      current.smokeCtaCount += 1;
    }
  }

  for (const event of ratingEvents) {
    const key = toDayKey(event.createdAt);
    const current = activityByDay.get(key);
    if (current) {
      current.ratingsCount += 1;
    }
  }

  const manufacturers = buildInventoryBreakdown(
    inventoryRecords.map((item) => ({
      key: item.manufacturer,
      label: item.manufacturer,
      inStock: item.inStock,
    })),
  );

  const flavorProfiles = buildInventoryBreakdown(
    inventoryRecords.flatMap((item) =>
      parseList(item.flavorProfiles).map((profile) => ({
        key: profile,
        label: flavorProfileLabels[profile] ?? profile,
        inStock: item.inStock,
      })),
    ),
  );

  const topFlavors = buildInventoryBreakdown(
    inventoryRecords.flatMap((item) =>
      parseList(item.flavors).map((flavor) => ({
        key: flavor,
        label: flavor,
        inStock: item.inStock,
      })),
    ),
  ).slice(0, 8);

  const topMixes = mixes
    .map((mix) => ({
      mixId: mix.id,
      mixName: mix.name,
      smokeCtaCount: smokeCounts[mix.id] ?? 0,
      avgRating: mix.avgRating,
      ratingsCount: mix.ratingsCount,
      popularity: mix.popularity,
    }))
    .filter((item) => item.smokeCtaCount > 0)
    .sort((left, right) => {
      if (right.smokeCtaCount !== left.smokeCtaCount) {
        return right.smokeCtaCount - left.smokeCtaCount;
      }

      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      if (right.popularity !== left.popularity) {
        return right.popularity - left.popularity;
      }

      return left.mixName.localeCompare(right.mixName, 'ru');
    })
    .slice(0, 5);

  const topRatedMixes = mixes
    .map((mix) => {
      const stats = ratingStats[mix.id];
      const avgRating = stats ? Number((stats.sum / stats.count).toFixed(1)) : 0;

      return {
        mixId: mix.id,
        mixName: mix.name,
        smokeCtaCount: smokeCounts[mix.id] ?? 0,
        avgRating,
        ratingsCount: stats?.count ?? 0,
        popularity: mix.popularity,
      };
    })
    .filter((item) => item.ratingsCount > 0)
    .sort((left, right) => {
      if (right.avgRating !== left.avgRating) {
        return right.avgRating - left.avgRating;
      }

      if (right.ratingsCount !== left.ratingsCount) {
        return right.ratingsCount - left.ratingsCount;
      }

      if (right.smokeCtaCount !== left.smokeCtaCount) {
        return right.smokeCtaCount - left.smokeCtaCount;
      }

      return left.mixName.localeCompare(right.mixName, 'ru');
    })
    .slice(0, 5);

  const ratingDistribution: DashboardRatingDistributionItem[] = [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: ratingEvents.filter((item) => item.value === value).length,
  }));

  const blockedMixes = blockedMixRecords
    .map((mix) => {
      const missingComponents = mix.components
        .filter((component) => !component.tobacco.inStock)
        .map((component) => component.tobacco.name);

      return {
        mixId: mix.id,
        mixName: mix.name,
        missingComponents,
        railNames: unique(
          mix.railMixes
            .filter((item) => item.rail.active)
            .map((item) => item.rail.name),
        ),
        smokeCtaCount: smokeCounts[mix.id] ?? 0,
      } satisfies DashboardBlockedMix;
    })
    .filter((mix) => mix.missingComponents.length > 0)
    .sort((left, right) => {
      if (right.smokeCtaCount !== left.smokeCtaCount) {
        return right.smokeCtaCount - left.smokeCtaCount;
      }

      if (right.missingComponents.length !== left.missingComponents.length) {
        return right.missingComponents.length - left.missingComponents.length;
      }

      return left.mixName.localeCompare(right.mixName, 'ru');
    })
    .slice(0, 5);

  const railHealth = rails
    .map((rail) => {
      const visibleMixCount = rail.mixes.filter((mix) => mix.guestVisible).length;

      return {
        railId: rail.id,
        name: rail.name,
        type: rail.type,
        active: rail.active,
        totalMixCount: rail.mixIds.length,
        visibleMixCount,
        hiddenMixCount: Math.max(rail.mixIds.length - visibleMixCount, 0),
      } satisfies DashboardRailHealthItem;
    })
    .sort((left, right) => {
      if (left.active !== right.active) {
        return left.active ? -1 : 1;
      }

      if (left.hiddenMixCount !== right.hiddenMixCount) {
        return right.hiddenMixCount - left.hiddenMixCount;
      }

      return left.name.localeCompare(right.name, 'ru');
    });

  const totalRatingsValue = ratingEvents.reduce((sum, item) => sum + item.value, 0);

  return {
    window: {
      key: window.key,
      label: window.label,
      days: window.days,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    },
    inventory: {
      total: inventoryRecords.length,
      inStockCount: inventoryRecords.filter((item) => item.inStock).length,
      outOfStockCount: inventoryRecords.filter((item) => !item.inStock).length,
      manufacturers: manufacturers.slice(0, 6),
      flavorProfiles: flavorProfiles.slice(0, 6),
      topFlavors,
    },
    product: {
      smokeCtaTotal: smokeEvents.length,
      ratingsTotal: ratingEvents.length,
      avgGuestRating: ratingEvents.length ? Number((totalRatingsValue / ratingEvents.length).toFixed(1)) : 0,
      topMixes,
      topRatedMixes,
      ratingDistribution,
      activity: [...activityByDay.values()],
    },
    ops: {
      guestVisibleMixesCount: mixes.filter((mix) => mix.guestVisible).length,
      hiddenMixesCount: mixes.filter((mix) => !mix.available).length,
      blockedByInventoryCount: mixes.filter((mix) => mix.available && !mix.guestVisible).length,
      activeRailsCount: railHealth.filter((rail) => rail.active).length,
      emptyActiveRailsCount: railHealth.filter((rail) => rail.active && rail.visibleMixCount === 0).length,
      blockedMixes,
      railHealth: railHealth.slice(0, 6),
    },
  };
};
