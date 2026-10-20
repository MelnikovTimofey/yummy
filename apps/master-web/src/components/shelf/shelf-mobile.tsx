import { useEffect, useState, type FormEvent } from 'react';
import { Ellipsis } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ShelfCard, ShelfRow } from '@/contracts';
import { parseManualPack, shelfRowMenu, shelfStatusLine, shelfUntil } from '@/lib/shelf';
import { SHEET_MARK_OPTIONS, markTargetPack, openPackLine, sheetEmptyLabel, shelfMobileAction } from '@/lib/shelf-mobile';
import { ShelfPips } from './shelf-pips';
import type { ShelfRowActions } from './shelf-row-menu';

// «Полка» на телефоне (#215, #shot=shelf-mobile, shelf-mobile-sheet).

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
      const action = shelfMobileAction(row);
      const until = shelfUntil(row, leadDays);
      const line = shelfStatusLine(row);
      const busy = pendingId === row.tobacco.id;
      return (
        <li key={row.tobacco.id} className="m-shelf-card" data-tobacco-id={row.tobacco.id}>
          <button type="button" className="m-shelf-card__name shelf-name" onClick={() => onOpenCard(row)}>
            <b>{row.tobacco.name}</b>
            <span>
              {row.tobacco.manufacturer} · {row.packWeight} г
            </span>
          </button>
          {action.kind === 'none' ? (
            <span className="m-shelf-card__note shelf-faint">{action.label}</span>
          ) : (
            <button
              type="button"
              className="m-shelf-card__primary"
              disabled={busy || action.disabled}
              onClick={() => {
                if (action.kind === 'empty') onEmpty(row);
                else if (action.kind === 'check') onOpenSheet(row);
                else onUnstop(row);
              }}
            >
              {action.label}
            </button>
          )}
          <div className="m-shelf-card__meta">
            <button type="button" className="m-shelf-card__pips" aria-label={`Сколько осталось: ${fullName(row)}`} onClick={() => onOpenSheet(row)}>
              <ShelfPips row={row} />
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
          </div>
        </li>
      );
    })}
  </ul>
);

type ShelfMarkSheetProps = {
  row: ShelfRow;
  loadCard: (tobaccoId: string) => Promise<ShelfCard>;
  onMark: (row: ShelfRow, fraction: number) => void;
  onEmpty: (row: ShelfRow) => void;
  onClose: () => void;
};

