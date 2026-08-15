import type { CSSProperties } from 'react';

/** Selectable flavour-profile tile — onboarding step 1, laid out 2 per row. */
export interface ProfileCardProps {
  label: string;
  /** Flavour-profile id, drives the data-colour dot. */
  profile: string;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export function ProfileCard(props: ProfileCardProps): JSX.Element;
