import { Fragment } from 'react';
import type { MissingTobacco, MixRecord, MixStatus, MixSubstitution } from '@/contracts';

type StatusTag = { label: string; tone?: 'info' | 'warning'; ghost?: true };

const statusTags: Record<MixStatus, StatusTag> = {
  visible: { label: 'виден' },
  substituted: { label: 'с заменой', tone: 'info' },
  hidden: { label: 'скрыт', ghost: true },
  blocked: { label: 'блокирован', tone: 'warning' },
};

export const mixStatusTag = (status: MixStatus) => statusTags[status];

export const substitutionNote = ({ from, to }: MixSubstitution) => `${to.name} вместо ${from.name}`;

// Имя недостающего табака ведёт в его карточку: с полки, а если на полке его нет — в каталог.
export const MissingTobaccos = ({
  missing,
  onOpenTobacco,
}: {
  missing: MissingTobacco[];
  onOpenTobacco: (tobacco: MissingTobacco) => void;
}) => (
  <>
    Нет:{' '}
    {missing.map((tobacco, index) => (
      <Fragment key={tobacco.tobaccoId}>
        {index ? ', ' : null}
        <button
          type="button"
          className="inline-link"
          onClick={(event) => {
            event.stopPropagation();
            onOpenTobacco(tobacco);
          }}
        >
          {tobacco.name}
        </button>
      </Fragment>
    ))}
  </>
);

export const MixStatusCell = ({
  mix,
  onOpenTobacco,
}: {
  mix: Pick<MixRecord, 'status' | 'substitution' | 'missing'>;
  onOpenTobacco: (tobacco: MissingTobacco) => void;
}) => {
  const tag = mixStatusTag(mix.status);
  const note =
    mix.status === 'substituted' && mix.substitution ? (
      substitutionNote(mix.substitution)
    ) : mix.status === 'blocked' && mix.missing.length ? (
      <MissingTobaccos missing={mix.missing} onOpenTobacco={onOpenTobacco} />
    ) : null;
  return (
    <span className="mix-status">
      <span className={tag.ghost ? 'tag tag--ghost' : 'tag'} data-tone={tag.tone}>
        {tag.label}
      </span>
      {note ? <small>{note}</small> : null}
    </span>
  );
};
