import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ShelfRow } from '@/contracts';
import { formatNumber, formatShelfDate, shelfRowMenu } from '@/lib/shelf';
import { ShelfLeftPanel, ShelfReceiptForm, ShelfWriteOffForm, type CountInput } from './shelf-forms';

export type ShelfRowActions = {
  onEmpty: (row: ShelfRow) => void;
  onCount: (row: ShelfRow, input: CountInput) => void;
  onReceipt: (row: ShelfRow, input: { grams: number; priceKop?: number }) => void;
  onWriteOff: (row: ShelfRow, input: { grams: number; reason: string }) => void;
  onToggleStop: (row: ShelfRow) => void;
  onRemove: (row: ShelfRow) => void;
};

// left — «Сколько осталось?», main — меню «⋯», дальше — формы из меню.
export type ShelfMenuMode = 'left' | 'main' | 'receipt' | 'writeoff';

type ShelfRowMenuProps = {
  row: ShelfRow;
  anchor: HTMLElement;
  mode: ShelfMenuMode;
  actions: ShelfRowActions;
  onClose: () => void;
};

const GAP = 4;
const EDGE = 8;

const leftLabel = (row: ShelfRow) =>
  row.lastReceipt && row.fullGrams !== null
    ? `Сколько осталось · после прихода ${formatShelfDate(row.lastReceipt.at)} было ${formatNumber(row.fullGrams)} г`
    : 'Сколько осталось';

// Всплывашка строки полки. Живёт в портале поверх страницы: таблица обрезает
// переполнение по горизонтали, а у нижних строк всплывашка открывается вверх.
export const ShelfRowMenu = ({ row, anchor, mode: initialMode, actions, onClose }: ShelfRowMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ShelfMenuMode>(initialMode);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const items = shelfRowMenu(row);
  const name = `${row.tobacco.manufacturer} ${row.tobacco.name}`;

  useEffect(() => setMode(initialMode), [initialMode]);

  useLayoutEffect(() => {
    const place = () => {
      const menu = ref.current;
      if (!menu) return;
      const box = anchor.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = menu;
      const below = box.bottom + GAP;
      const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, box.top - height - GAP) : below;
      const left = Math.min(Math.max(EDGE, box.right - width), window.innerWidth - width - EDGE);
      setPosition({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchor, mode]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      anchor.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    if (mode === 'main') ref.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  }, [mode]);

  const label = mode === 'left' ? leftLabel(row) : mode === 'receipt' ? 'Приход без счёта' : mode === 'writeoff' ? 'Списать' : null;

  return createPortal(
    <div
      ref={ref}
      className={`shelf-menu${mode === 'main' ? '' : ' shelf-menu--wide'}`}
      role="dialog"
      aria-label={label ? `${label}: ${name}` : `Действия: ${name}`}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      onClick={(event) => event.stopPropagation()}
    >
      {label ? <span className="shelf-menu__label">{label}</span> : null}

      {mode === 'left' ? (
        <ShelfLeftPanel
          row={row}
          autoFocus
          onCount={(input) => actions.onCount(row, input)}
          onEmpty={items.canEmpty ? () => actions.onEmpty(row) : undefined}
        />
      ) : null}

      {mode === 'main' ? (
        <>
          <button type="button" className="shelf-menu__item" onClick={() => setMode('receipt')}>
            Добавить приход без счёта…
          </button>
          <button type="button" className="shelf-menu__item" disabled={!items.canWriteOff} onClick={() => setMode('writeoff')}>
            Списать…
          </button>
          <button type="button" className="shelf-menu__item" onClick={() => actions.onToggleStop(row)}>
            {items.stopLabel}
          </button>
          <div className="shelf-menu__sep" />
          <button type="button" className="shelf-menu__item" onClick={() => actions.onRemove(row)}>
            Убрать с полки <span className="shelf-faint">история останется</span>
          </button>
        </>
      ) : null}

      {mode === 'receipt' ? <ShelfReceiptForm row={row} onSubmit={(input) => actions.onReceipt(row, input)} onCancel={onClose} /> : null}
      {mode === 'writeoff' ? <ShelfWriteOffForm row={row} onSubmit={(input) => actions.onWriteOff(row, input)} onCancel={onClose} /> : null}
    </div>,
    document.body,
  );
};
