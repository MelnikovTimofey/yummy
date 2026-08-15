import type { CSSProperties, ReactNode } from 'react';

/** Guest chip: flavour filters, profile tags, rail filters. Sentence case, never uppercase. */
export interface AromaChipProps {
  children: ReactNode;
  /** sm = filter rails (default); lg = tags inside a mix card / rail header. */
  tier?: 'lg' | 'sm';
  active?: boolean;
  /** Flavour-profile id (citrus, berry, …) — renders the data-colour dot. */
  profile?: string;
  /** Explicit dot colour; wins over `profile`. */
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}
export function AromaChip(props: AromaChipProps): JSX.Element;
