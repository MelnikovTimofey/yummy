import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FilterSingleSelectOption<Value extends string> = {
  value: Value;
  label: string;
};

type FilterSingleSelectProps<Value extends string> = {
  title: string;
  options: Array<FilterSingleSelectOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
};

export const FilterSingleSelect = <Value extends string>({
  title,
  options,
  value,
  onChange,
}: FilterSingleSelectProps<Value>) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const activeOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="ops-filter-select" ref={rootRef}>
      <div className="ops-filter-select__head">
        <p className="ops-filter-select__title">{title}</p>
      </div>

      <Button
        aria-controls={panelId}
        aria-expanded={open}
        className="ops-filter-select__trigger"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ops-filter-select__trigger-copy">
          <strong className="ops-filter-select__summary">{activeOption?.label}</strong>
          <span className="ops-filter-select__meta">{`Вариантов: ${options.length}`}</span>
        </span>
        <ChevronDown aria-hidden="true" className="ops-filter-select__chevron" />
      </Button>

      {open ? (
        <div className="ops-filter-select__panel" id={panelId}>
          <div className="ops-filter-select__list" role="radiogroup" aria-label={title}>
            {options.map((option) => {
              const active = option.value === value;

              return (
                <label
                  className={active ? 'ops-filter-select__option ops-filter-select__option--active' : 'ops-filter-select__option'}
                  key={option.value}
                >
                  <input
                    checked={active}
                    name={panelId}
                    type="radio"
                    onChange={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  />
                  <span className="ops-filter-select__option-label">{option.label}</span>
                  {active ? <Check aria-hidden="true" className="ops-filter-select__check" /> : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
