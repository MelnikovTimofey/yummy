import type { CSSProperties, ReactNode } from 'react';

/** Status / meta tag in tables and editors: «виден гостю», «скрыт», «блокирует наличие». */
export interface MasterTagProps {
  children?: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'accent' | 'danger' | 'ghost';
  /** Leading 6px currentColor dot. */
  dot?: boolean;
  style?: CSSProperties;
}
export function MasterTag(props: MasterTagProps): JSX.Element;
