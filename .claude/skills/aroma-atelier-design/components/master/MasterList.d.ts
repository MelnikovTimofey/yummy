import type { CSSProperties, ReactNode } from 'react';

export interface MasterListColumn {
  key: string;
  label: string;
  /** Any grid track value; defaults to minmax(0,1fr). */
  width?: string;
  align?: 'left' | 'right' | 'center';
  wrap?: boolean;
  render?: (row: Record<string, any>) => ReactNode;
}

/**
 * The table-first surface behind Инвентаризация, Миксы and Рейлы.
 *
 * @startingPoint section="Мастер" subtitle="Dense operational table with mono header row" viewport="900x320"
 */
export interface MasterListProps {
  columns: MasterListColumn[];
  rows: Array<Record<string, any>>;
  onRowClick?: (row: Record<string, any>) => void;
  /** Row ids rendered in the selected (accent-soft) state. */
  selectedIds?: string[];
  style?: CSSProperties;
}
export function MasterList(props: MasterListProps): JSX.Element;
