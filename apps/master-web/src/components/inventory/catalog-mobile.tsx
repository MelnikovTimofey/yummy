import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BusyLabel } from '@/components/ui/loading';
import { ShelfCheck } from '@/components/shelf/shelf-bulk';
import { formatMetricValue, type InventoryTobacco } from '@/contracts';
import { catalogBrandLine, catalogCardShelf, catalogRemoveLabel, formatInMixes } from '@/lib/catalog-mobile';
import type { ShelfState } from '@/lib/shelf';
import type { CatalogBatchAction } from './inventory-view';

// «Каталог» на телефоне (#540, #shot=catalog, catalog-select): карточки вместо
// таблицы, выбор — как на «Полке» (#333).

type CatalogMobileListProps = {
  items: InventoryTobacco[];
  shelfStates: ReadonlyMap<string, ShelfState>;
  // Режим выбора: null — обычный список.
  picked: string[] | null;
  pendingRowId: string;
  // Табак, для которого ждём ответа «В план», а не «На полку».
  planningId: string;
  batchBusy: boolean;
  onOpen: (item: InventoryTobacco) => void;
  onPick: (item: InventoryTobacco) => void;
  onAddToShelf: (item: InventoryTobacco) => void;
  onAddToPlan: (item: InventoryTobacco) => void;
  onMenu: (item: InventoryTobacco) => void;
};

export const CatalogMobileList = ({
  items,
  shelfStates,
  picked,
  pendingRowId,
  planningId,
  batchBusy,
  onOpen,
  onPick,
  onAddToShelf,
  onAddToPlan,
  onMenu,
}: CatalogMobileListProps) => (
  <ul className="m-catalog-list" aria-label="Табаки каталога" data-picking={picked ? true : undefined}>
    {items.map((item) => {
      const state = shelfStates.get(item.id);
      const shelf = catalogCardShelf(state);
      const isPicked = picked?.includes(item.id) ?? false;
      const flavors = (item.flavors ?? []).slice(0, 3).join(', ');
      const pending = pendingRowId === item.id;
      const addDisabled = pending || batchBusy || item.archived;
      return (
        <li
          key={item.id}
          className="m-catalog-card"
          data-tobacco-id={item.id}
          data-picked={isPicked || undefined}
          // Касание по карточке открывает табак, в режиме выбора — отмечает его.
          onClick={() => (picked ? onPick(item) : onOpen(item))}
        >
          <div className="m-catalog-card__head">
            {picked ? <ShelfCheck checked={isPicked} label={`Выбрать ${item.name}`} onToggle={() => onPick(item)} /> : null}
            <span className="m-catalog-card__copy">
              {picked ? (
                <b className="m-catalog-card__name">{item.name}</b>
              ) : (
                <button type="button" className="m-catalog-card__name">
                  {item.name}
                </button>
              )}
              {item.archived ? <span className="tag m-catalog-card__archived">Архив</span> : null}
              <span className="m-catalog-card__brand">{catalogBrandLine(item)}</span>
              {flavors ? <span className="m-catalog-card__flavors">{flavors}</span> : null}
            </span>
            {picked ? null : state ? (
              <button
                type="button"
                className="icon-btn m-catalog-card__menu"
                aria-label={`Действия: ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onMenu(item);
                }}
              >
                <Ellipsis size={18} aria-hidden />
              </button>
            ) : (
              <span className="m-catalog-card__actions">
                <button
                  type="button"
                  className="m-catalog-card__btn"
                  aria-label={`На полку: ${item.name}`}
                  disabled={addDisabled}
                  aria-busy={(pending && planningId !== item.id) || undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToShelf(item);
                  }}
                >
                  <BusyLabel busy={pending && planningId !== item.id}>На полку</BusyLabel>
                </button>
                <button
                  type="button"
                  className="m-catalog-card__btn"
                  data-variant="ghost"
                  aria-label={`В план: ${item.name}`}
                  disabled={addDisabled}
                  aria-busy={(pending && planningId === item.id) || undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToPlan(item);
                  }}
                >
                  <BusyLabel busy={pending && planningId === item.id}>В план</BusyLabel>
                </button>
              </span>
            )}
          </div>
          <div className="m-catalog-card__foot">
            <span className="shelf-status" data-tone={shelf.tone}>
              <i aria-hidden />
              {shelf.label}
            </span>
            <span>{formatInMixes(item.dependentMixCount ?? 0)}</span>
          </div>
        </li>
      );
    })}
  </ul>
);

// Меню «⋯» карточки: «Профиль», как в меню строки на десктопе, и «Убрать с полки»
// или «Убрать из плана» из профиля.
export const CatalogActionsSheet = ({
  item,
  state,
  onProfile,
  onRemoveFromShelf,
  onClose,
}: {
  item: InventoryTobacco;
  state: ShelfState;
  onProfile: () => void;
  onRemoveFromShelf: () => void;
  onClose: () => void;
}) => {
  const act = (run: () => void) => {
    onClose();
    run();
  };
  return (
    <BottomSheet label={`Действия: ${item.name}`} onClose={onClose} className="m-actions">
      <div className="m-mark-sheet__head">
        <h2 className="m-mark-sheet__title">{item.name}</h2>
        <p className="m-mark-sheet__brand">{catalogBrandLine(item)}</p>
      </div>
      <div className="m-actions__list">
        <button type="button" className="m-actions__item" onClick={() => act(onProfile)}>
          Профиль
        </button>
        <button type="button" className="m-actions__item m-actions__item--sep" onClick={() => act(onRemoveFromShelf)}>
          {catalogRemoveLabel(state)}
        </button>
      </div>
    </BottomSheet>
  );
};

// Панель выбранных над нижним меню (#shot=catalog-select): «На полку» сразу,
// остальные действия десктопной панели — в «⋯».
export const CatalogMobileBulk = ({
  count,
  pending,
  archivedActive,
  labels,
  onRun,
}: {
  count: number;
  pending: '' | CatalogBatchAction;
  archivedActive: boolean;
  labels: Record<CatalogBatchAction, string>;
  onRun: (action: CatalogBatchAction) => void;
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const busy = pending !== '';
  const more: CatalogBatchAction[] = ['shelf-remove', archivedActive ? 'unarchive' : 'archive'];
  return (
    <div className="m-catalog-bulk" role="toolbar" aria-label="Выбранные табаки">
      <b>Выбрано {formatMetricValue(count)}</b>
      <button
        type="button"
        className="m-catalog-bulk__main"
        disabled={busy || !count}
        aria-busy={pending === 'shelf-add' || undefined}
        onClick={() => onRun('shelf-add')}
      >
        <BusyLabel busy={pending === 'shelf-add'}>{labels['shelf-add']}</BusyLabel>
      </button>
      <button
        type="button"
        className="icon-btn m-catalog-bulk__more"
        aria-label="Ещё действия"
        disabled={busy || !count}
        onClick={() => setMoreOpen(true)}
      >
        <Ellipsis size={18} aria-hidden />
      </button>
      {moreOpen ? (
        <BottomSheet label="Действия с выбранными" onClose={() => setMoreOpen(false)} className="m-actions">
          <div className="m-mark-sheet__head">
            <h2 className="m-mark-sheet__title">Выбрано {formatMetricValue(count)}</h2>
          </div>
          <div className="m-actions__list">
            {more.map((action) => (
              <button
                key={action}
                type="button"
                className="m-actions__item"
                onClick={() => {
                  setMoreOpen(false);
                  onRun(action);
                }}
              >
                {labels[action]}
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}
    </div>
  );
};
