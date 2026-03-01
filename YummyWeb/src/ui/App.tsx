import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { verifyMagicLink } from '../shared/apiClient';
import { loadAuthState, saveAuthState } from '../shared/authStorage';
import {
  loadStoredProfileName,
  resolveProfileName,
  saveStoredProfileName,
} from '../shared/profileName';
import { AuthState, HomeRail } from '../shared/types';
import { AuthScreen } from './AuthScreen';
import { CatalogScreen } from './CatalogScreen';
import { FavoritesScreen } from './FavoritesScreen';
import { HomeScreen } from './HomeScreen';
import { MixesScreen } from './MixesScreen';
import { PreferencesPanel } from './PreferencesPanel';
import { RailScreen } from './RailScreen';
import { SessionsScreen } from './SessionsScreen';

type TabKey = 'home' | 'sessions' | 'catalog' | 'favorites' | 'mixes' | 'rail-list';

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
    key: 'favorites',
    label: 'Избранное',
    title: 'Избранное',
    subtitle: 'Сохранённые миксы с фильтрами и быстрыми действиями.',
  },
  {
    key: 'sessions',
    label: 'Сессии',
    title: 'Сессии курения',
    subtitle: 'Добавляйте сессии и сохраняйте контекст: где и когда.',
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [profileNameModalOpen, setProfileNameModalOpen] = useState(false);
  const [customProfileName, setCustomProfileName] = useState<string | null>(null);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [mixesOpenRequest, setMixesOpenRequest] = useState<MixesOpenRequest | null>(null);
  const [selectedRail, setSelectedRail] = useState<HomeRail | null>(null);
  const syncingFromHistory = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const tab = useMemo(() => TABS.find((item) => item.key === activeTab) ?? TABS[0], [activeTab]);
  const visibleTabs = useMemo(() => TABS.filter((item) => item.inTabbar !== false), []);
  const profileName = useMemo(
    () => resolveProfileName(authState.user, customProfileName),
    [authState.user, customProfileName],
  );

  const onAuthUpdate = useCallback((next: AuthState) => {
    setAuthState(next);
    saveAuthState(next);
    if (next.tokens && next.user) {
      setAuthModalOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!authState.user?.id) {
      setCustomProfileName(null);
      return;
    }
    setCustomProfileName(loadStoredProfileName(authState.user.id));
  }, [authState.user?.id]);

  const onSignOut = useCallback(() => {
    onAuthUpdate({ tokens: null, user: null });
    setProfileMenuOpen(false);
    setPreferencesModalOpen(false);
    setProfileNameModalOpen(false);
    setActiveTab('home');
  }, [onAuthUpdate]);

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
    setProfileMenuOpen(false);
    setActiveTab('mixes');
  }, []);

  const openProfileNameModal = useCallback(() => {
    setProfileNameDraft(profileName);
    setProfileNameModalOpen(true);
    setProfileMenuOpen(false);
  }, [profileName]);

  const onSaveProfileName = useCallback(() => {
    if (!authState.user?.id) {
      return;
    }
    const saved = saveStoredProfileName(authState.user.id, profileNameDraft);
    setCustomProfileName(saved);
    setProfileNameModalOpen(false);
  }, [authState.user?.id, profileNameDraft]);

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

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (profileMenuRef.current?.contains(target)) {
        return;
      }
      setProfileMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onDocumentClick);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onDocumentClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, [profileMenuOpen]);

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
            <div className="topbar-right">
              <button
                type="button"
                className="header-auth-btn"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </button>
            </div>
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
            <section className="guest-main-panel">
              {guestTab === 'home' ? (
                <HomeScreen authState={authState} onAuthUpdate={onAuthUpdate} />
              ) : (
                <CatalogScreen authState={authState} />
              )}
            </section>
          </main>
        </div>

        {authModalOpen ? (
          <div className="popup-backdrop" onClick={() => setAuthModalOpen(false)} role="presentation">
            <article className="popup-card auth-popup" onClick={(event) => event.stopPropagation()}>
              <div className="popup-head">
                <h3 className="modal-title">Вход</h3>
                <button type="button" className="popup-close-btn" onClick={() => setAuthModalOpen(false)}>
                  Закрыть
                </button>
              </div>
              <AuthScreen onAuthUpdate={onAuthUpdate} asCard={false} />
            </article>
          </div>
        ) : null}
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
          <h1>{tab.title}</h1>
          <p className="subtitle">{tab.subtitle}</p>
          <div className="topbar-right" ref={profileMenuRef}>
            <button
              type="button"
              className="header-profile-btn"
              onClick={() => setProfileMenuOpen((current) => !current)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              {profileName}
            </button>
            {profileMenuOpen ? (
              <div className="profile-menu" role="menu" aria-label="Меню профиля">
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => {
                    setActiveTab('favorites');
                    setProfileMenuOpen(false);
                  }}
                >
                  Избранное
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => {
                    setActiveTab('sessions');
                    setProfileMenuOpen(false);
                  }}
                >
                  Сессии
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={openCreateMix}
                >
                  Создать микс
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={openProfileNameModal}
                >
                  Изменить имя
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => {
                    setPreferencesModalOpen(true);
                    setProfileMenuOpen(false);
                  }}
                >
                  Предпочтения
                </button>
                <button
                  type="button"
                  className="profile-menu-item danger"
                  onClick={onSignOut}
                >
                  Выйти
                </button>
              </div>
            ) : null}
          </div>
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

      {profileNameModalOpen ? (
        <div className="popup-backdrop" onClick={() => setProfileNameModalOpen(false)} role="presentation">
          <article className="popup-card profile-name-popup" onClick={(event) => event.stopPropagation()}>
            <div className="popup-head">
              <h3 className="modal-title">Имя профиля</h3>
              <button type="button" className="popup-close-btn" onClick={() => setProfileNameModalOpen(false)}>
                Закрыть
              </button>
            </div>
            <form
              className="form profile-name-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSaveProfileName();
              }}
            >
              <label htmlFor="profile-name-input">Имя</label>
              <input
                id="profile-name-input"
                type="text"
                value={profileNameDraft}
                onChange={(event) => setProfileNameDraft(event.target.value)}
                maxLength={40}
                placeholder="Введите имя профиля"
              />
              <p className="hint">Если поле пустое, показывается имя из e-mail или «Мой профиль».</p>
              <div className="profile-name-actions">
                <button type="button" className="ghost-button profile-name-cancel" onClick={() => setProfileNameModalOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="search-button profile-name-save">
                  Сохранить
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {preferencesModalOpen ? (
        <div className="popup-backdrop" onClick={() => setPreferencesModalOpen(false)} role="presentation">
          <article className="popup-card preferences-popup" onClick={(event) => event.stopPropagation()}>
            <div className="popup-head">
              <h3 className="modal-title">Предпочтения</h3>
              <button type="button" className="popup-close-btn" onClick={() => setPreferencesModalOpen(false)}>
                Закрыть
              </button>
            </div>
            <PreferencesPanel
              authState={authState}
              onAuthUpdate={onAuthUpdate}
              onSaved={() => setPreferencesModalOpen(false)}
            />
          </article>
        </div>
      ) : null}
    </div>
  );
};
