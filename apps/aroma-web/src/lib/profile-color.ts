import { PROFILE_COLORS, PROFILE_FALLBACK } from './profile-colors.generated';

/** Цвета вкусовых профилей — слой данных, не бренд (PRD §12).
 *  Значения задаются в packages/design-tokens/profile-colors.css; сюда они
 *  попадают генератором, потому что к цвету в halo-градиентах дописывается
 *  альфа строкой и var() не подходит. */
export const profileColor = PROFILE_COLORS;

export const getProfileColor = (profileId: string | null | undefined): string =>
  (profileId && profileColor[profileId]) || PROFILE_FALLBACK;
