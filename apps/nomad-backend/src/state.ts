import { mixes as seedMixes, tobaccos } from './catalog';
import type { Mix, Tobacco } from './catalog';

export type RailType = 'statistical' | 'prepared' | 'curated';

export type IntroCard = {
  id: string;
  step: number;
  title: string;
  description: string;
  bullets: string[];
};

export type MixRecord = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  popularity: number;
  baseAvgRating: number;
  available: boolean;
  ratings: number[];
};

export type MixComponentView = {
  id: string;
  name: string;
  manufacturer: string;
  flavors: string[];
};

export type MixView = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  flavorProfiles: string[];
  flavors: string[];
  components: MixComponentView[];
  avgRating: number;
  ratingsCount: number;
  popularity: number;
  available: boolean;
  guestVisible: boolean;
};

export type RailRecord = {
  id: string;
  name: string;
  description: string;
  type: RailType;
  mixIds: string[];
  active: boolean;
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

export type MixPatch = Partial<Pick<MixInput, 'name' | 'description' | 'componentIds' | 'available' | 'popularity' | 'baseAvgRating'>>;

export type RailInput = {
  name: string;
  description: string;
  type?: RailType;
  mixIds: string[];
  active?: boolean;
};

export type RailPatch = Partial<Pick<RailInput, 'name' | 'description' | 'type' | 'mixIds' | 'active'>>;

const introCards: IntroCard[] = [
  {
    id: 'intro-age-check',
    step: 1,
    title: 'Подтвердите возраст',
    description: 'Перед началом сценария гость подтверждает, что ему есть 18 лет.',
    bullets: ['Это быстрый gate до доступа к рекомендациям.', 'Дальше понадобится дневной код от staff.'],
  },
  {
    id: 'intro-code-check',
    step: 2,
    title: 'Введите daily code',
    description: 'Код меняется каждый день и позволяет открыть гостевой сценарий без авторизации.',
    bullets: ['Код сообщает кальянный мастер или официант.', 'Код приходит staff через Telegram.'],
  },
  {
    id: 'intro-onboarding',
    step: 3,
    title: 'Выберите вкус',
    description: 'Быстрый онбординг помогает подобрать микс под профиль и вкусы гостя.',
    bullets: ['Можно выбрать несколько профилей.', 'Рекомендации учитывают наличие табаков.'],
  },
  {
    id: 'intro-mix-card',
    step: 4,
    title: 'Покажите микс мастеру',
    description: 'Карточка микса открывается после кнопки выбора и сразу готова для показа staff.',
    bullets: ['Гость видит состав микса и рейтинг.', 'Мастер получает понятную карточку без лишних шагов.'],
  },
];

const unique = (items: string[]) => Array.from(new Set(items));

const normalizeToken = (value: string) => value.trim().toLowerCase();

const slugify = (value: string) =>
  normalizeToken(value)
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';

const cloneTobacco = (item: Tobacco): Tobacco => ({
  ...item,
  flavorProfiles: [...item.flavorProfiles],
  flavors: [...item.flavors],
});

const cloneMixRecord = (mix: MixRecord): MixRecord => ({
  ...mix,
  componentIds: [...mix.componentIds],
  ratings: [...mix.ratings],
});

const cloneRailRecord = (rail: RailRecord): RailRecord => ({
  ...rail,
  mixIds: [...rail.mixIds],
});

const cloneMixView = (mix: MixView): MixView => ({
  ...mix,
  componentIds: [...mix.componentIds],
  flavorProfiles: [...mix.flavorProfiles],
  flavors: [...mix.flavors],
  components: mix.components.map((component) => ({
    ...component,
    flavors: [...component.flavors],
  })),
});

const cloneRailView = (rail: RailView): RailView => ({
  ...rail,
  mixIds: [...rail.mixIds],
  mixes: rail.mixes.map(cloneMixView),
});

const defaultRails = (): RailRecord[] => [
  {
    id: 'rail-prepared-fresh-line',
    name: 'Свежая линия',
    description: 'Цитрус, мята и лёгкая прохлада для быстрого выбора.',
    type: 'prepared',
    mixIds: ['mix-citrus-scout', 'mix-berry-dawn'],
    active: true,
  },
  {
    id: 'rail-prepared-sweet-line',
    name: 'Сладкая линия',
    description: 'Десертные и мягкие сочетания для спокойного вечера.',
    type: 'prepared',
    mixIds: ['mix-silk-road', 'mix-peach-mirage'],
    active: true,
  },
  {
    id: 'rail-curated-evening-choice',
    name: 'Вечерний выбор',
    description: 'Ручная подборка для позднего визита в Nomad.',
    type: 'curated',
    mixIds: ['mix-amber-bazaar'],
    active: false,
  },
];

const mixViewSort = (left: MixView, right: MixView) => {
  if (right.avgRating !== left.avgRating) {
    return right.avgRating - left.avgRating;
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity;
  }

  return left.name.localeCompare(right.name, 'ru');
};

const getInventoryTobaccoInternal = (id: string) => inventoryTobaccos.find((item) => item.id === id) ?? null;

const getMixRecordInternal = (id: string) => mixRecords.find((item) => item.id === id) ?? null;

const getRailRecordInternal = (id: string) => railRecords.find((item) => item.id === id) ?? null;

const getMixComponents = (mix: MixRecord) =>
  mix.componentIds
    .map((componentId) => getInventoryTobaccoInternal(componentId))
    .filter((item): item is Tobacco => Boolean(item))
    .map(cloneTobacco);

const getMixRatingSummary = (mix: MixRecord) => {
  if (mix.ratings.length) {
    const total = mix.ratings.reduce((sum, value) => sum + value, 0);
    return {
      avgRating: Number((total / mix.ratings.length).toFixed(1)),
      ratingsCount: mix.ratings.length,
    };
  }

  return {
    avgRating: mix.baseAvgRating,
    ratingsCount: 0,
  };
};

const isMixGuestVisible = (mix: MixRecord) => {
  if (!mix.available) {
    return false;
  }

  return mix.componentIds.every((componentId) => {
    const tobacco = getInventoryTobaccoInternal(componentId);
    return Boolean(tobacco?.inStock);
  });
};

const buildMixView = (mix: MixRecord): MixView => {
  const components = getMixComponents(mix);
  const flavorProfiles = unique(components.flatMap((item) => item.flavorProfiles));
  const flavors = unique(components.flatMap((item) => item.flavors));
  const summary = getMixRatingSummary(mix);

  return {
    id: mix.id,
    name: mix.name,
    description: mix.description,
    componentIds: [...mix.componentIds],
    flavorProfiles,
    flavors,
    components: components.map((item) => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      flavors: [...item.flavors],
    })),
    avgRating: summary.avgRating,
    ratingsCount: summary.ratingsCount,
    popularity: mix.popularity,
    available: mix.available,
    guestVisible: isMixGuestVisible(mix),
  };
};

