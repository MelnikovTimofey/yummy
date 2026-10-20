import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ShelfRow } from '@/contracts';
import { MARK_OPTIONS } from '@/lib/shelf';

export type ShelfRowActions = {
  onMark: (row: ShelfRow, fraction: number) => void;
  onOpenAnother: (row: ShelfRow) => void;
  onAddPack: (row: ShelfRow, input: { weight: number; priceKop?: number }) => void;
  onToggleStop: (row: ShelfRow) => void;
  onWriteOff: (row: ShelfRow, reason: string) => void;
  onRemove: (row: ShelfRow) => void;
};

type ShelfRowMenuProps = {
  row: ShelfRow;
  anchor: HTMLElement;
  actions: ShelfRowActions;
  onClose: () => void;
};

type Mode = 'main' | 'add-pack' | 'write-off';

const GAP = 4;
const EDGE = 8;

// Меню «⋯» строки полки. Живёт в портале поверх страницы: таблица обрезает
// переполнение по горизонтали, а меню у нижних строк должно открываться вверх.
export const ShelfRowMenu = ({ row, anchor, actions, onClose }: ShelfRowMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>('main');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [weight, setWeight] = useState(String(row.packWeight));
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');

  const hasOpen = row.openPacks.length > 0;
  const hasPacks = hasOpen || row.sealedCount > 0;
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
    ref.current?.querySelector<HTMLElement>('button:not(:disabled), input')?.focus();
  }, [mode]);

  const submitPack = (event: FormEvent) => {
    event.preventDefault();
    const grams = Number(weight);
    const rubles = Number(price.replace(',', '.'));
    if (!Number.isInteger(grams) || grams < 1) return;
    actions.onAddPack(row, { weight: grams, ...(price.trim() && rubles >= 0 ? { priceKop: Math.round(rubles * 100) } : {}) });
  };

  const submitWriteOff = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim()) actions.onWriteOff(row, reason.trim());
  };

  return createPortal(
    <div
      ref={ref}
      className="shelf-menu"
      role="dialog"
      aria-label={`Действия: ${name}`}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      onClick={(event) => event.stopPropagation()}
    >
      {mode === 'main' ? (
        <>
          <span className="shelf-menu__label">Сколько осталось в открытой</span>
          <div className="shelf-menu__fracs">
            {MARK_OPTIONS.map((option, index) => (
              <button
                key={option.label}
                type="button"
                className="shelf-menu__frac"
                disabled={!hasOpen}
                title={`Осталось ${option.label} · клавиша ${index + 1}`}
                aria-label={`Осталось ${option.label}`}
                onClick={() => actions.onMark(row, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="shelf-menu__item" disabled={!hasOpen} onClick={() => actions.onMark(row, 1)}>
            Банка полная
          </button>
          <div className="shelf-menu__sep" />
          <button type="button" className="shelf-menu__item" disabled={row.sealedCount === 0} onClick={() => actions.onOpenAnother(row)}>
            Вскрыть ещё одну банку
          </button>
          <button type="button" className="shelf-menu__item" onClick={() => setMode('add-pack')}>
            Добавить банку вручную
          </button>
          <button type="button" className="shelf-menu__item" onClick={() => actions.onToggleStop(row)}>
            {row.stopped ? 'Снять стоп для гостей' : 'Стоп для гостей'}
          </button>
          <button type="button" className="shelf-menu__item" disabled={!hasPacks} onClick={() => setMode('write-off')}>
            Списать банку…
          </button>
          <div className="shelf-menu__sep" />
          <button type="button" className="shelf-menu__item" onClick={() => actions.onRemove(row)}>
            Убрать с полки <span className="shelf-faint">история останется</span>
          </button>
        </>
      ) : null}

      {mode === 'add-pack' ? (
        <form className="shelf-menu__form" onSubmit={submitPack}>
          <span className="shelf-menu__label">Добавить банку вручную</span>
          <label className="shelf-menu__field">
            <span>Вес, г</span>
            <input className="text-input" inputMode="numeric" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </label>
          <label className="shelf-menu__field">
            <span>Цена банки, ₽ — если известна</span>
            <input className="text-input" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <div className="shelf-menu__form-actions">
            <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={() => setMode('main')}>
              Назад
            </button>
            <button type="submit" className="btn" data-size="sm" data-variant="primary">
              Добавить
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'write-off' ? (
        <form className="shelf-menu__form" onSubmit={submitWriteOff}>
          <span className="shelf-menu__label">Списать банку</span>
          <p className="shelf-menu__hint">{hasOpen ? 'Спишется открытая банка.' : 'Спишется самая старая банка из запаса.'} В расход не пойдёт.</p>
          <label className="shelf-menu__field">
            <span>Причина</span>
            <input
              className="text-input"
              value={reason}
              placeholder="Брак, пересорт, потеря"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="shelf-menu__form-actions">
            <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={() => setMode('main')}>
              Назад
            </button>
            <button type="submit" className="btn" data-size="sm" data-variant="danger" disabled={!reason.trim()}>
              Списать
            </button>
          </div>
        </form>
      ) : null}
    </div>,
    document.body,
  );
};
