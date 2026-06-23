export type StaffUser = {
  login: string;
  name: string;
  role: 'admin' | 'master';
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
  lineName?: string;
  country?: string | null;
  officialStrength?: string | null;
  communityStrength?: string | null;
  productionStatus?: string | null;
  description?: string | null;
  inStock: boolean;
  archived: boolean;
  flavorProfiles?: string[];
  flavors?: string[];
  flavorTags?: string[];
  updatedAt?: string;
  dependentMixCount?: number;
  blockedDependentMixCount?: number;
  dependentMixes?: InventoryDependentMix[];
};

export type InventoryDependentMix = {
  id: string;
  name: string;
  available: boolean;
  guestVisible: boolean;
  avgRating: number;
  popularity: number;
};

export type InventoryStockFilter = 'all' | 'in-stock' | 'out-of-stock';

export type InventoryArchivedFilter = 'active' | 'archived' | 'all';

export type InventorySortField = 'stock' | 'name' | 'manufacturer' | 'updatedAt' | 'dependentMixes';

export type InventorySortDirection = 'asc' | 'desc';

export type InventoryListFilters = {
  search: string;
  stock: InventoryStockFilter;
  archived: InventoryArchivedFilter;
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

export type InventoryListSort = {
  field: InventorySortField;
  direction: InventorySortDirection;
};

export type InventoryListMeta = {
  totalItems: number;
  filteredItems: number;
  inStockCount: number;
  outOfStockCount: number;
  inMixesCount: number;
  archivedCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type InventoryListResponse = {
  items: InventoryTobacco[];
  filters: InventoryListFilters;
  sort: InventoryListSort;
  meta: InventoryListMeta;
};

export type InventoryBatchAction = 'set-in-stock' | 'set-out-of-stock' | 'archive' | 'unarchive';

export type InventoryBatchResponse = {
  action: InventoryBatchAction;
  ids: string[];
  skippedIds: string[];
  processedCount: number;
  items: InventoryTobacco[];
};

export type InventoryFilterKey = 'manufacturers' | 'flavorProfiles' | 'flavors' | 'flavorTags';

export const defaultInventoryListResponse: InventoryListResponse = {
  items: [],
  filters: {
    search: '',
    stock: 'all',
    archived: 'active',
    manufacturers: [],
    flavorProfiles: [],
    flavors: [],
    flavorTags: [],
    options: {
      manufacturers: [],
      flavorProfiles: [],
      flavors: [],
      flavorTags: [],
    },
  },
  sort: {
    field: 'stock',
    direction: 'desc',
  },
  meta: {
    totalItems: 0,
    filteredItems: 0,
    inStockCount: 0,
    outOfStockCount: 0,
    inMixesCount: 0,
    archivedCount: 0,
    page: 1,
    pageSize: 100,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export type MixStatusFilter = 'all' | 'guest-visible' | 'hidden' | 'blocked';

export type MixRailFilter = 'all' | 'in-rails' | 'without-rails';

export type MixSortField = 'popularity' | 'avgRating' | 'name' | 'updatedAt' | 'rails';

export type MixSortDirection = 'asc' | 'desc';

export type MixListFilters = {
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

export type MixListSort = {
  field: MixSortField;
  direction: MixSortDirection;
};

export type MixListMeta = {
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

export type MixFilterKey = 'manufacturers' | 'flavorProfiles' | 'flavors' | 'flavorTags';

export type MixComponent = {
  id: string;
  tobaccoId: string;
  name: string;
  manufacturer: string;
  flavors: string[];
  proportion: number;
  sortOrder: number;
};

export type RailType = 'statistical' | 'prepared' | 'curated';

export type MixRailMembership = {
  id: string;
  name: string;
  type: RailType;
  active: boolean;
};

export type MixRecord = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  components: MixComponent[];
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  avgRating: number;
  ratingsCount: number;
  popularity: number;
  available: boolean;
  guestVisible: boolean;
  createdAt: string;
  updatedAt: string;
  railMemberships: MixRailMembership[];
  railCount: number;
  activeRailCount: number;
};

export type MixListResponse = {
  items: MixRecord[];
  filters: MixListFilters;
  sort: MixListSort;
  meta: MixListMeta;
};

export const defaultMixListResponse: MixListResponse = {
  items: [],
  filters: {
    search: '',
    status: 'all',
    railState: 'all',
    manufacturers: [],
    flavorProfiles: [],
    flavors: [],
    flavorTags: [],
    options: {
      manufacturers: [],
      flavorProfiles: [],
      flavors: [],
      flavorTags: [],
    },
  },
  sort: {
    field: 'popularity',
    direction: 'desc',
  },
  meta: {
    totalItems: 0,
    filteredItems: 0,
    guestVisibleCount: 0,
    hiddenCount: 0,
    blockedCount: 0,
    inRailsCount: 0,
    withoutRailsCount: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export type DailyAccessCodeRecord = {
  id: string;
  codeValue: string;
  codeLabel: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

export type StaffAccountRecord = {
  id: string;
  login: string;
  name: string;
  role: StaffUser['role'];
  active: boolean;
};

export type TelegramRecipientScope = 'allowed' | 'broadcast' | 'rotate';

export type TelegramRecipientRecord = {
  id: string;
  chatId: string;
  label: string;
  scope: TelegramRecipientScope;
  active: boolean;
};

export type TelegramOperatorRecord = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  linkedChatId: string;
  linkedTelegramUserId: string;
  linkedUsername: string;
  linkedDisplayName: string;
  linkedAt: string;
  lastCodeRequestedAt: string;
};

export type TelegramAutomationHealth = 'unknown' | 'healthy' | 'stale' | 'error';

export type TelegramAutomationStateRecord = {
  id: string;
  health: TelegramAutomationHealth;
  lastHeartbeatAt: string;
  lastRotateAt: string;
  lastRotateCodeId: string;
  lastRotateCodeValue: string;
  lastBroadcastAt: string;
  lastBroadcastCodeId: string;
  lastBroadcastCodeValue: string;
  lastBroadcastDayKey: string;
  lastRequestAt: string;
  lastRequestChatId: string;
  lastRequestOperatorId: string;
  lastRequestOperatorName: string;
  lastRequestPhone: string;
  lastRequestCodeId: string;
  lastRequestCodeValue: string;
  lastErrorAt: string;
  lastErrorMessage: string;
  updatedAt: string;
};

export type AuditEventRecord = {
  id: string;
  actorLogin: string;
  actorName: string;
  actorRole: StaffUser['role'];
  action: 'create' | 'update' | 'delete' | 'toggle';
  entityType: 'daily-code' | 'staff-account' | 'telegram-operator' | 'telegram-recipient' | 'mix' | 'rail' | 'inventory';
  entityId: string;
  entityLabel: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type DashboardWindowKey = '7d' | '14d' | '30d';

export type DashboardBreakdownItem = {
  key: string;
  label: string;
  total: number;
  inStockCount: number;
  outOfStockCount: number;
};

export type DashboardMixMetric = {
  mixId: string;
  name: string;
  smokeCtaCount: number;
  avgRating: number;
  ratingsCount: number;
  popularity: number;
};

export type DashboardBlockedMix = {
  mixId: string;
  name: string;
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

export type DashboardSummary = {
  window: {
    key: DashboardWindowKey;
    label: string;
    days: number;
    startsAt: string;
    endsAt: string;
  };
  totalTobaccos: number;
  inStockCount: number;
  outOfStockCount: number;
  smokeCtaTotal: number;
  ratingsTotal: number;
  avgGuestRating: number;
  topMixes: DashboardMixMetric[];
  topRatedMixes: DashboardMixMetric[];
  ratingDistribution: Array<{
    value: number;
    count: number;
  }>;
  activity: Array<{
    date: string;
    smokeCtaCount: number;
    ratingsCount: number;
  }>;
  inventory: {
    totalTobaccos: number;
    inStockCount: number;
    outOfStockCount: number;
    manufacturers: DashboardBreakdownItem[];
    flavorProfiles: DashboardBreakdownItem[];
    topFlavors: DashboardBreakdownItem[];
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

export const dashboardWindowOptions: Array<{ key: DashboardWindowKey; label: string }> = [
  { key: '7d', label: '7 дней' },
  { key: '14d', label: '14 дней' },
  { key: '30d', label: '30 дней' },
];

type DashboardSummaryPayload = {
  window?: {
    key?: unknown;
    label?: unknown;
    days?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
  };
  inventory?: {
    totalTobaccos?: number;
    total?: number;
    inStockCount?: number;
    outOfStockCount?: number;
    manufacturers?: unknown[];
    flavorProfiles?: unknown[];
    topFlavors?: unknown[];
  };
  product?: {
    smokeCtaTotal?: unknown;
    ratingsTotal?: unknown;
    avgGuestRating?: unknown;
    topMixes?: unknown[];
    topRatedMixes?: unknown[];
    ratingDistribution?: unknown[];
    activity?: unknown[];
  };
  ops?: {
    guestVisibleMixesCount?: unknown;
    hiddenMixesCount?: unknown;
    blockedByInventoryCount?: unknown;
    activeRailsCount?: unknown;
    emptyActiveRailsCount?: unknown;
    blockedMixes?: unknown[];
    railHealth?: unknown[];
  };
  totalTobaccos?: number;
  inStockCount?: number;
  outOfStockCount?: number;
  smokeCtaTotal?: number;
  ratingsTotal?: number;
  avgGuestRating?: number;
  topMixes?: unknown[];
};

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
  editable: boolean;
  readOnlyReason: string;
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

const toTelegramRecipientScope = (value: unknown): TelegramRecipientScope => {
  return value === 'allowed' || value === 'broadcast' || value === 'rotate'
    ? value
    : 'allowed';
};

const toTelegramAutomationHealth = (value: unknown): TelegramAutomationHealth => {
  return value === 'healthy' || value === 'stale' || value === 'error' || value === 'unknown'
    ? value
    : 'unknown';
};

const toDashboardWindowKey = (value: unknown): DashboardWindowKey => {
  return value === '7d' || value === '14d' || value === '30d' ? value : '14d';
};

const toInventoryStockFilter = (value: unknown): InventoryStockFilter => {
  return value === 'in-stock' || value === 'out-of-stock' || value === 'all' ? value : 'all';
};

const toInventoryArchivedFilter = (value: unknown): InventoryArchivedFilter => {
  return value === 'archived' || value === 'all' || value === 'active' ? value : 'active';
};

const toInventorySortField = (value: unknown): InventorySortField => {
  return value === 'name'
    || value === 'manufacturer'
    || value === 'updatedAt'
    || value === 'dependentMixes'
    || value === 'stock'
      ? value
      : 'stock';
};

const toInventorySortDirection = (value: unknown): InventorySortDirection => {
  return value === 'asc' || value === 'desc' ? value : 'desc';
};

const toMixStatusFilter = (value: unknown): MixStatusFilter => {
  return value === 'guest-visible' || value === 'hidden' || value === 'blocked' || value === 'all'
    ? value
    : 'all';
};

const toMixRailFilter = (value: unknown): MixRailFilter => {
  return value === 'in-rails' || value === 'without-rails' || value === 'all'
    ? value
    : 'all';
};

const toMixSortField = (value: unknown): MixSortField => {
  return value === 'avgRating' || value === 'name' || value === 'updatedAt' || value === 'rails' || value === 'popularity'
    ? value
    : 'popularity';
};

const toMixSortDirection = (value: unknown): MixSortDirection => {
  return value === 'asc' || value === 'desc' ? value : 'desc';
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const toIsoString = (value: unknown, fallback = '') => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  return fallback;
};

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

  const collections = [value.items, value.mixes, value.rails, value.codes, value.accounts, value.data];

  for (const collection of collections) {
    if (Array.isArray(collection)) {
      return collection as T[];
    }
  }

  return [];
};

export const readEntityPayload = <T>(value: unknown): T | null => {
  if (isRecord(value)) {
    const candidates = [value.item, value.mix, value.rail, value.code, value.account, value.data];

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
      tobaccoId: '',
      name: '',
      manufacturer: '',
      flavors: [],
      proportion: 0,
      sortOrder: 0,
    };
  }

  return {
    id: String(value.id ?? value.componentId ?? value.tobaccoId ?? ''),
    tobaccoId: String(value.tobaccoId ?? value.id ?? value.componentId ?? ''),
    name: String(value.name ?? value.title ?? ''),
    manufacturer: String(value.manufacturer ?? ''),
    flavors: uniqueStrings(toStringList(value.flavors)),
    proportion: toNumber(value.proportion, 0),
    sortOrder: toNumber(value.sortOrder, 0),
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

export const normalizeDailyAccessCodeRecord = (value: unknown): DailyAccessCodeRecord => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.codeId ?? ''),
    codeValue: String(raw.codeValue ?? raw.code ?? ''),
    codeLabel: String(raw.codeLabel ?? raw.label ?? 'Код доступа'),
    active: toBoolean(raw.active, true),
    startsAt: toIsoString(raw.startsAt ?? raw.starts_at, ''),
    endsAt: toIsoString(raw.endsAt ?? raw.ends_at, ''),
  };
};

export const normalizeStaffAccountRecord = (value: unknown): StaffAccountRecord => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.accountId ?? ''),
    login: String(raw.login ?? ''),
    name: String(raw.name ?? ''),
    role: raw.role === 'admin' ? 'admin' : 'master',
    active: toBoolean(raw.active, true),
  };
};

export const normalizeTelegramRecipientRecord = (value: unknown): TelegramRecipientRecord => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.recipientId ?? ''),
    chatId: String(raw.chatId ?? raw.chat_id ?? ''),
    label: String(raw.label ?? raw.name ?? ''),
    scope: toTelegramRecipientScope(raw.scope),
    active: toBoolean(raw.active, true),
  };
};

export const normalizeTelegramOperatorRecord = (value: unknown): TelegramOperatorRecord => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.operatorId ?? ''),
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    active: toBoolean(raw.active, true),
    linkedChatId: String(raw.linkedChatId ?? ''),
    linkedTelegramUserId: String(raw.linkedTelegramUserId ?? ''),
    linkedUsername: String(raw.linkedUsername ?? ''),
    linkedDisplayName: String(raw.linkedDisplayName ?? ''),
    linkedAt: toIsoString(raw.linkedAt, ''),
    lastCodeRequestedAt: toIsoString(raw.lastCodeRequestedAt, ''),
  };
};

