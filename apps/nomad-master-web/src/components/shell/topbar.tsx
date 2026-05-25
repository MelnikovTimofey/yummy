import { KeyboardEvent, useRef } from 'react';
import { LogOut } from 'lucide-react';
import type { Density } from '@/hooks/use-density';
import {
  getWorkspacePanelId,
  getWorkspaceTabId,
  workspaceTabs,
  type WorkspaceTab,
} from './workspace-tabs';

export type MasterTopBarStatusTone = 'ready' | 'loading' | 'error';

type MasterTopBarProps = {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  userName: string;
  userRoleLabel: string;
  statusText: string;
  statusTone: MasterTopBarStatusTone;
  onSignOut: () => void;
  density: Density;
  onDensityChange: (next: Density) => void;
};

const densityOptions: Array<{ value: Density; label: string; title: string }> = [
  { value: 'compact', label: 'C', title: 'Компактная плотность (32px на строку) — режим «зал кипит»' },
  { value: 'default', label: '·', title: 'Обычная плотность (36px на строку)' },
  { value: 'cozy', label: 'L', title: 'Просторная плотность (48px на строку)' },
];

export const MasterTopBar = ({
  activeTab,
  onTabChange,
  userName,
  userRoleLabel,
  statusText,
  statusTone,
  onSignOut,
  density,
  onDensityChange,
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
        <div
          className="master-density-toggle"
          role="group"
          aria-label="Плотность списков"
        >
          {densityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                density === option.value
                  ? 'master-density-toggle__button master-density-toggle__button--active'
                  : 'master-density-toggle__button'
              }
              onClick={() => onDensityChange(option.value)}
              title={option.title}
              aria-label={option.title}
              aria-pressed={density === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span
          className="status-chip status-chip--inverse"
          title={`Статус данных: ${statusText}`}
          aria-label={`Статус данных: ${statusText}`}
        >
          <span className={`status-dot status-dot--${statusTone}`} aria-hidden="true" />
          {statusText}
        </span>
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
