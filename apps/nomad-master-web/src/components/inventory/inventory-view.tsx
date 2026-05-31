import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import {
  buildSortPillOptions,
  composeSortKey,
  parseSortKey,
} from '@/components/shell/master-sort-pill.helpers';
import type {
  InventoryArchivedFilter,
  InventoryBatchAction,
  InventoryFilterKey,
  InventoryListFilters,
  InventoryListMeta,
  InventoryListSort,
  InventoryStockFilter,
  InventorySortDirection,
  InventorySortField,
  InventoryTobacco,
} from '@/contracts';
import {
  formatFlavorProfileLabel,
  formatInventoryBatchAction,
  formatMetricValue,
  inventorySortDirectionOptions,
  inventorySortFieldOptions,
  INVENTORY_FLAVOR_PROFILE_KEYS,
  INVENTORY_STRENGTH_PRESETS,
} from '@/contracts';

type InventoryViewProps = {
  items: InventoryTobacco[];
  catalogOptions: InventoryTobacco[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  filters: InventoryListFilters;
  meta: InventoryListMeta;
  sort: InventoryListSort;
  selectedIds: string[];
  pendingRowId: string;
  pendingBatchAction: '' | InventoryBatchAction;
  onSearchChange: (value: string) => void;
  onStockChange: (value: InventoryStockFilter) => void;
  onArchivedChange: (value: InventoryArchivedFilter) => void;
  onSortFieldChange: (value: InventorySortField) => void;
  onSortDirectionChange: (value: InventorySortDirection) => void;
  onToggleFilterValue: (key: InventoryFilterKey, value: string) => void;
  onClearFilterGroup: (key: InventoryFilterKey) => void;
  onResetFilters: () => void;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleStock: (item: InventoryTobacco) => void;
  onArchiveTobacco: (item: InventoryTobacco, archived: boolean) => void;
  onRunBatchAction: (action: InventoryBatchAction) => void;
  onOpenMix: (mixId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onSaveTobacco: (payload: InventoryEditorInput) => Promise<void>;
  onResetSaveFeedback: () => void;
};

// Фильтры в свёрнутом `<details>` блоке «Доп. фильтры». Бренд живёт здесь
// мультиселектом на весь список брендов (issue #119): чипов-топ-8 не хватало
// для 279 брендов. Категории, наоборот, вынесены в видимый ряд чипов над
// таблицей (см. categoryChips).
const extraFilterGroups: Array<{ key: InventoryFilterKey; title: string }> = [
  { key: 'manufacturers', title: 'Бренд' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

const inventoryPageSizeOptions = [100, 200, 500, 1000];

const STRENGTH_DASH = '—';

const formatStrengthCompact = (item: InventoryTobacco) => {
  const value = item.officialStrength?.trim() || item.communityStrength?.trim();
  return value || STRENGTH_DASH;
};

const formatProfileRest = (count: number) => `+${count}`;

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return 'Нет данных';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Нет данных';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDetailValue = (value?: string | null, fallback = 'Не указано') => {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
};

const formatMixCardStatus = (mix: NonNullable<InventoryTobacco['dependentMixes']>[number]) => {
  if (!mix.available) {
    return 'Скрыт оператором';
  }

  if (!mix.guestVisible) {
    return 'Блокируется наличием';
  }

  return 'Виден гостю';
};

const formatFilterOptionLabel = (key: InventoryFilterKey, value: string) => {
  if (key === 'flavorProfiles') {
    return formatFlavorProfileLabel(value);
  }

  return value;
};

const uniqueStrings = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const buildBrandShort = (name: string) => {
  const normalized = name.trim();
  if (!normalized) {
    return '··';
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toLocaleUpperCase('ru-RU');
  }

  return normalized.slice(0, 2).toLocaleUpperCase('ru-RU');
};

type FilterChipEntry = {
  value: string;
  count: number;
};

// Чипы категорий для видимого ряда фильтров над таблицей. Категорий немного
// (≤12 канонических), поэтому показываем все встречающиеся — без top-N среза,
// который раньше прятал бренды (issue #119).
const buildCategoryChips = (catalog: InventoryTobacco[]): FilterChipEntry[] => {
  const counts = new Map<string, number>();
  for (const item of catalog) {
    for (const profile of item.flavorProfiles ?? []) {
      const key = profile.trim();
      if (!key) {
        continue;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return formatFlavorProfileLabel(left[0]).localeCompare(formatFlavorProfileLabel(right[0]), 'ru');
    })
    .map(([value, count]) => ({ value, count }));
};

const buildSuggestionOptions = (items: Array<string | null | undefined>) =>
  uniqueStrings(items.map((item) => item ?? '')).sort((left, right) => left.localeCompare(right, 'ru'));

export type InventoryEditorInput = {
  id: string;
  manufacturer: string;
  lineName: string;
  name: string;
  description: string;
  country: string;
  officialStrength: string;
  communityStrength: string;
  productionStatus: string;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  inStock: boolean;
};

type InventoryEditorDraft = InventoryEditorInput;

type InventoryTokenEditorProps = {
  label: string;
  selected: string[];
  suggestions: string[];
  placeholder: string;
  formatValue?: (value: string) => string;
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

const InventoryTokenEditor = ({
  label,
  selected,
  suggestions,
  placeholder,
  formatValue = (value) => value,
  disabled = false,
  onChange,
}: InventoryTokenEditorProps) => {
  const [draftValue, setDraftValue] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const isSelected = (value: string) =>
    selected.some((item) => item.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU'));

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const existing = suggestions.find((item) => item.toLocaleLowerCase('ru-RU') === trimmed.toLocaleLowerCase('ru-RU'));
    const nextValue = existing ?? trimmed;

    if (!isSelected(nextValue)) {
      onChange([...selected, nextValue]);
    }
    setDraftValue('');
  };

  const removeValue = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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

  const normalizedDraft = draftValue.trim().toLocaleLowerCase('ru-RU');
  const filteredSuggestions = suggestions.filter(
    (item) => !normalizedDraft || item.toLocaleLowerCase('ru-RU').includes(normalizedDraft),
  );
  const canAddCustom =
    normalizedDraft.length > 0 && !suggestions.some((item) => item.toLocaleLowerCase('ru-RU') === normalizedDraft);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === ',') && draftValue.trim()) {
      event.preventDefault();
      addValue(draftValue);
      return;
    }

    if (event.key === 'Backspace' && !draftValue && selected.length) {
      event.preventDefault();
      removeValue(selected[selected.length - 1]);
    }
  };

  return (
    <div className="field field--wide multiselect" ref={rootRef}>
      <span className="field-label">{label}</span>
      <div
        className="multiselect__control"
        data-open={open}
        data-disabled={disabled}
        onMouseDown={(event) => {
          if (disabled || event.target !== event.currentTarget) {
            return;
          }
          event.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((value) => (
          <span key={`${label}:${value}`} className="multiselect__chip">
            {formatValue(value)}
            <button
              type="button"
              className="multiselect__chip-remove"
              aria-label={`Убрать ${formatValue(value)}`}
              disabled={disabled}
              onClick={() => removeValue(value)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="multiselect__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={draftValue}
          onChange={(event) => {
            setDraftValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length ? '' : placeholder}
          disabled={disabled}
        />
      </div>
      {open ? (
        <div className="multiselect__panel" id={listId} role="listbox" aria-label={label}>
          {filteredSuggestions.map((value) => {
            const active = isSelected(value);
            return (
              <button
                key={`${label}:option:${value}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={active}
                className={active ? 'multiselect__option multiselect__option--selected' : 'multiselect__option'}
                onClick={() => addValue(value)}
              >
                <span>{formatValue(value)}</span>
                {active ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
          {canAddCustom ? (
            <button
              type="button"
              className="multiselect__option multiselect__option--add"
              onClick={() => addValue(draftValue)}
            >
              Добавить «{draftValue.trim()}»
            </button>
          ) : null}
          {!filteredSuggestions.length && !canAddCustom ? (
            <p className="multiselect__empty">Ничего не найдено</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

type InventorySuggestionInputProps = {
  label: string;
  value: string;
  suggestions: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const InventorySuggestionInput = ({
  label,
  value,
  suggestions,
  placeholder,
  disabled = false,
  onChange,
}: InventorySuggestionInputProps) => {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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

  const normalized = value.trim().toLocaleLowerCase('ru-RU');
  const filtered = suggestions
    .filter((option) => !normalized || option.toLocaleLowerCase('ru-RU').includes(normalized))
    .slice(0, 8);

  return (
    <div className="field combo-suggest" ref={rootRef}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="combo-suggest__control">
        <input
          id={inputId}
          className="text-input"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {suggestions.length ? (
          <button
            type="button"
            className="combo-suggest__chevron"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronDown size={14} />
          </button>
        ) : null}
      </div>
      {open && filtered.length ? (
        <div className="combo-suggest__panel" role="listbox" aria-label={label}>
          {filtered.map((option) => {
            const active = option.toLocaleLowerCase('ru-RU') === normalized;
            return (
              <button
                key={`${label}:${option}`}
                type="button"
                role="option"
                aria-selected={active}
                className={active ? 'combo-suggest__option combo-suggest__option--active' : 'combo-suggest__option'}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

type InventoryProductionStatusSelectProps = {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

const InventoryProductionStatusSelect = ({
  value,
  options,
  disabled = false,
  onChange,
}: InventoryProductionStatusSelectProps) => (
  <label className="field">
    <span className="field-label">Статус производства</span>
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">Не указан</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

type InventoryEditorMode = 'create' | 'edit';

const emptyInventoryEditorDraft = (): InventoryEditorDraft => ({
  id: '',
  manufacturer: '',
  lineName: '',
  name: '',
  description: '',
  country: '',
  officialStrength: '',
  communityStrength: '',
  productionStatus: '',
  flavorProfiles: [],
  flavors: [],
  flavorTags: [],
  inStock: true,
});

const toInventoryEditorDraft = (item: InventoryTobacco): InventoryEditorDraft => ({
  id: item.id,
  manufacturer: item.manufacturer,
  lineName: item.lineName ?? '',
  name: item.name,
  description: item.description ?? '',
  country: item.country ?? '',
  officialStrength: item.officialStrength ?? '',
  communityStrength: item.communityStrength ?? '',
  productionStatus: item.productionStatus ?? '',
  flavorProfiles: item.flavorProfiles ?? [],
  flavors: item.flavors ?? [],
  flavorTags: item.flavorTags ?? [],
  inStock: item.inStock,
});

export const InventoryView = ({
  items,
  catalogOptions,
  status,
  error,
  filters,
  meta,
  sort,
  selectedIds,
  pendingRowId,
  pendingBatchAction,
  onSearchChange,
  onStockChange,
  onArchivedChange,
  onSortFieldChange,
  onSortDirectionChange,
  onToggleFilterValue,
  onClearFilterGroup,
  onResetFilters,
  onToggleSelection,
  onToggleSelectAll,
  onToggleStock,
  onArchiveTobacco,
  onRunBatchAction,
  onOpenMix,
  onPageChange,
  onPageSizeChange,
  saveStatus,
  saveError,
  onSaveTobacco,
  onResetSaveFeedback,
}: InventoryViewProps) => {
  const [activeItemId, setActiveItemId] = useState('');
  const [searchValue, setSearchValue] = useState(filters.search);
  const [editorMode, setEditorMode] = useState<InventoryEditorMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [extraEditorOpen, setExtraEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<InventoryEditorDraft>(emptyInventoryEditorDraft());
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const editingItem = editorMode === 'edit'
    ? items.find((item) => item.id === editorDraft.id) ?? null
    : null;
  const activeDialogTitleId = activeItem ? `inventory-detail-title-${activeItem.id}` : undefined;
  const manufacturerOptions = buildSuggestionOptions(catalogOptions.map((item) => item.manufacturer));
  const lineNameOptions = buildSuggestionOptions(catalogOptions.map((item) => item.lineName));
  const countryOptions = buildSuggestionOptions(catalogOptions.map((item) => item.country));
  const productionStatusOptions = buildSuggestionOptions(catalogOptions.map((item) => item.productionStatus));
  // Чипы в редакторе — фиксированный мастер-список (parity с мокапом),
  // не выборка из catalogOptions. catalogOptions всё ещё нужен для прочих
  // suggestion'ов (manufacturer, lineName и т. п.).
  const flavorProfileOptions = INVENTORY_FLAVOR_PROFILE_KEYS;
  const flavorOptions = buildSuggestionOptions(catalogOptions.flatMap((item) => item.flavors ?? []));
  const flavorTagOptions = buildSuggestionOptions(catalogOptions.flatMap((item) => item.flavorTags ?? []));
  const categoryChips = buildCategoryChips(catalogOptions);
  const categoryChipsCountIsApproximate = catalogOptions.length < meta.totalItems;
  const categoryChipsTooltip = categoryChipsCountIsApproximate
    ? 'Счётчик показывает, сколько раз категория встречается в загруженных позициях каталога (без учёта пагинации).'
    : 'Счётчик показывает, сколько позиций в категории.';

  // Сколько полей блока «Дополнительно» заполнено — показываем бейджем у
  // summary, чтобы свёрнутый блок не читался как пустой (issue #126).
  const extraFieldsFilledCount =
    [editorDraft.country, editorDraft.communityStrength, editorDraft.productionStatus].filter((value) =>
      value.trim(),
    ).length + (editorDraft.flavorTags.length ? 1 : 0);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchValue === filters.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onSearchChange(searchValue);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue, filters.search, onSearchChange]);

  useEffect(() => {
    if (!activeItemId) {
      return;
    }

    if (!items.some((item) => item.id === activeItemId)) {
      setActiveItemId('');
    }
  }, [items, activeItemId]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveItemId('');
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeItem]);

  useEffect(() => {
    if (saveStatus !== 'ready') {
      return;
    }

    setEditorDraft(emptyInventoryEditorDraft());
    setEditorOpen(false);
    setEditorMode('create');
  }, [saveStatus]);

  const openCreateEditor = () => {
    onResetSaveFeedback();
    setEditorMode('create');
    setEditorDraft(emptyInventoryEditorDraft());
    setEditorOpen(true);
  };

  const openEditEditor = (item: InventoryTobacco) => {
    onResetSaveFeedback();
    setEditorMode('edit');
    setEditorDraft(toInventoryEditorDraft(item));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    onResetSaveFeedback();
    setEditorDraft(emptyInventoryEditorDraft());
    setEditorMode('create');
    setEditorOpen(false);
  };

  const updateEditorDraft = <Key extends keyof InventoryEditorDraft>(key: Key, value: InventoryEditorDraft[Key]) => {
    if (saveError || saveStatus !== 'idle') {
      onResetSaveFeedback();
    }

    setEditorDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSaveTobacco(editorDraft);
  };

  const detailModal = activeItem ? (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) setActiveItemId('');
      }}
    >
      <SheetContent
        side="right"
        className="inventory-editor-sheet tobacco-detail-drawer"
        showCloseButton={false}
      >
        <SheetHeader className="drawer__head tobacco-drawer__head">
          <div className="tobacco-drawer__head-copy">
            <p className="tobacco-drawer__eyebrow">Карточка табака</p>
            <SheetTitle id={activeDialogTitleId} className="tobacco-drawer__title">
              {activeItem.name}
            </SheetTitle>
            <SheetDescription className="tobacco-detail-drawer__sub">
              {activeItem.manufacturer}
              {activeItem.lineName ? ` • ${activeItem.lineName}` : ''}
            </SheetDescription>
          </div>
          <div className="tobacco-detail-drawer__head-meta">
            <span
              className="tag"
              data-tone={activeItem.inStock ? 'success' : 'warning'}
            >
              {activeItem.inStock ? 'В наличии' : 'Нет наличия'}
            </span>
          </div>
          <button
            type="button"
            className="tobacco-drawer__close"
            onClick={() => setActiveItemId('')}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </SheetHeader>

        <div className="drawer__body tobacco-detail-drawer__body">
          <section className="tobacco-detail-drawer__section">
            <p className="tobacco-detail-drawer__label">Описание</p>
            <p className="tobacco-detail-drawer__description">
              {formatDetailValue(activeItem.description, 'Описание пока не заполнено.')}
            </p>
          </section>

          <section className="tobacco-detail-drawer__section">
            <p className="tobacco-detail-drawer__label">Действия</p>
            <div className="tobacco-detail-drawer__actions">
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant={activeItem.inStock ? 'ghost' : 'primary'}
                onClick={() => onToggleStock(activeItem)}
                disabled={pendingRowId === activeItem.id || pendingBatchAction !== ''}
              >
                {pendingRowId === activeItem.id
                  ? 'Сохраняем...'
                  : activeItem.inStock
                    ? 'Убрать из наличия'
                    : 'Вернуть в наличие'}
              </button>
              <button
                type="button"
                className="btn"
                data-size="sm"
                onClick={() => onToggleSelection(activeItem.id)}
              >
                {selectedIds.includes(activeItem.id)
                  ? 'Убрать из выбора'
                  : 'Добавить в выбор'}
              </button>
            </div>
          </section>

          <section className="tobacco-detail-drawer__section">
            <p className="tobacco-detail-drawer__label">Атрибуты</p>
            <dl className="tobacco-detail-drawer__attributes">
              <div>
                <dt>Производитель</dt>
                <dd>{formatDetailValue(activeItem.manufacturer)}</dd>
              </div>
              <div>
                <dt>Линейка</dt>
                <dd>{formatDetailValue(activeItem.lineName)}</dd>
              </div>
              <div>
                <dt>Страна</dt>
                <dd>{formatDetailValue(activeItem.country)}</dd>
              </div>
              <div>
                <dt>Официальная крепость</dt>
                <dd>{formatDetailValue(activeItem.officialStrength)}</dd>
              </div>
              <div>
                <dt>Комьюнити-крепость</dt>
                <dd>{formatDetailValue(activeItem.communityStrength)}</dd>
              </div>
              <div>
                <dt>Статус производства</dt>
                <dd>{formatDetailValue(activeItem.productionStatus)}</dd>
              </div>
              <div>
                <dt>Обновлено</dt>
                <dd>{formatUpdatedAt(activeItem.updatedAt)}</dd>
              </div>
              <div>
                <dt>Зависимые миксы</dt>
                <dd>{formatMetricValue(activeItem.dependentMixCount ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="tobacco-detail-drawer__section">
            <p className="tobacco-detail-drawer__label">Категории · вкусы · теги</p>
            <div className="tobacco-detail-drawer__taxonomy">
              {(activeItem.flavorProfiles ?? []).map((profile) => (
                <span
                  key={`${activeItem.id}:detail:profile:${profile}`}
                  className="tag"
                  data-tone="accent"
                >
                  {formatFlavorProfileLabel(profile)}
                </span>
              ))}
              {(activeItem.flavors ?? []).map((flavor) => (
                <span
                  key={`${activeItem.id}:detail:flavor:${flavor}`}
                  className="tag"
                >
                  {flavor}
                </span>
              ))}
              {(activeItem.flavorTags ?? []).map((tag) => (
                <span
                  key={`${activeItem.id}:detail:tag:${tag}`}
                  className="tag tag--ghost"
                >
                  #{tag}
                </span>
              ))}
              {!(activeItem.flavors ?? []).length
                && ((activeItem.flavorProfiles ?? []).length
                  || (activeItem.flavorTags ?? []).length) ? (
                <span className="tobacco-detail-drawer__sub">вкусы не заданы</span>
              ) : null}
              {!(activeItem.flavorProfiles ?? []).length
                && !(activeItem.flavors ?? []).length
                && !(activeItem.flavorTags ?? []).length ? (
                <span className="tobacco-detail-drawer__sub">Не назначены.</span>
              ) : null}
            </div>
          </section>

          <section className="tobacco-detail-drawer__section">
            <div className="tobacco-detail-drawer__mixes-head">
              <p className="tobacco-detail-drawer__label">Зависимые миксы</p>
              <p className="tobacco-detail-drawer__sub">
                {formatMetricValue(activeItem.dependentMixCount ?? 0)} всего /{' '}
                {formatMetricValue(activeItem.blockedDependentMixCount ?? 0)} блокируется по наличию
              </p>
            </div>

            <div className="tobacco-detail-drawer__mixes">
              {(activeItem.dependentMixes ?? []).length ? (
                (activeItem.dependentMixes ?? []).map((mix) => (
                  <button
                    className="tobacco-detail-drawer__mix-link"
                    key={`${activeItem.id}:detail-mix:${mix.id}`}
                    type="button"
                    onClick={() => onOpenMix(mix.id)}
                  >
                    <strong>{mix.name}</strong>
                    <span>{formatMixCardStatus(mix)}</span>
                    <span className="cell-meta">
                      Рейтинг {mix.avgRating.toFixed(1)} · Популярность {formatMetricValue(mix.popularity)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="empty">На этот табак сейчас не завязаны миксы.</p>
              )}
            </div>
          </section>
        </div>

        <footer className="drawer__foot tobacco-drawer__foot">
          <div className="tobacco-drawer__foot-left" />
          <div className="tobacco-drawer__foot-actions">
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              onClick={() => setActiveItemId('')}
            >
              Закрыть
            </button>
            <button
              type="button"
              className="btn"
              data-variant="primary"
              onClick={() => {
                openEditEditor(activeItem);
                setActiveItemId('');
              }}
            >
              Редактировать
            </button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  ) : null;

  const stockFilterTabs: Array<{ value: InventoryStockFilter; label: string; count: number; ariaLabel: string }> = [
    { value: 'all', label: 'Все', count: meta.totalItems, ariaLabel: 'Фильтр: Все' },
    { value: 'in-stock', label: 'В наличии', count: meta.inStockCount, ariaLabel: 'Фильтр: В наличии' },
    { value: 'out-of-stock', label: 'Нет наличия', count: meta.outOfStockCount, ariaLabel: 'Фильтр: Нет наличия' },
  ];

  const archivedActive = filters.archived === 'archived';

  return (
    <section className="tobaccos-page">
      <MasterPageHeader
        eyebrow="Инвентаризация"
        title="Табаки"
        subtitle="Наличие, компоненты миксов и связанные позиции витрины."
        actions={
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={openCreateEditor}
          >
            <Plus size={14} aria-hidden />
            Новый табак
          </button>
        }
      />

      <MasterStatsRow
        tiles={[
          {
            label: 'В каталоге',
            value: formatMetricValue(meta.totalItems),
            hint: 'всего позиций',
          },
          {
            label: 'В наличии',
            value: formatMetricValue(meta.inStockCount),
            hint: 'сейчас на кухне',
            tone: 'success',
          },
          {
            label: 'Нет в наличии',
            value: formatMetricValue(meta.outOfStockCount),
            hint: 'требуют пополнения',
            tone: 'warning',
          },
          {
            label: 'В составе миксов',
            value: formatMetricValue(meta.inMixesCount),
            hint: 'активно используется',
          },
        ]}
      />

      <div className="tobaccos-list">
        <div className="tobaccos-list__toolbar">
          <div className="input tobaccos-list__search">
            <Search size={14} aria-hidden />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Название, бренд, вкус…"
            />
          </div>

          <div className="tobaccos-list__filters" role="group" aria-label="Фильтр по наличию">
            {stockFilterTabs.map((tab) => {
              const active = filters.stock === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  className={`filter-chip${active ? ' filter-chip--active' : ''}`}
                  aria-pressed={active}
                  aria-label={tab.ariaLabel}
                  onClick={() => onStockChange(tab.value)}
                >
                  <span>{tab.label}</span>
                  <span className="filter-chip__count">{formatMetricValue(tab.count)}</span>
                </button>
              );
            })}
          </div>

          <div className="tobaccos-list__filters" role="group" aria-label="Фильтр по архиву">
            <button
              type="button"
              className={`filter-chip${archivedActive ? ' filter-chip--active' : ''}`}
              aria-pressed={archivedActive}
              aria-label="Фильтр: Архив"
              onClick={() => onArchivedChange(archivedActive ? 'active' : 'archived')}
            >
              <span>Архив</span>
              <span className="filter-chip__count">{formatMetricValue(meta.archivedCount)}</span>
            </button>
          </div>

          <span className="tobaccos-list__sep" aria-hidden />

          <label className="tobaccos-list__sort">
            <ChevronDown size={12} aria-hidden />
            <select
              aria-label="Сортировка инвентаря"
              value={composeSortKey(sort.field, sort.direction)}
              onChange={(event) => {
                const { field, direction } = parseSortKey<InventorySortField>(event.target.value);
                onSortFieldChange(field);
                onSortDirectionChange(direction as InventorySortDirection);
              }}
            >
              {buildSortPillOptions(inventorySortFieldOptions, inventorySortDirectionOptions).map(
                (opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {categoryChips.length ? (
          <div className="tobaccos-list__chip-filter" role="group" aria-label="Фильтр по категории">
            <span className="tobaccos-list__chip-filter-label">Категории</span>
            {categoryChips.map(({ value, count }) => {
              const active = filters.flavorProfiles.includes(value);
              return (
                <button
                  key={`category-chip:${value}`}
                  type="button"
                  className={`filter-chip${active ? ' filter-chip--active' : ''}`}
                  aria-pressed={active}
                  title={categoryChipsTooltip}
                  onClick={() => onToggleFilterValue('flavorProfiles', value)}
                >
                  <span>{formatFlavorProfileLabel(value)}</span>
                  <span className="filter-chip__count">{formatMetricValue(count)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* ↓ table + auxiliary blocks live inside .tobaccos-list; portal'ные
             Sheet'ы (editor, detail) — после закрытия `.tobaccos-list`. */}

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <SheetContent
          side="right"
          className="inventory-editor-sheet tobacco-drawer"
          showCloseButton={false}
        >
          <SheetHeader className="drawer__head tobacco-drawer__head">
            <div className="tobacco-drawer__head-copy">
              <p className="tobacco-drawer__eyebrow">
                {editorMode === 'edit' ? 'Редактирование табака' : 'Новый табак'}
              </p>
              <SheetTitle className="tobacco-drawer__title">
                {editorMode === 'edit'
                  ? editorDraft.name.trim() || 'Без названия'
                  : 'Добавить табак'}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {editorMode === 'edit'
                  ? 'Обновите позицию каталога.'
                  : 'Добавьте позицию в каталог.'}
              </SheetDescription>
            </div>
            <button
              type="button"
              className="tobacco-drawer__close"
              onClick={closeEditor}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </SheetHeader>

          <form
            className="tobacco-drawer__form admin-form inventory-editor-form"
            onSubmit={(event) => void handleEditorSubmit(event)}
          >
          <div className="drawer__body tobacco-drawer__body">
            <div className="inventory-editor-identity">
              <div className="inventory-editor-identity__col">
                <div className="section-h">Наличие</div>
                <div className="inventory-editor-identity__toggle">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editorDraft.inStock}
                    className={`toggle ${editorDraft.inStock ? 'toggle--on' : 'toggle--off'}`}
                    onClick={() => updateEditorDraft('inStock', !editorDraft.inStock)}
                    disabled={saveStatus === 'loading'}
                    title={editorDraft.inStock ? 'В наличии' : 'Нет на кухне'}
                  >
                    <span className="toggle__track" aria-hidden="true">
                      <span className="toggle__thumb" />
                    </span>
                  </button>
                  <span
                    className="inventory-editor-identity__status"
                    data-tone={editorDraft.inStock ? 'success' : 'muted'}
                  >
                    {editorDraft.inStock ? 'В наличии' : 'Нет на кухне'}
                  </span>
                </div>
              </div>
              <div className="inventory-editor-identity__col">
                <div className="section-h">Крепость</div>
                <div className="inventory-editor-identity__chips inventory-editor-identity__chips--wrap">
                  {INVENTORY_STRENGTH_PRESETS.map((preset) => {
                    const active =
                      editorDraft.officialStrength.trim().toLocaleLowerCase('ru-RU') ===
                      preset.toLocaleLowerCase('ru-RU');
                    return (
                      <button
                        key={preset}
                        type="button"
                        className={active ? 'editor-chip editor-chip--active' : 'editor-chip'}
                        aria-pressed={active}
                        onClick={() =>
                          updateEditorDraft('officialStrength', active ? '' : preset)
                        }
                        disabled={saveStatus === 'loading'}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="inventory-editor-fields">
              <label className="field field--wide">
                <span className="field-label">Название</span>
                <input
                  className="text-input text-input--name"
                  value={editorDraft.name}
                  onChange={(event) => updateEditorDraft('name', event.target.value)}
                  placeholder="Например, Citrus Breeze"
                  disabled={saveStatus === 'loading'}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">Описание для команды</span>
                <textarea
                  className="textarea-input"
                  value={editorDraft.description}
                  onChange={(event) => updateEditorDraft('description', event.target.value)}
                  placeholder="Например: подходит к цитрусовым миксам, не миксуй с табачными"
                  rows={3}
                  disabled={saveStatus === 'loading'}
                />
              </label>

              <div className="form-grid form-grid--two">
                <InventorySuggestionInput
                  label="Производитель"
                  value={editorDraft.manufacturer}
                  suggestions={manufacturerOptions}
                  placeholder="Nomad Reserve"
                  disabled={saveStatus === 'loading'}
                  onChange={(value) => updateEditorDraft('manufacturer', value)}
                />

                <InventorySuggestionInput
                  label="Линейка"
                  value={editorDraft.lineName}
                  suggestions={lineNameOptions}
                  placeholder="Signature"
                  disabled={saveStatus === 'loading'}
                  onChange={(value) => updateEditorDraft('lineName', value)}
                />
              </div>

              <div className="field field--wide">
                <span className="field-label">Категория вкуса · можно несколько</span>
                <div className="inventory-editor-identity__chips inventory-editor-identity__chips--wrap">
                  {flavorProfileOptions.map((profile) => {
                    const active = editorDraft.flavorProfiles.includes(profile);
                    return (
                      <button
                        key={profile}
                        type="button"
                        className={active ? 'editor-chip editor-chip--active' : 'editor-chip'}
                        aria-pressed={active}
                        onClick={() =>
                          updateEditorDraft(
                            'flavorProfiles',
                            active
                              ? editorDraft.flavorProfiles.filter((item) => item !== profile)
                              : [...editorDraft.flavorProfiles, profile],
                          )
                        }
                        disabled={saveStatus === 'loading'}
                      >
                        {formatFlavorProfileLabel(profile)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <InventoryTokenEditor
                label="Вкусы"
                selected={editorDraft.flavors}
                suggestions={flavorOptions}
                placeholder="Выбери или добавь вкус"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('flavors', value)}
              />

              <details
                className="inventory-extra-filters inventory-editor-extra"
                open={extraEditorOpen}
                onToggle={(event) => setExtraEditorOpen(event.currentTarget.open)}
              >
                <summary className="inventory-extra-filters__trigger">
                  {extraEditorOpen ? (
                    <ChevronUp size={14} aria-hidden className="inventory-editor-extra__chevron" />
                  ) : (
                    <ChevronDown size={14} aria-hidden className="inventory-editor-extra__chevron" />
                  )}
                  <span>Дополнительно</span>
                  {extraFieldsFilledCount > 0 ? (
                    <span className="inventory-extra-filters__count" aria-hidden="true">
                      {extraFieldsFilledCount}
                    </span>
                  ) : null}
                </summary>
                <div className="form-grid form-grid--two inventory-editor-extra__grid">
                  <InventorySuggestionInput
                    label="Страна"
                    value={editorDraft.country}
                    suggestions={countryOptions}
                    placeholder="Например, Россия"
                    disabled={saveStatus === 'loading'}
                    onChange={(value) => updateEditorDraft('country', value)}
                  />

                  <label className="field">
                    <span className="field-label">Комьюнити-крепость</span>
                    <input
                      className="text-input"
                      value={editorDraft.communityStrength}
                      onChange={(event) => updateEditorDraft('communityStrength', event.target.value)}
                      placeholder="Например, выше средней"
                      disabled={saveStatus === 'loading'}
                    />
                  </label>

                  <InventoryProductionStatusSelect
                    value={editorDraft.productionStatus}
                    options={productionStatusOptions}
                    disabled={saveStatus === 'loading'}
                    onChange={(value) => updateEditorDraft('productionStatus', value)}
                  />

                  <InventoryTokenEditor
                    label="Мета-теги"
                    selected={editorDraft.flavorTags}
                    suggestions={flavorTagOptions}
                    placeholder="Выбери или добавь мета-тег"
                    disabled={saveStatus === 'loading'}
                    onChange={(value) => updateEditorDraft('flavorTags', value)}
                  />
                </div>
              </details>
            </div>

          </div>

          {saveError ? <p className="tobacco-drawer__error">{saveError}</p> : null}

          <footer className="drawer__foot tobacco-drawer__foot">
            <div className="tobacco-drawer__foot-left">
              {editingItem ? (
                editingItem.archived ? (
                  <button
                    type="button"
                    className="btn"
                    data-variant="ghost"
                    disabled={pendingRowId === editingItem.id || saveStatus === 'loading'}
                    onClick={() => {
                      onArchiveTobacco(editingItem, false);
                      closeEditor();
                    }}
                  >
                    Вернуть из архива
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    data-variant="danger"
                    disabled={pendingRowId === editingItem.id || saveStatus === 'loading'}
                    title="Архивный табак скрывается из каталога и снимается с наличия"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Архивировать «${editingItem.name}»? Табак скроется из каталога и снимется с наличия.`,
                        )
                      ) {
                        return;
                      }
                      onArchiveTobacco(editingItem, true);
                      closeEditor();
                    }}
                  >
                    Архивировать
                  </button>
                )
              ) : null}
            </div>
            <div className="tobacco-drawer__foot-actions">
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={closeEditor}
                disabled={saveStatus === 'loading'}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn"
                data-variant="primary"
                disabled={saveStatus === 'loading'}
              >
                {saveStatus === 'loading' ? 'Сохраняем...' : editorMode === 'edit' ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </footer>
          </form>
        </SheetContent>
      </Sheet>

      {extraFilterGroups.some((group) => filters.options[group.key].length) ? (
        <details className="inventory-extra-filters">
          <summary className="inventory-extra-filters__trigger">
            Доп. фильтры
            <span className="inventory-extra-filters__count" aria-hidden="true">
              {formatMetricValue(
                extraFilterGroups.reduce((acc, group) => acc + filters[group.key].length, 0),
              )}
            </span>
          </summary>
          <div className="inventory-filter-groups ops-filter-groups">
            {extraFilterGroups.map((group) => {
              const options = filters.options[group.key];

              if (!options.length) {
                return null;
              }

              return (
                <FilterMultiSelect
                  key={group.key}
                  title={group.title}
                  options={options}
                  selected={filters[group.key]}
                  formatOptionLabel={(option) => formatFilterOptionLabel(group.key, option)}
                  onToggleOption={(option) => onToggleFilterValue(group.key, option)}
                  onClearGroup={() => onClearFilterGroup(group.key)}
                />
              );
            })}
          </div>
        </details>
      ) : null}

      {selectedIds.length ? (
        <div className="inventory-batch-bar">
          <div>
            <p className="inventory-batch-bar__title">Выбрано позиций: {formatMetricValue(selectedIds.length)}</p>
            <p className="meta-line">Массовые действия меняют наличие и архив.</p>
          </div>
          <div className="inventory-batch-bar__actions">
            <Button
              type="button"
              size="sm"
              onClick={() => onRunBatchAction('set-in-stock')}
              disabled={pendingBatchAction !== ''}
            >
              {pendingBatchAction === 'set-in-stock' ? 'Обновляем...' : formatInventoryBatchAction('set-in-stock')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onRunBatchAction('set-out-of-stock')}
              disabled={pendingBatchAction !== ''}
            >
              {pendingBatchAction === 'set-out-of-stock' ? 'Обновляем...' : formatInventoryBatchAction('set-out-of-stock')}
            </Button>
            {archivedActive ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onRunBatchAction('unarchive')}
                disabled={pendingBatchAction !== ''}
              >
                {pendingBatchAction === 'unarchive' ? 'Обновляем...' : formatInventoryBatchAction('unarchive')}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onRunBatchAction('archive')}
                disabled={pendingBatchAction !== ''}
              >
                {pendingBatchAction === 'archive' ? 'Обновляем...' : formatInventoryBatchAction('archive')}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {status === 'loading' ? <p className="meta-line">Загружаем таблицу остатков...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="inventory-table-shell ops-table-shell">
        <table className="inventory-table inventory-table--redesign">
          <thead>
            <tr>
              <th className="inventory-table__brand" scope="col">
                <label className="inventory-check">
                  <input
                    type="checkbox"
                    className="inventory-check__input"
                    checked={allVisibleSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Выбрать все позиции"
                  />
                  <span className="inventory-check__box" aria-hidden="true" />
                </label>
              </th>
              <th scope="col">Табак</th>
              <th scope="col">Бренд</th>
              <th scope="col">Вкус / профиль</th>
              <th className="inventory-table__stock" scope="col">В наличии</th>
              <th className="inventory-table__mixes" scope="col">Миксов</th>
              <th className="inventory-table__actions" scope="col" aria-label="Действия">
                <span aria-hidden="true">⋯</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => {
                const isActive = item.id === activeItemId;
                const profiles = item.flavorProfiles ?? [];
                const profileShown = profiles.slice(0, 3);
                const profileRest = profiles.length - profileShown.length;
                const strengthLabel = formatStrengthCompact(item);
                const flavorsTop3 = (item.flavors ?? []).slice(0, 3).join(', ');
                const stockBusy = pendingRowId === item.id || pendingBatchAction !== '';
                const stockLabel = item.inStock ? 'В наличии' : 'Нет наличия';
                const dependentCount = item.dependentMixCount ?? 0;
                const blockedCount = item.blockedDependentMixCount ?? 0;
                const brandShort = buildBrandShort(item.manufacturer);

                return (
                  <tr
                    key={item.id}
                    data-active={isActive}
                    className="inventory-table__row"
                    onClick={() => openEditEditor(item)}
                  >
                    <td className="inventory-table__brand" onClick={(event) => event.stopPropagation()}>
                      <label
                        className="inventory-brand-cell"
                        title={item.manufacturer}
                      >
                        <input
                          type="checkbox"
                          className="inventory-brand-cell__check"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => onToggleSelection(item.id)}
                          aria-label={`Выбрать ${item.name}`}
                        />
                        <span className="inventory-brand-cell__pill" aria-hidden="true">
                          {brandShort}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div className="inventory-cell inventory-cell--primary">
                        <strong>
                          {item.name}
                          {item.archived ? (
                            <Badge variant="secondary" className="inventory-cell__archived-badge">
                              Архив
                            </Badge>
                          ) : null}
                        </strong>
                        <span className="inventory-cell__sub">
                          {strengthLabel}
                          {flavorsTop3 ? ` · ${flavorsTop3}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell inventory-cell--brand">
                        <span>{item.manufacturer}</span>
                        {item.lineName ? (
                          <span className="inventory-cell__faint">· {item.lineName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell__chips">
                        {profileShown.length ? (
                          profileShown.map((profile) => (
                            <Badge key={`${item.id}:profile:${profile}`} variant="outline">
                              {formatFlavorProfileLabel(profile)}
                            </Badge>
                          ))
                        ) : (
                          <span className="inventory-cell__faint">{STRENGTH_DASH}</span>
                        )}
                        {profileRest > 0 ? (
                          <Badge
                            variant="secondary"
                            title={profiles.slice(3).map(formatFlavorProfileLabel).join(', ')}
                          >
                            {formatProfileRest(profileRest)}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="inventory-table__stock" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.inStock}
                        aria-label={`${stockLabel}: переключить наличие для ${item.name}`}
                        onClick={() => onToggleStock(item)}
                        disabled={stockBusy}
                        className={`row-toggle row-toggle--icon ${item.inStock ? 'row-toggle--on' : 'row-toggle--off'}${stockBusy ? ' row-toggle--busy' : ''}`}
                      >
                        <span className="row-toggle__track" aria-hidden="true">
                          <span className="row-toggle__thumb" />
                        </span>
                        <span className="sr-only">
                          {pendingRowId === item.id ? 'Сохраняем...' : stockLabel}
                        </span>
                      </button>
                    </td>
                    <td className="inventory-table__mixes">
                      {dependentCount > 0 ? (
                        <span
                          className="inventory-cell__count"
                          aria-label={`Зависимых миксов: ${dependentCount}${blockedCount > 0 ? `, заблокировано: ${blockedCount}` : ''}`}
                        >
                          <span>{formatMetricValue(dependentCount)}</span>
                          {blockedCount > 0 ? (
                            <span className="inventory-cell__count-blocked" title="Заблокировано">
                              ⊘ {formatMetricValue(blockedCount)}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="inventory-cell__faint" aria-label="Не используется в миксах">
                          {STRENGTH_DASH}
                        </span>
                      )}
                    </td>
                    <td className="inventory-table__actions" onClick={(event) => event.stopPropagation()}>
                      <div className="inventory-row-actions">
                        <button
                          type="button"
                          className="inventory-row-actions__btn"
                          title="Редактировать"
                          aria-label={`Редактировать ${item.name}`}
                          onClick={() => openEditEditor(item)}
                        >
                          <svg
                            className="inventory-row-actions__icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <details className="inventory-actions">
                          <summary
                            className="inventory-actions__trigger"
                            aria-label={`Действия для ${item.name}`}
                          >
                            <span aria-hidden="true">⋯</span>
                          </summary>
                          <div className="inventory-actions__menu" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              className="inventory-actions__item"
                              onClick={() => setActiveItemId(item.id)}
                            >
                              Профиль
                            </button>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="inventory-table__empty" colSpan={7}>
                  Нет позиций под текущие фильтры. Попробуй сбросить search или вкусовые фильтры.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      <ListPagination
        page={meta.page}
        pageSize={meta.pageSize}
        totalPages={meta.totalPages}
        filteredItems={meta.filteredItems}
        onPageChange={onPageChange}
        pageSizeOptions={inventoryPageSizeOptions}
        onPageSizeChange={onPageSizeChange}
      />

      {detailModal}
    </section>
  );
};
