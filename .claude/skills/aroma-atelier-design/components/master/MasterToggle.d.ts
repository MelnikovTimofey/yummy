import type { CSSProperties } from 'react';

/** Tiny switch for binary operational state. Oxblood when on. */
export interface MasterToggleProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** Accessible name, e.g. "В наличии". */
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
}
export function MasterToggle(props: MasterToggleProps): JSX.Element;
