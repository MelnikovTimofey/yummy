import { Heart } from 'lucide-react';

import { heartLabel } from '@/lib/cabinet';

// Сердечко в шапке карточки микса (#244, мокап sheet-fav). Не акцентное:
// выключено — --text-muted, включено — кремовое --text-0 с заливкой.
export function HeartButton({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="heart-btn"
      aria-pressed={on}
      aria-label={heartLabel(on)}
      disabled={disabled}
      onClick={onClick}
    >
      <Heart size={22} strokeWidth={1.8} fill={on ? 'currentColor' : 'none'} aria-hidden />
    </button>
  );
}
