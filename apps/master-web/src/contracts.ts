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
  // Статистика htreviews (#209): у своих карточек и до синхронизации — null.
  rating?: number | null;
  ratingsCount?: number | null;
  viewsCount?: number | null;
};

export type InventoryDependentMix = {
  id: string;
  name: string;
  available: boolean;
  guestVisible: boolean;
  avgRating: number;
  smokeCtaCount: number;
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

export type MixSortField = 'demand' | 'avgRating' | 'name' | 'updatedAt' | 'rails';

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
  smokeCtaCount: number;
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
    field: 'demand',
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
  guestVisible: boolean;
  available: boolean;
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

const toNullableNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

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
  return value === 'avgRating' || value === 'name' || value === 'updatedAt' || value === 'rails' || value === 'demand'
    ? value
    : 'demand';
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
      guestVisible: true,
      available: true,
    };
  }

  const id = String(value.id ?? value.mixId ?? '');
  return {
    id,
    name: String(value.name ?? value.mixName ?? id),
    guestVisible: toBoolean(value.guestVisible, true),
    available: toBoolean(value.available, true),
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
    smokeCtaCount: toNumber(raw.smokeCtaCount, 0),
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
    rating: toNullableNumber(raw.rating),
    ratingsCount: toNullableNumber(raw.ratingsCount),
    viewsCount: toNullableNumber(raw.viewsCount),
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
    smokeCtaCount: toNumber(raw.smokeCtaCount, 0),
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
      };
    }

    return {
      mixId: String(item.mixId ?? item.id ?? ''),
      name: String(item.name ?? item.mixName ?? ''),
      smokeCtaCount: toNumber(item.smokeCtaCount ?? item.count, 0),
      avgRating: toNumber(item.avgRating, 0),
      ratingsCount: toNumber(item.ratingsCount, 0),
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

const ratingFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatRating = (value: number) => ratingFormatter.format(value);

export type CurrentDailyCode =
  | { state: 'active'; code: DailyAccessCodeRecord }
  | { state: 'expired'; code: DailyAccessCodeRecord }
  | { state: 'none'; code: null };

// `active` у записи значит «не отозван», а не «действует сейчас»: окно
// проверяется отдельно, иначе истёкший код выдаётся за текущий.
export const resolveCurrentDailyCode = (
  items: DailyAccessCodeRecord[],
  now = new Date(),
): CurrentDailyCode => {
  const time = now.getTime();
  const enabled = items
    .filter((item) => item.active)
    .sort((left, right) => right.endsAt.localeCompare(left.endsAt));
  const current = enabled.find(
    (item) => new Date(item.startsAt).getTime() <= time && time < new Date(item.endsAt).getTime(),
  );

  if (current) {
    return { state: 'active', code: current };
  }

  const latest = enabled[0];
  return latest ? { state: 'expired', code: latest } : { state: 'none', code: null };
};

export type MixStatus = 'visible' | 'hidden' | 'blocked';

// `available` — ручной переключатель мастера; `guestVisible` backend считает
// как `available` и наличие всех компонентов.
export const resolveMixStatus = (mix: Pick<MixRecord, 'available' | 'guestVisible'>): MixStatus => {
  if (!mix.available) {
    return 'hidden';
  }

  return mix.guestVisible ? 'visible' : 'blocked';
};

const mixStatusLabels: Record<MixStatus, string> = {
  visible: 'Виден гостю',
  hidden: 'Скрыт мастером',
  blocked: 'Блокирован наличием',
};

export const formatMixStatusLabel = (status: MixStatus) => mixStatusLabels[status];

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
  { value: 'rotate', label: 'Смена кода' },
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

export const flavorProfileColor = (value: string) => {
  const key = value.trim().toLowerCase();
  return key in flavorProfileLabels
    ? `var(--profile-${key.replace(/_/g, '-')}, var(--profile-fallback))`
    : 'var(--profile-fallback)';
};

// Канонические ключи категорий вкуса для редактора инвентаря — английские
// ключи, совпадающие с flavorProfileLabels и с тем, что бэкенд хранит в
// Tobacco.flavorProfiles. Не русские лейблы: иначе выбранная категория не
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
      return 'Бот давно не на связи';
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
      return 'Оператор бота';
    case 'telegram-recipient':
      return 'Чат бота';
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

export const mixStatusFilterOptions: Array<{ value: MixStatusFilter; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'guest-visible', label: 'Виден гостю' },
  { value: 'blocked', label: 'Заблокирован наличием' },
  { value: 'hidden', label: 'Скрыт мастером' },
];

