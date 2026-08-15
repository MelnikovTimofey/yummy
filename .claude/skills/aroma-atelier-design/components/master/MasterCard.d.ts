import type { CSSProperties, ReactNode } from 'react';

/** Operational panel ("ops-surface") — dashboards, editors, access blocks. */
export interface MasterCardProps {
  children?: ReactNode;
  /** Uppercase tracked kicker. */
  eyebrow?: string;
  /** Serif panel heading. */
  heading?: string;
  actions?: ReactNode;
  style?: CSSProperties;
}
export function MasterCard(props: MasterCardProps): JSX.Element;
