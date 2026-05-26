import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterSortPill } from '@/components/shell/master-sort-pill';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import {
  buildSortPillOptions,
  composeSortKey,
  parseSortKey,
} from '@/components/shell/master-sort-pill.helpers';
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

// Manufacturers фильтруется через brand-chip row (PR2). Здесь только
// дополнительные таксономические фильтры — таб формы свёрнут в
// `<details>` блок «Доп. фильтры».
const extraFilterGroups: Array<{ key: InventoryFilterKey; title: string }> = [
  { key: 'flavorProfiles', title: 'Категории' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

const STRENGTH_DASH = '—';

const STRENGTH_PRESETS = ['Лёгкий', 'Средний', 'Крепкий'];

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

const BRAND_CHIPS_TOP_LIMIT = 8;

type BrandChipEntry = {
  name: string;
  count: number;
  short: string;
};

const buildBrandChips = (catalog: InventoryTobacco[]): BrandChipEntry[] => {
  const counts = new Map<string, number>();
  for (const item of catalog) {
    const manufacturer = item.manufacturer?.trim();
    if (!manufacturer) {
      continue;
    }
    counts.set(manufacturer, (counts.get(manufacturer) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0], 'ru');
    })
    .slice(0, BRAND_CHIPS_TOP_LIMIT)
    .map(([name, count]) => ({ name, count, short: buildBrandShort(name) }));
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
  const brandChips = buildBrandChips(catalogOptions);
  const brandChipsCountIsApproximate = catalogOptions.length < meta.totalItems;
  const brandChipsTooltip = brandChipsCountIsApproximate
    ? 'Счётчик показывает, сколько раз бренд встречается в загруженных позициях каталога (без учёта пагинации).'
    : 'Счётчик показывает, сколько позиций бренда в каталоге.';

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

  const stockFilterTabs: Array<{ value: InventoryStockFilter; label: string; count: number; ariaLabel: string }> = [
    { value: 'all', label: 'Все', count: meta.totalItems, ariaLabel: 'Фильтр: Все' },
    { value: 'in-stock', label: 'В наличии', count: meta.inStockCount, ariaLabel: 'Фильтр: В наличии' },
    { value: 'out-of-stock', label: 'Нет наличия', count: meta.outOfStockCount, ariaLabel: 'Фильтр: Нет наличия' },
  ];

  return (
    <section className="card inventory-panel">
      <MasterPageHeader
        eyebrow="ИНВЕНТАРИЗАЦИЯ"
        title="Табаки"
        subtitle="Наличие, компоненты миксов и связанные позиции витрины."
        actions={
          <Button type="button" size="sm" onClick={openCreateEditor}>
            Новый табак
          </Button>
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

      <div className="master-toolbar inventory-toolbar inventory-toolbar--row ops-toolbar">
        <label className="inventory-search">
          <span className="inventory-toolbar__label">Поиск</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Табак, производитель, вкус или зависимый микс"
          />
        </label>

        <div className="inventory-status-chips" role="group" aria-label="Фильтр по наличию">
          {stockFilterTabs.map((tab) => {
            const active = filters.stock === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                className={active ? 'chip-pill chip-pill--active' : 'chip-pill'}
                aria-pressed={active}
                aria-label={tab.ariaLabel}
                onClick={() => onStockChange(tab.value)}
              >
                <span className="chip-pill__label">{tab.label}</span>
                <span className="chip-pill__count">{formatMetricValue(tab.count)}</span>
              </button>
            );
          })}
        </div>

        <MasterSortPill
          ariaLabel="Сортировка инвентаря"
          value={composeSortKey(sort.field, sort.direction)}
          options={buildSortPillOptions(inventorySortFieldOptions, inventorySortDirectionOptions)}
          onChange={(key) => {
            const { field, direction } = parseSortKey<InventorySortField>(key);
            onSortFieldChange(field);
            onSortDirectionChange(direction as InventorySortDirection);
          }}
        />
      </div>

      {brandChips.length ? (
        <div className="inventory-brand-row" role="group" aria-label="Фильтр по бренду">
          <span className="inventory-brand-row__eyebrow">Бренд</span>
          <div className="inventory-brand-row__scroller">
            {brandChips.map(({ name, count, short }) => {
              const active = filters.manufacturers.includes(name);
              return (
                <button
                  key={`brand-chip:${name}`}
                  type="button"
                  className={`brand-chip${active ? ' brand-chip--active' : ''}`}
                  aria-pressed={active}
                  title={brandChipsTooltip}
                  onClick={() => onToggleFilterValue('manufacturers', name)}
                >
                  <span className="brand-chip__avatar" aria-hidden="true">
                    {short}
                  </span>
                  <span className="brand-chip__name">{name}</span>
                  <span className="brand-chip__count">{formatMetricValue(count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <SheetContent side="right" className="inventory-editor-sheet inventory-editor-drawer">
          <SheetHeader className="inventory-editor-drawer__head">
            <p className="eyebrow">
              {editorMode === 'edit' ? 'Редактирование' : 'Новый табак'}
            </p>
            <SheetTitle className="inventory-editor-drawer__title">
              {editorMode === 'edit'
                ? editorDraft.name.trim() || 'Без названия'
                : 'Добавить табак'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editorMode === 'edit'
                ? 'Обновите позицию каталога.'
                : 'Добавьте позицию в каталог.'}
            </SheetDescription>
          </SheetHeader>
          <article className="editor-card ops-editor inventory-create-card inventory-create-card--sheet">

          <form className="admin-form inventory-editor-form" onSubmit={(event) => void handleEditorSubmit(event)}>
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
                <div className="inventory-editor-identity__chips">
                  {STRENGTH_PRESETS.map((preset) => {
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
                  className="text-input text-input--lg"
                  value={editorDraft.name}
                  onChange={(event) => updateEditorDraft('name', event.target.value)}
                  placeholder="Например, Citrus Breeze"
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

              <label className="field field--wide">
                <span className="field-label">Вкусы · через запятую</span>
                <input
                  className="text-input"
                  value={editorDraft.flavors.join(', ')}
                  onChange={(event) =>
                    updateEditorDraft(
                      'flavors',
                      event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="лимон, мята, лайм"
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

              <details className="inventory-extra-filters inventory-editor-extra">
                <summary className="inventory-extra-filters__trigger">
                  Дополнительно
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

            {saveError ? <p className="error-text">{saveError}</p> : null}

            <div className="form-actions inventory-editor-foot">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saveStatus === 'loading'}
                onClick={closeEditor}
              >
                Отмена
              </Button>
              <Button type="submit" size="sm" disabled={saveStatus === 'loading'}>
                {saveStatus === 'loading' ? 'Сохраняем...' : editorMode === 'edit' ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
          </article>
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
        <table className="inventory-table inventory-table--redesign">
          <thead>
            <tr>
              <th className="inventory-table__brand" scope="col">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Выбрать все позиции"
                />
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
                  <tr key={item.id} data-active={isActive}>
                    <td className="inventory-table__brand">
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
                      <button
                        className="inventory-item-trigger"
                        type="button"
                        onClick={() => setActiveItemId((current) => (current === item.id ? '' : item.id))}
                        aria-expanded={isActive}
                      >
                        <div className="inventory-cell inventory-cell--primary">
                          <strong>{item.name}</strong>
                          <span className="inventory-cell__sub">
                            {strengthLabel}
                            {flavorsTop3 ? ` · ${flavorsTop3}` : ''}
                          </span>
                        </div>
                      </button>
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
                    <td className="inventory-table__stock">
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
                    <td className="inventory-table__actions">
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
