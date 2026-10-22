import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { AccessView } from '@/components/access/access-view';
import { LoginScreen } from '@/components/auth/login-screen';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { useDailyCode } from '@/hooks/use-daily-code';
import { useMixes } from '@/hooks/use-mixes';
import { useRails } from '@/hooks/use-rails';
import { useShelf } from '@/hooks/use-shelf';
import { useShelfDashboard } from '@/hooks/use-shelf-dashboard';
import { useCatalogIdeas } from '@/hooks/use-catalog-ideas';
import { ShelfMobileHeadMenu } from '@/components/shelf/shelf-mobile';
import { ShelfSettingsDialog } from '@/components/shelf/shelf-settings-dialog';
import { ShelfView, type ShelfMode } from '@/components/shelf/shelf-view';
import { useIsPhone } from '@/hooks/use-is-phone';
import { useDeliveries } from '@/hooks/use-deliveries';
import { DeliveriesView } from '@/components/deliveries/deliveries-view';
import { useStaffAccounts } from '@/hooks/use-staff-accounts';
import { useTelegramOperators } from '@/hooks/use-telegram-operators';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ShelfDashboardBlock } from '@/components/dashboard/shelf-dashboard-block';
import { InventoryView, type CatalogBatchAction, type CatalogView, type InventoryEditorInput } from '@/components/inventory/inventory-view';
import { CatalogIdeasView } from '@/components/inventory/catalog-ideas-view';
import { MixCatalogView } from '@/components/mixes/mix-catalog-view';
import { MixBuilder } from '@/components/mixes/mix-builder/mix-builder';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { RailEditor } from '@/components/rails/rail-editor';
import { RailsView } from '@/components/rails/rails-view';
import { MasterTopBar } from '@/components/shell/topbar';
import { MobileNav, MobileTopBar } from '@/components/shell/mobile-shell';
import { WhatsNewDialog } from '@/components/shell/whats-new-dialog';
import { hasUnseen, latestRelease, markSeen, readSeen, type WhatsNewAction } from '@/lib/whats-new';
import { mobileTitleFor } from '@/components/shell/mobile-nav';
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
  DEFAULT_SHELF_SETTINGS,
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

