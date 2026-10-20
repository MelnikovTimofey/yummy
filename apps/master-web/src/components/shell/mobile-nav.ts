import { workspaceTabs, type WorkspaceTab, type WorkspaceTabDescriptor } from './workspace-tabs';

// Нижняя навигация телефона (≤ 640 px, #215): у стойки нужны дашборд, полка
// и поставки, остальные разделы — в «Ещё».

export type MobileNavItem = WorkspaceTab | 'more';

const PRIMARY: WorkspaceTab[] = ['dashboard', 'shelf', 'deliveries'];

export const MOBILE_NAV: Array<{ id: MobileNavItem; label: string }> = [
  ...workspaceTabs.filter((tab) => PRIMARY.includes(tab.id)).map((tab) => ({ id: tab.id, label: tab.label })),
  { id: 'more', label: 'Ещё' },
];

export const MOBILE_MORE_TABS: WorkspaceTabDescriptor[] = workspaceTabs.filter((tab) => !PRIMARY.includes(tab.id));

export const mobileNavItemFor = (tab: WorkspaceTab): MobileNavItem => (PRIMARY.includes(tab) ? tab : 'more');

export const mobileTitleFor = (tab: WorkspaceTab, shelfMode: 'shelf' | 'reorder') => {
  if (tab === 'shelf' && shelfMode === 'reorder') return 'К заказу';
  return workspaceTabs.find((item) => item.id === tab)?.label ?? '';
};
