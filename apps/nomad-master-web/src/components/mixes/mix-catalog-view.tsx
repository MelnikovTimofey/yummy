import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import type {
  MixFilterKey,
  MixListFilters,
  MixListMeta,
  MixListSort,
  MixRailFilter,
  MixRailMembership,
  MixRecord,
  MixSortDirection,
  MixSortField,
  MixStatusFilter,
} from '@/contracts';
import {
  formatFlavorProfileLabel,
  formatMetricValue,
  formatRailType,
  mixRailFilterOptions,
  mixSortDirectionOptions,
  mixSortFieldOptions,
} from '@/contracts';

export type MixEditorComponentInput = {
  key: string;
  tobaccoId: string;
  proportion: string;
};

export type MixEditorViewState = {
  id: string;
  name: string;
  description: string;
  components: MixEditorComponentInput[];
  available: boolean;
  railMemberships: MixRailMembership[];
};

export type MixCatalogMode = 'catalog' | 'create' | 'edit';

type MixCatalogViewProps = {
  items: MixRecord[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  filters: MixListFilters;
  meta: MixListMeta;
  sort: MixListSort;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: MixStatusFilter) => void;
  onRailStateChange: (value: MixRailFilter) => void;
  onSortFieldChange: (value: MixSortField) => void;
  onSortDirectionChange: (value: MixSortDirection) => void;
  onToggleFilterValue: (key: MixFilterKey, value: string) => void;
  onClearFilterGroup: (key: MixFilterKey) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onSelectMix: (mix: MixRecord) => void;
  onStartCreate: () => void;
};

