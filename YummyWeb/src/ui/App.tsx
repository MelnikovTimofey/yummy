import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../shared/api';
import { verifyMagicLink } from '../shared/apiClient';
import { loadAuthState, saveAuthState } from '../shared/authStorage';
import { AuthState } from '../shared/types';
import { AuthScreen } from './AuthScreen';
import { CatalogScreen } from './CatalogScreen';
import { MixesScreen } from './MixesScreen';
import { RecommendationsScreen } from './RecommendationsScreen';
import { SessionsScreen } from './SessionsScreen';

type TabKey = 'mixes' | 'sessions' | 'catalog' | 'recommendations' | 'profile';

type Tab = {
  key: TabKey;
  label: string;
  title: string;
  subtitle: string;
};

const TABS: Tab[] = [
  {
    key: 'mixes',
    label: 'Миксы',
    title: 'Миксы',
    subtitle: 'Создавайте и переиспользуйте удачные сочетания.',
  },
  {
    key: 'sessions',
    label: 'Сессии',
    title: 'Сессии курения',
    subtitle: 'Добавляйте сессии и сохраняйте контекст: где и когда.',
  },
  {
    key: 'catalog',
    label: 'Каталог',
    title: 'Каталог табаков',
    subtitle: 'Фильтры и поиск по брендам, профилям и крепости.',
  },
  {
    key: 'recommendations',
    label: 'Подборка',
    title: 'Подборка',
    subtitle: 'Подборка миксов на основе ваших оценок и истории.',
  },
  {
    key: 'profile',
    label: 'Профиль',
    title: 'Профиль',
    subtitle: 'Настройка предпочтений и любимых производителей.',
  },
];

export const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('mixes');
  const [authState, setAuthState] = useState<AuthState>(() => loadAuthState());
  const [authChecking, setAuthChecking] = useState(false);
  const tab = useMemo(() => TABS.find((item) => item.key === activeTab) ?? TABS[0], [activeTab]);

  const onAuthUpdate = useCallback((next: AuthState) => {
    setAuthState(next);
    saveAuthState(next);
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      return;
    }

    setAuthChecking(true);
    verifyMagicLink(token)
      .then((response) => {
        onAuthUpdate({
          tokens: {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          },
          user: response.user,
        });
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(() => {
        setAuthChecking(false);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [onAuthUpdate]);

  if (authChecking) {
    return (
      <div className="app-bg">
        <div className="halo-top" />
        <div className="halo-bottom" />
        <div className="phone-shell centered">
          <p className="screen-status">Проверяем ссылку входа...</p>
        </div>
      </div>
    );
  }

  if (!authState.tokens || !authState.user) {
    return (
      <div className="app-bg">
        <div className="halo-top" />
        <div className="halo-bottom" />
        <div className="phone-shell">
          <header className="topbar">
            <p className="brand">ВКУСНО</p>
            <p className="tagline">Арома ателье</p>
            <h1>Авторизация</h1>
            <p className="subtitle">Вход через magic link для доступа к персональным данным.</p>
          </header>
          <main className="content">
            <AuthScreen onAuthUpdate={onAuthUpdate} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        <header className="topbar">
          <p className="brand">ВКУСНО</p>
          <p className="tagline">Арома ателье</p>
          <h1>{tab.title}</h1>
          <p className="subtitle">{tab.subtitle}</p>
          <p className="session-email">{authState.user.email}</p>
        </header>

        <main className="content">
          {activeTab === 'mixes' ? <MixesScreen authState={authState} onAuthUpdate={onAuthUpdate} /> : null}
          {activeTab === 'sessions' ? (
            <SessionsScreen authState={authState} onAuthUpdate={onAuthUpdate} />
          ) : null}
          {activeTab === 'catalog' ? <CatalogScreen /> : null}
          {activeTab === 'recommendations' ? (
            <RecommendationsScreen authState={authState} onAuthUpdate={onAuthUpdate} />
          ) : null}
          {activeTab !== 'mixes' &&
          activeTab !== 'catalog' &&
          activeTab !== 'sessions' &&
          activeTab !== 'recommendations' ? (
            <section className="card">
              <p className="card-title">Текущий экран</p>
              <p className="card-text">
                Экран
                {' '}
                <b>{tab.label}</b>
                {' '}
                пока в статусе заглушки. Реализован рабочий поток для раздела «Миксы».
              </p>
            </section>
          ) : null}
          <section className="card">
            <p className="card-title">API endpoint</p>
            <code className="code">{API_BASE_URL}</code>
            <p className="hint">
              Переменная окружения:
              {' '}
              <code>VITE_API_BASE_URL</code>
            </p>
          </section>
        </main>

        <nav className="tabbar" aria-label="Основная навигация">
          {TABS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                className={`tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
