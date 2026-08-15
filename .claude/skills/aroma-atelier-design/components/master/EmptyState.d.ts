import type { CSSProperties, ReactNode } from 'react';

/** Dashed, quiet empty state. One sentence, no illustration. */
export interface EmptyStateProps {
  children?: ReactNode;
  style?: CSSProperties;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
