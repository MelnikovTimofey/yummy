import type { CSSProperties } from 'react';

export interface MasterSortOption {
  key: string;
  label: string;
}

/** Sort control in a module toolbar; closes on outside click / Escape upstream. */
export interface MasterSortPillProps {
  value: string;
  options: MasterSortOption[];
  onChange?: (key: string) => void;
  label?: string;
  style?: CSSProperties;
}
export function MasterSortPill(props: MasterSortPillProps): JSX.Element;
