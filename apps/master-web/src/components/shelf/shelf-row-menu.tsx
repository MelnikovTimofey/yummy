import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ShelfRow } from '@/contracts';
import { shelfRowMenu } from '@/lib/shelf';

export type ShelfRowActions = {
  onToggleStop: (row: ShelfRow) => void;
  onRemove: (row: ShelfRow) => void;
};

type ShelfRowMenuProps = {
  row: ShelfRow;
  anchor: HTMLElement;
  actions: ShelfRowActions;
  onClose: () => void;
};

const GAP = 4;
const EDGE = 8;

// Меню «⋯» строки полки. Живёт в портале поверх страницы: таблица обрезает
// переполнение по горизонтали, а у нижних строк меню открывается вверх.
export const ShelfRowMenu = ({ row, anchor, actions, onClose }: ShelfRowMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const items = shelfRowMenu(row);
  const name = `${row.tobacco.manufacturer} ${row.tobacco.name}`;

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
  }, [anchor]);

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
    ref.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  }, []);

  return createPortal(
    <div
      ref={ref}
      className="shelf-menu"
      role="dialog"
      aria-label={`Действия: ${name}`}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="shelf-menu__item" onClick={() => actions.onToggleStop(row)}>
        {items.stopLabel}
      </button>
      <div className="shelf-menu__sep" />
      <button type="button" className="shelf-menu__item" onClick={() => actions.onRemove(row)}>
        Убрать с полки <span className="shelf-faint">история останется</span>
      </button>
    </div>,
    document.body,
  );
};
