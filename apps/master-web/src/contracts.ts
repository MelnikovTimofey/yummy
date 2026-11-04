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

export type MixStatusFilter = 'all' | 'guest-visible' | 'substituted' | 'hidden' | 'blocked';

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
  authors: string[];
  options: {
    manufacturers: string[];
    flavorProfiles: string[];
    flavors: string[];
    flavorTags: string[];
    authors: string[];
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
  substitutedCount: number;
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

export type MixFilterKey = 'manufacturers' | 'flavorProfiles' | 'flavors' | 'flavorTags' | 'authors';

// Сотрудник, который завёл микс (#491); null — автора нет.
export type MixAuthor = { id: string; name: string };

export type TobaccoRef = {
  tobaccoId: string;
  manufacturer: string;
  name: string;
};

// Табак с полки вместо закончившегося компонента (PRD §6.2 п.1); пропорция — у компонента.
export type MixSubstitute = TobaccoRef & { flavors: string[] };

// onShelf — куда ведёт «Нет: X»: в карточку полки или, если на полке табака нет, каталога.
export type MissingTobacco = TobaccoRef & { onShelf: boolean };

export type MixSubstitution = { from: TobaccoRef; to: TobaccoRef };

export type MixComponent = {
  id: string;
  tobaccoId: string;
  name: string;
  manufacturer: string;
  flavors: string[];
  proportion: number;
  sortOrder: number;
  substitute: MixSubstitute | null;
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
  // Пока backend не отдаёт status (#479), он выводится из available и guestVisible.
  status: MixStatus;
  substitution: MixSubstitution | null;
  missing: MissingTobacco[];
  createdAt: string;
  updatedAt: string;
  railMemberships: MixRailMembership[];
  railCount: number;
  activeRailCount: number;
  author: MixAuthor | null;
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
    authors: [],
    options: {
      manufacturers: [],
      flavorProfiles: [],
      flavors: [],
      flavorTags: [],
      authors: [],
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
    substitutedCount: 0,
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
  return value === 'guest-visible' || value === 'substituted' || value === 'hidden' || value === 'blocked' || value === 'all'
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

const normalizeMixTobaccoRef = (value: unknown): TobaccoRef => {
  const raw = isRecord(value) ? value : {};
  return {
    tobaccoId: String(raw.tobaccoId ?? raw.id ?? ''),
    manufacturer: String(raw.manufacturer ?? ''),
    name: String(raw.name ?? ''),
  };
};

const normalizeMixSubstitute = (value: unknown): MixSubstitute | null =>
  isRecord(value) ? { ...normalizeMixTobaccoRef(value), flavors: uniqueStrings(toStringList(value.flavors)) } : null;

const normalizeMissingTobacco = (value: unknown): MissingTobacco => ({
  ...normalizeMixTobaccoRef(value),
  onShelf: toBoolean(isRecord(value) ? value.onShelf : undefined, true),
});

const normalizeMixSubstitution = (value: unknown): MixSubstitution | null =>
  isRecord(value) && isRecord(value.from) && isRecord(value.to)
    ? { from: normalizeMixTobaccoRef(value.from), to: normalizeMixTobaccoRef(value.to) }
    : null;

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
      substitute: null,
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
    substitute: normalizeMixSubstitute(value.substitute),
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

const normalizeMixAuthor = (value: unknown): MixAuthor | null =>
  isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' ? { id: value.id, name: value.name } : null;

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
  const available = toBoolean(raw.available ?? raw.inStock, true);
  const guestVisible = toBoolean(raw.guestVisible, available);

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
    available,
    guestVisible,
    status: MIX_STATUSES.includes(raw.status as MixStatus)
      ? (raw.status as MixStatus)
      : resolveMixStatus({ available, guestVisible }),
    substitution: normalizeMixSubstitution(raw.substitution),
    missing: readListPayload<unknown>(raw.missing).map(normalizeMissingTobacco),
    createdAt: toIsoString(raw.createdAt, ''),
    updatedAt: toIsoString(raw.updatedAt, ''),
    railMemberships,
    railCount: toNumber(raw.railCount, railMemberships.length),
    activeRailCount: toNumber(raw.activeRailCount, railMemberships.filter((item) => item.active).length),
    author: normalizeMixAuthor(raw.author),
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
      authors: uniqueStrings(toStringList(filters.authors)),
      options: {
        manufacturers: uniqueStrings(toStringList(options.manufacturers)),
        flavorProfiles: uniqueStrings(toStringList(options.flavorProfiles)),
        flavors: uniqueStrings(toStringList(options.flavors)),
        flavorTags: uniqueStrings(toStringList(options.flavorTags)),
        authors: uniqueStrings(toStringList(options.authors)),
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
      substitutedCount: toNumber(meta.substitutedCount, 0),
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

  for (const value of filters.authors) {
    params.append('authors', value);
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

export type MixStatus = 'visible' | 'substituted' | 'hidden' | 'blocked';

const MIX_STATUSES: MixStatus[] = ['visible', 'substituted', 'hidden', 'blocked'];

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
  substituted: 'С заменой',
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
  beverage: 'Напитки',
  citrus: 'Цитрусовые',
  dessert: 'Десертные',
  floral_herbal: 'Цветочно-травяные',
  fresh: 'Свежие',
  fruity: 'Фруктовые',
  gastro: 'Гастро',
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
// sweet/sour/fresh не предлагаются: источника в htreviews у них нет (#182).
export const INVENTORY_FLAVOR_PROFILE_KEYS = [
  'fruity',
  'berry',
  'citrus',
  'dessert',
  'minty',
  'spicy',
  'tobacco',
  'floral_herbal',
  'perfume',
  'beverage',
  'gastro',
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

// --- Полка (#211, #518): ответы /staff/shelf* -------------------------------

// Статус по расчёту в граммах — остался у блока «Полка» дашборда.
export type ShelfStatus = 'ok' | 'ending' | 'check' | 'stop' | 'out' | 'plan';
export type ShelfItemStatus = 'active' | 'plan' | 'dropped';
export type ShelfTrialVerdict = 'yes' | 'no';
export type ShelfArrivalKind = 'invoice' | 'start' | 'manual';

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

// Приход (#518): строка принятого счёта — со штуками, стартовый и ручной — без штук.
export type ShelfArrival = {
  at: string;
  kind: ShelfArrivalKind;
  supplier: string | null;
  number: string | null;
  qty: number | null;
  deliveryId: string | null;
};

// Аналог в порядке замены у этого табака (#478); substituting — стоит заменой в миксах,
// пока сам табак закончился.
export type ShelfAnalog = TobaccoRef & { inStock: boolean; substituting: boolean };

export type ShelfSimilar = TobaccoRef & { flavors: string[] };

export type ShelfRow = {
  tobacco: ShelfTobacco;
  shelfStatus: ShelfItemStatus;
  guestAvailable: boolean;
  // С какого момента «Закончился»; null — «Есть».
  outAt: string | null;
  lastArrival: ShelfArrival | null;
  mixCount: number;
  keepStocked: boolean;
  stopped: boolean;
  stopNote: string | null;
  note: string | null;
  // Проба (#329) — впервые пришёл на полку за 60 дней; отметка мастера «зашло / не зашло».
  trial: boolean;
  trialVerdict: ShelfTrialVerdict | null;
  trialMarkedAt: string | null;
  analogs: ShelfAnalog[];
};

// budgetKop — бюджет на табак в месяц (#326), null — не указан.
export type ShelfSettings = { bowlGrams: number; leadDays: number; budgetKop: number | null };
// Интервал поставок по принятым счетам (#325): days — null, пока поставок меньше трёх.
export type ShelfInterval = { days: number | null; deliveries: number };
// Горизонт «Заканчивается» и «К заказу»: интервал + срок поставки; until — дата.
export type ShelfHorizon = { days: number; until: string };

// Настройки, интервал и горизонт нужны только бюджету на дашборде, пока он на граммах.
export type ShelfView = {
  rows: ShelfRow[];
  settings: ShelfSettings;
  interval: ShelfInterval;
  horizon: ShelfHorizon;
};

export type ShelfCard = ShelfRow & {
  mixes: Array<{ id: string; name: string; status: MixStatus | null; substitution: MixSubstitution | null }>;
  // 2–5 табаков с полки в наличии, похожих по flavors и flavorProfiles (PRD §9.3 п.6).
  similar: ShelfSimilar[];
  // Новые первыми.
  arrivals: ShelfArrival[];
};

// PUT /staff/shelf/:tobaccoId/analogs. unblockedMixes — миксы, которые из «блокирован»
// стали «с заменой», для тоста.
export type ShelfAnalogsResponse = { item: ShelfCard; unblockedMixes: Array<{ id: string; name: string }> };

export const DEFAULT_SHELF_SETTINGS: ShelfSettings = { bowlGrams: 18, leadDays: 7, budgetKop: null };

const SHELF_STATUSES: ShelfStatus[] = ['ok', 'ending', 'check', 'stop', 'out', 'plan'];

const toNullableString = (value: unknown) => (value == null ? null : String(value));

const pickOne = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export const normalizeShelfSettings = (value: unknown): ShelfSettings => {
  const raw = isRecord(value) ? value : {};
  return {
    bowlGrams: toNumber(raw.bowlGrams, DEFAULT_SHELF_SETTINGS.bowlGrams),
    leadDays: toNumber(raw.leadDays, DEFAULT_SHELF_SETTINGS.leadDays),
    budgetKop: toNullableNumber(raw.budgetKop),
  };
};

const normalizeShelfInterval = (value: unknown): ShelfInterval => {
  const raw = isRecord(value) ? value : {};
  return { days: toNullableNumber(raw.days), deliveries: toNumber(raw.deliveries, 0) };
};

// Без ответа горизонт — срок поставки по умолчанию: интервал неизвестен.
const normalizeShelfHorizon = (value: unknown, settings: ShelfSettings): ShelfHorizon => {
  const raw = isRecord(value) ? value : {};
  return { days: toNumber(raw.days, settings.leadDays), until: toIsoString(raw.until, '') };
};

const normalizeShelfArrival = (raw: Record<string, unknown>): ShelfArrival => ({
  at: toIsoString(raw.at, ''),
  kind: pickOne(raw.kind, ['invoice', 'start', 'manual'] as const, 'manual'),
  supplier: toNullableString(raw.supplier),
  number: toNullableString(raw.number),
  qty: toNullableNumber(raw.qty),
  deliveryId: toNullableString(raw.deliveryId),
});

export const normalizeShelfRow = (value: unknown): ShelfRow => {
  const raw = isRecord(value) ? value : {};
  const tobacco = isRecord(raw.tobacco) ? raw.tobacco : {};

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
    guestAvailable: toBoolean(raw.guestAvailable, false),
    outAt: toIsoString(raw.outAt, '') || null,
    lastArrival: isRecord(raw.lastArrival) ? normalizeShelfArrival(raw.lastArrival) : null,
    mixCount: toNumber(raw.mixCount, 0),
    keepStocked: toBoolean(raw.keepStocked, true),
    stopped: toBoolean(raw.stopped, false),
    stopNote: toNullableString(raw.stopNote),
    note: toNullableString(raw.note),
    trial: toBoolean(raw.trial, false),
    trialVerdict: raw.trialVerdict === 'yes' || raw.trialVerdict === 'no' ? raw.trialVerdict : null,
    trialMarkedAt: toIsoString(raw.trialMarkedAt, '') || null,
    analogs: (Array.isArray(raw.analogs) ? raw.analogs : []).filter(isRecord).map((analog) => ({
      ...normalizeMixTobaccoRef(analog),
      inStock: toBoolean(analog.inStock, false),
      substituting: toBoolean(analog.substituting, false),
    })),
  };
};

export const normalizeShelfView = (value: unknown): ShelfView => {
  const raw = isRecord(value) ? value : {};
  const settings = normalizeShelfSettings(raw.settings);

  return {
    rows: (Array.isArray(raw.rows) ? raw.rows : []).map(normalizeShelfRow),
    settings,
    interval: normalizeShelfInterval(raw.interval),
    horizon: normalizeShelfHorizon(raw.horizon, settings),
  };
};

export const normalizeShelfCard = (value: unknown): ShelfCard => {
  const raw = readEntityPayload<unknown>(value);
  const record = isRecord(raw) ? raw : {};

  return {
    ...normalizeShelfRow(record),
    mixes: (Array.isArray(record.mixes) ? record.mixes : []).filter(isRecord).map((mix) => ({
      id: String(mix.id ?? ''),
      name: String(mix.name ?? ''),
      status: MIX_STATUSES.includes(mix.status as MixStatus) ? (mix.status as MixStatus) : null,
      substitution: normalizeMixSubstitution(mix.substitution),
    })),
    similar: (Array.isArray(record.similar) ? record.similar : []).filter(isRecord).map((item) => ({
      ...normalizeMixTobaccoRef(item),
      flavors: uniqueStrings(toStringList(item.flavors)),
    })),
    arrivals: (Array.isArray(record.arrivals) ? record.arrivals : []).filter(isRecord).map(normalizeShelfArrival),
  };
};

export const normalizeShelfAnalogsResponse = (value: unknown): ShelfAnalogsResponse => {
  const raw = isRecord(value) ? value : {};
  return {
    item: normalizeShelfCard(raw.item),
    unblockedMixes: (Array.isArray(raw.unblockedMixes) ? raw.unblockedMixes : []).filter(isRecord).map((mix) => ({
      id: String(mix.id ?? ''),
      name: String(mix.name ?? ''),
    })),
  };
};

// «Закончились» разом (#333): POST /staff/shelf/empty. batchId — для одной отмены
// на всех; пропущенные — уже закончившиеся (out) и «в плане» (plan).
export type ShelfEmptySkip = { tobaccoId: string; reason: 'out' | 'plan' };
export type ShelfEmptyManyResponse = {
  batchId: string;
  done: string[];
  skipped: ShelfEmptySkip[];
  hiddenMixes: number;
  items: ShelfRow[];
};

const shelfRows = (value: unknown) => (Array.isArray(value) ? value : []).filter(isRecord).map(normalizeShelfRow);

export const normalizeShelfEmptyManyResponse = (value: unknown): ShelfEmptyManyResponse => {
  const raw = isRecord(value) ? value : {};
  return {
    batchId: String(raw.batchId ?? ''),
    done: toStringList(raw.done),
    skipped: (Array.isArray(raw.skipped) ? raw.skipped : []).filter(isRecord).map((skip) => ({
      tobaccoId: String(skip.tobaccoId ?? ''),
      reason: skip.reason === 'plan' ? 'plan' : 'out',
    })),
    hiddenMixes: toNullableNumber(raw.hiddenMixes) ?? 0,
    items: shelfRows(raw.items),
  };
};

// Отмена пакета: DELETE /staff/shelf/batches/:batchId и /staff/shelf/restock-batches/:batchId,
// «Держать постоянно» пачкой (POST /staff/shelf/keep) — строки после действия.
export const normalizeShelfBatchUndoResponse = (value: unknown): { items: ShelfRow[] } => ({
  items: shelfRows(isRecord(value) ? value.items : null),
});

// «Вернуть в наличие» (#518): POST /staff/shelf/:tobaccoId/restock — пакет из одного табака.
export const normalizeShelfRestockResponse = (value: unknown): { batchId: string; item: ShelfRow } => {
  const raw = isRecord(value) ? value : {};
  return { batchId: String(raw.batchId ?? ''), item: normalizeShelfRow(raw.item) };
};

// Пачкой: POST /staff/shelf/restock. Пропущены «уже есть» (in) и «в плане» (plan).
export type ShelfRestockSkip = { tobaccoId: string; reason: 'in' | 'plan' };
export type ShelfRestockManyResponse = { batchId: string; done: string[]; skipped: ShelfRestockSkip[]; items: ShelfRow[] };

export const normalizeShelfRestockManyResponse = (value: unknown): ShelfRestockManyResponse => {
  const raw = isRecord(value) ? value : {};
  return {
    batchId: String(raw.batchId ?? ''),
    done: toStringList(raw.done),
    skipped: (Array.isArray(raw.skipped) ? raw.skipped : []).filter(isRecord).map((skip) => ({
      tobaccoId: String(skip.tobaccoId ?? ''),
      reason: skip.reason === 'plan' ? 'plan' : 'in',
    })),
    items: shelfRows(raw.items),
  };
};

// --- «К заказу» (#518) и блок «Полка» дашборда (#213) -------------------------

export type ShelfTobaccoRef = { id: string; manufacturer: string; lineName: string; name: string };
export type ShelfSupplierRef = { id: string; name: string };

// hidden — микс не виден гостю, substituted — закрыт аналогом с полки.
export type ShelfOrderMixes = { total: number; hidden: number; substituted: number };

export type ShelfOrderLine = {
  tobacco: ShelfTobaccoRef;
  outAt: string;
  mixes: ShelfOrderMixes;
  lastArrival: ShelfArrival | null;
};

// Группа — поставщик последнего принятого счёта с табаком; без счёта — supplier: null.
export type ShelfOrderGroup = { supplier: ShelfSupplierRef | null; lastDeliveryAt: string | null; lines: ShelfOrderLine[] };

export type ShelfOrderNotKept = { tobaccoId: string; manufacturer: string; lineName: string; name: string; outAt: string };

// GET /staff/shelf/order: закончились и держим постоянно; notKept — закончились, но не держим.
export type ShelfOrder = { groups: ShelfOrderGroup[]; notKept: ShelfOrderNotKept[] };

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

const recordOf = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});

export const normalizeShelfOrder = (value: unknown): ShelfOrder => {
  const raw = recordOf(value);
  return {
    groups: listOf(raw.groups).filter(isRecord).map((group) => ({
      supplier: normalizeSupplierRef(group.supplier),
      lastDeliveryAt: toIsoString(group.lastDeliveryAt, '') || null,
      lines: listOf(group.lines).filter(isRecord).map((line) => {
        const mixes = recordOf(line.mixes);
        return {
          tobacco: normalizeTobaccoRef(line.tobacco),
          outAt: toIsoString(line.outAt, ''),
          mixes: { total: toNumber(mixes.total, 0), hidden: toNumber(mixes.hidden, 0), substituted: toNumber(mixes.substituted, 0) },
          lastArrival: isRecord(line.lastArrival) ? normalizeShelfArrival(line.lastArrival) : null,
        };
      }),
    })),
    notKept: listOf(raw.notKept).filter(isRecord).map((item) => ({
      tobaccoId: String(item.tobaccoId ?? ''),
      manufacturer: String(item.manufacturer ?? ''),
      lineName: String(item.lineName ?? ''),
      name: String(item.name ?? ''),
      outAt: toIsoString(item.outAt, ''),
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
  totalKop: number | null;
  createdAt: string;
};

export type DeliveryTotals = { monthKop: number; drafts: number; suppliers: number; memoryItems: number };

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
  // Граммы в штуке по счёту — данные счёта, приёмке не нужны (#518).
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
  // Строки без табака: без них поставку не принять.
  pendingLines: number;
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
      totalKop: toNullableNumber(item.totalKop),
      createdAt: toIsoString(item.createdAt, ''),
    })),
    totals: {
      monthKop: toNumber(totals.monthKop, 0),
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

// --- Дашборд (#520): выборы гостей, ответ /staff/dashboard/choices ------------
// Выбор — «Покурить» у микса каталога или свой микс «Намиксуй». Даты — дни
// «2026-11-04» по поясу backend; при enough = false графиков в ответе нет.

export type GuestChoicesPreset = '7d' | '30d' | '90d' | 'all';
export type GuestChoicesPeriod = { key: GuestChoicesPreset } | { key: 'custom'; from: string; to: string };
export type GuestChoicesBucket = 'day' | 'week';
export type GuestChoicesTimelineRow = { date: string; catalog: number; own: number };
export type GuestTobaccoMark = 'out' | 'trial' | 'off-shelf';
export type GuestMixMark = 'hidden' | 'analog';
export type GuestTopTobacco = { tobaccoId: string; manufacturer: string; name: string; choices: number; mark: GuestTobaccoMark | null };
export type GuestTopMix = { mixId: string | null; mixName: string; choices: number; avgRating: number | null; mark: GuestMixMark | null };
export type GuestProfileShare = { key: string; label: string; share: number };

export type GuestChoices = {
  period: { key: GuestChoicesPreset | 'custom'; from: string; to: string; days: number; bucket: GuestChoicesBucket };
  enough: boolean;
  kpi: { choices: number; ownMixes: number; mixesChosen: number; mixesOnShowcase: number; avgRating: number | null; ratingsCount: number };
  timeline: GuestChoicesTimelineRow[];
  topTobaccos: GuestTopTobacco[];
  topMixes: GuestTopMix[];
  profiles: GuestProfileShare[];
  signals: {
    outPopular: Array<{ tobaccoId: string; name: string }>;
    hiddenMixes: Array<{ mixId: string; mixName: string }>;
    emptyRails: Array<{ railId: string; name: string }>;
  };
};

const recordsOf = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const markOf = <T extends string>(value: unknown, marks: readonly T[]): T | null => marks.find((mark) => mark === value) ?? null;

export const normalizeGuestChoices = (value: unknown): GuestChoices => {
  const raw = recordOf(value);
  const period = recordOf(raw.period);
  const kpi = recordOf(raw.kpi);
  const signals = recordOf(raw.signals);
  return {
    period: {
      key: pickOne(period.key, ['7d', '30d', '90d', 'all', 'custom'] as const, '30d'),
      from: toDay(period.from),
      to: toDay(period.to),
      days: toNumber(period.days, 0),
      bucket: pickOne(period.bucket, ['day', 'week'] as const, 'day'),
    },
    enough: toBoolean(raw.enough, false),
    kpi: {
      choices: toNumber(kpi.choices, 0),
      ownMixes: toNumber(kpi.ownMixes, 0),
      mixesChosen: toNumber(kpi.mixesChosen, 0),
      mixesOnShowcase: toNumber(kpi.mixesOnShowcase, 0),
      avgRating: toNullableNumber(kpi.avgRating),
      ratingsCount: toNumber(kpi.ratingsCount, 0),
    },
    timeline: recordsOf(raw.timeline).map((row) => ({
      date: toDay(row.date),
      catalog: toNumber(row.catalog, 0),
      own: toNumber(row.own, 0),
    })),
    topTobaccos: recordsOf(raw.topTobaccos).map((row) => ({
      tobaccoId: String(row.tobaccoId ?? ''),
      manufacturer: String(row.manufacturer ?? ''),
      name: String(row.name ?? ''),
      choices: toNumber(row.choices, 0),
      mark: markOf(row.mark, ['out', 'trial', 'off-shelf'] as const),
    })),
    topMixes: recordsOf(raw.topMixes).map((row) => ({
      mixId: toNullableString(row.mixId),
      mixName: String(row.mixName ?? ''),
      choices: toNumber(row.choices, 0),
      avgRating: toNullableNumber(row.avgRating),
      mark: markOf(row.mark, ['hidden', 'analog'] as const),
    })),
    profiles: recordsOf(raw.profiles).map((row) => ({
      key: String(row.key ?? ''),
      label: String(row.label ?? row.key ?? ''),
      share: toNumber(row.share, 0),
    })),
    signals: {
      outPopular: recordsOf(signals.outPopular).map((row) => ({ tobaccoId: String(row.tobaccoId ?? ''), name: String(row.name ?? '') })),
      hiddenMixes: recordsOf(signals.hiddenMixes).map((row) => ({ mixId: String(row.mixId ?? ''), mixName: String(row.mixName ?? '') })),
      emptyRails: recordsOf(signals.emptyRails).map((row) => ({ railId: String(row.railId ?? ''), name: String(row.name ?? '') })),
    },
  };
};

export const guestChoicesQuery = (period: GuestChoicesPeriod) =>
  period.key === 'custom' ? `from=${period.from}&to=${period.to}` : `period=${period.key}`;
