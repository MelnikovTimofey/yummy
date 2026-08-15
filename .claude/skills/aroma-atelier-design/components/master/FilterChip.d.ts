import type { CSSProperties, ReactNode } from 'react';

/** Toolbar filter toggle in Inventory / Mixes (manufacturer, profile, flavour, tag). */
export interface FilterChipProps {
  children?: ReactNode;
  active?: boolean;
  /** Selected-count badge. */
  count?: number;
  onClick?: () => void;
  style?: CSSProperties;
}
export function FilterChip(props: FilterChipProps): JSX.Element;