export const normalizeTelegramAutomationStateRecord = (value: unknown): TelegramAutomationStateRecord => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? 'telegram-bot-status'),
    health: toTelegramAutomationHealth(raw.health),
    lastHeartbeatAt: toIsoString(raw.lastHeartbeatAt, ''),
    lastRotateAt: toIsoString(raw.lastRotateAt, ''),
    lastRotateCodeId: String(raw.lastRotateCodeId ?? ''),
    lastRotateCodeValue: String(raw.lastRotateCodeValue ?? ''),
    lastBroadcastAt: toIsoString(raw.lastBroadcastAt, ''),
    lastBroadcastCodeId: String(raw.lastBroadcastCodeId ?? ''),
    lastBroadcastCodeValue: String(raw.lastBroadcastCodeValue ?? ''),
    lastBroadcastDayKey: String(raw.lastBroadcastDayKey ?? ''),
    lastRequestAt: toIsoString(raw.lastRequestAt, ''),
    lastRequestChatId: String(raw.lastRequestChatId ?? ''),
    lastRequestOperatorId: String(raw.lastRequestOperatorId ?? ''),
    lastRequestOperatorName: String(raw.lastRequestOperatorName ?? ''),
    lastRequestPhone: String(raw.lastRequestPhone ?? ''),
    lastRequestCodeId: String(raw.lastRequestCodeId ?? ''),
    lastRequestCodeValue: String(raw.lastRequestCodeValue ?? ''),
    lastErrorAt: toIsoString(raw.lastErrorAt, ''),
    lastErrorMessage: String(raw.lastErrorMessage ?? ''),
    updatedAt: toIsoString(raw.updatedAt, ''),
  };
};

