import type { CSSProperties } from 'react';

export interface SegmentItem {
  id: string;
  label: string;
}

/** Guest top navigation: Подбор / Витрина / Каталог, or Знакомство / Предпочтения. */
export interface SegmentNavProps {
  items: SegmentItem[];
  value: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
}
export function SegmentNav(props: SegmentNavProps): JSX.Element;
