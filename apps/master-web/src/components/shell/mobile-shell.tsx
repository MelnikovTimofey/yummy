import { useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { MOBILE_MORE_TABS, MOBILE_NAV, mobileNavItemFor } from './mobile-nav';
import type { WorkspaceTab } from './workspace-tabs';

// Оболочка «Мастера» на телефоне (≤ 640 px, #215, #shot=shelf-mobile):
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
};

export const MobileNav = ({ activeTab, onTabChange, userName, userRoleLabel, onSignOut }: MobileNavProps) => {
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
            onClick={() => (item.id === 'more' ? setMoreOpen(true) : onTabChange(item.id))}
          >
            {item.label}
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
                      onTabChange(tab.id);
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
