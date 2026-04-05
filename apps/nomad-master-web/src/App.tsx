import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Blend,
  GalleryVerticalEnd,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { InventoryView, type InventoryCreateInput } from '@/components/inventory/inventory-view';
import { MixCatalogView, type MixCatalogMode, type MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';
import { SearchableEntitySelect } from '@/components/ui/searchable-entity-select';
import {
  AuditEventRecord,
  DailyAccessCodeRecord,
  DashboardSummary,
  DashboardWindowKey,
  InventoryBatchAction,
  InventoryFilterKey,
  InventoryListFilters,
  InventoryListMeta,
  InventoryListSort,
  InventoryTobacco,
  MixFilterKey,
  MixListFilters,
  MixListMeta,
  MixListSort,
  MixRailMembership,
  MixRecord,
  MixRailFilter,
  MixSortDirection,
  MixSortField,
  MixStatusFilter,
  RailRecord,
  StaffAccountRecord,
  StaffAuthResponse,
  StaffUser,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
  TelegramRecipientRecord,
  TelegramRecipientScope,
  buildInventoryRequestQuery,
  buildMixRequestQuery,
  formatDateTimeLocalInput,
  formatAuditAction,
  formatAuditEntityType,
  formatMetricValue,
  formatRailType,
  formatTelegramAutomationHealth,
  formatTelegramRecipientScope,
  normalizeAuditEventRecord,
  normalizeDashboardSummary,
  normalizeInventoryBatchResponse,
  normalizeInventoryListResponse,
  normalizeDailyAccessCodeRecord,
  normalizeMixListResponse,
  normalizeMixRecord,
  normalizeRailRecord,
  normalizeStaffAccountRecord,
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramOperatorRecord,
  normalizeTelegramRecipientRecord,
  parseDateTimeLocalInput,
  readEntityPayload,
  readListPayload,
  sortDailyAccessCodes,
  sortMixes,
  sortRails,
  sortStaffAccounts,
  sortTelegramOperators,
  sortTelegramRecipients,
  telegramRecipientScopeOptions,
  toggleInventoryFilterValue,
  toggleMixFilterValue,
  defaultInventoryListResponse,
  defaultMixListResponse,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';
const apiHostLabel = apiBaseUrl.replace(/^https?:\/\//, '');

type WorkspaceTab = 'dashboard' | 'inventory' | 'mixes' | 'rails' | 'access';

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; kicker: string; detail: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Дашборд', kicker: 'Сводка смены', detail: 'Спрос, витрина и блокировки в одном контуре.', icon: LayoutDashboard },
  { id: 'inventory', label: 'Инвентаризация', kicker: 'Наличие и стоп-лист', detail: 'Остатки, фильтры и быстрые действия без лишней высоты.', icon: Warehouse },
  { id: 'mixes', label: 'Миксы', kicker: 'Каталог состава', detail: 'Состав, доступность и рабочая редактура миксов.', icon: Blend },
  { id: 'rails', label: 'Рейлы', kicker: 'Витрина', detail: 'Подборки и состояние гостевой поверхности.', icon: GalleryVerticalEnd },
  { id: 'access', label: 'Доступ', kicker: 'Telegram и роли', detail: 'Коды, allowlist и staff-контроль без разрыва контекста.', icon: ShieldCheck },
];

const getWorkspaceTabId = (tab: WorkspaceTab) => `workspace-tab-${tab}`;
const getWorkspacePanelId = (tab: WorkspaceTab) => `workspace-panel-${tab}`;

type MixEditorState = {
  id: string;
  name: string;
  description: string;
  components: MixEditorComponentInput[];
  available: boolean;
  railMemberships: MixRailMembership[];
};

type MixesScreenMode = MixCatalogMode;

type RailEditorState = {
  id: string;
  name: string;
  description: string;
  type: 'statistical' | 'prepared' | 'curated';
  mixIds: string[];
  active: boolean;
  editable: boolean;
  readOnlyReason: string;
};

type DailyCodeEditorState = {
  id: string;
  codeValue: string;
  codeLabel: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type StaffAccountEditorState = {
  id: string;
  login: string;
  name: string;
  role: StaffUser['role'];
  password: string;
  active: boolean;
};

type TelegramRecipientEditorState = {
  id: string;
  chatId: string;
  label: string;
  scope: TelegramRecipientScope;
  active: boolean;
};

type TelegramOperatorEditorState = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

let mixEditorComponentDraftId = 0;

const createMixEditorComponent = (tobaccoId = '', proportion = ''): MixEditorComponentInput => ({
  key: `mix-component-${mixEditorComponentDraftId += 1}`,
  tobaccoId,
  proportion,
});

const emptyMixEditor = (): MixEditorState => ({
  id: '',
  name: '',
  description: '',
  components: [],
  available: true,
  railMemberships: [],
});

const emptyRailEditor = (): RailEditorState => ({
  id: '',
  name: '',
  description: '',
  type: 'curated',
  mixIds: [],
  active: true,
  editable: true,
  readOnlyReason: '',
});

const emptyDailyCodeEditor = (): DailyCodeEditorState => ({
  id: '',
  codeValue: '',
  codeLabel: '',
  startsAt: '',
  endsAt: '',
  active: true,
});

const emptyStaffAccountEditor = (): StaffAccountEditorState => ({
  id: '',
  login: '',
  name: '',
  role: 'nomad',
  password: '',
  active: true,
});

const emptyTelegramRecipientEditor = (): TelegramRecipientEditorState => ({
  id: '',
  chatId: '',
  label: '',
  scope: 'allowed',
  active: true,
});

const emptyTelegramOperatorEditor = (): TelegramOperatorEditorState => ({
  id: '',
  name: '',
  phone: '',
  active: true,
});

const toMixEditorState = (mix: MixRecord): MixEditorState => ({
  id: mix.id,
  name: mix.name,
  description: mix.description,
  components: mix.components.map((component) => createMixEditorComponent(component.tobaccoId, String(component.proportion))),
  available: mix.available,
  railMemberships: mix.railMemberships,
});

const toRailEditorState = (rail: RailRecord): RailEditorState => ({
  id: rail.id,
  name: rail.name,
  description: rail.description,
  type: rail.type,
  mixIds: [...rail.mixIds],
  active: rail.active,
  editable: rail.editable,
  readOnlyReason: rail.readOnlyReason,
});

const toDailyCodeEditorState = (code: DailyAccessCodeRecord): DailyCodeEditorState => ({
  id: code.id,
  codeValue: code.codeValue,
  codeLabel: code.codeLabel,
  startsAt: formatDateTimeLocalInput(code.startsAt),
  endsAt: formatDateTimeLocalInput(code.endsAt),
  active: code.active,
});

const toStaffAccountEditorState = (account: StaffAccountRecord): StaffAccountEditorState => ({
  id: account.id,
  login: account.login,
  name: account.name,
  role: account.role,
  password: '',
  active: account.active,
});

const toTelegramRecipientEditorState = (recipient: TelegramRecipientRecord): TelegramRecipientEditorState => ({
  id: recipient.id,
  chatId: recipient.chatId,
  label: recipient.label,
  scope: recipient.scope,
  active: recipient.active,
});

const toTelegramOperatorEditorState = (operator: TelegramOperatorRecord): TelegramOperatorEditorState => ({
  id: operator.id,
  name: operator.name,
  phone: operator.phone,
  active: operator.active,
});

const parseNumberInput = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const replaceOrInsert = <T extends { id: string }>(items: T[], nextItem: T) => {
  const index = items.findIndex((item) => item.id === nextItem.id);

  if (index === -1) {
    return [...items, nextItem];
  }

  const nextItems = [...items];
  nextItems[index] = nextItem;
  return nextItems;
};

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
};

const storeToken = (token: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, token);
};

const requestJson = async <T,>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers ?? {});

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: { error?: string } | unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text) as { error?: string } | unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'Запрос не выполнен';
    const wrapped = new Error(error) as Error & { status?: number };
    wrapped.status = response.status;
    throw wrapped;
  }

  return (payload ?? {}) as T;
};

const readSummaryCards = (summary: DashboardSummary | null) => {
  if (!summary) {
    return [
      { label: 'Всего табаков', value: 0 },
      { label: 'В наличии', value: 0 },
      { label: 'Нажатия Выбрать', value: 0 },
      { label: 'Оценок гостей', value: 0 },
      { label: 'Миксов блокирует наличие', value: 0 },
      { label: 'Пустых активных рейлов', value: 0 },
    ];
  }

  return [
    { label: 'Всего табаков', value: summary.totalTobaccos },
    { label: 'В наличии', value: summary.inStockCount },
    { label: 'Нажатия Выбрать', value: summary.smokeCtaTotal },
    { label: 'Оценок гостей', value: summary.ratingsTotal },
    { label: 'Миксов блокирует наличие', value: summary.ops.blockedByInventoryCount },
    { label: 'Пустых активных рейлов', value: summary.ops.emptyActiveRailsCount },
  ];
};

const resolveRailMixSummary = (rail: RailRecord, mixes: MixRecord[]) => {
  if (rail.mixes.length) {
    return rail.mixes.map((mix) => mix.name).join(', ');
  }

  const resolvedNames = rail.mixIds
    .map((mixId) => mixes.find((mix) => mix.id === mixId)?.name ?? mixId)
    .filter(Boolean);

  return resolvedNames.join(', ') || 'Миксы не заданы';
};

const formatWorkspaceTab = (value: WorkspaceTab) => workspaceTabs.find((item) => item.id === value)?.label ?? value;

const formatRoleLabel = (role: StaffUser['role']) => (role === 'admin' ? 'admin' : 'nomad');