export const mixRailFilterOptions: Array<{ value: MixRailFilter; label: string }> = [
  { value: 'all', label: 'Любое участие' },
  { value: 'in-rails', label: 'Только в рейлах' },
  { value: 'without-rails', label: 'Без рейлов' },
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

export const formatCount = (value: number, forms: readonly [string, string, string]) => {
  const mod10 = value % 10;
  const mod100 = value % 100;
  const form =
    mod10 === 1 && mod100 !== 11
      ? forms[0]
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? forms[1]
        : forms[2];
  return `${formatMetricValue(value)} ${form}`;
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

// --- Полка (#211): ответы /staff/shelf* ------------------------------------

export type ShelfStatus = 'ok' | 'ending' | 'check' | 'stop' | 'out' | 'plan';
export type ShelfItemStatus = 'active' | 'plan' | 'dropped';
export type ShelfRateKind = 'own' | 'brand' | 'none';
export type ShelfPackState = 'sealed' | 'open' | 'empty' | 'written_off';
export type ShelfReceiptKind = 'invoice' | 'start' | 'manual';

export type ShelfTobacco = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  officialStrength: string | null;
  communityStrength: string | null;
  archived: boolean;
  sourceUrl: string | null;
};

export type ShelfOpenPack = { id: string; weight: number; openedAt: string; fraction: number };

export type ShelfReceipt = { receivedAt: string; kind: ShelfReceiptKind; number: string | null; label: string };

export type ShelfRow = {
  tobacco: ShelfTobacco;
  shelfStatus: ShelfItemStatus;
  status: ShelfStatus;
  last: boolean;
  overdue: boolean;
  guestAvailable: boolean;
  openPacks: ShelfOpenPack[];
  sealedCount: number;
  remainingGrams: number;
  rate: number | null;
  rateKind: ShelfRateKind;
  daysLeft: number | null;
  endsAt: string | null;
  lastReceipt: ShelfReceipt | null;
  mixCount: number;
  keepStocked: boolean;
  stopped: boolean;
  stopNote: string | null;
  packWeight: number;
  note: string | null;
};

export type ShelfCounterKey = 'all' | 'ok' | 'last' | 'ending' | 'out' | 'stop' | 'plan';
export type ShelfCounters = Record<ShelfCounterKey, number>;
export type ShelfSettings = { bowlGrams: number; leadDays: number };

export type ShelfView = {
  rows: ShelfRow[];
  counters: ShelfCounters;
  totals: { packs: number; kg: number };
  today: { grams: number; bowls: number };
  settings: ShelfSettings;
};

export type ShelfPack = {
  id: string;
  state: ShelfPackState;
  weight: number;
  priceKop: number | null;
  receivedAt: string;
  openedAt: string | null;
  emptiedAt: string | null;
  writtenOffAt: string | null;
  writeOffReason: string | null;
  delivery: { id: string; kind: string; number: string | null; supplier: string | null } | null;
  marks: Array<{ at: string; fraction: number }>;
  usage: { days: number; gramsPerDay: number } | null;
};

export type ShelfCard = ShelfRow & {
  packs: ShelfPack[];
  gramPriceKop: number | null;
  bowlCostKop: number | null;
  mixes: Array<{ id: string; name: string }>;
  settings: ShelfSettings;
};

export const DEFAULT_SHELF_SETTINGS: ShelfSettings = { bowlGrams: 18, leadDays: 7 };

const SHELF_STATUSES: ShelfStatus[] = ['ok', 'ending', 'check', 'stop', 'out', 'plan'];
const SHELF_PACK_STATES: ShelfPackState[] = ['sealed', 'open', 'empty', 'written_off'];

const toNullableString = (value: unknown) => (value == null ? null : String(value));

const pickOne = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export const normalizeShelfSettings = (value: unknown): ShelfSettings => {
  const raw = isRecord(value) ? value : {};
  return {
    bowlGrams: toNumber(raw.bowlGrams, DEFAULT_SHELF_SETTINGS.bowlGrams),
    leadDays: toNumber(raw.leadDays, DEFAULT_SHELF_SETTINGS.leadDays),
  };
};

export const normalizeShelfRow = (value: unknown): ShelfRow => {
  const raw = isRecord(value) ? value : {};
  const tobacco = isRecord(raw.tobacco) ? raw.tobacco : {};
  const receipt = isRecord(raw.lastReceipt) ? raw.lastReceipt : null;

  return {
    tobacco: {
      id: String(tobacco.id ?? ''),
      manufacturer: String(tobacco.manufacturer ?? ''),
      lineName: String(tobacco.lineName ?? ''),
      name: String(tobacco.name ?? ''),
      flavorProfiles: uniqueStrings(toStringList(tobacco.flavorProfiles)),
      flavors: uniqueStrings(toStringList(tobacco.flavors)),
      officialStrength: toNullableString(tobacco.officialStrength),
      communityStrength: toNullableString(tobacco.communityStrength),
      archived: toBoolean(tobacco.archived, false),
      sourceUrl: typeof tobacco.sourceUrl === 'string' && tobacco.sourceUrl.trim() ? tobacco.sourceUrl : null,
    },
    shelfStatus: pickOne(raw.shelfStatus, ['active', 'plan', 'dropped'] as const, 'active'),
    status: pickOne(raw.status, SHELF_STATUSES, 'ok'),
    last: toBoolean(raw.last, false),
    overdue: toBoolean(raw.overdue, false),
    guestAvailable: toBoolean(raw.guestAvailable, false),
    openPacks: (Array.isArray(raw.openPacks) ? raw.openPacks : []).filter(isRecord).map((pack) => ({
      id: String(pack.id ?? ''),
      weight: toNumber(pack.weight, 0),
      openedAt: toIsoString(pack.openedAt, ''),
      fraction: toNumber(pack.fraction, 0),
    })),
    sealedCount: toNumber(raw.sealedCount, 0),
    remainingGrams: toNumber(raw.remainingGrams, 0),
    rate: toNullableNumber(raw.rate),
    rateKind: pickOne(raw.rateKind, ['own', 'brand', 'none'] as const, 'none'),
    daysLeft: toNullableNumber(raw.daysLeft),
    endsAt: toIsoString(raw.endsAt, '') || null,
    lastReceipt: receipt
      ? {
          receivedAt: toIsoString(receipt.receivedAt, ''),
          kind: pickOne(receipt.kind, ['invoice', 'start', 'manual'] as const, 'manual'),
          number: toNullableString(receipt.number),
          label: String(receipt.label ?? ''),
        }
      : null,
    mixCount: toNumber(raw.mixCount, 0),
    keepStocked: toBoolean(raw.keepStocked, true),
    stopped: toBoolean(raw.stopped, false),
    stopNote: toNullableString(raw.stopNote),
    packWeight: toNumber(raw.packWeight, 200),
    note: toNullableString(raw.note),
  };
};

export const normalizeShelfView = (value: unknown): ShelfView => {
  const raw = isRecord(value) ? value : {};
  const counters = isRecord(raw.counters) ? raw.counters : {};
  const totals = isRecord(raw.totals) ? raw.totals : {};
  const today = isRecord(raw.today) ? raw.today : {};

  return {
    rows: (Array.isArray(raw.rows) ? raw.rows : []).map(normalizeShelfRow),
    counters: {
      all: toNumber(counters.all, 0),
      ok: toNumber(counters.ok, 0),
      last: toNumber(counters.last, 0),
      ending: toNumber(counters.ending, 0),
      out: toNumber(counters.out, 0),
      stop: toNumber(counters.stop, 0),
      plan: toNumber(counters.plan, 0),
    },
    totals: { packs: toNumber(totals.packs, 0), kg: toNumber(totals.kg, 0) },
    today: { grams: toNumber(today.grams, 0), bowls: toNumber(today.bowls, 0) },
    settings: normalizeShelfSettings(raw.settings),
  };
};

const normalizeShelfPack = (value: unknown): ShelfPack => {
  const raw = isRecord(value) ? value : {};
  const delivery = isRecord(raw.delivery) ? raw.delivery : null;
  const usage = isRecord(raw.usage) ? raw.usage : null;

  return {
    id: String(raw.id ?? ''),
    state: pickOne(raw.state, SHELF_PACK_STATES, 'sealed'),
    weight: toNumber(raw.weight, 0),
    priceKop: toNullableNumber(raw.priceKop),
    receivedAt: toIsoString(raw.receivedAt, ''),
    openedAt: toIsoString(raw.openedAt, '') || null,
    emptiedAt: toIsoString(raw.emptiedAt, '') || null,
    writtenOffAt: toIsoString(raw.writtenOffAt, '') || null,
    writeOffReason: toNullableString(raw.writeOffReason),
    delivery: delivery
      ? {
          id: String(delivery.id ?? ''),
          kind: String(delivery.kind ?? 'manual'),
          number: toNullableString(delivery.number),
          supplier: toNullableString(delivery.supplier),
        }
      : null,
    marks: (Array.isArray(raw.marks) ? raw.marks : []).filter(isRecord).map((mark) => ({
      at: toIsoString(mark.at, ''),
      fraction: toNumber(mark.fraction, 0),
    })),
    usage: usage ? { days: toNumber(usage.days, 0), gramsPerDay: toNumber(usage.gramsPerDay, 0) } : null,
  };
};

export const normalizeShelfCard = (value: unknown): ShelfCard => {
  const raw = readEntityPayload<unknown>(value);
  const record = isRecord(raw) ? raw : {};

  return {
    ...normalizeShelfRow(record),
    packs: (Array.isArray(record.packs) ? record.packs : []).map(normalizeShelfPack),
    gramPriceKop: toNullableNumber(record.gramPriceKop),
    bowlCostKop: toNullableNumber(record.bowlCostKop),
    mixes: (Array.isArray(record.mixes) ? record.mixes : []).filter(isRecord).map((mix) => ({
      id: String(mix.id ?? ''),
      name: String(mix.name ?? ''),
    })),
    settings: normalizeShelfSettings(record.settings),
  };
};

export const normalizeShelfEmptyResponse = (value: unknown) => {
  const raw = isRecord(value) ? value : {};
  return { packId: String(raw.packId ?? ''), item: normalizeShelfRow(raw.item) };
};

// --- «К заказу» и блок «Полка» дашборда (#213) -------------------------------

export type ShelfTobaccoRef = { id: string; manufacturer: string; lineName: string; name: string };
export type ShelfSupplierRef = { id: string; name: string };

export type ReorderItem = {
  tobacco: ShelfTobaccoRef;
  status: ShelfStatus;
  daysLeft: number | null;
  endsAt: string | null;
  rate: number | null;
  rateKind: ShelfRateKind;
  quantity: number;
  packWeight: number;
  lastPriceKop: number | null;
};

export type ReorderGroup = {
  supplier: ShelfSupplierRef | null;
  lastInvoice: { number: string | null; date: string; status: DeliveryStatus } | null;
  items: ReorderItem[];
  // null — хоть у одной строки нет последней цены.
  sumKop: number | null;
};

export type ReorderView = {
  groups: ReorderGroup[];
  settings: ShelfSettings;
  text: Array<{ supplierId: string | null; text: string }>;
};

export type ShelfDashboardWeek = { from: string; to: string; grams: number; partial: boolean };

export type ShelfDashboard = {
  // weekday: 1 — понедельник … 7 — воскресенье.
  today: { grams: number; bowls: number; weekdayFactor: number | null; weekday: number };
  ending: Array<{ tobacco: ShelfTobaccoRef; status: ShelfStatus; daysLeft: number | null; endsAt: string | null }>;
  spend: { month: string; bySupplier: Array<{ supplier: ShelfSupplierRef | null; sumKop: number }>; totalKop: number };
  bowlCostKop: number | null;
  stockValueKop: number;
  weekly: ShelfDashboardWeek[];
};

const normalizeTobaccoRef = (value: unknown): ShelfTobaccoRef => {
  const raw = isRecord(value) ? value : {};
  return {
    id: String(raw.id ?? ''),
    manufacturer: String(raw.manufacturer ?? ''),
    lineName: String(raw.lineName ?? ''),
    name: String(raw.name ?? ''),
  };
};

const normalizeSupplierRef = (value: unknown): ShelfSupplierRef | null =>
  isRecord(value) ? { id: String(value.id ?? ''), name: String(value.name ?? '') } : null;

const listOf = (value: unknown) => (Array.isArray(value) ? value : []);

// Даты «2026-11-18» — календарные дни (см. toDateOnly ниже).
const toDay = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');

const normalizeReorderItem = (value: unknown): ReorderItem => {
  const raw = isRecord(value) ? value : {};
  return {
    tobacco: normalizeTobaccoRef(raw.tobacco),
    status: pickOne(raw.status, SHELF_STATUSES, 'ok'),
    daysLeft: toNullableNumber(raw.daysLeft),
    endsAt: toIsoString(raw.endsAt, '') || null,
    rate: toNullableNumber(raw.rate),
    rateKind: pickOne(raw.rateKind, ['own', 'brand', 'none'] as const, 'none'),
    quantity: toNumber(raw.quantity, 1),
    packWeight: toNumber(raw.packWeight, 200),
    lastPriceKop: toNullableNumber(raw.lastPriceKop),
  };
};

const normalizeReorderGroup = (value: unknown): ReorderGroup => {
  const raw = isRecord(value) ? value : {};
  const invoice = isRecord(raw.lastInvoice) ? raw.lastInvoice : null;
  const invoiceDate = invoice ? toDay(invoice.date) : '';
  return {
    supplier: normalizeSupplierRef(raw.supplier),
    lastInvoice: invoice && invoiceDate
      ? {
          number: toNullableString(invoice.number),
          date: invoiceDate,
          status: pickOne(invoice.status, ['draft', 'received'] as const, 'received'),
        }
      : null,
    items: listOf(raw.items).map(normalizeReorderItem),
    sumKop: toNullableNumber(raw.sumKop),
  };
};

export const normalizeReorderView = (value: unknown): ReorderView => {
  const raw = isRecord(value) ? value : {};
  return {
    groups: listOf(raw.groups).map(normalizeReorderGroup),
    settings: normalizeShelfSettings(raw.settings),
    text: listOf(raw.text).filter(isRecord).map((entry) => ({
      supplierId: toNullableString(entry.supplierId),
      text: String(entry.text ?? ''),
    })),
  };
};

export const normalizeShelfDashboard = (value: unknown): ShelfDashboard => {
  const raw = isRecord(value) ? value : {};
  const today = isRecord(raw.today) ? raw.today : {};
  const spend = isRecord(raw.spend) ? raw.spend : {};
  return {
    today: {
      grams: toNumber(today.grams, 0),
      bowls: toNumber(today.bowls, 0),
      weekdayFactor: toNullableNumber(today.weekdayFactor),
      weekday: toNumber(today.weekday, 1),
    },
    ending: listOf(raw.ending).filter(isRecord).map((entry) => ({
      tobacco: normalizeTobaccoRef(entry.tobacco),
      status: pickOne(entry.status, SHELF_STATUSES, 'ending'),
      daysLeft: toNullableNumber(entry.daysLeft),
      endsAt: toIsoString(entry.endsAt, '') || null,
    })),
    spend: {
      month: typeof spend.month === 'string' && /^\d{4}-\d{2}$/.test(spend.month) ? spend.month : '',
      bySupplier: listOf(spend.bySupplier).filter(isRecord).map((entry) => ({
        supplier: normalizeSupplierRef(entry.supplier),
        sumKop: toNumber(entry.sumKop, 0),
      })),
      totalKop: toNumber(spend.totalKop, 0),
    },
    bowlCostKop: toNullableNumber(raw.bowlCostKop),
    stockValueKop: toNumber(raw.stockValueKop, 0),
    weekly: listOf(raw.weekly).filter(isRecord).map((week) => ({
      from: toDay(week.from),
      to: toDay(week.to),
      grams: toNumber(week.grams, 0),
      partial: toBoolean(week.partial, false),
    })),
  };
};

// --- Поставки (#212): ответы /staff/deliveries* ------------------------------

export type DeliveryKind = 'invoice' | 'manual' | 'start';
export type DeliveryStatus = 'draft' | 'received';
export type DeliveryLineKind = 'tobacco' | 'skip';
export type DeliveryMatchReason = 'memory' | 'catalog' | 'manual';

export type DeliveryListItem = {
  id: string;
  kind: DeliveryKind;
  status: DeliveryStatus;
  supplier: string | null;
  number: string | null;
  invoiceDate: string | null;
  receivedAt: string | null;
  lines: number;
  packs: number;
  totalKop: number | null;
  createdAt: string;
};

export type DeliveryTotals = { monthKop: number; monthPacks: number; drafts: number; suppliers: number; memoryItems: number };

export type DeliveryList = { items: DeliveryListItem[]; totals: DeliveryTotals };

export type DeliveryCandidate = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  confidence: number;
  reason: string;
};

