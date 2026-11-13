import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Ellipsis, FileUp, Search } from 'lucide-react';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import {
  formatCount,
  formatFlavorProfileLabel,
  formatMetricValue,
  type ShelfRow,
  type ShelfTobaccoRef,
  type ShelfTrialVerdict,
  type TobaccoRef,
} from '@/contracts';
import type { ShelfApi, ShelfPatch } from '@/hooks/use-shelf';
import { useDragSelect } from '@/hooks/use-drag-select';
import { useIsPhone } from '@/hooks/use-is-phone';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AttributeFilter, FilterChip, FilterReset, FiltersButton, SheetChoice, SortPill } from '@/components/ui/filter-bar';
import {
  EMPTY_SHELF_FILTERS,
  SHELF_SORT_OPTIONS,
  SHELF_STATUS_CHIPS,
  arrivalCell,
  buildShelfFilterOptions,
  countActiveShelfFilters,
  describeShelfError,
  emptyToast,
  filterShelfRows,
  formatNumber,
  keepToast,
  resolveShelfShortcut,
  restockToast,
  shelfCounts,
  shelfRowAction,
  shelfRowMenu,
  sortShelfRows,
  type ShelfFilters,
  type ShelfSortKey,
  type ShelfStatusKey,
} from '@/lib/shelf';
import { analogToastText } from '@/lib/shelf-analogs';
import {
  bulkEmptyToast,
  bulkKeepToast,
  bulkRemoveToast,
  bulkRestockToast,
  bulkStopToast,
  bulkSummary,
  headCheck,
  selectRange,
  toggleSelected,
} from '@/lib/shelf-bulk';
import { ShelfBulkBar, ShelfCheck, ShelfMobileBulk, type ShelfBulkActions } from './shelf-bulk';
import { ShelfCard } from './shelf-card';
import { orderCount } from '@/lib/order';
import { ShelfMobileList } from './shelf-mobile';
import { ShelfOrderView } from './shelf-order';
import { ShelfRowMenu, type ShelfRowActions } from './shelf-row-menu';
import { ShelfAnalogsCell } from './shelf-analogs';
import { ShelfStatusCell } from './shelf-status';
import { ShelfToast, type ShelfToastData } from './shelf-toast';
import { RowsSkeleton } from '@/components/ui/loading';

// order — «К заказу» (#518): закончились и держим постоянно.
export type ShelfMode = 'shelf' | 'order';

type ShelfViewProps = {
  shelf: ShelfApi;
  // Режим живёт в App: смена раздела возвращает на полку.
  mode: ShelfMode;
  onModeChange: (mode: ShelfMode) => void;
  onGoCatalog: () => void;
  onOpenInCatalog: (row: ShelfRow) => void;
  onOpenMix: (mixId: string) => void;
  onUploadInvoice: (file: File) => void;
  // Карточка, которую открыли извне (дашборд → «Заканчивается»).
  openCardId?: string;
  onCardOpened?: () => void;
  // Выбранные табаки (#333). Живут в App: на телефоне режим выбора включается
  // из верхней панели. null — не выбираем; на телефоне [] — режим выбора без отметок.
  selection: string[] | null;
  onSelectionChange: (next: string[] | null) => void;
};

type Toast = ShelfToastData;
type ToastInput = Omit<Toast, 'id'>;

const fullName = (row: ShelfRow) => `${row.tobacco.manufacturer} ${row.tobacco.name}`;
const tobaccoName = (tobacco: ShelfTobaccoRef) => `${tobacco.manufacturer} ${tobacco.name}`;

const isField = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

