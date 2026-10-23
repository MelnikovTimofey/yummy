import type { CSSProperties, ReactNode } from 'react';

/** Quiet empty state: muted text in the flow, no frame. Fact first, then the next step. */
export interface EmptyStateProps {
  children?: ReactNode;
  style?: CSSProperties;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
