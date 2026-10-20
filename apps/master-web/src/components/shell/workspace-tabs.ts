import {
  Blend,
  GalleryVerticalEnd,
  LayoutDashboard,
  Library,
  Package,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';

export type WorkspaceTab = 'dashboard' | 'shelf' | 'deliveries' | 'catalog' | 'mixes' | 'rails' | 'access';

export type WorkspaceTabDescriptor = {
  id: WorkspaceTab;
  label: string;
  kicker: string;
  icon: LucideIcon;
};

export const workspaceTabs: WorkspaceTabDescriptor[] = [
  { id: 'dashboard', label: 'Дашборд', kicker: 'Сводка смены', icon: LayoutDashboard },
  { id: 'shelf', label: 'Полка', kicker: 'Банки, расход и прогноз', icon: Package },
  { id: 'deliveries', label: 'Поставки', kicker: 'Счета поставщиков и приход', icon: Truck },
  { id: 'catalog', label: 'Каталог', kicker: 'Карточки htreviews и свои', icon: Library },
  { id: 'mixes', label: 'Миксы', kicker: 'Каталог состава', icon: Blend },
  { id: 'rails', label: 'Рейлы', kicker: 'Витрина', icon: GalleryVerticalEnd },
  { id: 'access', label: 'Доступ', kicker: 'Telegram и роли', icon: ShieldCheck },
];

export const getWorkspaceTabId = (tab: WorkspaceTab) => `workspace-tab-${tab}`;
export const getWorkspacePanelId = (tab: WorkspaceTab) => `workspace-panel-${tab}`;
