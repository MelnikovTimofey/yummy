import { FormEvent, useEffect, useState } from 'react';
import {
  DashboardSummary,
  InventoryTobacco,
  MixRecord,
  RailRecord,
  StaffAuthResponse,
  StaffUser,
  buildInventorySummary,
  formatDelimitedList,
  formatMetricValue,
  formatRailType,
  normalizeDashboardSummary,
  normalizeMixRecord,
  normalizeRailRecord,
  parseDelimitedList,
  railTypeOptions,
  readEntityPayload,
  readListPayload,
  sortInventoryItems,
  sortMixes,
  sortRails,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

type WorkspaceTab = 'dashboard' | 'inventory' | 'mixes' | 'rails';

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
    throw new Error(error);
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
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixesStatus, setMixesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railsStatus, setRailsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inventoryError, setInventoryError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [mixesError, setMixesError] = useState('');
  const [railsError, setRailsError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixSaveStatus, setMixSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
  const [railSaveStatus, setRailSaveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [railSaveError, setRailSaveError] = useState('');

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
        await Promise.all([loadInventory(token), loadSummary(token), loadMixes(token), loadRails(token)]);
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
      await Promise.all([loadInventory(auth.accessToken), loadSummary(auth.accessToken), loadMixes(auth.accessToken), loadRails(auth.accessToken)]);
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
    setInventoryError('');
    setSummaryError('');
    setMixesError('');
    setRailsError('');
    setToggleId('');
    setMixEditor(emptyMixEditor());
    setMixSaveStatus('idle');
    setMixSaveError('');
    setRailEditor(emptyRailEditor());
    setRailSaveStatus('idle');
    setRailSaveError('');
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

  if (user) {
    return (
      <main className="shell shell--master">
        <section className="hero hero--master">
          <p className="eyebrow">Nomad Master</p>
          <h1>Staff dashboard</h1>
          <p className="lead">
            Вы вошли как {user.name} ({user.role}). Здесь обновляется инвентарь, миксы, рейлы и сводка по
            действиям гостей.
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
            {(['dashboard', 'inventory', 'mixes', 'rails'] as WorkspaceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'dashboard' ? 'Дашборд' : tab === 'inventory' ? 'Инвентаризация' : tab === 'mixes' ? 'Миксы' : 'Рейлы'}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'inventory' ? renderInventory() : null}
        {activeTab === 'mixes' ? renderMixes() : null}
        {activeTab === 'rails' ? renderRails() : null}

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
        <h1>Вход для staff</h1>
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