// flavorProfiles вынесены из multi-select-фильтров — отдельная chip-полоса
// `mixes-profile-filter` сверху таблицы; остальные таксономии остаются как
// раскрывающиеся FilterMultiSelect.
const mixFilterGroups: Array<{ key: MixFilterKey; title: string }> = [
  { key: 'manufacturers', title: 'Производители компонентов' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

type MixStatusChip = {
  value: MixStatusFilter;
  label: string;
  count: number;
};

const formatMixUpdatedAt = (value?: string) => {
  if (!value) {
    return 'Нет даты';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Нет даты';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatFilterOptionLabel = (key: MixFilterKey, value: string) => {
  if (key === 'flavorProfiles') {
    return formatFlavorProfileLabel(value);
  }

  return value;
};

const renderMixStatus = (mix: Pick<MixRecord, 'available' | 'guestVisible'>) => {
  if (!mix.available) {
    return <Badge variant="secondary">Скрыт оператором</Badge>;
  }

  if (!mix.guestVisible) {
    return <Badge variant="outline">Заблокирован наличием</Badge>;
  }

  return <Badge>Виден гостю</Badge>;
};

export const MixCatalogView = ({
  items,
  status,
  error,
  filters,
  meta,
  sort,
  onSearchChange,
  onStatusChange,
  onRailStateChange,
  onSortFieldChange,
  onSortDirectionChange,
  onToggleFilterValue,
  onClearFilterGroup,
  onResetFilters,
  onPageChange,
  onSelectMix,
  onStartCreate,
}: MixCatalogViewProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);

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

  const statusChips: MixStatusChip[] = [
    { value: 'all', label: 'Все', count: meta.totalItems },
    { value: 'guest-visible', label: 'Видны', count: meta.guestVisibleCount },
    { value: 'hidden', label: 'Скрыты', count: meta.hiddenCount },
    { value: 'blocked', label: 'Заблокированы', count: meta.blockedCount },
  ];

  // Counts считаем по текущей странице items — глобальный per-profile-counter
  // потребует расширения MixListMeta на бэке; пока достаточно подсветить
  // распределение в видимой выборке. Options берём из backend-стороны, чтобы
  // чипы не исчезали при пустой странице.
  const profileChips = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((mix) => {
      mix.flavorProfiles.forEach((profile) => {
        counts.set(profile, (counts.get(profile) ?? 0) + 1);
      });
    });

    const known = new Set<string>(filters.options.flavorProfiles);
    filters.flavorProfiles.forEach((profile) => known.add(profile));
    counts.forEach((_, profile) => known.add(profile));

    return Array.from(known)
      .map((value) => ({ value, count: counts.get(value) ?? 0 }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return formatFlavorProfileLabel(a.value).localeCompare(formatFlavorProfileLabel(b.value), 'ru');
      })
      .slice(0, 8);
  }, [items, filters.options.flavorProfiles, filters.flavorProfiles]);

  return (
    <section className="card mixes-panel">
      <div className="section-head section-head--surface">
        <div className="ops-surface__intro">
          <p className="eyebrow">Менеджер миксов</p>
          <h2>Каталог миксов</h2>
        </div>
        <div className="section-actions">
          <Button type="button" size="sm" onClick={onStartCreate}>
            Новый микс
          </Button>
        </div>
      </div>

      <div className="mixes-panel__stats ops-surface__stats">
        <div className="mixes-stat ops-surface__stat">
          <span>Всего</span>
          <strong>{formatMetricValue(meta.totalItems)}</strong>
        </div>
        <div className="mixes-stat ops-surface__stat">
          <span>Видно гостю</span>
          <strong>{formatMetricValue(meta.guestVisibleCount)}</strong>
        </div>
        <div className="mixes-stat ops-surface__stat">
          <span>В рейлах</span>
          <strong>{formatMetricValue(meta.inRailsCount)}</strong>
        </div>
        <div className="mixes-stat ops-surface__stat">
          <span>Заблокировано</span>
          <strong>{formatMetricValue(meta.blockedCount)}</strong>
        </div>
      </div>

      {profileChips.length ? (
        <div className="mixes-profile-filter" role="group" aria-label="Фильтр по категориям">
          <span className="mixes-profile-filter__eyebrow">Категории</span>
          <div className="mixes-profile-filter__scroll">
            {profileChips.map((chip) => {
              const active = filters.flavorProfiles.includes(chip.value);
              return (
                <button
                  key={`profile-chip:${chip.value}`}
                  type="button"
                  className={
                    active
                      ? 'mixes-profile-chip mixes-profile-chip--active'
                      : 'mixes-profile-chip'
                  }
                  aria-pressed={active}
                  onClick={() => onToggleFilterValue('flavorProfiles', chip.value)}
                >
                  <span>{formatFlavorProfileLabel(chip.value)}</span>
                  <span className="mixes-profile-chip__count">{formatMetricValue(chip.count)}</span>
                </button>
              );
            })}
            {filters.flavorProfiles.length ? (
              <button
                type="button"
                className="mixes-profile-chip mixes-profile-chip--reset"
                onClick={() => onClearFilterGroup('flavorProfiles')}
              >
                Сбросить категории
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mixes-toolbar ops-toolbar">
        <label className="mixes-search">
          <span className="mixes-toolbar__label">Поиск</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Микс, описание, компонент, вкус или рейл"
          />
        </label>

        <div className="mixes-status-chips" role="group" aria-label="Фильтр по статусу">
          <span className="mixes-toolbar__label">Статус</span>
          <div className="mixes-status-chips__row">
            {statusChips.map((chip) => {
              const active = filters.status === chip.value;
              return (
                <button
                  key={`status-chip:${chip.value}`}
                  type="button"
                  className={active ? 'mixes-status-chip mixes-status-chip--active' : 'mixes-status-chip'}
                  aria-pressed={active}
                  onClick={() => onStatusChange(chip.value)}
                >
                  <span>{chip.label}</span>
                  <span className="mixes-status-chip__count">{formatMetricValue(chip.count)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="mixes-toolbar__control">
          <span className="mixes-toolbar__label">Участие в рейлах</span>
          <select value={filters.railState} onChange={(event) => onRailStateChange(event.target.value as MixRailFilter)}>
            {mixRailFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mixes-toolbar__control">
          <span className="mixes-toolbar__label">Сортировка</span>
          <select value={sort.field} onChange={(event) => onSortFieldChange(event.target.value as MixSortField)}>
            {mixSortFieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mixes-toolbar__control">
          <span className="mixes-toolbar__label">Порядок</span>
          <select value={sort.direction} onChange={(event) => onSortDirectionChange(event.target.value as MixSortDirection)}>
            {mixSortDirectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button className="mixes-toolbar__reset" type="button" variant="outline" size="sm" onClick={onResetFilters}>
          Сбросить
        </Button>
      </div>

      <div className="mixes-filter-groups ops-filter-groups">
        {mixFilterGroups.map((group) => {
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

      {status === 'loading' ? <p className="meta-line">Загружаем каталог миксов...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="mixes-table-shell ops-table-shell">
        <table className="mixes-table">
          <thead>
            <tr>
              <th>Микс</th>
              <th>Компоненты</th>
              <th>Вкусовой профиль</th>
              <th>Рейлы</th>
              <th>Статус</th>
              <th>Метрики</th>
              <th className="mixes-table__actions">Действие</th>
            </tr>
          </thead>
          <tbody>
            {items.map((mix) => (
              <tr key={mix.id}>
                <td>
                  <div className="mixes-cell">
                    <strong>{mix.name}</strong>
                    <span>{mix.description || 'Без описания'}</span>
                    <span>Обновлено: {formatMixUpdatedAt(mix.updatedAt)}</span>
                  </div>
                </td>
                <td>
                  <div className="mixes-cell mixes-cell__stack">
                    {mix.components.map((component) => (
                      <div className="mixes-component-chip" key={`${mix.id}:${component.tobaccoId}:${component.sortOrder}`}>
                        <strong>{component.name}</strong>
                        <span>
                          {component.manufacturer} · {component.proportion}%
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="mixes-cell mixes-cell__chips">
                    {mix.flavorProfiles.map((profile) => (
                      <Badge key={`${mix.id}:profile:${profile}`} variant="secondary">
                        {formatFlavorProfileLabel(profile)}
                      </Badge>
                    ))}
                    {mix.flavors.map((flavor) => (
                      <Badge key={`${mix.id}:flavor:${flavor}`} variant="outline">
                        {flavor}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="mixes-cell mixes-cell__stack">
                    {mix.railMemberships.length ? (
                      mix.railMemberships.map((membership) => (
                        <div className="mixes-rail-chip" key={`${mix.id}:${membership.id}`}>
                          <strong>{membership.name}</strong>
                          <span>
                            {formatRailType(membership.type)} · {membership.active ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span>Пока не входит ни в один рейл</span>
                    )}
                  </div>
                </td>
                <td>{renderMixStatus(mix)}</td>
                <td>
                  <div className="mixes-cell">
                    <strong>Популярность {formatMetricValue(mix.popularity)}</strong>
                    <span>
                      Рейтинг {mix.avgRating.toFixed(1)} · Оценок {formatMetricValue(mix.ratingsCount)}
                    </span>
                    <span>Рейлов: {formatMetricValue(mix.railCount)}</span>
                  </div>
                </td>
                <td className="mixes-table__actions">
                  <Button type="button" variant="outline" size="sm" onClick={() => onSelectMix(mix)}>
                    Редактировать
                  </Button>
                </td>
              </tr>
            ))}
            {!items.length && status !== 'loading' ? (
              <tr>
                <td className="mixes-table__empty" colSpan={7}>
                  По текущим фильтрам миксов нет.
                </td>
              </tr>
            ) : null}
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
    </section>
  );
};