const buildMixViews = (mixes: MixRecord[], filter?: (mix: MixRecord, view: MixView) => boolean) => {
  return mixes
    .map((mix) => {
      const view = buildMixView(mix);
      return filter && !filter(mix, view) ? null : view;
    })
    .filter((item): item is MixView => Boolean(item))
    .map(cloneMixView);
};

const getMixByIds = (mixIds: string[], guestOnly: boolean) => {
  const selected = mixIds
    .map((id) => getMixRecordInternal(id))
    .filter((item): item is MixRecord => Boolean(item))
    .map(buildMixView)
    .filter((view) => (guestOnly ? view.guestVisible : true));

  return selected.sort(mixViewSort).map(cloneMixView);
};

const buildStatisticalRail = (): RailView => {
  const counts = smokeCtaEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const ranked = getAvailableMixCatalog()
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
    name: 'Статистический топ',
    description: 'Миксы, которые выбирают чаще всего и лучше оценивают гости.',
    type: 'statistical',
    active: true,
    mixIds: ranked.map((mix) => mix.id),
    mixes: ranked.map(cloneMixView),
    isSystem: true,
  };
};

const buildRailView = (rail: RailRecord, guestOnly: boolean): RailView => ({
  id: rail.id,
  name: rail.name,
  description: rail.description,
  type: rail.type,
  active: rail.active,
  mixIds: [...rail.mixIds],
  mixes: getMixByIds(rail.mixIds, guestOnly),
  isSystem: false,
});

const initialMixRecords = (): MixRecord[] =>
  seedMixes.map((mix) => ({
    id: mix.id,
    name: mix.name,
    description: mix.description,
    componentIds: [...mix.componentIds],
    popularity: mix.popularity,
    baseAvgRating: mix.avgRating,
    available: true,
    ratings: [],
  }));

const initialInventoryTobaccos = (): Tobacco[] => tobaccos.map(cloneTobacco);