export type DeliveryLine = {
  id: string;
  n: number;
  rawName: string;
  article: string | null;
  qty: number;
  unit: string | null;
  priceKop: number | null;
  sumKop: number | null;
  grams: number | null;
  kind: DeliveryLineKind;
  arrived: boolean;
  tobacco: { id: string; manufacturer: string; lineName: string; name: string; shelfStatus: ShelfItemStatus | null } | null;
  matchReason: DeliveryMatchReason | null;
  confidence: number | null;
  candidates: DeliveryCandidate[];
  newOnShelf: boolean;
};

export type DeliveryCard = {
  id: string;
  kind: DeliveryKind;
  status: DeliveryStatus;
  supplier: { id: string; name: string; inn: string | null } | null;
  number: string | null;
  invoiceDate: string | null;
  receivedAt: string | null;
  totalKop: number | null;
  fileName: string | null;
  hasFile: boolean;
  createdAt: string;
  lines: DeliveryLine[];
  linesSumKop: number;
  sumMatches: boolean | null;
  pendingLines: number;
  packsToCreate: number;
  packs: number;
};

const DELIVERY_KINDS = ['invoice', 'manual', 'start'] as const;
const DELIVERY_STATUSES = ['draft', 'received'] as const;

// Дата счёта приходит как «2026-11-18» и остаётся строкой: в Date она уехала бы
// на день назад в часовых поясах западнее UTC.
const toDateOnly = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

