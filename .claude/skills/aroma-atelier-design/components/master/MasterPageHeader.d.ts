import type { CSSProperties, ReactNode } from 'react';

/** One per Мастер module. The h1 is the workspace label — never nest another h2 under it. */
export interface MasterPageHeaderProps {
  /** Uppercase mono kicker, oxblood: «ИНВЕНТАРИЗАЦИЯ», «Окно: 01 — 14 августа». */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Mono status/route readout above the actions. */
  meta?: ReactNode;
  style?: CSSProperties;
}
export function MasterPageHeader(props: MasterPageHeaderProps): JSX.Element;
