import { Fragment } from 'react';
import type { MissingTobacco, MixRecord, MixStatus, MixSubstitution, TobaccoRef } from '@/contracts';

type StatusTag = { label: string; tone?: 'info' | 'warning'; ghost?: true };

const statusTags: Record<MixStatus, StatusTag> = {
  visible: { label: 'виден' },
  substituted: { label: 'с заменой', tone: 'info' },
  hidden: { label: 'скрыт', ghost: true },
  blocked: { label: 'блокирован', tone: 'warning' },
};

export const mixStatusTag = (status: MixStatus) => statusTags[status];

// Одноимённые табаки разных брендов («Гранатовый сок вместо Гранатовый сок») различаем брендом.
export const substitutionNames = ({ from, to }: MixSubstitution) =>
  from.name === to.name
    ? { to: `${to.manufacturer} ${to.name}`, from: `${from.manufacturer} ${from.name}` }
    : { to: to.name, from: from.name };

export const substitutionNote = (substitution: MixSubstitution) => {
  const names = substitutionNames(substitution);
  return `${names.to} вместо ${names.from}`;
};

type OpenTobacco = (tobacco: MissingTobacco) => void;

// Имя табака ведёт в его карточку: с полки, а если на полке его нет — в каталог.
const TobaccoLink = ({ tobacco, label, onOpen }: { tobacco: MissingTobacco; label: string; onOpen: OpenTobacco }) => (
  <button
    type="button"
    className="inline-link"
    onClick={(event) => {
      event.stopPropagation();
      onOpen(tobacco);
    }}
  >
    {label}
  </button>
);

export const MissingTobaccos = ({ missing, onOpenTobacco }: { missing: MissingTobacco[]; onOpenTobacco: OpenTobacco }) => (
  <>
    Нет:{' '}
    {missing.map((tobacco, index) => (
      <Fragment key={tobacco.tobaccoId}>
        {index ? ', ' : null}
        <TobaccoLink tobacco={tobacco} label={tobacco.name} onOpen={onOpenTobacco} />
      </Fragment>
    ))}
  </>
);

// Замена стоит на полке в наличии; закончившийся табак берём из missing, там известно, на полке ли он.
const SubstitutionLinks = ({
  substitution,
  missing,
  onOpenTobacco,
}: {
  substitution: MixSubstitution;
  missing: MissingTobacco[];
  onOpenTobacco: OpenTobacco;
}) => {
  const names = substitutionNames(substitution);
  const onShelf = (ref: TobaccoRef) => missing.find((item) => item.tobaccoId === ref.tobaccoId)?.onShelf ?? false;
  return (
    <>
      <TobaccoLink tobacco={{ ...substitution.to, onShelf: true }} label={names.to} onOpen={onOpenTobacco} /> вместо{' '}
      <TobaccoLink tobacco={{ ...substitution.from, onShelf: onShelf(substitution.from) }} label={names.from} onOpen={onOpenTobacco} />
    </>
  );
};

export const MixStatusCell = ({
  mix,
  onOpenTobacco,
}: {
  mix: Pick<MixRecord, 'status' | 'substitution' | 'missing'>;
  onOpenTobacco: OpenTobacco;
}) => {
  const tag = mixStatusTag(mix.status);
  const note =
    mix.status === 'substituted' && mix.substitution ? (
      <SubstitutionLinks substitution={mix.substitution} missing={mix.missing} onOpenTobacco={onOpenTobacco} />
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
