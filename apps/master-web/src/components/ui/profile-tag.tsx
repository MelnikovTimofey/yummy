import { flavorProfileColor, formatFlavorProfileLabel } from '@/contracts';

// Профиль вкуса — нейтральный тег с точкой цвета профиля: цвет несёт данные,
// а не акцент, поэтому текст и рамка остаются нейтральными.
export const ProfileTag = ({ profile }: { profile: string }) => (
  <span className="tag">
    <span className="tag__dot" style={{ background: flavorProfileColor(profile) }} aria-hidden="true" />
    {formatFlavorProfileLabel(profile)}
  </span>
);
