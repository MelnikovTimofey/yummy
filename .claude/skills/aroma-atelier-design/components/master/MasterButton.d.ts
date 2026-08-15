import type { CSSProperties, ReactNode } from 'react';

/**
 * Backoffice button. Dense by design — 32px default, 26px in table rows.
 *
 * @startingPoint section="Мастер" subtitle="Console primitives: buttons, tags, toggles, inputs" viewport="700x300"
 */
export interface MasterButtonProps {
  children?: ReactNode;
  /** primary = oxblood fill (one per surface); danger = outlined oxblood. */
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  /** Lucide icon element, 14–15px, stroke 1.8. */
  icon?: ReactNode;
  style?: CSSProperties;
}
export function MasterButton(props: MasterButtonProps): JSX.Element;
