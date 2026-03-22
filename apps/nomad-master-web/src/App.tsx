import { FormEvent, useEffect, useState } from 'react';

type StaffUser = {
  login: string;
  name: string;
  role: 'admin' | 'nomad';
};

type StaffAuthResponse = {
  accessToken: string;
  tokenType?: 'Bearer';
  user: StaffUser;
};

const STORAGE_KEY = 'nomad-master-auth-v1';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const masterModules = ['Инвентаризация', 'Менеджер миксов', 'Менеджер рейлов', 'Дашборды'];

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

const requestJson = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Запрос не выполнен');
  }

  return payload as T;
};

export const App = () => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      if (!token) {
        return;
      }

      setStatus('loading');
      try {
        const response = await requestJson<{ user: StaffUser }>('/staff/auth/me', {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        setUser(response.user);
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
      const profile = await requestJson<{ user: StaffUser }>('/staff/auth/me', {
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      });

      storeToken(auth.accessToken);
      setToken(auth.accessToken);
      setUser(profile.user);
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
    setStatus('idle');
    setError('');
    setPassword('');
  };

  if (user) {
    return (
      <main className="shell shell--master">
        <section className="hero hero--master">
          <p className="eyebrow">Nomad Master</p>
          <h1>Доступ открыт</h1>
          <p className="lead">
            Вы вошли как {user.name} ({user.role}). Это стартовый shell для Phase 1.
          </p>
        </section>

        <section className="card">
          <h2>Следующий контур</h2>
          <ul>
            {masterModules.map((moduleName) => (
              <li key={moduleName}>{moduleName}</li>
            ))}
          </ul>
          <p className="meta-line">API: {apiBaseUrl}</p>
          <p className="meta-line">Логин: {user.login}</p>
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
