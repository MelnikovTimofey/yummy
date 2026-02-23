import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../shared/api';
import { verifyMagicLink } from '../shared/apiClient';
import { loadAuthState, saveAuthState } from '../shared/authStorage';
import { AuthState } from '../shared/types';
import { AuthScreen } from './AuthScreen';
import { CatalogScreen } from './CatalogScreen';
import { FavoritesScreen } from './FavoritesScreen';
import { HomeScreen } from './HomeScreen';
import { MixesScreen } from './MixesScreen';
import { ProfileScreen } from './ProfileScreen';
import { RecommendationsScreen } from './RecommendationsScreen';
import { SessionsScreen } from './SessionsScreen';

type TabKey = 'home' | 'mixes' | 'sessions' | 'catalog' | 'recommendations' | 'profile' | 'favorites';
type MixesOpenRequest = {
  mode: 'detail' | 'create';
  mixId?: string;
  nonce: number;
};

type Tab = {
  key: TabKey;
  label: string;
  title: string;
  subtitle: string;
  inTabbar?: boolean;
};

const TABS: Tab[] = [
  {
    key: 'home',
    label: 'Главная',
    title: 'Главная',
    subtitle: 'Рейлы миксов: рекомендации, редакция, аналитика и мои миксы.',
  },
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
  {
    key: 'favorites',
    label: 'Избранное',
    title: 'Избранное',
    subtitle: 'Сохранённые миксы с фильтрами и быстрыми действиями.',
    inTabbar: false,
  },
];

export const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [authState, setAuthState] = useState<AuthState>(() => loadAuthState());
  const [authChecking, setAuthChecking] = useState(false);
  const [recommendationsRefreshSignal, setRecommendationsRefreshSignal] = useState(0);
  const [mixesOpenRequest, setMixesOpenRequest] = useState<MixesOpenRequest | null>(null);
  const tab = useMemo(() => TABS.find((item) => item.key === activeTab) ?? TABS[0], [activeTab]);
  const visibleTabs = useMemo(() => TABS.filter((item) => item.inTabbar !== false), []);

  const onAuthUpdate = useCallback((next: AuthState) => {
    setAuthState(next);
    saveAuthState(next);
  }, []);

  const onSignOut = useCallback(() => {
    onAuthUpdate({ tokens: null, user: null });
    setActiveTab('home');
  }, [onAuthUpdate]);

  const onPreferencesSaved = useCallback(() => {
    setRecommendationsRefreshSignal((current) => current + 1);
    setActiveTab('home');
  }, []);

  const openMixCard = useCallback((mixId: string) => {
    setMixesOpenRequest({
      mode: 'detail',
      mixId,
      nonce: Date.now(),
    });
    setActiveTab('mixes');
  }, []);

  const openCreateMix = useCallback(() => {
    setMixesOpenRequest({
      mode: 'create',
      nonce: Date.now(),
    });
    setActiveTab('mixes');
  }, []);

  const openRailList = useCallback(
    (railType: 'recommendations' | 'editorial' | 'analytics' | 'my-mixes') => {
      if (railType === 'recommendations') {
        setActiveTab('recommendations');
        return;
      }
      setActiveTab('mixes');
    },
    [],
  );

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
            <h1>Главная</h1>
            <p className="subtitle">Редакторские и аналитические рейлы доступны без входа.</p>
          </header>
          <main className="content">
            <HomeScreen authState={authState} onAuthUpdate={onAuthUpdate} />
            <section className="card">
              <p className="card-title">Авторизация</p>
              <p className="card-text">Войдите, чтобы получить персональные рекомендации и свои миксы.</p>
              <AuthScreen onAuthUpdate={onAuthUpdate} />
            </section>
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
        <nav className="desktop-tabbar" aria-label="Основная навигация">
          {visibleTabs.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <button
                key={`desktop:${item.key}`}
                type="button"
                className={`desktop-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <main className="content">
          {activeTab === 'home' ? (
            <HomeScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              onOpenMix={openMixCard}
              onOpenRail={openRailList}
            />
          ) : null}
          {activeTab === 'mixes' ? (
            <MixesScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              openMixRequest={mixesOpenRequest}
            />
          ) : null}
          {activeTab === 'sessions' ? (
            <SessionsScreen authState={authState} onAuthUpdate={onAuthUpdate} />
          ) : null}
          {activeTab === 'catalog' ? <CatalogScreen /> : null}
          {activeTab === 'recommendations' ? (
            <RecommendationsScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              refreshSignal={recommendationsRefreshSignal}
            />
          ) : null}
          {activeTab === 'profile' ? (
            <ProfileScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              onPreferencesSaved={onPreferencesSaved}
              onSignOut={onSignOut}
              onOpenFavorites={() => setActiveTab('favorites')}
              onOpenSessions={() => setActiveTab('sessions')}
              onOpenAddMix={openCreateMix}
            />
          ) : null}
          {activeTab === 'favorites' ? (
            <FavoritesScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              onOpenMix={openMixCard}
            />
          ) : null}
          {activeTab !== 'mixes' &&
          activeTab !== 'home' &&
          activeTab !== 'catalog' &&
          activeTab !== 'sessions' &&
          activeTab !== 'recommendations' &&
          activeTab !== 'profile' &&
          activeTab !== 'favorites' ? (
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
          {visibleTabs.map((item) => {
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
