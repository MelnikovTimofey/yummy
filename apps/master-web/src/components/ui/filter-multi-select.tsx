import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FilterMultiSelectProps = {
  title: string;
  options: string[];
  selected: string[];
  formatOptionLabel?: (value: string) => string;
  onToggleOption: (value: string) => void;
  onClearGroup: () => void;
};

const buildSummary = (selected: string[], formatOptionLabel: (value: string) => string) => {
  const labels = selected.map(formatOptionLabel);

  if (selected.length === 0) {
    return 'Все варианты';
  }

  if (selected.length <= 2) {
    return labels.join(', ');
  }

  return `${labels[0]}, ${labels[1]} +${selected.length - 2}`;
};

export const FilterMultiSelect = ({
  title,
  options,
  selected,
  formatOptionLabel = (value) => value,
  onToggleOption,
  onClearGroup,
}: FilterMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const selectedSet = new Set(selected);
  const matchingOptions = normalizedQuery
    ? options.filter((option) => {
        const rawLabel = option.toLocaleLowerCase('ru-RU');
        const formattedLabel = formatOptionLabel(option).toLocaleLowerCase('ru-RU');
        return rawLabel.includes(normalizedQuery) || formattedLabel.includes(normalizedQuery);
      })
    : options;
  const visibleOptions = [
    ...matchingOptions.filter((option) => selectedSet.has(option)),
    ...matchingOptions.filter((option) => !selectedSet.has(option)),
  ];
  const summary = buildSummary(selected, formatOptionLabel);

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
    <div className="ops-filter-select" ref={rootRef}>
      <div className="ops-filter-select__head">
        <p className="ops-filter-select__title">{title}</p>
        {selected.length ? (
          <Button
            className="ops-filter-select__clear"
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearGroup}
          >
            <X aria-hidden="true" />
            Очистить
          </Button>
        ) : null}
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
          <strong className={selected.length ? 'ops-filter-select__summary' : 'ops-filter-select__summary ops-filter-select__summary--placeholder'}>
            {summary}
          </strong>
          <span className="ops-filter-select__meta">
            {selected.length ? `Выбрано: ${selected.length}` : `Вариантов: ${options.length}`}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="ops-filter-select__chevron" />
      </Button>

      {open ? (
        <div className="ops-filter-select__panel" id={panelId}>
          <label className="ops-filter-select__search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Поиск по группе «${title}»`}
            />
          </label>

          <div className="ops-filter-select__list" role="group" aria-label={title}>
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const active = selectedSet.has(option);

                return (
                  <label
                    className={active ? 'ops-filter-select__option ops-filter-select__option--active' : 'ops-filter-select__option'}
                    key={option}
                  >
                    <input
                      checked={active}
                      type="checkbox"
                      onChange={() => onToggleOption(option)}
                    />
                    <span className="ops-filter-select__option-label">{formatOptionLabel(option)}</span>
                    {active ? <Check aria-hidden="true" className="ops-filter-select__check" /> : null}
                  </label>
                );
              })
            ) : (
              <p className="ops-filter-select__empty">Ничего не найдено.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
