import { FormEvent, useEffect, useState } from 'react';

type OnboardingOptions = {
  profiles: string[];
  flavors: string[];
};

type GuestAccessSuccess = {
  ok: true;
  accessGranted: true;
  message: string;
  issuedAt: string;
  nextStep: 'intro' | 'onboarding';
};

type RecommendationMix = {
  id: string;
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  score: number;
  avgRating: number;
  popularity: number;
  components: Array<{
    id: string;
    name: string;
    manufacturer: string;
    flavors: string[];
  }>;
};

type SmokeCtaResult = {
  ok: true;
};

const storageKeys = {
  ageConfirmed: 'nomad-aroma-age-confirmed',
  accessGranted: 'nomad-aroma-access-granted',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';

const formatLabel = (value: string) =>
  value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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

const fetchOnboardingOptions = async () => {
  const response = await fetch(`${apiBaseUrl}/guest/onboarding/options`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить варианты онбординга');
  }

  return (await response.json()) as OnboardingOptions;
};

const fetchRecommendations = async (payload: { likedProfiles: string[]; likedFlavors: string[] }) => {
  const response = await fetch(`${apiBaseUrl}/guest/onboarding/recommendations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Не удалось получить рекомендации');
  }

  return (await response.json()) as {
    items: RecommendationMix[];
    onboarding: {
      likedProfiles: string[];
      likedFlavors: string[];
    };
  };
};

const sendSmokeCta = async (mixId: string) => {
  const response = await fetch(`${apiBaseUrl}/guest/events/smoke-cta`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ mixId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Не удалось записать действие');
  }

  return (await response.json().catch(() => ({ ok: true }))) as SmokeCtaResult;
};

const toggleSelection = (value: string, items: string[]) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const App = () => {
  const [ageConfirmed, setAgeConfirmed] = useState(() => localStorage.getItem(storageKeys.ageConfirmed) === 'true');
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(storageKeys.accessGranted) === 'true');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [options, setOptions] = useState<OnboardingOptions>({ profiles: [], flavors: [] });
  const [optionsStatus, setOptionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [likedFlavors, setLikedFlavors] = useState<string[]>([]);
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recommendations, setRecommendations] = useState<RecommendationMix[]>([]);
  const [selectedMix, setSelectedMix] = useState<RecommendationMix | null>(null);
  const [smokeCtaStatus, setSmokeCtaStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [smokeCtaError, setSmokeCtaError] = useState('');

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

  useEffect(() => {
    if (!accessGranted || optionsStatus !== 'idle') {
      return;
    }

    setOptionsStatus('loading');
    fetchOnboardingOptions()
      .then((nextOptions) => {
        setOptions(nextOptions);
        setOptionsStatus('ready');
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить варианты онбординга');
        setOptionsStatus('error');
      });
  }, [accessGranted, optionsStatus]);

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
    setOptions({ profiles: [], flavors: [] });
    setOptionsStatus('idle');
    setLikedProfiles([]);
    setLikedFlavors([]);
    setRecommendationStatus('idle');
    setRecommendations([]);
    setSelectedMix(null);
    setSmokeCtaStatus('idle');
    setSmokeCtaError('');
    localStorage.removeItem(storageKeys.ageConfirmed);
    localStorage.removeItem(storageKeys.accessGranted);
  };

  const onSubmitAccessCode = async (event: FormEvent<HTMLFormElement>) => {
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

  const onSubmitOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!likedProfiles.length && !likedFlavors.length) {
      setError('Выберите хотя бы один профиль или вкус');
      setRecommendationStatus('error');
      return;
    }

    setRecommendationStatus('loading');
    setError('');

    try {
      const response = await fetchRecommendations({
        likedProfiles,
        likedFlavors,
      });
      setRecommendations(response.items);
      setSelectedMix(null);
      setRecommendationStatus('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось получить рекомендации');
      setRecommendationStatus('error');
    }
  };

  const onSmokeCta = async (mix: RecommendationMix) => {
    setSmokeCtaStatus('loading');
    setSmokeCtaError('');

    try {
      await sendSmokeCta(mix.id);
      setSelectedMix(mix);
      setSmokeCtaStatus('ready');
    } catch (cause) {
      setSmokeCtaError(cause instanceof Error ? cause.message : 'Не удалось записать действие');
      setSmokeCtaStatus('error');
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
          <button className="primary-btn" type="button" onClick={onAgeConfirm}>
            Мне есть 18 лет
          </button>
          <button className="secondary-btn" type="button" onClick={onReset}>
            Я не могу продолжить
          </button>
        </section>
      </main>
    );
  }

  if (accessGranted && selectedMix) {
    return (
      <main className="shell shell--guest">
        <section className="hero hero--success">
          <p className="eyebrow">Готово к показу мастеру</p>
          <h1>{selectedMix.name}</h1>
          <p className="lead">{selectedMix.description}</p>
        </section>

        <section className="card success-card">
          <div className="pill">Записано в аналитику лаунжа</div>
          <p className="hint-text">
            Нажатие `Выбрать` сохранено и теперь можно показать эту карточку кальянному мастеру.
          </p>
          <div className="status-grid">
            <div className="status-tile">
              <span className="status-label">Профили</span>
              <strong>{selectedMix.flavorProfiles.map(formatLabel).join(', ')}</strong>
            </div>
            <div className="status-tile">
              <span className="status-label">Вкусы</span>
              <strong>{selectedMix.flavors.join(', ')}</strong>
            </div>
            <div className="status-tile">
              <span className="status-label">Рейтинг</span>
              <strong>{selectedMix.avgRating.toFixed(1)}</strong>
            </div>
            <div className="status-tile">
              <span className="status-label">Популярность</span>
              <strong>{selectedMix.popularity}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Состав микса</h2>
          <ul className="step-list">
            {selectedMix.components.map((component) => (
              <li key={component.id}>
                {component.name} · {component.manufacturer} · {component.flavors.join(', ')}
              </li>
            ))}
          </ul>
        </section>

        <section className="card card--compact card-actions">
          <button className="secondary-btn" type="button" onClick={() => setSelectedMix(null)}>
            Выбрать другой микс
          </button>
          <button className="secondary-btn" type="button" onClick={onReset}>
            Завершить сессию
          </button>
        </section>
      </main>
    );
  }

  if (accessGranted && recommendations.length) {
    return (
      <main className="shell shell--guest">
        <section className="hero hero--success">
          <p className="eyebrow">Подборка готова</p>
          <h1>Рекомендации для вас</h1>
          <p className="lead">
            {successMessage || 'Ниже лучшие миксы по вашему онбордингу и текущему наличию.'}
          </p>
        </section>

        <section className="card card--compact card-actions">
          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              setRecommendations([]);
              setRecommendationStatus('idle');
              setSelectedMix(null);
            }}
          >
            Изменить ответы
          </button>
          <button className="secondary-btn" type="button" onClick={onReset}>
            Сбросить гостевой доступ
          </button>
        </section>

        <section className="recommendation-grid">
          {recommendations.map((mix) => (
            <article className="mix-card" key={mix.id}>
              <div className="mix-card__head">
                <p className="eyebrow mix-card__eyebrow">Score {mix.score.toFixed(0)}</p>
                <h2>{mix.name}</h2>
              </div>
              <p className="hint-text">{mix.description}</p>
              <div className="hero-meta">
                {mix.flavorProfiles.map((profile) => (
                  <span className="pill" key={profile}>
                    {formatLabel(profile)}
                  </span>
                ))}
              </div>
              <p className="meta-line">Вкусы: {mix.flavors.join(', ')}</p>
              <p className="meta-line">
                Рейтинг {mix.avgRating.toFixed(1)} · Популярность {mix.popularity}
              </p>
              <button className="primary-btn" type="button" onClick={() => void onSmokeCta(mix)} disabled={smokeCtaStatus === 'loading'}>
                {smokeCtaStatus === 'loading' ? 'Сохраняем...' : 'Выбрать'}
              </button>
            </article>
          ))}
        </section>
        {smokeCtaError ? <section className="card card--compact"><p className="error-text">{smokeCtaError}</p></section> : null}
      </main>
    );
  }

  if (accessGranted) {
    return (
      <main className="shell shell--guest">
        <section className="hero">
          <p className="eyebrow">Nomad Aroma Atelier</p>
          <h1>Быстрый онбординг</h1>
          <p className="lead">
            {successMessage || 'Выберите, что хочется покурить, и мы соберём рекомендации из доступных миксов.'}
          </p>
        </section>

        <section className="card accent-card">
          <div className="pill">Шаг 2: подбор вкуса</div>
          <form className="onboarding-form" onSubmit={onSubmitOnboarding}>
            <div className="choice-group">
              <h2>Профили вкуса</h2>
              <div className="choice-grid">
                {options.profiles.map((profile) => (
                  <button
                    className={likedProfiles.includes(profile) ? 'choice-chip choice-chip--active' : 'choice-chip'}
                    key={profile}
                    type="button"
                    onClick={() => setLikedProfiles((current) => toggleSelection(profile, current))}
                  >
                    {formatLabel(profile)}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-group">
              <h2>Вкусы</h2>
              <div className="choice-grid">
                {options.flavors.map((flavor) => (
                  <button
                    className={likedFlavors.includes(flavor) ? 'choice-chip choice-chip--active' : 'choice-chip'}
                    key={flavor}
                    type="button"
                    onClick={() => setLikedFlavors((current) => toggleSelection(flavor, current))}
                  >
                    {formatLabel(flavor)}
                  </button>
                ))}
              </div>
            </div>

            {optionsStatus === 'loading' ? <p className="hint-text">Загружаем варианты онбординга...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            <div className="card-actions">
              <button
                className="primary-btn"
                type="submit"
                disabled={optionsStatus !== 'ready' || recommendationStatus === 'loading'}
              >
                {recommendationStatus === 'loading' ? 'Подбираем...' : 'Показать рекомендации'}
              </button>
              <button className="secondary-btn" type="button" onClick={onReset}>
                Сбросить доступ
              </button>
            </div>
          </form>
        </section>

        <section className="card card--compact">
          <div className="pill">18+ и код подтверждены</div>
          <p className="meta-line">API: {apiBaseUrl}</p>
          {smokeCtaStatus === 'ready' ? <p className="meta-line">Событие `Выбрать` отправлено в аналитику.</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="shell shell--guest">
      <section className="hero">
        <p className="eyebrow">Nomad Aroma Atelier</p>
        <h1>Ввод кода доступа</h1>
        <p className="lead">Введите ежедневный код, который сказал кальянный мастер или официант.</p>
      </section>

      <section className="card accent-card">
        <form className="code-form" onSubmit={onSubmitAccessCode}>
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

          <button className="primary-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Проверяем...' : 'Проверить код'}
          </button>
        </form>
      </section>

      <section className="card card--compact">
        <div className="pill">18+ подтвержден</div>
        <p className="meta-line">API: {apiBaseUrl}</p>
      </section>
    </main>
  );
};