export const normalizeAuditEventRecord = (value: unknown): AuditEventRecord => {
  const raw = isRecord(value) ? value : {};
  const details = isRecord(raw.details) ? raw.details : {};
  const action = raw.action === 'create' || raw.action === 'update' || raw.action === 'delete' || raw.action === 'toggle'
    ? raw.action
    : 'update';
  const entityType =
    raw.entityType === 'daily-code'
    || raw.entityType === 'staff-account'
    || raw.entityType === 'telegram-operator'
    || raw.entityType === 'telegram-recipient'
    || raw.entityType === 'mix'
    || raw.entityType === 'rail'
    || raw.entityType === 'inventory'
      ? raw.entityType
      : 'inventory';

  return {
    id: String(raw.id ?? ''),
    actorLogin: String(raw.actorLogin ?? ''),
    actorName: String(raw.actorName ?? ''),
    actorRole: raw.actorRole === 'admin' ? 'admin' : 'master',
    action,
    entityType,
    entityId: String(raw.entityId ?? ''),
    entityLabel: String(raw.entityLabel ?? ''),
    details,
    createdAt: toIsoString(raw.createdAt, ''),
  };
};

export const normalizeInventoryDependentMix = (value: unknown): InventoryDependentMix => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.mixId ?? ''),
    name: String(raw.name ?? raw.mixName ?? ''),
    available: toBoolean(raw.available, true),
    guestVisible: toBoolean(raw.guestVisible, true),
    avgRating: toNumber(raw.avgRating, 0),
    popularity: toNumber(raw.popularity, 0),
  };
};

