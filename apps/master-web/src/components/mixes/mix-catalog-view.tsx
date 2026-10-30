import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
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
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AttributeFilter, FilterChip, FilterReset, FiltersButton, SheetChoice, SortPill } from '@/components/ui/filter-bar';
import { ListPagination } from '@/components/ui/list-pagination';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { SortableHeader } from '@/components/shell/sortable-header';
import { ProfileTag } from '@/components/ui/profile-tag';
import type {
  MixFilterKey,
  MixListFilters,
  MixListMeta,
  MixListSort,
  MixRailFilter,
  MixRailMembership,
  MixRecord,
  MixStatusFilter,
} from '@/contracts';
import {
  formatFlavorProfileLabel,
  formatMetricValue,
  defaultMixListResponse,
  formatCount,
  formatRating,
  resolveMixStatus,
} from '@/contracts';
import { RowsSkeleton } from '@/components/ui/loading';
import { useIsPhone } from '@/hooks/use-is-phone';
import {
  MIX_SORTS,
  MIX_STATUS_CHIPS,
  applyAttributeChange,
  mixStatusCount,
  pickSort,
  sortPillOptions,
} from '@/lib/list-filters';

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
  onSortChange: (value: MixListSort) => void;
  onToggleFilterValue: (key: MixFilterKey, value: string) => void;
  onClearFilterGroup: (key: MixFilterKey) => void;
  onPageChange: (page: number) => void;
  onSelectMix: (mix: MixRecord) => void;
  onStartCreate: () => void;
  onCopyMix: (mix: MixRecord) => void;
  onToggleMixAvailable: (mix: MixRecord) => void;
  onDeleteMix: (mix: MixRecord) => void;
  rowPendingId?: string;
};

const filterKeys: MixFilterKey[] = ['flavorProfiles', 'manufacturers', 'flavors', 'flavorTags'];

const railLabels: Record<string, string> = { 'in-rails': 'В рейлах', 'without-rails': 'Не в рейлах' };

const byProfileLabel = (left: string, right: string) =>
  formatFlavorProfileLabel(left).localeCompare(formatFlavorProfileLabel(right), 'ru');

