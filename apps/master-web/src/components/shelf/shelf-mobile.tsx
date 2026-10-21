import { useId, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ShelfRow } from '@/contracts';
import { MARK_OPTIONS, formatNumber, fractionGrams, parseGrams, shelfRowMenu, shelfStatusLine, shelfUntil } from '@/lib/shelf';
import { sheetLine, shelfMobileActions } from '@/lib/shelf-mobile';
import { ShelfReceiptForm, ShelfWriteOffForm, type CountInput } from './shelf-forms';
import { ShelfLevel } from './shelf-level';
import type { ShelfRowActions } from './shelf-row-menu';

// «Полка» на телефоне (#215, #306, #shot=shelf-mobile, shelf-mobile-sheet).

const fullName = (row: ShelfRow) => `${row.tobacco.manufacturer} ${row.tobacco.name}`;

type ShelfMobileListProps = {
  rows: ShelfRow[];
  leadDays: number;
  pendingId: string;
  onEmpty: (row: ShelfRow) => void;
  onUnstop: (row: ShelfRow) => void;
  onOpenSheet: (row: ShelfRow) => void;
  onOpenCard: (row: ShelfRow) => void;
};

export const ShelfMobileList = ({ rows, leadDays, pendingId, onEmpty, onUnstop, onOpenSheet, onOpenCard }: ShelfMobileListProps) => (
  <ul className="m-shelf-list" aria-label="Табаки на полке">
    {rows.map((row) => {
      const actions = shelfMobileActions(row);
      const until = shelfUntil(row, leadDays);
      const line = shelfStatusLine(row);
      const busy = pendingId === row.tobacco.id;
      return (
        <li key={row.tobacco.id} className="m-shelf-card" data-tobacco-id={row.tobacco.id}>
          <button type="button" className="m-shelf-card__name shelf-name" onClick={() => onOpenCard(row)}>
            <b>{row.tobacco.name}</b>
            <span>{row.tobacco.manufacturer}</span>
          </button>
          <span className="shelf-until m-shelf-card__until">
            {/* Прогноза нет — на телефоне без прочерка, хватает статус-строки. */}
            {until.text !== '—' ? (
              <span className="shelf-num" data-tone={until.tone}>
                {until.text}
                {until.days ? <span className="shelf-faint"> · {until.days}</span> : null}
              </span>
            ) : null}
            {line && line.text !== until.text ? <small data-tone={line.tone}>{line.text}</small> : null}
          </span>
          <div className="m-shelf-card__meta">
            <ShelfLevel row={row} />
            {actions.note ? <span className="m-shelf-card__note shelf-faint">{actions.note}</span> : null}
          </div>
          {actions.left ? (
            <div className="m-shelf-card__acts">
              <button type="button" className="m-shelf-card__left" disabled={busy} onClick={() => onOpenSheet(row)}>
                {actions.left}
              </button>
              <button
                type="button"
                className="m-shelf-card__primary"
                disabled={busy}
                onClick={() => (actions.right === 'unstop' ? onUnstop(row) : onEmpty(row))}
              >
                {actions.right === 'unstop' ? 'Снять стоп' : 'Закончился'}
              </button>
            </div>
          ) : null}
        </li>
      );
    })}
  </ul>
);

type ShelfMarkSheetProps = {
  row: ShelfRow;
  onCount: (row: ShelfRow, input: CountInput) => void;
  onEmpty: (row: ShelfRow) => void;
  onClose: () => void;
};

