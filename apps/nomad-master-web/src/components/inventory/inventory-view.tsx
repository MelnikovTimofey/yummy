import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
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
  createStatus: 'idle' | 'loading' | 'ready' | 'error';
  createError: string;
  onCreateTobacco: (payload: InventoryCreateInput) => Promise<void>;
  onResetCreateFeedback: () => void;
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

const parseCommaSeparatedValues = (value: string) =>
  Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));

export type InventoryCreateInput = {
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

type InventoryCreateDraft = {
  manufacturer: string;
  lineName: string;
  name: string;
  description: string;
  country: string;
  officialStrength: string;
  communityStrength: string;
  productionStatus: string;
  flavorProfiles: string;
  flavors: string;
  flavorTags: string;
  inStock: boolean;
};

const emptyInventoryCreateDraft = (): InventoryCreateDraft => ({
  manufacturer: '',
  lineName: '',
  name: '',
  description: '',
  country: '',
  officialStrength: '',
  communityStrength: '',
  productionStatus: '',
  flavorProfiles: '',
  flavors: '',
  flavorTags: '',
  inStock: true,
});

export const InventoryView = ({
  items,
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
  createStatus,
  createError,
  onCreateTobacco,
  onResetCreateFeedback,
}: InventoryViewProps) => {
  const [activeItemId, setActiveItemId] = useState('');
  const [searchValue, setSearchValue] = useState(filters.search);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<InventoryCreateDraft>(emptyInventoryCreateDraft());
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const activeDialogTitleId = activeItem ? `inventory-detail-title-${activeItem.id}` : undefined;

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
    if (createStatus !== 'ready') {
      return;
    }

    setCreateDraft(emptyInventoryCreateDraft());
    setCreateOpen(false);
  }, [createStatus]);

  const updateCreateDraft = <Key extends keyof InventoryCreateDraft>(key: Key, value: InventoryCreateDraft[Key]) => {
    if (createError || createStatus !== 'idle') {
      onResetCreateFeedback();
    }

    setCreateDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onCreateTobacco({
      manufacturer: createDraft.manufacturer,
      lineName: createDraft.lineName,
      name: createDraft.name,
      description: createDraft.description,
      country: createDraft.country,
      officialStrength: createDraft.officialStrength,
      communityStrength: createDraft.communityStrength,
      productionStatus: createDraft.productionStatus,
      flavorProfiles: parseCommaSeparatedValues(createDraft.flavorProfiles),
      flavors: parseCommaSeparatedValues(createDraft.flavors),
      flavorTags: parseCommaSeparatedValues(createDraft.flavorTags),
      inStock: createDraft.inStock,
    });
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
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (createOpen) {
                setCreateDraft(emptyInventoryCreateDraft());
                setCreateOpen(false);
                onResetCreateFeedback();
                return;
              }

              onResetCreateFeedback();
              setCreateOpen(true);
            }}
          >
            {createOpen ? 'Скрыть форму' : 'Новый табак'}
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

      {createOpen ? (
        <article className="editor-card ops-editor inventory-create-card">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">Новый табак</p>
              <h3>{createDraft.name.trim() || 'Добавить позицию в каталог'}</h3>
            </div>
            <Badge variant={createDraft.inStock ? 'default' : 'secondary'}>
              {createDraft.inStock ? 'Сразу в наличии' : 'Сразу вне наличия'}
            </Badge>
          </div>

          <form className="admin-form" onSubmit={(event) => void handleCreateSubmit(event)}>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Производитель</span>
                <input
                  className="text-input"
                  value={createDraft.manufacturer}
                  onChange={(event) => updateCreateDraft('manufacturer', event.target.value)}
                  placeholder="Например, Black Burn"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={createDraft.name}
                  onChange={(event) => updateCreateDraft('name', event.target.value)}
                  placeholder="Например, Peach Rings"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Линейка</span>
                <input
                  className="text-input"
                  value={createDraft.lineName}
                  onChange={(event) => updateCreateDraft('lineName', event.target.value)}
                  placeholder="Например, Core"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Страна</span>
                <input
                  className="text-input"
                  value={createDraft.country}
                  onChange={(event) => updateCreateDraft('country', event.target.value)}
                  placeholder="Например, Россия"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Официальная крепость</span>
                <input
                  className="text-input"
                  value={createDraft.officialStrength}
                  onChange={(event) => updateCreateDraft('officialStrength', event.target.value)}
                  placeholder="Например, medium"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Комьюнити-крепость</span>
                <input
                  className="text-input"
                  value={createDraft.communityStrength}
                  onChange={(event) => updateCreateDraft('communityStrength', event.target.value)}
                  placeholder="Например, выше средней"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Статус производства</span>
                <input
                  className="text-input"
                  value={createDraft.productionStatus}
                  onChange={(event) => updateCreateDraft('productionStatus', event.target.value)}
                  placeholder="Например, в производстве"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Категории</span>
                <input
                  className="text-input"
                  value={createDraft.flavorProfiles}
                  onChange={(event) => updateCreateDraft('flavorProfiles', event.target.value)}
                  placeholder="sweet, fresh"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Вкусы</span>
                <input
                  className="text-input"
                  value={createDraft.flavors}
                  onChange={(event) => updateCreateDraft('flavors', event.target.value)}
                  placeholder="персик, кольца"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field">
                <span className="field-label">Мета-теги</span>
                <input
                  className="text-input"
                  value={createDraft.flavorTags}
                  onChange={(event) => updateCreateDraft('flavorTags', event.target.value)}
                  placeholder="fruity, candy"
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={createDraft.description}
                  onChange={(event) => updateCreateDraft('description', event.target.value)}
                  placeholder="Короткое описание табака для инвентаризации и каталога"
                  rows={3}
                  disabled={createStatus === 'loading'}
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={createDraft.inStock}
                  onChange={(event) => updateCreateDraft('inStock', event.target.checked)}
                  disabled={createStatus === 'loading'}
                />
                <span>Сразу отметить как «в наличии»</span>
              </label>
            </div>

            <p className="meta-line">
              Категории, вкусы и мета-теги вводятся через запятую. Для категорий используй ключи каталога, например `sweet`,
              `fresh`, `spicy`.
            </p>

            {createError ? <p className="error-text">{createError}</p> : null}

            <div className="form-actions">
              <Button type="submit" size="sm" disabled={createStatus === 'loading'}>
                {createStatus === 'loading' ? 'Сохраняем...' : 'Создать табак'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createStatus === 'loading'}
                onClick={() => {
                  setCreateDraft(emptyInventoryCreateDraft());
                  setCreateOpen(false);
                  onResetCreateFeedback();
                }}
              >
                Отмена
              </Button>
            </div>
          </form>
        </article>
      ) : null}

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
                        <strong>{formatMetricValue(item.dependentMixCount ?? 0)} микс.</strong>
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
                        <strong>
                          {formatMetricValue(item.dependentMixCount ?? 0)} всего / {formatMetricValue(item.blockedDependentMixCount ?? 0)}{' '}
                          блокируется
                        </strong>
                        <div className="inventory-cell__mixes">
                          {(item.dependentMixes ?? []).slice(0, 3).map((mix) => (
                            <button
                              className="inventory-mix-link"
                              key={`${item.id}:mix:${mix.id}`}
                              type="button"
                              onClick={() => onOpenMix(mix.id)}
                            >
                              {mix.name}
                              <span>{mix.guestVisible ? 'виден гостю' : 'заблокирован'}</span>
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
                      <Button
                        type="button"
                        size="sm"
                        variant={item.inStock ? 'secondary' : 'default'}
                        onClick={() => onToggleStock(item)}
                        disabled={pendingRowId === item.id || pendingBatchAction !== ''}
                      >
                        {pendingRowId === item.id ? 'Сохраняем...' : item.inStock ? 'Убрать' : 'Вернуть'}
                      </Button>
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
