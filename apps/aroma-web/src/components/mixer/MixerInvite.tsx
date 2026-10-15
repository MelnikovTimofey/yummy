import { ChevronRight } from 'lucide-react';

import { ProfileGlyph } from '@/components/aroma';

import './mixer.css';

// Приглашение в «Намиксуй»: первым на «Витрине» — низкой полосой (#175),
// последним в «Подборе» — карточкой.
export function MixerInvite({ onOpen, strip = false }: { onOpen: () => void; strip?: boolean }) {
  if (strip) {
    return (
      <button type="button" className="mixer-invite mixer-invite-strip" onClick={onOpen}>
        <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={32} />
        <span className="mixer-invite-text">
          <span className="aroma-caps mixer-invite-kicker">Не нашли своё?</span>
          <span className="mixer-invite-title">Намиксуйте сами</span>
        </span>
        <ChevronRight className="mixer-invite-chevron" size={20} strokeWidth={1.8} aria-hidden />
      </button>
    );
  }

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
