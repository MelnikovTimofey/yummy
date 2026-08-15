import type { CSSProperties } from 'react';

export interface MixComponentItem {
  id?: string;
  name: string;
  manufacturer: string;
  /** Percent of the bowl; the app validates the sum to exactly 100. */
  proportion: number;
}

/** «Состав микса» — proportional bar plus one row per tobacco, sorted by share desc. */
export interface CompositionStackProps {
  components: MixComponentItem[];
  showBar?: boolean;
  style?: CSSProperties;
}
export function CompositionStack(props: CompositionStackProps): JSX.Element;
