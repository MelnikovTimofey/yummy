import type { CSSProperties } from 'react';

/** The one guest mix row: Подбор, Каталог, подборки, «Для вас», кабинет. */
export interface MixRowProps {
  name: string;
  /** Flavour notes; only the first three render, joined by commas. */
  flavors?: string[];
  profiles?: string[];
  rating?: number;
  onClick?: () => void;
  style?: CSSProperties;
}
export function MixRow(props: MixRowProps): JSX.Element;