const normalizeDeliveryLine = (value: unknown): DeliveryLine => {
  const raw = isRecord(value) ? value : {};
  const tobacco = isRecord(raw.tobacco) ? raw.tobacco : null;

  return {
    id: String(raw.id ?? ''),
    n: toNumber(raw.n, 0),
    rawName: String(raw.rawName ?? ''),
    article: toNullableString(raw.article),
    qty: toNumber(raw.qty, 1),
    unit: toNullableString(raw.unit),
    priceKop: toNullableNumber(raw.priceKop),
    sumKop: toNullableNumber(raw.sumKop),
    grams: toNullableNumber(raw.grams),
    kind: pickOne(raw.kind, ['tobacco', 'skip'] as const, 'tobacco'),
    arrived: toBoolean(raw.arrived, true),
    tobacco: tobacco
      ? {
          id: String(tobacco.id ?? ''),
          manufacturer: String(tobacco.manufacturer ?? ''),
          lineName: String(tobacco.lineName ?? ''),
          name: String(tobacco.name ?? ''),
          shelfStatus: tobacco.shelfStatus == null ? null : pickOne(tobacco.shelfStatus, ['active', 'plan', 'dropped'] as const, 'active'),
        }
      : null,
    matchReason: raw.matchReason === 'memory' || raw.matchReason === 'catalog' || raw.matchReason === 'manual' ? raw.matchReason : null,
    confidence: toNullableNumber(raw.confidence),
    candidates: (Array.isArray(raw.candidates) ? raw.candidates : []).filter(isRecord).map((candidate) => ({
      id: String(candidate.id ?? ''),
      manufacturer: String(candidate.manufacturer ?? ''),
      lineName: String(candidate.lineName ?? ''),
      name: String(candidate.name ?? ''),
      confidence: toNumber(candidate.confidence, 0),
      reason: String(candidate.reason ?? ''),
    })),
    newOnShelf: toBoolean(raw.newOnShelf, false),
  };
};