const formatLoadStatus = (status: 'idle' | 'loading' | 'ready' | 'error') => {
  switch (status) {
    case 'loading':
      return 'Обновляем';
    case 'ready':
      return 'Данные готовы';
    case 'error':
      return 'Есть ошибка';
    default:
      return 'Ожидает загрузки';
  }
};

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const workspaceTabRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    dashboard: null,
    inventory: null,
    mixes: null,
    rails: null,
    access: null,
  });
  const [user, setUser] = useState<StaffUser | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [inventory, setInventory] = useState<InventoryTobacco[]>([]);
  const [inventoryFilters, setInventoryFilters] = useState<InventoryListFilters>(defaultInventoryListResponse.filters);
  const [inventorySort, setInventorySort] = useState<InventoryListSort>(defaultInventoryListResponse.sort);
  const [inventoryMeta, setInventoryMeta] = useState<InventoryListMeta>(defaultInventoryListResponse.meta);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dashboardWindow, setDashboardWindow] = useState<DashboardWindowKey>('14d');
  const [mixes, setMixes] = useState<MixRecord[]>([]);
  const [mixesFilters, setMixesFilters] = useState<MixListFilters>(defaultMixListResponse.filters);
  const [mixesSort, setMixesSort] = useState<MixListSort>(defaultMixListResponse.sort);
  const [mixesMeta, setMixesMeta] = useState<MixListMeta>(defaultMixListResponse.meta);
  const [mixTobaccos, setMixTobaccos] = useState<InventoryTobacco[]>([]);
  const [railMixCatalog, setRailMixCatalog] = useState<MixRecord[]>([]);
  const [rails, setRails] = useState<RailRecord[]>([]);
  const [dailyCodes, setDailyCodes] = useState<DailyAccessCodeRecord[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountRecord[]>([]);
  const [telegramOperators, setTelegramOperators] = useState<TelegramOperatorRecord[]>([]);
  const [telegramRecipients, setTelegramRecipients] = useState<TelegramRecipientRecord[]>([]);
  const [telegramAutomationState, setTelegramAutomationState] = useState<TelegramAutomationStateRecord | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixesStatus, setMixesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railsStatus, setRailsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [dailyCodesStatus, setDailyCodesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [staffAccountsStatus, setStaffAccountsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    'idle',
  );
  const [telegramOperatorsStatus, setTelegramOperatorsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    'idle',
  );
  const [telegramRecipientsStatus, setTelegramRecipientsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    'idle',
  );
  const [telegramAutomationStateStatus, setTelegramAutomationStateStatus] = useState<
    'idle' | 'loading' | 'ready' | 'forbidden' | 'error'
  >('idle');
  const [auditEventsStatus, setAuditEventsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [mixesError, setMixesError] = useState('');
  const [railsError, setRailsError] = useState('');
  const [dailyCodesError, setDailyCodesError] = useState('');
  const [staffAccountsError, setStaffAccountsError] = useState('');
  const [telegramOperatorsError, setTelegramOperatorsError] = useState('');
  const [telegramRecipientsError, setTelegramRecipientsError] = useState('');
  const [telegramAutomationStateError, setTelegramAutomationStateError] = useState('');
  const [auditEventsError, setAuditEventsError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [inventoryBatchAction, setInventoryBatchAction] = useState<'' | InventoryBatchAction>('');
  const [inventoryCreateStatus, setInventoryCreateStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventoryCreateError, setInventoryCreateError] = useState('');
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixesScreen, setMixesScreen] = useState<MixesScreenMode>('catalog');
  const [mixSaveStatus, setMixSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
  const [railMixCandidateId, setRailMixCandidateId] = useState('');
  const [railSaveStatus, setRailSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railSaveError, setRailSaveError] = useState('');
  const [dailyCodeEditor, setDailyCodeEditor] = useState<DailyCodeEditorState>(emptyDailyCodeEditor);
  const [dailyCodeSaveStatus, setDailyCodeSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [dailyCodeSaveError, setDailyCodeSaveError] = useState('');
  const [dailyCodeToggleId, setDailyCodeToggleId] = useState('');
  const [staffAccountEditor, setStaffAccountEditor] = useState<StaffAccountEditorState>(emptyStaffAccountEditor);
  const [staffAccountSaveStatus, setStaffAccountSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [staffAccountSaveError, setStaffAccountSaveError] = useState('');
  const [staffAccountToggleId, setStaffAccountToggleId] = useState('');
  const [telegramOperatorEditor, setTelegramOperatorEditor] = useState<TelegramOperatorEditorState>(emptyTelegramOperatorEditor);
  const [telegramOperatorSaveStatus, setTelegramOperatorSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [telegramOperatorSaveError, setTelegramOperatorSaveError] = useState('');
  const [telegramOperatorToggleId, setTelegramOperatorToggleId] = useState('');
  const [telegramRecipientEditor, setTelegramRecipientEditor] =
    useState<TelegramRecipientEditorState>(emptyTelegramRecipientEditor);
  const [telegramRecipientSaveStatus, setTelegramRecipientSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [telegramRecipientSaveError, setTelegramRecipientSaveError] = useState('');
  const [telegramRecipientToggleId, setTelegramRecipientToggleId] = useState('');

  const focusWorkspaceTab = (tab: WorkspaceTab) => {
    requestAnimationFrame(() => {
      workspaceTabRefs.current[tab]?.focus();
    });
  };

  const onWorkspaceTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: WorkspaceTab) => {
    const currentIndex = workspaceTabs.findIndex((tab) => tab.id === currentTab);

    if (currentIndex === -1) {
      return;
    }

    let nextTab: WorkspaceTab | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextTab = workspaceTabs[(currentIndex + 1) % workspaceTabs.length]?.id ?? null;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextTab = workspaceTabs[(currentIndex - 1 + workspaceTabs.length) % workspaceTabs.length]?.id ?? null;
        break;
      case 'Home':
        nextTab = workspaceTabs[0]?.id ?? null;
        break;
      case 'End':
        nextTab = workspaceTabs[workspaceTabs.length - 1]?.id ?? null;
        break;
      default:
        break;
    }

    if (!nextTab) {
      return;
    }

    event.preventDefault();
    setActiveTab(nextTab);
    focusWorkspaceTab(nextTab);
  };

  const loadInventory = async (
    nextToken: string,
    nextFilters: InventoryListFilters = inventoryFilters,
    nextSort: InventoryListSort = inventorySort,
    nextPage: number = inventoryMeta.page,
    nextPageSize: number = inventoryMeta.pageSize,
  ) => {
    setInventoryStatus('loading');
    setInventoryError('');

    try {
      const query = buildInventoryRequestQuery(nextFilters, nextSort, nextPage, nextPageSize);
      const response = await requestJson<unknown>(`/staff/inventory/tobaccos${query ? `?${query}` : ''}`, {}, nextToken);
      const payload = normalizeInventoryListResponse(response);
      setInventory(payload.items);
      setInventoryFilters(payload.filters);
      setInventorySort(payload.sort);
      setInventoryMeta(payload.meta);
      setSelectedInventoryIds((current) => current.filter((id) => payload.items.some((item) => item.id === id)));
      setInventoryStatus('ready');
    } catch (cause) {
      setInventory([]);
      setInventoryMeta(defaultInventoryListResponse.meta);
      setInventoryStatus('error');
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось загрузить инвентарь');
    }
  };

  const loadSummary = async (nextToken: string, windowKey: DashboardWindowKey = dashboardWindow) => {
    setSummaryStatus('loading');
    setSummaryError('');

    try {
      const response = await requestJson<unknown>(`/staff/dashboard/summary?window=${windowKey}`, {}, nextToken);
      setSummary(normalizeDashboardSummary(response));
      setSummaryStatus('ready');
    } catch (cause) {
      setSummary(null);
      setSummaryStatus('error');
      setSummaryError(cause instanceof Error ? cause.message : 'Не удалось загрузить сводку');
    }
  };

  const loadMixes = async (
    nextToken: string,
    nextFilters: MixListFilters = mixesFilters,
    nextSort: MixListSort = mixesSort,
    nextPage: number = mixesMeta.page,
    nextPageSize: number = mixesMeta.pageSize,
  ) => {
    setMixesStatus('loading');
    setMixesError('');

    try {
      const query = buildMixRequestQuery(nextFilters, nextSort, nextPage, nextPageSize);
      const response = await requestJson<unknown>(`/staff/mixes${query ? `?${query}` : ''}`, {}, nextToken);
      const payload = normalizeMixListResponse(response);
      setMixes(sortMixes(payload.items));
      setMixesFilters(payload.filters);
      setMixesSort(payload.sort);
      setMixesMeta(payload.meta);
      setMixesStatus('ready');
    } catch (cause) {
      setMixes([]);
      setMixesMeta(defaultMixListResponse.meta);
      setMixesStatus('error');
      setMixesError(cause instanceof Error ? cause.message : 'Не удалось загрузить миксы');
    }
  };

  const loadMixTobaccos = async (nextToken: string) => {
    try {
      const response = await requestJson<unknown>('/staff/inventory/tobaccos?sort=name&direction=asc', {}, nextToken);
      const payload = normalizeInventoryListResponse(response);
      setMixTobaccos(payload.items);
    } catch {
      setMixTobaccos([]);
    }
  };

  const loadRailMixCatalog = async (nextToken: string) => {
    try {
      const response = await requestJson<unknown>('/staff/mixes?sort=name&direction=asc', {}, nextToken);
      const payload = normalizeMixListResponse(response);
      setRailMixCatalog(payload.items);
    } catch {
      setRailMixCatalog([]);
    }
  };

  const refreshInventoryDependents = async (nextToken: string) => {
    await Promise.allSettled([
      loadSummary(nextToken, dashboardWindow),
      loadMixes(nextToken, mixesFilters, mixesSort, mixesMeta.page, mixesMeta.pageSize),
      loadMixTobaccos(nextToken),
      loadRailMixCatalog(nextToken),
    ]);
  };

  const loadRails = async (nextToken: string) => {
    setRailsStatus('loading');
    setRailsError('');

    try {
      const response = await requestJson<unknown>('/staff/rails', {}, nextToken);
      const items = readListPayload<unknown>(response).map(normalizeRailRecord);
      setRails(sortRails(items));
      setRailsStatus('ready');
    } catch (cause) {
      setRails([]);
      setRailsStatus('error');
      setRailsError(cause instanceof Error ? cause.message : 'Не удалось загрузить рейлы');
    }
  };

  const loadDailyCodes = async (nextToken: string) => {
    setDailyCodesStatus('loading');
    setDailyCodesError('');

    try {
      const response = await requestJson<unknown>('/staff/access/daily-codes', {}, nextToken);
      const items = sortDailyAccessCodes(readListPayload<unknown>(response).map(normalizeDailyAccessCodeRecord));
      setDailyCodes(items);
      setDailyCodesStatus('ready');
    } catch (cause) {
      setDailyCodes([]);
      setDailyCodesStatus('error');
      setDailyCodesError(cause instanceof Error ? cause.message : 'Не удалось загрузить коды доступа');
    }
  };

  const loadStaffAccounts = async (nextToken: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setStaffAccounts([]);
      setStaffAccountsStatus('forbidden');
      setStaffAccountsError('Раздел сотрудников доступен только для admin.');
      return;
    }

    setStaffAccountsStatus('loading');
    setStaffAccountsError('');

    try {
      const response = await requestJson<unknown>('/staff/access/accounts', {}, nextToken);
      const items = sortStaffAccounts(readListPayload<unknown>(response).map(normalizeStaffAccountRecord));
      setStaffAccounts(items);
      setStaffAccountsStatus('ready');
    } catch (cause) {
      setStaffAccounts([]);
      setStaffAccountsStatus('error');
      setStaffAccountsError(cause instanceof Error ? cause.message : 'Не удалось загрузить сотрудников');
    }
  };

  const loadTelegramOperators = async (nextToken: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setTelegramOperators([]);
      setTelegramOperatorsStatus('forbidden');
      setTelegramOperatorsError('Allowlist Telegram доступен только для admin.');
      return;
    }

    setTelegramOperatorsStatus('loading');
    setTelegramOperatorsError('');

    try {
      const response = await requestJson<unknown>('/staff/access/telegram-operators', {}, nextToken);
      const items = sortTelegramOperators(readListPayload<unknown>(response).map(normalizeTelegramOperatorRecord));
      setTelegramOperators(items);
      setTelegramOperatorsStatus('ready');
    } catch (cause) {
      setTelegramOperators([]);
      setTelegramOperatorsStatus('error');
      setTelegramOperatorsError(cause instanceof Error ? cause.message : 'Не удалось загрузить Telegram allowlist');
    }
  };

  const loadTelegramRecipients = async (nextToken: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setTelegramRecipients([]);
      setTelegramRecipientsStatus('forbidden');
      setTelegramRecipientsError('Чаты Telegram доступны только для admin.');
      return;
    }

    setTelegramRecipientsStatus('loading');
    setTelegramRecipientsError('');

    try {
      const response = await requestJson<unknown>('/staff/access/telegram-recipients', {}, nextToken);
      const items = sortTelegramRecipients(readListPayload<unknown>(response).map(normalizeTelegramRecipientRecord));
      setTelegramRecipients(items);
      setTelegramRecipientsStatus('ready');
    } catch (cause) {
      setTelegramRecipients([]);
      setTelegramRecipientsStatus('error');
      setTelegramRecipientsError(cause instanceof Error ? cause.message : 'Не удалось загрузить чаты Telegram');
    }
  };

  const loadTelegramAutomationState = async (nextToken: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setTelegramAutomationState(null);
      setTelegramAutomationStateStatus('forbidden');
      setTelegramAutomationStateError('Статус Telegram automation доступен только для admin.');
      return;
    }

    setTelegramAutomationStateStatus('loading');
    setTelegramAutomationStateError('');

    try {
      const response = await requestJson<unknown>('/staff/access/telegram-automation-state', {}, nextToken);
      setTelegramAutomationState(normalizeTelegramAutomationStateRecord(readEntityPayload<unknown>(response)));
      setTelegramAutomationStateStatus('ready');
    } catch (cause) {
      setTelegramAutomationState(null);
      setTelegramAutomationStateStatus('error');
      setTelegramAutomationStateError(cause instanceof Error ? cause.message : 'Не удалось загрузить статус Telegram automation');
    }
  };

  const loadAuditEvents = async (nextToken: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setAuditEvents([]);
      setAuditEventsStatus('forbidden');
      setAuditEventsError('Журнал изменений доступен только для admin.');
      return;
    }

    setAuditEventsStatus('loading');
    setAuditEventsError('');

    try {
      const response = await requestJson<unknown>('/staff/audit/events?limit=25', {}, nextToken);
      setAuditEvents(readListPayload<unknown>(response).map(normalizeAuditEventRecord));
      setAuditEventsStatus('ready');
    } catch (cause) {
      setAuditEvents([]);
      setAuditEventsStatus('error');
      setAuditEventsError(cause instanceof Error ? cause.message : 'Не удалось загрузить журнал изменений');
    }
  };

  useEffect(() => {
    const hydrate = async () => {
      if (!token) {
        return;
      }

      setStatus('loading');
      try {
        const response = await requestJson<unknown>('/staff/auth/me', {}, token);
        const profile = readEntityPayload<{ user: StaffUser }>(response);
        if (!profile?.user) {
          throw new Error('Не удалось подтвердить сессию');
        }

        setUser(profile.user);
        await Promise.all([
          loadInventory(token),
          loadSummary(token, dashboardWindow),
          loadMixes(token),
          loadMixTobaccos(token),
          loadRailMixCatalog(token),
          loadRails(token),
          loadDailyCodes(token),
          loadStaffAccounts(token, profile.user.role),
          loadTelegramOperators(token, profile.user.role),
          loadTelegramAutomationState(token, profile.user.role),
          loadAuditEvents(token, profile.user.role),
        ]);
        setStatus('ready');
      } catch {
        storeToken('');
        setToken('');
        setUser(null);
        setStatus('idle');
      }
    };

    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const auth = await requestJson<StaffAuthResponse>('/staff/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
      const response = await requestJson<unknown>('/staff/auth/me', {}, auth.accessToken);
      const profile = readEntityPayload<{ user: StaffUser }>(response);

      if (!profile?.user) {
        throw new Error('Не удалось подтвердить профиль');
      }

      storeToken(auth.accessToken);
      setToken(auth.accessToken);
      setUser(profile.user);
      await Promise.all([
        loadInventory(auth.accessToken),
        loadSummary(auth.accessToken, dashboardWindow),
        loadMixes(auth.accessToken),
        loadMixTobaccos(auth.accessToken),
        loadRailMixCatalog(auth.accessToken),
        loadRails(auth.accessToken),
        loadDailyCodes(auth.accessToken),
        loadStaffAccounts(auth.accessToken, profile.user.role),
        loadTelegramOperators(auth.accessToken, profile.user.role),
        loadTelegramAutomationState(auth.accessToken, profile.user.role),
        loadAuditEvents(auth.accessToken, profile.user.role),
      ]);
      setStatus('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти');
      setStatus('error');
    }
  };

  const onSelectDashboardWindow = async (windowKey: DashboardWindowKey) => {
    setDashboardWindow(windowKey);

    if (!token || !user) {
      return;
    }

    await loadSummary(token, windowKey);
  };

  const refreshInventorySurface = async (
    nextFilters: InventoryListFilters = inventoryFilters,
    nextSort: InventoryListSort = inventorySort,
    nextPage: number = inventoryMeta.page,
  ) => {
    if (!token) {
      return;
    }

    await loadInventory(token, nextFilters, nextSort, nextPage, inventoryMeta.pageSize);
  };

  const onInventorySearchChange = async (value: string) => {
    const nextFilters = {
      ...inventoryFilters,
      search: value,
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort, 1);
  };

  const onInventoryStockChange = async (value: InventoryListFilters['stock']) => {
    const nextFilters = {
      ...inventoryFilters,
      stock: value,
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort, 1);
  };

  const onInventorySortFieldChange = async (field: InventoryListSort['field']) => {
    const nextSort = {
      ...inventorySort,
      field,
    };
    setInventorySort(nextSort);
    await refreshInventorySurface(inventoryFilters, nextSort, 1);
  };

  const onInventorySortDirectionChange = async (direction: InventoryListSort['direction']) => {
    const nextSort = {
      ...inventorySort,
      direction,
    };
    setInventorySort(nextSort);
    await refreshInventorySurface(inventoryFilters, nextSort, 1);
  };

  const onInventoryToggleFilterValue = async (key: InventoryFilterKey, value: string) => {
    const nextFilters = {
      ...inventoryFilters,
      [key]: toggleInventoryFilterValue(inventoryFilters[key], value),
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort, 1);
  };

  const onInventoryClearFilterGroup = async (key: InventoryFilterKey) => {
    if (inventoryFilters[key].length === 0) {
      return;
    }

    const nextFilters = {
      ...inventoryFilters,
      [key]: [],
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort, 1);
  };

  const onInventoryResetFilters = async () => {
    const nextFilters = {
      ...defaultInventoryListResponse.filters,
      options: inventoryFilters.options,
    };
    const nextSort = defaultInventoryListResponse.sort;
    setSelectedInventoryIds([]);
    setInventoryFilters(nextFilters);
    setInventorySort(nextSort);
    await refreshInventorySurface(nextFilters, nextSort, 1);
  };

  const onInventoryPageChange = async (page: number) => {
    await refreshInventorySurface(inventoryFilters, inventorySort, page);
  };

  const onSignOut = () => {
    storeToken('');
    setToken('');
    setUser(null);
    setInventory([]);
    setInventoryFilters(defaultInventoryListResponse.filters);
    setInventorySort(defaultInventoryListResponse.sort);
    setInventoryMeta(defaultInventoryListResponse.meta);
    setSelectedInventoryIds([]);
    setSummary(null);
    setDashboardWindow('14d');
    setMixes([]);
    setMixesFilters(defaultMixListResponse.filters);
    setMixesSort(defaultMixListResponse.sort);
    setMixesMeta(defaultMixListResponse.meta);
    setMixTobaccos([]);
    setRailMixCatalog([]);
    setRails([]);
    setStatus('idle');
    setError('');
    setPassword('');
    setActiveTab('dashboard');
    setInventoryStatus('idle');
    setSummaryStatus('idle');
    setMixesStatus('idle');
    setRailsStatus('idle');
    setDailyCodesStatus('idle');
    setStaffAccountsStatus('idle');
    setTelegramOperatorsStatus('idle');
    setTelegramRecipientsStatus('idle');
    setTelegramAutomationStateStatus('idle');
    setAuditEventsStatus('idle');
    setInventoryError('');
    setSummaryError('');
    setMixesError('');
    setRailsError('');
    setDailyCodesError('');
    setStaffAccountsError('');
    setTelegramOperatorsError('');
    setTelegramRecipientsError('');
    setTelegramAutomationStateError('');
    setAuditEventsError('');
    setToggleId('');
    setInventoryBatchAction('');
    setMixEditor(emptyMixEditor());
    setMixSaveStatus('idle');
    setMixSaveError('');
    setRailEditor(emptyRailEditor());
    setRailMixSearch('');
    setRailMixCandidateId('');
    setRailSaveStatus('idle');
    setRailSaveError('');
    setDailyCodeEditor(emptyDailyCodeEditor());
    setDailyCodeSaveStatus('idle');
    setDailyCodeSaveError('');
    setDailyCodeToggleId('');
    setStaffAccountEditor(emptyStaffAccountEditor());
    setStaffAccountSaveStatus('idle');
    setStaffAccountSaveError('');
    setStaffAccountToggleId('');
    setDailyCodes([]);
    setStaffAccounts([]);
    setTelegramOperators([]);
    setTelegramRecipients([]);
    setTelegramAutomationState(null);
    setAuditEvents([]);
    setTelegramOperatorEditor(emptyTelegramOperatorEditor());
    setTelegramOperatorSaveStatus('idle');
    setTelegramOperatorSaveError('');
    setTelegramOperatorToggleId('');
    setTelegramRecipientEditor(emptyTelegramRecipientEditor());
    setTelegramRecipientSaveStatus('idle');
    setTelegramRecipientSaveError('');
    setTelegramRecipientToggleId('');
  };

  const onToggleStock = async (item: InventoryTobacco) => {
    if (!token) {
      return;
    }

    setToggleId(item.id);
    setInventoryError('');

    try {
      await requestJson<unknown>(
        `/staff/inventory/tobaccos/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ inStock: !item.inStock }),
        },
        token,
      );
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось обновить наличие');
      setInventoryStatus('error');
    } finally {
      setToggleId('');
    }
  };

  const onToggleInventorySelection = (id: string) => {
    setSelectedInventoryIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const onToggleSelectAllInventory = () => {
    const visibleIds = inventory.map((item) => item.id);
    const nextSelection = visibleIds.every((id) => selectedInventoryIds.includes(id)) ? [] : visibleIds;
    setSelectedInventoryIds(nextSelection);
  };

  const onRunInventoryBatch = async (action: Exclude<InventoryBatchAction, 'archive'>) => {
    if (!token || !selectedInventoryIds.length) {
      return;
    }

    setInventoryBatchAction(action);
    setInventoryError('');

    try {
      const response = await requestJson<unknown>(
        '/staff/inventory/tobaccos/batch',
        {
          method: 'POST',
          body: JSON.stringify({
            ids: selectedInventoryIds,
            action,
          }),
        },
        token,
      );
      const batch = normalizeInventoryBatchResponse(response);
      if (batch.skippedIds.length) {
        setInventoryError(`Часть позиций пропущена backend: ${batch.skippedIds.join(', ')}`);
      }
      setSelectedInventoryIds([]);
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось выполнить batch действие');
      setInventoryStatus('error');
    } finally {
      setInventoryBatchAction('');
    }
  };

  const onResetInventoryCreateFeedback = () => {
    setInventoryCreateStatus('idle');
    setInventoryCreateError('');
  };

  const onCreateTobacco = async (payload: InventoryCreateInput) => {
    if (!token) {
      return;
    }

    const manufacturer = payload.manufacturer.trim();
    const name = payload.name.trim();

    if (!manufacturer) {
      setInventoryCreateError('Укажите производителя');
      setInventoryCreateStatus('error');
      return;
    }

    if (!name) {
      setInventoryCreateError('Укажите название табака');
      setInventoryCreateStatus('error');
      return;
    }

    setInventoryCreateStatus('loading');
    setInventoryCreateError('');

    try {
      await requestJson<unknown>(
        '/staff/inventory/tobaccos',
        {
          method: 'POST',
          body: JSON.stringify({
            manufacturer,
            lineName: payload.lineName.trim(),
            name,
            description: payload.description.trim(),
            country: payload.country.trim(),
            officialStrength: payload.officialStrength.trim(),
            communityStrength: payload.communityStrength.trim(),
            productionStatus: payload.productionStatus.trim(),
            flavorProfiles: payload.flavorProfiles,
            flavors: payload.flavors,
            flavorTags: payload.flavorTags,
            inStock: payload.inStock,
          }),
        },
        token,
      );

      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryCreateStatus('ready');
    } catch (cause) {
      setInventoryCreateError(cause instanceof Error ? cause.message : 'Не удалось создать табак');
      setInventoryCreateStatus('error');
    }
  };

  const onOpenInventoryMix = (mixId: string) => {
    const mix = mixes.find((item) => item.id === mixId);
    if (mix) {
      onSelectMix(mix);
      return;
    }

    setActiveTab('mixes');
  };

  const onSelectMix = (mix: MixRecord) => {
    setMixEditor(toMixEditorState(mix));
    setMixesScreen('edit');
    setMixSaveError('');
    setMixSaveStatus('idle');
    setActiveTab('mixes');
  };

  const onStartCreateMix = () => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('create');
    setMixSaveError('');
    setMixSaveStatus('idle');
    setActiveTab('mixes');
  };

  const onCancelCreateMix = () => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('catalog');
    setMixSaveError('');
    setMixSaveStatus('idle');
  };

  const onResetMixEditor = () => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('catalog');
    setMixSaveError('');
    setMixSaveStatus('idle');
  };

  const refreshMixesSurface = async (
    nextFilters: MixListFilters = mixesFilters,
    nextSort: MixListSort = mixesSort,
    nextPage: number = mixesMeta.page,
  ) => {
    if (!token) {
      return;
    }

    await loadMixes(token, nextFilters, nextSort, nextPage, mixesMeta.pageSize);
  };

  const onMixSearchChange = async (value: string) => {
    const nextFilters = {
      ...mixesFilters,
      search: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort, 1);
  };

  const onMixStatusChange = async (value: MixStatusFilter) => {
    const nextFilters = {
      ...mixesFilters,
      status: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort, 1);
  };

  const onMixRailStateChange = async (value: MixRailFilter) => {
    const nextFilters = {
      ...mixesFilters,
      railState: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort, 1);
  };

  const onMixSortFieldChange = async (field: MixSortField) => {
    const nextSort = {
      ...mixesSort,
      field,
    };
    setMixesSort(nextSort);
    await refreshMixesSurface(mixesFilters, nextSort, 1);
  };

  const onMixSortDirectionChange = async (direction: MixSortDirection) => {
    const nextSort = {
      ...mixesSort,
      direction,
    };
    setMixesSort(nextSort);
    await refreshMixesSurface(mixesFilters, nextSort, 1);
  };

  const onMixToggleFilterValue = async (key: MixFilterKey, value: string) => {
    const nextFilters = {
      ...mixesFilters,
      [key]: toggleMixFilterValue(mixesFilters[key], value),
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort, 1);
  };

  const onMixClearFilterGroup = async (key: MixFilterKey) => {
    if (mixesFilters[key].length === 0) {
      return;
    }

    const nextFilters = {
      ...mixesFilters,
      [key]: [],
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort, 1);
  };

  const onMixResetFilters = async () => {
    const nextFilters = {
      ...defaultMixListResponse.filters,
      options: mixesFilters.options,
    };
    const nextSort = defaultMixListResponse.sort;
    setMixesFilters(nextFilters);
    setMixesSort(nextSort);
    await refreshMixesSurface(nextFilters, nextSort, 1);
  };

  const onMixPageChange = async (page: number) => {
    await refreshMixesSurface(mixesFilters, mixesSort, page);
  };

  const onChangeMixEditorField = (field: 'name' | 'description', value: string) => {
    setMixEditor((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const onChangeMixEditorAvailability = (value: boolean) => {
    setMixEditor((current) => ({
      ...current,
      available: value,
    }));
  };

  const onAddMixComponent = () => {
    const fallbackId = mixTobaccos.find((item) => !mixEditor.components.some((component) => component.tobaccoId === item.id))?.id ?? '';
    setMixEditor((current) => ({
      ...current,
      components: [...current.components, createMixEditorComponent(fallbackId, '')],
    }));
  };

  const onUpdateMixComponent = (key: string, patch: Partial<Omit<MixEditorComponentInput, 'key'>>) => {
    setMixEditor((current) => ({
      ...current,
      components: current.components.map((component) => (
        component.key === key ? { ...component, ...patch } : component
      )),
    }));
  };

  const onMoveMixComponent = (key: string, direction: 'up' | 'down') => {
    setMixEditor((current) => {
      const index = current.components.findIndex((component) => component.key === key);
      if (index === -1) {
        return current;
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.components.length) {
        return current;
      }

      const nextComponents = [...current.components];
      const [item] = nextComponents.splice(index, 1);
      nextComponents.splice(nextIndex, 0, item);

      return {
        ...current,
        components: nextComponents,
      };
    });
  };

  const onRemoveMixComponent = (key: string) => {
    setMixEditor((current) => ({
      ...current,
      components: current.components.filter((component) => component.key !== key),
    }));
  };

  const onRebalanceMixComponents = () => {
    setMixEditor((current) => {
      if (!current.components.length) {
        return current;
      }

      const base = Math.floor(100 / current.components.length);
      const remainder = 100 - base * current.components.length;

      return {
        ...current,
        components: current.components.map((component, index) => ({
          ...component,
          proportion: String(base + (index < remainder ? 1 : 0)),
        })),
      };
    });
  };

  const onSubmitMix = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = mixEditor.name.trim();
    const description = mixEditor.description.trim();
    const components = mixEditor.components
      .map((component, index) => ({
        tobaccoId: component.tobaccoId.trim(),
        proportion: parseNumberInput(component.proportion, 0),
        sortOrder: index,
      }))
      .filter((component) => component.tobaccoId);

    if (!name) {
      setMixSaveError('Введите название микса');
      setMixSaveStatus('error');
      return;
    }

    if (!description) {
      setMixSaveError('Добавьте описание микса');
      setMixSaveStatus('error');
      return;
    }

    if (!components.length) {
      setMixSaveError('Добавьте хотя бы один компонент');
      setMixSaveStatus('error');
      return;
    }

    const total = components.reduce((sum, component) => sum + component.proportion, 0);
    if (total !== 100) {
      setMixSaveError('Сумма долей должна быть ровно 100%');
      setMixSaveStatus('error');
      return;
    }

    setMixSaveStatus('loading');
    setMixSaveError('');

    const payload = {
      name,
      description,
      components,
      available: mixEditor.available,
    };

    try {
      const response = await requestJson<unknown>(
        mixEditor.id ? `/staff/mixes/${mixEditor.id}` : '/staff/mixes',
        {
          method: mixEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      const savedMix = normalizeMixRecord(readEntityPayload<unknown>(response));
      if (!savedMix.id) {
        throw new Error('Backend вернул пустой микс');
      }

      setMixEditor(toMixEditorState(savedMix));
      setMixesScreen('catalog');
      await Promise.all([
        loadMixes(token, mixesFilters, mixesSort),
        loadRailMixCatalog(token),
        loadRails(token),
        loadSummary(token, dashboardWindow),
      ]);
      setMixSaveStatus('ready');
      setActiveTab('mixes');
    } catch (cause) {
      setMixSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить микс');
      setMixSaveStatus('error');
    }
  };

  const onSelectRail = (rail: RailRecord) => {
    setRailEditor(toRailEditorState(rail));
    setRailMixCandidateId('');
    setRailSaveError('');
    setRailSaveStatus('idle');
    setActiveTab('rails');
  };

  const onResetRailEditor = () => {
    setRailEditor(emptyRailEditor());
    setRailMixCandidateId('');
    setRailSaveError('');
    setRailSaveStatus('idle');
  };

  const onAddRailMix = (mixId: string) => {
    if (!mixId) {
      return;
    }

    setRailEditor((current) => (
      current.mixIds.includes(mixId)
        ? current
        : {
            ...current,
            mixIds: [...current.mixIds, mixId],
          }
    ));
  };

  const onRemoveRailMix = (mixId: string) => {
    setRailEditor((current) => ({
      ...current,
      mixIds: current.mixIds.filter((item) => item !== mixId),
    }));
  };

  const onMoveRailMix = (mixId: string, direction: 'up' | 'down') => {
    setRailEditor((current) => {
      const index = current.mixIds.indexOf(mixId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.mixIds.length) {
        return current;
      }

      const nextMixIds = [...current.mixIds];
      const [item] = nextMixIds.splice(index, 1);
      nextMixIds.splice(targetIndex, 0, item);

      return {
        ...current,
        mixIds: nextMixIds,
      };
    });
  };

  const onSubmitRail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = railEditor.name.trim();
    const description = railEditor.description.trim();
    const mixIds = railEditor.mixIds;

    if (railEditor.id && !railEditor.editable) {
      setRailSaveError(railEditor.readOnlyReason || 'Этот рейл доступен только для просмотра');
      setRailSaveStatus('error');
      return;
    }

    if (!name) {
      setRailSaveError('Введите название рейла');
      setRailSaveStatus('error');
      return;
    }

    if (!mixIds.length) {
      setRailSaveError('Добавьте хотя бы один микс');
      setRailSaveStatus('error');
      return;
    }

    setRailSaveStatus('loading');
    setRailSaveError('');

    const payload = {
      name,
      description,
      mixIds,
      active: railEditor.active,
    };

    try {
      const response = await requestJson<unknown>(
        railEditor.id ? `/staff/rails/${railEditor.id}` : '/staff/rails',
        {
          method: railEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      const savedRail = normalizeRailRecord(readEntityPayload<unknown>(response));
      if (!savedRail.id) {
        throw new Error('Backend вернул пустой рейл');
      }

      setRails((current) => sortRails(replaceOrInsert(current, savedRail)));
      setRailEditor(toRailEditorState(savedRail));
      await Promise.all([
        loadSummary(token, dashboardWindow),
        loadMixes(token, mixesFilters, mixesSort),
        loadRailMixCatalog(token),
        loadRails(token),
      ]);
      setRailSaveStatus('ready');
      setActiveTab('rails');
    } catch (cause) {
      setRailSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить рейл');
      setRailSaveStatus('error');
    }
  };

  const onSelectDailyCode = (code: DailyAccessCodeRecord) => {
    setDailyCodeEditor(toDailyCodeEditorState(code));
    setDailyCodeSaveError('');
    setDailyCodeSaveStatus('idle');
    setActiveTab('access');
  };

  const onResetDailyCodeEditor = () => {
    setDailyCodeEditor(emptyDailyCodeEditor());
    setDailyCodeSaveError('');
    setDailyCodeSaveStatus('idle');
  };

  const onSubmitDailyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const codeValue = dailyCodeEditor.codeValue.trim();
    const codeLabel = dailyCodeEditor.codeLabel.trim();
    const startsAt = parseDateTimeLocalInput(dailyCodeEditor.startsAt);
    const endsAt = parseDateTimeLocalInput(dailyCodeEditor.endsAt);

    if (!codeValue) {
      setDailyCodeSaveError('Введите код доступа');
      setDailyCodeSaveStatus('error');
      return;
    }

    if (!startsAt || !endsAt) {
      setDailyCodeSaveError('Укажите корректные даты начала и окончания');
      setDailyCodeSaveStatus('error');
      return;
    }

    setDailyCodeSaveStatus('loading');
    setDailyCodeSaveError('');

    const payload = {
      codeValue,
      codeLabel: codeLabel || 'Код доступа',
      active: dailyCodeEditor.active,
      startsAt,
      endsAt,
    };

    try {
      const response = await requestJson<unknown>(
        dailyCodeEditor.id ? `/staff/access/daily-codes/${dailyCodeEditor.id}` : '/staff/access/daily-codes',
        {
          method: dailyCodeEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      const savedCode = normalizeDailyAccessCodeRecord(readEntityPayload<unknown>(response));
      if (!savedCode.id) {
        throw new Error('Backend вернул пустой код доступа');
      }

      setDailyCodes((current) => sortDailyAccessCodes(replaceOrInsert(current, savedCode)));
      setDailyCodeEditor(toDailyCodeEditorState(savedCode));
      setDailyCodeSaveStatus('ready');
      setActiveTab('access');
    } catch (cause) {
      setDailyCodeSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить код доступа');
      setDailyCodeSaveStatus('error');
    }
  };

  const onToggleDailyCodeActive = async (code: DailyAccessCodeRecord) => {
    if (!token) {
      return;
    }

    setDailyCodeToggleId(code.id);
    setDailyCodesError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/access/daily-codes/${code.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            codeValue: code.codeValue,
            codeLabel: code.codeLabel,
            active: !code.active,
            startsAt: code.startsAt,
            endsAt: code.endsAt,
          }),
        },
        token,
      );

      const savedCode = normalizeDailyAccessCodeRecord(readEntityPayload<unknown>(response));
      if (!savedCode.id) {
        throw new Error('Backend вернул пустой код доступа');
      }

      setDailyCodes((current) => sortDailyAccessCodes(replaceOrInsert(current, savedCode)));
      if (dailyCodeEditor.id === code.id) {
        setDailyCodeEditor(toDailyCodeEditorState(savedCode));
      }
      setDailyCodesStatus('ready');
    } catch (cause) {
      setDailyCodesError(cause instanceof Error ? cause.message : 'Не удалось обновить код доступа');
      setDailyCodesStatus('error');
    } finally {
      setDailyCodeToggleId('');
    }
  };

  const onDeleteDailyCode = async (code: DailyAccessCodeRecord) => {
    if (!token) {
      return;
    }

    setDailyCodeToggleId(code.id);
    setDailyCodesError('');

    try {
      await requestJson(
        `/staff/access/daily-codes/${code.id}`,
        {
          method: 'DELETE',
        },
        token,
      );

      setDailyCodes((current) => sortDailyAccessCodes(current.filter((item) => item.id !== code.id)));
      if (dailyCodeEditor.id === code.id) {
        onResetDailyCodeEditor();
      }
      setDailyCodesStatus('ready');
    } catch (cause) {
      setDailyCodesError(cause instanceof Error ? cause.message : 'Не удалось удалить код доступа');
      setDailyCodesStatus('error');
    } finally {
      setDailyCodeToggleId('');
    }
  };

  const onSelectStaffAccount = (account: StaffAccountRecord) => {
    setStaffAccountEditor(toStaffAccountEditorState(account));
    setStaffAccountSaveError('');
    setStaffAccountSaveStatus('idle');
    setActiveTab('access');
  };

  const onResetStaffAccountEditor = () => {
    setStaffAccountEditor(emptyStaffAccountEditor());
    setStaffAccountSaveError('');
    setStaffAccountSaveStatus('idle');
  };

  const onSubmitStaffAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const loginValue = staffAccountEditor.login.trim();
    const name = staffAccountEditor.name.trim();
    const password = staffAccountEditor.password.trim();

    if (!loginValue) {
      setStaffAccountSaveError('Введите логин');
      setStaffAccountSaveStatus('error');
      return;
    }

    if (!name) {
      setStaffAccountSaveError('Введите имя');
      setStaffAccountSaveStatus('error');
      return;
    }

    if (!staffAccountEditor.id && !password) {
      setStaffAccountSaveError('Для нового сотрудника нужен пароль');
      setStaffAccountSaveStatus('error');
      return;
    }

    setStaffAccountSaveStatus('loading');
    setStaffAccountSaveError('');

    const payload = {
      login: loginValue,
      name,
      role: staffAccountEditor.role,
      active: staffAccountEditor.active,
      ...(password ? { password } : {}),
    };

    try {
      const response = await requestJson<unknown>(
        staffAccountEditor.id ? `/staff/access/accounts/${staffAccountEditor.id}` : '/staff/access/accounts',
        {
          method: staffAccountEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      const savedAccount = normalizeStaffAccountRecord(readEntityPayload<unknown>(response));
      if (!savedAccount.id) {
        throw new Error('Backend вернул пустого сотрудника');
      }

      setStaffAccounts((current) => sortStaffAccounts(replaceOrInsert(current, savedAccount)));
      setStaffAccountEditor(toStaffAccountEditorState(savedAccount));
      setStaffAccountSaveStatus('ready');
      setActiveTab('access');
    } catch (cause) {
      setStaffAccountSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить сотрудника');
      setStaffAccountSaveStatus('error');
    }
  };

  const onToggleStaffAccountActive = async (account: StaffAccountRecord) => {
    if (!token) {
      return;
    }

    setStaffAccountToggleId(account.id);
    setStaffAccountsError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/access/accounts/${account.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            login: account.login,
            name: account.name,
            role: account.role,
            active: !account.active,
          }),
        },
        token,
      );

      const savedAccount = normalizeStaffAccountRecord(readEntityPayload<unknown>(response));
      if (!savedAccount.id) {
        throw new Error('Backend вернул пустого сотрудника');
      }

      setStaffAccounts((current) => sortStaffAccounts(replaceOrInsert(current, savedAccount)));
      if (staffAccountEditor.id === account.id) {
        setStaffAccountEditor(toStaffAccountEditorState(savedAccount));
      }
      setStaffAccountsStatus('ready');
    } catch (cause) {
      setStaffAccountsError(cause instanceof Error ? cause.message : 'Не удалось обновить сотрудника');
      setStaffAccountsStatus('error');
    } finally {
      setStaffAccountToggleId('');
    }
  };

  const onDeleteStaffAccount = async (account: StaffAccountRecord) => {
    if (!token) {
      return;
    }

    setStaffAccountToggleId(account.id);
    setStaffAccountsError('');

    try {
      await requestJson(
        `/staff/access/accounts/${account.id}`,
        {
          method: 'DELETE',
        },
        token,
      );

      setStaffAccounts((current) => sortStaffAccounts(current.filter((item) => item.id !== account.id)));
      if (staffAccountEditor.id === account.id) {
        onResetStaffAccountEditor();
      }
      setStaffAccountsStatus('ready');
    } catch (cause) {
      setStaffAccountsError(cause instanceof Error ? cause.message : 'Не удалось удалить сотрудника');
      setStaffAccountsStatus('error');
    } finally {
      setStaffAccountToggleId('');
    }
  };

  const onSelectTelegramOperator = (operator: TelegramOperatorRecord) => {
    setTelegramOperatorEditor(toTelegramOperatorEditorState(operator));
    setTelegramOperatorSaveError('');
    setTelegramOperatorSaveStatus('idle');
    setActiveTab('access');
  };

  const onResetTelegramOperatorEditor = () => {
    setTelegramOperatorEditor(emptyTelegramOperatorEditor());
    setTelegramOperatorSaveError('');
    setTelegramOperatorSaveStatus('idle');
  };

  const onSubmitTelegramOperator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = telegramOperatorEditor.name.trim();
    const phone = telegramOperatorEditor.phone.trim();

    if (!name) {
      setTelegramOperatorSaveError('Укажите имя оператора');
      setTelegramOperatorSaveStatus('error');
      return;
    }

    if (!phone) {
      setTelegramOperatorSaveError('Укажите номер телефона');
      setTelegramOperatorSaveStatus('error');
      return;
    }

    setTelegramOperatorSaveStatus('loading');
    setTelegramOperatorSaveError('');

    try {
      const response = await requestJson<unknown>(
        telegramOperatorEditor.id
          ? `/staff/access/telegram-operators/${telegramOperatorEditor.id}`
          : '/staff/access/telegram-operators',
        {
          method: telegramOperatorEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify({
            name,
            phone,
            active: telegramOperatorEditor.active,
          }),
        },
        token,
      );

      const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
      if (!savedOperator.id) {
        throw new Error('Backend вернул пустую запись Telegram доступа');
      }

      setTelegramOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
      setTelegramOperatorEditor(toTelegramOperatorEditorState(savedOperator));
      setTelegramOperatorSaveStatus('ready');
      setActiveTab('access');
    } catch (cause) {
      setTelegramOperatorSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить Telegram доступ');
      setTelegramOperatorSaveStatus('error');
    }
  };

  const onToggleTelegramOperatorActive = async (operator: TelegramOperatorRecord) => {
    if (!token) {
      return;
    }

    setTelegramOperatorToggleId(operator.id);
    setTelegramOperatorsError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/access/telegram-operators/${operator.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: operator.name,
            phone: operator.phone,
            active: !operator.active,
          }),
        },
        token,
      );

      const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
      if (!savedOperator.id) {
        throw new Error('Backend вернул пустую запись Telegram доступа');
      }

      setTelegramOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
      if (telegramOperatorEditor.id === operator.id) {
        setTelegramOperatorEditor(toTelegramOperatorEditorState(savedOperator));
      }
      setTelegramOperatorsStatus('ready');
    } catch (cause) {
      setTelegramOperatorsError(cause instanceof Error ? cause.message : 'Не удалось обновить Telegram доступ');
      setTelegramOperatorsStatus('error');
    } finally {
      setTelegramOperatorToggleId('');
    }
  };

  const onClearTelegramOperatorLink = async (operator: TelegramOperatorRecord) => {
    if (!token) {
      return;
    }

    setTelegramOperatorToggleId(operator.id);
    setTelegramOperatorsError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/access/telegram-operators/${operator.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: operator.name,
            phone: operator.phone,
            active: operator.active,
            clearLink: true,
          }),
        },
        token,
      );

      const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
      if (!savedOperator.id) {
        throw new Error('Backend вернул пустую запись Telegram доступа');
      }

      setTelegramOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
      if (telegramOperatorEditor.id === operator.id) {
        setTelegramOperatorEditor(toTelegramOperatorEditorState(savedOperator));
      }
      setTelegramOperatorsStatus('ready');
    } catch (cause) {
      setTelegramOperatorsError(cause instanceof Error ? cause.message : 'Не удалось сбросить привязку Telegram');
      setTelegramOperatorsStatus('error');
    } finally {
      setTelegramOperatorToggleId('');
    }
  };

  const onDeleteTelegramOperator = async (operator: TelegramOperatorRecord) => {
    if (!token) {
      return;
    }

    setTelegramOperatorToggleId(operator.id);
    setTelegramOperatorsError('');

    try {
      await requestJson(
        `/staff/access/telegram-operators/${operator.id}`,
        {
          method: 'DELETE',
        },
        token,
      );

      setTelegramOperators((current) => sortTelegramOperators(current.filter((item) => item.id !== operator.id)));
      if (telegramOperatorEditor.id === operator.id) {
        onResetTelegramOperatorEditor();
      }
      setTelegramOperatorsStatus('ready');
    } catch (cause) {
      setTelegramOperatorsError(cause instanceof Error ? cause.message : 'Не удалось удалить Telegram доступ');
      setTelegramOperatorsStatus('error');
    } finally {
      setTelegramOperatorToggleId('');
    }
  };

  const onSelectTelegramRecipient = (recipient: TelegramRecipientRecord) => {
    setTelegramRecipientEditor(toTelegramRecipientEditorState(recipient));
    setTelegramRecipientSaveError('');
    setTelegramRecipientSaveStatus('idle');
    setActiveTab('access');
  };

  const onResetTelegramRecipientEditor = () => {
    setTelegramRecipientEditor(emptyTelegramRecipientEditor());
    setTelegramRecipientSaveError('');
    setTelegramRecipientSaveStatus('idle');
  };

  const onSubmitTelegramRecipient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const chatId = telegramRecipientEditor.chatId.trim();
    const label = telegramRecipientEditor.label.trim();

    if (!chatId) {
      setTelegramRecipientSaveError('Укажите chat id Telegram');
      setTelegramRecipientSaveStatus('error');
      return;
    }

    setTelegramRecipientSaveStatus('loading');
    setTelegramRecipientSaveError('');

    try {
      const response = await requestJson<unknown>(
        telegramRecipientEditor.id
          ? `/staff/access/telegram-recipients/${telegramRecipientEditor.id}`
          : '/staff/access/telegram-recipients',
        {
          method: telegramRecipientEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify({
            chatId,
            label,
            scope: telegramRecipientEditor.scope,
            active: telegramRecipientEditor.active,
          }),
        },
        token,
      );

      const savedRecipient = normalizeTelegramRecipientRecord(readEntityPayload<unknown>(response));
      if (!savedRecipient.id) {
        throw new Error('Backend вернул пустую запись чата Telegram');
      }

      setTelegramRecipients((current) => sortTelegramRecipients(replaceOrInsert(current, savedRecipient)));
      setTelegramRecipientEditor(toTelegramRecipientEditorState(savedRecipient));
      setTelegramRecipientSaveStatus('ready');
      setActiveTab('access');
    } catch (cause) {
      setTelegramRecipientSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить чат Telegram');
      setTelegramRecipientSaveStatus('error');
    }
  };

  const onToggleTelegramRecipientActive = async (recipient: TelegramRecipientRecord) => {
    if (!token) {
      return;
    }

    setTelegramRecipientToggleId(recipient.id);
    setTelegramRecipientsError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/access/telegram-recipients/${recipient.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            chatId: recipient.chatId,
            label: recipient.label,
            scope: recipient.scope,
            active: !recipient.active,
          }),
        },
        token,
      );

      const savedRecipient = normalizeTelegramRecipientRecord(readEntityPayload<unknown>(response));
      if (!savedRecipient.id) {
        throw new Error('Backend вернул пустую запись чата Telegram');
      }

      setTelegramRecipients((current) => sortTelegramRecipients(replaceOrInsert(current, savedRecipient)));
      if (telegramRecipientEditor.id === recipient.id) {
        setTelegramRecipientEditor(toTelegramRecipientEditorState(savedRecipient));
      }
      setTelegramRecipientsStatus('ready');
    } catch (cause) {
      setTelegramRecipientsError(cause instanceof Error ? cause.message : 'Не удалось обновить чат Telegram');
      setTelegramRecipientsStatus('error');
    } finally {
      setTelegramRecipientToggleId('');
    }
  };

  const onDeleteTelegramRecipient = async (recipient: TelegramRecipientRecord) => {
    if (!token) {
      return;
    }

    setTelegramRecipientToggleId(recipient.id);
    setTelegramRecipientsError('');

    try {
      await requestJson(
        `/staff/access/telegram-recipients/${recipient.id}`,
        {
          method: 'DELETE',
        },
        token,
      );

      setTelegramRecipients((current) => sortTelegramRecipients(current.filter((item) => item.id !== recipient.id)));
      if (telegramRecipientEditor.id === recipient.id) {
        onResetTelegramRecipientEditor();
      }
      setTelegramRecipientsStatus('ready');
    } catch (cause) {
      setTelegramRecipientsError(cause instanceof Error ? cause.message : 'Не удалось удалить чат Telegram');
      setTelegramRecipientsStatus('error');
    } finally {
      setTelegramRecipientToggleId('');
    }
  };

  const renderDashboard = () => (
    <DashboardView
      summary={summary}
      summaryStatus={summaryStatus}
      summaryError={summaryError}
      dashboardWindow={dashboardWindow}
      onSelectDashboardWindow={onSelectDashboardWindow}
      onNavigate={(tab) => setActiveTab(tab)}
    />
  );

  const renderInventory = () => (
    <InventoryView
      items={inventory}
      status={inventoryStatus}
      error={inventoryError}
      filters={inventoryFilters}
      meta={inventoryMeta}
      sort={inventorySort}
      selectedIds={selectedInventoryIds}
      pendingRowId={toggleId}
      pendingBatchAction={inventoryBatchAction}
      onSearchChange={onInventorySearchChange}
      onStockChange={(value) => void onInventoryStockChange(value)}
      onSortFieldChange={(value) => void onInventorySortFieldChange(value)}
      onSortDirectionChange={(value) => void onInventorySortDirectionChange(value)}
      onToggleFilterValue={(key, value) => void onInventoryToggleFilterValue(key, value)}
      onClearFilterGroup={(key) => void onInventoryClearFilterGroup(key)}
      onResetFilters={() => void onInventoryResetFilters()}
      onPageChange={onInventoryPageChange}
      onToggleSelection={onToggleInventorySelection}
      onToggleSelectAll={onToggleSelectAllInventory}
      onToggleStock={(item) => void onToggleStock(item)}
      onRunBatchAction={(action) => void onRunInventoryBatch(action)}
      onOpenMix={onOpenInventoryMix}
      createStatus={inventoryCreateStatus}
      createError={inventoryCreateError}
      onCreateTobacco={onCreateTobacco}
      onResetCreateFeedback={onResetInventoryCreateFeedback}
    />
  );

  const renderMixes = () => (
    <MixCatalogView
      mode={mixesScreen}
      items={mixes}
      tobaccoOptions={mixTobaccos}
      status={mixesStatus}
      error={mixesError}
      filters={mixesFilters}
      meta={mixesMeta}
      sort={mixesSort}
      editor={mixEditor}
      saveStatus={mixSaveStatus}
      saveError={mixSaveError}
      onSearchChange={onMixSearchChange}
      onStatusChange={(value) => void onMixStatusChange(value)}
      onRailStateChange={(value) => void onMixRailStateChange(value)}
      onSortFieldChange={(value) => void onMixSortFieldChange(value)}
      onSortDirectionChange={(value) => void onMixSortDirectionChange(value)}
      onToggleFilterValue={(key, value) => void onMixToggleFilterValue(key, value)}
      onClearFilterGroup={(key) => void onMixClearFilterGroup(key)}
      onResetFilters={() => void onMixResetFilters()}
      onPageChange={onMixPageChange}
      onSelectMix={onSelectMix}
      onStartCreate={onStartCreateMix}
      onCancelCreate={onCancelCreateMix}
      onResetEditor={onResetMixEditor}
      onEditorFieldChange={onChangeMixEditorField}
      onEditorAvailabilityChange={onChangeMixEditorAvailability}
      onAddComponent={onAddMixComponent}
      onUpdateComponent={onUpdateMixComponent}
      onMoveComponent={onMoveMixComponent}
      onRemoveComponent={onRemoveMixComponent}
      onRebalanceComponents={onRebalanceMixComponents}
      onSubmit={onSubmitMix}
    />
  );

  const selectedRailMixEntries = railEditor.mixIds.map((mixId, index) => ({
    mixId,
    index,
    mix: railMixCatalog.find((item) => item.id === mixId) ?? mixes.find((item) => item.id === mixId) ?? null,
  }));
  const availableRailMixOptions = railMixCatalog
    .filter((mix) => !railEditor.mixIds.includes(mix.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  const effectiveRailMixCandidateId = availableRailMixOptions.some((mix) => mix.id === railMixCandidateId)
    ? railMixCandidateId
    : (availableRailMixOptions[0]?.id ?? '');
  const railMixPickerOptions = availableRailMixOptions.map((mix) => ({
    id: mix.id,
    title: mix.name,
    subtitle: `${mix.guestVisible ? 'Виден гостю' : mix.available ? 'Скрыт оператором' : 'Заблокирован наличием'} · Рейтинг ${mix.avgRating.toFixed(1)} · Популярность ${mix.popularity}`,
    keywords: [mix.description, ...mix.flavorProfiles, ...mix.flavors, ...mix.flavorTags],
  }));
  const railEditorLocked = Boolean(railEditor.id) && !railEditor.editable;
  const railEditorStatusLabel = railEditorLocked
    ? 'Только просмотр'
    : railEditor.active
      ? 'Активен'
      : 'Неактивен';

  const renderRails = () => (
    <section className="card rails-surface">
        <div className="section-head section-head--surface section-head--surface-split rails-surface__header">
          <div className="ops-surface__intro">
            <p className="eyebrow">Менеджер рейлов</p>
            <h2>Рейлы Nomad</h2>
            <p className="meta-line">Состав и порядок показа подборок для гостевой витрины.</p>
          </div>
        <div className="summary-grid summary-grid--nested ops-surface__stats rails-surface__stats">
          <article className="metric-card ops-surface__stat rails-surface__stat">
            <p className="metric-label">Всего рейлов</p>
            <p className="metric-value metric-value--compact">{rails.length}</p>
            <p className="meta-line">Все подборки гостевой витрины.</p>
          </article>
          <article className="metric-card ops-surface__stat rails-surface__stat">
            <p className="metric-label">Активны в витрине</p>
            <p className="metric-value metric-value--compact">{rails.filter((rail) => rail.active).length}</p>
              <p className="meta-line">Показываются гостю сейчас.</p>
          </article>
          <article className="metric-card ops-surface__stat rails-surface__stat">
            <p className="metric-label">Только просмотр</p>
            <p className="metric-value metric-value--compact">{rails.filter((rail) => !rail.editable).length}</p>
            <p className="meta-line">Системные подборки без ручного редактирования.</p>
          </article>
        </div>
      </div>

      <div className="ops-toolbar ops-toolbar--split rails-surface__toolbar">
        <p className="meta-line">Собирай подборки, меняй порядок и быстро отделяй системные рейлы от редактируемых.</p>
        <div className="section-actions">
          <span className="status-chip">Витрина гостя</span>
          <button className="secondary-button secondary-button--inline" type="button" onClick={onResetRailEditor}>
            Новый рейл
          </button>
        </div>
      </div>

      {railsStatus === 'loading' ? <p className="meta-line">Загружаем рейлы...</p> : null}
      {railsError ? <p className="error-text">{railsError}</p> : null}

      <div className="manager-layout ops-management-grid rails-surface__grid">
        <aside className="entity-list rails-surface__list">
          {rails.map((rail) => (
            <article
              className={[
                'entity-card',
                'ops-surface__card',
                'rails-surface__card',
                railEditor.id === rail.id ? 'entity-card--active' : '',
                rail.editable ? '' : 'entity-card--muted',
              ].filter(Boolean).join(' ')}
              key={rail.id}
            >
              <div className="entity-card__head">
                <div>
                  <p className="entity-kicker">Рейл</p>
                  <h3>{rail.name}</h3>
                </div>
                <span className={rail.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                  {rail.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="chip-row">
                <span className="chip">{formatRailType(rail.type)}</span>
                <span className={rail.editable ? 'chip chip--editable' : 'chip chip--readonly'}>
                  {rail.editable ? 'Редактируемый' : 'Только просмотр'}
                </span>
              </div>
              <p className="meta-line">{rail.description || 'Без описания'}</p>
              {!rail.editable && rail.readOnlyReason ? <p className="meta-line">{rail.readOnlyReason}</p> : null}
              <p className="meta-line">Миксы: {resolveRailMixSummary(rail, railMixCatalog)}</p>
              <div className="entity-card__actions">
                <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectRail(rail)}>
                  {rail.editable ? 'Редактировать' : 'Просмотр'}
                </button>
              </div>
            </article>
          ))}

          {!rails.length && railsStatus !== 'loading' ? <p className="meta-line">Пока нет рейлов.</p> : null}
        </aside>

        <article className="editor-card ops-editor rails-surface__editor">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">{railEditor.id ? 'Редактирование рейла' : 'Новый рейл'}</p>
              <h3>{railEditor.id ? railEditor.name || 'Без названия' : 'Создать рейл'}</h3>
            </div>
            <span className={railEditorLocked ? 'status-chip status-chip--locked' : 'status-chip'}>{railEditorStatusLabel}</span>
          </div>

          <form className="admin-form" onSubmit={onSubmitRail}>
            {railEditor.id ? (
              <div className="info-banner rails-surface__banner">
                Тип рейла: {formatRailType(railEditor.type)}.
                {!railEditor.editable && railEditor.readOnlyReason ? ` ${railEditor.readOnlyReason}` : ''}
              </div>
            ) : (
              <div className="info-banner rails-surface__banner">
                Новый рейл создаётся как мастерская подборка. Тип вручную выбирать не нужно.
              </div>
            )}

            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={railEditor.name}
                  onChange={(event) => setRailEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например, Топ по статистике"
                  disabled={railEditorLocked}
                />
              </label>

              <div className="field">
                <span className="field-label">Тип</span>
                <div className="info-banner">{formatRailType(railEditor.type)}</div>
              </div>

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={railEditor.description}
                  onChange={(event) => setRailEditor((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Короткое описание рейла"
                  rows={3}
                  disabled={railEditorLocked}
                />
              </label>

              <div className="field field--wide">
                <span className="field-label">Состав рейла</span>
                <div className="rail-mix-builder rails-surface__mix-builder">
                  <div className="rail-mix-builder__toolbar ops-toolbar rails-surface__mix-toolbar">
                    <SearchableEntitySelect
                      value={effectiveRailMixCandidateId}
                      options={railMixPickerOptions}
                      placeholder="Выберите микс"
                      searchPlaceholder="Поиск микса по названию, вкусу или описанию"
                      emptyLabel="Нет доступных миксов."
                      clearLabel="Очистить выбор"
                      listAriaLabel="Миксы для состава рейла"
                      disabled={railEditorLocked || !railMixPickerOptions.length}
                      onSelect={setRailMixCandidateId}
                    />
                    <button
                      className="secondary-button secondary-button--inline"
                      type="button"
                      onClick={() => onAddRailMix(effectiveRailMixCandidateId)}
                      disabled={railEditorLocked || !effectiveRailMixCandidateId}
                    >
                      Добавить микс
                    </button>
                  </div>

                  <div className="rail-mix-builder__summary ops-surface__summary rails-surface__mix-summary">
                    <span className="meta-line">В рейле: {railEditor.mixIds.length}</span>
                    <span className="meta-line">Доступно для добавления: {availableRailMixOptions.length}</span>
                  </div>

                  <div className="rail-mix-list ops-table-shell rails-surface__mix-list">
                    {selectedRailMixEntries.length ? selectedRailMixEntries.map(({ mixId, index, mix }) => (
                      <article className="rail-mix-row ops-surface__card rails-surface__mix-row" key={mixId}>
                        <div className="rail-mix-row__order">{index + 1}</div>
                        <div className="rail-mix-row__content">
                          <strong>{mix?.name ?? mixId}</strong>
                          <p className="meta-line">
                            {mix
                              ? `${mix.guestVisible ? 'Виден гостю' : mix.available ? 'Скрыт оператором' : 'Заблокирован наличием'} · Рейтинг ${mix.avgRating.toFixed(1)} · Популярность ${mix.popularity}`
                              : 'Микс не найден в актуальном каталоге, но сохранён в составе рейла.'}
                          </p>
                        </div>
                        <div className="rail-mix-row__actions">
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onMoveRailMix(mixId, 'up')}
                            disabled={railEditorLocked || index === 0}
                          >
                            Вверх
                          </button>
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onMoveRailMix(mixId, 'down')}
                            disabled={railEditorLocked || index === selectedRailMixEntries.length - 1}
                          >
                            Вниз
                          </button>
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onRemoveRailMix(mixId)}
                            disabled={railEditorLocked}
                          >
                            Убрать
                          </button>
                        </div>
                      </article>
                    )) : (
                      <div className="rail-mix-empty ops-empty-state">
                        <p className="meta-line">Добавьте хотя бы один микс, чтобы собрать рейл и задать порядок показа.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={railEditor.active}
                  onChange={(event) => setRailEditor((current) => ({ ...current, active: event.target.checked }))}
                  disabled={railEditorLocked}
                />
                <span>Активен в витрине</span>
              </label>
            </div>

            {railSaveError ? <p className="error-text">{railSaveError}</p> : null}

            <div className="form-actions">
              {!railEditorLocked ? (
                <button className="primary-button primary-button--inline" type="submit" disabled={railSaveStatus === 'loading'}>
                  {railSaveStatus === 'loading' ? 'Сохраняем...' : railEditor.id ? 'Сохранить рейл' : 'Создать рейл'}
                </button>
              ) : null}
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetRailEditor}>
                {railEditorLocked ? 'Создать новый рейл' : 'Сбросить форму'}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );

  const formatDateTimeDisplay = (value: string) => {
    if (!value) {
      return 'Не указано';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const renderAccess = () => {
    const currentDailyCode = dailyCodes.find((item) => item.active) ?? dailyCodes[0] ?? null;
    const activeOperators = telegramOperators.filter((item) => item.active);
    const linkedOperatorsCount = activeOperators.filter((item) => item.linkedChatId).length;
    const activeStaffAccounts = staffAccounts.filter((account) => account.active).length;
    const adminAccountsCount = staffAccounts.filter((account) => account.role === 'admin').length;

    return (
      <section className="card">
        <div className="section-head section-head--surface section-head--surface-split">
          <div className="ops-surface__intro">
            <p className="eyebrow">Доступ</p>
            <h2>Daily code и Telegram allowlist</h2>
            <p className="meta-line">Telegram-доступ, daily code и staff-учётки.</p>
          </div>
          <div className="summary-grid summary-grid--nested ops-surface__stats">
            <article className="metric-card ops-surface__stat">
              <p className="metric-label">Активный код</p>
              <p className="metric-value metric-value--compact">{currentDailyCode?.codeValue || 'Нет кода'}</p>
              <p className="meta-line">Текущее окно выдачи для смены.</p>
            </article>
            <article className="metric-card ops-surface__stat">
              <p className="metric-label">Активный список</p>
              <p className="metric-value metric-value--compact">{activeOperators.length}</p>
              <p className="meta-line">Привязанных чатов: {linkedOperatorsCount}</p>
            </article>
            <article className="metric-card ops-surface__stat">
              <p className="metric-label">Staff accounts</p>
              <p className="metric-value metric-value--compact">{activeStaffAccounts}</p>
              <p className="meta-line">Admin: {adminAccountsCount}</p>
            </article>
            <article className="metric-card ops-surface__stat">
              <p className="metric-label">Аудит</p>
              <p className="metric-value metric-value--compact">{auditEvents.length}</p>
              <p className="meta-line">Последние операции staff/admin.</p>
            </article>
          </div>
        </div>

        <div className="ops-toolbar ops-toolbar--split">
          <div className="info-banner info-banner--ops">
            Оператор получает код только через Telegram-бота после привязки контакта.
          </div>
          <div className="section-actions">
            <span className="status-chip">Telegram flow</span>
            {user?.role === 'admin' ? (
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramOperatorEditor}>
                Новый оператор
              </button>
            ) : null}
          </div>
        </div>

        <div className="summary-grid summary-grid--nested">
          <article className="metric-card automation-card ops-surface__card">
            <p className="metric-label">Текущий daily code</p>
            <p className="metric-value metric-value--compact">{currentDailyCode?.codeValue || 'Нет активного кода'}</p>
            <p className="meta-line">Подпись: {currentDailyCode?.codeLabel || 'Не задано'}</p>
            <p className="meta-line">Начало: {formatDateTimeDisplay(currentDailyCode?.startsAt || '')}</p>
            <p className="meta-line">Окончание: {formatDateTimeDisplay(currentDailyCode?.endsAt || '')}</p>
            <p className="meta-line">История окон: {dailyCodes.length}</p>
            {dailyCodesStatus === 'loading' ? <p className="meta-line">Загружаем daily code...</p> : null}
            {dailyCodesError ? <p className="error-text">{dailyCodesError}</p> : null}
          </article>

          <article className="metric-card automation-card ops-surface__card">
            <p className="metric-label">Состояние бота</p>
            <p className="metric-value metric-value--compact">
              {formatTelegramAutomationHealth(telegramAutomationState?.health ?? 'unknown')}
            </p>
            <div className="chip-row">
              <span
                className={
                  telegramAutomationState?.health === 'healthy'
                    ? 'stock-pill stock-pill--in'
                    : telegramAutomationState?.health === 'unknown'
                      ? 'status-chip'
                      : 'stock-pill stock-pill--out'
                }
              >
                {telegramAutomationState?.health ?? 'unknown'}
              </span>
            </div>
            <p className="meta-line">Heartbeat: {formatDateTimeDisplay(telegramAutomationState?.lastHeartbeatAt ?? '')}</p>
            <p className="meta-line">Последнее обновление: {formatDateTimeDisplay(telegramAutomationState?.updatedAt ?? '')}</p>
            <p className="meta-line">Последняя ошибка: {telegramAutomationState?.lastErrorMessage || 'нет'}</p>
            {telegramAutomationStateStatus === 'loading' ? <p className="meta-line">Загружаем статус бота...</p> : null}
            {telegramAutomationStateStatus === 'error' ? <p className="error-text">{telegramAutomationStateError}</p> : null}
            {telegramAutomationStateStatus === 'forbidden' ? <p className="meta-line">{telegramAutomationStateError}</p> : null}
          </article>

          <article className="metric-card automation-card ops-surface__card">
            <p className="metric-label">Последний запрос кода</p>
            <p className="meta-line">Время: {formatDateTimeDisplay(telegramAutomationState?.lastRequestAt ?? '')}</p>
            <p className="meta-line">Оператор: {telegramAutomationState?.lastRequestOperatorName || 'Не было запросов'}</p>
            <p className="meta-line">Телефон: {telegramAutomationState?.lastRequestPhone || 'Не указано'}</p>
            <p className="meta-line">Чат: {telegramAutomationState?.lastRequestChatId || 'Не указан'}</p>
            <p className="meta-line">Код: {telegramAutomationState?.lastRequestCodeValue || currentDailyCode?.codeValue || 'Не указан'}</p>
          </article>

          <article className="metric-card automation-card ops-surface__card">
            <p className="metric-label">Allowlist</p>
            <p className="meta-line">Активных номеров: {activeOperators.length}</p>
            <p className="meta-line">Привязанных чатов: {linkedOperatorsCount}</p>
            <p className="meta-line">Ждут привязку: {Math.max(activeOperators.length - linkedOperatorsCount, 0)}</p>
            <p className="meta-line">Всего записей: {telegramOperators.length}</p>
            {telegramOperatorsStatus === 'loading' ? <p className="meta-line">Загружаем список...</p> : null}
            {telegramOperatorsStatus === 'error' ? <p className="error-text">{telegramOperatorsError}</p> : null}
            {telegramOperatorsStatus === 'forbidden' ? <p className="meta-line">{telegramOperatorsError}</p> : null}
          </article>
        </div>

        <article className="editor-card ops-editor">
          <div className="entity-card__head">
              <div>
                <p className="entity-kicker">Как это работает</p>
                <h3>Сценарий выдачи кода</h3>
              </div>
              <span className="status-chip">Автоматический daily code</span>
          </div>
          <div className="audit-list ops-flow-list">
            {[
              '1. Администратор добавляет оператора по имени и телефону.',
              '2. Оператор впервые пишет боту и жмёт "Поделиться контактом".',
              '3. Бот привязывает текущий chat id к номеру из списка.',
              '4. После привязки оператор получает актуальный daily code через /code.',
            ].map((item) => (
              <article className="entity-card entity-card--compact ops-surface__card" key={item}>
                <p className="meta-line">{item}</p>
              </article>
            ))}
          </div>
        </article>

        <div className="manager-layout manager-layout--stacked manager-layout--spaced ops-management-grid">
          <aside className="entity-list">
            {telegramOperatorsStatus === 'forbidden' ? (
              <article className="entity-card entity-card--muted ops-surface__card">
                <p className="entity-kicker">Telegram доступ</p>
                <h3>Только для admin</h3>
                <p className="meta-line">{telegramOperatorsError || 'У вас нет доступа к управлению списком.'}</p>
              </article>
            ) : (
              telegramOperators.map((operator) => (
                <article
                  className={[
                    'entity-card',
                    'ops-surface__card',
                    telegramOperatorEditor.id === operator.id ? 'entity-card--active' : '',
                  ].filter(Boolean).join(' ')}
                  key={operator.id}
                >
                  <div className="entity-card__head">
                    <div>
                      <p className="entity-kicker">Telegram доступ</p>
                      <h3>{operator.name}</h3>
                    </div>
                    <span className={operator.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                      {operator.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{operator.phone}</span>
                    <span className="chip">{operator.linkedChatId ? 'Чат привязан' : 'Ждёт привязку'}</span>
                  </div>
                  <p className="meta-line">Чат: {operator.linkedChatId || 'ещё не привязан'}</p>
                  <p className="meta-line">Последний запрос: {formatDateTimeDisplay(operator.lastCodeRequestedAt)}</p>
                  <div className="entity-card__actions entity-card__actions--wrap">
                    <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectTelegramOperator(operator)}>
                      Редактировать
                    </button>
                    <button
                      className="secondary-button secondary-button--inline"
                      type="button"
                      onClick={() => void onToggleTelegramOperatorActive(operator)}
                      disabled={telegramOperatorToggleId === operator.id}
                    >
                      {telegramOperatorToggleId === operator.id ? 'Сохраняем...' : operator.active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    {operator.linkedChatId ? (
                      <button
                        className="secondary-button secondary-button--inline secondary-button--danger"
                        type="button"
                        onClick={() => void onClearTelegramOperatorLink(operator)}
                        disabled={telegramOperatorToggleId === operator.id}
                      >
                        {telegramOperatorToggleId === operator.id ? 'Сбрасываем...' : 'Сбросить привязку'}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button secondary-button--inline secondary-button--danger"
                      type="button"
                      onClick={() => void onDeleteTelegramOperator(operator)}
                      disabled={telegramOperatorToggleId === operator.id}
                    >
                      {telegramOperatorToggleId === operator.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </article>
              ))
            )}

            {telegramOperatorsStatus !== 'forbidden' && !telegramOperators.length && telegramOperatorsStatus !== 'loading' ? (
              <p className="meta-line">Пока нет операторов в списке.</p>
            ) : null}
          </aside>

          <article className="editor-card ops-editor">
            <div className="entity-card__head">
              <div>
                <p className="entity-kicker">{telegramOperatorEditor.id ? 'Редактирование Telegram доступа' : 'Новый Telegram доступ'}</p>
                <h3>{telegramOperatorEditor.id ? telegramOperatorEditor.name || 'Без имени' : 'Добавить оператора'}</h3>
              </div>
              <span className="status-chip">{telegramOperatorEditor.active ? 'Активен' : 'Неактивен'}</span>
            </div>

            {telegramOperatorsStatus === 'forbidden' ? (
              <div className="forbidden-panel">
                <p className="meta-line">Telegram allowlist недоступен для вашей роли.</p>
              </div>
            ) : (
              <form className="admin-form" onSubmit={onSubmitTelegramOperator}>
                <div className="form-grid form-grid--two">
                  <label className="field">
                    <span className="field-label">Имя оператора</span>
                    <input
                      className="text-input"
                      value={telegramOperatorEditor.name}
                      onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Анна"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Телефон</span>
                    <input
                      className="text-input"
                      type="tel"
                      value={telegramOperatorEditor.phone}
                      onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, phone: event.target.value }))}
                      autoComplete="tel"
                      placeholder="+7 999 123-45-67"
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={telegramOperatorEditor.active}
                      onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, active: event.target.checked }))}
                    />
                    <span>Активен</span>
                  </label>
                </div>

                <p className="meta-line">
                  После сохранения оператор проходит привязку в боте через кнопку "Поделиться контактом".
                </p>
                {telegramOperatorSaveError ? <p className="error-text">{telegramOperatorSaveError}</p> : null}

                <div className="form-actions">
                  <button className="primary-button primary-button--inline" type="submit" disabled={telegramOperatorSaveStatus === 'loading'}>
                    {telegramOperatorSaveStatus === 'loading'
                      ? 'Сохраняем...'
                      : telegramOperatorEditor.id
                        ? 'Сохранить доступ'
                        : 'Добавить в список'}
                  </button>
                  <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramOperatorEditor}>
                    Сбросить форму
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>

        <div className="manager-layout manager-layout--stacked manager-layout--spaced ops-management-grid">
          <aside className="entity-list">
            {staffAccountsStatus === 'forbidden' ? (
              <article className="entity-card entity-card--muted ops-surface__card">
                <p className="entity-kicker">Учётные записи</p>
                <h3>Только для admin</h3>
                <p className="meta-line">{staffAccountsError || 'У вас нет доступа к управлению учётными записями.'}</p>
              </article>
            ) : (
              staffAccounts.map((account) => (
                <article
                  className={[
                    'entity-card',
                    'ops-surface__card',
                    staffAccountEditor.id === account.id ? 'entity-card--active' : '',
                  ].filter(Boolean).join(' ')}
                  key={account.id}
                >
                  <div className="entity-card__head">
                    <div>
                      <p className="entity-kicker">Master staff account</p>
                      <h3>{account.name}</h3>
                    </div>
                    <span className={account.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                      {account.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{account.login}</span>
                    <span className="chip">{account.role === 'admin' ? 'admin' : 'nomad'}</span>
                  </div>
                  <div className="entity-card__actions entity-card__actions--wrap">
                    <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectStaffAccount(account)}>
                      Редактировать
                    </button>
                    <button
                      className="secondary-button secondary-button--inline"
                      type="button"
                      onClick={() => void onToggleStaffAccountActive(account)}
                      disabled={staffAccountToggleId === account.id}
                    >
                      {staffAccountToggleId === account.id ? 'Сохраняем...' : account.active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      className="secondary-button secondary-button--inline secondary-button--danger"
                      type="button"
                      onClick={() => void onDeleteStaffAccount(account)}
                      disabled={staffAccountToggleId === account.id}
                    >
                      {staffAccountToggleId === account.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </article>
              ))
            )}

            {staffAccountsStatus !== 'forbidden' && !staffAccounts.length && staffAccountsStatus !== 'loading' ? (
              <p className="meta-line">Пока нет сотрудников.</p>
            ) : null}
          </aside>

          <article className="editor-card ops-editor">
            <div className="entity-card__head">
              <div>
                <p className="entity-kicker">{staffAccountEditor.id ? 'Редактирование сотрудника' : 'Новый сотрудник'}</p>
                <h3>{staffAccountEditor.id ? staffAccountEditor.name || 'Без имени' : 'Создать сотрудника'}</h3>
              </div>
              <span className="status-chip">{staffAccountEditor.role === 'admin' ? 'admin' : 'nomad'}</span>
            </div>

            {staffAccountsStatus === 'loading' ? <p className="meta-line">Загружаем сотрудников...</p> : null}
            {staffAccountsStatus === 'error' ? <p className="error-text">{staffAccountsError}</p> : null}
            {staffAccountsStatus === 'forbidden' ? <p className="meta-line">{staffAccountsError}</p> : null}

            {staffAccountsStatus !== 'forbidden' ? (
              <form className="admin-form" onSubmit={onSubmitStaffAccount}>
                <div className="form-grid form-grid--two">
                  <label className="field">
                    <span className="field-label">Логин</span>
                    <input
                      className="text-input"
                      value={staffAccountEditor.login}
                      onChange={(event) => setStaffAccountEditor((current) => ({ ...current, login: event.target.value }))}
                      autoComplete="username"
                      placeholder="nomad"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Имя</span>
                    <input
                      className="text-input"
                      value={staffAccountEditor.name}
                      onChange={(event) => setStaffAccountEditor((current) => ({ ...current, name: event.target.value }))}
                      autoComplete="name"
                      placeholder="Кальянный мастер"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Роль</span>
                    <select
                      className="select-input"
                      value={staffAccountEditor.role}
                      onChange={(event) =>
                        setStaffAccountEditor((current) => ({
                          ...current,
                          role: event.target.value as StaffUser['role'],
                        }))
                      }
                    >
                      <option value="admin">admin</option>
                      <option value="nomad">nomad</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="field-label">Пароль {staffAccountEditor.id ? '(необязательно)' : '(обязательно)'}</span>
                    <input
                      className="text-input"
                      type="password"
                      value={staffAccountEditor.password}
                      onChange={(event) => setStaffAccountEditor((current) => ({ ...current, password: event.target.value }))}
                      autoComplete="new-password"
                      placeholder="Оставьте пустым, если не менять"
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={staffAccountEditor.active}
                      onChange={(event) => setStaffAccountEditor((current) => ({ ...current, active: event.target.checked }))}
                    />
                    <span>Активен</span>
                  </label>
                </div>

                {staffAccountSaveError ? <p className="error-text">{staffAccountSaveError}</p> : null}

                <div className="form-actions">
                  <button className="primary-button primary-button--inline" type="submit" disabled={staffAccountSaveStatus === 'loading'}>
                    {staffAccountSaveStatus === 'loading'
                      ? 'Сохраняем...'
                      : staffAccountEditor.id
                        ? 'Сохранить сотрудника'
                        : 'Создать сотрудника'}
                  </button>
                  <button className="secondary-button secondary-button--inline" type="button" onClick={onResetStaffAccountEditor}>
                    Сбросить форму
                  </button>
                  {staffAccountEditor.id ? (
                    <button
                      className="secondary-button secondary-button--inline secondary-button--danger"
                      type="button"
                      onClick={() =>
                        void onDeleteStaffAccount({
                          id: staffAccountEditor.id,
                          login: staffAccountEditor.login,
                          name: staffAccountEditor.name,
                          role: staffAccountEditor.role,
                          active: staffAccountEditor.active,
                        })
                      }
                      disabled={staffAccountToggleId === staffAccountEditor.id}
                    >
                      {staffAccountToggleId === staffAccountEditor.id ? 'Удаляем...' : 'Удалить сотрудника'}
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="forbidden-panel">
                <p className="meta-line">Staff accounts недоступны для вашей роли.</p>
              </div>
            )}
          </article>
        </div>

        <article className="editor-card ops-table-shell">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">Журнал изменений</p>
              <h3>Последние staff-операции</h3>
            </div>
            <span className="status-chip">/staff/audit/events</span>
          </div>

          {auditEventsStatus === 'loading' ? <p className="meta-line">Загружаем журнал изменений...</p> : null}
          {auditEventsStatus === 'error' ? <p className="error-text">{auditEventsError}</p> : null}
          {auditEventsStatus === 'forbidden' ? <p className="meta-line">{auditEventsError}</p> : null}

          {auditEventsStatus === 'ready' && !auditEvents.length ? (
            <p className="meta-line">Пока нет записей аудита.</p>
          ) : null}

          {auditEventsStatus !== 'forbidden' && auditEvents.length ? (
            <div className="audit-list">
              {auditEvents.map((event) => (
                <article className="entity-card entity-card--compact ops-surface__card" key={event.id}>
                  <div className="entity-card__head">
                    <div>
                      <p className="entity-kicker">
                        {formatAuditEntityType(event.entityType)} · {formatAuditAction(event.action)}
                      </p>
                      <h3>{event.entityLabel || event.entityId}</h3>
                    </div>
                    <span className="status-chip">{event.actorRole}</span>
                  </div>
                  <p className="meta-line">
                    {event.actorName || event.actorLogin} ({event.actorLogin}) · {formatDateTimeDisplay(event.createdAt)}
                  </p>
                  <div className="chip-row">
                    <span className="chip">{event.entityType}</span>
                    <span className="chip">{event.action}</span>
                    <span className="chip">{event.entityId}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    );
  };

  const renderActiveWorkspace = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'inventory':
        return renderInventory();
      case 'mixes':
        return renderMixes();
      case 'rails':
        return renderRails();
      case 'access':
        return renderAccess();
      default:
        return null;
    }
  };

  if (user) {
    const activeWorkspace = workspaceTabs.find((tab) => tab.id === activeTab) ?? workspaceTabs[0];
    const activeWorkspaceStatus = (() => {
      switch (activeTab) {
        case 'dashboard':
          return formatLoadStatus(summaryStatus);
        case 'inventory':
          return formatLoadStatus(inventoryStatus);
        case 'mixes':
          return formatLoadStatus(mixesStatus);
        case 'rails':
          return formatLoadStatus(railsStatus);
        case 'access':
          return telegramAutomationStateStatus === 'error' || dailyCodesStatus === 'error'
            ? 'Есть ошибка'
            : telegramAutomationStateStatus === 'loading' || dailyCodesStatus === 'loading'
              ? 'Обновляем'
              : 'Данные готовы';
        default:
          return 'Ожидает загрузки';
      }
    })();
    return (
      <main className="shell shell--master shell--master-workspace">
        <header className="master-topbar">
          <div className="master-topbar__brand">
            <p className="eyebrow">Premium Editorial Backoffice</p>
            <h1>Nomad Master</h1>
            <p className="meta-line">
              Операторский shell с верхней навигацией для широких таблиц, плотных CRUD-поверхностей и быстрого
              переключения между модулями.
            </p>
          </div>

          <div className="master-topbar__meta">
            <div className="master-topbar__identity">
              <strong>{user.name}</strong>
              <span>{formatRoleLabel(user.role)}</span>
            </div>
            <span className="status-chip status-chip--inverse">API online</span>
            <span className="status-chip">Статус: {activeWorkspaceStatus}</span>
            <button className="secondary-button secondary-button--inline secondary-button--shell" type="button" onClick={onSignOut}>
              <LogOut size={15} strokeWidth={1.8} />
              <span>Выйти</span>
            </button>
          </div>
        </header>

        <nav className="master-nav master-nav--workspace" aria-label="Рабочие разделы Мастера">
          <div className="workspace-tabs workspace-tabs--workspace-bar" role="tablist" aria-label="Рабочие разделы Мастера">
            {workspaceTabs.map((tab) => {
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  id={getWorkspaceTabId(tab.id)}
                  ref={(node) => {
                    workspaceTabRefs.current[tab.id] = node;
                  }}
                  type="button"
                  className={activeTab === tab.id ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={getWorkspacePanelId(tab.id)}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => onWorkspaceTabKeyDown(event, tab.id)}
                >
                  <span className="workspace-tab__head">
                    <span className="workspace-tab__icon" aria-hidden="true">
                      <TabIcon size={15} strokeWidth={1.9} />
                    </span>
                    <span className="workspace-tab__copy">
                      <strong>{tab.label}</strong>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="master-stage">
          <header className="master-stage__header">
            <div className="master-stage__copy">
              <p className="eyebrow">{activeWorkspace.kicker}</p>
              <h2>{activeWorkspace.label}</h2>
              <p className="meta-line">{activeWorkspace.detail}</p>
            </div>
            <div className="master-stage__status">
              <span className="status-chip">Роль: {formatRoleLabel(user.role)}</span>
              <span className="status-chip">Контур: {apiHostLabel}</span>
            </div>
          </header>

          {activeTab === 'dashboard' ? (
            <section className="master-summary-strip" aria-label="Ключевые метрики смены">
              {readSummaryCards(summary).map((card) => (
                <Card
                  key={card.label}
                  size="sm"
                  className="master-summary-card rounded-[1.45rem] border-white/8 bg-[linear-gradient(180deg,rgba(21,18,20,0.94),rgba(29,24,26,0.9))] shadow-[0_22px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                >
                  <CardContent className="space-y-1.5 pt-2.5">
                    <div className="master-summary-card__label text-[10px] uppercase tracking-[0.18em] text-white/44">{card.label}</div>
                    <div className="master-summary-card__value text-2xl font-semibold tracking-[-0.04em] text-[var(--nomad-ink)]">
                      {formatMetricValue(card.value)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          <div
            className="master-stage__panel"
            id={getWorkspacePanelId(activeTab)}
            role="tabpanel"
            aria-labelledby={getWorkspaceTabId(activeTab)}
          >
            {renderActiveWorkspace()}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--master shell--master-login">
      <section className="hero hero--master auth-hero">
        <div className="auth-hero__copy">
          <p className="eyebrow">Nomad Master</p>
          <h1>Вход для персонала</h1>
          <p className="lead">
            Операционная консоль для кальянных мастеров и администратора. После входа доступны дашборд смены,
            инвентаризация, миксы, рейлы и контроль Telegram-доступа.
          </p>
          <div className="hero-meta">
            <span className="status-chip status-chip--inverse">Сводка смены</span>
            <span className="status-chip status-chip--inverse">Инвентарь и витрина</span>
            <span className="status-chip status-chip--inverse">Telegram и staff-доступ</span>
          </div>
        </div>

        <div className="auth-hero__rail">
          <article className="auth-panel">
            <span className="master-runtime-card__label">Что внутри</span>
            <strong>Одна консоль вместо разрозненных операционных экранов</strong>
            <p>Маршрут работы собран по приоритету: сначала сигналы, затем действие, затем верификация состояния.</p>
          </article>
          <article className="auth-panel auth-panel--muted">
            <span className="master-runtime-card__label">Среда</span>
            <strong>{apiBaseUrl}</strong>
            <p>Используйте учётные данные `admin` или `nomad`. Токен хранится локально в `sessionStorage`.</p>
          </article>
        </div>
      </section>

      <section className="card auth-card">
        <div className="auth-card__head">
          <div>
            <p className="eyebrow">Авторизация</p>
            <h2>Войти в рабочую смену</h2>
          </div>
          <span className="status-chip">Локальная среда</span>
        </div>

        <form className="guest-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Логин</span>
            <input
              className="text-input"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span className="field-label">Пароль</span>
            <input
              className="text-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              type="password"
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
};
