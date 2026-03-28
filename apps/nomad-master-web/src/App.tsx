import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { InventoryView } from '@/components/inventory/inventory-view';
import { MixCatalogView, type MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';
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

type WorkspaceTab = 'dashboard' | 'inventory' | 'mixes' | 'rails' | 'access';

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; kicker: string }> = [
  { id: 'dashboard', label: 'Дашборд', kicker: 'Сводка' },
  { id: 'inventory', label: 'Инвентаризация', kicker: 'Наличие' },
  { id: 'mixes', label: 'Миксы', kicker: 'Каталог' },
  { id: 'rails', label: 'Рейлы', kicker: 'Витрина' },
  { id: 'access', label: 'Доступ', kicker: 'Бот и allowlist' },
];

type MixEditorState = {
  id: string;
  name: string;
  description: string;
  components: MixEditorComponentInput[];
  avgRating: string;
  popularity: string;
  available: boolean;
  railMemberships: MixRailMembership[];
};

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
  avgRating: '0',
  popularity: '0',
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
  avgRating: String(mix.avgRating),
  popularity: String(mix.popularity),
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

const normalizeRailMixSearch = (value: string) => value.trim().toLowerCase();

const formatWorkspaceTab = (value: WorkspaceTab) => workspaceTabs.find((item) => item.id === value)?.label ?? value;