export const normalizeDeliveryCard = (value: unknown): DeliveryCard => {
  const raw = isRecord(value) ? value : {};
  const supplier = isRecord(raw.supplier) ? raw.supplier : null;

  return {
    id: String(raw.id ?? ''),
    kind: pickOne(raw.kind, DELIVERY_KINDS, 'manual'),
    status: pickOne(raw.status, DELIVERY_STATUSES, 'draft'),
    supplier: supplier
      ? { id: String(supplier.id ?? ''), name: String(supplier.name ?? ''), inn: toNullableString(supplier.inn) }
      : null,
    number: toNullableString(raw.number),
    invoiceDate: toDateOnly(raw.invoiceDate),
    receivedAt: toIsoString(raw.receivedAt, '') || null,
    totalKop: toNullableNumber(raw.totalKop),
    fileName: toNullableString(raw.fileName),
    hasFile: toBoolean(raw.hasFile, false),
    createdAt: toIsoString(raw.createdAt, ''),
    lines: (Array.isArray(raw.lines) ? raw.lines : []).map(normalizeDeliveryLine),
    linesSumKop: toNumber(raw.linesSumKop, 0),
    sumMatches: typeof raw.sumMatches === 'boolean' ? raw.sumMatches : null,
    pendingLines: toNumber(raw.pendingLines, 0),
    packsToCreate: toNumber(raw.packsToCreate, 0),
    packs: toNumber(raw.packs, 0),
  };
};