const renderMixStatus = (mix: Pick<MixRecord, 'available' | 'guestVisible'>) => {
  const status = resolveMixStatus(mix);

  if (status === 'blocked') {
    return (
      <span className="tag" data-tone="warning">
        блокирован
      </span>
    );
  }

  if (status === 'hidden') {
    return <span className="tag tag--ghost">скрыт</span>;
  }

  return <span className="tag">виден</span>;
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
  onSortChange,
  onToggleFilterValue,
  onClearFilterGroup,
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

  const isPhone = useIsPhone();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const changeSort = (field: MixListSort['field']) => {
    const next = pickSort(MIX_SORTS, sort, field);
    if (next !== sort) onSortChange(next);
  };
  // Фильтры серверные: список отдаёт новый набор, сервер принимает toggle или clear.
  const attribute = (key: MixFilterKey, title: string, options: string[], formatOption?: (value: string) => string) => ({
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
    attribute('flavorProfiles', 'Профиль', [...filters.options.flavorProfiles].sort(byProfileLabel), formatFlavorProfileLabel),
    {
      title: 'Рейлы',
      options: ['in-rails', 'without-rails'],
      selected: filters.railState === 'all' ? [] : [filters.railState],
      formatOption: (value: string) => railLabels[value] ?? value,
      single: true,
      onChange: ([next]: string[]) => onRailStateChange((next ?? 'all') as MixRailFilter),
    },
    attribute('manufacturers', 'Бренды', filters.options.manufacturers),
    attribute('flavors', 'Вкусы', filters.options.flavors),
    attribute('flavorTags', 'Мета-теги', filters.options.flavorTags),
  ];
  const activeAttributes =
    filterKeys.reduce((acc, key) => acc + filters[key].length, 0) + Number(filters.railState !== 'all');
  const narrowed = activeAttributes > 0 || filters.status !== 'all';
  const filtersActive = Boolean(filters.search) || narrowed;

  const clearAttributes = () => {
    if (filters.railState !== 'all') onRailStateChange('all');
    filterKeys.forEach((key) => filters[key].length && onClearFilterGroup(key));
  };
  const resetFilters = () => {
    if (filters.status !== 'all') onStatusChange('all');
    clearAttributes();
  };
  const resetAll = () => {
    setSearchValue('');
    onSearchChange('');
    resetFilters();
  };

  const statusChip = ([key, label]: [MixStatusFilter, string]) => (
    <FilterChip
      key={key}
      active={filters.status === key}
      count={mixStatusCount(meta, key)}
      label={`Фильтр: ${label}`}
      onClick={() => onStatusChange(key)}
    >
      {label}
    </FilterChip>
  );
  const searchInput = (
    <input
      ref={searchInputRef}
      type="search"
      enterKeyHint="search"
      aria-label="Поиск миксов"
      placeholder="Микс или табак"
      title="Клавиша /"
      value={searchValue}
      onChange={(event) => setSearchValue(event.target.value)}
    />
  );

  const sortHeaderProps = {
    sort,
    fallback: defaultMixListResponse.sort,
    onSortChange,
  };

  return (
    <section className="mixes-page">
      <MasterPageHeader
        title="Каталог миксов"
        meta={`${formatCount(meta.totalItems, ['микс', 'микса', 'миксов'])}, ${formatMetricValue(meta.inRailsCount)} в рейлах`}
        actions={
          <button
            type="button"
            className="btn"
            data-variant="primary"
            onClick={onStartCreate}
          >
            <Plus size={14} aria-hidden />
            Новый микс
          </button>
        }
      />

      {isPhone ? (
        <>
          <div className="m-list-search">
            <div className="input m-list-search__field">
              <Search size={16} aria-hidden />
              {searchInput}
            </div>
            <FiltersButton count={activeAttributes} open={filtersOpen} onClick={() => setFiltersOpen(true)} />
          </div>
          <div className="m-list-chips" role="group" aria-label="Статус микса">
            {MIX_STATUS_CHIPS.map(statusChip)}
          </div>
        </>
      ) : (
        <div className="filter-bar">
          <div className="filter-bar__row">
            <div className="input filter-bar__search">
              <Search size={14} aria-hidden />
              {searchInput}
            </div>
            <div className="filter-bar__chips" role="group" aria-label="Статус микса">
              {MIX_STATUS_CHIPS.map(statusChip)}
            </div>
          </div>
          <div className="filter-bar__row">
            <div className="filter-bar__chips" role="group" aria-label="Фильтры миксов">
              {attributes.map((item) => (
                <AttributeFilter key={item.title} {...item} />
              ))}
              {narrowed ? <FilterReset onClick={resetFilters} /> : null}
            </div>
            <SortPill value={sort.field} options={sortPillOptions(MIX_SORTS)} onChange={changeSort} />
          </div>
        </div>
      )}

      {isPhone && filtersOpen ? (
        <BottomSheet label="Фильтры миксов" onClose={() => setFiltersOpen(false)} className="m-filters-sheet">
          <h2 className="m-filters-sheet__title">Фильтры</h2>
          <SheetChoice
            title="Сортировка"
            options={MIX_SORTS.map((option) => option.field)}
            selected={[sort.field]}
            formatOption={(field) => MIX_SORTS.find((option) => option.field === field)?.label ?? field}
            single
            onChange={([next]) => next && changeSort(next as MixListSort['field'])}
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

      <div className="mixes-list">
        {!items.length && status !== 'loading' ? (
          <div className="empty list-empty">
            {filtersActive ? (
              <>
                <p>Уберите один из фильтров.</p>
                <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={resetAll}>
                  Сбросить фильтры
                </button>
              </>
            ) : (
              <p>Миксов пока нет.</p>
            )}
          </div>
        ) : (
          <div className="mixes-table-shell ops-table-shell">
            <table className="mixes-table">
              <thead>
                <tr>
                  <SortableHeader
                    label="Микс"
                    field="name"
                    initialDirection="asc"
                    directionLabels={{ asc: 'А → Я', desc: 'Я → А' }}
                    {...sortHeaderProps}
                  />
                  <th scope="col">Состав</th>
                  <th scope="col">Профиль</th>
                  <th scope="col">Статус</th>
                  <SortableHeader
                    label="Выборы"
                    field="demand"
                    initialDirection="desc"
                    directionLabels={{ desc: 'чаще выбирают', asc: 'реже выбирают' }}
                    className="mixes-table__metric-col"
                    {...sortHeaderProps}
                  />
                  <SortableHeader
                    label="Рейтинг"
                    field="avgRating"
                    initialDirection="desc"
                    directionLabels={{ desc: 'выше рейтинг', asc: 'ниже рейтинг' }}
                    className="mixes-table__metric-col"
                    {...sortHeaderProps}
                  />
                  <th scope="col" className="mixes-table__actions-col">
                    <span className="sr-only">Действия</span>
                  </th>
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
                      data-blocked={resolveMixStatus(mix) === 'blocked' || undefined}
                      data-hidden={resolveMixStatus(mix) === 'hidden' || undefined}
                      // Якорь для smoke — см. inventory-view (#27).
                      data-mix-id={mix.id}
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
                          <span className="mixes-cell__component-line">
                            {mix.components.map((component) => component.name).join(' + ')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="mixes-cell mixes-cell__chips">
                          {visibleProfiles.map((profile) => (
                            <ProfileTag key={`${mix.id}:profile:${profile}`} profile={profile} />
                          ))}
                          {profileOverflow > 0 ? (
                            <span className="tag tag--ghost">+{profileOverflow}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{renderMixStatus(mix)}</td>
                      <td className="mixes-table__metric-col">
                        <span className="mixes-cell__metric" title="Нажатия «Покурить»">
                          {formatMetricValue(mix.smokeCtaCount)}
                        </span>
                      </td>
                      <td className="mixes-table__metric-col">
                        <span className="mixes-cell__metric" title="Средний рейтинг гостей">
                          <Star size={11} aria-hidden="true" />
                          {formatRating(mix.avgRating)}
                          {mix.ratingsCount > 0 ? (
                            <span className="mixes-cell__metric-meta">
                              ({formatMetricValue(mix.ratingsCount)})
                            </span>
                          ) : null}
                        </span>
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

      {status === 'loading' && !items.length ? <RowsSkeleton label="Загружаем каталог миксов" rows={8} /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <ListPagination
        page={meta.page}
        pageSize={meta.pageSize}
        totalPages={meta.totalPages}
        filteredItems={meta.filteredItems}
        onPageChange={onPageChange}
      />

      <Dialog open={mixPendingDelete !== null} onOpenChange={(next) => { if (!next) setMixPendingDelete(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Удалить микс «{mixPendingDelete?.name}»?</DialogTitle>
            <DialogDescription>
              Микс удалится насовсем.
              {mixPendingDelete && mixPendingDelete.railMemberships.length > 0
                ? ` Он пропадёт из рейлов: ${mixPendingDelete.railMemberships.map((rail) => rail.name).join(', ')}.`
                : null}
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