const formatRoleLabel = (role: StaffUser['role']) => (role === 'admin' ? 'admin' : 'nomad');

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
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
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixSaveStatus, setMixSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
  const [railMixSearch, setRailMixSearch] = useState('');
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

  const loadInventory = async (
    nextToken: string,
    nextFilters: InventoryListFilters = inventoryFilters,
    nextSort: InventoryListSort = inventorySort,
  ) => {
    setInventoryStatus('loading');
    setInventoryError('');

    try {
      const query = buildInventoryRequestQuery(nextFilters, nextSort);
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
  ) => {
    setMixesStatus('loading');
    setMixesError('');

    try {
      const query = buildMixRequestQuery(nextFilters, nextSort);
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
  ) => {
    if (!token) {
      return;
    }

    await loadInventory(token, nextFilters, nextSort);
  };

  const onInventorySearchChange = async (value: string) => {
    const nextFilters = {
      ...inventoryFilters,
      search: value,
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort);
  };

  const onInventoryStockChange = async (value: InventoryListFilters['stock']) => {
    const nextFilters = {
      ...inventoryFilters,
      stock: value,
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort);
  };

  const onInventorySortFieldChange = async (field: InventoryListSort['field']) => {
    const nextSort = {
      ...inventorySort,
      field,
    };
    setInventorySort(nextSort);
    await refreshInventorySurface(inventoryFilters, nextSort);
  };

  const onInventorySortDirectionChange = async (direction: InventoryListSort['direction']) => {
    const nextSort = {
      ...inventorySort,
      direction,
    };
    setInventorySort(nextSort);
    await refreshInventorySurface(inventoryFilters, nextSort);
  };

  const onInventoryToggleFilterValue = async (key: InventoryFilterKey, value: string) => {
    const nextFilters = {
      ...inventoryFilters,
      [key]: toggleInventoryFilterValue(inventoryFilters[key], value),
    };
    setInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySort);
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
    await refreshInventorySurface(nextFilters, nextSort);
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
      await Promise.all([
        loadInventory(token, inventoryFilters, inventorySort),
        loadSummary(token, dashboardWindow),
        loadMixes(token),
        loadMixTobaccos(token),
        loadRailMixCatalog(token),
      ]);
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
      await Promise.all([
        loadInventory(token, inventoryFilters, inventorySort),
        loadSummary(token, dashboardWindow),
        loadMixes(token),
        loadMixTobaccos(token),
        loadRailMixCatalog(token),
      ]);
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось выполнить batch действие');
      setInventoryStatus('error');
    } finally {
      setInventoryBatchAction('');
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
    setMixSaveError('');
    setMixSaveStatus('idle');
    setActiveTab('mixes');
  };

  const onResetMixEditor = () => {
    setMixEditor(emptyMixEditor());
    setMixSaveError('');
    setMixSaveStatus('idle');
  };

  const refreshMixesSurface = async (
    nextFilters: MixListFilters = mixesFilters,
    nextSort: MixListSort = mixesSort,
  ) => {
    if (!token) {
      return;
    }

    await loadMixes(token, nextFilters, nextSort);
  };

  const onMixSearchChange = async (value: string) => {
    const nextFilters = {
      ...mixesFilters,
      search: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort);
  };

  const onMixStatusChange = async (value: MixStatusFilter) => {
    const nextFilters = {
      ...mixesFilters,
      status: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort);
  };

  const onMixRailStateChange = async (value: MixRailFilter) => {
    const nextFilters = {
      ...mixesFilters,
      railState: value,
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort);
  };

  const onMixSortFieldChange = async (field: MixSortField) => {
    const nextSort = {
      ...mixesSort,
      field,
    };
    setMixesSort(nextSort);
    await refreshMixesSurface(mixesFilters, nextSort);
  };

  const onMixSortDirectionChange = async (direction: MixSortDirection) => {
    const nextSort = {
      ...mixesSort,
      direction,
    };
    setMixesSort(nextSort);
    await refreshMixesSurface(mixesFilters, nextSort);
  };

  const onMixToggleFilterValue = async (key: MixFilterKey, value: string) => {
    const nextFilters = {
      ...mixesFilters,
      [key]: toggleMixFilterValue(mixesFilters[key], value),
    };
    setMixesFilters(nextFilters);
    await refreshMixesSurface(nextFilters, mixesSort);
  };

  const onMixResetFilters = async () => {
    const nextFilters = {
      ...defaultMixListResponse.filters,
      options: mixesFilters.options,
    };
    const nextSort = defaultMixListResponse.sort;
    setMixesFilters(nextFilters);
    setMixesSort(nextSort);
    await refreshMixesSurface(nextFilters, nextSort);
  };

  const onChangeMixEditorField = (field: 'name' | 'description' | 'avgRating' | 'popularity', value: string) => {
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
      avgRating: parseNumberInput(mixEditor.avgRating, 0),
      popularity: parseNumberInput(mixEditor.popularity, 0),
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
    setRailMixSearch('');
    setRailMixCandidateId('');
    setRailSaveError('');
    setRailSaveStatus('idle');
    setActiveTab('rails');
  };

  const onResetRailEditor = () => {
    setRailEditor(emptyRailEditor());
    setRailMixSearch('');
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
      onSearchChange={(value) => void onInventorySearchChange(value)}
      onStockChange={(value) => void onInventoryStockChange(value)}
      onSortFieldChange={(value) => void onInventorySortFieldChange(value)}
      onSortDirectionChange={(value) => void onInventorySortDirectionChange(value)}
      onToggleFilterValue={(key, value) => void onInventoryToggleFilterValue(key, value)}
      onResetFilters={() => void onInventoryResetFilters()}
      onToggleSelection={onToggleInventorySelection}
      onToggleSelectAll={onToggleSelectAllInventory}
      onToggleStock={(item) => void onToggleStock(item)}
      onRunBatchAction={(action) => void onRunInventoryBatch(action)}
      onOpenMix={onOpenInventoryMix}
    />
  );

  const renderMixes = () => (
    <MixCatalogView
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
      onSearchChange={(value) => void onMixSearchChange(value)}
      onStatusChange={(value) => void onMixStatusChange(value)}
      onRailStateChange={(value) => void onMixRailStateChange(value)}
      onSortFieldChange={(value) => void onMixSortFieldChange(value)}
      onSortDirectionChange={(value) => void onMixSortDirectionChange(value)}
      onToggleFilterValue={(key, value) => void onMixToggleFilterValue(key, value)}
      onResetFilters={() => void onMixResetFilters()}
      onSelectMix={onSelectMix}
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

  const normalizedRailMixSearch = normalizeRailMixSearch(railMixSearch);
  const selectedRailMixEntries = railEditor.mixIds.map((mixId, index) => ({
    mixId,
    index,
    mix: railMixCatalog.find((item) => item.id === mixId) ?? mixes.find((item) => item.id === mixId) ?? null,
  }));
  const availableRailMixOptions = railMixCatalog
    .filter((mix) => {
      if (railEditor.mixIds.includes(mix.id)) {
        return false;
      }

      if (!normalizedRailMixSearch) {
        return true;
      }

      return [
        mix.name,
        mix.description,
        ...mix.flavorProfiles,
        ...mix.flavors,
        ...mix.flavorTags,
      ].some((value) => normalizeRailMixSearch(value).includes(normalizedRailMixSearch));
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  const effectiveRailMixCandidateId = availableRailMixOptions.some((mix) => mix.id === railMixCandidateId)
    ? railMixCandidateId
    : (availableRailMixOptions[0]?.id ?? '');
  const railEditorLocked = Boolean(railEditor.id) && !railEditor.editable;
  const railEditorStatusLabel = railEditorLocked
    ? 'Только просмотр'
    : railEditor.active
      ? 'Активен'
      : 'Неактивен';

  const renderRails = () => (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Менеджер рейлов</p>
          <h2>Рейлы Nomad</h2>
          <p className="meta-line">Управление витринами для гостя: статистика, заготовки и авторские подборки.</p>
        </div>
        <div className="section-actions">
          <span className="status-chip">Витрина гостя</span>
          <button className="secondary-button secondary-button--inline" type="button" onClick={onResetRailEditor}>
            Новый рейл
          </button>
        </div>
      </div>

      {railsStatus === 'loading' ? <p className="meta-line">Загружаем рейлы...</p> : null}
      {railsError ? <p className="error-text">{railsError}</p> : null}

      <div className="manager-layout">
        <aside className="entity-list">
          {rails.map((rail) => (
            <article
              className={[
                'entity-card',
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

        <article className="editor-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">{railEditor.id ? 'Редактирование рейла' : 'Новый рейл'}</p>
              <h3>{railEditor.id ? railEditor.name || 'Без названия' : 'Создать рейл'}</h3>
            </div>
            <span className={railEditorLocked ? 'status-chip status-chip--locked' : 'status-chip'}>{railEditorStatusLabel}</span>
          </div>

          <form className="admin-form" onSubmit={onSubmitRail}>
            {railEditor.id ? (
              <div className="info-banner">
                Тип рейла: {formatRailType(railEditor.type)}.
                {!railEditor.editable && railEditor.readOnlyReason ? ` ${railEditor.readOnlyReason}` : ''}
              </div>
            ) : (
              <div className="info-banner">
                Новый рейл всегда создаётся как мастерский curated rail. Выбор типа на этапе создания больше не нужен.
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
                  rows={4}
                  disabled={railEditorLocked}
                />
              </label>

              <div className="field field--wide">
                <span className="field-label">Состав рейла</span>
                <div className="rail-mix-builder">
                  <div className="rail-mix-builder__toolbar">
                    <input
                      className="text-input"
                      value={railMixSearch}
                      onChange={(event) => setRailMixSearch(event.target.value)}
                      placeholder="Поиск миксов по названию, вкусу или описанию"
                      disabled={railEditorLocked}
                    />
                    <select
                      className="select-input"
                      value={effectiveRailMixCandidateId}
                      onChange={(event) => setRailMixCandidateId(event.target.value)}
                      disabled={railEditorLocked || !availableRailMixOptions.length}
                    >
                      {availableRailMixOptions.length ? null : <option value="">Нет доступных миксов</option>}
                      {availableRailMixOptions.map((mix) => (
                        <option key={mix.id} value={mix.id}>
                          {mix.name} · {mix.available ? 'виден гостю' : 'скрыт или заблокирован'}
                        </option>
                      ))}
                    </select>
                    <button
                      className="secondary-button secondary-button--inline"
                      type="button"
                      onClick={() => onAddRailMix(effectiveRailMixCandidateId)}
                      disabled={railEditorLocked || !effectiveRailMixCandidateId}
                    >
                      Добавить микс
                    </button>
                  </div>

                  <div className="rail-mix-builder__summary">
                    <span className="meta-line">В рейле: {railEditor.mixIds.length}</span>
                    <span className="meta-line">Доступно для добавления: {availableRailMixOptions.length}</span>
                  </div>

                  <div className="rail-mix-list">
                    {selectedRailMixEntries.length ? selectedRailMixEntries.map(({ mixId, index, mix }) => (
                      <article className="rail-mix-row" key={mixId}>
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
                      <div className="rail-mix-empty">
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

    return (
      <section className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Доступ</p>
            <h2>Daily code и Telegram allowlist</h2>
            <p className="meta-line">
              Daily code выпускается автоматически каждый день, а оператор получает его только через Telegram-бота.
            </p>
          </div>
          <div className="section-actions">
            <span className="status-chip">Bot request flow</span>
            {user?.role === 'admin' ? (
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramOperatorEditor}>
                Новый оператор
              </button>
            ) : null}
          </div>
        </div>

        <div className="info-banner">
          <strong>Новая схема:</strong> оператор впервые пишет боту, делится контактом, бот сверяет номер с allowlist и после
          привязки отдаёт `/code`. Ручной отправки и переотправки из `Мастера` нет.
        </div>

        <div className="summary-grid automation-grid">
          <article className="metric-card automation-card">
            <p className="metric-label">Текущий daily code</p>
            <p className="metric-value metric-value--compact">{currentDailyCode?.codeValue || 'Нет активного кода'}</p>
            <p className="meta-line">Подпись: {currentDailyCode?.codeLabel || 'Не задано'}</p>
            <p className="meta-line">Начало: {formatDateTimeDisplay(currentDailyCode?.startsAt || '')}</p>
            <p className="meta-line">Окончание: {formatDateTimeDisplay(currentDailyCode?.endsAt || '')}</p>
            <p className="meta-line">История окон: {dailyCodes.length}</p>
            {dailyCodesStatus === 'loading' ? <p className="meta-line">Загружаем daily code...</p> : null}
            {dailyCodesError ? <p className="error-text">{dailyCodesError}</p> : null}
          </article>

          <article className="metric-card automation-card">
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

          <article className="metric-card automation-card">
            <p className="metric-label">Последний запрос кода</p>
            <p className="meta-line">Время: {formatDateTimeDisplay(telegramAutomationState?.lastRequestAt ?? '')}</p>
            <p className="meta-line">Оператор: {telegramAutomationState?.lastRequestOperatorName || 'Не было запросов'}</p>
            <p className="meta-line">Телефон: {telegramAutomationState?.lastRequestPhone || 'Не указано'}</p>
            <p className="meta-line">Чат: {telegramAutomationState?.lastRequestChatId || 'Не указан'}</p>
            <p className="meta-line">Код: {telegramAutomationState?.lastRequestCodeValue || currentDailyCode?.codeValue || 'Не указан'}</p>
          </article>

          <article className="metric-card automation-card">
            <p className="metric-label">Allowlist</p>
            <p className="meta-line">Активных номеров: {activeOperators.length}</p>
            <p className="meta-line">Привязанных чатов: {linkedOperatorsCount}</p>
            <p className="meta-line">Ожидают first-link: {Math.max(activeOperators.length - linkedOperatorsCount, 0)}</p>
            <p className="meta-line">Всего записей: {telegramOperators.length}</p>
            {telegramOperatorsStatus === 'loading' ? <p className="meta-line">Загружаем allowlist...</p> : null}
            {telegramOperatorsStatus === 'error' ? <p className="error-text">{telegramOperatorsError}</p> : null}
            {telegramOperatorsStatus === 'forbidden' ? <p className="meta-line">{telegramOperatorsError}</p> : null}
          </article>
        </div>

        <article className="editor-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">Как это работает</p>
              <h3>Bot-request flow</h3>
            </div>
            <span className="status-chip">Автоматический daily code</span>
          </div>
          <div className="audit-list">
            {[
              '1. Admin добавляет оператора в allowlist по имени и телефону.',
              '2. Оператор впервые пишет боту и жмёт "Поделиться контактом".',
              '3. Бот привязывает текущий chat id к allowlist-номеру.',
              '4. После привязки оператор получает актуальный daily code через /code.',
            ].map((item) => (
              <article className="entity-card entity-card--compact" key={item}>
                <p className="meta-line">{item}</p>
              </article>
            ))}
          </div>
        </article>

        <div className="manager-layout manager-layout--stacked manager-layout--spaced">
          <aside className="entity-list">
            {telegramOperatorsStatus === 'forbidden' ? (
              <article className="entity-card entity-card--muted">
                <p className="entity-kicker">Telegram allowlist</p>
                <h3>Только для admin</h3>
                <p className="meta-line">{telegramOperatorsError || 'У вас нет доступа к управлению allowlist.'}</p>
              </article>
            ) : (
              telegramOperators.map((operator) => (
                <article
                  className={telegramOperatorEditor.id === operator.id ? 'entity-card entity-card--active' : 'entity-card'}
                  key={operator.id}
                >
                  <div className="entity-card__head">
                    <div>
                      <p className="entity-kicker">Telegram allowlist</p>
                      <h3>{operator.name}</h3>
                    </div>
                    <span className={operator.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                      {operator.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{operator.phone}</span>
                    <span className="chip">{operator.linkedChatId ? 'Чат привязан' : 'Ждёт first-link'}</span>
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
                        className="secondary-button secondary-button--inline"
                        type="button"
                        onClick={() => void onClearTelegramOperatorLink(operator)}
                        disabled={telegramOperatorToggleId === operator.id}
                      >
                        {telegramOperatorToggleId === operator.id ? 'Сбрасываем...' : 'Сбросить привязку'}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button secondary-button--inline"
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
              <p className="meta-line">Пока нет операторов в allowlist.</p>
            ) : null}
          </aside>

          <article className="editor-card">
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
                      value={telegramOperatorEditor.phone}
                      onChange={(event) => setTelegramOperatorEditor((current) => ({ ...current, phone: event.target.value }))}
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
                  После сохранения оператор сам проходит first-link в боте через кнопку "Поделиться контактом".
                </p>
                {telegramOperatorSaveError ? <p className="error-text">{telegramOperatorSaveError}</p> : null}

                <div className="form-actions">
                  <button className="primary-button primary-button--inline" type="submit" disabled={telegramOperatorSaveStatus === 'loading'}>
                    {telegramOperatorSaveStatus === 'loading'
                      ? 'Сохраняем...'
                      : telegramOperatorEditor.id
                        ? 'Сохранить доступ'
                        : 'Добавить в allowlist'}
                  </button>
                  <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramOperatorEditor}>
                    Сбросить форму
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>

        <div className="manager-layout manager-layout--stacked manager-layout--spaced">
          <aside className="entity-list">
            {staffAccountsStatus === 'forbidden' ? (
              <article className="entity-card entity-card--muted">
                <p className="entity-kicker">Master staff accounts</p>
                <h3>Только для admin</h3>
                <p className="meta-line">{staffAccountsError || 'У вас нет доступа к управлению staff accounts.'}</p>
              </article>
            ) : (
              staffAccounts.map((account) => (
                <article
                  className={staffAccountEditor.id === account.id ? 'entity-card entity-card--active' : 'entity-card'}
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
                      className="secondary-button secondary-button--inline"
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

          <article className="editor-card">
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
                      className="secondary-button secondary-button--inline"
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

        <article className="editor-card">
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
                <article className="entity-card entity-card--compact" key={event.id}>
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

  if (user) {
    return (
      <main className="shell shell--master">
        <section className="hero hero--master">
          <p className="eyebrow">Nomad Master</p>
          <h1>Панель персонала</h1>
          <p className="lead">
            Вы вошли как {user.name} ({user.role}). Здесь обновляются инвентарь, миксы, рейлы, коды доступа и
            сводка по действиям гостей.
          </p>
          <div className="hero-meta">
            <span className="status-chip status-chip--inverse">{formatRoleLabel(user.role)}</span>
            <span className="status-chip status-chip--inverse">{formatWorkspaceTab(activeTab)}</span>
            <span className="status-chip status-chip--inverse">Postgres-backed runtime</span>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1180px] gap-3 md:grid-cols-2 xl:grid-cols-6">
          {readSummaryCards(summary).map((card) => (
            <Card
              key={card.label}
              size="sm"
              className="rounded-[1.55rem] border-white/58 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,249,244,0.7))] shadow-[0_18px_42px_rgba(43,24,21,0.07)] backdrop-blur-lg"
            >
              <CardContent className="space-y-2 pt-3.5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500">{card.label}</div>
                <div className="text-3xl font-semibold tracking-[-0.04em] text-stone-950">{formatMetricValue(card.value)}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="card card--compact">
          <div className="section-head section-head--compact">
            <div>
              <p className="eyebrow">Рабочие разделы</p>
              <h2>Операционный маршрут смены</h2>
            </div>
            <div className="status-chip">Текущий модуль: {formatWorkspaceTab(activeTab)}</div>
          </div>
          <div className="workspace-tabs">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="workspace-tab__kicker">{tab.kicker}</span>
                <strong>{tab.label}</strong>
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'inventory' ? renderInventory() : null}
        {activeTab === 'mixes' ? renderMixes() : null}
        {activeTab === 'rails' ? renderRails() : null}
        {activeTab === 'access' ? renderAccess() : null}

        <section className="card card--compact">
          <button className="secondary-button secondary-button--inline" type="button" onClick={onSignOut}>
            Выйти
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--master">
      <section className="hero hero--master">
        <p className="eyebrow">Nomad Master</p>
        <h1>Вход для персонала</h1>
        <p className="lead">Операционная консоль для кальянных мастеров и администратора Nomad. Используйте учётные данные `admin` или `nomad`.</p>
        <div className="hero-meta">
          <span className="status-chip status-chip--inverse">Инвентаризация</span>
          <span className="status-chip status-chip--inverse">Контент и рейлы</span>
          <span className="status-chip status-chip--inverse">Доступ и Telegram</span>
        </div>
      </section>

      <section className="card">
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

      <section className="card card--compact">
        <div className="status-chip">SessionStorage bearer token</div>
        <p className="meta-line">Локально подключено к {apiBaseUrl}. После входа загрузятся inventory, dashboard, access и контентные менеджеры.</p>
      </section>
    </main>
  );
};