const STORAGE_KEY = 'atelier-master-auth-v1';

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
      { label: 'Нажатия «Покурить»', value: 0 },
      { label: 'Оценок гостей', value: 0 },
      { label: 'Миксов без наличия', value: 0 },
      { label: 'Пустых активных рейлов', value: 0 },
    ];
  }

  return [
    { label: 'Всего табаков', value: summary.totalTobaccos },
    { label: 'В наличии', value: summary.inStockCount },
    { label: 'Нажатия «Покурить»', value: summary.smokeCtaTotal },
    { label: 'Оценок гостей', value: summary.ratingsTotal },
    { label: 'Миксов без наличия', value: summary.ops.blockedByInventoryCount },
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

const formatRoleLabel = (role: StaffUser['role']) => (role === 'admin' ? 'admin' : 'master');

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState<StaffUser | null>(null);
  const cmdK = useCmdK(user !== null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const isPhone = useIsPhone();
  const [shelfMode, setShelfMode] = useState<ShelfMode>('shelf');
  const [shelfSettingsOpen, setShelfSettingsOpen] = useState(false);
  // «Указать» бюджет на дашборде (#326): настройки полки поверх дашборда.
  const [budgetSettingsOpen, setBudgetSettingsOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  // Вернулись на полку — снова полка, а не «К заказу» (как до выноса режима в App).
  useEffect(() => {
    if (activeTab === 'shelf') return;
    setShelfMode('shelf');
    setShelfSettingsOpen(false);
  }, [activeTab]);

  const onAfterAccessSubmit = () => setActiveTab('access');
  const dailyCode = useDailyCode();
  const staff = useStaffAccounts({ onAfterSubmit: onAfterAccessSubmit });
  const telegramOps = useTelegramOperators({ onAfterSubmit: onAfterAccessSubmit });
  const [inventory, setInventory] = useState<InventoryTobacco[]>([]);
  const shelf = useShelf(token);
  const deliveries = useDeliveries(token);
  const shelfDashboard = useShelfDashboard(token);
  const [catalogView, setCatalogView] = useState<CatalogView>('all');
  const catalogIdeas = useCatalogIdeas(token, (tobaccoId) => shelf.add(tobaccoId, 'plan'));
  // Табак из «Заканчивается» на дашборде: «Полка» откроет его карточку.
  const [pendingShelfCard, setPendingShelfCard] = useState('');
  // Счёт, выбранный на «Полке»: его разбирает вкладка «Поставки».
  const [pendingInvoice, setPendingInvoice] = useState<File | null>(null);
  const shelfStatuses = useMemo(
    () => new Map((shelf.view?.rows ?? []).map((row) => [row.tobacco.id, row.shelfStatus === 'plan' ? 'plan' : 'active'] as const)),
    [shelf.view],
  );
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
      mixes.loadMixes(nextToken),
    ]);
  };
  const rails = useRails({
    onAfterSubmit: () => setActiveTab('rails'),
    onRefreshSiblings: refreshRailSiblings,
  });
  const [inventoryFilters, setInventoryFilters] = useState<InventoryListFilters>(defaultInventoryListResponse.filters);
  const [inventorySort, setInventorySort] = useState<InventoryListSort>(defaultInventoryListResponse.sort);
  const [inventoryMeta, setInventoryMeta] = useState<InventoryListMeta>(defaultInventoryListResponse.meta);
  // Обработчики инвентаря читают состояние поверхности отсюда, а не из
  // замыкания рендера: дебаунс поиска срабатывает через 300 мс после ввода, и
  // за это время фильтр наличия или сортировка успевают смениться (#60).
  const inventoryFiltersRef = useRef(inventoryFilters);
  const inventorySortRef = useRef(inventorySort);
  const inventoryRequestGuard = useRef(createLatestRequestGuard()).current;

  const commitInventoryFilters = (next: InventoryListFilters) => {
    inventoryFiltersRef.current = next;
    setInventoryFilters(next);
  };

  const commitInventorySort = (next: InventoryListSort) => {
    inventorySortRef.current = next;
    setInventorySort(next);
  };
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dashboardWindow, setDashboardWindow] = useState<DashboardWindowKey>('14d');
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [inventoryBatchAction, setInventoryBatchAction] = useState<'' | CatalogBatchAction>('');
  const [inventorySaveStatus, setInventorySaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventorySaveError, setInventorySaveError] = useState('');

  const loadInventory = async (
    nextToken: string,
    nextFilters: InventoryListFilters = inventoryFiltersRef.current,
    nextSort: InventoryListSort = inventorySortRef.current,
    nextPage: number = inventoryMeta.page,
    nextPageSize: number = inventoryMeta.pageSize,
  ) => {
    const ticket = inventoryRequestGuard.start();
    setInventoryStatus('loading');
    setInventoryError('');

    try {
      const query = buildInventoryRequestQuery(nextFilters, nextSort, nextPage, nextPageSize);
      const response = await requestJson<unknown>(`/staff/inventory/tobaccos${query ? `?${query}` : ''}`, {}, nextToken);
      const payload = normalizeInventoryListResponse(response);

      // Ответ переустанавливает фильтры и сортировку из payload'а, поэтому
      // запоздавший результат вернул бы поверхность к состоянию, из которого
      // его отправили.
      if (inventoryRequestGuard.isStale(ticket)) {
        return;
      }

      setInventory(payload.items);
      commitInventoryFilters(payload.filters);
      commitInventorySort(payload.sort);
      setInventoryMeta(payload.meta);
      setSelectedInventoryIds((current) => current.filter((id) => payload.items.some((item) => item.id === id)));
      setInventoryStatus('ready');
    } catch (cause) {
      if (inventoryRequestGuard.isStale(ticket)) {
        return;
      }

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
      shelf.reload(nextToken),
      mixes.loadMixes(nextToken),
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

  // Полка и каталог показывают одно наличие с разных сторон: при переходе
  // между ними перечитываем ту поверхность, на которую пришли.
  const previousTabRef = useRef(activeTab);
  useEffect(() => {
    const previous = previousTabRef.current;
    previousTabRef.current = activeTab;
    if (!user || !token || previous === activeTab) return;
    if (activeTab === 'catalog') void loadInventory(token);
    if (activeTab === 'catalog' && catalogView === 'ideas') void catalogIdeas.reload(token);
    if (activeTab === 'shelf') void shelf.reload(token);
    if (activeTab === 'dashboard') void shelfDashboard.reload(token);
    // Приёмка поставки тоже меняет наличие для гостя.
    if (previous === 'shelf' || previous === 'deliveries') void refreshInventoryDependents(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!user) {
      document.title = 'Ателье · Мастер — вход';
      return;
    }
    const tab = workspaceTabs.find((item) => item.id === activeTab) ?? workspaceTabs[0];
    document.title = `${tab.label} — Ателье · Мастер`;
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
          shelf.reload(token),
          shelfDashboard.reload(token),
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
      setError('Нужны логин и пароль.');
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
        shelf.reload(auth.accessToken),
        shelfDashboard.reload(auth.accessToken),
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
    nextFilters: InventoryListFilters = inventoryFiltersRef.current,
    nextSort: InventoryListSort = inventorySortRef.current,
    nextPage: number = inventoryMeta.page,
  ) => {
    if (!token) {
      return;
    }

    await loadInventory(token, nextFilters, nextSort, nextPage, inventoryMeta.pageSize);
  };

  const onInventorySearchChange = async (value: string) => {
    const nextFilters = {
      ...inventoryFiltersRef.current,
      search: value,
    };
    commitInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySortRef.current, 1);
  };

  const onInventoryStockChange = async (value: InventoryListFilters['stock']) => {
    const nextFilters = {
      ...inventoryFiltersRef.current,
      stock: value,
    };
    commitInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySortRef.current, 1);
  };

  const onInventoryArchivedChange = async (value: InventoryListFilters['archived']) => {
    const nextFilters = {
      ...inventoryFiltersRef.current,
      archived: value,
    };
    setSelectedInventoryIds([]);
    commitInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySortRef.current, 1);
  };

  const onInventorySortChange = async (nextSort: InventoryListSort) => {
    commitInventorySort(nextSort);
    await refreshInventorySurface(inventoryFiltersRef.current, nextSort, 1);
  };

  const onInventoryToggleFilterValue = async (key: InventoryFilterKey, value: string) => {
    const current = inventoryFiltersRef.current;
    const nextFilters = {
      ...current,
      [key]: toggleInventoryFilterValue(current[key], value),
    };
    commitInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySortRef.current, 1);
  };

  const onInventoryClearFilterGroup = async (key: InventoryFilterKey) => {
    const current = inventoryFiltersRef.current;
    if (current[key].length === 0) {
      return;
    }

    const nextFilters = {
      ...current,
      [key]: [],
    };
    commitInventoryFilters(nextFilters);
    await refreshInventorySurface(nextFilters, inventorySortRef.current, 1);
  };

  const onInventoryPageChange = async (page: number) => {
    await refreshInventorySurface(inventoryFiltersRef.current, inventorySortRef.current, page);
  };

  const onInventoryPageSizeChange = async (pageSize: number) => {
    if (!token) {
      return;
    }

    await loadInventory(token, inventoryFiltersRef.current, inventorySortRef.current, 1, pageSize);
  };

  const onSignOut = () => {
    mixes.reset();
    rails.reset();
    dailyCode.reset();
    staff.reset();
    telegramOps.reset();
    shelf.reset();
    shelfDashboard.reset();
    catalogIdeas.reset();
    setCatalogView('all');
    setPendingShelfCard('');
    deliveries.reset();
    setPendingInvoice(null);
    storeToken('');
    setToken('');
    setUser(null);
    setInventory([]);
    commitInventoryFilters(defaultInventoryListResponse.filters);
    commitInventorySort(defaultInventoryListResponse.sort);
    setInventoryMeta(defaultInventoryListResponse.meta);
    setSelectedInventoryIds([]);
    setSummary(null);
    setDashboardWindow('14d');
    setStatus('idle');
    setError('');
    setPassword('');
    setActiveTab('dashboard');
    setWhatsNewOpen(false);
    setInventoryStatus('idle');
    setSummaryStatus('idle');
    setInventoryError('');
    setSummaryError('');
    setToggleId('');
    setInventoryBatchAction('');
  };

  // Каталог ставит табак на полку и убирает с неё через сервис полки; наличие
  // для гостя пересчитывает backend, поэтому после действия каталог и зависимые
  // поверхности перечитываются.
  const runCatalogShelfAction = async (item: InventoryTobacco, action: () => Promise<unknown>, fallback: string) => {
    if (!token) {
      return;
    }

    setToggleId(item.id);
    setInventoryError('');

    try {
      await action();
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : fallback);
      setInventoryStatus('error');
    } finally {
      setToggleId('');
    }
  };

  const onAddToShelf = (item: InventoryTobacco) =>
    runCatalogShelfAction(item, () => shelf.add(item.id), 'Не удалось поставить табак на полку');

  const onRemoveFromShelf = (item: InventoryTobacco) =>
    runCatalogShelfAction(item, () => shelf.remove(item.id), 'Не удалось убрать табак с полки');

  const onToggleInventorySelection = (id: string) => {
    setSelectedInventoryIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const onToggleSelectAllInventory = () => {
    const visibleIds = inventory.map((item) => item.id);
    const nextSelection = visibleIds.every((id) => selectedInventoryIds.includes(id)) ? [] : visibleIds;
    setSelectedInventoryIds(nextSelection);
  };

  const onArchiveTobacco = async (item: InventoryTobacco, archived: boolean) => {
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
          body: JSON.stringify({ archived }),
        },
        token,
      );
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось обновить архив');
      setInventoryStatus('error');
    } finally {
      setToggleId('');
    }
  };

  const onRunInventoryBatch = async (action: CatalogBatchAction) => {
    if (!token || !selectedInventoryIds.length) {
      return;
    }

    setInventoryBatchAction(action);
    setInventoryError('');

    if (action === 'shelf-add' || action === 'shelf-remove') {
      const failed: string[] = [];
      for (const id of selectedInventoryIds) {
        const onShelf = shelfStatuses.get(id);
        try {
          if (action === 'shelf-add' && onShelf !== 'active') {
            await shelf.add(id);
          }
          if (action === 'shelf-remove' && onShelf) {
            await shelf.remove(id);
          }
        } catch {
          failed.push(inventory.find((item) => item.id === id)?.name ?? id);
        }
      }
      if (failed.length) {
        setInventoryError(`Часть позиций не обновилась: ${failed.join(', ')}`);
      }
      setSelectedInventoryIds([]);
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryBatchAction('');
      return;
    }

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
        setInventoryError(`Часть позиций не обновилась: ${batch.skippedIds.join(', ')}`);
      }
      setSelectedInventoryIds([]);
      const dependentRefresh = refreshInventoryDependents(token);
      await loadInventory(token, inventoryFilters, inventorySort);
      void dependentRefresh;
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось выполнить массовое действие');
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
      setInventorySaveError('Нужен производитель');
      setInventorySaveStatus('error');
      return;
    }

    if (!name) {
      setInventorySaveError('Нужно название табака');
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
            // Наличие правится на «Полке»; при создании карточки можно сразу
            // поставить табак на полку (backend запишет приход типичной фасовки бренда).
            ...(payload.id ? {} : { inStock: payload.inStock }),
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
      onNavigate={(tab) => setActiveTab(tab === 'inventory' ? 'shelf' : tab)}
      shelfBlock={
        <>
          <ShelfDashboardBlock
            data={shelfDashboard.data}
            status={shelfDashboard.status}
            error={shelfDashboard.error}
            bowlGrams={shelf.view?.settings.bowlGrams ?? DEFAULT_SHELF_SETTINGS.bowlGrams}
            leadDays={shelf.view?.settings.leadDays ?? DEFAULT_SHELF_SETTINGS.leadDays}
            onOpenTobacco={(tobaccoId) => {
              setPendingShelfCard(tobaccoId);
              setActiveTab('shelf');
            }}
            onSetBudget={() => setBudgetSettingsOpen(true)}
          />
          {/* Без загруженной полки настройки неизвестны — по умолчанию их не перезаписываем. */}
          {budgetSettingsOpen && shelf.view ? (
            <ShelfSettingsDialog
              settings={shelf.view.settings}
              interval={shelf.view.interval}
              horizon={shelf.view.horizon}
              onSave={async (settings) => {
                const saved = await shelf.saveSettings(settings);
                if (token) await shelfDashboard.reload(token);
                return saved;
              }}
              onClose={() => setBudgetSettingsOpen(false)}
            />
          ) : null}
        </>
      }
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
      shelfStatuses={shelfStatuses}
      onSearchChange={onInventorySearchChange}
      onStockChange={(value) => void onInventoryStockChange(value)}
      onArchivedChange={(value) => void onInventoryArchivedChange(value)}
      onSortChange={(value) => void onInventorySortChange(value)}
      onToggleFilterValue={(key, value) => void onInventoryToggleFilterValue(key, value)}
      onClearFilterGroup={(key) => void onInventoryClearFilterGroup(key)}
      onPageChange={onInventoryPageChange}
      onPageSizeChange={(pageSize) => void onInventoryPageSizeChange(pageSize)}
      onToggleSelection={onToggleInventorySelection}
      onToggleSelectAll={onToggleSelectAllInventory}
      onAddToShelf={(item) => void onAddToShelf(item)}
      onRemoveFromShelf={(item) => void onRemoveFromShelf(item)}
      onArchiveTobacco={(item, archived) => void onArchiveTobacco(item, archived)}
      onRunBatchAction={(action) => void onRunInventoryBatch(action)}
      onOpenMix={onOpenInventoryMix}
      saveStatus={inventorySaveStatus}
      saveError={inventorySaveError}
      onSaveTobacco={onSaveTobacco}
      onResetSaveFeedback={onResetInventorySaveFeedback}
      view={catalogView}
      onViewChange={(view) => {
        setCatalogView(view);
        if (view === 'ideas' && token) void catalogIdeas.reload(token);
      }}
      ideas={<CatalogIdeasView ideas={catalogIdeas} shelfStatuses={shelfStatuses} />}
    />
  );

  const renderShelf = () => (
    <ShelfView
      shelf={shelf}
      mode={shelfMode}
      onModeChange={setShelfMode}
      onGoCatalog={() => setActiveTab('catalog')}
      onOpenIdeas={() => {
        // Смена вкладки сама перечитает идеи.
        setCatalogView('ideas');
        setActiveTab('catalog');
      }}
      onOpenInCatalog={(row) => {
        setCatalogView('all');
        setActiveTab('catalog');
        void onInventorySearchChange(row.tobacco.name);
      }}
      onOpenMix={onOpenInventoryMix}
      onUploadInvoice={(file) => {
        setPendingInvoice(file);
        setActiveTab('deliveries');
      }}
      settingsOpen={shelfSettingsOpen}
      onSettingsOpenChange={setShelfSettingsOpen}
      openCardId={pendingShelfCard}
      onCardOpened={() => setPendingShelfCard('')}
    />
  );

  const renderDeliveries = () => (
    <DeliveriesView
      api={deliveries}
      pendingFile={pendingInvoice}
      onPendingFileTaken={() => setPendingInvoice(null)}
      onOpenShelf={() => setActiveTab('shelf')}
      onAccepted={() => {
        if (token) void refreshInventoryDependents(token);
      }}
    />
  );

  const renderMixes = () => {
    if (mixes.mixesScreen === 'edit' || mixes.mixesScreen === 'create') {
      return (
        <MixBuilder
          mode={mixes.mixesScreen}
          editor={mixes.mixEditor}
          tobaccos={mixes.mixTobaccos}
          componentTobaccos={mixes.mixComponentTobaccos}
          onSearchTobaccos={mixes.searchMixTobaccos}
          saveStatus={mixes.mixSaveStatus}
          saveError={mixes.mixSaveError}
          onFieldChange={mixes.onChangeEditorField}
          onAvailabilityChange={mixes.onChangeEditorAvailability}
          onAddComponent={mixes.onAddComponent}
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
        onSortChange={(value) => void mixes.onSortChange(value)}
        onToggleFilterValue={(key, value) => void mixes.onToggleFilterValue(key, value)}
        onClearFilterGroup={(key) => void mixes.onClearFilterGroup(key)}
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
        onDeleteRail={(rail) => rails.onDeleteRail(rail, token)}
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
      case 'shelf':
        return renderShelf();
      case 'deliveries':
        return renderDeliveries();
      case 'catalog':
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
    const whatsNewRelease = latestRelease();
    // Читаем при каждом рендере: закрытие окна и так перерисовывает App, а при
    // недоступном хранилище точка честно остаётся гореть.
    const whatsNew = whatsNewRelease
      ? { unseen: hasUnseen(readSeen(user.login)), onOpen: () => setWhatsNewOpen(true) }
      : null;
    const closeWhatsNew = () => {
      if (whatsNewRelease) markSeen(user.login, whatsNewRelease.id);
      setWhatsNewOpen(false);
    };
    const openWhatsNewAction = (action: WhatsNewAction) => {
      closeWhatsNew();
      // «Закупка» — только на десктопе: на телефоне — полка.
      if (action.tab === 'shelf') setShelfMode(action.view === 'reorder' ? 'reorder' : action.view === 'purchase' && !isPhone ? 'purchase' : 'shelf');
      if (action.tab === 'catalog') {
        setCatalogView(action.view === 'ideas' ? 'ideas' : 'all');
        // Смена вкладки сама перечитает идеи; уже в каталоге — перечитываем здесь.
        if (action.view === 'ideas' && activeTab === 'catalog' && token) void catalogIdeas.reload(token);
      }
      setActiveTab(action.tab);
    };

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
        onSelect: () => setActiveTab('catalog'),
      })),
    ];

    return (
      <main className="shell shell--master shell--master-workspace" id="main-content">
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>

        {isPhone ? (
          <MobileTopBar
            title={mobileTitleFor(activeTab, shelfMode)}
            action={
              activeTab === 'shelf' ? (
                <>
                  <button
                    type="button"
                    className="icon-btn m-topbar__action"
                    aria-label="К заказу"
                    aria-pressed={shelfMode === 'reorder'}
                    onClick={() => setShelfMode(shelfMode === 'reorder' ? 'shelf' : 'reorder')}
                  >
                    <ShoppingCart size={18} strokeWidth={1.8} aria-hidden />
                  </button>
                  <ShelfMobileHeadMenu onSettings={() => setShelfSettingsOpen(true)} />
                </>
              ) : null
            }
          />
        ) : (
          <MasterTopBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            userName={user.name}
            userRoleLabel={formatRoleLabel(user.role)}
            onSignOut={onSignOut}
            onOpenCommandPalette={() => cmdK.setOpen(true)}
            whatsNew={whatsNew}
          />
        )}

        <section className="master-stage">
          <div
            className="master-stage__panel"
            id={getWorkspacePanelId(activeTab)}
            role={isPhone ? undefined : 'tabpanel'}
            aria-labelledby={isPhone ? undefined : getWorkspaceTabId(activeTab)}
          >
            {renderActiveWorkspace()}
          </div>
        </section>

        {isPhone ? (
          <MobileNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === 'shelf') setShelfMode('shelf');
              setActiveTab(tab);
            }}
            userName={user.name}
            userRoleLabel={formatRoleLabel(user.role)}
            onSignOut={onSignOut}
            whatsNew={whatsNew}
          />
        ) : null}

        {whatsNewOpen && whatsNewRelease ? (
          <WhatsNewDialog
            release={whatsNewRelease}
            isPhone={isPhone}
            onClose={closeWhatsNew}
            onAction={openWhatsNewAction}
          />
        ) : null}

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
