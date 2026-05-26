import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
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
        <div className="mixes-cards" role="list">
          {items.map((mix) => {
            const totalProportion = mix.components.reduce(
              (sum, component) => sum + component.proportion,
              0,
            );
            const visibleProfiles = mix.flavorProfiles.slice(0, 3);
            const profileOverflow = mix.flavorProfiles.length - visibleProfiles.length;
            const popularityWidth = Math.min(100, Math.max(0, mix.popularity));
            const activeRails = mix.railMemberships.filter((membership) => membership.active).length;
            return (
              <article
                className="mixes-card"
                role="listitem"
                data-blocked={!mix.available || undefined}
                data-hidden={mix.available && !mix.guestVisible ? true : undefined}
                key={mix.id}
              >
                <div
                  className="mixes-card__brand-strip"
                  aria-label="Доли компонентов микса"
                >
                  {mix.components.length === 0 ? (
                    <span className="mixes-card__brand-strip-empty" aria-hidden="true" />
                  ) : (
                    mix.components.map((component) => {
                      const color = colorForTobacco(component.tobaccoId);
                      const widthPct = totalProportion > 0
                        ? (component.proportion / totalProportion) * 100
                        : 100 / mix.components.length;
                      return (
                        <span
                          key={`${mix.id}:${component.tobaccoId}:${component.sortOrder}`}
                          className="mixes-card__brand-segment"
                          style={{
                            flexBasis: `${widthPct}%`,
                            background: color.fill,
                          }}
                          title={`${component.name} · ${component.proportion}%`}
                        />
                      );
                    })
                  )}
                </div>

                <header className="mixes-card__head">
                  <h3 className="mixes-card__name">{mix.name}</h3>
                  {renderMixStatus(mix)}
                </header>

                <p className="mixes-card__description">
                  {mix.description || 'Без описания'}
                </p>

                {visibleProfiles.length || mix.flavors.length ? (
                  <div className="mixes-card__flavors">
                    {visibleProfiles.map((profile) => (
                      <Badge
                        key={`${mix.id}:profile:${profile}`}
                        variant="secondary"
                      >
                        {formatFlavorProfileLabel(profile)}
                      </Badge>
                    ))}
                    {profileOverflow > 0 ? (
                      <Badge variant="outline">+{profileOverflow}</Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="mixes-card__metrics">
                  <span className="mixes-card__rating" title="Средний рейтинг гостей">
                    ★ {mix.avgRating.toFixed(1)}
                    {mix.ratingsCount > 0 ? (
                      <span className="mixes-card__rating-count">
                        · {formatMetricValue(mix.ratingsCount)}
                      </span>
                    ) : null}
                  </span>
                  <div
                    className="mixes-card__popularity"
                    role="meter"
                    aria-label="Популярность микса"
                    aria-valuenow={mix.popularity}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    title={`Популярность: ${formatMetricValue(mix.popularity)}`}
                  >
                    <span
                      className="mixes-card__popularity-fill"
                      style={{ width: `${popularityWidth}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <footer className="mixes-card__actions">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSelectMix(mix)}
                  >
                    Открыть
                  </Button>
                  <span
                    className="mixes-card__rails-meta"
                    title={
                      mix.railMemberships.length
                        ? mix.railMemberships.map((membership) => membership.name).join(', ')
                        : 'Пока не входит ни в один рейл'
                    }
                  >
                    В рейлах: {formatMetricValue(mix.railCount)}
                    {activeRails > 0 && activeRails !== mix.railCount
                      ? ` · активных ${activeRails}`
                      : ''}
                  </span>
                  <span className="mixes-card__updated">
                    {formatMixUpdatedAt(mix.updatedAt)}
                  </span>
                </footer>
              </article>
            );
          })}
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