export const normalizeInventoryTobacco = (value: unknown): InventoryTobacco => {
  const raw = isRecord(value) ? value : {};

  return {
    id: String(raw.id ?? raw.tobaccoId ?? ''),
    name: String(raw.name ?? ''),
    manufacturer: String(raw.manufacturer ?? ''),
    lineName: String(raw.lineName ?? ''),
    country: raw.country == null ? null : String(raw.country),
    officialStrength: raw.officialStrength == null ? null : String(raw.officialStrength),
    communityStrength: raw.communityStrength == null ? null : String(raw.communityStrength),
    productionStatus: raw.productionStatus == null ? null : String(raw.productionStatus),
    description: raw.description == null ? null : String(raw.description),
    inStock: toBoolean(raw.inStock, true),
    archived: toBoolean(raw.archived, false),
    flavorProfiles: uniqueStrings(toStringList(raw.flavorProfiles)),
    flavors: uniqueStrings(toStringList(raw.flavors)),
    flavorTags: uniqueStrings(toStringList(raw.flavorTags)),
    updatedAt: toIsoString(raw.updatedAt, ''),
    dependentMixCount: toNumber(raw.dependentMixCount, 0),
    blockedDependentMixCount: toNumber(raw.blockedDependentMixCount, 0),
    dependentMixes: readListPayload<unknown>(raw.dependentMixes).map(normalizeInventoryDependentMix),
  };
};

export const normalizeMixRecord = (value: unknown): MixRecord => {
  const raw = isRecord(value) ? value : {};
  const components = readListPayload<unknown>(raw.components).map(normalizeMixComponent);
  const railMemberships = readListPayload<unknown>(raw.railMemberships).map((item) => {
    const source = isRecord(item) ? item : {};
    return {
      id: String(source.id ?? source.railId ?? ''),
      name: String(source.name ?? source.railName ?? ''),
      type: toRailType(source.type),
      active: toBoolean(source.active, true),
    } satisfies MixRailMembership;
  });
  const componentIds = uniqueStrings([
    ...toStringList(raw.componentIds),
    ...components.map((component) => component.tobaccoId || component.id),
  ]);

  return {
    id: String(raw.id ?? raw.mixId ?? ''),
    name: String(raw.name ?? 'Без названия'),
    description: String(raw.description ?? ''),
    componentIds,
    components,
    flavorProfiles: uniqueStrings(toStringList(raw.flavorProfiles)),
    flavors: uniqueStrings(toStringList(raw.flavors)),
    flavorTags: uniqueStrings(toStringList(raw.flavorTags)),
    avgRating: toNumber(raw.avgRating, 0),
    ratingsCount: toNumber(raw.ratingsCount, 0),
    popularity: toNumber(raw.popularity, 0),
    available: toBoolean(raw.available ?? raw.inStock, true),
    guestVisible: toBoolean(raw.guestVisible, toBoolean(raw.available ?? raw.inStock, true)),
    createdAt: toIsoString(raw.createdAt, ''),
    updatedAt: toIsoString(raw.updatedAt, ''),
    railMemberships,
    railCount: toNumber(raw.railCount, railMemberships.length),
    activeRailCount: toNumber(raw.activeRailCount, railMemberships.filter((item) => item.active).length),
  };
};

