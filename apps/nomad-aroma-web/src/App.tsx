import { FormEvent, useEffect, useState } from 'react';

type GuestAccessSuccess = {
  ok: true;
  accessGranted: true;
  message: string;
  issuedAt: string;
  nextStep: 'intro' | 'onboarding';
};

const storageKeys = {
  ageConfirmed: 'nomad-aroma-age-confirmed',
  accessGranted: 'nomad-aroma-access-granted',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const fetchGuestAccess = async (code: string) => {
  const response = await fetch(`${apiBaseUrl}/guest/access-code/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Не удалось проверить код доступа');
  }

  return (await response.json()) as GuestAccessSuccess;
};

export const App = () => {
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(storageKeys.ageConfirmed) === 'true');
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(storageKeys.accessGranted) === 'true');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (ageConfirmed) {
      localStorage.setItem(storageKeys.ageConfirmed, 'true');
    }
  }, [ageConfirmed]);

  useEffect(() => {
    if (accessGranted) {
      localStorage.setItem(storageKeys.accessGranted, 'true');
    }
  }, [accessGranted]);

  const onAgeConfirm = () => {
    setAgeConfirmed(true);
  };

  const onReset = () => {
    setAgeConfirmed(false);
    setAccessGranted(false);
    setCode('');
    setStatus('idle');
    setError('');
    setSuccessMessage('');
    localStorage.removeItem(storageKeys.ageConfirmed);
    localStorage.removeItem(storageKeys.accessGranted);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = code.trim();

    if (!trimmed) {
      setError('Введите код доступа');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const result = await fetchGuestAccess(trimmed);
      setAccessGranted(true);
      setSuccessMessage(result.message);
      setStatus('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось проверить код доступа');
      setStatus('error');
    }
  };

  if (!ageConfirmed) {
    return (
      <main className="shell shell--guest">
        <section className="hero hero--guest">
          <p className="eyebrow">Nomad Aroma Atelier</p>
          <h1>Подтвердите возраст</h1>
          <p className="lead">
            Это гостевой сценарий Nomad. Для продолжения подтвердите, что вам есть 18 лет.
          </p>
        </section>

        <section className="card card--compact">
          <button className="primary-button" type="button" onClick={onAgeConfirm}>
            Мне есть 18 лет
          </button>
          <button className="secondary-button" type="button" onClick={onReset}>
            Я не могу продолжить
          </button>
        </section>
      </main>
    );
  }

  if (accessGranted) {
    return (
      <main className="shell shell--guest">
        <section className="hero hero--success">
          <p className="eyebrow">Доступ подтвержден</p>
          <h1>Арома Ателье открыто</h1>
          <p className="lead">
            {successMessage || 'Можно переходить к знакомству, онбордингу и подбору микса.'}
          </p>
        </section>

        <section className="card">
          <div className="status-chip">Шаг 1 завершён</div>
          <p>Следующий этап: intro и onboarding. Карточка микса появится на следующем slice.</p>
          <p className="meta-line">API: {apiBaseUrl}</p>
        </section>

        <section className="card card--compact">
          <button className="secondary-button" type="button" onClick={onReset}>
            Сменить код
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--guest">
      <section className="hero">
        <p className="eyebrow">Nomad Aroma Atelier</p>
        <h1>Ввод кода доступа</h1>
        <p className="lead">
          Введите ежедневный код, который сказал кальянный мастер или официант.
        </p>
      </section>

      <section className="card">
        <form className="guest-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Код доступа</span>
            <input
              className="text-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Например, NOMAD-2026"
              autoComplete="one-time-code"
              inputMode="text"
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Проверяем...' : 'Проверить код'}
          </button>
        </form>
      </section>

      <section className="card card--compact">
        <div className="status-chip">18+ подтвержден</div>
        <p className="meta-line">API: {apiBaseUrl}</p>
      </section>
    </main>
  );
};
