import type { CSSProperties } from 'react';

/** The guest app's workhorse list item — catalog, rail and "тоже подходят" rows. */
export interface MixRowProps {
  name: string;
  /** Flavour notes; only the first three render, joined by " · ". */
  flavors?: string[];
  profiles?: string[];
  rating?: number;
  glyphSize?: number;
  showGlyph?: boolean;
  /** Signature bar between name and flavours (recommendation rows do this). */
  showSignature?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export function MixRow(props: MixRowProps): JSX.Element;
