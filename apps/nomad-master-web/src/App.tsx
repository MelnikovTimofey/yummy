import { FormEvent, useEffect, useState } from 'react';

type StaffUser = {
  login: string;
  name: string;
  role: 'admin' | 'nomad';
};

type StaffAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: StaffUser;
};

const storageKeys = {
  token: 'nomad-master-token',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const requestJson = async <T,>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Запрос не выполнен');
  }

  return (await response.json()) as T;
};

export const App = () => {
  const [login, setLogin] = useState('nomad');
  const [password, setPassword] = useState('nomad');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKeys.token) ?? '');

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
        sessionStorage.removeItem(storageKeys.token);
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
      const response = await requestJson<StaffAuthResponse>('/staff/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });

      sessionStorage.setItem(storageKeys.token, response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setStatus('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти');
      setStatus('error');
    }
  };

  const onSignOut = () => {
    sessionStorage.removeItem(storageKeys.token);
    setToken('');
    setUser(null);
    setStatus('idle');
    setError('');
    setPassword('nomad');
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
            <li>Инвентаризация</li>
            <li>Менеджер миксов</li>
            <li>Менеджер рейлов</li>
            <li>Дашборды</li>
          </ul>
          <p className="meta-line">API: {apiBaseUrl}</p>
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
      <section className="hero">
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
        <div className="status-chip">Bearer token</div>
        <p className="meta-line">API: {apiBaseUrl}</p>
      </section>
    </main>
  );
};
