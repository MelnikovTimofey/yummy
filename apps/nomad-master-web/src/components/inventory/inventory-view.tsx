import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onResetFilters: () => void;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleStock: (item: InventoryTobacco) => void;
  onRunBatchAction: (action: Exclude<InventoryBatchAction, 'archive'>) => void;
  onOpenMix: (mixId: string) => void;
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
  onResetFilters,
  onToggleSelection,
  onToggleSelectAll,
  onToggleStock,
  onRunBatchAction,
  onOpenMix,
}: InventoryViewProps) => {
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  return (
    <section className="card inventory-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Инвентаризация</p>
          <h2>Таблица остатков и зависимых миксов</h2>
          <p className="meta-line">
            Table-first режим для ежедневной работы: фильтры, batch действия и быстрый переход к миксам, которые зависят от
            наличия табака.
          </p>
        </div>
        <div className="inventory-panel__stats">
          <div className="inventory-stat">
            <span>Показано</span>
            <strong>{formatMetricValue(meta.filteredItems)}</strong>
          </div>
          <div className="inventory-stat">
            <span>В наличии</span>
            <strong>{formatMetricValue(meta.inStockCount)}</strong>
          </div>
          <div className="inventory-stat">
            <span>Нет наличия</span>
            <strong>{formatMetricValue(meta.outOfStockCount)}</strong>
          </div>
        </div>
      </div>

      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span className="inventory-toolbar__label">Поиск</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
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

      <div className="inventory-filter-groups">
        {filterGroups.map((group) => {
          const options = filters.options[group.key];
          const selected = filters[group.key];

          if (!options.length) {
            return null;
          }

          return (
            <div className="inventory-filter-group" key={group.key}>
              <p className="inventory-filter-group__title">{group.title}</p>
              <div className="inventory-filter-group__chips">
                {options.map((option) => {
                  const active = selected.includes(option);
                  return (
                    <Button
                      key={`${group.key}:${option}`}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onToggleFilterValue(group.key, option)}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedIds.length ? (
        <div className="inventory-batch-bar">
          <div>
            <p className="inventory-batch-bar__title">Выбрано позиций: {formatMetricValue(selectedIds.length)}</p>
            <p className="meta-line">
              Batch stock actions не меняют product semantics. Архивирование остаётся заблокированным до отдельного contract
              decision.
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
            <Button type="button" size="sm" variant="outline" disabled title="Ждёт product-approved contract">
              Архивировать позже
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'loading' ? <p className="meta-line">Загружаем inventory table...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="inventory-table-shell">
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
              items.map((item) => (
                <tr key={item.id}>
                  <td className="inventory-table__check">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => onToggleSelection(item.id)}
                      aria-label={`Выбрать ${item.name}`}
                    />
                  </td>
                  <td>
                    <div className="inventory-cell">
                      <strong>{item.name}</strong>
                      <span>{item.manufacturer}</span>
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
                  </td>
                  <td>
                    <div className="inventory-cell">
                      <strong>{formatMetricValue(item.dependentMixCount ?? 0)} микс.</strong>
                      <div className="inventory-cell__chips">
                        {(item.flavorProfiles ?? []).map((profile) => (
                          <Badge key={`${item.id}:profile:${profile}`} variant="outline">
                            {profile}
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
                            <span>{mix.guestVisible ? 'guest ok' : 'blocked'}</span>
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
              ))
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
    </section>
  );
};