export const normalizeMixListResponse = (value: unknown): MixListResponse => {
  const raw = isRecord(value) ? value : {};
  const filters = isRecord(raw.filters) ? raw.filters : {};
  const sort = isRecord(raw.sort) ? raw.sort : {};
  const meta = isRecord(raw.meta) ? raw.meta : {};
  const options = isRecord(filters.options) ? filters.options : {};

  return {
    items: readListPayload<unknown>(raw.items ?? raw).map(normalizeMixRecord),
    filters: {
      search: String(filters.search ?? ''),
      status: toMixStatusFilter(filters.status),
      railState: toMixRailFilter(filters.railState),
      manufacturers: uniqueStrings(toStringList(filters.manufacturers)),
      flavorProfiles: uniqueStrings(toStringList(filters.flavorProfiles)),
      flavors: uniqueStrings(toStringList(filters.flavors)),
      flavorTags: uniqueStrings(toStringList(filters.flavorTags)),
      options: {
        manufacturers: uniqueStrings(toStringList(options.manufacturers)),
        flavorProfiles: uniqueStrings(toStringList(options.flavorProfiles)),
        flavors: uniqueStrings(toStringList(options.flavors)),
        flavorTags: uniqueStrings(toStringList(options.flavorTags)),
      },
    },
    sort: {
      field: toMixSortField(sort.field),
      direction: toMixSortDirection(sort.direction),
    },
    meta: {
      totalItems: toNumber(meta.totalItems, 0),
      filteredItems: toNumber(meta.filteredItems, 0),
      guestVisibleCount: toNumber(meta.guestVisibleCount, 0),
      hiddenCount: toNumber(meta.hiddenCount, 0),
      blockedCount: toNumber(meta.blockedCount, 0),
      inRailsCount: toNumber(meta.inRailsCount, 0),
      withoutRailsCount: toNumber(meta.withoutRailsCount, 0),
      page: Math.max(1, toNumber(meta.page, 1)),
      pageSize: Math.max(1, toNumber(meta.pageSize, 25)),
      totalPages: Math.max(1, toNumber(meta.totalPages, 1)),
      hasNextPage: toBoolean(meta.hasNextPage, false),
      hasPreviousPage: toBoolean(meta.hasPreviousPage, false),
    },
  };
};

export const normalizeRailRecord = (value: unknown): RailRecord => {
  const raw = isRecord(value) ? value : {};
  const mixes = readListPayload<unknown>(raw.mixes).map(normalizeRailMixReference);
  const mixIds = uniqueStrings([...toStringList(raw.mixIds), ...mixes.map((mix) => mix.id)]);
  const type = toRailType(raw.type);
  const editable = toBoolean(raw.editable, type !== 'statistical');
  const readOnlyReason = String(
    raw.readOnlyReason ?? (editable ? '' : 'Статистический рейл формируется автоматически и доступен только для просмотра.'),
  );

  return {
    id: String(raw.id ?? raw.railId ?? ''),
    name: String(raw.name ?? 'Без названия'),
    type,
    description: String(raw.description ?? ''),
    mixIds,
    mixes,
    active: toBoolean(raw.active, true),
    editable,
    readOnlyReason,
  };
};

