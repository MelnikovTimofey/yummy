import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { dragModeFor, dragSelection, type DragMode } from '@/lib/drag-select';

// Выделение протягиванием по чекбоксам (#521): «Каталог» и «Полка».
// Только мышью: на телефоне этот жест — прокрутка.
export const useDragSelect = ({
  order,
  selected,
  onChange,
}: {
  order: string[];
  selected: string[];
  onChange: (next: string[], target: string) => void;
}) => {
  const dragRef = useRef<{ anchor: string; mode: DragMode; base: string[]; moved: boolean } | null>(null);

  useEffect(() => {
    const endDrag = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.moved) return;
      // Клик после протягивания не должен ещё раз переключить чекбокс или открыть карточку.
      const swallowClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  // На чекбоксе строки.
  const startDrag = (event: ReactPointerEvent, id: string) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.shiftKey) return;
    dragRef.current = { anchor: id, mode: dragModeFor(selected, id), base: selected, moved: false };
  };

  // На строке, при входе указателя.
  const dragOver = (event: ReactPointerEvent, id: string) => {
    const drag = dragRef.current;
    if (!drag) return;
    if ((event.buttons & 1) === 0) {
      dragRef.current = null;
      return;
    }
    if (!drag.moved && id === drag.anchor) return;
    drag.moved = true;
    onChange(dragSelection(order, drag.base, drag.anchor, id, drag.mode), id);
  };

  // Для onMouseDown чекбокса: без preventDefault протягивание выделяет текст строк.
  const isDragging = () => dragRef.current !== null;

  return { startDrag, dragOver, isDragging };
};
