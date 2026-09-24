import { ProfileGlyph } from '@/components/aroma';

import './mixer.css';

// Приглашение в «Намиксуй»: первой карточкой на «Витрине» и последней в «Подборе».
export function MixerInvite({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="mixer-invite" onClick={onOpen}>
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={44} />
      <span className="mixer-invite-text">
        <span className="aroma-caps">Намиксуй</span>
        <span className="mixer-invite-title">Не нашли своё? Намиксуйте сами</span>
        <span className="mixer-invite-note">Основа, акцент и штрих — из того, что сегодня есть на полках.</span>
      </span>
    </button>
  );
}
