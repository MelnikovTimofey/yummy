import { FormEvent, useEffect, useState } from 'react';
import {
  DashboardSummary,
  InventoryTobacco,
  StaffAuthResponse,
  StaffUser,
  formatMetricValue,
  sortInventoryItems,
} from './contracts';

const STORAGE_KEY = 'nomad-master-auth-v1';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

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

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Запрос не выполнен');
  }

  return payload as T;
};

const readSummaryCards = (summary: DashboardSummary | null) => {
  if (!summary) {
    return [
      { label: 'Всего табаков', value: 0 },
      { label: 'В наличии', value: 0 },
      { label: 'Не в наличии', value: 0 },
      { label: 'Нажатия Покурить', value: 0 },
    ];
  }

  return [
    { label: 'Всего табаков', value: summary.totalTobaccos },
    { label: 'В наличии', value: summary.inStockCount },
    { label: 'Не в наличии', value: summary.outOfStockCount },
    { label: 'Нажатия Покурить', value: summary.smokeCtaTotal },
  ];
};

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState<StaffUser | null>(null);
  const [inventory, setInventory] = useState<InventoryTobacco[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [toggleId, setToggleId] = useState('');

  const loadWorkspace = async (nextToken: string) => {
    setSummaryStatus('loading');
    setInventoryStatus('loading');

    try {
      const [inventoryResponse, summaryResponse] = await Promise.all([
        requestJson<{ items: InventoryTobacco[] }>('/staff/inventory/tobaccos', {}, nextToken),
        requestJson<DashboardSummary>('/staff/dashboard/summary', {}, nextToken),
      ]);

      setInventory(sortInventoryItems(inventoryResponse.items));
      setSummary(summaryResponse);
      setInventoryStatus('ready');
      setSummaryStatus('ready');
    } catch (cause) {
      setInventoryStatus('error');
      setSummaryStatus('error');
      throw cause;
    }
  };

  useEffect(() => {
    const hydrate = async () => {
      if (!token) {
        return;
      }

      setStatus('loading');
      try {
        const response = await requestJson<{ user: StaffUser }>('/staff/auth/me', {}, token);
        setUser(response.user);
        await loadWorkspace(token);
        setStatus('ready');
      } catch {
        storeToken('');
        setToken('');
        setUser(null);
        setStatus('idle');
      }
    };

    void hydrate();
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
      const profile = await requestJson<{ user: StaffUser }>('/staff/auth/me', {}, auth.accessToken);

      storeToken(auth.accessToken);
      setToken(auth.accessToken);
      setUser(profile.user);
      await loadWorkspace(auth.accessToken);
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
    setStatus('idle');
    setError('');
    setPassword('');
  };

  const onToggleStock = async (item: InventoryTobacco) => {
    if (!token) {
      return;
    }

    const nextInStock = !item.inStock;
    setToggleId(item.id);
    setError('');

    try {
      const response = await requestJson<{ item: InventoryTobacco }>(
        `/staff/inventory/tobaccos/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ inStock: nextInStock }),
        },
        token,
      );

      const nextInventory = inventory.map((current) =>
        current.id === response.item.id ? response.item : current,
      );

      setInventory(sortInventoryItems(nextInventory));
      await loadWorkspace(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось обновить наличие');
    } finally {
      setToggleId('');
    }
  };

  if (user) {
    return (
      <main className="shell shell--master">
        <section className="hero hero--master">
          <p className="eyebrow">Nomad Master</p>
          <h1>Staff dashboard</h1>
          <p className="lead">
            Вы вошли как {user.name} ({user.role}). Здесь обновляется инвентарь и смотрится сводка по
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

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Инвентаризация</p>
              <h2>Табаки и наличие</h2>
            </div>
            <div className="status-chip">Bearer token в sessionStorage</div>
          </div>

          {inventoryStatus === 'loading' ? <p className="meta-line">Загружаем инвентарь...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

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
                  className="secondary-button"
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

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Дашборд</p>
              <h2>Сводка Nomad</h2>
            </div>
            <div className="status-chip">Обновляется с backend</div>
          </div>

          {summaryStatus === 'loading' ? <p className="meta-line">Загружаем сводку...</p> : null}

          <div className="top-mixes">
            {(summary?.topMixes ?? []).length ? (
              summary.topMixes.map((mix) => (
                <article className="top-mix-card" key={mix.mixId}>
                  <span className="metric-label">{mix.name}</span>
                  <strong className="metric-value">{formatMetricValue(mix.smokeCtaCount)}</strong>
                </article>
              ))
            ) : (
              <p className="meta-line">Пока нет данных по нажатиям `Покурить`.</p>
            )}
          </div>
        </section>

        <section className="card card--compact">
          <button className="secondary-button" type="button" onClick={onSignOut}>
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