export const normalizeDashboardSummary = (value: unknown): DashboardSummary => {
  const raw = isRecord(value) ? (value as DashboardSummaryPayload) : {};
  const inventory = isRecord(raw.inventory) ? raw.inventory : {};
  const product = isRecord(raw.product) ? raw.product : {};
  const ops = isRecord(raw.ops) ? raw.ops : {};
  const window = isRecord(raw.window) ? raw.window : {};

  const normalizeMixMetric = (item: unknown): DashboardMixMetric => {
    if (!isRecord(item)) {
      const stringValue = String(item ?? '');
      return {
        mixId: stringValue,
        name: stringValue,
        smokeCtaCount: 0,
        avgRating: 0,
        ratingsCount: 0,
        popularity: 0,
      };
    }

    return {
      mixId: String(item.mixId ?? item.id ?? ''),
      name: String(item.name ?? item.mixName ?? ''),
      smokeCtaCount: toNumber(item.smokeCtaCount ?? item.count, 0),
      avgRating: toNumber(item.avgRating, 0),
      ratingsCount: toNumber(item.ratingsCount, 0),
      popularity: toNumber(item.popularity, 0),
    };
  };

  const normalizeBreakdownItem = (item: unknown): DashboardBreakdownItem => {
    const source = isRecord(item) ? item : {};

    return {
      key: String(source.key ?? source.id ?? source.label ?? ''),
      label: String(source.label ?? source.name ?? source.key ?? ''),
      total: toNumber(source.total, 0),
      inStockCount: toNumber(source.inStockCount, 0),
      outOfStockCount: toNumber(source.outOfStockCount, 0),
    };
  };

  const normalizeBlockedMix = (item: unknown): DashboardBlockedMix => {
    const source = isRecord(item) ? item : {};

    return {
      mixId: String(source.mixId ?? source.id ?? ''),
      name: String(source.name ?? source.mixName ?? ''),
      missingComponents: uniqueStrings(toStringList(source.missingComponents)),
      railNames: uniqueStrings(toStringList(source.railNames)),
      smokeCtaCount: toNumber(source.smokeCtaCount, 0),
    };
  };

  const normalizeRailHealthItem = (item: unknown): DashboardRailHealthItem => {
    const source = isRecord(item) ? item : {};

    return {
      railId: String(source.railId ?? source.id ?? ''),
      name: String(source.name ?? 'Без названия'),
      type: toRailType(source.type),
      active: toBoolean(source.active, true),
      totalMixCount: toNumber(source.totalMixCount, 0),
      visibleMixCount: toNumber(source.visibleMixCount, 0),
      hiddenMixCount: toNumber(source.hiddenMixCount, 0),
    };
  };

  return {
    window: {
      key: toDashboardWindowKey(window.key),
      label: String(window.label ?? dashboardWindowOptions.find((item) => item.key === toDashboardWindowKey(window.key))?.label ?? '14 дней'),
      days: toNumber(window.days, 14),
      startsAt: toIsoString(window.startsAt, ''),
      endsAt: toIsoString(window.endsAt, ''),
    },
    totalTobaccos: toNumber(raw.totalTobaccos ?? inventory.totalTobaccos ?? inventory.total, 0),
    inStockCount: toNumber(raw.inStockCount ?? inventory.inStockCount, 0),
    outOfStockCount: toNumber(raw.outOfStockCount ?? inventory.outOfStockCount, 0),
    smokeCtaTotal: toNumber(raw.smokeCtaTotal ?? product.smokeCtaTotal, 0),
    ratingsTotal: toNumber(raw.ratingsTotal ?? product.ratingsTotal, 0),
    avgGuestRating: toNumber(raw.avgGuestRating ?? product.avgGuestRating, 0),
    topMixes: readListPayload<unknown>(raw.topMixes ?? product.topMixes).map(normalizeMixMetric),
    topRatedMixes: readListPayload<unknown>(product.topRatedMixes).map(normalizeMixMetric),
    ratingDistribution: readListPayload<unknown>(product.ratingDistribution).map((item) => {
      const source = isRecord(item) ? item : {};
      return {
        value: toNumber(source.value, 0),
        count: toNumber(source.count, 0),
      };
    }),
    activity: readListPayload<unknown>(product.activity).map((item) => {
      const source = isRecord(item) ? item : {};
      return {
        date: toIsoString(source.date, ''),
        smokeCtaCount: toNumber(source.smokeCtaCount, 0),
        ratingsCount: toNumber(source.ratingsCount, 0),
      };
    }),
    inventory: {
      totalTobaccos: toNumber(raw.totalTobaccos ?? inventory.totalTobaccos ?? inventory.total, 0),
      inStockCount: toNumber(raw.inStockCount ?? inventory.inStockCount, 0),
      outOfStockCount: toNumber(raw.outOfStockCount ?? inventory.outOfStockCount, 0),
      manufacturers: readListPayload<unknown>(inventory.manufacturers).map(normalizeBreakdownItem),
      flavorProfiles: readListPayload<unknown>(inventory.flavorProfiles).map(normalizeBreakdownItem),
      topFlavors: readListPayload<unknown>(inventory.topFlavors).map(normalizeBreakdownItem),
    },
    ops: {
      guestVisibleMixesCount: toNumber(ops.guestVisibleMixesCount, 0),
      hiddenMixesCount: toNumber(ops.hiddenMixesCount, 0),
      blockedByInventoryCount: toNumber(ops.blockedByInventoryCount, 0),
      activeRailsCount: toNumber(ops.activeRailsCount, 0),
      emptyActiveRailsCount: toNumber(ops.emptyActiveRailsCount, 0),
      blockedMixes: readListPayload<unknown>(ops.blockedMixes).map(normalizeBlockedMix),
      railHealth: readListPayload<unknown>(ops.railHealth).map(normalizeRailHealthItem),
    },
  };
};

export const normalizeInventoryListResponse = (value: unknown): InventoryListResponse => {
  const raw = isRecord(value) ? value : {};
  const filters = isRecord(raw.filters) ? raw.filters : {};
  const sort = isRecord(raw.sort) ? raw.sort : {};
  const meta = isRecord(raw.meta) ? raw.meta : {};
  const options = isRecord(filters.options) ? filters.options : {};

  return {
    items: readListPayload<unknown>(raw.items ?? raw).map(normalizeInventoryTobacco),
    filters: {
      search: String(filters.search ?? ''),
      stock: toInventoryStockFilter(filters.stock),
      archived: toInventoryArchivedFilter(filters.archived),
      manufacturers: uniqueStrings(toStringList(filters.manufacturers)),
      flavorProfiles: uniqueStrings(toStringList(filters.flavorProfiles)),
      flavors: uniqueStrings(toStringList(filters.flavors)),
      flavorTags: uniqueStrings(toStringList(filters.flavorTags)),
      options: {
        manufacturers: uniqueStrings(toStringList(options.manufacturers)),
        flavorProfiles: uniqueStrings(toStringList(options.flavorProfiles)),
        flavors: uniqueStrings(toStringList(options.flavors)),
        flavorTags: uniqueStrings(toStringList(options.flavorTags)),
      },
    },
    sort: {
      field: toInventorySortField(sort.field),
      direction: toInventorySortDirection(sort.direction),
    },
    meta: {
      totalItems: toNumber(meta.totalItems, 0),
      filteredItems: toNumber(meta.filteredItems, 0),
      inStockCount: toNumber(meta.inStockCount, 0),
      outOfStockCount: toNumber(meta.outOfStockCount, 0),
      inMixesCount: toNumber(meta.inMixesCount, 0),
      archivedCount: toNumber(meta.archivedCount, 0),
      page: Math.max(1, toNumber(meta.page, 1)),
      pageSize: Math.max(1, toNumber(meta.pageSize, 100)),
      totalPages: Math.max(1, toNumber(meta.totalPages, 1)),
      hasNextPage: toBoolean(meta.hasNextPage, false),
      hasPreviousPage: toBoolean(meta.hasPreviousPage, false),
    },
  };
};

