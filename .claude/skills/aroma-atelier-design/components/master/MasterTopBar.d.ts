import type { CSSProperties, ReactNode } from 'react';

export interface MasterTopBarItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

/**
 * The Мастер shell header — horizontal module nav, no sidebar (post-audit decision).
 *
 * @startingPoint section="Мастер" subtitle="Sticky glass shell header with module tabs" viewport="1280x120"
 */
export interface MasterTopBarProps {
  items: MasterTopBarItem[];
  active?: string;
  onChange?: (id: string) => void;
  userName?: string;
  /** 'admin' | 'master' upstream. */
  userRole?: string;
  onSignOut?: () => void;
  /** Renders the ⌘K command pill when provided. */
  onOpenCommandPalette?: () => void;
  /** Path to the brand mark (assets/logo-mark-oxblood.svg) — rendered left of the wordmark. */
  markSrc?: string;
  style?: CSSProperties;
}
export function MasterTopBar(props: MasterTopBarProps): JSX.Element;
