import { useEffect, useId, useRef, useState, type FormEventHandler } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterMultiSelect } from '@/components/ui/filter-multi-select';
import { ListPagination } from '@/components/ui/list-pagination';
import type {
  InventoryTobacco,
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
  mixStatusFilterOptions,
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
  avgRating: string;
  popularity: string;
  available: boolean;
  railMemberships: MixRailMembership[];
};

export type MixCatalogMode = 'catalog' | 'create' | 'edit';

type MixCatalogViewProps = {
  mode: MixCatalogMode;
  items: MixRecord[];
  tobaccoOptions: InventoryTobacco[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  filters: MixListFilters;
  meta: MixListMeta;
  sort: MixListSort;
  editor: MixEditorViewState;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
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
  onCancelCreate: () => void;
  onResetEditor: () => void;
  onEditorFieldChange: (field: 'name' | 'description' | 'avgRating' | 'popularity', value: string) => void;
  onEditorAvailabilityChange: (value: boolean) => void;
  onAddComponent: () => void;
  onUpdateComponent: (key: string, patch: Partial<Omit<MixEditorComponentInput, 'key'>>) => void;
  onMoveComponent: (key: string, direction: 'up' | 'down') => void;
  onRemoveComponent: (key: string) => void;
  onRebalanceComponents: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

const mixFilterGroups: Array<{ key: MixFilterKey; title: string }> = [
  { key: 'manufacturers', title: 'Производители компонентов' },
  { key: 'flavorProfiles', title: 'Категории' },
  { key: 'flavors', title: 'Вкусы' },
  { key: 'flavorTags', title: 'Мета-теги' },
];

const formatPercentTotal = (components: MixEditorComponentInput[]) =>
  components.reduce((sum, component) => sum + Number(component.proportion.replace(',', '.')) || 0, 0);

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

const formatTobaccoOptionSummary = (option: InventoryTobacco) => {
  const parts = [option.name, option.manufacturer];
  if (option.lineName?.trim()) {
    parts.push(option.lineName.trim());
  }
  parts.push(option.inStock ? 'в наличии' : 'нет наличия');
  return parts.join(' · ');
};

type MixComponentSelectProps = {
  value: string;
  options: InventoryTobacco[];
  onSelect: (value: string) => void;
};

const MixComponentSelect = ({ value, options, onSelect }: MixComponentSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const matchingOptions = normalizedQuery
    ? options.filter((option) => {
        const searchValue = [option.name, option.manufacturer, option.lineName ?? '', option.inStock ? 'в наличии' : 'нет наличия']
          .join(' ')
          .toLocaleLowerCase('ru-RU');
        return searchValue.includes(normalizedQuery);
      })
    : options;
  const visibleOptions = selectedOption
    ? [selectedOption, ...matchingOptions.filter((option) => option.id !== selectedOption.id)]
    : matchingOptions;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    searchRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="ops-filter-select mixes-component-select" ref={rootRef}>
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        className="ops-filter-select__trigger mixes-component-select__trigger"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ops-filter-select__trigger-copy">
          <strong
            className={
              selectedOption
                ? 'ops-filter-select__summary'
                : 'ops-filter-select__summary ops-filter-select__summary--placeholder'
            }
          >
            {selectedOption ? selectedOption.name : 'Выберите табак'}
          </strong>
          <span className="ops-filter-select__meta">
            {selectedOption ? `${selectedOption.manufacturer}${selectedOption.lineName ? ` · ${selectedOption.lineName}` : ''}` : 'Поиск по названию, бренду или линейке'}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="ops-filter-select__chevron" />
      </Button>

      {open ? (
        <div className="ops-filter-select__panel mixes-component-select__panel" id={panelId}>
          <label className="ops-filter-select__search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск табака"
            />
          </label>

          {selectedOption ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mixes-component-select__clear"
              onClick={() => {
                onSelect('');
                setOpen(false);
              }}
            >
              <X aria-hidden="true" />
              Очистить выбор
            </Button>
          ) : null}

          <div className="ops-filter-select__list" role="listbox" aria-label="Табаки для компонента микса">
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const active = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'ops-filter-select__option ops-filter-select__option--active' : 'ops-filter-select__option'}
                    onClick={() => {
                      onSelect(option.id);
                      setOpen(false);
                    }}
                  >
                    <span className="mixes-component-select__option-copy">
                      <span className="ops-filter-select__option-label">{option.name}</span>
                      <span className="mixes-component-select__option-meta">{formatTobaccoOptionSummary(option)}</span>
                    </span>
                    {active ? <Check aria-hidden="true" className="ops-filter-select__check" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="ops-filter-select__empty">Ничего не найдено.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
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

const renderAvailabilityStatus = (available: boolean) =>
  available ? <Badge>Виден гостю</Badge> : <Badge variant="secondary">Скрыт оператором</Badge>;

export const MixCatalogView = ({
  mode,
  items,
  tobaccoOptions,
  status,
  error,
  filters,
  meta,
  sort,
  editor,
  saveStatus,
  saveError,
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
  onCancelCreate,
  onResetEditor,
  onEditorFieldChange,
  onEditorAvailabilityChange,
  onAddComponent,
  onUpdateComponent,
  onMoveComponent,
  onRemoveComponent,
  onRebalanceComponents,
  onSubmit,
}: MixCatalogViewProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);
  const componentTotal = formatPercentTotal(editor.components);
  const selectedMix = editor.id ? items.find((item) => item.id === editor.id) ?? null : null;

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

  const renderMixForm = (screenMode: 'create' | 'edit') => (
    <form className="admin-form" onSubmit={onSubmit}>
      <div className="form-grid form-grid--two">
        <label className="field">
          <span className="field-label">Название</span>
          <input
            className="text-input"
            value={editor.name}
            onChange={(event) => onEditorFieldChange('name', event.target.value)}
            placeholder="Например, Ягодный караван"
          />
        </label>

        <label className="field">
          <span className="field-label">Популярность</span>
          <input
            className="text-input"
            type="number"
            step="1"
            value={editor.popularity}
            onChange={(event) => onEditorFieldChange('popularity', event.target.value)}
          />
        </label>

        <label className="field field--wide">
          <span className="field-label">Описание</span>
          <textarea
            className="textarea-input"
            value={editor.description}
            onChange={(event) => onEditorFieldChange('description', event.target.value)}
            placeholder="Короткое описание микса для персонала и гостевой витрины"
            rows={3}
          />
        </label>

        <label className="field">
          <span className="field-label">Базовый рейтинг</span>
          <input
            className="text-input"
            type="number"
            step="0.1"
            value={editor.avgRating}
            onChange={(event) => onEditorFieldChange('avgRating', event.target.value)}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={editor.available}
            onChange={(event) => onEditorAvailabilityChange(event.target.checked)}
          />
          <span>Доступен для гостя</span>
        </label>
      </div>

      <div className="mixes-editor__section">
        <div className="mixes-editor__section-head">
          <div>
            <p className="field-label">Компоненты микса</p>
            <p className="meta-line">Сумма долей должна быть ровно 100%. Порядок строк определяет `sortOrder`.</p>
          </div>
          <div className="mixes-editor__section-actions">
            <Button type="button" variant="outline" size="sm" onClick={onRebalanceComponents}>
              Распределить поровну
            </Button>
            <Button type="button" size="sm" onClick={onAddComponent}>
              Добавить компонент
            </Button>
          </div>
        </div>

        <div className="mixes-component-list">
          {editor.components.map((component, index) => (
            <div className="mixes-component-row" key={component.key}>
              <label className="mixes-component-row__field">
                <span className="mixes-toolbar__label">Табак</span>
                <MixComponentSelect
                  value={component.tobaccoId}
                  options={tobaccoOptions}
                  onSelect={(value) => onUpdateComponent(component.key, { tobaccoId: value })}
                />
              </label>

              <label className="mixes-component-row__field mixes-component-row__field--small">
                <span className="mixes-toolbar__label">Доля, %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={component.proportion}
                  onChange={(event) => onUpdateComponent(component.key, { proportion: event.target.value })}
                />
              </label>

              <div className="mixes-component-row__actions">
                <Button type="button" variant="outline" size="sm" onClick={() => onMoveComponent(component.key, 'up')} disabled={index === 0}>
                  Выше
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveComponent(component.key, 'down')}
                  disabled={index === editor.components.length - 1}
                >
                  Ниже
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => onRemoveComponent(component.key)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))}
          {!editor.components.length ? <p className="meta-line">Добавьте хотя бы один компонент.</p> : null}
        </div>

        <div className={componentTotal === 100 ? 'mixes-component-total' : 'mixes-component-total mixes-component-total--error'}>
          <strong>Сумма долей: {componentTotal}%</strong>
          <span>{componentTotal === 100 ? 'Готово к сохранению' : 'Исправьте доли до ровно 100%'}</span>
        </div>
      </div>

      <div className="mixes-editor__section">
        <p className="field-label">Участие в рейлах</p>
        <div className="mixes-editor__rails">
          {editor.railMemberships.length ? (
            editor.railMemberships.map((membership) => (
              <div className="mixes-rail-chip" key={membership.id}>
                <strong>{membership.name}</strong>
                <span>
                  {formatRailType(membership.type)} · {membership.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            ))
          ) : (
            <p className="meta-line">После сохранения микс можно добавлять в рейлы из модуля «Рейлы».</p>
          )}
        </div>
      </div>

      {saveError ? <p className="error-text">{saveError}</p> : null}

      <div className="form-actions">
        <Button type="submit" size="sm" disabled={saveStatus === 'loading'}>
          {saveStatus === 'loading' ? 'Сохраняем...' : screenMode === 'create' ? 'Создать микс' : 'Сохранить микс'}
        </Button>
        {screenMode === 'create' ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onCancelCreate}>
              Вернуться в каталог
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onResetEditor}>
              Сбросить форму
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onResetEditor}>
            Вернуться в каталог
          </Button>
        )}
      </div>
    </form>
  );

  if (mode === 'create' || mode === 'edit') {
    const isEditMode = mode === 'edit';

    return (
      <section className="card mixes-panel">
        <div className="section-head section-head--surface">
          <div className="ops-surface__intro">
            <p className="eyebrow">Менеджер миксов</p>
            <h2>{isEditMode ? 'Редактирование микса' : 'Создание микса'}</h2>
            <p className="meta-line">
              {isEditMode
                ? 'Правки состава и доступности выполняются отдельно от каталога, чтобы не конфликтовать с широкой таблицей.'
                : 'Новый микс настраивается отдельно от каталога.'}
            </p>
          </div>
          <div className="section-actions">
            <Button type="button" variant="outline" size="sm" onClick={isEditMode ? onResetEditor : onCancelCreate}>
              Вернуться в каталог
            </Button>
          </div>
        </div>

        <article className="mixes-editor mixes-create-screen ops-editor">
          <div className="entity-card__head">
            <div>
              <p className="entity-kicker">{isEditMode ? 'Редактура состава' : 'Новый микс'}</p>
              <h3>{isEditMode ? editor.name || 'Без названия' : 'Создать микс'}</h3>
            </div>
            {isEditMode && selectedMix ? (
              editor.railMemberships.length ? (
                <Badge variant="outline">В рейлах: {editor.railMemberships.length}</Badge>
              ) : (
                renderMixStatus(selectedMix)
              )
            ) : (
              renderAvailabilityStatus(editor.available)
            )}
          </div>

          {renderMixForm(isEditMode ? 'edit' : 'create')}
        </article>
      </section>
    );
  }

  return (
    <section className="card mixes-panel">
      <div className="section-head section-head--surface">
        <div className="ops-surface__intro">
          <p className="eyebrow">Менеджер миксов</p>
          <h2>Каталог миксов</h2>
          <p className="meta-line">Каталог, состав, доступность и участие в рейлах.</p>
        </div>
        <div className="section-actions">
          <Button type="button" size="sm" onClick={onStartCreate}>
            Новый микс
          </Button>
        </div>
      </div>

      <div className="mixes-panel__stats ops-surface__stats">
        <div className="mixes-stat ops-surface__stat">
          <span>Показано</span>
          <strong>{formatMetricValue(meta.filteredItems)}</strong>
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
          <span>Заблокировано наличием</span>
          <strong>{formatMetricValue(meta.blockedCount)}</strong>
        </div>
      </div>

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

        <label className="mixes-toolbar__control">
          <span className="mixes-toolbar__label">Статус</span>
          <select value={filters.status} onChange={(event) => onStatusChange(event.target.value as MixStatusFilter)}>
            {mixStatusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

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
