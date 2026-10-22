import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ellipsis, FileUp, Search, SlidersHorizontal } from 'lucide-react';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow } from '@/components/shell/master-stats-row';
import { DEFAULT_SHELF_SETTINGS, formatCount, formatMetricValue, type ShelfRow } from '@/contracts';
import type { ShelfApi, ShelfPatch } from '@/hooks/use-shelf';
import { useIsPhone } from '@/hooks/use-is-phone';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { SHELF_MOBILE_CHIPS, defaultMobileShelfStatus, shelfMobileSummary } from '@/lib/shelf-mobile';
import {
  EMPTY_SHELF_FILTERS,
  SHELF_SORT_OPTIONS,
  SHELF_STATUS_CHIPS,
  countActiveShelfFilters,
  countOverToastText,
  countToastText,
  describeShelfError,
  emptyToastText,
  endingHint,
  filterShelfRows,
  formatNumber,
  formatShelfDate,
  monthTile,
  receiptToastText,
  resolveShelfShortcut,
  shelfChipCount,
  shelfMonthRate,
  shelfRowMenu,
  shelfStatusLine,
  shelfUntil,
  sortShelfRows,
  writeOffToastText,
  type ShelfFilters,
  type ShelfSortKey,
  type ShelfStatusKey,
} from '@/lib/shelf';
import { ShelfCard } from './shelf-card';
import { ShelfFilterPanel } from './shelf-filter-panel';
import { countReorder } from '@/lib/reorder';
import { ShelfHeadMenu } from './shelf-head-menu';
import type { CountInput } from './shelf-forms';
import { ShelfLevel } from './shelf-level';
import { ShelfMarkSheet, ShelfMobileList } from './shelf-mobile';
import { ShelfReorder } from './shelf-reorder';
import { ShelfRowMenu, type ShelfMenuMode, type ShelfRowActions } from './shelf-row-menu';
import { ShelfSettingsDialog } from './shelf-settings-dialog';
import { ShelfToast, type ShelfToastData } from './shelf-toast';

export type ShelfMode = 'shelf' | 'reorder';

type ShelfViewProps = {
  shelf: ShelfApi;
  // Режим живёт в App: на телефоне «К заказу» включается из верхней панели.
  mode: ShelfMode;
  onModeChange: (mode: ShelfMode) => void;
  onGoCatalog: () => void;
  onOpenInCatalog: (row: ShelfRow) => void;
  onOpenMix: (mixId: string) => void;
  onUploadInvoice: (file: File) => void;
  // Настройки полки живут в App: на телефоне их открывают из верхней панели.
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  // Карточка, которую открыли извне (дашборд → «Заканчивается»).
  openCardId?: string;
  onCardOpened?: () => void;
};

type Toast = ShelfToastData;

const kg = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const today = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

