export type StaffUser = {
  login: string;
  name: string;
  role: 'admin' | 'nomad';
};

export type StaffAuthResponse = {
  accessToken: string;
  tokenType?: 'Bearer';
  user: StaffUser;
};

export type InventoryTobacco = {
  id: string;
  name: string;
  manufacturer: string;
  inStock: boolean;
  flavorProfiles?: string[];
  flavors?: string[];
};

export type DashboardSummary = {
  totalTobaccos: number;
  inStockCount: number;
  outOfStockCount: number;
  smokeCtaTotal: number;
  topMixes: Array<{
    mixId: string;
    name: string;
    smokeCtaCount: number;
  }>;
};

type DashboardSummaryPayload = {
  inventory?: {
    totalTobaccos?: number;
    total?: number;
    inStockCount?: number;
    outOfStockCount?: number;
  };
  totalTobaccos?: number;
  inStockCount?: number;
  outOfStockCount?: number;
  smokeCtaTotal?: number;
  topMixes?: unknown[];
};

export type MixComponent = {
  id: string;
  name: string;
  manufacturer: string;
  flavors: string[];
};

export type MixRecord = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  components: MixComponent[];
  flavorProfiles: string[];
  flavors: string[];
  avgRating: number;
  popularity: number;
  available: boolean;
};

export type RailType = 'statistical' | 'prepared' | 'curated';

export type RailMixReference = {
  id: string;
  name: string;
};

export type RailRecord = {
  id: string;
  name: string;
  type: RailType;
  description: string;
  mixIds: string[];
  mixes: RailMixReference[];
  active: boolean;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const toStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (typeof item === 'number' || typeof item === 'boolean') {
        return String(item).trim();
      }

      if (isRecord(item) && typeof item.name === 'string') {
        return item.name.trim();
      }

      return '';
    })
    .filter(Boolean);
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
};

const toRailType = (value: unknown): RailType => {
  return value === 'statistical' || value === 'prepared' || value === 'curated'
    ? value
    : 'prepared';
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const parseDelimitedList = (value: string) => {
  return uniqueStrings(
    value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
};

export const formatDelimitedList = (values: string[]) => values.join(', ');

export const readListPayload = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!isRecord(value)) {
    return [];
  }

  const collections = [value.items, value.mixes, value.rails, value.data];

  for (const collection of collections) {
    if (Array.isArray(collection)) {
      return collection as T[];
    }
  }

  return [];
};

export const readEntityPayload = <T>(value: unknown): T | null => {
  if (isRecord(value)) {
    const candidates = [value.item, value.mix, value.rail, value.data];

    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        return candidate as T;
      }
    }
  }

  return value === null || value === undefined ? null : (value as T);
};

const normalizeMixComponent = (value: unknown): MixComponent => {
  if (!isRecord(value)) {
    return {
      id: '',
      name: '',
      manufacturer: '',
      flavors: [],
    };
  }

  return {
    id: String(value.id ?? value.componentId ?? ''),
    name: String(value.name ?? value.title ?? ''),
    manufacturer: String(value.manufacturer ?? ''),
    flavors: uniqueStrings(toStringList(value.flavors)),
  };
};

const normalizeRailMixReference = (value: unknown): RailMixReference => {
  if (!isRecord(value)) {
    const stringValue = String(value ?? '');
    return {
      id: stringValue,
      name: stringValue,
    };
  }

  const id = String(value.id ?? value.mixId ?? '');
  return {
    id,
    name: String(value.name ?? value.mixName ?? id),
  };
};

export const normalizeMixRecord = (value: unknown): MixRecord => {
  const raw = isRecord(value) ? value : {};
  const components = readListPayload<unknown>(raw.components).map(normalizeMixComponent);
  const componentIds = uniqueStrings([
    ...toStringList(raw.componentIds),
    ...components.map((component) => component.id),
  ]);

  return {
    id: String(raw.id ?? raw.mixId ?? ''),
    name: String(raw.name ?? 'Без названия'),
    description: String(raw.description ?? ''),
    componentIds,
    components,
    flavorProfiles: uniqueStrings(toStringList(raw.flavorProfiles)),
    flavors: uniqueStrings(toStringList(raw.flavors)),
    avgRating: toNumber(raw.avgRating, 0),
    popularity: toNumber(raw.popularity, 0),
    available: toBoolean(raw.available ?? raw.inStock, true),
  };
};

export const normalizeRailRecord = (value: unknown): RailRecord => {
  const raw = isRecord(value) ? value : {};
  const mixes = readListPayload<unknown>(raw.mixes).map(normalizeRailMixReference);
  const mixIds = uniqueStrings([...toStringList(raw.mixIds), ...mixes.map((mix) => mix.id)]);

  return {
    id: String(raw.id ?? raw.railId ?? ''),
    name: String(raw.name ?? 'Без названия'),
    type: toRailType(raw.type),
    description: String(raw.description ?? ''),
    mixIds,
    mixes,
    active: toBoolean(raw.active, true),
  };
};

export const normalizeDashboardSummary = (value: unknown): DashboardSummary => {
  const raw = isRecord(value) ? (value as DashboardSummaryPayload) : {};
  const inventory = isRecord(raw.inventory) ? raw.inventory : {};

  return {
    totalTobaccos: toNumber(raw.totalTobaccos ?? inventory.totalTobaccos ?? inventory.total, 0),
    inStockCount: toNumber(raw.inStockCount ?? inventory.inStockCount, 0),
    outOfStockCount: toNumber(raw.outOfStockCount ?? inventory.outOfStockCount, 0),
    smokeCtaTotal: toNumber(raw.smokeCtaTotal, 0),
    topMixes: readListPayload<unknown>(raw.topMixes).map((item) => {
      if (!isRecord(item)) {
        const stringValue = String(item ?? '');
        return {
          mixId: stringValue,
          name: stringValue,
          smokeCtaCount: 0,
        };
      }

      return {
        mixId: String(item.mixId ?? item.id ?? ''),
        name: String(item.name ?? item.mixName ?? ''),
        smokeCtaCount: toNumber(item.smokeCtaCount ?? item.count, 0),
      };
    }),
  };
};

export const sortMixes = (items: MixRecord[]) => {
  const copy = [...items];

  return copy.sort((left, right) => {
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
  });
};

export const sortRails = (items: RailRecord[]) => {
  const rank: Record<RailType, number> = {
    statistical: 0,
    prepared: 1,
    curated: 2,
  };

  const copy = [...items];

  return copy.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (rank[left.type] !== rank[right.type]) {
      return rank[left.type] - rank[right.type];
    }

    return left.name.localeCompare(right.name, 'ru');
  });
};

export const railTypeOptions: Array<{ value: RailType; label: string }> = [
  { value: 'statistical', label: 'Статистический' },
  { value: 'prepared', label: 'Предзаготовленный' },
  { value: 'curated', label: 'Собранный мастером' },
];

export const formatRailType = (value: RailType) => {
  return railTypeOptions.find((item) => item.value === value)?.label ?? 'Предзаготовленный';
};

export const buildInventorySummary = (items: InventoryTobacco[]) => {
  const totalTobaccos = items.length;
  const inStockCount = items.filter((item) => item.inStock).length;
  const outOfStockCount = totalTobaccos - inStockCount;

  return {
    totalTobaccos,
    inStockCount,
    outOfStockCount,
  };
};

export const sortInventoryItems = (items: InventoryTobacco[]) => {
  return [...items].sort((left, right) => {
    if (left.inStock !== right.inStock) {
      return left.inStock ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'ru');
  });
};

export const formatMetricValue = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value);
};
