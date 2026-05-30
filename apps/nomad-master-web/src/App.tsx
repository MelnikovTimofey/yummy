import { FormEvent, useEffect, useRef, useState } from 'react';
import { AccessView } from '@/components/access/access-view';
import { LoginScreen } from '@/components/auth/login-screen';
import { requestJson } from '@/lib/api-client';
import { useDailyCode } from '@/hooks/use-daily-code';
import { useMixes } from '@/hooks/use-mixes';
import { useRails } from '@/hooks/use-rails';
import { useStaffAccounts } from '@/hooks/use-staff-accounts';
import { useTelegramOperators } from '@/hooks/use-telegram-operators';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { InventoryView, type InventoryEditorInput } from '@/components/inventory/inventory-view';
import { MixCatalogView } from '@/components/mixes/mix-catalog-view';
import { MixBuilder } from '@/components/mixes/mix-builder/mix-builder';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { RailEditor } from '@/components/rails/rail-editor';
import { RailsView } from '@/components/rails/rails-view';
import { MasterTopBar } from '@/components/shell/topbar';
import {
  getWorkspacePanelId,
  getWorkspaceTabId,
  workspaceTabs,
  type WorkspaceTab,
} from '@/components/shell/workspace-tabs';
import { useCmdK } from '@/hooks/use-cmdk';
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
  MixRecord,
  RailRecord,
  StaffAccountRecord,
  StaffAuthResponse,
  StaffUser,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
  buildInventoryRequestQuery,
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
  normalizeStaffAccountRecord,
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramOperatorRecord,
  parseDateTimeLocalInput,
  readEntityPayload,
  readListPayload,
  sortDailyAccessCodes,
  sortStaffAccounts,
  sortTelegramOperators,
  toggleInventoryFilterValue,
  defaultInventoryListResponse,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';

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

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState<StaffUser | null>(null);
  const cmdK = useCmdK(user !== null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');

  const onAfterAccessSubmit = () => setActiveTab('access');
  const dailyCode = useDailyCode();
  const staff = useStaffAccounts({ onAfterSubmit: onAfterAccessSubmit });
  const telegramOps = useTelegramOperators({ onAfterSubmit: onAfterAccessSubmit });
  const [inventory, setInventory] = useState<InventoryTobacco[]>([]);
  const mixes = useMixes({
    token,
    onAfterSubmit: () => setActiveTab('mixes'),
    onRefreshSiblings: async (nextToken: string) => {
      await Promise.all([
        loadSummary(nextToken, dashboardWindow),
        rails.reload(nextToken),
      ]);
    },
  });
  const refreshRailSiblings = async (nextToken: string) => {
    await Promise.all([
      loadSummary(nextToken, dashboardWindow),
      mixes.loadMixes(nextToken, mixes.mixesFilters, mixes.mixesSort),
    ]);
  };
  const rails = useRails({
    onAfterSubmit: () => setActiveTab('rails'),
    onRefreshSiblings: refreshRailSiblings,
  });
  const [inventoryFilters, setInventoryFilters] = useState<InventoryListFilters>(defaultInventoryListResponse.filters);
  const [inventorySort, setInventorySort] = useState<InventoryListSort>(defaultInventoryListResponse.sort);
  const [inventoryMeta, setInventoryMeta] = useState<InventoryListMeta>(defaultInventoryListResponse.meta);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dashboardWindow, setDashboardWindow] = useState<DashboardWindowKey>('14d');
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [inventoryBatchAction, setInventoryBatchAction] = useState<'' | InventoryBatchAction>('');
  const [inventorySaveStatus, setInventorySaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventorySaveError, setInventorySaveError] = useState('');

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

  const refreshInventoryDependents = async (nextToken: string) => {
    await Promise.allSettled([
      loadSummary(nextToken, dashboardWindow),
      mixes.loadMixes(nextToken, mixes.mixesFilters, mixes.mixesSort, mixes.mixesMeta.page, mixes.mixesMeta.pageSize),
      mixes.loadMixTobaccos(nextToken),
      rails.reloadCatalog(nextToken),
    ]);
  };




  const hashSkipRef = useRef(false);
  const pendingMixEditIdRef = useRef<string | null>(null);
  const mixesApiRef = useRef(mixes);
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    mixesApiRef.current = mixes;
  }, [mixes]);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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
    if (hashSkipRef.current) {
      hashSkipRef.current = false;
      return;
    }
    let desired = `#${activeTab}`;
    if (activeTab === 'mixes') {
      if (mixes.mixesScreen === 'edit' && mixes.mixEditor.id) {
        desired = `#mixes/edit/${mixes.mixEditor.id}`;
      } else if (mixes.mixesScreen === 'create') {
        desired = '#mixes/create';
      }
    }
    if (window.location.hash === desired) return;
    window.history.pushState(null, '', desired);
  }, [user, activeTab, mixes.mixesScreen, mixes.mixEditor.id]);

  useEffect(() => {
    if (!user) return;

    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (!raw) return;
      const parts = raw.split('/');
      const api = mixesApiRef.current;

      if (parts[0] === 'mixes' && parts[1] === 'create') {
        hashSkipRef.current = true;
        pendingMixEditIdRef.current = null;
        setActiveTab('mixes');
        api.onStartCreate();
        return;
      }

      if (parts[0] === 'mixes' && parts[1] === 'edit' && parts[2]) {
        const targetId = parts[2];
        const mix = api.mixes.find((item) => item.id === targetId);
        if (mix) {
          hashSkipRef.current = true;
          pendingMixEditIdRef.current = null;
          setActiveTab('mixes');
          api.onSelectMix(mix);
        } else {
          pendingMixEditIdRef.current = targetId;
          if (activeTabRef.current !== 'mixes') {
            hashSkipRef.current = true;
            setActiveTab('mixes');
          }
        }
        return;
      }

      if (workspaceTabs.some((item) => item.id === raw)) {
        const nextTab = raw as WorkspaceTab;
        pendingMixEditIdRef.current = null;
        if (api.mixesScreen !== 'catalog') {
          hashSkipRef.current = true;
          api.onResetEditor();
        }
        if (nextTab !== activeTabRef.current) {
          hashSkipRef.current = true;
          setActiveTab(nextTab);
        }
      }
    };

    applyHash();
    window.addEventListener('popstate', applyHash);
    return () => window.removeEventListener('popstate', applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pendingId = pendingMixEditIdRef.current;
    if (!pendingId) return;
    if (activeTab !== 'mixes') {
      pendingMixEditIdRef.current = null;
      return;
    }
    if (mixes.mixesStatus !== 'ready') return;
    const mix = mixes.mixes.find((item) => item.id === pendingId);
    pendingMixEditIdRef.current = null;
    if (mix) {
      hashSkipRef.current = true;
      mixes.onSelectMix(mix);
    } else {
      console.warn(`[master-web] mix with id="${pendingId}" not found, falling back to catalog`);
      hashSkipRef.current = true;
      window.history.replaceState(null, '', '#mixes');
    }
  }, [user, mixes.mixes, mixes.mixesStatus, mixes.onSelectMix, activeTab]);

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
          mixes.reload(token),
          rails.reload(token),
          dailyCode.reload(token),
          staff.reload(token, profile.user.role),
          telegramOps.reload(token, profile.user.role),
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
    if (!login.trim() || !password) {
      setError('Введите логин и пароль');
      setStatus('error');
      return;
    }
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
        mixes.reload(auth.accessToken),
        rails.reload(auth.accessToken),
        dailyCode.reload(auth.accessToken),
        staff.reload(auth.accessToken, profile.user.role),
        telegramOps.reload(auth.accessToken, profile.user.role),
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
    mixes.reset();
    rails.reset();
    dailyCode.reset();
    staff.reset();
    telegramOps.reset();
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
    setStatus('idle');
    setError('');
    setPassword('');
    setActiveTab('dashboard');
    setInventoryStatus('idle');
    setSummaryStatus('idle');
    setInventoryError('');
    setSummaryError('');
    setToggleId('');
    setInventoryBatchAction('');
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

  const onSelectMix = (mix: MixRecord) => {
    mixes.onSelectMix(mix);
    setActiveTab('mixes');
  };

  const onStartCreateMix = () => {
    mixes.onStartCreate();
    setActiveTab('mixes');
  };

  const onCopyMix = (mix: MixRecord) => {
    mixes.onStartCopy(mix);
    setActiveTab('mixes');
  };

  const onOpenInventoryMix = (mixId: string) => {
    const mix = mixes.mixes.find((item) => item.id === mixId);
    if (mix) {
      onSelectMix(mix);
      return;
    }

    setActiveTab('mixes');
  };


















  const renderDashboard = () => (
    <DashboardView
      summary={summary}
      summaryStatus={summaryStatus}
      summaryError={summaryError}
      onNavigate={(tab) => setActiveTab(tab)}
    />
  );

  const renderInventory = () => (
    <InventoryView
      items={inventory}
      catalogOptions={mixes.mixTobaccos}
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
    if (mixes.mixesScreen === 'edit' || mixes.mixesScreen === 'create') {
      return (
        <MixBuilder
          mode={mixes.mixesScreen}
          editor={mixes.mixEditor}
          tobaccos={mixes.mixTobaccos}
          saveStatus={mixes.mixSaveStatus}
          saveError={mixes.mixSaveError}
          onFieldChange={mixes.onChangeEditorField}
          onAvailabilityChange={mixes.onChangeEditorAvailability}
          onAddComponent={mixes.onAddComponentById}
          onUpdateComponent={mixes.onUpdateComponent}
          onRemoveComponent={mixes.onRemoveComponentRebalanced}
          onReplaceComponents={mixes.onReplaceComponents}
          onSubmit={mixes.onSubmitMix}
          onCancel={mixes.mixesScreen === 'create' ? mixes.onCancelCreate : mixes.onResetEditor}
        />
      );
    }

    return (
      <MixCatalogView
        items={mixes.mixes}
        status={mixes.mixesStatus}
        error={mixes.mixesError}
        filters={mixes.mixesFilters}
        meta={mixes.mixesMeta}
        sort={mixes.mixesSort}
        onSearchChange={mixes.onSearchChange}
        onStatusChange={(value) => void mixes.onStatusChange(value)}
        onRailStateChange={(value) => void mixes.onRailStateChange(value)}
        onSortFieldChange={(value) => void mixes.onSortFieldChange(value)}
        onSortDirectionChange={(value) => void mixes.onSortDirectionChange(value)}
        onToggleFilterValue={(key, value) => void mixes.onToggleFilterValue(key, value)}
        onClearFilterGroup={(key) => void mixes.onClearFilterGroup(key)}
        onResetFilters={() => void mixes.onResetFilters()}
        onPageChange={mixes.onPageChange}
        onSelectMix={onSelectMix}
        onStartCreate={onStartCreateMix}
        onCopyMix={onCopyMix}
        onToggleMixAvailable={(mix) => void mixes.onToggleMixAvailable(mix)}
        onDeleteMix={(mix) => void mixes.onDeleteMix(mix)}
        rowPendingId={mixes.mixRowPendingId}
      />
    );
  };

  const renderRails = () => (
    <>
      <RailsView
        rails={rails.rails}
        railMixCatalog={rails.railMixCatalog}
        railsStatus={rails.railsStatus}
        railsError={rails.railsError}
        activeEditorId={rails.railEditor.id}
        onCreateRail={() => {
          rails.onResetRailEditor();
          rails.setRailEditorSheetOpen(true);
        }}
        onOpenRail={(rail) => {
          rails.onSelectRail(rail);
          rails.setRailEditorSheetOpen(true);
        }}
      />
      <RailEditor
        open={rails.railEditorSheetOpen}
        onOpenChange={rails.setRailEditorSheetOpen}
        editor={rails.railEditor}
        setEditor={rails.setRailEditor}
        railMixCatalog={rails.railMixCatalog}
        mixes={mixes.mixes}
        railMixCandidateId={rails.railMixCandidateId}
        setRailMixCandidateId={rails.setRailMixCandidateId}
        saveStatus={rails.railSaveStatus}
        saveError={rails.railSaveError}
        onSubmit={(event) => rails.onSubmitRail(event, token)}
        onAddMix={rails.onAddRailMix}
        onRemoveMix={rails.onRemoveRailMix}
        onMoveMix={rails.onMoveRailMix}
        onReorderMixes={rails.onReorderRailMixes}
        onReset={rails.onResetRailEditor}
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
        dailyCodeRotateStatus={dailyCode.rotateStatus}
        dailyCodeRotateError={dailyCode.rotateError}
        onRotateDailyCode={() => dailyCode.rotate(token)}
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
      ...mixes.mixes.map((mix) => ({
        id: `mix:${mix.id}`,
        label: mix.name,
        group: 'Открыть микс',
        hint: 'микс',
        keywords: `${mix.name} ${mix.description ?? ''}`,
        searchOnly: true,
        onSelect: () => onSelectMix(mix),
      })),
      ...rails.rails.map((rail) => ({
        id: `rail:${rail.id}`,
        label: rail.name,
        group: 'Открыть рейл',
        hint: 'рейл',
        keywords: `${rail.name} ${rail.description ?? ''}`,
        searchOnly: true,
        onSelect: () => {
          rails.onSelectRail(rail);
          rails.setRailEditorSheetOpen(true);
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
          onSignOut={onSignOut}
          onOpenCommandPalette={() => cmdK.setOpen(true)}
        />

        <section className="master-stage">
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

  const handleLoginChange = (value: string) => {
    setLogin(value);
    if (error) setError('');
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError('');
  };

  return (
    <LoginScreen
      login={login}
      password={password}
      status={status}
      error={error}
      onLoginChange={handleLoginChange}
      onPasswordChange={handlePasswordChange}
      onSubmit={onSubmit}
    />
  );
};
