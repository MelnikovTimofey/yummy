import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { verifyMagicLink } from '../shared/apiClient';
import { loadAuthState, saveAuthState } from '../shared/authStorage';
import { AuthState, HomeRail } from '../shared/types';
import { AuthScreen } from './AuthScreen';
import { CatalogScreen } from './CatalogScreen';
import { FavoritesScreen } from './FavoritesScreen';
import { HomeScreen } from './HomeScreen';
import { MixesScreen } from './MixesScreen';
import { ProfileScreen } from './ProfileScreen';
import { RailScreen } from './RailScreen';
import { SessionsScreen } from './SessionsScreen';

type TabKey = 'home' | 'sessions' | 'catalog' | 'profile' | 'favorites' | 'mixes' | 'rail-list';

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
    subtitle: 'Рейлы миксов: рекомендации, избранное, редакция и аналитика.',
  },
  {
    key: 'catalog',
    label: 'Каталог',
    title: 'Каталог миксов',
    subtitle: 'Глобальные фильтры: поиск, профили, теги, табаки, производители и рейтинг.',
  },
  {
    key: 'profile',
    label: 'Профиль',
    title: 'Профиль',
    subtitle: 'Настройка предпочтений и быстрый доступ к сессиям курения.',
    inTabbar: false,
  },
  {
    key: 'sessions',
    label: 'Сессии',
    title: 'Сессии курения',
    subtitle: 'Добавляйте сессии и сохраняйте контекст: где и когда.',
    inTabbar: false,
  },
  {
    key: 'favorites',
    label: 'Избранное',
    title: 'Избранное',
    subtitle: 'Сохранённые миксы с фильтрами и быстрыми действиями.',
    inTabbar: false,
  },
  {
    key: 'mixes',
    label: 'Миксы',
    title: 'Карточка микса',
    subtitle: 'Просмотр карточки и действий по выбранному миксу.',
    inTabbar: false,
  },
  {
    key: 'rail-list',
    label: 'Рейл',
    title: 'Элементы рейла',
    subtitle: 'Полный список миксов выбранной коллекции.',
    inTabbar: false,
  },
];

export const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [guestTab, setGuestTab] = useState<'home' | 'catalog'>('home');
  const [authState, setAuthState] = useState<AuthState>(() => loadAuthState());
  const [authChecking, setAuthChecking] = useState(false);
  const [mixesOpenRequest, setMixesOpenRequest] = useState<MixesOpenRequest | null>(null);
  const [selectedRail, setSelectedRail] = useState<HomeRail | null>(null);
  const syncingFromHistory = useRef(false);
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

  const openRailList = useCallback((rail: HomeRail) => {
    setSelectedRail(rail);
    setActiveTab('rail-list');
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

  useEffect(() => {
    const existingState = window.history.state ?? {};
    if (!existingState.appTab) {
      window.history.replaceState({ ...existingState, appTab: activeTab }, '', window.location.href);
    }

    const onPopState = (event: PopStateEvent) => {
      const nextTab = (event.state as { appTab?: TabKey } | null)?.appTab;
      if (!nextTab || !TABS.some((item) => item.key === nextTab)) {
        syncingFromHistory.current = true;
        setActiveTab('home');
        return;
      }
      syncingFromHistory.current = true;
      setActiveTab(nextTab);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (syncingFromHistory.current) {
      syncingFromHistory.current = false;
      return;
    }
    const currentTab = (window.history.state as { appTab?: TabKey } | null)?.appTab;
    if (currentTab === activeTab) {
      return;
    }
    window.history.pushState({ ...(window.history.state ?? {}), appTab: activeTab }, '', window.location.href);
  }, [activeTab]);

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
    const guestTitle = guestTab === 'home' ? 'Главная' : 'Каталог миксов';
    const guestSubtitle =
      guestTab === 'home'
        ? 'Рейл рекомендаций доступен в гостевом режиме.'
        : 'Просматривайте миксы и карточки в режиме гостя.';

    return (
      <div className="app-bg">
        <div className="halo-top" />
        <div className="halo-bottom" />
        <div className="phone-shell">
          <header className="topbar">
            <div className="brand-wrap">
              <span className="brand-logo">V</span>
              <div>
                <p className="brand">ВКУСНО</p>
                <p className="tagline">Арома ателье</p>
              </div>
            </div>
            <h1>{guestTitle}</h1>
            <p className="subtitle">{guestSubtitle}</p>
          </header>
          <nav className="desktop-tabbar" aria-label="Гостевая навигация">
            <button
              type="button"
              className={`desktop-tab ${guestTab === 'home' ? 'active' : ''}`}
              onClick={() => setGuestTab('home')}
            >
              Главная
            </button>
            <button
              type="button"
              className={`desktop-tab ${guestTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setGuestTab('catalog')}
            >
              Каталог
            </button>
          </nav>
          <main className="content">
            {guestTab === 'home' ? (
              <HomeScreen authState={authState} onAuthUpdate={onAuthUpdate} />
            ) : (
              <CatalogScreen authState={authState} />
            )}
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
          <div className="brand-wrap">
            <span className="brand-logo">V</span>
            <div>
              <p className="brand">ВКУСНО</p>
              <p className="tagline">Арома ателье</p>
            </div>
          </div>
          <button type="button" className="profile-entry-btn" onClick={() => setActiveTab('profile')}>
            Профиль
          </button>
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
          {activeTab === 'catalog' ? (
            <CatalogScreen
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              onOpenMix={openMixCard}
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
          {activeTab === 'rail-list' ? (
            <RailScreen rail={selectedRail} onOpenMix={openMixCard} />
          ) : null}
        </main>
      </div>
    </div>
  );
};
