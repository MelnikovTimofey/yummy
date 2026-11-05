import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ShelfRow, ShelfTrialVerdict } from '@/contracts';
import { shelfRowAction, shelfRowMenu } from '@/lib/shelf';
import { ShelfCheck } from './shelf-bulk';
import { ShelfAnalogsCell } from './shelf-analogs';
import type { ShelfRowActions } from './shelf-row-menu';
import { ShelfStatusCell } from './shelf-status';
import { TrialMark } from './shelf-trial-mark';

// «Полка» на телефоне (#215, #518, #shot=mobile-shelf): мастер у стойки жмёт
// «Закончился» или «Вернуть» одним касанием.

const fullName = (row: ShelfRow) => `${row.tobacco.manufacturer} ${row.tobacco.name}`;

type ShelfMobileListProps = {
  rows: ShelfRow[];
  pendingId: string;
  // Режим выбора (#333, #shot=mobile-bulk): null — обычная полка.
  picked: string[] | null;
  onPick: (row: ShelfRow) => void;
  onEmpty: (row: ShelfRow) => void;
  onRestock: (row: ShelfRow) => void;
  onUnstop: (row: ShelfRow) => void;
  onOpenCard: (row: ShelfRow) => void;
  onTrialVerdict: (row: ShelfRow, verdict: ShelfTrialVerdict | null) => Promise<void>;
};

export const ShelfMobileList = ({
  rows,
  pendingId,
  picked,
  onPick,
  onEmpty,
  onRestock,
  onUnstop,
  onOpenCard,
  onTrialVerdict,
}: ShelfMobileListProps) => (
  <ul className="m-shelf-list" aria-label="Табаки на полке" data-picking={picked ? true : undefined}>
    {rows.map((row) => {
      const action = picked ? null : shelfRowAction(row);
      const busy = pendingId === row.tobacco.id;
      const isPicked = picked?.includes(row.tobacco.id) ?? false;
      return (
        <li
          key={row.tobacco.id}
          className="m-shelf-card"
          data-tobacco-id={row.tobacco.id}
          data-picked={isPicked || undefined}
          // В режиме выбора касание по карточке выбирает табак.
          onClick={picked ? () => onPick(row) : undefined}
        >
          {picked ? (
            <span className="m-shelf-card__pick">
              <ShelfCheck checked={isPicked} label={`Выбрать ${fullName(row)}`} onToggle={() => onPick(row)} />
              <span className="shelf-name">
                <b>{row.tobacco.name}</b>
                <span>{row.tobacco.manufacturer}</span>
              </span>
            </span>
          ) : (
            <button type="button" className="m-shelf-card__name shelf-name" onClick={() => onOpenCard(row)}>
              <b>{row.tobacco.name}</b>
              <span>{row.tobacco.manufacturer}</span>
            </button>
          )}
          {action === 'empty' ? (
            <button type="button" className="m-shelf-card__btn" disabled={busy} onClick={() => onEmpty(row)}>
              Закончился
            </button>
          ) : action === 'restock' ? (
            <button type="button" className="m-shelf-card__btn" aria-label={`Вернуть в наличие ${fullName(row)}`} disabled={busy} onClick={() => onRestock(row)}>
              Вернуть
            </button>
          ) : action === 'unstop' ? (
            <button type="button" className="m-shelf-card__btn" disabled={busy} onClick={() => onUnstop(row)}>
              Снять стоп
            </button>
          ) : (
            <span />
          )}
          <div className="m-shelf-card__meta">
            <ShelfStatusCell row={row} />
            {row.trial ? <span className="tag shelf-trial-tag">проба</span> : null}
          </div>
          {row.analogs.length > 0 && !picked ? (
            <div className="m-shelf-card__analogs">
              <span>Аналоги</span>
              <ShelfAnalogsCell analogs={row.analogs} />
            </div>
          ) : null}
          {/* Проба (#329, #shot=mobile-trial): отметка у стойки, одно касание. */}
          {row.trial && !picked ? (
            <div className="m-shelf-card__trial">
              <span>Как зашла проба?</span>
              <TrialMark
                value={row.trialVerdict}
                size="lg"
                label={`Как зашла проба: ${fullName(row)}`}
                onChange={(next) => onTrialVerdict(row, next)}
              />
            </div>
          ) : null}
        </li>
      );
    })}
  </ul>
);

// Действия карточки на телефоне (#228): те же пункты, что в меню «⋯» строки на десктопе.
export const ShelfActionsSheet = ({ row, actions, onClose }: { row: ShelfRow; actions: ShelfRowActions; onClose: () => void }) => {
  const act = (run: () => void) => {
    onClose();
    run();
  };
  return (
    <BottomSheet label={`Действия: ${fullName(row)}`} onClose={onClose} className="m-actions">
      <div className="m-mark-sheet__head">
        <h2 className="m-mark-sheet__title">{row.tobacco.name}</h2>
        <p className="m-mark-sheet__brand">{row.tobacco.manufacturer}</p>
      </div>
      <div className="m-actions__list">
        <button type="button" className="m-actions__item" onClick={() => act(() => actions.onToggleStop(row))}>
          {shelfRowMenu(row).stopLabel}
        </button>
        <button type="button" className="m-actions__item m-actions__item--sep" onClick={() => act(() => actions.onRemove(row))}>
          Убрать с полки <span className="shelf-faint">история останется</span>
        </button>
      </div>
    </BottomSheet>
  );
};
