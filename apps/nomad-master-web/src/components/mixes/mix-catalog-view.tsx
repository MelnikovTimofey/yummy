import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Copy, Eye, EyeOff, ListFilter, Pencil, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterSortPill } from '@/components/shell/master-sort-pill';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import {
  buildSortPillOptions,
  composeSortKey,
  parseSortKey,
} from '@/components/shell/master-sort-pill.helpers';
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
  onCopyMix: (mix: MixRecord) => void;
  onToggleMixAvailable: (mix: MixRecord) => void;
  rowPendingId?: string;
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

const brandShort = (manufacturer: string) =>
  manufacturer
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '·';

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

  return <Badge>Виден</Badge>;
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
  onCopyMix,
  onToggleMixAvailable,
  rowPendingId = '',
}: MixCatalogViewProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [extendedOpen, setExtendedOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    { value: 'guest-visible', label: 'Виден гостю', count: meta.guestVisibleCount },
    { value: 'hidden', label: 'Скрыт', count: meta.hiddenCount },
    { value: 'blocked', label: 'Блокирован', count: meta.blockedCount },
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

      <div className="mixes-toolbar mixes-toolbar--bar ops-toolbar">
        <label className="mixes-search mixes-search--inline">
          <span className="sr-only">Поиск</span>
          <Search aria-hidden="true" className="mixes-search__icon" size={16} />
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Микс, табак, вкус…"
          />
          <kbd className="mixes-search__kbd" aria-hidden="true">/</kbd>
        </label>

        <div className="mixes-status-chips mixes-status-chips--inline" role="group" aria-label="Фильтр по статусу">
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
                {active ? <span className="mixes-status-chip__divider" aria-hidden="true">|</span> : null}
                <span className="mixes-status-chip__count">{formatMetricValue(chip.count)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={
            extendedOpen
              ? 'mixes-filter-toggle mixes-filter-toggle--active'
              : 'mixes-filter-toggle'
          }
          aria-pressed={extendedOpen}
          aria-expanded={extendedOpen}
          aria-controls="mixes-extended-filter"
          title="Расширенный фильтр"
          onClick={() => setExtendedOpen((value) => !value)}
        >
          <ListFilter size={16} aria-hidden="true" />
          <span className="sr-only">Расширенный фильтр</span>
        </button>

        <MasterSortPill
          ariaLabel="Сортировка миксов"
          value={composeSortKey(sort.field, sort.direction)}
          options={buildSortPillOptions(mixSortFieldOptions, mixSortDirectionOptions)}
          onChange={(key) => {
            const { field, direction } = parseSortKey<MixSortField>(key);
            onSortFieldChange(field);
            onSortDirectionChange(direction as MixSortDirection);
          }}
        />
      </div>

      {profileChips.length ? (
        <div className="mixes-profile-filter" role="group" aria-label="Фильтр по категориям">
          <span className="mixes-profile-filter__eyebrow">Профиль</span>
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

      <details
        id="mixes-extended-filter"
        className="master-filter-details"
        open={extendedOpen}
        onToggle={(event) => setExtendedOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="master-filter-details__summary">
          Расширенный фильтр
          <ChevronDown aria-hidden="true" className="master-filter-details__chevron" />
        </summary>
        <div className="master-filter-details__body">
          <label className="mixes-toolbar__control">
            <span className="mixes-toolbar__label">Участие в рейлах</span>
            <select
              value={filters.railState}
              onChange={(event) => onRailStateChange(event.target.value as MixRailFilter)}
            >
              {mixRailFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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
        </div>
      </details>

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
                const visibleProfiles = mix.flavorProfiles.slice(0, 3);
                const profileOverflow = mix.flavorProfiles.length - visibleProfiles.length;
                const ratioLabel = mix.components.length
                  ? mix.components.map((component) => component.proportion).join('/')
                  : '';
                const rowBusy = rowPendingId === mix.id;
                return (
                  <tr
                    key={mix.id}
                    data-blocked={!mix.available || undefined}
                    data-hidden={mix.available && !mix.guestVisible ? true : undefined}
                    className="mixes-table__row"
                    onClick={() => onSelectMix(mix)}
                  >
                    <td>
                      <div className="mixes-cell">
                        <div className="mixes-cell__title">
                          <strong>{mix.name}</strong>
                          {ratioLabel ? (
                            <span className="mixes-cell__ratio" aria-hidden="true">
                              {ratioLabel}
                            </span>
                          ) : null}
                        </div>
                        {mix.description ? <span>{mix.description}</span> : null}
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
                                {brandShort(component.manufacturer)}
                              </span>
                            );
                          })}
                        </div>
                        <span className="mixes-cell__component-line">
                          {mix.components.map((component) => component.name).join(' + ')}
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
                      </div>
                    </td>
                    <td
                      className="mixes-table__actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="mixes-row-actions">
                        <button
                          type="button"
                          className="mixes-row-actions__btn"
                          title="Редактировать"
                          aria-label={`Открыть ${mix.name}`}
                          onClick={() => onSelectMix(mix)}
                          disabled={rowBusy}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="mixes-row-actions__btn"
                          title="Дублировать"
                          aria-label={`Дублировать ${mix.name}`}
                          onClick={() => onCopyMix(mix)}
                          disabled={rowBusy}
                        >
                          <Copy size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="mixes-row-actions__btn"
                          title={mix.available ? 'Скрыть с витрины' : 'Вернуть на витрину'}
                          aria-label={
                            mix.available
                              ? `Скрыть ${mix.name} с витрины`
                              : `Вернуть ${mix.name} на витрину`
                          }
                          onClick={() => onToggleMixAvailable(mix)}
                          disabled={rowBusy}
                        >
                          {mix.available ? (
                            <EyeOff size={14} aria-hidden="true" />
                          ) : (
                            <Eye size={14} aria-hidden="true" />
                          )}
                        </button>
                      </div>
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
