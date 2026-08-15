import type { CSSProperties } from 'react';

/** Guest-facing average rating. Russian decimal comma, tabular numerals. */
export interface RatingPillProps {
  rating: number;
  /** Vote count, appended as "· 128". */
  count?: number;
  style?: CSSProperties;
}
export function RatingPill(props: RatingPillProps): JSX.Element;
