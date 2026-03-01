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
import { AppButton, AppInput, AppModal, AppTabs } from '@/ui-kit';

type TabKey = 'home' | 'sessions' | 'catalog' | 'favorites' | 'mixes' | 'rail-list';

type MixesOpenRequest = {
  mode: 'detail' | 'create' | 'list';
  mixId?: string;
  nonce: number;
};

type Tab = {
  key: TabKey;
  label: string;
  inTabbar?: boolean;
};

const TABS: Tab[] = [
  {
    key: 'home',
    label: 'Главная',
  },
  {
    key: 'catalog',
    label: 'Каталог',
  },
  {
    key: 'favorites',
    label: 'Избранное',
  },
  {
    key: 'sessions',
    label: 'Сессии',
  },
  {
    key: 'mixes',
    label: 'Миксы',
    inTabbar: false,
  },
  {
    key: 'rail-list',
    label: 'Рейл',
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
  const visibleTabs = useMemo(() => TABS.filter((item) => item.inTabbar !== false), []);
  const guestTabItems = useMemo(
    () => [
      { value: 'home', label: 'Главная' },
      { value: 'catalog', label: 'Каталог' },
    ],
    [],
  );
  const mainTabItems = useMemo(
    () => visibleTabs.map((item) => ({ value: item.key, label: item.label })),
    [visibleTabs],
  );
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

  const openMyMixes = useCallback(() => {
    setMixesOpenRequest({
      mode: 'list',
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
    return (
      <div className="app-bg">
        <div className="halo-top" />
        <div className="halo-bottom" />
        <div className="phone-shell">
          <header className="topbar">
            <div className="topbar-main-row">
              <div className="brand-wrap">
                <span className="brand-logo">V</span>
                <div>
                  <p className="brand">ВКУСНО</p>
                  <p className="tagline">Арома ателье</p>
                </div>
              </div>
              <nav className="topbar-nav" aria-label="Гостевая навигация">
                <AppTabs
                  value={guestTab}
                  onChange={(next) => setGuestTab(next as 'home' | 'catalog')}
                  items={guestTabItems}
                  className="topbar-tabs"
                  listClassName="topbar-tabs-list"
                  stretch={false}
                />
              </nav>
              <div className="topbar-right">
                <AppButton
                  variant="chip"
                  className="header-auth-btn"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Войти
                </AppButton>
              </div>
            </div>
          </header>
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

        <AppModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          title="Вход"
          contentClassName="auth-popup"
        >
          <AuthScreen onAuthUpdate={onAuthUpdate} asCard={false} />
        </AppModal>
      </div>
    );
  }

  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        <header className="topbar">
          <div className="topbar-main-row">
            <div className="brand-wrap">
              <span className="brand-logo">V</span>
              <div>
                <p className="brand">ВКУСНО</p>
                <p className="tagline">Арома ателье</p>
              </div>
            </div>
            <nav className="topbar-nav" aria-label="Основная навигация">
              <AppTabs
                value={activeTab}
                onChange={(next) => setActiveTab(next as TabKey)}
                items={mainTabItems}
                className="topbar-tabs"
                listClassName="topbar-tabs-list"
                stretch={false}
              />
            </nav>
            <div className="topbar-right" ref={profileMenuRef}>
              <AppButton
                variant="chip"
                className="header-profile-btn"
                onClick={() => setProfileMenuOpen((current) => !current)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                {profileName}
              </AppButton>
              {profileMenuOpen ? (
                <div className="profile-menu" role="menu" aria-label="Меню профиля">
                  <AppButton
                    variant="ghost"
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab('favorites');
                      setProfileMenuOpen(false);
                    }}
                  >
                    Избранное
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab('sessions');
                      setProfileMenuOpen(false);
                    }}
                  >
                    Сессии
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    className="profile-menu-item"
                    onClick={openMyMixes}
                  >
                    Мои миксы
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    className="profile-menu-item"
                    onClick={openProfileNameModal}
                  >
                    Изменить имя
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    className="profile-menu-item"
                    onClick={() => {
                      setPreferencesModalOpen(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    Предпочтения
                  </AppButton>
                  <AppButton
                    variant="danger"
                    className="profile-menu-item danger"
                    onClick={onSignOut}
                  >
                    Выйти
                  </AppButton>
                </div>
              ) : null}
            </div>
          </div>
        </header>

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

      <AppModal
        open={profileNameModalOpen}
        onOpenChange={setProfileNameModalOpen}
        title="Имя профиля"
        contentClassName="profile-name-popup"
      >
        <form
          className="form profile-name-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveProfileName();
          }}
        >
          <label htmlFor="profile-name-input">Имя</label>
          <AppInput
            id="profile-name-input"
            type="text"
            value={profileNameDraft}
            onChange={(event) => setProfileNameDraft(event.target.value)}
            maxLength={40}
            placeholder="Введите имя профиля"
          />
          <p className="hint">Если поле пустое, показывается имя из e-mail или «Мой профиль».</p>
          <div className="profile-name-actions">
            <AppButton variant="ghost" className="ghost-button profile-name-cancel" onClick={() => setProfileNameModalOpen(false)}>
              Отмена
            </AppButton>
            <AppButton type="submit" className="search-button profile-name-save">
              Сохранить
            </AppButton>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={preferencesModalOpen}
        onOpenChange={setPreferencesModalOpen}
        title="Предпочтения"
        contentClassName="preferences-popup"
      >
        <PreferencesPanel
          authState={authState}
          onAuthUpdate={onAuthUpdate}
          onSaved={() => setPreferencesModalOpen(false)}
        />
      </AppModal>
    </div>
  );
};
