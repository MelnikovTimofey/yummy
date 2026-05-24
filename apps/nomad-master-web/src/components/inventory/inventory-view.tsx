import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type {
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
  inventoryStockFilterOptions,
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
  onSortFieldChange: (value: InventorySortField) => void;
  onSortDirectionChange: (value: InventorySortDirection) => void;
  onToggleFilterValue: (key: InventoryFilterKey, value: string) => void;
  onClearFilterGroup: (key: InventoryFilterKey) => void;
  onResetFilters: () => void;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleStock: (item: InventoryTobacco) => void;
  onRunBatchAction: (action: Exclude<InventoryBatchAction, 'archive'>) => void;
  onOpenMix: (mixId: string) => void;
  onPageChange: (page: number) => void;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onSaveTobacco: (payload: InventoryEditorInput) => Promise<void>;
  onResetSaveFeedback: () => void;
};

const filterGroups: Array<{ key: InventoryFilterKey; title: string }> = [
  { key: 'manufacturers', title: 'Производители' },
  { key: 'flavorProfiles', title: 'Категории' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

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

const formatStrength = (item: InventoryTobacco) => {
  const official = item.officialStrength?.trim();
  const community = item.communityStrength?.trim();

  if (official && community) {
    return `Крепость: офиц. ${official} / по оценкам ${community}`;
  }

  if (official) {
    return `Крепость: офиц. ${official}`;
  }

  if (community) {
    return `Крепость: по оценкам ${community}`;
  }

  return '';
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

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const existing = suggestions.find((item) => item.toLocaleLowerCase('ru-RU') === trimmed.toLocaleLowerCase('ru-RU'));
    const nextValue = existing ?? trimmed;
    const currentNormalized = selected.map((item) => item.toLocaleLowerCase('ru-RU'));

    if (currentNormalized.includes(nextValue.toLocaleLowerCase('ru-RU'))) {
      setDraftValue('');
      return;
    }

    onChange([...selected, nextValue]);
    setDraftValue('');
  };

  const toggleSuggestion = (value: string) => {
    const normalized = value.toLocaleLowerCase('ru-RU');
    if (selected.some((item) => item.toLocaleLowerCase('ru-RU') === normalized)) {
      onChange(selected.filter((item) => item.toLocaleLowerCase('ru-RU') !== normalized));
      return;
    }

    onChange([...selected, value]);
  };

  const filteredSuggestions = suggestions
    .filter((item) => {
      if (!draftValue.trim()) {
        return true;
      }

      return item.toLocaleLowerCase('ru-RU').includes(draftValue.trim().toLocaleLowerCase('ru-RU'));
    })
    .slice(0, 8);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }

    event.preventDefault();
    addValue(draftValue);
  };

  return (
    <div className="field field--wide inventory-editor__token-field">
      <span className="field-label">{label}</span>
      <div className="inventory-editor__token-input">
        <input
          className="text-input"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button type="button" size="sm" variant="outline" disabled={disabled || !draftValue.trim()} onClick={() => addValue(draftValue)}>
          Добавить
        </Button>
      </div>
      {selected.length ? (
        <div className="inventory-editor__chips">
          {selected.map((value) => (
            <button
              key={`${label}:${value}`}
              type="button"
              className="chip chip--editable"
              disabled={disabled}
              onClick={() => onChange(selected.filter((item) => item !== value))}
            >
              {formatValue(value)} ×
            </button>
          ))}
        </div>
      ) : null}
      {filteredSuggestions.length ? (
        <div className="inventory-editor__chips">
          {filteredSuggestions.map((value) => {
            const active = selected.includes(value);
            return (
              <button
                key={`${label}:suggestion:${value}`}
                type="button"
                className={active ? 'chip chip--editable inventory-editor__chip--active' : 'chip'}
                disabled={disabled}
                onClick={() => toggleSuggestion(value)}
              >
                {formatValue(value)}
              </button>
            );
          })}
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
  const listId = useId();

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="text-input"
        list={suggestions.length ? listId : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={`${label}:${option}`} value={option} />
          ))}
        </datalist>
      ) : null}
    </label>
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
  onSortFieldChange,
  onSortDirectionChange,
  onToggleFilterValue,
  onClearFilterGroup,
  onResetFilters,
  onToggleSelection,
  onToggleSelectAll,
  onToggleStock,
  onRunBatchAction,
  onOpenMix,
  onPageChange,
  saveStatus,
  saveError,
  onSaveTobacco,
  onResetSaveFeedback,
}: InventoryViewProps) => {
  const [activeItemId, setActiveItemId] = useState('');
  const [searchValue, setSearchValue] = useState(filters.search);
  const [editorMode, setEditorMode] = useState<InventoryEditorMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<InventoryEditorDraft>(emptyInventoryEditorDraft());
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const activeDialogTitleId = activeItem ? `inventory-detail-title-${activeItem.id}` : undefined;
  const manufacturerOptions = buildSuggestionOptions(catalogOptions.map((item) => item.manufacturer));
  const lineNameOptions = buildSuggestionOptions(catalogOptions.map((item) => item.lineName));
  const countryOptions = buildSuggestionOptions(catalogOptions.map((item) => item.country));
  const productionStatusOptions = buildSuggestionOptions(catalogOptions.map((item) => item.productionStatus));
  const flavorProfileOptions = buildSuggestionOptions(catalogOptions.flatMap((item) => item.flavorProfiles ?? []));
  const flavorOptions = buildSuggestionOptions(catalogOptions.flatMap((item) => item.flavors ?? []));
  const flavorTagOptions = buildSuggestionOptions(catalogOptions.flatMap((item) => item.flavorTags ?? []));

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
    <div className="inventory-detail-modal" onClick={() => setActiveItemId('')}>
      <div
        className="inventory-detail-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={activeDialogTitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <section className="inventory-detail-card inventory-detail-card--modal">
          <div className="inventory-detail-card__head">
            <div className="inventory-detail-card__intro">
              <p className="eyebrow">Карточка табака</p>
              <h3 id={activeDialogTitleId}>{activeItem.name}</h3>
              <p className="meta-line">
                {activeItem.manufacturer}
                {activeItem.lineName ? ` • ${activeItem.lineName}` : ''}
              </p>
            </div>

            <div className="inventory-detail-card__status">
              <Badge variant={activeItem.inStock ? 'default' : 'destructive'}>
                {activeItem.inStock ? 'В наличии' : 'Нет наличия'}
              </Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveItemId('')}>
                Закрыть
              </Button>
            </div>
          </div>

          <div className="inventory-detail-card__grid">
            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Описание</p>
              <p className="inventory-detail-card__description">
                {formatDetailValue(activeItem.description, 'Описание пока не заполнено.')}
              </p>
            </section>

            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Действия</p>
              <div className="inventory-detail-card__actions">
                <Button
                  type="button"
                  size="sm"
                  variant={activeItem.inStock ? 'secondary' : 'default'}
                  onClick={() => onToggleStock(activeItem)}
                  disabled={pendingRowId === activeItem.id || pendingBatchAction !== ''}
                >
                  {pendingRowId === activeItem.id ? 'Сохраняем...' : activeItem.inStock ? 'Убрать из наличия' : 'Вернуть в наличие'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedIds.includes(activeItem.id) ? 'secondary' : 'outline'}
                  onClick={() => onToggleSelection(activeItem.id)}
                >
                  {selectedIds.includes(activeItem.id) ? 'Убрать из выбора' : 'Добавить в выбор'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    openEditEditor(activeItem);
                    setActiveItemId('');
                  }}
                >
                  Редактировать
                </Button>
              </div>
            </section>

            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Атрибуты</p>
              <dl className="inventory-detail-card__attributes">
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
          </div>

          <div className="inventory-detail-card__taxonomy">
            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Категории</p>
              <div className="inventory-cell__chips">
                {(activeItem.flavorProfiles ?? []).length ? (
                  (activeItem.flavorProfiles ?? []).map((profile) => (
                    <Badge key={`${activeItem.id}:detail:profile:${profile}`} variant="outline">
                      {formatFlavorProfileLabel(profile)}
                    </Badge>
                  ))
                ) : (
                  <span className="meta-line">Категории не назначены.</span>
                )}
              </div>
            </section>

            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Вкусы</p>
              <div className="inventory-cell__chips">
                {(activeItem.flavors ?? []).length ? (
                  (activeItem.flavors ?? []).map((flavor) => (
                    <Badge key={`${activeItem.id}:detail:flavor:${flavor}`} variant="outline">
                      {flavor}
                    </Badge>
                  ))
                ) : (
                  <span className="meta-line">Вкусы не назначены.</span>
                )}
              </div>
            </section>

            <section className="inventory-detail-card__section">
              <p className="inventory-detail-card__label">Мета-теги</p>
              <div className="inventory-cell__chips">
                {(activeItem.flavorTags ?? []).length ? (
                  (activeItem.flavorTags ?? []).map((tag) => (
                    <Badge key={`${activeItem.id}:detail:tag:${tag}`} variant="secondary">
                      #{tag}
                    </Badge>
                  ))
                ) : (
                  <span className="meta-line">Мета-теги не назначены.</span>
                )}
              </div>
            </section>
          </div>

          <section className="inventory-detail-card__section">
            <div className="inventory-detail-card__mixes-head">
              <div>
                <p className="inventory-detail-card__label">Зависимые миксы</p>
                <p className="meta-line">
                  {formatMetricValue(activeItem.dependentMixCount ?? 0)} всего /{' '}
                  {formatMetricValue(activeItem.blockedDependentMixCount ?? 0)} блокируется по наличию
                </p>
              </div>
            </div>

            <div className="inventory-detail-card__mixes">
              {(activeItem.dependentMixes ?? []).length ? (
                (activeItem.dependentMixes ?? []).map((mix) => (
                  <button
                    className="inventory-mix-link inventory-mix-link--detail"
                    key={`${activeItem.id}:detail-mix:${mix.id}`}
                    type="button"
                    onClick={() => onOpenMix(mix.id)}
                  >
                    <strong>{mix.name}</strong>
                    <span>{formatMixCardStatus(mix)}</span>
                    <span>
                      Рейтинг {mix.avgRating.toFixed(1)} • Популярность {formatMetricValue(mix.popularity)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="meta-line">На этот табак сейчас не завязаны миксы.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  ) : null;

  return (
    <section className="card inventory-panel">
      <div className="section-head section-head--surface">
        <div className="ops-surface__intro">
          <p className="eyebrow">Инвентаризация</p>
          <h2>Таблица остатков и зависимых миксов</h2>
          <p className="meta-line">Остатки, фильтры и зависимые миксы.</p>
        </div>
        <div className="inventory-panel__stats ops-surface__stats">
          <div className="inventory-stat ops-surface__stat">
            <span>Показано</span>
            <strong>{formatMetricValue(meta.filteredItems)}</strong>
          </div>
          <div className="inventory-stat ops-surface__stat">
            <span>В наличии</span>
            <strong>{formatMetricValue(meta.inStockCount)}</strong>
          </div>
          <div className="inventory-stat ops-surface__stat">
            <span>Нет наличия</span>
            <strong>{formatMetricValue(meta.outOfStockCount)}</strong>
          </div>
        </div>
        <div className="section-actions">
          <Button type="button" size="sm" onClick={openCreateEditor}>
            Новый табак
          </Button>
        </div>
      </div>

      <div className="inventory-toolbar ops-toolbar">
        <label className="inventory-search">
          <span className="inventory-toolbar__label">Поиск</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Табак, производитель, вкус или зависимый микс"
          />
        </label>

        <label className="inventory-toolbar__control">
          <span className="inventory-toolbar__label">Наличие</span>
          <select value={filters.stock} onChange={(event) => onStockChange(event.target.value as InventoryStockFilter)}>
            {inventoryStockFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inventory-toolbar__control">
          <span className="inventory-toolbar__label">Сортировка</span>
          <select value={sort.field} onChange={(event) => onSortFieldChange(event.target.value as InventorySortField)}>
            {inventorySortFieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inventory-toolbar__control">
          <span className="inventory-toolbar__label">Порядок</span>
          <select
            value={sort.direction}
            onChange={(event) => onSortDirectionChange(event.target.value as InventorySortDirection)}
          >
            {inventorySortDirectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button className="inventory-toolbar__reset" type="button" variant="outline" size="sm" onClick={onResetFilters}>
          Сбросить
        </Button>
      </div>

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <SheetContent side="right" className="inventory-editor-sheet">
          <SheetHeader>
            <SheetTitle>
              {editorMode === 'edit'
                ? editorDraft.name.trim() || 'Редактирование табака'
                : 'Новый табак'}
            </SheetTitle>
            <SheetDescription>
              {editorMode === 'edit'
                ? 'Обновите позицию каталога.'
                : 'Добавьте позицию в каталог.'}
            </SheetDescription>
          </SheetHeader>
          <article className="editor-card ops-editor inventory-create-card inventory-create-card--sheet">
          <div className="entity-card__head">
            <div>
              <Badge variant={editorDraft.inStock ? 'default' : 'secondary'}>
                {editorDraft.inStock ? 'В наличии' : 'Нет наличия'}
              </Badge>
            </div>
          </div>

          <form className="admin-form" onSubmit={(event) => void handleEditorSubmit(event)}>
            <div className="form-grid form-grid--two">
              <InventorySuggestionInput
                label="Производитель"
                value={editorDraft.manufacturer}
                suggestions={manufacturerOptions}
                placeholder="Например, Black Burn"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('manufacturer', value)}
              />

              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={editorDraft.name}
                  onChange={(event) => updateEditorDraft('name', event.target.value)}
                  placeholder="Например, Peach Rings"
                  disabled={saveStatus === 'loading'}
                />
              </label>

              <InventorySuggestionInput
                label="Линейка"
                value={editorDraft.lineName}
                suggestions={lineNameOptions}
                placeholder="Например, Core"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('lineName', value)}
              />

              <InventorySuggestionInput
                label="Страна"
                value={editorDraft.country}
                suggestions={countryOptions}
                placeholder="Например, Россия"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('country', value)}
              />

              <label className="field">
                <span className="field-label">Официальная крепость</span>
                <input
                  className="text-input"
                  value={editorDraft.officialStrength}
                  onChange={(event) => updateEditorDraft('officialStrength', event.target.value)}
                  placeholder="Например, medium"
                  disabled={saveStatus === 'loading'}
                />
              </label>

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
                label="Категории"
                selected={editorDraft.flavorProfiles}
                suggestions={flavorProfileOptions}
                placeholder="Выбери или добавь category key"
                formatValue={formatFlavorProfileLabel}
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('flavorProfiles', value)}
              />

              <InventoryTokenEditor
                label="Вкусы"
                selected={editorDraft.flavors}
                suggestions={flavorOptions}
                placeholder="Выбери или добавь вкус"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('flavors', value)}
              />

              <InventoryTokenEditor
                label="Мета-теги"
                selected={editorDraft.flavorTags}
                suggestions={flavorTagOptions}
                placeholder="Выбери или добавь мета-тег"
                disabled={saveStatus === 'loading'}
                onChange={(value) => updateEditorDraft('flavorTags', value)}
              />

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={editorDraft.description}
                  onChange={(event) => updateEditorDraft('description', event.target.value)}
                  placeholder="Короткое описание табака для инвентаризации и каталога"
                  rows={3}
                  disabled={saveStatus === 'loading'}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={editorDraft.inStock}
                  onChange={(event) => updateEditorDraft('inStock', event.target.checked)}
                  disabled={saveStatus === 'loading'}
                />
                <span>{editorMode === 'edit' ? 'Табак сейчас в наличии' : 'Сразу отметить как «в наличии»'}</span>
              </label>
            </div>

            <p className="meta-line">
              Для `Производителя`, `Линейки`, `Страны`, `Категорий`, `Вкусов` и `Мета-тегов` можно выбрать текущее значение или
              добавить новое. `Статус производства` ограничен уже существующими значениями.
            </p>

            {saveError ? <p className="error-text">{saveError}</p> : null}

            <div className="form-actions">
              <Button type="submit" size="sm" disabled={saveStatus === 'loading'}>
                {saveStatus === 'loading' ? 'Сохраняем...' : editorMode === 'edit' ? 'Сохранить табак' : 'Создать табак'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saveStatus === 'loading'}
                onClick={closeEditor}
              >
                Отмена
              </Button>
            </div>
          </form>
          </article>
        </SheetContent>
      </Sheet>

      <div className="inventory-filter-groups ops-filter-groups">
        {filterGroups.map((group) => {
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

      {selectedIds.length ? (
        <div className="inventory-batch-bar">
          <div>
            <p className="inventory-batch-bar__title">Выбрано позиций: {formatMetricValue(selectedIds.length)}</p>
            <p className="meta-line">
              Массовые действия меняют только наличие. Архивирование остаётся выключенным до отдельного продуктового решения.
            </p>
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
            <Button type="button" size="sm" variant="outline" disabled title="Ждёт отдельного продуктового решения">
              Архивировать позже
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'loading' ? <p className="meta-line">Загружаем таблицу остатков...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="inventory-table-shell ops-table-shell">
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="inventory-table__check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Выбрать все позиции"
                />
              </th>
              <th>Табак</th>
              <th>Вкусовой профиль</th>
              <th>Зависимые миксы</th>
              <th>Обновлено</th>
              <th>Статус</th>
              <th className="inventory-table__actions">Действие</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => {
                const strength = formatStrength(item);
                const isActive = item.id === activeItemId;

                return (
                  <tr key={item.id} data-active={isActive}>
                    <td className="inventory-table__check">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => onToggleSelection(item.id)}
                        aria-label={`Выбрать ${item.name}`}
                      />
                    </td>
                    <td>
                      <button
                        className="inventory-item-trigger"
                        type="button"
                        onClick={() => setActiveItemId((current) => (current === item.id ? '' : item.id))}
                        aria-expanded={isActive}
                      >
                        <div className="inventory-cell">
                          <strong>{item.name}</strong>
                          <span>{item.manufacturer}</span>
                          {item.lineName ? <span>{item.lineName}</span> : null}
                          {strength ? <span>{strength}</span> : null}
                          <div className="inventory-cell__chips">
                            {(item.flavors ?? []).map((flavor) => (
                              <Badge key={`${item.id}:flavor:${flavor}`} variant="outline">
                                {flavor}
                              </Badge>
                            ))}
                            {(item.flavorTags ?? []).map((tag) => (
                              <Badge key={`${item.id}:tag:${tag}`} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td>
                      <div className="inventory-cell">
                        <div className="inventory-cell__chips">
                          {(item.flavorProfiles ?? []).map((profile) => (
                            <Badge key={`${item.id}:profile:${profile}`} variant="outline">
                              {formatFlavorProfileLabel(profile)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell">
                        <strong className="inventory-cell__count" aria-label={`Всего миксов: ${item.dependentMixCount ?? 0}, заблокировано: ${item.blockedDependentMixCount ?? 0}`}>
                          <span>
                            {formatMetricValue(item.dependentMixCount ?? 0)} {(item.dependentMixCount ?? 0) === 1 ? 'микс' : 'миксов'}
                          </span>
                          {(item.blockedDependentMixCount ?? 0) > 0 ? (
                            <span className="inventory-cell__count-blocked" title="Заблокировано">
                              ⊘ {formatMetricValue(item.blockedDependentMixCount ?? 0)}
                            </span>
                          ) : null}
                        </strong>
                        <div className="inventory-cell__mixes">
                          {(item.dependentMixes ?? []).slice(0, 3).map((mix) => (
                            <button
                              className={`inventory-mix-link ${mix.guestVisible ? 'inventory-mix-link--visible' : 'inventory-mix-link--blocked'}`}
                              key={`${item.id}:mix:${mix.id}`}
                              type="button"
                              onClick={() => onOpenMix(mix.id)}
                              aria-label={`${mix.name}${mix.guestVisible ? ' — виден гостю' : ' — заблокирован'}`}
                              title={mix.guestVisible ? 'Виден гостю' : 'Заблокирован'}
                            >
                              {mix.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>{formatUpdatedAt(item.updatedAt)}</td>
                    <td>
                      <Badge variant={item.inStock ? 'default' : 'destructive'}>
                        {item.inStock ? 'В наличии' : 'Нет наличия'}
                      </Badge>
                    </td>
                    <td className="inventory-table__actions">
                      <div className="entity-card__actions entity-card__actions--wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant={item.inStock ? 'secondary' : 'default'}
                          onClick={() => onToggleStock(item)}
                          disabled={pendingRowId === item.id || pendingBatchAction !== ''}
                        >
                          {pendingRowId === item.id ? 'Сохраняем...' : item.inStock ? 'Убрать' : 'Вернуть'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditEditor(item)}>
                          Редактировать
                        </Button>
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

      <ListPagination
        page={meta.page}
        pageSize={meta.pageSize}
        totalPages={meta.totalPages}
        filteredItems={meta.filteredItems}
        onPageChange={onPageChange}
      />

      {detailModal ? createPortal(detailModal, document.body) : null}
    </section>
  );
};