const fullName = (row: ShelfRow) => `${row.tobacco.manufacturer} ${row.tobacco.name}`;
const SUBTITLE = 'Сколько табака осталось, расход и прогноз. Закончился — одна кнопка, остаток — когда удобно.';

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
  settingsOpen,
  onSettingsOpenChange,
  openCardId,
  onCardOpened,
}: ShelfViewProps) => {
  const { view } = shelf;
  const rows = view?.rows ?? [];
  const settings = view?.settings ?? DEFAULT_SHELF_SETTINGS;

  const isPhone = useIsPhone();
  const [query, setQuery] = useState('');
  // На телефоне полку открывают у стойки — сразу то, что заканчивается.
  const phoneDefaulted = useRef(false);
  const [status, setStatus] = useState<ShelfStatusKey>(() => {
    if (!isPhone || !view) return 'all';
    phoneDefaulted.current = true;
    return defaultMobileShelfStatus(view.counters);
  });
  const [filters, setFilters] = useState<ShelfFilters>(EMPTY_SHELF_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<ShelfSortKey>('until');
  const [activeId, setActiveId] = useState('');
  const [cardId, setCardId] = useState('');
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement; mode: ShelfMenuMode } | null>(null);
  const [pendingId, setPendingId] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheetId, setSheetId] = useState('');
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
    if (!isPhone || !view || phoneDefaulted.current) return;
    phoneDefaulted.current = true;
    setStatus(defaultMobileShelfStatus(view.counters));
  }, [isPhone, view]);

  useEffect(() => {
    if (!openCardId || !rows.some((row) => row.tobacco.id === openCardId)) return;
    onModeChange('shelf');
    setActiveId(openCardId);
    setCardId(openCardId);
    onCardOpened?.();
  }, [openCardId, rows, onCardOpened, onModeChange]);

  const reorderCount = countReorder(shelf.reorder);
  const headMenu = <ShelfHeadMenu onSettings={() => onSettingsOpenChange(true)} />;
  const settingsDialog = settingsOpen ? (
    <ShelfSettingsDialog
      settings={settings}
      interval={view?.interval}
      horizon={view?.horizon}
      onSave={shelf.saveSettings}
      onClose={() => onSettingsOpenChange(false)}
    />
  ) : null;

  const shown = useMemo(
    () => sortShelfRows(filterShelfRows(rows, { query, status, filters }), sort),
    [rows, query, status, filters, sort],
  );
  const menuRow = menu ? rows.find((row) => row.tobacco.id === menu.id) ?? null : null;
  const cardRow = cardId ? rows.find((row) => row.tobacco.id === cardId) ?? null : null;
  const sheetRow = sheetId ? rows.find((row) => row.tobacco.id === sheetId) ?? null : null;
  const activeFilters = countActiveShelfFilters(filters);

  const notify = useCallback((next: Omit<Toast, 'id'>) => {
    toastSeq.current += 1;
    setToast({ ...next, id: toastSeq.current });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  // Общая обёртка действий: одна строка за раз, ошибка — в тост.
  const run = useCallback(
    async (row: ShelfRow, action: () => Promise<Omit<Toast, 'id'> | null>) => {
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

  const onEmpty = useCallback(
    (row: ShelfRow) =>
      run(row, async () => {
        const { entryId, item } = await shelf.markEmpty(row.tobacco.id);
        return { title: fullName(row), text: emptyToastText(item), undo: () => shelf.deleteEntry(entryId) };
      }),
    [run, shelf],
  );

  // Отметка выше расчёта принимается, но отрезок в расход не идёт
  // (#shot=edge-more): это видно только по записи в истории карточки.
  const onCount = useCallback(
    (row: ShelfRow, input: CountInput) =>
      run(row, async () => {
        const { entryId, item } = await shelf.count(row.tobacco.id, input);
        const count = item.lastCount ?? { grams: 'grams' in input ? input.grams : 0, fraction: 'fraction' in input ? input.fraction : null };
        const undo = () => shelf.deleteEntry(entryId);
        if (row.leftGrams !== null && count.grams > row.leftGrams) {
          const entry = await shelf.loadCard(row.tobacco.id).then(
            (card) => card.history.find((item) => item.id === entryId),
            () => undefined,
          );
          if (entry?.excluded) return { title: fullName(row), text: countOverToastText(count, row.leftGrams), warn: true, undo };
        }
        return { title: fullName(row), text: countToastText(count), undo };
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
          text: stopped ? 'стоп для гостей, гости его больше не видят.' : item.guestAvailable ? 'стоп снят, гости снова видят табак.' : 'стоп снят.',
          undo: () => shelf.update(row.tobacco.id, { stopped: !stopped, ...(row.stopNote ? { stopNote: row.stopNote } : {}) }),
        };
      }),
    [run, shelf],
  );

  const rowActions: ShelfRowActions = {
    onEmpty,
    onCount,
    onToggleStop,
    onReceipt: (row, input) =>
      run(row, async () => {
        const item = await shelf.addReceipt(row.tobacco.id, input);
        return { title: fullName(row), text: receiptToastText(input.grams, item) };
      }),
    onWriteOff: (row, input) =>
      run(row, async () => {
        const { entryId, item } = await shelf.writeOff(row.tobacco.id, input);
        return { title: fullName(row), text: writeOffToastText(input.grams, input.reason, item), undo: () => shelf.deleteEntry(entryId) };
      }),
    onRemove: (row) =>
      run(row, async () => {
        await shelf.remove(row.tobacco.id);
        if (cardId === row.tobacco.id) setCardId('');
        return {
          title: fullName(row),
          text: 'убран с полки, история осталась.',
          undo: () => shelf.add(row.tobacco.id, row.shelfStatus === 'plan' ? 'plan' : 'active', false),
        };
      }),
  };

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

  const onUpdate = useCallback(async (row: ShelfRow, patch: ShelfPatch) => {
    await shelf.update(row.tobacco.id, patch);
  }, [shelf]);

  const onDeleteEntry = useCallback(async (_row: ShelfRow, entryId: string) => {
    await shelf.deleteEntry(entryId);
  }, [shelf]);

  // «Сколько осталось?» по клавише O — у кнопки «Осталось…» строки, иначе у «⋯».
  const openLeft = useCallback((row: ShelfRow) => {
    const tr = tableRef.current?.querySelector(`tr[data-tobacco-id="${CSS.escape(row.tobacco.id)}"]`);
    const anchor = tr?.querySelector<HTMLElement>('[data-left-anchor]') ?? tr?.querySelector<HTMLElement>('[data-menu-anchor]');
    if (anchor) setMenu({ id: row.tobacco.id, anchor, mode: 'left' });
  }, []);

  const keyboard = useRef({ shown, activeId, cardId, menu, mode, onEmpty, onCount, onUndo, openLeft });
  keyboard.current = { shown, activeId, cardId, menu, mode, onEmpty, onCount, onUndo, openLeft };

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
          if (active && shelfRowMenu(active).canEmpty) void state.onEmpty(active);
          return;
        case 'left':
          if (active && shelfRowMenu(active).canMark) {
            event.preventDefault();
            state.openLeft(active);
          }
          return;
        case 'mark':
          if (active && shelfRowMenu(active).canMark && active.fullGrams !== null) void state.onCount(active, { fraction: shortcut.fraction });
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

  const eyebrowDate = today.format(new Date()).toLocaleUpperCase('ru-RU');

  if (shelf.status !== 'error' && view && !rows.length) {
    return (
      <section className="shelf-page">
        <MasterPageHeader eyebrow="ИНВЕНТАРИЗАЦИЯ" title="Полка" subtitle={SUBTITLE} actions={headMenu} />
        <div className="shelf-empty">
          <h2>Полка пуста</h2>
          <p>
            Остаток появляется из поставок. Загрузите первый счёт поставщика — строки сопоставим с каталогом, вы проверите и
            примете. Табаки, которые уже стоят на полке, можно добавить из каталога без счёта.
          </p>
          <div className="shelf-empty__actions">
            {uploadButton}
            <button type="button" className="btn" data-variant="ghost" onClick={onGoCatalog}>
              Добавить из каталога
            </button>
          </div>
          {invoiceInput}
        </div>
        {settingsDialog}
        {toast ? <ShelfToast toast={toast} onUndo={() => void onUndo()} onClose={closeToast} /> : null}
      </section>
    );
  }

  const cardSheet = cardRow ? (
    <ShelfCard
      row={cardRow}
      settings={settings}
      loadCard={shelf.loadCard}
      onEmpty={(row) => void onEmpty(row)}
      onCount={(row, input) => void onCount(row, input)}
      onDeleteEntry={onDeleteEntry}
      onUpdate={onUpdate}
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
  const statusChip = ([key, label]: [ShelfStatusKey, string]) => (
    <button
      key={key}
      type="button"
      className={`filter-chip${status === key ? ' filter-chip--active' : ''}`}
      aria-pressed={status === key}
      onClick={() => setStatus(key)}
    >
      <span>{label}</span>
      <span className="filter-chip__count">{formatMetricValue(shelfChipCount(view, key))}</span>
    </button>
  );

  // Телефон (#215, #shot=shelf-mobile): карточки вместо таблицы, фильтры и
  // отметка остатка — в нижних шторках. Заголовок раздела — в верхней панели.
  if (isPhone) {
    return (
      <section className="shelf-page shelf-page--phone">
        <h1 className="sr-only">Полка</h1>
        {shelf.status === 'error' ? <p className="error-text">{shelf.error}</p> : null}
        {shelf.status === 'loading' && !view ? <p className="meta-line">Загружаем полку…</p> : null}

        {view && mode === 'reorder' ? (
          <ShelfReorder reorder={shelf.reorder} error={shelf.reorderError} notify={notify} onSettings={() => onSettingsOpenChange(true)} />
        ) : null}

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
              <button
                type="button"
                className="m-shelf-search__filters"
                aria-label={activeFilters ? `Фильтры и сортировка · выбрано ${activeFilters}` : 'Фильтры и сортировка'}
                aria-expanded={filtersOpen}
                data-active={activeFilters > 0}
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={18} aria-hidden />
                {activeFilters ? <span className="m-shelf-search__badge">{activeFilters}</span> : null}
              </button>
            </div>
            <div className="m-shelf-chips" role="group" aria-label="Статус на полке">
              {SHELF_MOBILE_CHIPS.map(statusChip)}
            </div>
            <p className="m-shelf-summary">{shelfMobileSummary(view)}</p>
            <ShelfMobileList
              rows={shown}
              leadDays={settings.leadDays}
              pendingId={pendingId}
              onEmpty={(row) => void onEmpty(row)}
              onUnstop={(row) => void onToggleStop(row)}
              onOpenSheet={(row) => setSheetId(row.tobacco.id)}
              onOpenCard={(row) => setCardId(row.tobacco.id)}
            />
            {!shown.length ? <p className="empty">По фильтрам ничего. Полка на месте, просто не здесь.</p> : null}
          </>
        ) : null}

        {filtersOpen ? (
          <BottomSheet label="Фильтры полки" onClose={() => setFiltersOpen(false)} className="m-filters-sheet">
            <h2 className="m-filters-sheet__title">Фильтры</h2>
            <label className="m-filters-sheet__sort">
              <span>Сортировка</span>
              <select className="select-input" value={sort} onChange={(event) => setSort(event.target.value as ShelfSortKey)}>
                {SHELF_SORT_OPTIONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <ShelfFilterPanel rows={rows} filters={filters} onChange={setFilters} />
            <div className="m-filters-sheet__actions">
              {activeFilters ? (
                <button type="button" className="btn" data-variant="ghost" onClick={() => setFilters(EMPTY_SHELF_FILTERS)}>
                  Сбросить
                </button>
              ) : null}
              <button type="button" className="btn" data-variant="primary" onClick={() => setFiltersOpen(false)}>
                Показать: {formatMetricValue(shown.length)}
              </button>
            </div>
          </BottomSheet>
        ) : null}

        {sheetRow ? (
          <ShelfMarkSheet
            row={sheetRow}
            onCount={(row, input) => {
              setSheetId('');
              void onCount(row, input);
            }}
            onEmpty={(row) => {
              setSheetId('');
              void onEmpty(row);
            }}
            onClose={() => setSheetId('')}
          />
        ) : null}
        {cardSheet}
        {settingsDialog}
        {toastNode}
      </section>
    );
  }

  const totals = view?.totals ?? { kg: 0 };

  return (
    <section className="shelf-page">
      <MasterPageHeader
        eyebrow={`ИНВЕНТАРИЗАЦИЯ · ${eyebrowDate}`}
        title="Полка"
        subtitle={SUBTITLE}
        meta={view ? `${formatCount(rows.length, ['позиция', 'позиции', 'позиций'])} · ≈ ${kg.format(totals.kg)} кг` : undefined}
        actions={
          <>
            <span className="shelf-seg" role="group" aria-label="Вид полки">
              <button type="button" aria-pressed={mode === 'shelf'} onClick={() => onModeChange('shelf')}>
                Полка
              </button>
              <button type="button" aria-pressed={mode === 'reorder'} onClick={() => onModeChange('reorder')}>
                {reorderCount === null ? 'К заказу' : `К заказу · ${formatMetricValue(reorderCount)}`}
              </button>
            </span>
            <button type="button" className="btn" data-variant="ghost" onClick={onGoCatalog}>
              Добавить из каталога
            </button>
            {uploadButton}
            {invoiceInput}
            {headMenu}
          </>
        }
      />

      {shelf.status === 'error' ? <p className="error-text">{shelf.error}</p> : null}
      {shelf.status === 'loading' && !view ? <p className="meta-line">Загружаем полку…</p> : null}

      {view ? (
        <>
          {mode === 'reorder' ? (
            <ShelfReorder reorder={shelf.reorder} error={shelf.reorderError} notify={notify} onSettings={() => onSettingsOpenChange(true)} />
          ) : null}

          {mode === 'shelf' ? (
            <>
              <MasterStatsRow
                tiles={[
                  { label: 'НА ПОЛКЕ', value: formatMetricValue(view.counters.all), hint: `≈ ${kg.format(totals.kg)} кг табака` },
                  { label: 'ЗАКАНЧИВАЕТСЯ', value: formatMetricValue(view.counters.ending), hint: endingHint(view), tone: 'warning' },
                  { label: 'ЗАКОНЧИЛИСЬ', value: formatMetricValue(view.counters.out), hint: 'держим постоянно — в «К заказу»', tone: 'danger' },
                  { label: 'В МЕСЯЦ УХОДИТ', ...monthTile(view.today, settings.bowlGrams) },
                ]}
              />

              <div className="shelf-toolbar">
                <div className="input shelf-toolbar__search">
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
                  <span className="kbd" aria-hidden="true">/</span>
                </div>
                <div className="shelf-toolbar__chips" role="group" aria-label="Статус на полке">
                  {SHELF_STATUS_CHIPS.map(statusChip)}
                </div>
                <button
                  type="button"
                  className={`filter-chip${filtersOpen || activeFilters ? ' filter-chip--active' : ''}`}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((current) => !current)}
                >
                  <span>Фильтры</span>
                  <span className="filter-chip__count" hidden={!activeFilters}>
                    {activeFilters}
                  </span>
                </button>
                <label className="shelf-sort">
                  <span className="sr-only">Сортировка</span>
                  <select className="select-input" value={sort} onChange={(event) => setSort(event.target.value as ShelfSortKey)}>
                    {SHELF_SORT_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filtersOpen ? (
                <>
                  <ShelfFilterPanel rows={rows} filters={filters} onChange={setFilters} />
                  {activeFilters ? (
                    <button type="button" className="btn shelf-filters__reset" data-size="sm" data-variant="ghost" onClick={() => setFilters(EMPTY_SHELF_FILTERS)}>
                      Сбросить фильтры
                    </button>
                  ) : null}
                </>
              ) : null}

              <div className="shelf-table-shell">
                <table className="shelf-table">
                  <colgroup>
                    <col />
                    <col style={{ width: 228 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 184 }} />
                    <col style={{ width: 132 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 228 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Табак</th>
                      <th scope="col">Остаток</th>
                      <th scope="col">Расход</th>
                      <th scope="col">Хватит до</th>
                      <th scope="col">Приход</th>
                      <th scope="col" className="shelf-table__num">Миксы</th>
                      <th scope="col" aria-label="Действия" />
                    </tr>
                  </thead>
                  <tbody ref={tableRef}>
                    {shown.map((row) => {
                      const until = shelfUntil(row, settings.leadDays);
                      const line = shelfStatusLine(row);
                      const month = shelfMonthRate(row);
                      const busy = pendingId === row.tobacco.id;
                      const menuOpen = menu?.id === row.tobacco.id && menu.mode !== 'left';
                      const leftOpen = menu?.id === row.tobacco.id && menu.mode === 'left';
                      const openLeftAt = (anchor: HTMLElement) =>
                        setMenu(leftOpen ? null : { id: row.tobacco.id, anchor, mode: 'left' });
                      let primary;
                      if (row.status === 'out' || row.status === 'plan') {
                        primary = <span className="shelf-faint shelf-table__note">в «К заказу»</span>;
                      } else if (row.status === 'stop') {
                        primary = (
                          <button type="button" className="btn" data-size="sm" data-variant="ghost" disabled={busy} onClick={() => void onToggleStop(row)}>
                            Снять стоп
                          </button>
                        );
                      } else if (row.status === 'check') {
                        primary = (
                          <button
                            type="button"
                            className="btn"
                            data-size="sm"
                            data-variant="primary"
                            data-left-anchor
                            aria-expanded={leftOpen}
                            disabled={busy}
                            onClick={(event) => openLeftAt(event.currentTarget)}
                          >
                            Отметить остаток
                          </button>
                        );
                      } else {
                        primary = (
                          <>
                            <button
                              type="button"
                              className="btn"
                              data-size="sm"
                              data-variant="ghost"
                              data-left-anchor
                              aria-expanded={leftOpen}
                              disabled={busy}
                              onClick={(event) => openLeftAt(event.currentTarget)}
                            >
                              Осталось…
                            </button>
                            <button type="button" className="btn" data-size="sm" disabled={busy} onClick={() => void onEmpty(row)}>
                              Закончился
                            </button>
                          </>
                        );
                      }

                      return (
                        <tr
                          key={row.tobacco.id}
                          data-tobacco-id={row.tobacco.id}
                          data-active={row.tobacco.id === activeId}
                          onClick={() => {
                            setActiveId(row.tobacco.id);
                            setCardId(row.tobacco.id);
                          }}
                        >
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
                            <ShelfLevel row={row} />
                          </td>
                          <td>
                            {month.faint ? (
                              <span className="shelf-faint">{month.value}</span>
                            ) : month.hint ? (
                              <span className="shelf-until" title="Своих отметок ещё мало — медиана бренда">
                                <span className="shelf-num">{month.value}</span>
                                <small data-tone="faint">{month.hint}</small>
                              </span>
                            ) : (
                              <span className="shelf-num">{month.value}</span>
                            )}
                          </td>
                          <td>
                            <span className="shelf-until">
                              <span className="shelf-num" data-tone={until.tone}>
                                {until.text}
                                {until.days ? <span className="shelf-faint"> · {until.days}</span> : null}
                              </span>
                              {line && line.text !== until.text ? <small data-tone={line.tone}>{line.text}</small> : null}
                            </span>
                          </td>
                          <td>
                            {row.lastReceipt ? (
                              <span className="shelf-name shelf-name--receipt">
                                <b>
                                  {formatShelfDate(row.lastReceipt.at)}
                                  <span className="shelf-faint"> · +{formatNumber(row.lastReceipt.grams)} г</span>
                                </b>
                                <span>{row.lastReceipt.label}</span>
                              </span>
                            ) : (
                              <span className="shelf-faint">—</span>
                            )}
                          </td>
                          <td className="shelf-table__num shelf-num">
                            {row.mixCount ? formatMetricValue(row.mixCount) : <span className="shelf-faint">—</span>}
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <span className="shelf-table__actions">
                              {primary}
                              <button
                                type="button"
                                className="icon-btn"
                                data-menu-anchor
                                aria-label={`Ещё действия: ${fullName(row)}`}
                                aria-expanded={menuOpen}
                                disabled={busy}
                                onClick={(event) => setMenu(menuOpen ? null : { id: row.tobacco.id, anchor: event.currentTarget, mode: 'main' })}
                              >
                                <Ellipsis size={15} aria-hidden />
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!shown.length ? <p className="empty shelf-table__empty">По фильтрам ничего. Полка на месте, просто не здесь.</p> : null}
              </div>

              <div className="shelf-keys" aria-hidden="true">
                <span><b className="kbd">/</b> поиск</span>
                <span><b className="kbd">↑</b><b className="kbd">↓</b> строка</span>
                <span><b className="kbd">E</b> закончился</span>
                <span><b className="kbd">O</b> сколько осталось</span>
                <span><b className="kbd">1</b>–<b className="kbd">4</b> осталось ¾ ½ ⅓ ¼</span>
                <span><b className="kbd">Enter</b> карточка</span>
                <span><b className="kbd">Z</b> отменить</span>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {settingsDialog}

      {menu && menuRow ? (
        <ShelfRowMenu row={menuRow} anchor={menu.anchor} mode={menu.mode} actions={rowActions} onClose={() => setMenu(null)} />
      ) : null}

      {cardSheet}

      {toastNode}
    </section>
  );
};
