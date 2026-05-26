import { useEffect, useMemo, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import { colorForTobacco } from '@/components/mixes/mix-builder/color-for-tobacco';
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
    return <Badge variant="destructive">Блокирован</Badge>;
  }

  if (!mix.guestVisible) {
    return <Badge variant="secondary">Скрыт</Badge>;
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
      <MasterPageHeader
        eyebrow="МЕНЕДЖЕР МИКСОВ"
        title="Каталог миксов"
        subtitle="Подборки для гостевой витрины — поиск, фильтры, быстрые действия."
        actions={
          <>
            <Button type="button" size="sm" variant="outline" disabled title="В разработке">
              <Bookmark aria-hidden />
              Сохранённые виды
            </Button>
            <Button type="button" size="sm" onClick={onStartCreate}>
              Новый микс
            </Button>
          </>
        }
      />

      <MasterStatsRow
        tiles={[
          {
            label: 'Всего',
            value: formatMetricValue(meta.totalItems),
            hint: 'в каталоге',
          },
          {
            label: 'Видно гостю',
            value: formatMetricValue(meta.guestVisibleCount),
            hint: 'сейчас на витрине',
            tone: 'success',
          },
          {
            label: 'В рейлах',
            value: formatMetricValue(meta.inRailsCount),
            hint: 'опубликованы в подборках',
          },
          {
            label: 'Заблокировано',
            value: formatMetricValue(meta.blockedCount),
            hint: 'режет наличие табака',
            tone: 'warning',
          },
        ]}
      />

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

      {!items.length && status !== 'loading' ? (
        <div className="mixes-empty">
          <p className="mixes-empty__eyebrow">Пока пусто</p>
          <p className="mixes-empty__title">По текущим фильтрам миксов нет</p>
          <p className="mixes-empty__hint">
            Очистите фильтры или создайте первый микс — это самый быстрый способ оживить
            витрину гостя.
          </p>
          <Button type="button" onClick={onStartCreate}>
            Новый микс
          </Button>
        </div>
      ) : (
        <div className="mixes-table-shell ops-table-shell">
          <table className="mixes-table">
            <thead>
              <tr>
                <th scope="col">Микс</th>
                <th scope="col">Состав</th>
                <th scope="col">Профиль</th>
                <th scope="col">Статус</th>
                <th scope="col">Метрики</th>
                <th scope="col" className="mixes-table__actions-col">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((mix) => {
                const totalProportion = mix.components.reduce(
                  (sum, component) => sum + component.proportion,
                  0,
                );
                const visibleProfiles = mix.flavorProfiles.slice(0, 3);
                const profileOverflow = mix.flavorProfiles.length - visibleProfiles.length;
                return (
                  <tr key={mix.id} data-blocked={!mix.available || undefined} data-hidden={mix.available && !mix.guestVisible ? true : undefined}>
                    <td>
                      <div className="mixes-cell">
                        <strong>{mix.name}</strong>
                        {mix.description ? <span>{mix.description}</span> : null}
                        <span className="mixes-cell__updated">
                          Обновлено: {formatMixUpdatedAt(mix.updatedAt)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="mixes-cell mixes-cell__components">
                        <div className="mixes-cell__pills" aria-hidden="true">
                          {mix.components.map((component) => {
                            const color = colorForTobacco(component.tobaccoId);
                            return (
                              <span
                                key={`${mix.id}:${component.tobaccoId}:${component.sortOrder}:pill`}
                                className="mixes-cell__pill"
                                style={{
                                  background: color.soft,
                                  borderColor: color.border,
                                  color: color.text,
                                }}
                                title={`${component.manufacturer} · ${component.name}`}
                              >
                                {component.manufacturer.slice(0, 2).toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                        <span className="mixes-cell__component-line">
                          {mix.components
                            .map((component) => {
                              const ratio = totalProportion > 0
                                ? Math.round((component.proportion / totalProportion) * 100)
                                : Math.round(100 / mix.components.length);
                              return `${component.name} ${ratio}%`;
                            })
                            .join(' + ')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="mixes-cell mixes-cell__chips">
                        {visibleProfiles.map((profile) => (
                          <Badge key={`${mix.id}:profile:${profile}`} variant="secondary">
                            {formatFlavorProfileLabel(profile)}
                          </Badge>
                        ))}
                        {profileOverflow > 0 ? (
                          <Badge variant="outline">+{profileOverflow}</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td>{renderMixStatus(mix)}</td>
                    <td>
                      <div className="mixes-cell mixes-cell__metrics">
                        <span className="mixes-cell__metric" title="Популярность микса">
                          <span aria-hidden="true">🔥</span> {formatMetricValue(mix.popularity)}
                        </span>
                        <span className="mixes-cell__metric" title="Средний рейтинг гостей">
                          <span aria-hidden="true">★</span> {mix.avgRating.toFixed(1)}
                          {mix.ratingsCount > 0 ? (
                            <span className="mixes-cell__metric-meta">
                              ({formatMetricValue(mix.ratingsCount)})
                            </span>
                          ) : null}
                        </span>
                        <span className="mixes-cell__metric mixes-cell__metric--rails" title={
                          mix.railMemberships.length
                            ? mix.railMemberships.map((membership) => membership.name).join(', ')
                            : 'Пока не входит ни в один рейл'
                        }>
                          В рейлах: {formatMetricValue(mix.railCount)}
                        </span>
                      </div>
                    </td>
                    <td className="mixes-table__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectMix(mix)}
                      >
                        Открыть
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
