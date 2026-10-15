import type { CSSProperties } from 'react';

/** 156×92 poster in a Витрина shelf. Background tints come from the mix's first two flavour profiles over `--guest-card-bg`. */
export interface ShowcaseCardProps {
  name: string;
  profiles?: string[];
  rating?: number;
  onClick?: () => void;
  style?: CSSProperties;
}
export function ShowcaseCard(props: ShowcaseCardProps): JSX.Element;
