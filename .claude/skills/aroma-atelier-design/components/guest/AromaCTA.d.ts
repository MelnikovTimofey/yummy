import type { CSSProperties, ReactNode } from 'react';

/**
 * The guest surface's single primary action ("Покурить", "Войти в Ателье").
 * Solid oxblood gradient, full width, uppercase 0.18em tracking, 52px tall.
 *
 * @startingPoint section="Арома Ателье" subtitle="Guest primitives: CTA, chips, rating pill, signature bar" viewport="700x260"
 */
export interface AromaCTAProps {
  children: ReactNode;
  onClick?: () => void;
  /** Dimmed wine fill, muted ink, no shadow. */
  disabled?: boolean;
  /** Ember ring pulse — only on the one action we want the guest to take next. */
  pulse?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}
export function AromaCTA(props: AromaCTAProps): JSX.Element;