// Шторка «Сколько осталось?»: доля или граммы — и «Сохранить»; «Закончился» — крупно.
export const ShelfMarkSheet = ({ row, onCount, onEmpty, onClose }: ShelfMarkSheetProps) => {
  const [fraction, setFraction] = useState<number | null>(null);
  const [value, setValue] = useState('');
  const inputId = useId();
  const grams = parseGrams(value);
  const full = row.fullGrams;
  const items = shelfRowMenu(row);
  const input: CountInput | null = grams !== null ? { grams } : fraction !== null ? { fraction } : null;

  return (
    <BottomSheet label={`Сколько осталось: ${fullName(row)}`} onClose={onClose} className="m-mark-sheet">
      <div className="m-mark-sheet__head">
        <p className="m-mark-sheet__eyebrow">{row.tobacco.manufacturer}</p>
        <h2 className="m-mark-sheet__title">{row.tobacco.name}</h2>
        <p className="m-mark-sheet__line">{sheetLine(row)}</p>
      </div>
      <form
        className="m-mark-sheet__marks"
        onSubmit={(event) => {
          event.preventDefault();
          if (input) onCount(row, input);
        }}
      >
        <h3 className="m-mark-sheet__h3">Сколько осталось?</h3>
        <div className="m-mark-sheet__fracs" role="group" aria-label="Сколько осталось">
          {MARK_OPTIONS.map((option) => {
            const optionGrams = full === null ? null : fractionGrams(full, option.value);
            return (
              <button
                key={option.label}
                type="button"
                className="m-mark-sheet__frac"
                aria-pressed={fraction === option.value}
                disabled={full === null || !items.canMark}
                aria-label={optionGrams === null ? `Осталось ${option.label}` : `Осталось ${option.label}, ${optionGrams} г`}
                onClick={() => {
                  setFraction(option.value);
                  setValue('');
                }}
              >
                {option.label}
                {optionGrams === null ? null : <small>{formatNumber(optionGrams)} г</small>}
              </button>
            );
          })}
        </div>
        <label className="m-mark-sheet__h3" htmlFor={inputId}>
          Или точно, если взвесили
        </label>
        <div className="m-mark-sheet__exact">
          <span className="shelf-grams" data-on={value ? true : undefined}>
            <input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              placeholder="граммы"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setFraction(null);
              }}
            />
            <span>г</span>
          </span>
          <button type="submit" className="m-mark-sheet__save" disabled={!input || !items.canMark}>
            Сохранить
          </button>
        </div>
        <p className="m-mark-sheet__hint">Можно не отмечать — отметка только уточняет расход и прогноз.</p>
      </form>
      {items.canEmpty ? (
        <button type="button" className="m-mark-sheet__empty" onClick={() => onEmpty(row)}>
          Закончился · 0 г
        </button>
      ) : null}
    </BottomSheet>
  );
};

type ShelfActionsSheetProps = {
  row: ShelfRow;
  actions: ShelfRowActions;
  onClose: () => void;
};

type ActionsMode = 'main' | 'receipt' | 'writeoff';

// Действия карточки на телефоне (#228): те же пункты, что в меню «⋯» строки
// на десктопе (#shot=shelf-menu), формы — в этой же шторке.
export const ShelfActionsSheet = ({ row, actions, onClose }: ShelfActionsSheetProps) => {
  const [mode, setMode] = useState<ActionsMode>('main');
  const items = shelfRowMenu(row);

  const act = (run: () => void) => {
    onClose();
    run();
  };

  const label = mode === 'receipt' ? 'Приход без счёта' : mode === 'writeoff' ? 'Списать' : `Действия: ${fullName(row)}`;

  return (
    <BottomSheet label={label} onClose={onClose} className="m-actions">
      <div className="m-mark-sheet__head">
        <p className="m-mark-sheet__eyebrow">{row.tobacco.manufacturer}</p>
        <h2 className="m-mark-sheet__title">{mode === 'main' ? row.tobacco.name : label}</h2>
        {mode === 'main' ? null : <p className="m-mark-sheet__line">{row.tobacco.name}</p>}
      </div>

      {mode === 'main' ? (
        <div className="m-actions__list">
          <button type="button" className="m-actions__item" onClick={() => setMode('receipt')}>
            Добавить приход без счёта…
          </button>
          <button type="button" className="m-actions__item" disabled={!items.canWriteOff} onClick={() => setMode('writeoff')}>
            Списать…
          </button>
          <button type="button" className="m-actions__item" onClick={() => act(() => actions.onToggleStop(row))}>
            {items.stopLabel}
          </button>
          <button type="button" className="m-actions__item m-actions__item--sep" onClick={() => act(() => actions.onRemove(row))}>
            Убрать с полки <span className="shelf-faint">история останется</span>
          </button>
        </div>
      ) : null}

      {mode === 'receipt' ? (
        <ShelfReceiptForm row={row} onSubmit={(input) => act(() => actions.onReceipt(row, input))} onCancel={() => setMode('main')} autoFocus={false} />
      ) : null}
      {mode === 'writeoff' ? (
        <ShelfWriteOffForm row={row} onSubmit={(input) => act(() => actions.onWriteOff(row, input))} onCancel={() => setMode('main')} autoFocus={false} />
      ) : null}
    </BottomSheet>
  );
};

// «⋯» в верхней панели «Полки» на телефоне (#228): как меню в шапке на десктопе.
export const ShelfMobileHeadMenu = ({ onSettings }: { onSettings: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn m-topbar__action" aria-label="Меню полки" aria-expanded={open} onClick={() => setOpen(true)}>
        <Ellipsis size={18} strokeWidth={1.8} aria-hidden />
      </button>
      {open ? (
        <BottomSheet label="Меню полки" onClose={() => setOpen(false)} className="m-actions">
          <div className="m-actions__list">
            <button
              type="button"
              className="m-actions__item"
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
            >
              Настройки полки <span className="shelf-faint">чаша, срок поставки</span>
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
};
