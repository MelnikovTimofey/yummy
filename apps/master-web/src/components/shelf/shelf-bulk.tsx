import { useEffect, useRef, useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { formatNumber } from '@/lib/shelf';
import type { BulkSummary } from '@/lib/shelf-bulk';

// Выбор нескольких табаков (#333): #shot=shelf-bulk, shelf-bulk-done, mobile-bulk.

export const ShelfCheck = ({
  checked,
  label,
  onToggle,
}: {
  checked: boolean | 'mixed';
  label: string;
  onToggle: (range: boolean) => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    // Клавиши — в title, строки подсказок под таблицей нет (#364).
    title="Клавиша X. Shift и клик выделяют диапазон"
    className="shelf-check"
    // Shift + клик не выделяет текст таблицы.
    onMouseDown={(event) => {
      if (event.shiftKey) event.preventDefault();
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
  onStop: () => void;
  onKeep: (keep: boolean) => void;
};

const KEEP_OPTIONS: Array<[boolean, string, string]> = [
  [true, 'Держим постоянно', 'попадут в заказ, когда закончатся'],
  [false, 'Не держим постоянно', 'в заказ не попадут'],
];

// «Держим постоянно» на десктопе: меню над панелью, вкл или выкл для всех выбранных.
const KeepMenu = ({ disabled, onKeep }: { disabled: boolean; onKeep: (keep: boolean) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    // Esc закрывает меню, а не снимает выделение.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={ref} className="shelf-bulk__keep">
      <button
        type="button"
        className="btn"
        data-size="sm"
        data-variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        Держим постоянно
      </button>
      {open ? (
        <div className="shelf-menu shelf-bulk__menu" role="menu" aria-label="Держим постоянно">
          {KEEP_OPTIONS.map(([keep, label, hint], index) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="shelf-menu__item"
              autoFocus={index === 0}
              onClick={() => {
                setOpen(false);
                onKeep(keep);
              }}
            >
              {label} <span className="shelf-faint">{hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
};

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
    <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={actions.onStop}>
      {summary.allStopped ? 'Снять стоп' : 'Стоп для гостей'}
    </button>
    <KeepMenu disabled={busy} onKeep={actions.onKeep} />
    <button type="button" className="icon-btn" aria-label="Снять выделение" title="Клавиша Esc" onClick={onClear}>
      <X size={14} aria-hidden />
    </button>
  </div>
);

// Телефон (#shot=mobile-bulk): внизу «Закончились», стоп и «Держим постоянно»; сколько выбрано — в шапке.
export const ShelfMobileBulk = ({ summary, busy, actions }: { summary: BulkSummary; busy: boolean; actions: ShelfBulkActions }) => {
  const [keepOpen, setKeepOpen] = useState(false);
  return (
    <>
      <div className="m-shelf-bulk" role="toolbar" aria-label="Выбранные табаки">
        <button type="button" className="m-shelf-bulk__empty" disabled={busy || !summary.emptyCount} onClick={actions.onEmpty}>
          Закончились
        </button>
        <div className="m-shelf-bulk__acts">
          <button type="button" className="m-shelf-card__left" disabled={busy || !summary.count} onClick={actions.onStop}>
            {summary.allStopped ? 'Снять стоп' : 'Стоп для гостей'}
          </button>
          <button type="button" className="m-shelf-card__left" disabled={busy || !summary.count} onClick={() => setKeepOpen(true)}>
            Держим постоянно
          </button>
        </div>
      </div>
      {keepOpen ? (
        <BottomSheet label="Держим постоянно" onClose={() => setKeepOpen(false)} className="m-actions">
          <div className="m-mark-sheet__head">
            <h2 className="m-mark-sheet__title">Держим постоянно</h2>
            <p className="m-mark-sheet__line">Выбрано: {formatNumber(summary.count)}</p>
          </div>
          <div className="m-actions__list">
            {KEEP_OPTIONS.map(([keep, label, hint]) => (
              <button
                key={label}
                type="button"
                className="m-actions__item"
                onClick={() => {
                  setKeepOpen(false);
                  actions.onKeep(keep);
                }}
              >
                {label} <span className="shelf-faint">{hint}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
};
