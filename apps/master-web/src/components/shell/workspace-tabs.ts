import {
  Blend,
  GalleryVerticalEnd,
  LayoutDashboard,
  ShieldCheck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

export type WorkspaceTab = 'dashboard' | 'inventory' | 'mixes' | 'rails' | 'access';

export type WorkspaceTabDescriptor = {
  id: WorkspaceTab;
  label: string;
  kicker: string;
  icon: LucideIcon;
};

export const workspaceTabs: WorkspaceTabDescriptor[] = [
  { id: 'dashboard', label: 'Дашборд', kicker: 'Сводка смены', icon: LayoutDashboard },
  { id: 'inventory', label: 'Табаки', kicker: 'Наличие и стоп-лист', icon: Warehouse },
  { id: 'mixes', label: 'Миксы', kicker: 'Каталог состава', icon: Blend },
  { id: 'rails', label: 'Рейлы', kicker: 'Витрина', icon: GalleryVerticalEnd },
  { id: 'access', label: 'Доступ', kicker: 'Telegram и роли', icon: ShieldCheck },
];

export const getWorkspaceTabId = (tab: WorkspaceTab) => `workspace-tab-${tab}`;
export const getWorkspacePanelId = (tab: WorkspaceTab) => `workspace-panel-${tab}`;