export const ShelfView = ({
  shelf,
  mode,
  onModeChange,
  onGoCatalog,
  onOpenInCatalog,
  onOpenMix,
  onUploadInvoice,
  openCardId,
  onCardOpened,
  selection,
  onSelectionChange,
}: ShelfViewProps) => {
  const { view } = shelf;
  const rows = useMemo(() => view?.rows ?? [], [view]);

  const isPhone = useIsPhone();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ShelfStatusKey>('all');
  const [filters, setFilters] = useState<ShelfFilters>(EMPTY_SHELF_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<ShelfSortKey>('status');
  const [activeId, setActiveId] = useState('');
  const [cardId, setCardId] = useState('');
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pendingId, setPendingId] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const toastSeq = useRef(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const tableRef = useRef<HTMLTableSectionElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Счёт выбирается прямо на полке: файл уходит на «Поставки», там его разберут.
  const invoiceInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/pdf,.pdf"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onUploadInvoice(file);
      }}
    />
  );
  const uploadButton = (
    <button type="button" className="btn" data-variant="primary" onClick={() => fileRef.current?.click()}>
      <FileUp size={14} aria-hidden />
      Загрузить счёт
    </button>
  );

  useEffect(() => {
    if (!openCardId || !rows.some((row) => row.tobacco.id === openCardId)) return;
    onModeChange('shelf');
    setActiveId(openCardId);
    setCardId(openCardId);
    onCardOpened?.();
  }, [openCardId, rows, onCardOpened, onModeChange]);

  const toOrder = orderCount(shelf.order);
  // «Показать на полке» под заявкой: закончившиеся, которые не держим, — чипом «Закончились».
  const showOut = () => {
    onModeChange('shelf');
    setQuery('');
    setFilters(EMPTY_SHELF_FILTERS);
    setStatus('out');
  };
  const segment = (
    <span className={isPhone ? 'shelf-seg shelf-seg--phone' : 'shelf-seg'} role="group" aria-label="Вид полки">
      <button type="button" aria-pressed={mode === 'shelf'} onClick={() => onModeChange('shelf')}>
        Полка
      </button>
      <button type="button" aria-pressed={mode === 'order'} onClick={() => onModeChange('order')}>
        К заказу
        {toOrder ? <span className="shelf-seg__count">{formatMetricValue(toOrder)}</span> : null}
      </button>
    </span>
  );
  const orderView = <ShelfOrderView order={shelf.order} error={shelf.orderError} phone={isPhone} onShowNotKept={showOut} />;

  const counts = useMemo(() => shelfCounts(rows), [rows]);
  const shown = useMemo(
    () => filterShelfRows(sortShelfRows(rows, sort), { query, status, filters }),
    [rows, query, status, filters, sort],
  );
  const menuRow = menu ? rows.find((row) => row.tobacco.id === menu.id) ?? null : null;
  const cardRow = cardId ? rows.find((row) => row.tobacco.id === cardId) ?? null : null;
  const activeFilters = countActiveShelfFilters(filters);
  const filterOptions = useMemo(() => buildShelfFilterOptions(rows), [rows]);
  // Одни и те же атрибуты — списками на десктопе и чипами в шторке телефона.
  const attributes = [
    {
      title: 'Бренд',
      options: filterOptions.brands.map((option) => option.value),
      selected: filters.brands,
      onChange: (brands: string[]) => setFilters({ ...filters, brands }),
    },
    {
      title: 'Характер',
      options: filterOptions.profiles.map((option) => option.value),
      selected: filters.profiles,
      formatOption: formatFlavorProfileLabel,
      onChange: (profiles: string[]) => setFilters({ ...filters, profiles }),
    },
    {
      title: 'Крепость',
      options: filterOptions.strengths.map((option) => option.value),
      selected: filters.strengths,
      formatOption: (value: string) => value || 'Не указана',
      onChange: (strengths: string[]) => setFilters({ ...filters, strengths }),
    },
    {
      title: 'Миксы',
      options: ['with', 'without'],
      selected: filters.mixes ? [filters.mixes] : [],
      formatOption: (value: string) => (value === 'with' ? 'Есть в миксах' : 'Нет в миксах'),
      single: true,
      onChange: ([mixes = '']: string[]) => setFilters({ ...filters, mixes: mixes as ShelfFilters['mixes'] }),
    },
  ];
  const narrowed = activeFilters > 0 || status !== 'all';
  const resetFilters = () => {
    setStatus('all');
    setFilters(EMPTY_SHELF_FILTERS);
  };

  const selected = useMemo(() => selection ?? [], [selection]);
  const selecting = selected.length > 0;
  const picking = isPhone && selection !== null;
  const shownIds = useMemo(() => shown.map((row) => row.tobacco.id), [shown]);
  // В порядке таблицы: так и названия на панели идут сверху вниз.
  const chosen = useMemo(() => shown.filter((row) => selected.includes(row.tobacco.id)), [shown, selected]);
  const summary = bulkSummary(chosen);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Строка прошлого клика — начало диапазона для Shift + клик.
  const anchorId = useRef<string | null>(null);

  // На десктопе пустое выделение — это «не выбираем»; на телефоне режим выбора
  // держится до «Готово».
  const setSelected = useCallback(
    (next: string[]) => onSelectionChange(isPhone ? next : next.length ? next : null),
    [isPhone, onSelectionChange],
  );
  const clearSelection = useCallback(() => {
    anchorId.current = null;
    onSelectionChange(null);
  }, [onSelectionChange]);
  const drag = useDragSelect({
    order: shownIds,
    selected,
    onChange: (next, target) => {
      setSelected(next);
      anchorId.current = target;
    },
  });
  const pick = useCallback(
    (id: string, range: boolean) => {
      setSelected(range ? selectRange(shownIds, anchorId.current, id, selected) : toggleSelected(selected, id));
      anchorId.current = id;
    },
    [selected, setSelected, shownIds],
  );

  // Сменили фильтр — выделение сбрасывается: в нём могли остаться невидимые строки.
  // Смену вида и раздела сбрасывает App.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    if (!selectionRef.current?.length) return;
    anchorId.current = null;
    onSelectionChange(isPhone ? [] : null);
  }, [query, status, filters, isPhone, onSelectionChange]);

  const notify = useCallback((next: ToastInput) => {
    toastSeq.current += 1;
    setToast({ ...next, id: toastSeq.current });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  // Общая обёртка действий: одна строка за раз, ошибка — в тост.
  const run = useCallback(
    async (row: ShelfRow, action: () => Promise<ToastInput | null>) => {
      setMenu(null);
      setPendingId(row.tobacco.id);
      try {
        const next = await action();
        if (next) notify(next);
      } catch (cause) {
        notify({ title: fullName(row), text: describeShelfError(cause), error: true });
      } finally {
        setPendingId('');
      }
    },
    [notify],
  );

  // «Держать постоянно» из тоста «Закончился» (#shot=shelf-out-notkept).
  const onKeep = useCallback(
    (row: ShelfRow) =>
      run(row, async () => {
        const item = await shelf.update(row.tobacco.id, { keepStocked: true });
        return { ...keepToast(item), undo: () => shelf.update(row.tobacco.id, { keepStocked: false }) };
      }),
    [run, shelf],
  );

  const onEmpty = useCallback(
    (row: ShelfRow) =>
      run(row, async () => {
        const { batchId, item } = await shelf.markEmpty(row.tobacco.id);
        return {
          ...emptyToast(item),
          undo: () => shelf.undoBatch(batchId),
          ...(item.keepStocked ? {} : { action: { label: 'Держать постоянно', onClick: () => void onKeep(item) } }),
        };
      }),
    [onKeep, run, shelf],
  );

  const onRestock = useCallback(
    (row: ShelfRow) =>
      run(row, async () => {
        const { batchId, item } = await shelf.restock(row.tobacco.id);
        return { ...restockToast(item), undo: () => shelf.undoRestock(batchId) };
      }),
    [run, shelf],
  );

  const onToggleStop = useCallback(
    (row: ShelfRow) =>
      run(row, async () => {
        const stopped = !row.stopped;
        const item = await shelf.update(row.tobacco.id, { stopped });
        return {
          title: fullName(row),
          text: stopped ? 'Стоп для гостей включён.' : item.guestAvailable ? 'Стоп снят, гости снова видят табак.' : 'Стоп снят.',
          undo: () => shelf.update(row.tobacco.id, { stopped: !stopped, ...(row.stopNote ? { stopNote: row.stopNote } : {}) }),
        };
      }),
    [run, shelf],
  );

  const rowActions: ShelfRowActions = {
    onToggleStop,
    onRemove: (row) =>
      run(row, async () => {
        await shelf.remove(row.tobacco.id);
        if (cardId === row.tobacco.id) setCardId('');
        return {
          title: fullName(row),
          text: 'Убран с полки, история осталась.',
          undo: () => shelf.add(row.tobacco.id, row.shelfStatus === 'plan' ? 'plan' : 'active', false),
        };
      }),
  };

  // Аналоги (#482): тост только когда аналог добавлен — название жирным, ниже что стало видно гостю.
  const onSetAnalogs = useCallback(
    (row: ShelfRow, ids: string[], added?: TobaccoRef) =>
      run(row, async () => {
        const before = row.analogs.map((item) => item.tobaccoId);
        const { unblockedMixes } = await shelf.setAnalogs(row.tobacco.id, ids);
        if (!added) return null;
        return {
          title: added.name,
          text: analogToastText(row.tobacco.name, unblockedMixes),
          undo: () => shelf.setAnalogs(row.tobacco.id, before),
        };
      }),
    [run, shelf],
  );

  const onUndo = useCallback(async () => {
    if (!toast?.undo) return;
    const { undo, title } = toast;
    setToast(null);
    try {
      await undo();
    } catch (cause) {
      notify({ title, text: describeShelfError(cause), error: true });
    }
  }, [notify, toast]);

  // Отметка пробы (#329) — в карточке и на телефоне; не сохранилась — тост.
  const onTrialVerdict = useCallback(
    async (tobacco: ShelfTobaccoRef, trialVerdict: ShelfTrialVerdict | null) => {
      try {
        await shelf.update(tobacco.id, { trialVerdict });
      } catch (cause) {
        notify({ title: tobaccoName(tobacco), text: describeShelfError(cause), error: true });
      }
    },
    [notify, shelf],
  );

  // Действие с выбранными: выделение снимается сразу, ошибка его возвращает.
  const runBulk = useCallback(
    async (errorTitle: string, action: () => Promise<ToastInput>) => {
      if (bulkBusy) return;
      const before = selection;
      clearSelection();
      setBulkBusy(true);
      try {
        notify(await action());
      } catch (cause) {
        onSelectionChange(before);
        notify({ title: errorTitle, text: describeShelfError(cause), error: true });
      } finally {
        setBulkBusy(false);
      }
    },
    [bulkBusy, clearSelection, notify, onSelectionChange, selection],
  );

  // «Закончились» для выбранных (#333): одно действие и одна отмена на всех.
  const onBulkEmpty = useCallback(() => {
    if (!summary.emptyCount) return;
    const rows = chosen;
    void runBulk('Не отмечено', async () => {
      const response = await shelf.emptyMany(rows);
      return { ...bulkEmptyToast(response), ...(response.done.length ? { undo: () => shelf.undoBatch(response.batchId) } : {}) };
    });
  }, [chosen, runBulk, shelf, summary.emptyCount]);

  const bulkActions: ShelfBulkActions = {
    onEmpty: onBulkEmpty,
    onRestock: () => {
      const ids = chosen.filter((row) => shelfRowMenu(row).canRestock).map((row) => row.tobacco.id);
      if (!ids.length) return;
      void runBulk('Не вернулось', async () => {
        const response = await shelf.restockMany(ids);
        return { ...bulkRestockToast(response), ...(response.done.length ? { undo: () => shelf.undoRestock(response.batchId) } : {}) };
      });
    },
    // Меняются только те, у кого другое значение: отмена возвращает ровно их.
    onKeep: () => {
      const keep = !summary.allKept;
      const ids = chosen.filter((row) => row.keepStocked !== keep).map((row) => row.tobacco.id);
      const count = chosen.length;
      void runBulk('Не сохранилось', async () => {
        if (!ids.length) return bulkKeepToast(count, keep);
        await shelf.keepMany(ids, keep);
        return { ...bulkKeepToast(count, keep), undo: () => shelf.keepMany(ids, !keep) };
      });
    },
    onStop: () => {
      const stopped = !summary.allStopped;
      const ids = chosen.filter((row) => row.stopped !== stopped).map((row) => row.tobacco.id);
      const count = chosen.length;
      const patchMany = async (patch: ShelfPatch) => {
        const { failed } = await shelf.updateMany(ids, patch);
        if (failed.length) throw failed[0];
      };
      void runBulk('Не сохранилось', async () => {
        if (!ids.length) return bulkStopToast(count, stopped);
        await patchMany({ stopped });
        return { ...bulkStopToast(count, stopped), undo: () => patchMany({ stopped: !stopped }) };
      });
    },
    // «Убрать с полки» для выбранных (#517): одна отмена возвращает всех убранных.
    onRemove: () => {
      const rows = chosen;
      if (!rows.length) return;
      void runBulk('Не убрано', async () => {
        const { items, failed } = await shelf.removeMany(rows.map((row) => row.tobacco.id));
        if (!items.length) throw failed[0];
        const removed = rows.filter((row) => items.some((item) => item.tobacco.id === row.tobacco.id));
        return {
          ...bulkRemoveToast(removed.length, failed.length),
          undo: async () => {
            const back = await shelf.restoreMany(removed);
            if (back.failed.length) throw back.failed[0];
          },
        };
      });
    },
  };

  const onUpdate = useCallback(async (row: ShelfRow, patch: ShelfPatch) => {
    await shelf.update(row.tobacco.id, patch);
  }, [shelf]);

  const keyboard = useRef({ shown, activeId, cardId, menu, mode, onEmpty, onUndo, selecting, onBulkEmpty, pick, clearSelection });
  keyboard.current = { shown, activeId, cardId, menu, mode, onEmpty, onUndo, selecting, onBulkEmpty, pick, clearSelection };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = keyboard.current;
      if (event.defaultPrevented || state.cardId || state.menu || state.mode !== 'shelf') return;
      const target = event.target as HTMLElement | null;
      const shortcut = resolveShelfShortcut({
        key: event.key,
        code: event.code,
        inField: isField(target) || Boolean(target?.closest('[role="dialog"]')),
        modifier: event.metaKey || event.ctrlKey || event.altKey,
      });
      if (!shortcut) return;
      if (shortcut.type === 'open' && target?.closest('button, a')) return;

      const index = state.shown.findIndex((row) => row.tobacco.id === state.activeId);
      const active = index >= 0 ? state.shown[index] : null;
      switch (shortcut.type) {
        case 'search':
          event.preventDefault();
          searchRef.current?.focus();
          return;
        case 'move': {
          if (!state.shown.length) return;
          event.preventDefault();
          const next = state.shown[Math.min(state.shown.length - 1, Math.max(0, index < 0 ? 0 : index + shortcut.delta))];
          setActiveId(next.tobacco.id);
          tableRef.current
            ?.querySelector(`tr[data-tobacco-id="${CSS.escape(next.tobacco.id)}"]`)
            ?.scrollIntoView({ block: 'nearest' });
          return;
        }
        case 'open':
          if (active) {
            event.preventDefault();
            setCardId(active.tobacco.id);
          }
          return;
        case 'empty':
          if (state.selecting) state.onBulkEmpty();
          else if (active && shelfRowMenu(active).canEmpty) void state.onEmpty(active);
          return;
        case 'select':
          if (active) {
            event.preventDefault();
            state.pick(active.tobacco.id, false);
          }
          return;
        case 'clear':
          if (state.selecting) {
            event.preventDefault();
            state.clearSelection();
          }
          return;
        case 'undo':
          void state.onUndo();
          return;
      }
    };
    // «/» в остальном «Мастере» открывает палитру команд (use-cmdk), а на полке —
    // поиск по полке: перехватываем раньше, в фазе захвата.
    const onSearchKey = (event: KeyboardEvent) => {
      const state = keyboard.current;
      if (state.cardId || state.menu || state.mode !== 'shelf') return;
      const shortcut = resolveShelfShortcut({
        key: event.key,
        code: event.code,
        inField: isField(event.target) || Boolean((event.target as HTMLElement | null)?.closest('[role="dialog"]')),
        modifier: event.metaKey || event.ctrlKey || event.altKey,
      });
      if (shortcut?.type !== 'search') return;
      event.preventDefault();
      event.stopPropagation();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onSearchKey, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onSearchKey, true);
    };
  }, []);

  if (shelf.status !== 'error' && view && !rows.length) {
    return (
      <section className="shelf-page">
        <MasterPageHeader title="Полка" />
        <div className="shelf-empty">
          <h2>Полка пуста</h2>
          <p>Табаки появляются из поставок. Загрузите счёт или добавьте табаки из каталога.</p>
          <div className="shelf-empty__actions">
            {uploadButton}
            <button type="button" className="btn" data-variant="ghost" onClick={onGoCatalog}>
              Добавить из каталога
            </button>
          </div>
          {invoiceInput}
        </div>
        {toast ? <ShelfToast toast={toast} onUndo={() => void onUndo()} onClose={closeToast} /> : null}
      </section>
    );
  }

  const cardSheet = cardRow ? (
    <ShelfCard
      row={cardRow}
      loadCard={shelf.loadCard}
      searchCatalog={shelf.searchCatalog}
      onSetAnalogs={onSetAnalogs}
      onEmpty={(row) => void onEmpty(row)}
      onRestock={(row) => void onRestock(row)}
      onUpdate={onUpdate}
      onTrialVerdict={(row, verdict) => onTrialVerdict(row.tobacco, verdict)}
      onOpenCatalog={(row) => {
        setCardId('');
        onOpenInCatalog(row);
      }}
      onOpenMix={(mixId) => {
        setCardId('');
        onOpenMix(mixId);
      }}
      onClose={() => setCardId('')}
      actions={isPhone ? rowActions : undefined}
    />
  ) : null;
  const toastNode = toast ? <ShelfToast toast={toast} onUndo={() => void onUndo()} onClose={closeToast} /> : null;
  // Только поиск и ничего не нашлось — табака нет на полке (#shot=edge-search-empty).
  const emptyShown = !narrowed && query.trim() ? (
    <div className="empty shelf-table__empty">
      <b>Ничего не нашлось</b>
      <p>На полке нет такого табака. Добавьте его из каталога.</p>
      <button type="button" className="btn" data-size="sm" onClick={onGoCatalog}>
        Добавить из каталога
      </button>
    </div>
  ) : (
    <div className="empty shelf-table__empty">
      <p>Ничего не найдено. Уберите один из фильтров.</p>
      <button
        type="button"
        className="btn"
        data-size="sm"
        data-variant="ghost"
        onClick={() => {
          setQuery('');
          resetFilters();
        }}
      >
        Сбросить фильтры
      </button>
    </div>
  );
  const statusChip = ([key, label]: [ShelfStatusKey, string]) => (
    <FilterChip key={key} active={status === key} count={counts[key]} onClick={() => setStatus(key)}>
      {label}
    </FilterChip>
  );

  // Телефон (#215, #shot=mobile-shelf): карточки вместо таблицы, фильтры — в нижней
  // шторке. Заголовок раздела — в верхней панели.
  if (isPhone) {
    return (
      <section className="shelf-page shelf-page--phone">
        <h1 className="sr-only">Полка</h1>
        {shelf.status === 'error' ? <p className="error-text">{shelf.error}</p> : null}
        {shelf.status === 'loading' && !view ? <RowsSkeleton label="Загружаем полку" rows={8} /> : null}

        {view ? segment : null}
        {view && mode === 'order' ? orderView : null}

        {view && mode === 'shelf' ? (
          <>
            <div className="m-shelf-search">
              <div className="input m-shelf-search__field">
                <Search size={16} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  enterKeyHint="search"
                  aria-label="Поиск по полке"
                  placeholder="Табак или бренд"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <FiltersButton count={activeFilters} open={filtersOpen} onClick={() => setFiltersOpen(true)} />
            </div>
            <div className="m-shelf-chips" role="group" aria-label="Статус на полке">
              {SHELF_STATUS_CHIPS.map(statusChip)}
            </div>
            <ShelfMobileList
              rows={shown}
              pendingId={pendingId}
              picked={picking ? selected : null}
              onPick={(row) => pick(row.tobacco.id, false)}
              onEmpty={(row) => void onEmpty(row)}
              onRestock={(row) => void onRestock(row)}
              onUnstop={(row) => void onToggleStop(row)}
              onOpenCard={(row) => setCardId(row.tobacco.id)}
              onTrialVerdict={(row, verdict) => onTrialVerdict(row.tobacco, verdict)}
            />
            {!shown.length ? emptyShown : null}
          </>
        ) : null}

        {filtersOpen ? (
          <BottomSheet label="Фильтры полки" onClose={() => setFiltersOpen(false)} className="m-filters-sheet">
            <h2 className="m-filters-sheet__title">Фильтры</h2>
            <SheetChoice
              title="Сортировка"
              options={SHELF_SORT_OPTIONS.map(([key]) => key)}
              selected={[sort]}
              formatOption={(key) => SHELF_SORT_OPTIONS.find(([option]) => option === key)?.[1] ?? key}
              single
              onChange={([next]) => next && setSort(next as ShelfSortKey)}
            />
            {attributes.map((attribute) => (
              <SheetChoice key={attribute.title} {...attribute} />
            ))}
            <div className="m-filters-sheet__actions">
              {activeFilters ? (
                <button type="button" className="btn" data-variant="ghost" onClick={() => setFilters(EMPTY_SHELF_FILTERS)}>
                  Сбросить
                </button>
              ) : null}
              <button type="button" className="btn" data-variant="primary" onClick={() => setFiltersOpen(false)}>
                Показать {formatMetricValue(shown.length)}
              </button>
            </div>
          </BottomSheet>
        ) : null}

        {cardSheet}
        {picking && view && mode === 'shelf' ? <ShelfMobileBulk summary={summary} busy={bulkBusy} actions={bulkActions} /> : null}
        {toastNode}
      </section>
    );
  }

  return (
    <section className="shelf-page" data-selecting={selecting || undefined}>
      <MasterPageHeader
        title="Полка"
        meta={
          !view
            ? undefined
            : mode === 'shelf' && shown.length !== rows.length
              ? `${formatNumber(shown.length)} из ${formatNumber(rows.length)}`
              : formatCount(rows.length, ['табак', 'табака', 'табаков'])
        }
        actions={
          <>
            {segment}
            <button type="button" className="btn" data-variant="ghost" onClick={onGoCatalog}>
              Добавить из каталога
            </button>
            {uploadButton}
            {invoiceInput}
          </>
        }
      />

      {shelf.status === 'error' ? <p className="error-text">{shelf.error}</p> : null}
      {shelf.status === 'loading' && !view ? <RowsSkeleton label="Загружаем полку" rows={8} /> : null}

      {view ? (
        <>
          {mode === 'order' ? orderView : null}

          {mode === 'shelf' ? (
            <>
              <div className="filter-bar">
                <div className="filter-bar__row">
                  <div className="input filter-bar__search">
                    <Search size={14} aria-hidden />
                    <input
                      ref={searchRef}
                      type="search"
                      aria-label="Поиск по полке"
                      placeholder="Табак или бренд"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') event.currentTarget.blur();
                      }}
                    />
                  </div>
                  <div className="filter-bar__chips" role="group" aria-label="Статус на полке">
                    {SHELF_STATUS_CHIPS.map(statusChip)}
                  </div>
                </div>
                <div className="filter-bar__row">
                  <div className="filter-bar__chips" role="group" aria-label="Фильтры полки">
                    {attributes.map((attribute) => (
                      <AttributeFilter key={attribute.title} {...attribute} />
                    ))}
                    {narrowed ? <FilterReset onClick={resetFilters} /> : null}
                  </div>
                  <SortPill value={sort} options={SHELF_SORT_OPTIONS} onChange={setSort} />
                </div>
              </div>

              <div className="shelf-table-shell">
                <table className="shelf-table">
                  <colgroup>
                    <col style={{ width: 44 }} />
                    <col />
                    <col style={{ width: 200 }} />
                    <col style={{ width: 210 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 200 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="shelf-table__check">
                        <ShelfCheck
                          checked={headCheck(selected, shownIds)}
                          label="Выбрать все"
                          onToggle={() => {
                            anchorId.current = null;
                            setSelected(selected.length ? [] : shownIds);
                          }}
                        />
                      </th>
                      <th scope="col">Табак</th>
                      <th scope="col">Аналоги</th>
                      <th scope="col">Наличие</th>
                      <th scope="col">Приход</th>
                      <th scope="col" className="shelf-table__num">Миксы</th>
                      <th scope="col">Держим</th>
                      <th scope="col" aria-label="Действия" />
                    </tr>
                  </thead>
                  <tbody ref={tableRef}>
                    {shown.map((row) => {
                      const busy = pendingId === row.tobacco.id;
                      const menuOpen = menu?.id === row.tobacco.id;
                      const action = shelfRowAction(row);
                      const arrival = arrivalCell(row.lastArrival);
                      const isSelected = selected.includes(row.tobacco.id);
                      return (
                        <tr
                          key={row.tobacco.id}
                          data-tobacco-id={row.tobacco.id}
                          data-active={row.tobacco.id === activeId}
                          data-selected={isSelected || undefined}
                          onPointerEnter={(event) => drag.dragOver(event, row.tobacco.id)}
                          onMouseDown={(event) => {
                            if (event.shiftKey) event.preventDefault();
                          }}
                          // В режиме выбора клик по строке выбирает, а не открывает карточку.
                          onClick={(event) => {
                            setActiveId(row.tobacco.id);
                            if (selecting || event.shiftKey) pick(row.tobacco.id, event.shiftKey);
                            else setCardId(row.tobacco.id);
                          }}
                        >
                          <td className="shelf-table__check">
                            <ShelfCheck
                              checked={isSelected}
                              label={`Выбрать ${fullName(row)}`}
                              onToggle={(range) => {
                                setActiveId(row.tobacco.id);
                                pick(row.tobacco.id, range);
                              }}
                              onDragStart={(event) => drag.startDrag(event, row.tobacco.id)}
                              dragging={drag.isDragging}
                            />
                          </td>
                          <td>
                            <span className="shelf-name-row">
                              <span className="shelf-name">
                                <b>{row.tobacco.name}</b>
                                <span>{row.tobacco.manufacturer}</span>
                              </span>
                              {row.trial ? <span className="tag shelf-trial-tag">проба</span> : null}
                            </span>
                          </td>
                          <td>
                            <ShelfAnalogsCell analogs={row.analogs} />
                          </td>
                          <td>
                            <ShelfStatusCell row={row} />
                          </td>
                          <td>
                            {arrival ? (
                              <span className="shelf-two">
                                <span className="shelf-num">{arrival.date}</span>
                                <small>{arrival.source}</small>
                              </span>
                            ) : (
                              <span className="shelf-faint">—</span>
                            )}
                          </td>
                          <td className="shelf-table__num shelf-num">
                            {row.mixCount ? formatMetricValue(row.mixCount) : <span className="shelf-faint">—</span>}
                          </td>
                          <td className="shelf-table__keep">
                            {row.keepStocked ? (
                              <span role="img" aria-label="Держим постоянно" title="Держим постоянно">
                                <Check size={15} aria-hidden />
                              </span>
                            ) : null}
                          </td>
                          <td onClick={selecting ? undefined : (event) => event.stopPropagation()}>
                            {/* В режиме выбора кнопки строки скрыты (#shot=shelf-bulk). */}
                            {selecting ? null : (
                              <span className="shelf-table__actions">
                                {action === 'empty' ? (
                                  <button type="button" className="btn" data-size="sm" disabled={busy} title="Клавиша E" onClick={() => void onEmpty(row)}>
                                    Закончился
                                  </button>
                                ) : action === 'restock' ? (
                                  <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={() => void onRestock(row)}>
                                    Вернуть в наличие
                                  </button>
                                ) : action === 'unstop' ? (
                                  <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={() => void onToggleStop(row)}>
                                    Снять стоп
                                  </button>
                                ) : (
                                  <span className="shelf-faint shelf-table__note">придёт по счёту</span>
                                )}
                                <button
                                  type="button"
                                  className="icon-btn"
                                  aria-label={`Ещё действия: ${fullName(row)}`}
                                  aria-expanded={menuOpen}
                                  disabled={busy}
                                  onClick={(event) => setMenu(menuOpen ? null : { id: row.tobacco.id, anchor: event.currentTarget })}
                                >
                                  <Ellipsis size={15} aria-hidden />
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!shown.length ? emptyShown : null}
              </div>

              {selecting ? <ShelfBulkBar summary={summary} busy={bulkBusy} actions={bulkActions} onClear={clearSelection} /> : null}
            </>
          ) : null}
        </>
      ) : null}

      {menu && menuRow ? <ShelfRowMenu row={menuRow} anchor={menu.anchor} actions={rowActions} onClose={() => setMenu(null)} /> : null}

      {cardSheet}

      {toastNode}
    </section>
  );
};
