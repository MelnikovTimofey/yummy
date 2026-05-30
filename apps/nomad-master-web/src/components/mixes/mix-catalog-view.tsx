import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import { MasterPageHeader } from '@/components/shell/master-page-header';
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
  onDeleteMix: (mix: MixRecord) => void;
  rowPendingId?: string;
};

// flavorProfiles вынесены из multi-select-фильтров — отдельная chip-полоса
// внутри .mixes-list; остальные таксономии — в свёрнутом details «Доп. фильтры».
const mixFilterGroups: Array<{ key: MixFilterKey; title: string }> = [
  { key: 'manufacturers', title: 'Производители компонентов' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

type MixStatusChip = {
  value: MixStatusFilter;
  label: string;
  ariaLabel: string;
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
    return (
      <span className="tag" data-tone="danger">
        Блокирован
      </span>
    );
  }

  if (!mix.guestVisible) {
    return <span className="tag">Скрыт</span>;
  }

  return (
    <span className="tag" data-tone="success">
      Виден
    </span>
  );
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
  onResetFilters: _onResetFilters,
  onPageChange,
  onSelectMix,
  onStartCreate,
  onCopyMix,
  onToggleMixAvailable,
  onDeleteMix,
  rowPendingId = '',
}: MixCatalogViewProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [mixPendingDelete, setMixPendingDelete] = useState<MixRecord | null>(null);
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
    { value: 'all', label: 'Все', ariaLabel: 'Фильтр: Все', count: meta.totalItems },
    { value: 'guest-visible', label: 'Виден гостю', ariaLabel: 'Фильтр: Виден гостю', count: meta.guestVisibleCount },
    { value: 'hidden', label: 'Скрыт', ariaLabel: 'Фильтр: Скрыт', count: meta.hiddenCount },
    { value: 'blocked', label: 'Блокирован', ariaLabel: 'Фильтр: Блокирован', count: meta.blockedCount },
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

  const extraFilterGroupsAvailable = mixFilterGroups.some(
    (group) => filters.options[group.key].length,
  );
  const extraFilterSelectionCount = mixFilterGroups.reduce(
    (acc, group) => acc + filters[group.key].length,
    0,
  );

  return (
    <section className="mixes-page">
      <MasterPageHeader
        eyebrow="Менеджер миксов"
        title="Каталог миксов"
        subtitle="Подборки для гостевой витрины — поиск, фильтры, быстрые действия."
        actions={
          <>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              disabled
              title="В разработке"
            >
              <Bookmark size={14} aria-hidden />
              Сохранённые виды
            </button>
            <button
              type="button"
              className="btn"
              data-variant="primary"
              onClick={onStartCreate}
            >
              <Plus size={14} aria-hidden />
              Новый микс
            </button>
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

      <div className="mixes-list">
        <div className="mixes-list__toolbar">
          <div className="input mixes-list__search">
            <Search size={14} aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Микс, табак, вкус…"
            />
            <kbd className="mixes-list__kbd" aria-hidden="true">/</kbd>
          </div>

          <div className="mixes-list__filters" role="group" aria-label="Фильтр по статусу">
            {statusChips.map((chip) => {
              const active = filters.status === chip.value;
              return (
                <button
                  key={`status-chip:${chip.value}`}
                  type="button"
                  className={`filter-chip${active ? ' filter-chip--active' : ''}`}
                  aria-pressed={active}
                  aria-label={chip.ariaLabel}
                  onClick={() => onStatusChange(chip.value)}
                >
                  <span>{chip.label}</span>
                  <span className="filter-chip__count">{formatMetricValue(chip.count)}</span>
                </button>
              );
            })}
          </div>

          <span className="mixes-list__sep" aria-hidden />

          <label className="mixes-list__sort">
            <ChevronDown size={12} aria-hidden />
            <select
              aria-label="Сортировка миксов"
              value={composeSortKey(sort.field, sort.direction)}
              onChange={(event) => {
                const { field, direction } = parseSortKey<MixSortField>(event.target.value);
                onSortFieldChange(field);
                onSortDirectionChange(direction as MixSortDirection);
              }}
            >
              {buildSortPillOptions(mixSortFieldOptions, mixSortDirectionOptions).map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {profileChips.length ? (
          <div className="mixes-list__profiles" role="group" aria-label="Фильтр по категориям">
            <span className="mixes-list__profiles-label">Профиль</span>
            {profileChips.map((chip) => {
              const active = filters.flavorProfiles.includes(chip.value);
              return (
                <button
                  key={`profile-chip:${chip.value}`}
                  type="button"
                  className={`filter-chip${active ? ' filter-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onToggleFilterValue('flavorProfiles', chip.value)}
                >
                  <span>{formatFlavorProfileLabel(chip.value)}</span>
                  <span className="filter-chip__count">{formatMetricValue(chip.count)}</span>
                </button>
              );
            })}
            {filters.flavorProfiles.length ? (
              <button
                type="button"
                className="filter-chip mixes-list__profiles-reset"
                onClick={() => onClearFilterGroup('flavorProfiles')}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        ) : null}

        {extraFilterGroupsAvailable ? (
          <details className="inventory-extra-filters">
            <summary className="inventory-extra-filters__trigger">
              Доп. фильтры
              <span className="inventory-extra-filters__count" aria-hidden="true">
                {formatMetricValue(extraFilterSelectionCount)}
              </span>
            </summary>
            <div className="inventory-filter-groups ops-filter-groups">
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
          </details>
        ) : null}

        {!items.length && status !== 'loading' ? (
          <div className="mixes-empty">
            <p className="mixes-empty__eyebrow">Пока пусто</p>
            <p className="mixes-empty__title">По текущим фильтрам миксов нет</p>
            <p className="mixes-empty__hint">
              Очистите фильтры или создайте первый микс — это самый быстрый способ оживить
              витрину гостя.
            </p>
            <button
              type="button"
              className="btn"
              data-variant="primary"
              onClick={onStartCreate}
            >
              <Plus size={14} aria-hidden />
              Новый микс
            </button>
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
                            <span
                              key={`${mix.id}:profile:${profile}`}
                              className="tag"
                              data-tone="accent"
                            >
                              {formatFlavorProfileLabel(profile)}
                            </span>
                          ))}
                          {profileOverflow > 0 ? (
                            <span className="tag tag--ghost">+{profileOverflow}</span>
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
                          <button
                            type="button"
                            className="mixes-row-actions__btn mixes-row-actions__btn--danger"
                            title="Удалить"
                            aria-label={`Удалить ${mix.name}`}
                            onClick={() => setMixPendingDelete(mix)}
                            disabled={rowBusy}
                          >
                            <Trash2 size={14} aria-hidden="true" />
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
      </div>

      {status === 'loading' ? <p className="meta-line">Загружаем каталог миксов...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <ListPagination
        page={meta.page}
        pageSize={meta.pageSize}
        totalPages={meta.totalPages}
        filteredItems={meta.filteredItems}
        onPageChange={onPageChange}
      />

      <Dialog open={mixPendingDelete !== null} onOpenChange={(next) => { if (!next) setMixPendingDelete(null); }}>
        <DialogContent showCloseButton={false} className="mix-delete-dialog">
          <DialogHeader>
            <DialogTitle>Удалить микс «{mixPendingDelete?.name}»?</DialogTitle>
            <DialogDescription>
              {mixPendingDelete && mixPendingDelete.railMemberships.length > 0 ? (
                <>
                  Микс участвует в рейлах:{' '}
                  {mixPendingDelete.railMemberships.map((rail) => rail.name).join(', ')}. После
                  удаления он будет убран из этих рейлов. Действие необратимо.
                </>
              ) : (
                <>Микс будет удалён без возможности восстановления. Действие необратимо.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (mixPendingDelete) {
                  onDeleteMix(mixPendingDelete);
                }
                setMixPendingDelete(null);
              }}
            >
              Удалить микс
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
