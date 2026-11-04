import { useState } from 'react';
import { Ellipsis, Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { MissingTobacco, MixRecord } from '@/contracts';
import { formatMetricValue, formatRating } from '@/contracts';
import { MixStatusCell } from './mix-status';

type MixPhoneCardProps = {
  mix: MixRecord;
  busy: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onToggleAvailable: () => void;
  onDelete: () => void;
  onOpenTobacco: (tobacco: MissingTobacco) => void;
};

// Микс на телефоне (#540, #shot=mixes): название и пропорции, состав, статус у гостя
// и чем закрыт недостающий табак. Тап открывает конструктор, «⋯» — действия строки.
export const MixPhoneCard = ({ mix, busy, onOpen, onCopy, onToggleAvailable, onDelete, onOpenTobacco }: MixPhoneCardProps) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const ratio = mix.components.map((component) => component.proportion).join('/');
  const act = (run: () => void) => {
    setActionsOpen(false);
    run();
  };

  return (
    <article className="m-mix-card" data-mix-id={mix.id} data-status={mix.status}>
      <button type="button" className="m-mix-card__open" onClick={onOpen} aria-label={`Открыть ${mix.name}`}>
        <span className="m-mix-card__title">
          <b>{mix.name}</b>
          {ratio ? <span className="m-mix-card__ratio">{ratio}</span> : null}
        </span>
        <span className="m-mix-card__parts">
          {mix.components.map((component) => `${component.manufacturer} ${component.name}`).join(' + ')}
        </span>
      </button>
      <button
        type="button"
        className="icon-btn m-mix-card__more"
        onClick={() => setActionsOpen(true)}
        aria-label={`Действия: ${mix.name}`}
        disabled={busy}
      >
        <Ellipsis size={18} aria-hidden="true" />
      </button>
      <div className="m-mix-card__foot">
        <MixStatusCell mix={mix} onOpenTobacco={onOpenTobacco} />
        <span className="m-mix-card__stats">
          <span title="Нажатия «Покурить»">{formatMetricValue(mix.smokeCtaCount)} выб.</span>
          <span title="Средний рейтинг гостей">
            <Star size={12} aria-hidden="true" />
            {formatRating(mix.avgRating)}
          </span>
        </span>
      </div>

      {actionsOpen ? (
        <BottomSheet label={`Действия: ${mix.name}`} onClose={() => setActionsOpen(false)} className="m-actions">
          <div className="m-mark-sheet__head">
            <h2 className="m-mark-sheet__title">{mix.name}</h2>
            {ratio ? <p className="m-mark-sheet__brand">{ratio}</p> : null}
          </div>
          <div className="m-actions__list">
            <button type="button" className="m-actions__item" onClick={() => act(onCopy)}>
              Дублировать
            </button>
            <button type="button" className="m-actions__item" onClick={() => act(onToggleAvailable)}>
              {mix.available ? 'Скрыть с витрины' : 'Вернуть на витрину'}
            </button>
            <button type="button" className="m-actions__item m-actions__item--sep" onClick={() => act(onDelete)}>
              Удалить микс
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </article>
  );
};