export const normalizeDeliveryList = (value: unknown): DeliveryList => {
  const raw = isRecord(value) ? value : {};
  const totals = isRecord(raw.totals) ? raw.totals : {};

  return {
    items: (Array.isArray(raw.items) ? raw.items : []).filter(isRecord).map((item) => ({
      id: String(item.id ?? ''),
      kind: pickOne(item.kind, DELIVERY_KINDS, 'manual'),
      status: pickOne(item.status, DELIVERY_STATUSES, 'draft'),
      supplier: toNullableString(item.supplier),
      number: toNullableString(item.number),
      invoiceDate: toDateOnly(item.invoiceDate),
      receivedAt: toIsoString(item.receivedAt, '') || null,
      lines: toNumber(item.lines, 0),
      packs: toNumber(item.packs, 0),
      totalKop: toNullableNumber(item.totalKop),
      createdAt: toIsoString(item.createdAt, ''),
    })),
    totals: {
      monthKop: toNumber(totals.monthKop, 0),
      monthPacks: toNumber(totals.monthPacks, 0),
      drafts: toNumber(totals.drafts, 0),
      suppliers: toNumber(totals.suppliers, 0),
      memoryItems: toNumber(totals.memoryItems, 0),
    },
  };
};

// --- Каталог → «Идеи для закупки» (#214): ответ /staff/catalog/ideas -------

