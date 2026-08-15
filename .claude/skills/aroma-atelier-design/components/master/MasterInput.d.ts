import type { CSSProperties, ReactNode } from 'react';

/** Console text field. The shell holds the icon; the inner input is chromeless. */
export interface MasterInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Leading Lucide icon (14px). */
  icon?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  type?: string;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export function MasterInput(props: MasterInputProps): JSX.Element;
