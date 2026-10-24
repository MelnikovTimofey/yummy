import { Blend } from 'lucide-react';

// Приглашение в «Намиксуй»: первым на «Витрине» (#175), последним в «Подборе»
// с подписью. Кнопка-контур со значком из нижней панели, а не карточка, чтобы
// не читаться ещё одной строкой микса (вариант B, выбор владельца).
export function MixerInvite({ onOpen, note = false }: { onOpen: () => void; note?: boolean }) {
  return (
    <div className="aroma-mixer-invite">
      <button type="button" className="aroma-mixer-invite-btn" onClick={onOpen}>
        <Blend size={18} strokeWidth={1.8} aria-hidden />
        Собрать свой микс
      </button>
      {note ? <p className="aroma-mixer-invite-note">Из табаков, которые сегодня есть на полках.</p> : null}
    </div>
  );
}
