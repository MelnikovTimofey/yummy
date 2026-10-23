import { workspaceTabs, type WorkspaceTab, type WorkspaceTabDescriptor } from './workspace-tabs';

// Нижняя навигация телефона (#215, граница — PHONE_QUERY): у стойки нужны дашборд, полка
// и поставки, остальные разделы — в «Ещё».

export type MobileNavItem = WorkspaceTab | 'more';

const PRIMARY: WorkspaceTab[] = ['dashboard', 'shelf', 'deliveries'];

export const MOBILE_NAV: Array<{ id: MobileNavItem; label: string }> = [
  ...workspaceTabs.filter((tab) => PRIMARY.includes(tab.id)).map((tab) => ({ id: tab.id, label: tab.label })),
  { id: 'more', label: 'Ещё' },
];

export const MOBILE_MORE_TABS: WorkspaceTabDescriptor[] = workspaceTabs.filter((tab) => !PRIMARY.includes(tab.id));

export const mobileNavItemFor = (tab: WorkspaceTab): MobileNavItem => (PRIMARY.includes(tab) ? tab : 'more');

// Раздел открывается с начала, а не на прокрутке прошлого раздела (#334).
export const openSection = (
  tab: WorkspaceTab,
  onTabChange: (tab: WorkspaceTab) => void,
  scrollToTop = () => window.scrollTo({ top: 0 }),
) => {
  onTabChange(tab);
  scrollToTop();
};

export const mobileTitleFor = (tab: WorkspaceTab, shelfMode: 'shelf' | 'reorder' | 'purchase') => {
  if (tab === 'shelf' && shelfMode === 'reorder') return 'К заказу';
  return workspaceTabs.find((item) => item.id === tab)?.label ?? '';
};
