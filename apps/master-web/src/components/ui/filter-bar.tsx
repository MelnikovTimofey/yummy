import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { formatMetricValue } from '@/contracts';
import { attributeChipLabel } from '@/lib/filters';

// Панель фильтров Мастера (#464, design/design_handoff_master_filters): одна на
// все экраны со списками. Число — только у статусов, у атрибутов его нет.

const lower = (value: string) => value.toLocaleLowerCase('ru-RU');

// Список с поиском нужен, когда значений больше, чем видно без прокрутки.
const SEARCH_FROM = 9;

const useDismiss = (open: boolean, rootRef: RefObject<HTMLElement | null>, close: () => void) => {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, rootRef]);
};

type FilterChipProps = {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
};

export const FilterChip = ({ active, count, onClick, children }: FilterChipProps) => (
  <button type="button" className={`filter-chip${active ? ' filter-chip--active' : ''}`} aria-pressed={active} onClick={onClick}>
    <span>{children}</span>
    {count === undefined ? null : (
      <span className="filter-chip__count" data-zero={count === 0 || undefined}>
        {formatMetricValue(count)}
      </span>
    )}
  </button>
);

type AttributeFilterProps = {
  title: string;
  options: string[];
  selected: string[];
  formatOption?: (value: string) => string;
  // Один выбор: «Миксы» — есть в миксах или нет.
  single?: boolean;
  onChange: (next: string[]) => void;
};

export const AttributeFilter = ({ title, options, selected, formatOption = (value) => value, single = false, onChange }: AttributeFilterProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  useDismiss(open, rootRef, close);

  const words = lower(query.trim());
  const shown = words ? options.filter((option) => lower(formatOption(option)).includes(words)) : options;
  const toggle = (value: string) => {
    if (single) onChange(selected.includes(value) ? [] : [value]);
    else onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <span className="attr-filter" ref={rootRef}>
      <button
        type="button"
        className={`filter-chip${selected.length ? ' filter-chip--active' : ''}`}
        aria-label={selected.length ? `${title}: ${selected.map(formatOption).join(', ')}` : title}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-open={open || undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span>{attributeChipLabel(title, selected, formatOption)}</span>
        <ChevronDown size={12} aria-hidden className="filter-chip__chevron" />
      </button>
      {open ? (
        <div className="attr-filter__panel" id={panelId} role="group" aria-label={title}>
          {options.length >= SEARCH_FROM ? (
            <label className="input attr-filter__search">
              <Search size={14} aria-hidden />
              <input type="search" autoFocus aria-label={`Найти: ${title}`} placeholder="Найти" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          ) : null}
          <div className="attr-filter__list">
            {shown.map((option) => (
              <label key={option} className="attr-filter__option">
                <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
                <span>{formatOption(option)}</span>
              </label>
            ))}
            {shown.length ? null : <p className="attr-filter__empty">Ничего не найдено.</p>}
          </div>
          {selected.length ? (
            <div className="attr-filter__foot">
              <span>Выбрано {formatMetricValue(selected.length)}</span>
              <button type="button" className="filter-reset" onClick={() => onChange([])}>
                Очистить
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
};

type SortPillProps<Key extends string> = {
  value: Key;
  options: Array<[Key, string]>;
  onChange: (next: Key) => void;
};

export const SortPill = <Key extends string>({ value, options, onChange }: SortPillProps<Key>) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const listId = useId();
  useDismiss(open, rootRef, () => setOpen(false));
  const current = options.find(([key]) => key === value)?.[1] ?? 'Сортировка';

  return (
    <span className="sort-pill" ref={rootRef}>
      <button
        type="button"
        className="sort-pill__trigger"
        aria-label={`Сортировка: ${current}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((state) => !state)}
      >
        <span>{current}</span>
        <ChevronDown size={12} aria-hidden className="filter-chip__chevron" />
      </button>
      {open ? (
        <div className="sort-pill__list" id={listId} role="listbox" aria-label="Сортировка">
          {options.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === value}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
};

export const FilterReset = ({ onClick, children = 'Сбросить' }: { onClick: () => void; children?: ReactNode }) => (
  <button type="button" className="filter-reset" onClick={onClick}>
    {children}
  </button>
);

// Телефон: атрибуты и сортировка уходят в шторку, на кнопке — сколько выбрано.
export const FiltersButton = ({ count, open, onClick }: { count: number; open: boolean; onClick: () => void }) => (
  <button
    type="button"
    className="filters-button"
    aria-label={count ? `Фильтры, выбрано ${count}` : 'Фильтры'}
    aria-expanded={open}
    data-active={count > 0 || undefined}
    onClick={onClick}
  >
    <SlidersHorizontal size={16} aria-hidden />
    <span>Фильтры</span>
    {count ? <span className="filter-chip__count">{formatMetricValue(count)}</span> : null}
  </button>
);

// Чипы в шторке: на телефоне проще попасть пальцем, чем в галочку списка.
const FOLDED = 6;

type SheetChoiceProps = {
  title: string;
  options: string[];
  selected: string[];
  formatOption?: (value: string) => string;
  single?: boolean;
  onChange: (next: string[]) => void;
};

export const SheetChoice = ({ title, options, selected, formatOption = (value) => value, single = false, onChange }: SheetChoiceProps) => {
  const [unfolded, setUnfolded] = useState(false);
  // Выбранное видно и в свёрнутой группе.
  const shown = unfolded || options.length <= FOLDED + 1 ? options : [...new Set([...options.slice(0, FOLDED), ...selected])];
  const hidden = options.length - shown.length;
  const toggle = (value: string) => {
    if (single) onChange(selected.includes(value) ? [] : [value]);
    else onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <div className="sheet-choice" role="group" aria-label={title}>
      <h3>{title}</h3>
      <div className="sheet-choice__chips">
        {shown.map((option) => (
          <FilterChip key={option} active={selected.includes(option)} onClick={() => toggle(option)}>
            {formatOption(option)}
          </FilterChip>
        ))}
        {hidden > 0 ? (
          <button type="button" className="filter-chip" onClick={() => setUnfolded(true)}>
            Ещё {formatMetricValue(hidden)}
          </button>
        ) : null}
      </div>
    </div>
  );
};
