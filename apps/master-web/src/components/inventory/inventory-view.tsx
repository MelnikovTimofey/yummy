import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Flame, Plus, Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AttributeFilter, FilterChip, FilterReset, FiltersButton, SheetChoice, SortPill } from '@/components/ui/filter-bar';
import { ListPagination } from '@/components/ui/list-pagination';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { ProfileTag } from '@/components/ui/profile-tag';
import { SortableHeader } from '@/components/shell/sortable-header';
import { formatHtRating, formatViews } from '@/lib/catalog-ideas';
import { useIsPhone } from '@/hooks/use-is-phone';
import {
  CATALOG_SORTS,
  CATALOG_STATUS_CHIPS,
  applyAttributeChange,
  catalogStatusCount,
  catalogStatusOf,
  catalogStatusPatch,
  pickSort,
  sortPillOptions,
  type CatalogStatus,
} from '@/lib/list-filters';
import type {
  InventoryArchivedFilter,
  InventoryFilterKey,
  InventoryListFilters,
  InventoryListMeta,
  InventoryListSort,
  InventoryStockFilter,
  InventoryTobacco,
} from '@/contracts';
import {
  formatCount,
  formatFlavorProfileLabel,
  formatMixStatusLabel,
  formatRating,
  resolveMixStatus,
  formatMetricValue,
  defaultInventoryListResponse,
  INVENTORY_FLAVOR_PROFILE_KEYS,
  INVENTORY_STRENGTH_PRESETS,
} from '@/contracts';
import { BusyLabel, RowsSkeleton } from '@/components/ui/loading';

// Наличие для гостя считает полка (#211): каталог только ставит табак на полку
// и убирает с неё, архив — по-прежнему здесь.
export type CatalogBatchAction = 'shelf-add' | 'shelf-remove' | 'archive' | 'unarchive';

const catalogBatchLabels: Record<CatalogBatchAction, string> = {
  'shelf-add': 'На полку',
  'shelf-remove': 'Убрать с полки',
  archive: 'Архивировать',
  unarchive: 'Вернуть из архива',
};

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
  pendingBatchAction: '' | CatalogBatchAction;
  shelfStatuses: Map<string, 'active' | 'plan'>;
  onSearchChange: (value: string) => void;
  onStockChange: (value: InventoryStockFilter) => void;
  onArchivedChange: (value: InventoryArchivedFilter) => void;
  onSortChange: (value: InventoryListSort) => void;
  onToggleFilterValue: (key: InventoryFilterKey, value: string) => void;
  onClearFilterGroup: (key: InventoryFilterKey) => void;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onAddToShelf: (item: InventoryTobacco) => void;
  onRemoveFromShelf: (item: InventoryTobacco) => void;
  onArchiveTobacco: (item: InventoryTobacco, archived: boolean) => void;
  onRunBatchAction: (action: CatalogBatchAction) => void;
  onOpenMix: (mixId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onSaveTobacco: (payload: InventoryEditorInput) => Promise<void>;
  onResetSaveFeedback: () => void;
  view: CatalogView;
  onViewChange: (view: CatalogView) => void;
  ideas: ReactNode;
};

export type CatalogView = 'all' | 'ideas';

const filterKeys: InventoryFilterKey[] = ['flavorProfiles', 'manufacturers', 'flavors', 'flavorTags'];

const inventoryPageSizeOptions = [100, 200, 500, 1000];

const STRENGTH_DASH = '—';

const ALPHABET_DIRECTIONS = { asc: 'А → Я', desc: 'Я → А' } as const;

const formatStrengthCompact = (item: InventoryTobacco) =>
  item.officialStrength?.trim() || item.communityStrength?.trim() || '';

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

const formatMixCardStatus = (mix: NonNullable<InventoryTobacco['dependentMixes']>[number]) =>
  formatMixStatusLabel(resolveMixStatus(mix));

const uniqueStrings = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));


