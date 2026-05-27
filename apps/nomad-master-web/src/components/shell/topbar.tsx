import { KeyboardEvent, useRef } from 'react';
import { LogOut, Search } from 'lucide-react';
import {
  getWorkspacePanelId,
  getWorkspaceTabId,
  workspaceTabs,
  type WorkspaceTab,
} from './workspace-tabs';

type MasterTopBarProps = {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  userName: string;
  userRoleLabel: string;
  onSignOut: () => void;
  onOpenCommandPalette: () => void;
};

export const MasterTopBar = ({
  activeTab,
  onTabChange,
  userName,
  userRoleLabel,
  onSignOut,
  onOpenCommandPalette,
}: MasterTopBarProps) => {
  const tabRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    dashboard: null,
    inventory: null,
    mixes: null,
    rails: null,
    access: null,
  });

  const focusTab = (tab: WorkspaceTab) => {
    requestAnimationFrame(() => {
      tabRefs.current[tab]?.focus();
    });
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: WorkspaceTab) => {
    const currentIndex = workspaceTabs.findIndex((tab) => tab.id === currentTab);
    if (currentIndex === -1) return;

    let nextTab: WorkspaceTab | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextTab = workspaceTabs[(currentIndex + 1) % workspaceTabs.length]?.id ?? null;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextTab = workspaceTabs[(currentIndex - 1 + workspaceTabs.length) % workspaceTabs.length]?.id ?? null;
        break;
      case 'Home':
        nextTab = workspaceTabs[0]?.id ?? null;
        break;
      case 'End':
        nextTab = workspaceTabs[workspaceTabs.length - 1]?.id ?? null;
        break;
      default:
        break;
    }

    if (!nextTab) return;
    event.preventDefault();
    onTabChange(nextTab);
    focusTab(nextTab);
  };

  return (
    <nav className="master-nav master-nav--workspace" aria-label="Рабочие разделы Мастера">
      <div className="master-nav__brand" aria-hidden="false">
        <span className="master-nav__logo" aria-hidden="true">N</span>
        <span className="master-nav__brand-name">Nomad Master</span>
      </div>

      <div
        className="workspace-tabs workspace-tabs--workspace-bar"
        role="tablist"
        aria-label="Рабочие разделы Мастера"
      >
        {workspaceTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={getWorkspaceTabId(tab.id)}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              className={isActive ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
              role="tab"
              aria-selected={isActive}
              aria-controls={getWorkspacePanelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            >
              <span className="workspace-tab__head">
                <span className="workspace-tab__icon" aria-hidden="true">
                  <TabIcon size={15} strokeWidth={1.9} />
                </span>
                <span className="workspace-tab__copy">
                  <strong>{tab.label}</strong>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="master-nav__meta">
        <button
          type="button"
          className="master-nav__cmdk"
          aria-label="Открыть командную палитру"
          onClick={onOpenCommandPalette}
        >
          <Search size={14} aria-hidden />
          <span className="master-nav__cmdk-label">Найти или сделать</span>
          <kbd className="master-nav__cmdk-kbd">⌘K</kbd>
        </button>
        <div className="master-nav__user" aria-label="Текущий пользователь">
          <strong>{userName}</strong>
          <span>{userRoleLabel}</span>
        </div>
        <button
          className="secondary-button secondary-button--inline secondary-button--shell"
          type="button"
          onClick={onSignOut}
          aria-label="Выйти"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span>Выйти</span>
        </button>
      </div>
    </nav>
  );
};
