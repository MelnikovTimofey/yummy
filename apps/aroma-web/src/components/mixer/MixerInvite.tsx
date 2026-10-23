import { Blend, ChevronRight } from 'lucide-react';

const TITLE = 'Собрать свой микс';
const NOTE = 'Из табаков, которые сегодня есть на полках.';

// Приглашение в «Намиксуй»: первым на «Витрине» (#175), последним в «Подборе»
// с подписью. Отделено от строк миксов: без глифа, со значком «Намиксуй» из
// нижней панели. Два варианта на выбор владельца: `card` (A) и `outline` (B).
export function MixerInvite({
  onOpen,
  note = false,
  variant = 'card',
}: {
  onOpen: () => void;
  note?: boolean;
  variant?: 'card' | 'outline';
}) {
  if (variant === 'outline') {
    return (
      <div className="aroma-mixer-invite-outline">
        <button type="button" className="aroma-mixer-invite-outline-btn" onClick={onOpen}>
          <Blend size={18} strokeWidth={1.8} aria-hidden />
          {TITLE}
        </button>
        {note ? <p className="aroma-mixer-invite-note">{NOTE}</p> : null}
      </div>
    );
  }

  return (
    <button type="button" className="aroma-mixer-invite" onClick={onOpen}>
      <span className="aroma-mixer-invite-tile" aria-hidden>
        <Blend size={20} strokeWidth={1.8} />
      </span>
      <span className="aroma-mixer-invite-text">
        <span className="aroma-mixer-invite-title">{TITLE}</span>
        {note ? <span className="aroma-mixer-invite-note">{NOTE}</span> : null}
      </span>
      <ChevronRight className="aroma-mixer-invite-chevron" size={20} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
