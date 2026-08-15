import type { CSSProperties } from 'react';

/** 196px card in a Витрина rail. Halo tint comes from the mix's first flavour profile. */
export interface ShowcaseCardProps {
  name: string;
  flavors?: string[];
  profiles?: string[];
  rating?: number;
  onClick?: () => void;
  style?: CSSProperties;
}
export function ShowcaseCard(props: ShowcaseCardProps): JSX.Element;
