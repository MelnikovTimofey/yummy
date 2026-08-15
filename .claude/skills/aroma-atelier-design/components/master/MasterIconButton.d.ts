import type { CSSProperties, ReactNode } from 'react';

/** Square, chromeless icon action (.icon-btn). Hover fills with --bg-elevated. */
export interface MasterIconButtonProps {
  children?: ReactNode;
  /** Required — becomes aria-label and title. */
  label: string;
  /** 24px instead of 28px, for inline row clusters. */
  small?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export function MasterIconButton(props: MasterIconButtonProps): JSX.Element;
