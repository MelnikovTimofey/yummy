import { FormEvent, useEffect, useRef, useState } from 'react';
import { AccessView } from '@/components/access/access-view';
import { apiBaseUrl, apiHostLabel, envLabel, requestJson } from '@/lib/api-client';
import { replaceOrInsert } from '@/lib/utils';
import { useAuditEvents } from '@/hooks/use-audit-events';
import { useDailyCode } from '@/hooks/use-daily-code';
import { useStaffAccounts } from '@/hooks/use-staff-accounts';
import { useTelegramOperators } from '@/hooks/use-telegram-operators';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { InventoryView, type InventoryEditorInput } from '@/components/inventory/inventory-view';
import { MixCatalogView, type MixCatalogMode, type MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';
import { MixBuilder } from '@/components/mixes/mix-builder/mix-builder';
import { rebalanceTo100 } from '@/components/mixes/mix-builder/rebalance';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { RailEditor, type RailEditorState } from '@/components/rails/rail-editor';
import { RailsView } from '@/components/rails/rails-view';
import { MasterTopBar, type MasterTopBarStatusTone } from '@/components/shell/topbar';
import {
  getWorkspacePanelId,
  getWorkspaceTabId,
  workspaceTabs,
  type WorkspaceTab,
} from '@/components/shell/workspace-tabs';
import { useCmdK } from '@/hooks/use-cmdk';
import { useDensity } from '@/hooks/use-density';
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
  buildInventoryRequestQuery,
  buildMixRequestQuery,
  formatDateTimeLocalInput,
  formatAuditAction,
  formatAuditEntityType,
  formatMetricValue,
  formatRailType,
  formatTelegramAutomationHealth,
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
  parseDateTimeLocalInput,
  readEntityPayload,
  readListPayload,
  sortDailyAccessCodes,
  sortMixes,
  sortRails,
  sortStaffAccounts,
  sortTelegramOperators,
  toggleInventoryFilterValue,
  toggleMixFilterValue,
  defaultInventoryListResponse,
  defaultMixListResponse,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';

type MixEditorState = {
  id: string;
  name: string;
  description: string;
  components: MixEditorComponentInput[];
  available: boolean;
  railMemberships: MixRailMembership[];
};

type MixesScreenMode = MixCatalogMode;

// RailEditorState переехал в components/rails/rail-editor


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



const parseNumberInput = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const [user, setUser] = useState<StaffUser | null>(null);
  const cmdK = useCmdK(user !== null);
  const { density, setDensity } = useDensity();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');

  const onAfterAccessSubmit = () => setActiveTab('access');
  const auditEventsState = useAuditEvents();
  const dailyCode = useDailyCode();
  const staff = useStaffAccounts({ onAfterSubmit: onAfterAccessSubmit });
  const telegramOps = useTelegramOperators({ onAfterSubmit: onAfterAccessSubmit });
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
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixesStatus, setMixesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railsStatus, setRailsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [mixesError, setMixesError] = useState('');
  const [railsError, setRailsError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [inventoryBatchAction, setInventoryBatchAction] = useState<'' | InventoryBatchAction>('');
  const [inventorySaveStatus, setInventorySaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventorySaveError, setInventorySaveError] = useState('');
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixesScreen, setMixesScreen] = useState<MixesScreenMode>('catalog');
  const [mixSaveStatus, setMixSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
  const [railMixCandidateId, setRailMixCandidateId] = useState('');
  const [railSaveStatus, setRailSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railSaveError, setRailSaveError] = useState('');
  const [railEditorSheetOpen, setRailEditorSheetOpen] = useState(false);

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




  const hashSkipRef = useRef(false);

  useEffect(() => {
    if (!user) {
      document.title = 'Nomad Master — вход';
      return;
    }
    const tab = workspaceTabs.find((item) => item.id === activeTab) ?? workspaceTabs[0];
    document.title = `${tab.label} — Nomad Master`;
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;
    const slug = window.location.hash.replace(/^#/, '');
    if (slug === activeTab) return;
    if (hashSkipRef.current) {
      hashSkipRef.current = false;
      return;
    }
    window.history.pushState(null, '', `#${activeTab}`);
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;
    const slug = window.location.hash.replace(/^#/, '');
    if (workspaceTabs.some((item) => item.id === slug) && slug !== activeTab) {
      hashSkipRef.current = true;
      setActiveTab(slug as WorkspaceTab);
    }
    const onPop = () => {
      const next = window.location.hash.replace(/^#/, '');
      if (workspaceTabs.some((item) => item.id === next)) {
        hashSkipRef.current = true;
        setActiveTab(next as WorkspaceTab);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
          dailyCode.reload(token),
          staff.reload(token, profile.user.role),
          telegramOps.reload(token, profile.user.role),
          auditEventsState.reload(token, profile.user.role),
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
        dailyCode.reload(auth.accessToken),
        staff.reload(auth.accessToken, profile.user.role),
        telegramOps.reload(auth.accessToken, profile.user.role),
        auditEventsState.reload(auth.accessToken, profile.user.role),
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
    dailyCode.reset();
    staff.reset();
    telegramOps.reset();
    auditEventsState.reset();
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
    setInventoryError('');
    setSummaryError('');
    setMixesError('');
    setRailsError('');
    setToggleId('');
    setInventoryBatchAction('');
    setMixEditor(emptyMixEditor());
    setMixSaveStatus('idle');
    setMixSaveError('');
    setRailEditor(emptyRailEditor());
    setRailMixCandidateId('');
    setRailSaveStatus('idle');
    setRailSaveError('');
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

  const onResetInventorySaveFeedback = () => {
    setInventorySaveStatus('idle');
    setInventorySaveError('');
  };

  const onSaveTobacco = async (payload: InventoryEditorInput) => {
    if (!token) {
      return;
    }

    const manufacturer = payload.manufacturer.trim();
    const name = payload.name.trim();

    if (!manufacturer) {
      setInventorySaveError('Укажите производителя');
      setInventorySaveStatus('error');
      return;
    }

    if (!name) {
      setInventorySaveError('Укажите название табака');
      setInventorySaveStatus('error');
      return;
    }

    setInventorySaveStatus('loading');
    setInventorySaveError('');

    try {
      await requestJson<unknown>(
        payload.id ? `/staff/inventory/tobaccos/${payload.id}` : '/staff/inventory/tobaccos',
        {
          method: payload.id ? 'PATCH' : 'POST',
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
      setInventorySaveStatus('ready');
    } catch (cause) {
      setInventorySaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить табак');
      setInventorySaveStatus('error');
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

  // MixBuilder добавляет компонент по конкретному tobaccoId и сразу
  // ребалансирует доли так, чтобы сумма = 100%.
  const onAddMixComponentById = (tobaccoId: string) => {
    if (!tobaccoId) return;
    setMixEditor((current) => {
      if (current.components.some((component) => component.tobaccoId === tobaccoId)) {
        return current;
      }
      const next = [...current.components, createMixEditorComponent(tobaccoId, '')];
      return { ...current, components: rebalanceTo100(next) };
    });
  };

  // ProportionBar drag-resize меняет весь массив компонентов разом —
  // даём отдельный setter, который принимает уже посчитанный список.
  const onReplaceMixComponents = (components: MixEditorComponentInput[]) => {
    setMixEditor((current) => ({ ...current, components }));
  };

  // MixBuilder remove: ребалансируем после удаления так же, как в прототипе.
  const onRemoveMixComponentRebalanced = (key: string) => {
    setMixEditor((current) => ({
      ...current,
      components: rebalanceTo100(current.components.filter((component) => component.key !== key)),
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
      setRailEditorSheetOpen(false);
    } catch (cause) {
      setRailSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить рейл');
      setRailSaveStatus('error');
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
      catalogOptions={mixTobaccos}
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
      saveStatus={inventorySaveStatus}
      saveError={inventorySaveError}
      onSaveTobacco={onSaveTobacco}
      onResetSaveFeedback={onResetInventorySaveFeedback}
    />
  );

  const renderMixes = () => {
    if (mixesScreen === 'edit' || mixesScreen === 'create') {
      return (
        <MixBuilder
          mode={mixesScreen}
          editor={mixEditor}
          tobaccos={mixTobaccos}
          mixes={mixes}
          saveStatus={mixSaveStatus}
          saveError={mixSaveError}
          onFieldChange={onChangeMixEditorField}
          onAvailabilityChange={onChangeMixEditorAvailability}
          onAddComponent={onAddMixComponentById}
          onUpdateComponent={onUpdateMixComponent}
          onRemoveComponent={onRemoveMixComponentRebalanced}
          onReplaceComponents={onReplaceMixComponents}
          onSubmit={onSubmitMix}
          onCancel={mixesScreen === 'create' ? onCancelCreateMix : onResetMixEditor}
        />
      );
    }

    return (
      <MixCatalogView
        mode="catalog"
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
  };

  const renderRails = () => (
    <>
      <RailsView
        rails={rails}
        railMixCatalog={railMixCatalog}
        railsStatus={railsStatus}
        railsError={railsError}
        activeEditorId={railEditor.id}
        onCreateRail={() => {
          onResetRailEditor();
          setRailEditorSheetOpen(true);
        }}
        onOpenRail={(rail) => {
          onSelectRail(rail);
          setRailEditorSheetOpen(true);
        }}
      />
      <RailEditor
        open={railEditorSheetOpen}
        onOpenChange={setRailEditorSheetOpen}
        editor={railEditor}
        setEditor={setRailEditor}
        railMixCatalog={railMixCatalog}
        mixes={mixes}
        railMixCandidateId={railMixCandidateId}
        setRailMixCandidateId={setRailMixCandidateId}
        saveStatus={railSaveStatus}
        saveError={railSaveError}
        onSubmit={onSubmitRail}
        onAddMix={onAddRailMix}
        onRemoveMix={onRemoveRailMix}
        onMoveMix={onMoveRailMix}
        onReset={onResetRailEditor}
      />
    </>
  );

  const renderAccess = () => {
    if (!token) {
      return null;
    }
    return (
      <AccessView
        user={user}
        dailyCodes={dailyCode.dailyCodes}
        dailyCodesStatus={dailyCode.status}
        dailyCodesError={dailyCode.error}
        telegramAutomationState={telegramOps.automationState}
        telegramAutomationStateStatus={telegramOps.automationStatus}
        telegramAutomationStateError={telegramOps.automationError}
        telegramOperators={telegramOps.operators}
        telegramOperatorsStatus={telegramOps.status}
        telegramOperatorsError={telegramOps.error}
        telegramOperatorEditor={telegramOps.editor}
        telegramOperatorSaveStatus={telegramOps.saveStatus}
        telegramOperatorSaveError={telegramOps.saveError}
        telegramOperatorToggleId={telegramOps.toggleId}
        telegramOperatorDialogOpen={telegramOps.dialogOpen}
        setTelegramOperatorDialogOpen={telegramOps.setDialogOpen}
        setTelegramOperatorEditor={telegramOps.setEditor}
        onSelectTelegramOperator={telegramOps.onSelect}
        onResetTelegramOperatorEditor={telegramOps.onReset}
        onSubmitTelegramOperator={(event) => telegramOps.onSubmit(event, token)}
        onToggleTelegramOperatorActive={(operator) => telegramOps.onToggleActive(operator, token)}
        onClearTelegramOperatorLink={(operator) => telegramOps.onClearLink(operator, token)}
        onDeleteTelegramOperator={(operator) => telegramOps.onDelete(operator, token)}
        staffAccounts={staff.staffAccounts}
        staffAccountsStatus={staff.status}
        staffAccountsError={staff.error}
        staffAccountEditor={staff.editor}
        staffAccountSaveStatus={staff.saveStatus}
        staffAccountSaveError={staff.saveError}
        staffAccountToggleId={staff.toggleId}
        setStaffAccountEditor={staff.setEditor}
        onSelectStaffAccount={staff.onSelect}
        onResetStaffAccountEditor={staff.onReset}
        onSubmitStaffAccount={(event) => staff.onSubmit(event, token)}
        onToggleStaffAccountActive={(account) => staff.onToggleActive(account, token)}
        onDeleteStaffAccount={(account) => staff.onDelete(account, token)}
        auditEvents={auditEventsState.auditEvents}
        auditEventsStatus={auditEventsState.status}
        auditEventsError={auditEventsState.error}
      />
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
          return telegramOps.automationStatus === 'error' || dailyCode.status === 'error'
            ? 'Есть ошибка'
            : telegramOps.automationStatus === 'loading' || dailyCode.status === 'loading'
              ? 'Обновляем'
              : 'Данные готовы';
        default:
          return 'Ожидает загрузки';
      }
    })();
    const activeWorkspaceStatusTone: MasterTopBarStatusTone = (() => {
      const text = activeWorkspaceStatus;
      if (text.includes('ошибка') || text.includes('Ошибка')) return 'error';
      if (text.includes('Обновляем') || text.includes('Загрузка') || text.includes('Ожидает')) return 'loading';
      return 'ready';
    })();

    const commandPaletteItems: CommandPaletteItem[] = [
      ...workspaceTabs.map((tab) => ({
        id: `nav:${tab.id}`,
        label: `Перейти: ${tab.label}`,
        group: 'Навигация',
        hint: tab.kicker,
        icon: tab.icon,
        keywords: `${tab.label} ${tab.kicker}`,
        onSelect: () => setActiveTab(tab.id),
      })),
      {
        id: 'action:new-mix',
        label: 'Новый микс',
        group: 'Действия',
        keywords: 'создать новый микс mix',
        onSelect: () => onStartCreateMix(),
      },
      {
        id: 'action:sign-out',
        label: 'Выйти',
        group: 'Действия',
        keywords: 'logout sign out выйти',
        onSelect: () => onSignOut(),
      },
      ...mixes.map((mix) => ({
        id: `mix:${mix.id}`,
        label: mix.name,
        group: 'Открыть микс',
        hint: 'микс',
        keywords: `${mix.name} ${mix.description ?? ''}`,
        searchOnly: true,
        onSelect: () => onSelectMix(mix),
      })),
      ...rails.map((rail) => ({
        id: `rail:${rail.id}`,
        label: rail.name,
        group: 'Открыть рейл',
        hint: 'рейл',
        keywords: `${rail.name} ${rail.description ?? ''}`,
        searchOnly: true,
        onSelect: () => {
          onSelectRail(rail);
          setRailEditorSheetOpen(true);
        },
      })),
      ...inventory.map((tobacco) => ({
        id: `tobacco:${tobacco.id}`,
        label: tobacco.name,
        group: 'Открыть табак',
        hint: tobacco.manufacturer || 'табак',
        keywords: `${tobacco.name} ${tobacco.manufacturer}`,
        searchOnly: true,
        onSelect: () => setActiveTab('inventory'),
      })),
    ];

    return (
      <main className="shell shell--master shell--master-workspace" id="main-content">
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>

        <MasterTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userName={user.name}
          userRoleLabel={formatRoleLabel(user.role)}
          statusText={activeWorkspaceStatus}
          statusTone={activeWorkspaceStatusTone}
          onSignOut={onSignOut}
          density={density}
          onDensityChange={setDensity}
        />

        <section className="master-stage">
          <header className="master-stage__header master-stage__header--compact">
            <div className="master-stage__copy">
              <h1>{activeWorkspace.label}</h1>
            </div>
            <div className="master-stage__status">
              <span className="status-chip" title={`API: ${apiHostLabel}`}>
                <span className={`status-dot status-dot--${activeWorkspaceStatusTone}`} aria-hidden="true" />
                {envLabel}
              </span>
            </div>
          </header>


          <div
            className="master-stage__panel"
            id={getWorkspacePanelId(activeTab)}
            role="tabpanel"
            aria-labelledby={getWorkspaceTabId(activeTab)}
          >
            {renderActiveWorkspace()}
          </div>
        </section>

        <CommandPalette open={cmdK.open} onOpenChange={cmdK.setOpen} items={commandPaletteItems} />
      </main>
    );
  }

  return (
    <main className="shell shell--master shell--master-login" id="main-content">
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
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
