import type { CSSProperties, ReactNode } from 'react';

/** Runtime status or command-palette trigger in the Мастер topbar. */
export interface StatusPillProps {
  children?: ReactNode;
  /** Leading live dot with a soft halo. */
  dot?: boolean;
  tone?: 'success' | 'warning' | 'danger';
  /** Keyboard hint rendered as a kbd chip (tracked sans, not monospace), e.g. "⌘K". */
  kbd?: string;
  /** Passing onClick renders a button (hover lifts the border). */
  onClick?: () => void;
  style?: CSSProperties;
}
export function StatusPill(props: StatusPillProps): JSX.Element;
