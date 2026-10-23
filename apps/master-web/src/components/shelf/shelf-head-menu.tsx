import { useEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

// Меню «⋯» в шапке «Полки» (README §7): пока в нём одни настройки полки.
export const ShelfHeadMenu = ({ onSettings }: { onSettings: () => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={ref} className="shelf-head-menu">
      <button
        type="button"
        className="icon-btn"
        aria-label="Меню полки"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Ellipsis size={15} aria-hidden />
      </button>
      {open ? (
        <div className="shelf-menu shelf-menu--head" role="menu" aria-label="Меню полки">
          <button
            type="button"
            role="menuitem"
            className="shelf-menu__item"
            autoFocus
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
          >
            Настройки полки
          </button>
        </div>
      ) : null}
    </span>
  );
};