export const normalizeInventoryBatchResponse = (value: unknown): InventoryBatchResponse => {
  const raw = isRecord(value) ? value : {};

  return {
    action: raw.action === 'set-in-stock'
      || raw.action === 'set-out-of-stock'
      || raw.action === 'archive'
      || raw.action === 'unarchive'
      ? raw.action
      : 'set-in-stock',
    ids: uniqueStrings(toStringList(raw.ids)),
    skippedIds: uniqueStrings(toStringList(raw.skippedIds)),
    processedCount: toNumber(raw.processedCount, 0),
    items: readListPayload<unknown>(raw.items).map(normalizeInventoryTobacco),
  };
};

export const buildInventoryRequestQuery = (
  filters: InventoryListFilters,
  sort: InventoryListSort,
  page: number,
  pageSize: number,
) => {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.stock !== 'all') {
    params.set('stock', filters.stock);
  }

  if (filters.archived !== 'active') {
    params.set('archived', filters.archived);
  }

  for (const value of filters.manufacturers) {
    params.append('manufacturers', value);
  }

  for (const value of filters.flavorProfiles) {
    params.append('flavorProfiles', value);
  }

  for (const value of filters.flavors) {
    params.append('flavors', value);
  }

  for (const value of filters.flavorTags) {
    params.append('flavorTags', value);
  }

  params.set('sort', sort.field);
  params.set('direction', sort.direction);
  params.set('page', String(Math.max(1, Math.trunc(page))));
  params.set('pageSize', String(Math.max(1, Math.trunc(pageSize))));

  return params.toString();
};

export const toggleInventoryFilterValue = (values: string[], value: string) => {
  const next = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

  return uniqueStrings(next);
};

export const buildMixRequestQuery = (
  filters: MixListFilters,
  sort: MixListSort,
  page: number,
  pageSize: number,
) => {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }

  if (filters.railState !== 'all') {
    params.set('railState', filters.railState);
  }

  for (const value of filters.manufacturers) {
    params.append('manufacturers', value);
  }

  for (const value of filters.flavorProfiles) {
    params.append('flavorProfiles', value);
  }

  for (const value of filters.flavors) {
    params.append('flavors', value);
  }

  for (const value of filters.flavorTags) {
    params.append('flavorTags', value);
  }

  params.set('sort', sort.field);
  params.set('direction', sort.direction);
  params.set('page', String(Math.max(1, Math.trunc(page))));
  params.set('pageSize', String(Math.max(1, Math.trunc(pageSize))));

  return params.toString();
};

export const toggleMixFilterValue = (values: string[], value: string) => {
  const next = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

  return uniqueStrings(next);
};

export const sortMixes = (items: MixRecord[]) => {
  const copy = [...items];

  return copy.sort((left, right) => {
    if (left.guestVisible !== right.guestVisible) {
      return left.guestVisible ? -1 : 1;
    }

    if (left.available !== right.available) {
      return left.available ? -1 : 1;
    }

    if (left.railCount !== right.railCount) {
      return right.railCount - left.railCount;
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

export const sortDailyAccessCodes = (items: DailyAccessCodeRecord[]) => {
  const copy = [...items];

  return copy.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (right.startsAt !== left.startsAt) {
      return right.startsAt.localeCompare(left.startsAt);
    }

    if (right.endsAt !== left.endsAt) {
      return right.endsAt.localeCompare(left.endsAt);
    }

    return left.codeLabel.localeCompare(right.codeLabel, 'ru');
  });
};

export const sortStaffAccounts = (items: StaffAccountRecord[]) => {
  const roleRank: Record<StaffUser['role'], number> = {
    admin: 0,
    master: 1,
  };

  const copy = [...items];

  return copy.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (roleRank[left.role] !== roleRank[right.role]) {
      return roleRank[left.role] - roleRank[right.role];
    }

    return left.login.localeCompare(right.login, 'ru');
  });
};

export const sortTelegramRecipients = (items: TelegramRecipientRecord[]) => {
  const scopeRank: Record<TelegramRecipientScope, number> = {
    allowed: 0,
    broadcast: 1,
    rotate: 2,
  };

  return [...items].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (scopeRank[left.scope] !== scopeRank[right.scope]) {
      return scopeRank[left.scope] - scopeRank[right.scope];
    }

    return left.chatId.localeCompare(right.chatId, 'ru');
  });
};

export const sortTelegramOperators = (items: TelegramOperatorRecord[]) => {
  return [...items].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (Boolean(left.linkedChatId) !== Boolean(right.linkedChatId)) {
      return left.linkedChatId ? -1 : 1;
    }

    if (right.lastCodeRequestedAt !== left.lastCodeRequestedAt) {
      return right.lastCodeRequestedAt.localeCompare(left.lastCodeRequestedAt);
    }

    return left.name.localeCompare(right.name, 'ru');
  });
};

export const railTypeOptions: Array<{ value: RailType; label: string }> = [
  { value: 'statistical', label: 'Статистический' },
  { value: 'prepared', label: 'Предзаготовленный' },
  { value: 'curated', label: 'Собранный мастером' },
];

export const telegramRecipientScopeOptions: Array<{ value: TelegramRecipientScope; label: string }> = [
  { value: 'allowed', label: 'Разрешённые чаты' },
  { value: 'broadcast', label: 'Авторассылка' },
  { value: 'rotate', label: 'Ручная ротация' },
];

export const formatRailType = (value: RailType) => {
  return railTypeOptions.find((item) => item.value === value)?.label ?? 'Предзаготовленный';
};

