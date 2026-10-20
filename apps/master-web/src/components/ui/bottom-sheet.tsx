import { useRef, useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';

type BottomSheetProps = {
  // Доступное имя шторки; видимый заголовок, если нужен, — внутри children.
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

// Сдвиг пальцем вниз, после которого шторка закрывается.
const DISMISS_PX = 80;

// Нижняя шторка телефона (#215): тап по фону, Esc или свайп вниз закрывают.
export const BottomSheet = ({ label, onClose, className, children }: BottomSheetProps) => {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="bottom-sheet__scrim" />
        <Dialog.Content
          className={`bottom-sheet${className ? ` ${className}` : ''}`}
          ref={contentRef}
          aria-describedby={undefined}
          // Фокус — на шторку, а не на первое поле: иначе на телефоне сразу
          // подсвечивается селект или выскакивает клавиатура.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
          style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
          onTouchStart={(event) => {
            // Прокрученное содержимое тянется пальцем, а не закрывается.
            startY.current = event.currentTarget.scrollTop > 0 ? null : event.touches[0].clientY;
          }}
          onTouchMove={(event) => {
            if (startY.current === null) return;
            setDrag(Math.max(0, event.touches[0].clientY - startY.current));
          }}
          onTouchEnd={() => {
            if (startY.current === null) return;
            startY.current = null;
            if (drag > DISMISS_PX) onClose();
            else setDrag(0);
          }}
        >
          <span className="bottom-sheet__grab" aria-hidden="true" />
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
