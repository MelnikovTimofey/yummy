import type { CSSProperties } from 'react';

/** Two-step onboarding progress row: back, oxblood bar, "1/2". */
export interface OnboardingProgressProps {
  step?: number;
  total?: number;
  onBack?: () => void;
  style?: CSSProperties;
}
export function OnboardingProgress(props: OnboardingProgressProps): JSX.Element;
