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
    <header className="topbar" aria-label="Рабочие разделы Мастера">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">N</span>
        <span className="brand__name">Nomad Master</span>
      </div>

      <nav className="nav" role="tablist" aria-label="Рабочие разделы Мастера">
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
              className="nav__item"
              data-active={isActive ? 'true' : 'false'}
              role="tab"
              aria-selected={isActive}
              aria-controls={getWorkspacePanelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            >
              <TabIcon className="nav__item-icon" size={14} strokeWidth={1.9} aria-hidden />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="topbar__spacer" />

      <div className="topbar__right">
        <button
          type="button"
          className="status-pill status-pill--button"
          aria-label="Открыть командную палитру"
          onClick={onOpenCommandPalette}
        >
          <Search size={12} aria-hidden />
          <kbd className="kbd">⌘K</kbd>
        </button>

        <div className="user-chip" aria-label="Текущий пользователь">
          <span className="user-chip__name">{userName}</span>
          <span className="user-chip__tag">{userRoleLabel}</span>
        </div>

        <button
          type="button"
          className="topbar__logout"
          onClick={onSignOut}
          aria-label="Выйти"
        >
          <LogOut size={15} strokeWidth={1.8} aria-hidden />
          <span>Выйти</span>
        </button>
      </div>
    </header>
  );
};