const flavorProfileLabels: Record<string, string> = {
  berry: 'Ягодные',
  citrus: 'Цитрусовые',
  dessert: 'Десертные',
  floral_herbal: 'Цветочно-травяные',
  fresh: 'Свежие',
  fruity: 'Фруктовые',
  minty: 'Мятные',
  perfume: 'Парфюмные',
  sour: 'Кислые',
  spicy: 'Пряные',
  sweet: 'Сладкие',
  tobacco: 'Табачные',
};

export const formatFlavorProfileLabel = (value: string) => {
  const normalized = value.trim().toLocaleLowerCase('en-US');
  return flavorProfileLabels[normalized] ?? value;
};

// Канонические ключи категорий вкуса для редактора инвентаря — английские
// ключи, совпадающие с flavorProfileLabels и с тем, что бэкенд хранит в
// NomadTobacco.flavorProfiles. Не русские лейблы: иначе выбранная категория не
// подсветится, а клик запишет в draft русский лейбл и затрёт ключ (issue #117).
export const INVENTORY_FLAVOR_PROFILE_KEYS = [
  'fruity',
  'berry',
  'citrus',
  'dessert',
  'sweet',
  'minty',
  'fresh',
  'spicy',
  'tobacco',
  'floral_herbal',
  'sour',
  'perfume',
] as const;

// Шкала крепости htreviews (5 градаций, женский род) — совпадает со значениями
// officialStrength/communityStrength из парсера каталога. Старые пресеты в
// мужском роде ('Лёгкий'/'Средний'/'Крепкий') не совпадали ни с одним
// реальным значением, поэтому чип крепости никогда не подсвечивался (issue #117).
export const INVENTORY_STRENGTH_PRESETS = [
  'Лёгкая',
  'Средне-лёгкая',
  'Средняя',
  'Средне-крепкая',
  'Крепкая',
] as const;

export const formatTelegramRecipientScope = (value: TelegramRecipientScope) => {
  return telegramRecipientScopeOptions.find((item) => item.value === value)?.label ?? 'Разрешённые чаты';
};

export const formatTelegramAutomationHealth = (value: TelegramAutomationHealth) => {
  switch (value) {
    case 'healthy':
      return 'Бот в норме';
    case 'stale':
      return 'Heartbeat устарел';
    case 'error':
      return 'Есть ошибка';
    default:
      return 'Статус неизвестен';
  }
};

export const formatAuditAction = (value: AuditEventRecord['action']) => {
  switch (value) {
    case 'create':
      return 'Создание';
    case 'update':
      return 'Обновление';
    case 'delete':
      return 'Удаление';
    case 'toggle':
      return 'Переключение';
  }
};

export const formatAuditEntityType = (value: AuditEventRecord['entityType']) => {
  switch (value) {
    case 'daily-code':
      return 'Код доступа';
    case 'staff-account':
      return 'Сотрудник';
    case 'telegram-operator':
      return 'Telegram доступ';
    case 'telegram-recipient':
      return 'Telegram чат';
    case 'mix':
      return 'Микс';
    case 'rail':
      return 'Рейл';
    case 'inventory':
      return 'Инвентарь';
  }
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

export const inventoryStockFilterOptions: Array<{ value: InventoryStockFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'in-stock', label: 'Только в наличии' },
  { value: 'out-of-stock', label: 'Только нет наличия' },
];

export const inventorySortFieldOptions: Array<{ value: InventorySortField; label: string }> = [
  { value: 'stock', label: 'Сначала по наличию' },
  { value: 'dependentMixes', label: 'По зависимым миксам' },
  { value: 'updatedAt', label: 'По обновлению' },
  { value: 'manufacturer', label: 'По производителю' },
  { value: 'name', label: 'По названию' },
];

export const inventorySortDirectionOptions: Array<{ value: InventorySortDirection; label: string }> = [
  { value: 'desc', label: 'По убыванию' },
  { value: 'asc', label: 'По возрастанию' },
];

export const mixStatusFilterOptions: Array<{ value: MixStatusFilter; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'guest-visible', label: 'Виден гостю' },
  { value: 'blocked', label: 'Заблокирован наличием' },
  { value: 'hidden', label: 'Скрыт оператором' },
];

export const mixRailFilterOptions: Array<{ value: MixRailFilter; label: string }> = [
  { value: 'all', label: 'Любое участие' },
  { value: 'in-rails', label: 'Только в рейлах' },
  { value: 'without-rails', label: 'Без рейлов' },
];

export const mixSortFieldOptions: Array<{ value: MixSortField; label: string }> = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'rails', label: 'По участию в рейлах' },
  { value: 'avgRating', label: 'По рейтингу' },
  { value: 'updatedAt', label: 'По обновлению' },
  { value: 'name', label: 'По названию' },
];

export const mixSortDirectionOptions: Array<{ value: MixSortDirection; label: string }> = [
  { value: 'desc', label: 'По убыванию' },
  { value: 'asc', label: 'По возрастанию' },
];

export const formatInventoryBatchAction = (value: InventoryBatchAction) => {
  switch (value) {
    case 'set-out-of-stock':
      return 'Убрать из наличия';
    case 'archive':
      return 'Архивировать';
    case 'unarchive':
      return 'Вернуть из архива';
    default:
      return 'Вернуть в наличие';
  }
};

export const formatMetricValue = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value);
};

export const formatDateTimeLocalInput = (value: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const parseDateTimeLocalInput = (value: string) => {
  if (!value.trim()) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};
