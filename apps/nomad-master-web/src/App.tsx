import { FormEvent, useEffect, useState } from 'react';
import {
  DashboardSummary,
  DailyAccessCodeRecord,
  InventoryTobacco,
  MixRecord,
  RailRecord,
  StaffAuthResponse,
  StaffAccountRecord,
  TelegramRecipientRecord,
  TelegramRecipientScope,
  TelegramAutomationStateRecord,
  StaffUser,
  formatDateTimeLocalInput,
  buildInventorySummary,
  formatDelimitedList,
  formatMetricValue,
  formatRailType,
  formatTelegramAutomationHealth,
  formatTelegramRecipientScope,
  normalizeDashboardSummary,
  normalizeDailyAccessCodeRecord,
  normalizeMixRecord,
  normalizeRailRecord,
  normalizeStaffAccountRecord,
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramRecipientRecord,
  parseDelimitedList,
  parseDateTimeLocalInput,
  railTypeOptions,
  readEntityPayload,
  readListPayload,
  sortDailyAccessCodes,
  sortInventoryItems,
  sortMixes,
  sortRails,
  sortStaffAccounts,
  sortTelegramRecipients,
  telegramRecipientScopeOptions,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

type WorkspaceTab = 'dashboard' | 'inventory' | 'mixes' | 'rails' | 'access';

type MixEditorState = {
  id: string;
  name: string;
  description: string;
  componentIds: string;
  flavorProfiles: string;
  flavors: string;
  avgRating: string;
  popularity: string;
  available: boolean;
};

type RailEditorState = {
  id: string;
  name: string;
  description: string;
  type: 'statistical' | 'prepared' | 'curated';
  mixIds: string;
  active: boolean;
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

const emptyMixEditor = (): MixEditorState => ({
  id: '',
  name: '',
  description: '',
  componentIds: '',
  flavorProfiles: '',
  flavors: '',
  avgRating: '0',
  popularity: '0',
  available: true,
});

const emptyRailEditor = (): RailEditorState => ({
  id: '',
  name: '',
  description: '',
  type: 'prepared',
  mixIds: '',
  active: true,
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

const toMixEditorState = (mix: MixRecord): MixEditorState => ({
  id: mix.id,
  name: mix.name,
  description: mix.description,
  componentIds: formatDelimitedList(mix.componentIds),
  flavorProfiles: formatDelimitedList(mix.flavorProfiles),
  flavors: formatDelimitedList(mix.flavors),
  avgRating: String(mix.avgRating),
  popularity: String(mix.popularity),
  available: mix.available,
});

const toRailEditorState = (rail: RailRecord): RailEditorState => ({
  id: rail.id,
  name: rail.name,
  description: rail.description,
  type: rail.type,
  mixIds: formatDelimitedList(rail.mixIds),
  active: rail.active,
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
      { label: 'Не в наличии', value: 0 },
      { label: 'Нажатия Выбрать', value: 0 },
    ];
  }

  return [
    { label: 'Всего табаков', value: summary.totalTobaccos },
    { label: 'В наличии', value: summary.inStockCount },
    { label: 'Не в наличии', value: summary.outOfStockCount },
    { label: 'Нажатия Выбрать', value: summary.smokeCtaTotal },
  ];
};

const resolveMixComponentSummary = (mix: MixRecord) => {
  if (mix.components.length) {
    return mix.components
      .map((component) => `${component.name}${component.manufacturer ? ` · ${component.manufacturer}` : ''}`)
      .join(' | ');
  }

  return mix.componentIds.join(', ') || 'Компоненты не заданы';
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

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState<StaffUser | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [inventory, setInventory] = useState<InventoryTobacco[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [mixes, setMixes] = useState<MixRecord[]>([]);
  const [rails, setRails] = useState<RailRecord[]>([]);
  const [dailyCodes, setDailyCodes] = useState<DailyAccessCodeRecord[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountRecord[]>([]);
  const [telegramRecipients, setTelegramRecipients] = useState<TelegramRecipientRecord[]>([]);
  const [telegramAutomationState, setTelegramAutomationState] = useState<TelegramAutomationStateRecord | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixesStatus, setMixesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railsStatus, setRailsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [dailyCodesStatus, setDailyCodesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [staffAccountsStatus, setStaffAccountsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    'idle',
  );
  const [telegramRecipientsStatus, setTelegramRecipientsStatus] = useState<'idle' | 'loading' | 'ready' | 'forbidden' | 'error'>(
    'idle',
  );
  const [telegramAutomationStateStatus, setTelegramAutomationStateStatus] = useState<
    'idle' | 'loading' | 'ready' | 'forbidden' | 'error'
  >('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [mixesError, setMixesError] = useState('');
  const [railsError, setRailsError] = useState('');
  const [dailyCodesError, setDailyCodesError] = useState('');
  const [staffAccountsError, setStaffAccountsError] = useState('');
  const [telegramRecipientsError, setTelegramRecipientsError] = useState('');
  const [telegramAutomationStateError, setTelegramAutomationStateError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixSaveStatus, setMixSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
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
  const [telegramRecipientEditor, setTelegramRecipientEditor] =
    useState<TelegramRecipientEditorState>(emptyTelegramRecipientEditor);
  const [telegramRecipientSaveStatus, setTelegramRecipientSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [telegramRecipientSaveError, setTelegramRecipientSaveError] = useState('');
  const [telegramRecipientToggleId, setTelegramRecipientToggleId] = useState('');

  const loadInventory = async (nextToken: string) => {
    setInventoryStatus('loading');
    setInventoryError('');

    try {
      const response = await requestJson<unknown>('/staff/inventory/tobaccos', {}, nextToken);
      const items = sortInventoryItems(readListPayload<InventoryTobacco>(response));
      setInventory(items);
      setInventoryStatus('ready');
    } catch (cause) {
      setInventory([]);
      setInventoryStatus('error');
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось загрузить инвентарь');
    }
  };

  const loadSummary = async (nextToken: string) => {
    setSummaryStatus('loading');
    setSummaryError('');

    try {
      const response = await requestJson<unknown>('/staff/dashboard/summary', {}, nextToken);
      setSummary(normalizeDashboardSummary(response));
      setSummaryStatus('ready');
    } catch (cause) {
      setSummary(null);
      setSummaryStatus('error');
      setSummaryError(cause instanceof Error ? cause.message : 'Не удалось загрузить сводку');
    }
  };

  const loadMixes = async (nextToken: string) => {
    setMixesStatus('loading');
    setMixesError('');

    try {
      const response = await requestJson<unknown>('/staff/mixes', {}, nextToken);
      const items = readListPayload<unknown>(response).map(normalizeMixRecord);
      setMixes(sortMixes(items));
      setMixesStatus('ready');
    } catch (cause) {
      setMixes([]);
      setMixesStatus('error');
      setMixesError(cause instanceof Error ? cause.message : 'Не удалось загрузить миксы');
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
          loadSummary(token),
          loadMixes(token),
          loadRails(token),
          loadDailyCodes(token),
          loadStaffAccounts(token, profile.user.role),
          loadTelegramRecipients(token, profile.user.role),
          loadTelegramAutomationState(token, profile.user.role),
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
        loadSummary(auth.accessToken),
        loadMixes(auth.accessToken),
        loadRails(auth.accessToken),
        loadDailyCodes(auth.accessToken),
        loadStaffAccounts(auth.accessToken, profile.user.role),
        loadTelegramRecipients(auth.accessToken, profile.user.role),
        loadTelegramAutomationState(auth.accessToken, profile.user.role),
      ]);
      setStatus('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти');
      setStatus('error');
    }
  };

  const onSignOut = () => {
    storeToken('');
    setToken('');
    setUser(null);
    setInventory([]);
    setSummary(null);
    setMixes([]);
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
    setTelegramRecipientsStatus('idle');
    setTelegramAutomationStateStatus('idle');
    setInventoryError('');
    setSummaryError('');
    setMixesError('');
    setRailsError('');
    setDailyCodesError('');
    setStaffAccountsError('');
    setTelegramRecipientsError('');
    setTelegramAutomationStateError('');
    setToggleId('');
    setMixEditor(emptyMixEditor());
    setMixSaveStatus('idle');
    setMixSaveError('');
    setRailEditor(emptyRailEditor());
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
    setTelegramRecipients([]);
    setTelegramAutomationState(null);
    setTelegramRecipientEditor(emptyTelegramRecipientEditor());
    setTelegramRecipientSaveStatus('idle');
    setTelegramRecipientSaveError('');
    setTelegramRecipientToggleId('');
  };

  const onToggleStock = async (item: InventoryTobacco) => {
    if (!token) {
      return;
    }

    const nextInStock = !item.inStock;
    setToggleId(item.id);
    setInventoryError('');

    try {
      const response = await requestJson<unknown>(
        `/staff/inventory/tobaccos/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ inStock: nextInStock }),
        },
        token,
      );

      const payload = readEntityPayload<InventoryTobacco>(response);
      const nextItem = payload ?? { ...item, inStock: nextInStock };
      const nextInventory = sortInventoryItems(replaceOrInsert(inventory, nextItem));

      setInventory(nextInventory);
      setSummary((current) => {
        if (!current) {
          return current;
        }

        const inventorySummary = buildInventorySummary(nextInventory);
        return {
          ...current,
          ...inventorySummary,
        };
      });
      setInventoryStatus('ready');
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Не удалось обновить наличие');
      setInventoryStatus('error');
    } finally {
      setToggleId('');
    }
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

  const onSubmitMix = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = mixEditor.name.trim();
    const description = mixEditor.description.trim();
    const componentIds = parseDelimitedList(mixEditor.componentIds);
    const flavorProfiles = parseDelimitedList(mixEditor.flavorProfiles);
    const flavors = parseDelimitedList(mixEditor.flavors);

    if (!name) {
      setMixSaveError('Введите название микса');
      setMixSaveStatus('error');
      return;
    }

    setMixSaveStatus('loading');
    setMixSaveError('');

    const payload = {
      name,
      description,
      componentIds,
      flavorProfiles,
      flavors,
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

      setMixes((current) => sortMixes(replaceOrInsert(current, savedMix)));
      setMixEditor(toMixEditorState(savedMix));
      setMixSaveStatus('ready');
      setActiveTab('mixes');
    } catch (cause) {
      setMixSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить микс');
      setMixSaveStatus('error');
    }
  };

  const onSelectRail = (rail: RailRecord) => {
    setRailEditor(toRailEditorState(rail));
    setRailSaveError('');
    setRailSaveStatus('idle');
    setActiveTab('rails');
  };

  const onResetRailEditor = () => {
    setRailEditor(emptyRailEditor());
    setRailSaveError('');
    setRailSaveStatus('idle');
  };

  const onSubmitRail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = railEditor.name.trim();
    const description = railEditor.description.trim();
    const mixIds = parseDelimitedList(railEditor.mixIds);

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
      type: railEditor.type,
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
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Дашборд</p>
          <h2>Сводка Nomad</h2>
        </div>
        <div className="status-chip">Синхронизировано с backend</div>
      </div>

      {summaryStatus === 'loading' ? <p className="meta-line">Загружаем сводку...</p> : null}
      {summaryError ? <p className="error-text">{summaryError}</p> : null}

      <section className="summary-grid summary-grid--stacked">
        {readSummaryCards(summary).map((card) => (
          <article className="metric-card" key={card.label}>
            <span className="metric-label">{card.label}</span>
            <strong className="metric-value">{formatMetricValue(card.value)}</strong>
          </article>
        ))}
      </section>

      <div className="quick-actions">
        <button className="secondary-button secondary-button--inline" type="button" onClick={() => setActiveTab('mixes')}>
          Перейти в менеджер миксов
        </button>
        <button className="secondary-button secondary-button--inline" type="button" onClick={() => setActiveTab('rails')}>
          Перейти в менеджер рейлов
        </button>
        <button className="secondary-button secondary-button--inline" type="button" onClick={() => setActiveTab('access')}>
          Перейти в доступ
        </button>
      </div>

      <div className="top-mixes">
        {(summary?.topMixes ?? []).length ? (
          summary.topMixes.map((mix) => (
            <article className="top-mix-card" key={mix.mixId}>
              <span className="metric-label">{mix.name}</span>
              <strong className="metric-value">{formatMetricValue(mix.smokeCtaCount)}</strong>
            </article>
          ))
        ) : (
          <p className="meta-line">Пока нет данных по нажатиям `Выбрать`.</p>
        )}
      </div>
    </section>
  );

  const renderInventory = () => (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Инвентаризация</p>
          <h2>Табаки и наличие</h2>
        </div>
        <div className="status-chip">Обновляется с backend</div>
      </div>

      {inventoryStatus === 'loading' ? <p className="meta-line">Загружаем инвентарь...</p> : null}
      {inventoryError ? <p className="error-text">{inventoryError}</p> : null}

      <div className="inventory-grid">
        {inventory.map((item) => (
          <article className="inventory-card" key={item.id}>
            <div className="inventory-card__head">
              <div>
                <p className="inventory-manufacturer">{item.manufacturer}</p>
                <h3>{item.name}</h3>
              </div>
              <span className={item.inStock ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                {item.inStock ? 'В наличии' : 'Нет в наличии'}
              </span>
            </div>

            <div className="chip-row">
              {(item.flavorProfiles ?? []).map((profile) => (
                <span className="chip" key={`${item.id}:${profile}`}>
                  {profile}
                </span>
              ))}
            </div>

            <p className="meta-line">{(item.flavors ?? []).join(', ') || 'Нет привязанных вкусов'}</p>

            <button
              className="secondary-button secondary-button--inline"
              type="button"
              onClick={() => void onToggleStock(item)}
              disabled={toggleId === item.id}
            >
              {toggleId === item.id ? 'Сохраняем...' : item.inStock ? 'Убрать из наличия' : 'Вернуть в наличие'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  const renderMixes = () => (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Менеджер миксов</p>
          <h2>Каталог миксов</h2>
        </div>
        <div className="section-actions">
          <span className="status-chip">API: /staff/mixes</span>
          <button className="secondary-button secondary-button--inline" type="button" onClick={onResetMixEditor}>
            Новый микс
          </button>
        </div>
      </div>

      {mixesStatus === 'loading' ? <p className="meta-line">Загружаем миксы...</p> : null}
      {mixesError ? <p className="error-text">{mixesError}</p> : null}

      <div className="manager-layout">
        <aside className="entity-list">
          {mixes.map((mix) => (
            <article
              className={mixEditor.id === mix.id ? 'entity-card entity-card--active' : 'entity-card'}
              key={mix.id}
            >
              <div className="entity-card__head">
                <div>
                  <p className="entity-kicker">Микс</p>
                  <h3>{mix.name}</h3>
                </div>
                <span className={mix.available ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                  {mix.available ? 'Доступен' : 'Скрыт'}
                </span>
              </div>
              <p className="meta-line">{mix.description || 'Без описания'}</p>
              <p className="meta-line">Компоненты: {resolveMixComponentSummary(mix)}</p>
              <div className="chip-row">
                {mix.flavorProfiles.map((profile) => (
                  <span className="chip" key={`${mix.id}:profile:${profile}`}>
                    {profile}
                  </span>
                ))}
              </div>
              <p className="meta-line">Вкусы: {mix.flavors.join(', ') || 'Не указаны'}</p>
              <p className="meta-line">
                Рейтинг {mix.avgRating.toFixed(1)} · Популярность {mix.popularity}
              </p>
              <div className="entity-card__actions">
                <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectMix(mix)}>
                  Редактировать
                </button>
              </div>
            </article>
          ))}

          {!mixes.length && mixesStatus !== 'loading' ? <p className="meta-line">Пока нет миксов.</p> : null}
        </aside>

        <article className="editor-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">{mixEditor.id ? 'Редактирование микса' : 'Новый микс'}</p>
              <h3>{mixEditor.id ? mixEditor.name || 'Без названия' : 'Создать микс'}</h3>
            </div>
            <span className="status-chip">{mixEditor.available ? 'Доступен' : 'Скрыт'}</span>
          </div>

          <form className="admin-form" onSubmit={onSubmitMix}>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={mixEditor.name}
                  onChange={(event) => setMixEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например, Цитрусовый караван"
                />
              </label>

              <label className="field">
                <span className="field-label">Рейтинг</span>
                <input
                  className="text-input"
                  type="number"
                  step="0.1"
                  value={mixEditor.avgRating}
                  onChange={(event) => setMixEditor((current) => ({ ...current, avgRating: event.target.value }))}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={mixEditor.description}
                  onChange={(event) => setMixEditor((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Короткое описание микса"
                  rows={4}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">componentIds</span>
                <textarea
                  className="textarea-input"
                  value={mixEditor.componentIds}
                  onChange={(event) => setMixEditor((current) => ({ ...current, componentIds: event.target.value }))}
                  placeholder="mix-1, mix-2"
                  rows={3}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">flavorProfiles</span>
                <input
                  className="text-input"
                  value={mixEditor.flavorProfiles}
                  onChange={(event) => setMixEditor((current) => ({ ...current, flavorProfiles: event.target.value }))}
                  placeholder="fresh, citrus"
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">flavors</span>
                <input
                  className="text-input"
                  value={mixEditor.flavors}
                  onChange={(event) => setMixEditor((current) => ({ ...current, flavors: event.target.value }))}
                  placeholder="мята, лимон"
                />
              </label>

              <label className="field">
                <span className="field-label">Популярность</span>
                <input
                  className="text-input"
                  type="number"
                  step="1"
                  value={mixEditor.popularity}
                  onChange={(event) => setMixEditor((current) => ({ ...current, popularity: event.target.value }))}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={mixEditor.available}
                  onChange={(event) => setMixEditor((current) => ({ ...current, available: event.target.checked }))}
                />
                <span>Доступен для гостя</span>
              </label>
            </div>

            {mixSaveError ? <p className="error-text">{mixSaveError}</p> : null}

            <div className="form-actions">
              <button className="primary-button primary-button--inline" type="submit" disabled={mixSaveStatus === 'loading'}>
                {mixSaveStatus === 'loading' ? 'Сохраняем...' : mixEditor.id ? 'Сохранить микс' : 'Создать микс'}
              </button>
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetMixEditor}>
                Сбросить форму
              </button>
            </div>
          </form>
        </article>
      </div>

      <div className="manager-layout manager-layout--stacked manager-layout--spaced">
        <aside className="entity-list">
          {telegramRecipientsStatus === 'forbidden' ? (
            <article className="entity-card entity-card--muted">
              <p className="entity-kicker">Чаты Telegram</p>
              <h3>Только для admin</h3>
              <p className="meta-line">{telegramRecipientsError || 'У вас нет доступа к управлению чатами Telegram.'}</p>
            </article>
          ) : (
            telegramRecipients.map((recipient) => (
              <article
                className={telegramRecipientEditor.id === recipient.id ? 'entity-card entity-card--active' : 'entity-card'}
                key={recipient.id}
              >
                <div className="entity-card__head">
                  <div>
                    <p className="entity-kicker">Чат Telegram</p>
                    <h3>{recipient.label || `Чат ${recipient.chatId}`}</h3>
                  </div>
                  <span className={recipient.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                    {recipient.active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <div className="chip-row">
                  <span className="chip">{recipient.chatId}</span>
                  <span className="chip">{formatTelegramRecipientScope(recipient.scope)}</span>
                </div>
                <div className="entity-card__actions entity-card__actions--wrap">
                  <button
                    className="secondary-button secondary-button--inline"
                    type="button"
                    onClick={() => onSelectTelegramRecipient(recipient)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="secondary-button secondary-button--inline"
                    type="button"
                    onClick={() => void onToggleTelegramRecipientActive(recipient)}
                    disabled={telegramRecipientToggleId === recipient.id}
                  >
                    {telegramRecipientToggleId === recipient.id ? 'Сохраняем...' : recipient.active ? 'Деактивировать' : 'Активировать'}
                  </button>
                  <button
                    className="secondary-button secondary-button--inline"
                    type="button"
                    onClick={() => void onDeleteTelegramRecipient(recipient)}
                    disabled={telegramRecipientToggleId === recipient.id}
                  >
                    {telegramRecipientToggleId === recipient.id ? 'Удаляем...' : 'Удалить'}
                  </button>
                </div>
              </article>
            ))
          )}

          {telegramRecipientsStatus !== 'forbidden' && !telegramRecipients.length && telegramRecipientsStatus !== 'loading' ? (
            <p className="meta-line">Пока нет чатов Telegram.</p>
          ) : null}
        </aside>

        <article className="editor-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">
                {telegramRecipientEditor.id ? 'Редактирование чата Telegram' : 'Новый чат Telegram'}
              </p>
              <h3>{telegramRecipientEditor.id ? telegramRecipientEditor.label || 'Без названия' : 'Создать чат Telegram'}</h3>
            </div>
            <span className="status-chip">{formatTelegramRecipientScope(telegramRecipientEditor.scope)}</span>
          </div>

          {telegramRecipientsStatus === 'loading' ? <p className="meta-line">Загружаем чаты Telegram...</p> : null}
          {telegramRecipientsStatus === 'error' ? <p className="error-text">{telegramRecipientsError}</p> : null}
          {telegramRecipientsStatus === 'forbidden' ? <p className="meta-line">{telegramRecipientsError}</p> : null}

          {telegramRecipientsStatus !== 'forbidden' ? (
            <form className="admin-form" onSubmit={onSubmitTelegramRecipient}>
              <div className="form-grid form-grid--two">
                <label className="field">
                  <span className="field-label">Chat id Telegram</span>
                  <input
                    className="text-input"
                    value={telegramRecipientEditor.chatId}
                    onChange={(event) => setTelegramRecipientEditor((current) => ({ ...current, chatId: event.target.value }))}
                    placeholder="362223626"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Тип</span>
                  <select
                    className="select-input"
                    value={telegramRecipientEditor.scope}
                    onChange={(event) =>
                      setTelegramRecipientEditor((current) => ({
                        ...current,
                        scope: event.target.value as TelegramRecipientScope,
                      }))
                    }
                  >
                    {telegramRecipientScopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field--wide">
                  <span className="field-label">Подпись</span>
                  <input
                    className="text-input"
                    value={telegramRecipientEditor.label}
                    onChange={(event) => setTelegramRecipientEditor((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Основной staff-чат"
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={telegramRecipientEditor.active}
                    onChange={(event) =>
                      setTelegramRecipientEditor((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                  <span>Активен</span>
                </label>
              </div>

              {telegramRecipientSaveError ? <p className="error-text">{telegramRecipientSaveError}</p> : null}

              <div className="form-actions">
                <button
                  className="primary-button primary-button--inline"
                  type="submit"
                  disabled={telegramRecipientSaveStatus === 'loading'}
                >
                  {telegramRecipientSaveStatus === 'loading'
                    ? 'Сохраняем...'
                    : telegramRecipientEditor.id
                      ? 'Сохранить чат Telegram'
                      : 'Создать чат Telegram'}
                </button>
                <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramRecipientEditor}>
                  Сбросить форму
                </button>
                {telegramRecipientEditor.id ? (
                  <button
                    className="secondary-button secondary-button--inline"
                    type="button"
                    onClick={() =>
                      void onDeleteTelegramRecipient({
                        id: telegramRecipientEditor.id,
                        chatId: telegramRecipientEditor.chatId,
                        label: telegramRecipientEditor.label,
                        scope: telegramRecipientEditor.scope,
                        active: telegramRecipientEditor.active,
                      })
                    }
                    disabled={telegramRecipientToggleId === telegramRecipientEditor.id}
                  >
                    {telegramRecipientToggleId === telegramRecipientEditor.id ? 'Удаляем...' : 'Удалить чат'}
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="forbidden-panel">
              <p className="meta-line">Чаты Telegram недоступны для вашей роли.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );

  const renderRails = () => (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Менеджер рейлов</p>
          <h2>Рейлы Nomad</h2>
        </div>
        <div className="section-actions">
          <span className="status-chip">API: /staff/rails</span>
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
              className={railEditor.id === rail.id ? 'entity-card entity-card--active' : 'entity-card'}
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
              </div>
              <p className="meta-line">{rail.description || 'Без описания'}</p>
              <p className="meta-line">Миксы: {resolveRailMixSummary(rail, mixes)}</p>
              <div className="entity-card__actions">
                <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectRail(rail)}>
                  Редактировать
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
            <span className="status-chip">{railEditor.active ? 'Активен' : 'Неактивен'}</span>
          </div>

          <form className="admin-form" onSubmit={onSubmitRail}>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={railEditor.name}
                  onChange={(event) => setRailEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например, Топ по статистике"
                />
              </label>

              <label className="field">
                <span className="field-label">Тип</span>
                <select
                  className="select-input"
                  value={railEditor.type}
                  onChange={(event) =>
                    setRailEditor((current) => ({
                      ...current,
                      type: event.target.value as RailEditorState['type'],
                    }))
                  }
                >
                  {railTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={railEditor.description}
                  onChange={(event) => setRailEditor((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Короткое описание рейла"
                  rows={4}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">mixIds</span>
                <textarea
                  className="textarea-input"
                  value={railEditor.mixIds}
                  onChange={(event) => setRailEditor((current) => ({ ...current, mixIds: event.target.value }))}
                  placeholder="mix-1, mix-2"
                  rows={3}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={railEditor.active}
                  onChange={(event) => setRailEditor((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Активен в витрине</span>
              </label>
            </div>

            {railSaveError ? <p className="error-text">{railSaveError}</p> : null}

            <div className="form-actions">
              <button className="primary-button primary-button--inline" type="submit" disabled={railSaveStatus === 'loading'}>
                {railSaveStatus === 'loading' ? 'Сохраняем...' : railEditor.id ? 'Сохранить рейл' : 'Создать рейл'}
              </button>
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetRailEditor}>
                Сбросить форму
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

  const renderAccess = () => (
    <section className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Доступ</p>
          <h2>Коды доступа, сотрудники и Telegram</h2>
        </div>
        <div className="section-actions">
          <span className="status-chip">API: /staff/access/*</span>
          <button className="secondary-button secondary-button--inline" type="button" onClick={onResetDailyCodeEditor}>
            Новый код доступа
          </button>
          <button className="secondary-button secondary-button--inline" type="button" onClick={onResetTelegramRecipientEditor}>
            Новый чат Telegram
          </button>
        </div>
      </div>

      <p className="meta-line">
        Коды доступа доступны всем staff-ролям. Аккаунты сотрудников и чаты Telegram управляются только admin.
      </p>

      <div className="summary-grid automation-grid">
        <article className="metric-card automation-card">
          <p className="metric-label">Telegram automation</p>
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
          {telegramAutomationState?.lastErrorMessage ? (
            <p className="meta-line">Последняя ошибка: {telegramAutomationState.lastErrorMessage}</p>
          ) : (
            <p className="meta-line">Последняя ошибка: нет</p>
          )}
          {telegramAutomationStateStatus === 'loading' ? <p className="meta-line">Загружаем статус бота...</p> : null}
          {telegramAutomationStateStatus === 'error' ? <p className="error-text">{telegramAutomationStateError}</p> : null}
          {telegramAutomationStateStatus === 'forbidden' ? <p className="meta-line">{telegramAutomationStateError}</p> : null}
        </article>

        <article className="metric-card automation-card">
          <p className="metric-label">Последние действия</p>
          <p className="meta-line">Авторассылка: {formatDateTimeDisplay(telegramAutomationState?.lastBroadcastAt ?? '')}</p>
          <p className="meta-line">
            Код авторассылки: {telegramAutomationState?.lastBroadcastCodeValue || 'Не указано'}
          </p>
          <p className="meta-line">День авторассылки: {telegramAutomationState?.lastBroadcastDayKey || 'Не указано'}</p>
          <p className="meta-line">Ротация: {formatDateTimeDisplay(telegramAutomationState?.lastRotateAt ?? '')}</p>
          <p className="meta-line">Код ротации: {telegramAutomationState?.lastRotateCodeValue || 'Не указано'}</p>
        </article>

        <article className="metric-card automation-card">
          <p className="metric-label">Telegram чаты</p>
          <p className="meta-line">
            Разрешённые: {telegramRecipients.filter((item) => item.scope === 'allowed' && item.active).length}
          </p>
          <p className="meta-line">
            Авторассылка: {telegramRecipients.filter((item) => item.scope === 'broadcast' && item.active).length}
          </p>
          <p className="meta-line">
            Ротация: {telegramRecipients.filter((item) => item.scope === 'rotate' && item.active).length}
          </p>
          <p className="meta-line">
            Всего записей: {telegramRecipients.length}
          </p>
        </article>
      </div>

      <div className="manager-layout manager-layout--stacked">
        <aside className="entity-list">
          {dailyCodes.map((code) => (
            <article className={dailyCodeEditor.id === code.id ? 'entity-card entity-card--active' : 'entity-card'} key={code.id}>
              <div className="entity-card__head">
                <div>
                  <p className="entity-kicker">Код доступа</p>
                  <h3>{code.codeLabel || 'Код доступа'}</h3>
                </div>
                <span className={code.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                  {code.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <p className="code-value">{code.codeValue || 'Код не указан'}</p>
              <p className="meta-line">Начало: {formatDateTimeDisplay(code.startsAt)}</p>
              <p className="meta-line">Окончание: {formatDateTimeDisplay(code.endsAt)}</p>
              <div className="entity-card__actions entity-card__actions--wrap">
                <button className="secondary-button secondary-button--inline" type="button" onClick={() => onSelectDailyCode(code)}>
                  Редактировать
                </button>
                <button
                  className="secondary-button secondary-button--inline"
                  type="button"
                  onClick={() => void onToggleDailyCodeActive(code)}
                  disabled={dailyCodeToggleId === code.id}
                >
                  {dailyCodeToggleId === code.id ? 'Сохраняем...' : code.active ? 'Деактивировать' : 'Активировать'}
                </button>
                <button
                  className="secondary-button secondary-button--inline"
                  type="button"
                  onClick={() => void onDeleteDailyCode(code)}
                  disabled={dailyCodeToggleId === code.id}
                >
                  {dailyCodeToggleId === code.id ? 'Удаляем...' : 'Удалить'}
                </button>
              </div>
            </article>
          ))}

          {!dailyCodes.length && dailyCodesStatus !== 'loading' ? <p className="meta-line">Пока нет кодов доступа.</p> : null}
        </aside>

        <article className="editor-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">{dailyCodeEditor.id ? 'Редактирование кода доступа' : 'Новый код доступа'}</p>
              <h3>{dailyCodeEditor.id ? dailyCodeEditor.codeLabel || 'Код доступа' : 'Создать код доступа'}</h3>
            </div>
            <span className="status-chip">{dailyCodeEditor.active ? 'Активен' : 'Неактивен'}</span>
          </div>

          {dailyCodesStatus === 'loading' ? <p className="meta-line">Загружаем коды доступа...</p> : null}
          {dailyCodesError ? <p className="error-text">{dailyCodesError}</p> : null}

          <form className="admin-form" onSubmit={onSubmitDailyCode}>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Код</span>
                <input
                  className="text-input"
                  value={dailyCodeEditor.codeValue}
                  onChange={(event) => setDailyCodeEditor((current) => ({ ...current, codeValue: event.target.value }))}
                  placeholder="NOMAD-2026"
                />
              </label>

              <label className="field">
                <span className="field-label">Подпись</span>
                <input
                  className="text-input"
                  value={dailyCodeEditor.codeLabel}
                  onChange={(event) => setDailyCodeEditor((current) => ({ ...current, codeLabel: event.target.value }))}
                  placeholder="Код на сегодня"
                />
              </label>

              <label className="field">
                <span className="field-label">Начало действия</span>
                <input
                  className="text-input"
                  type="datetime-local"
                  value={dailyCodeEditor.startsAt}
                  onChange={(event) => setDailyCodeEditor((current) => ({ ...current, startsAt: event.target.value }))}
                />
              </label>

              <label className="field">
                <span className="field-label">Окончание действия</span>
                <input
                  className="text-input"
                  type="datetime-local"
                  value={dailyCodeEditor.endsAt}
                  onChange={(event) => setDailyCodeEditor((current) => ({ ...current, endsAt: event.target.value }))}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={dailyCodeEditor.active}
                  onChange={(event) => setDailyCodeEditor((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Активен</span>
              </label>
            </div>

            {dailyCodeSaveError ? <p className="error-text">{dailyCodeSaveError}</p> : null}

            <div className="form-actions">
              <button className="primary-button primary-button--inline" type="submit" disabled={dailyCodeSaveStatus === 'loading'}>
                {dailyCodeSaveStatus === 'loading' ? 'Сохраняем...' : dailyCodeEditor.id ? 'Сохранить код доступа' : 'Создать код доступа'}
              </button>
              <button className="secondary-button secondary-button--inline" type="button" onClick={onResetDailyCodeEditor}>
                Сбросить форму
              </button>
              {dailyCodeEditor.id ? (
                <button
                  className="secondary-button secondary-button--inline"
                  type="button"
                  onClick={() =>
                    void onDeleteDailyCode({
                      id: dailyCodeEditor.id,
                      codeValue: dailyCodeEditor.codeValue,
                      codeLabel: dailyCodeEditor.codeLabel,
                      startsAt: parseDateTimeLocalInput(dailyCodeEditor.startsAt),
                      endsAt: parseDateTimeLocalInput(dailyCodeEditor.endsAt),
                      active: dailyCodeEditor.active,
                    })
                  }
                  disabled={dailyCodeToggleId === dailyCodeEditor.id}
                >
                  {dailyCodeToggleId === dailyCodeEditor.id ? 'Удаляем...' : 'Удалить код'}
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </div>

      <div className="manager-layout manager-layout--stacked manager-layout--spaced">
        <aside className="entity-list">
          {staffAccountsStatus === 'forbidden' ? (
            <article className="entity-card entity-card--muted">
              <p className="entity-kicker">Аккаунты сотрудников</p>
              <h3>Только для admin</h3>
              <p className="meta-line">{staffAccountsError || 'У вас нет доступа к управлению аккаунтами сотрудников.'}</p>
            </article>
          ) : (
            staffAccounts.map((account) => (
              <article
                className={staffAccountEditor.id === account.id ? 'entity-card entity-card--active' : 'entity-card'}
                key={account.id}
              >
                <div className="entity-card__head">
                  <div>
                    <p className="entity-kicker">Аккаунт сотрудника</p>
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
                    placeholder="nomad"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Имя</span>
                  <input
                    className="text-input"
                    value={staffAccountEditor.name}
                    onChange={(event) => setStaffAccountEditor((current) => ({ ...current, name: event.target.value }))}
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
    </section>
  );

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
        </section>

        <section className="summary-grid">
          {readSummaryCards(summary).map((card) => (
            <article className="metric-card" key={card.label}>
              <span className="metric-label">{card.label}</span>
              <strong className="metric-value">{formatMetricValue(card.value)}</strong>
            </article>
          ))}
        </section>

        <section className="card card--compact">
          <div className="workspace-tabs">
            {(['dashboard', 'inventory', 'mixes', 'rails', 'access'] as WorkspaceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'dashboard'
                  ? 'Дашборд'
                  : tab === 'inventory'
                    ? 'Инвентаризация'
                    : tab === 'mixes'
                      ? 'Миксы'
                      : tab === 'rails'
                        ? 'Рейлы'
                        : 'Доступ'}
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
        <p className="lead">Используйте учётные данные `admin` или `nomad`.</p>
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
        <div className="status-chip">Bearer token в sessionStorage</div>
        <p className="meta-line">API: {apiBaseUrl}</p>
      </section>
    </main>
  );
};
