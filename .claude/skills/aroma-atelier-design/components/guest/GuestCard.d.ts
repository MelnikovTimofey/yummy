import type { CSSProperties, ReactNode } from 'react';

/** Guest content card — e.g. the pinned «Карточка для мастера» bar. */
export interface GuestCardProps {
  children?: ReactNode;
  /** 12px padding instead of 16px. */
  compact?: boolean;
  /** Uppercase micro-title rendered above the content. */
  title?: string;
  style?: CSSProperties;
}
export function GuestCard(props: GuestCardProps): JSX.Element;
