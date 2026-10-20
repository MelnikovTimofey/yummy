import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ShelfCard, ShelfRow } from '@/contracts';
import { shelfStatusLine, shelfUntil } from '@/lib/shelf';
import { SHEET_MARK_OPTIONS, markTargetPack, openPackLine, sheetEmptyLabel, shelfMobileAction } from '@/lib/shelf-mobile';
import { ShelfPips } from './shelf-pips';

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