export type CatalogIdea = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  flavorProfiles: string[];
  rating: number | null;
  ratingsCount: number | null;
  reviewsCount: number | null;
  viewsCount: number | null;
  sourceUrl: string;
  why: string | null;
};

export type CatalogIdeas = {
  popularOnShelfBrands: CatalogIdea[];
  topRated: CatalogIdea[];
  likeFastMoving: CatalogIdea[];
};

const normalizeCatalogIdea = (raw: UnknownRecord): CatalogIdea => ({
  id: String(raw.id ?? ''),
  manufacturer: String(raw.manufacturer ?? ''),
  lineName: String(raw.lineName ?? ''),
  name: String(raw.name ?? ''),
  flavorProfiles: uniqueStrings(toStringList(raw.flavorProfiles)),
  rating: toNullableNumber(raw.rating),
  ratingsCount: toNullableNumber(raw.ratingsCount),
  reviewsCount: toNullableNumber(raw.reviewsCount),
  viewsCount: toNullableNumber(raw.viewsCount),
  sourceUrl: String(raw.sourceUrl ?? ''),
  why: typeof raw.why === 'string' && raw.why.trim() ? raw.why.trim() : null,
});

const normalizeCatalogIdeaList = (value: unknown) =>
  (Array.isArray(value) ? value : []).filter(isRecord).map(normalizeCatalogIdea);

export const normalizeCatalogIdeas = (value: unknown): CatalogIdeas => {
  const raw = isRecord(value) ? value : {};
  return {
    popularOnShelfBrands: normalizeCatalogIdeaList(raw.popularOnShelfBrands),
    topRated: normalizeCatalogIdeaList(raw.topRated),
    likeFastMoving: normalizeCatalogIdeaList(raw.likeFastMoving),
  };
};
