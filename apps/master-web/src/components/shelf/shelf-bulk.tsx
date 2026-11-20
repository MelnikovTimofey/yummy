import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { formatNumber } from '@/lib/shelf';
import type { BulkSummary } from '@/lib/shelf-bulk';

// Выбор нескольких табаков (#333, #517, #518): #shot=shelf-bulk, mobile-bulk.

export const ShelfCheck = ({
  checked,
  label,
  onToggle,
  onDragStart,
  dragging,
}: {
  checked: boolean | 'mixed';
  label: string;
  onToggle: (range: boolean) => void;
  // Протягивание по чекбоксам строк (#521), как в «Каталоге».
  onDragStart?: (event: ReactPointerEvent) => void;
  dragging?: () => boolean;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    // Клавиши — в title, строки подсказок под таблицей нет (#364).
    title="Клавиша X. Shift и клик или протягивание выделяют диапазон"
    className="shelf-select"
    onPointerDown={onDragStart}
    // Shift + клик и протягивание не выделяют текст таблицы.
    onMouseDown={(event) => {
      if (event.shiftKey || dragging?.()) event.preventDefault();
    }}
    onClick={(event) => {
      event.stopPropagation();
      onToggle(event.shiftKey);
    }}
  >
    {checked === true ? <Check size={12} strokeWidth={3} aria-hidden /> : checked === 'mixed' ? <Minus size={12} strokeWidth={3} aria-hidden /> : null}
  </button>
);

export type ShelfBulkActions = {
  onEmpty: () => void;
  onRestock: () => void;
  onKeep: () => void;
  onStop: () => void;
  onRemove: () => void;
};

const keepLabel = (summary: BulkSummary) => (summary.allKept ? 'Не держать постоянно' : 'Держать постоянно');
const stopLabel = (summary: BulkSummary) => (summary.allStopped ? 'Снять стоп' : 'Стоп для гостей');

// Панель выбранных внизу (#shot=shelf-bulk): одно действие на всех, одна отмена на всех.
export const ShelfBulkBar = ({
  summary,
  busy,
  actions,
  onClear,
}: {
  summary: BulkSummary;
  busy: boolean;
  actions: ShelfBulkActions;
  onClear: () => void;
}) => (
  <div className="shelf-bulk" role="toolbar" aria-label="Выбранные табаки">
    <b>Выбрано {formatNumber(summary.count)}</b>
    <span className="shelf-bulk__names">{summary.names}</span>
    <button type="button" className="btn" data-size="sm" disabled={busy || !summary.emptyCount} title="Клавиша E" onClick={actions.onEmpty}>
      Закончились
    </button>
    <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy || !summary.restockCount} onClick={actions.onRestock}>
      Вернуть в наличие
    </button>
    <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={actions.onKeep}>
      {keepLabel(summary)}
    </button>
    <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={actions.onStop}>
      {stopLabel(summary)}
    </button>
    <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={actions.onRemove}>
      Убрать с полки
    </button>
    <button type="button" className="icon-btn" aria-label="Снять выделение" title="Клавиша Esc" onClick={onClear}>
      <X size={14} aria-hidden />
    </button>
  </div>
);

// Телефон (#shot=mobile-bulk): внизу «Закончились», под ним остальные действия; сколько выбрано — в шапке.
export const ShelfMobileBulk = ({ summary, busy, actions }: { summary: BulkSummary; busy: boolean; actions: ShelfBulkActions }) => (
  <div className="m-shelf-bulk" role="toolbar" aria-label="Выбранные табаки">
    <button type="button" className="m-shelf-bulk__empty" disabled={busy || !summary.emptyCount} onClick={actions.onEmpty}>
      Закончились
    </button>
    <div className="m-shelf-bulk__acts">
      <button type="button" className="m-shelf-bulk__act" disabled={busy || !summary.restockCount} onClick={actions.onRestock}>
        Вернуть в наличие
      </button>
      <button type="button" className="m-shelf-bulk__act" disabled={busy || !summary.count} onClick={actions.onKeep}>
        {keepLabel(summary)}
      </button>
      <button type="button" className="m-shelf-bulk__act" disabled={busy || !summary.count} onClick={actions.onStop}>
        {stopLabel(summary)}
      </button>
      <button type="button" className="m-shelf-bulk__act" disabled={busy || !summary.count} onClick={actions.onRemove}>
        Убрать с полки
      </button>
    </div>
  </div>
);
