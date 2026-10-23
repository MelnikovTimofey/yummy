import type { CSSProperties, ReactNode } from 'react';

/** One per Мастер module. The h1 is the workspace label — never nest another h2 under it. */
export interface MasterPageHeaderProps {
  title: string;
  /** Only when it tells something the title and the actions don't. */
  subtitle?: string;
  actions?: ReactNode;
  /** Short status readout above the actions: «Обновлено в 14:05». */
  meta?: ReactNode;
  style?: CSSProperties;
}
export function MasterPageHeader(props: MasterPageHeaderProps): JSX.Element;
