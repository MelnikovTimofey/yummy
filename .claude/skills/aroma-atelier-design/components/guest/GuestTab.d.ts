import type { CSSProperties, ReactNode } from 'react';

/** Pill tab — the journey nav (Знакомство / Предпочтения) variant of SegmentNav. */
export interface GuestTabProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export function GuestTab(props: GuestTabProps): JSX.Element;
