import { useState, type ReactNode } from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { MOBILE_MORE_TABS, MOBILE_NAV, mobileNavItemFor, openSection } from './mobile-nav';
import type { WorkspaceTab } from './workspace-tabs';

// Оболочка «Мастера» на телефоне (PHONE_QUERY, #215, #shot=shelf-mobile):
// компактная верхняя панель и нижняя навигация вместо вкладок.

export const MobileTopBar = ({ title, action }: { title: string; action?: ReactNode }) => (
  <header className="m-topbar">
    <img className="m-topbar__mark" src="/logo-mark.svg" width="14" height="20" alt="" aria-hidden="true" />
    <span className="m-topbar__title">{title}</span>
    {action}
  </header>
);

type MobileNavProps = {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  userName: string;
  userRoleLabel: string;
  onSignOut: () => void;
  // Пункт «Что нового» в «Ещё» (#226); нет выпусков — нет пункта.
  whatsNew: { unseen: boolean; onOpen: () => void } | null;
};

export const MobileNav = ({ activeTab, onTabChange, userName, userRoleLabel, onSignOut, whatsNew }: MobileNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const active = mobileNavItemFor(activeTab);

  return (
    <>
      <nav className="m-nav" aria-label="Разделы">
        {MOBILE_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="m-nav__item"
            data-active={active === item.id}
            aria-current={active === item.id ? 'page' : undefined}
            aria-expanded={item.id === 'more' ? moreOpen : undefined}
            onClick={() => (item.id === 'more' ? setMoreOpen(true) : openSection(item.id, onTabChange))}
          >
            {item.label}
            {item.id === 'more' && whatsNew?.unseen ? <span className="wn-dot m-nav__dot" aria-hidden="true" /> : null}
          </button>
        ))}
      </nav>

      {moreOpen ? (
        <BottomSheet label="Ещё разделы" onClose={() => setMoreOpen(false)} className="m-more">
          <p className="m-more__user">
            {userName}
            {userRoleLabel.toLocaleLowerCase('ru-RU') !== userName.toLocaleLowerCase('ru-RU') ? <span>{userRoleLabel}</span> : null}
          </p>
          <ul className="m-more__list">
            {MOBILE_MORE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    className="m-more__item"
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    onClick={() => {
                      setMoreOpen(false);
                      openSection(tab.id, onTabChange);
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} aria-hidden />
                    <span>
                      <b>{tab.label}</b>
                      <small>{tab.kicker}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {whatsNew ? (
            <button
              type="button"
              className="m-more__item"
              aria-label={whatsNew.unseen ? 'Что нового, есть непрочитанное' : 'Что нового'}
              onClick={() => {
                setMoreOpen(false);
                whatsNew.onOpen();
              }}
            >
              <Sparkles size={18} strokeWidth={1.8} aria-hidden />
              <span>
                <b>Что нового</b>
              </span>
              {whatsNew.unseen ? <span className="wn-dot m-more__dot" aria-hidden="true" /> : null}
            </button>
          ) : null}
          <button
            type="button"
            className="m-more__item m-more__item--exit"
            onClick={() => {
              setMoreOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden />
            <span>
              <b>Выйти</b>
            </span>
          </button>
        </BottomSheet>
      ) : null}
    </>
  );
};
