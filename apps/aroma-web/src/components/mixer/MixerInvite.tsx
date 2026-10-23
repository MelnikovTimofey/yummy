import { ChevronRight } from 'lucide-react';

// Приглашение в «Намиксуй»: первым на «Витрине» одной строкой (#175), последним
// в «Подборе» — с подписью. Без глифа: своих профилей у приглашения нет.
export function MixerInvite({ onOpen, note = false }: { onOpen: () => void; note?: boolean }) {
  return (
    <button type="button" className="aroma-mixer-invite" onClick={onOpen}>
      <span className="aroma-mixer-invite-text">
        <span className="aroma-mixer-invite-title">Собрать свой микс</span>
        {note ? <span className="aroma-mixer-invite-note">Из табаков, которые сегодня есть на полках.</span> : null}
      </span>
      <ChevronRight className="aroma-mixer-invite-chevron" size={20} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