// Шторка «Сколько осталось?»: отметка — по желанию, «Закончилась» — крупно.
export const ShelfMarkSheet = ({ row, loadCard, onMark, onEmpty, onClose }: ShelfMarkSheetProps) => {
  const target = markTargetPack(row);
  const targetId = target?.id ?? '';
  const tobaccoId = row.tobacco.id;
  // Последняя отметка есть только в карточке — строка полки её не несёт.
  const [marks, setMarks] = useState<ShelfCard['packs'][number]['marks'] | null>(null);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    loadCard(tobaccoId)
      .then((card) => {
        if (!cancelled) setMarks(card.packs.find((pack) => pack.id === targetId)?.marks ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadCard, tobaccoId, targetId]);

  return (
    <BottomSheet label={`Сколько осталось: ${fullName(row)}`} onClose={onClose} className="m-mark-sheet">
      <div className="m-mark-sheet__head">
        <p className="m-mark-sheet__eyebrow">
          {row.tobacco.manufacturer} · {row.packWeight} г
        </p>
        <h2 className="m-mark-sheet__title">{row.tobacco.name}</h2>
        <p className="m-mark-sheet__line">{openPackLine(row, marks)}</p>
      </div>
      <div className="m-mark-sheet__marks">
        <h3 className="m-mark-sheet__h3">Сколько осталось в открытой?</h3>
        <div className="m-mark-sheet__fracs" role="group" aria-label="Сколько осталось в открытой">
          {SHEET_MARK_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className="m-mark-sheet__frac"
              disabled={!target}
              aria-label={option.hint ? `Осталось ${option.label}, ${option.hint}` : `Осталось ${option.label}`}
              onClick={() => onMark(row, option.value)}
            >
              {option.label}
              {option.hint ? <small>{option.hint}</small> : null}
            </button>
          ))}
        </div>
        <p className="m-mark-sheet__hint">Можно не отмечать — отметка только уточняет прогноз.</p>
      </div>
      {target ? (
        <button type="button" className="m-mark-sheet__empty" onClick={() => onEmpty(row)}>
          {sheetEmptyLabel(row)}
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

type ActionsMode = 'main' | 'add-pack' | 'write-off';

// Действия карточки на телефоне (#228): те же пункты, что в меню «⋯» строки
// на десктопе (#shot=shelf-menu), формы — в этой же шторке.
export const ShelfActionsSheet = ({ row, actions, onClose }: ShelfActionsSheetProps) => {
  const [mode, setMode] = useState<ActionsMode>('main');
  const [weight, setWeight] = useState(String(row.packWeight));
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const items = shelfRowMenu(row);

  const act = (run: () => void) => {
    onClose();
    run();
  };

  const submitPack = (event: FormEvent) => {
    event.preventDefault();
    const pack = parseManualPack(weight, price);
    if (pack) act(() => actions.onAddPack(row, pack));
  };

  const submitWriteOff = (event: FormEvent) => {
    event.preventDefault();
    const text = reason.trim();
    if (text) act(() => actions.onWriteOff(row, text));
  };

  const label = mode === 'add-pack' ? 'Добавить банку вручную' : mode === 'write-off' ? 'Списать банку' : `Действия: ${fullName(row)}`;

  return (
    <BottomSheet label={label} onClose={onClose} className="m-actions">
      <div className="m-mark-sheet__head">
        <p className="m-mark-sheet__eyebrow">
          {row.tobacco.manufacturer} · {row.packWeight} г
        </p>
        <h2 className="m-mark-sheet__title">{mode === 'main' ? row.tobacco.name : label}</h2>
        {mode === 'main' ? null : <p className="m-mark-sheet__line">{row.tobacco.name}</p>}
      </div>

      {mode === 'main' ? (
        <>
          <div className="m-mark-sheet__marks">
            <h3 className="m-mark-sheet__h3">Сколько осталось в открытой?</h3>
            <div className="m-mark-sheet__fracs" role="group" aria-label="Сколько осталось в открытой">
              {SHEET_MARK_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="m-mark-sheet__frac"
                  disabled={!items.canMark}
                  aria-label={option.hint ? `Осталось ${option.label}, ${option.hint}` : `Осталось ${option.label}`}
                  onClick={() => act(() => actions.onMark(row, option.value))}
                >
                  {option.label}
                  {option.hint ? <small>{option.hint}</small> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="m-actions__list">
            <button type="button" className="m-actions__item" disabled={!items.canOpenAnother} onClick={() => act(() => actions.onOpenAnother(row))}>
              Вскрыть ещё одну банку
            </button>
            <button type="button" className="m-actions__item" onClick={() => setMode('add-pack')}>
              Добавить банку вручную
            </button>
            <button type="button" className="m-actions__item" onClick={() => act(() => actions.onToggleStop(row))}>
              {items.stopLabel}
            </button>
            <button type="button" className="m-actions__item" disabled={!items.canWriteOff} onClick={() => setMode('write-off')}>
              Списать банку…
            </button>
            <button type="button" className="m-actions__item m-actions__item--sep" onClick={() => act(() => actions.onRemove(row))}>
              Убрать с полки <span className="shelf-faint">история останется</span>
            </button>
          </div>
        </>
      ) : null}

      {mode === 'add-pack' ? (
        <form className="m-actions__form" onSubmit={submitPack}>
          <label className="m-actions__field">
            <span>Вес, г</span>
            <input className="text-input" inputMode="numeric" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </label>
          <label className="m-actions__field">
            <span>Цена банки, ₽ — если известна</span>
            <input className="text-input" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <div className="m-actions__form-actions">
            <button type="button" className="btn" data-variant="ghost" onClick={() => setMode('main')}>
              Назад
            </button>
            <button type="submit" className="btn" data-variant="primary" disabled={!parseManualPack(weight, price)}>
              Добавить
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'write-off' ? (
        <form className="m-actions__form" onSubmit={submitWriteOff}>
          <p className="m-mark-sheet__hint">{items.writeOffHint}</p>
          <label className="m-actions__field">
            <span>Причина</span>
            <input className="text-input" value={reason} placeholder="Брак, пересорт, потеря" onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="m-actions__form-actions">
            <button type="button" className="btn" data-variant="ghost" onClick={() => setMode('main')}>
              Назад
            </button>
            <button type="submit" className="btn" data-variant="danger" disabled={!reason.trim()}>
              Списать
            </button>
          </div>
        </form>
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
