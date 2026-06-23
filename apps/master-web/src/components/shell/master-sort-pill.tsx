import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type MasterSortPillOption<K extends string> = {
  key: K;
  label: string;
};

type MasterSortPillProps<K extends string> = {
  value: K;
  options: ReadonlyArray<MasterSortPillOption<K>>;
  onChange: (next: K) => void;
  ariaLabel?: string;
};

export const MasterSortPill = <K extends string>({
  value,
  options,
  onChange,
  ariaLabel = 'Сортировка',
}: MasterSortPillProps<K>) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const current = options.find((option) => option.key === value);
  const currentLabel = current?.label ?? 'Сортировка';

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      if (event.target instanceof Node && root.contains(event.target)) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="master-sort-pill" ref={rootRef}>
      <button
        type="button"
        className="master-sort-pill__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="master-sort-pill__value">{currentLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={
            open
              ? 'master-sort-pill__chevron master-sort-pill__chevron--open'
              : 'master-sort-pill__chevron'
          }
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="master-sort-pill__popover"
        >
          {options.map((option) => {
            const selected = option.key === value;
            return (
              <li
                key={option.key}
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? 'master-sort-pill__option master-sort-pill__option--selected'
                    : 'master-sort-pill__option'
                }
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