const initialRailRecords = (): RailRecord[] => defaultRails().map(cloneRailRecord);

let mixRecords = initialMixRecords();
let inventoryTobaccos = initialInventoryTobaccos();
let railRecords = initialRailRecords();
let smokeCtaEvents: SmokeCtaEvent[] = [];
let mixSequence = 1;
let railSequence = 1;

export const resetNomadState = () => {
  mixRecords = initialMixRecords();
  inventoryTobaccos = initialInventoryTobaccos();
  railRecords = initialRailRecords();
  smokeCtaEvents = [];
  mixSequence = 1;
  railSequence = 1;
};

export const getGuestIntroCards = () => introCards.map((card) => ({ ...card, bullets: [...card.bullets] }));

export const getInventoryTobaccos = () => inventoryTobaccos.map(cloneTobacco);

export const getTobaccoById = (id: string) => {
  const tobacco = getInventoryTobaccoInternal(id);
  return tobacco ? cloneTobacco(tobacco) : null;
};

export const updateTobaccoInStock = (id: string, inStock: boolean) => {
  const tobacco = getInventoryTobaccoInternal(id);
  if (!tobacco) {
    return null;
  }

  tobacco.inStock = inStock;
  return cloneTobacco(tobacco);
};

export const getAvailableMixCatalog = () => mixRecords.map(buildMixView).map(cloneMixView);

export const getMixById = (id: string) => {
  const mix = getMixRecordInternal(id);
  return mix ? buildMixView(mix) : null;
};

export const getGuestCatalogMixes = (filters?: { profiles?: string[]; flavors?: string[] }) => {
  const profiles = unique((filters?.profiles ?? []).map(normalizeToken).filter(Boolean));
  const flavors = unique((filters?.flavors ?? []).map(normalizeToken).filter(Boolean));

  return getAvailableMixCatalog()
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
    })
    .map(cloneMixView);
};

export const getGuestHomeRails = () => {
  const rails = [buildStatisticalRail(), ...railRecords.filter((rail) => rail.active).map((rail) => buildRailView(rail, true))];
  return rails.filter((rail) => rail.type === 'statistical' || rail.mixes.length > 0).map(cloneRailView);
};

export const getStaffMixes = () => mixRecords.map(buildMixView).map(cloneMixView);

const validateMixComponents = (componentIds: string[]) => {
  const normalized = unique(componentIds.map((id) => id.trim()).filter(Boolean));
  if (!normalized.length) {
    return { error: 'At least one component is required', componentIds: [] as string[] };
  }

  const missing = normalized.filter((componentId) => !getInventoryTobaccoInternal(componentId));
  if (missing.length) {
    return { error: `Unknown component ids: ${missing.join(', ')}`, componentIds: [] as string[] };
  }

  return { componentIds: normalized };
};

const validateMixInput = (payload: Partial<MixInput>) => {
  const name = payload.name?.trim();
  const description = payload.description?.trim();

  if (!name || !description) {
    return { error: 'Name and description are required' };
  }

  const componentValidation = validateMixComponents(payload.componentIds ?? []);
  if ('error' in componentValidation) {
    return { error: componentValidation.error };
  }

  return {
    name,
    description,
    componentIds: componentValidation.componentIds,
    available: payload.available ?? true,
    popularity: typeof payload.popularity === 'number' ? payload.popularity : 0,
    baseAvgRating: typeof payload.baseAvgRating === 'number' ? payload.baseAvgRating : 4.5,
  };
};

const nextMixId = (name: string) => `mix-${slugify(name)}-${mixSequence++}`;

export const createMix = (payload: Partial<MixInput>) => {
  const validated = validateMixInput(payload);
  if ('error' in validated) {
    return validated;
  }

  const mix: MixRecord = {
    id: nextMixId(validated.name),
    name: validated.name,
    description: validated.description,
    componentIds: [...validated.componentIds],
    popularity: validated.popularity,
    baseAvgRating: validated.baseAvgRating,
    available: validated.available,
    ratings: [],
  };

  mixRecords = [mix, ...mixRecords];
  return buildMixView(mix);
};

