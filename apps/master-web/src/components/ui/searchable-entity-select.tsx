import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SearchableEntityOption = {
  id: string;
  title: string;
  subtitle: string;
  keywords?: string[];
};

type SearchableEntitySelectProps = {
  value: string;
  options: SearchableEntityOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  clearLabel: string;
  listAriaLabel: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
};

export const SearchableEntitySelect = ({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  listAriaLabel,
  disabled = false,
  onSelect,
}: SearchableEntitySelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const matchingOptions = normalizedQuery
    ? options.filter((option) => {
        const searchValue = [option.title, option.subtitle, ...(option.keywords ?? [])]
          .join(' ')
          .toLocaleLowerCase('ru-RU');
        return searchValue.includes(normalizedQuery);
      })
    : options;
  const visibleOptions = selectedOption
    ? [selectedOption, ...matchingOptions.filter((option) => option.id !== selectedOption.id)]
    : matchingOptions;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    searchRef.current?.focus();

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
    <div className="ops-filter-select mixes-component-select" ref={rootRef}>
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        className="ops-filter-select__trigger mixes-component-select__trigger"
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ops-filter-select__trigger-copy">
          <strong
            className={
              selectedOption
                ? 'ops-filter-select__summary'
                : 'ops-filter-select__summary ops-filter-select__summary--placeholder'
            }
          >
            {selectedOption ? selectedOption.title : placeholder}
          </strong>
          <span className="ops-filter-select__meta">
            {selectedOption ? selectedOption.subtitle : searchPlaceholder}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="ops-filter-select__chevron" />
      </Button>

      {open ? (
        <div className="ops-filter-select__panel mixes-component-select__panel" id={panelId}>
          <label className="ops-filter-select__search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>

          {selectedOption ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mixes-component-select__clear"
              onClick={() => {
                onSelect('');
                setOpen(false);
              }}
            >
              <X aria-hidden="true" />
              {clearLabel}
            </Button>
          ) : null}

          <div className="ops-filter-select__list" role="listbox" aria-label={listAriaLabel}>
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const active = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'ops-filter-select__option ops-filter-select__option--active' : 'ops-filter-select__option'}
                    onClick={() => {
                      onSelect(option.id);
                      setOpen(false);
                    }}
                  >
                    <span className="mixes-component-select__option-copy">
                      <span className="ops-filter-select__option-label">{option.title}</span>
                      <span className="mixes-component-select__option-meta">{option.subtitle}</span>
                    </span>
                    {active ? <Check aria-hidden="true" className="ops-filter-select__check" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="ops-filter-select__empty">{emptyLabel}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
