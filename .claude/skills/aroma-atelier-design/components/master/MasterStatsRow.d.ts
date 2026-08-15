import type { CSSProperties, ReactNode } from 'react';

export interface MasterStatTile {
  /** Uppercase tracked micro-label: «В НАЛИЧИИ», «ВИДЕН ГОСТЮ». */
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** code = shift codes (4821) — tracked sans, tabular; success/warning/danger colour the value. */
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'code';
}

/**
 * The operational KPI strip that opens every Мастер module.
 *
 * @startingPoint section="Мастер" subtitle="KPI strip: 4 hairline-divided operational tiles" viewport="700x150"
 */
export interface MasterStatsRowProps {
  tiles: MasterStatTile[];
  style?: CSSProperties;
}
export function MasterStatsRow(props: MasterStatsRowProps): JSX.Element;