// Категории в списке фильтра — по частоте в каталоге, чисел у них нет (#348).
const buildCategoryOptions = (catalog: InventoryTobacco[]): string[] => {
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
    .map(([value]) => value);
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
  shelfStatuses,
  onSearchChange,
  onStockChange,
  onArchivedChange,
  onSortChange,
  onToggleFilterValue,
  onClearFilterGroup,
  onToggleSelection,
  onToggleSelectAll,
  onAddToShelf,
  onRemoveFromShelf,
  onArchiveTobacco,
  onRunBatchAction,
  onOpenMix,
  onPageChange,
  onPageSizeChange,
  saveStatus,
  saveError,
  onSaveTobacco,
  onResetSaveFeedback,
  view,
  onViewChange,
  ideas,
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
  const categoryOptions = Array.from(new Set([...buildCategoryOptions(catalogOptions), ...filters.options.flavorProfiles]));
  const isPhone = useIsPhone();
  const [filtersOpen, setFiltersOpen] = useState(false);

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

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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
            <SheetTitle id={activeDialogTitleId} className="tobacco-drawer__title">
              {activeItem.name}
            </SheetTitle>
            <SheetDescription className="tobacco-detail-drawer__sub">
              {activeItem.manufacturer}
              {activeItem.lineName ? `, линейка ${activeItem.lineName}` : ''}
            </SheetDescription>
          </div>
          <div className="tobacco-detail-drawer__head-meta">
            <span
              className="tag"
              data-tone={activeItem.inStock ? undefined : 'warning'}
            >
              {activeItem.inStock ? 'Гость видит' : 'Гость не видит'}
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
                data-variant={shelfStatuses.has(activeItem.id) ? 'ghost' : 'primary'}
                onClick={() =>
                  shelfStatuses.has(activeItem.id) ? onRemoveFromShelf(activeItem) : onAddToShelf(activeItem)
                }
                disabled={pendingRowId === activeItem.id || pendingBatchAction !== ''}
                aria-busy={pendingRowId === activeItem.id || undefined}
              >
                <BusyLabel busy={pendingRowId === activeItem.id}>
                  {shelfStatuses.has(activeItem.id) ? 'Убрать с полки' : 'На полку'}
                </BusyLabel>
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
                <dt>Крепость по отзывам</dt>
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
            <p className="tobacco-detail-drawer__label">Вкусовой профиль</p>
            <div className="tobacco-detail-drawer__taxonomy">
              {(activeItem.flavorProfiles ?? []).map((profile) => (
                <ProfileTag key={`${activeItem.id}:detail:profile:${profile}`} profile={profile} />
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
                {formatMetricValue(activeItem.dependentMixCount ?? 0)} всего,{' '}
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
                      <span className="metric-inline" title="Популярность микса">
                        <Flame size={11} aria-hidden="true" />
                        <span className="sr-only">Выборов</span>
                        {formatMetricValue(mix.smokeCtaCount)}
                      </span>
                      <span className="metric-inline" title="Средний рейтинг гостей">
                        <Star size={11} aria-hidden="true" />
                        <span className="sr-only">Рейтинг</span>
                        {formatRating(mix.avgRating)}
                      </span>
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

  const editorSheet = (
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
            {editorMode === 'create' ? (
            <div className="inventory-editor-identity__col">
              <div className="section-h">Полка</div>
              <div className="inventory-editor-identity__toggle">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editorDraft.inStock}
                  className={`toggle ${editorDraft.inStock ? 'toggle--on' : 'toggle--off'}`}
                  onClick={() => updateEditorDraft('inStock', !editorDraft.inStock)}
                  disabled={saveStatus === 'loading'}
                  aria-label="Сразу на полку"
                  title={editorDraft.inStock ? 'Сразу на полку' : 'Только в каталог'}
                >
                  <span className="toggle__track" aria-hidden="true">
                    <span className="toggle__thumb" />
                  </span>
                </button>
                <span
                  className="inventory-editor-identity__status"
                  data-tone={editorDraft.inStock ? 'success' : 'muted'}
                >
                  {editorDraft.inStock ? 'Сразу на полку' : 'Только в каталог'}
                </span>
              </div>
            </div>
            ) : null}
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
                placeholder="Например: подходит к цитрусовым миксам, не сочетается с табачными"
                rows={3}
                disabled={saveStatus === 'loading'}
              />
            </label>

            <div className="form-grid form-grid--two">
              <InventorySuggestionInput
                label="Производитель"
                value={editorDraft.manufacturer}
                suggestions={manufacturerOptions}
                placeholder="Ателье Reserve"
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
              <span className="field-label">Категории вкуса</span>
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
              placeholder="Выбрать или добавить вкус"
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
                  <span className="field-label">Крепость по отзывам</span>
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
                  placeholder="Выбрать или добавить мета-тег"
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
              aria-busy={saveStatus === 'loading' || undefined}
            >
              <BusyLabel busy={saveStatus === 'loading'}>{editorMode === 'edit' ? 'Сохранить' : 'Создать'}</BusyLabel>
            </button>
          </div>
        </footer>
        </form>
      </SheetContent>
    </Sheet>
  );

  const sortHeaderProps = {
    sort,
    fallback: defaultInventoryListResponse.sort,
    onSortChange,
  };

  const catalogStatus = catalogStatusOf(filters);
  const archivedActive = catalogStatus === 'archived';
  const setCatalogStatus = (next: CatalogStatus) => {
    const patch = catalogStatusPatch(filters, next);
    if (patch.archived) onArchivedChange(patch.archived);
    if (patch.stock) onStockChange(patch.stock);
  };
  const changeSort = (field: InventoryListSort['field']) => {
    const next = pickSort(CATALOG_SORTS, sort, field);
    if (next !== sort) onSortChange(next);
  };
  // Фильтры серверные: список отдаёт новый набор, сервер принимает toggle или clear.
  const attribute = (key: InventoryFilterKey, title: string, options: string[], formatOption?: (value: string) => string) => ({
    title,
    options,
    selected: filters[key],
    formatOption,
    onChange: (next: string[]) =>
      applyAttributeChange(filters[key], next, {
        toggle: (value) => onToggleFilterValue(key, value),
        clear: () => onClearFilterGroup(key),
      }),
  });
  // Одни и те же атрибуты — списками на десктопе и чипами в шторке телефона.
  const attributes = [
    attribute('flavorProfiles', 'Категории', categoryOptions, formatFlavorProfileLabel),
    attribute('manufacturers', 'Бренд', filters.options.manufacturers),
    attribute('flavors', 'Вкусы', filters.options.flavors),
    attribute('flavorTags', 'Мета-теги', filters.options.flavorTags),
  ];
  const activeAttributes = filterKeys.reduce((acc, key) => acc + filters[key].length, 0);
  const narrowed = activeAttributes > 0 || catalogStatus !== 'all';
  const filtersActive = Boolean(filters.search) || narrowed;

  const clearAttributes = () => filterKeys.forEach((key) => filters[key].length && onClearFilterGroup(key));
  const resetFilters = () => {
    setCatalogStatus('all');
    clearAttributes();
  };
  const resetAll = () => {
    setSearchValue('');
    onSearchChange('');
    resetFilters();
  };

  const statusChip = ([key, label]: [CatalogStatus, string]) => (
    <FilterChip
      key={key}
      active={catalogStatus === key}
      count={catalogStatusCount(meta, key)}
      label={`Фильтр: ${label}`}
      onClick={() => setCatalogStatus(key)}
    >
      {label}
    </FilterChip>
  );
  const searchInput = (
    <input
      type="search"
      enterKeyHint="search"
      aria-label="Поиск по каталогу"
      placeholder="Табак или бренд"
      value={searchValue}
      onChange={(event) => setSearchValue(event.target.value)}
    />
  );

  return (
    <section className="tobaccos-page">
      <MasterPageHeader
        title="Каталог"
        meta={`${formatCount(meta.totalItems, ['позиция', 'позиции', 'позиций'])}, ${formatMetricValue(meta.inMixesCount)} в миксах`}
        actions={
          <>
            <span className="shelf-seg" role="group" aria-label="Вид каталога">
              <button type="button" aria-pressed={view === 'all'} onClick={() => onViewChange('all')}>
                Все табаки
              </button>
              <button type="button" aria-pressed={view === 'ideas'} onClick={() => onViewChange('ideas')}>
                Идеи для закупки
              </button>
            </span>
            <button
              type="button"
              className="btn"
              data-variant="primary"
              onClick={openCreateEditor}
            >
              <Plus size={14} aria-hidden />
              Новый табак
            </button>
          </>
        }
      />

      {editorSheet}

      {view === 'ideas' ? ideas : (
      <>
      {isPhone ? (
        <>
          <div className="m-list-search">
            <div className="input m-list-search__field">
              <Search size={16} aria-hidden />
              {searchInput}
            </div>
            <FiltersButton count={activeAttributes} open={filtersOpen} onClick={() => setFiltersOpen(true)} />
          </div>
          <div className="m-list-chips" role="group" aria-label="Статус в каталоге">
            {CATALOG_STATUS_CHIPS.map(statusChip)}
          </div>
        </>
      ) : (
        <div className="filter-bar">
          <div className="filter-bar__row">
            <div className="input filter-bar__search">
              <Search size={14} aria-hidden />
              {searchInput}
            </div>
            <div className="filter-bar__chips" role="group" aria-label="Статус в каталоге">
              {CATALOG_STATUS_CHIPS.map(statusChip)}
            </div>
          </div>
          <div className="filter-bar__row">
            <div className="filter-bar__chips" role="group" aria-label="Фильтры каталога">
              {attributes.map((item) => (
                <AttributeFilter key={item.title} {...item} />
              ))}
              {narrowed ? <FilterReset onClick={resetFilters} /> : null}
            </div>
            <SortPill value={sort.field} options={sortPillOptions(CATALOG_SORTS)} onChange={changeSort} />
          </div>
        </div>
      )}

      {isPhone && filtersOpen ? (
        <BottomSheet label="Фильтры каталога" onClose={() => setFiltersOpen(false)} className="m-filters-sheet">
          <h2 className="m-filters-sheet__title">Фильтры</h2>
          <SheetChoice
            title="Сортировка"
            options={CATALOG_SORTS.map((option) => option.field)}
            selected={[sort.field]}
            formatOption={(field) => CATALOG_SORTS.find((option) => option.field === field)?.label ?? field}
            single
            onChange={([next]) => next && changeSort(next as InventoryListSort['field'])}
          />
          {attributes.map((item) => (
            <SheetChoice key={item.title} {...item} />
          ))}
          <div className="m-filters-sheet__actions">
            {activeAttributes ? (
              <button type="button" className="btn" data-variant="ghost" onClick={clearAttributes}>
                Сбросить
              </button>
            ) : null}
            <button type="button" className="btn" data-variant="primary" onClick={() => setFiltersOpen(false)}>
              Показать {formatMetricValue(meta.filteredItems)}
            </button>
          </div>
        </BottomSheet>
      ) : null}

      <div className="tobaccos-list">
      {selectedIds.length ? (
        <div className="inventory-batch-bar">
          <p className="inventory-batch-bar__title">Выбрано позиций: {formatMetricValue(selectedIds.length)}</p>
          <div className="inventory-batch-bar__actions">
            <Button
              type="button"
              size="sm"
              onClick={() => onRunBatchAction('shelf-add')}
              disabled={pendingBatchAction !== ''}
              aria-busy={pendingBatchAction === 'shelf-add' || undefined}
            >
              <BusyLabel busy={pendingBatchAction === 'shelf-add'}>{catalogBatchLabels['shelf-add']}</BusyLabel>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onRunBatchAction('shelf-remove')}
              disabled={pendingBatchAction !== ''}
              aria-busy={pendingBatchAction === 'shelf-remove' || undefined}
            >
              <BusyLabel busy={pendingBatchAction === 'shelf-remove'}>{catalogBatchLabels['shelf-remove']}</BusyLabel>
            </Button>
            {archivedActive ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onRunBatchAction('unarchive')}
                disabled={pendingBatchAction !== ''}
                aria-busy={pendingBatchAction === 'unarchive' || undefined}
              >
                <BusyLabel busy={pendingBatchAction === 'unarchive'}>{catalogBatchLabels.unarchive}</BusyLabel>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onRunBatchAction('archive')}
                disabled={pendingBatchAction !== ''}
                aria-busy={pendingBatchAction === 'archive' || undefined}
              >
                <BusyLabel busy={pendingBatchAction === 'archive'}>{catalogBatchLabels.archive}</BusyLabel>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {status === 'loading' && !items.length ? <RowsSkeleton label="Загружаем таблицу остатков" rows={8} /> : null}
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
              <SortableHeader
                label="Табак"
                field="name"
                initialDirection="asc"
                directionLabels={ALPHABET_DIRECTIONS}
                {...sortHeaderProps}
              />
              <SortableHeader
                label="Бренд"
                field="manufacturer"
                initialDirection="asc"
                directionLabels={ALPHABET_DIRECTIONS}
                {...sortHeaderProps}
              />
              <th scope="col">Вкус и профиль</th>
              <th className="inventory-table__stat" scope="col">htreviews</th>
              <th className="inventory-table__stat" scope="col">Оценок</th>
              <th className="inventory-table__stat" scope="col">Просмотров</th>
              <th className="inventory-table__stock" scope="col">Полка</th>
              <SortableHeader
                label="Миксов"
                field="dependentMixes"
                initialDirection="desc"
                directionLabels={{ desc: 'больше миксов', asc: 'меньше миксов' }}
                className="inventory-table__mixes"
                {...sortHeaderProps}
              />
              <th className="inventory-table__actions" scope="col">
                <span className="sr-only">Действия</span>
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
                const shelfStatus = shelfStatuses.get(item.id);
                const dependentCount = item.dependentMixCount ?? 0;
                const blockedCount = item.blockedDependentMixCount ?? 0;

                return (
                  <tr
                    key={item.id}
                    data-active={isActive}
                    // Якорь для smoke: имена табаков в реальном каталоге не
                    // уникальны, а сортировка переставляет строки после
                    // батч-операции (#27).
                    data-tobacco-id={item.id}
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
                        {strengthLabel || flavorsTop3 ? (
                          <span className="inventory-cell__sub">
                            {strengthLabel ? <span>{strengthLabel}</span> : null}
                            {flavorsTop3 ? <span className="inventory-cell__flavors">{flavorsTop3}</span> : null}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell inventory-cell--brand">
                        <span>{item.manufacturer}</span>
                        {item.lineName ? (
                          <span className="inventory-cell__line">{item.lineName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell__chips">
                        {profileShown.length ? (
                          profileShown.map((profile) => (
                            <ProfileTag key={`${item.id}:profile:${profile}`} profile={profile} />
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
                    <td className="inventory-table__stat">{formatHtRating(item.rating ?? null)}</td>
                    <td className="inventory-table__stat">
                      {item.ratingsCount == null ? STRENGTH_DASH : formatMetricValue(item.ratingsCount)}
                    </td>
                    <td className="inventory-table__stat">{formatViews(item.viewsCount ?? null)}</td>
                    <td className="inventory-table__stock" onClick={(event) => event.stopPropagation()}>
                      {shelfStatus === 'active' ? (
                        <span className="inventory-shelf-cell">
                          <span className="tag" data-tone="success">на полке</span>
                          {item.inStock ? null : <span className="inventory-cell__faint">гость не видит</span>}
                        </span>
                      ) : shelfStatus === 'plan' ? (
                        <span className="tag" data-tone="info">в плане</span>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          data-size="sm"
                          aria-label={`На полку: ${item.name}`}
                          onClick={() => onAddToShelf(item)}
                          disabled={stockBusy || item.archived}
                          aria-busy={pendingRowId === item.id || undefined}
                        >
                          <BusyLabel busy={pendingRowId === item.id}>На полку</BusyLabel>
                        </button>
                      )}
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
                <td className="inventory-table__empty" colSpan={10}>
                  {filtersActive ? (
                    <div className="list-empty">
                      <p>Уберите один из фильтров.</p>
                      <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={resetAll}>
                        Сбросить фильтры
                      </button>
                    </div>
                  ) : (
                    'Каталог пуст.'
                  )}
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
      </>
      )}

      {detailModal}
    </section>
  );
};