export const updateMix = (id: string, payload: MixPatch) => {
  const mix = getMixRecordInternal(id);
  if (!mix) {
    return null;
  }

  if (typeof payload.name === 'string') {
    const nextName = payload.name.trim();
    if (!nextName) {
      return { error: 'Name cannot be empty' };
    }
    mix.name = nextName;
  }

  if (typeof payload.description === 'string') {
    const nextDescription = payload.description.trim();
    if (!nextDescription) {
      return { error: 'Description cannot be empty' };
    }
    mix.description = nextDescription;
  }

  if (Array.isArray(payload.componentIds)) {
    const componentValidation = validateMixComponents(payload.componentIds);
    if ('error' in componentValidation) {
      return { error: componentValidation.error };
    }
    mix.componentIds = componentValidation.componentIds;
  }

  if (typeof payload.available === 'boolean') {
    mix.available = payload.available;
  }

  if (typeof payload.popularity === 'number') {
    mix.popularity = payload.popularity;
  }

  if (typeof payload.baseAvgRating === 'number') {
    mix.baseAvgRating = payload.baseAvgRating;
  }

  return buildMixView(mix);
};

const normalizeRailMixIds = (mixIds: string[]) => {
  const normalized = unique(mixIds.map((id) => id.trim()).filter(Boolean));
  if (!normalized.length) {
    return { error: 'At least one mix is required', mixIds: [] as string[] };
  }

  const missing = normalized.filter((mixId) => !getMixRecordInternal(mixId));
  if (missing.length) {
    return { error: `Unknown mix ids: ${missing.join(', ')}`, mixIds: [] as string[] };
  }

  return { mixIds: normalized };
};

const validateRailInput = (payload: Partial<RailInput>) => {
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
  const railMixIds = normalizeRailMixIds(payload.mixIds ?? []);
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

const nextRailId = (name: string) => `rail-${slugify(name)}-${railSequence++}`;

export const createRail = (payload: Partial<RailInput>) => {
  const validated = validateRailInput(payload);
  if ('error' in validated) {
    return validated;
  }

  const rail: RailRecord = {
    id: nextRailId(validated.name),
    name: validated.name,
    description: validated.description,
    type: validated.type,
    mixIds: [...validated.mixIds],
    active: validated.active,
  };

  railRecords = [rail, ...railRecords];
  return buildRailView(rail, false);
};

export const updateRail = (id: string, payload: RailPatch) => {
  if (id === 'rail-statistical-top') {
    return { error: 'Statistical rail is read-only' };
  }

  const rail = getRailRecordInternal(id);
  if (!rail) {
    return null;
  }

  if (typeof payload.name === 'string') {
    const nextName = payload.name.trim();
    if (!nextName) {
      return { error: 'Name cannot be empty' };
    }
    rail.name = nextName;
  }

  if (typeof payload.description === 'string') {
    const nextDescription = payload.description.trim();
    if (!nextDescription) {
      return { error: 'Description cannot be empty' };
    }
    rail.description = nextDescription;
  }

  if (payload.type) {
    if (payload.type === 'statistical') {
      return { error: 'Statistical rails are read-only' };
    }
    rail.type = payload.type;
  }

  if (Array.isArray(payload.mixIds)) {
    const railMixIds = normalizeRailMixIds(payload.mixIds);
    if ('error' in railMixIds) {
      return { error: railMixIds.error };
    }
    rail.mixIds = railMixIds.mixIds;
  }

  if (typeof payload.active === 'boolean') {
    rail.active = payload.active;
  }

  return buildRailView(rail, false);
};

export const getStaffRails = () => [buildStatisticalRail(), ...railRecords.map((rail) => buildRailView(rail, false))].map(cloneRailView);

export const recordSmokeCtaEvent = (mixId: string) => {
  const event = {
    mixId,
    createdAt: new Date().toISOString(),
  };

  smokeCtaEvents.push(event);
  return event;
};

export const getSmokeCtaEvents = () => smokeCtaEvents.slice();

export const rateMix = (id: string, value: number) => {
  const mix = getMixRecordInternal(id);
  if (!mix) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return { error: 'Rating value must be between 1 and 5' };
  }

  mix.ratings.push(value);
  return buildMixView(mix);
};

export const getInventorySummary = () => {
  const total = inventoryTobaccos.length;
  const inStockCount = inventoryTobaccos.filter((item) => item.inStock).length;

  return {
    total,
    inStockCount,
    outOfStockCount: total - inStockCount,
  };
};

export const getSmokeCtaSummary = () => {
  const counts = smokeCtaEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const topMixes = getAvailableMixCatalog()
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
    smokeCtaTotal: smokeCtaEvents.length,
    topMixes,
  };
};
