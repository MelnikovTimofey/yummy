import type { ReactNode } from 'react';
import { ArrowLeft, Ellipsis } from 'lucide-react';
import type { DeliveryLine, DeliveryListItem } from '@/contracts';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LINE_MATCH_TAG, deliveryListCard, deliveryStatusTag, formatMoney, lineMatch, lineMatchHint, lineQty, type TagTone } from '@/lib/deliveries';

// «Поставки» на телефоне (#540, #shot=deliveries, delivery): счета и строки
// счёта карточками вместо таблиц, действия — те же, что у таблиц.

export const ToneTag = ({ tone, children }: { tone: TagTone; children: string }) => (
  <span className={tone === 'ghost' ? 'tag tag--ghost' : 'tag'} data-tone={tone === 'ghost' ? undefined : tone}>
    {children}
  </span>
);

export const DeliveryMobileList = ({ items, onOpen }: { items: DeliveryListItem[]; onOpen: (item: DeliveryListItem) => void }) => (
  <ul className="m-deliv-list" aria-label="Счета">
    {items.map((item) => {
      const view = deliveryListCard(item);
      const tag = deliveryStatusTag(item);
      return (
        <li key={item.id}>
          <button type="button" className="m-deliv-card" data-delivery-id={item.id} onClick={() => onOpen(item)}>
            <span className="m-deliv-card__head">
              <span className="m-deliv-card__copy">
                <b>{view.title}</b>
                <span>{view.sub}</span>
              </span>
              <ToneTag tone={tag.tone}>{tag.text}</ToneTag>
            </span>
            <span className="m-deliv-card__foot">
              <span>{view.lines}</span>
              <span className="shelf-num">{view.sum}</span>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

// Своя шапка карточки счёта: стрелка назад и «⋯» вместо шапки раздела.
export const DeliveryMobileTop = ({ title, onBack, onMenu }: { title: string; onBack: () => void; onMenu: (() => void) | null }) => (
  <header className="m-topbar m-deliv-top">
    <button type="button" className="icon-btn m-topbar__action" aria-label="Назад к поставкам" onClick={onBack}>
      <ArrowLeft size={20} aria-hidden />
    </button>
    <h1 className="m-topbar__title">{title}</h1>
    {onMenu ? (
      <button type="button" className="icon-btn m-topbar__action" aria-label="Действия со счётом" onClick={onMenu}>
        <Ellipsis size={20} aria-hidden />
      </button>
    ) : null}
  </header>
);

export type MenuItem = { label: string; onClick: () => void };

export const DeliveryActionsSheet = ({ label, items, onClose }: { label: string; items: MenuItem[]; onClose: () => void }) => (
  <BottomSheet label={label} onClose={onClose} className="m-actions">
    <div className="m-actions__list">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="m-actions__item"
          onClick={() => {
            onClose();
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  </BottomSheet>
);

export const lineSumKop = (line: DeliveryLine) => line.sumKop ?? (line.priceKop === null ? null : line.priceKop * line.qty);

type DeliveryLineCardProps = {
  line: DeliveryLine;
  draft: boolean;
  busy: boolean;
  created: boolean;
  pickerOpen: boolean;
  toggle: ReactNode;
  onPicker: (anchor: HTMLElement) => void;
  onPickCandidate: () => void;
  onCreate: () => void;
  onMenu: () => void;
};

export const DeliveryLineCard = ({ line, draft, busy, created, pickerOpen, toggle, onPicker, onPickCandidate, onCreate, onMenu }: DeliveryLineCardProps) => {
  const match = lineMatch(line);
  const skip = match === 'skip';
  const tag = created ? { tone: 'info' as const, label: 'создана' } : LINE_MATCH_TAG[match];
  const needsTobacco = match === 'none' || match === 'weak';
  // Подсказка нужна, только когда за ней действие: «похоже на …» у слабого совпадения.
  const hint = match === 'weak' ? lineMatchHint(line) : '';
  const tobaccoName = line.tobacco ? (
    <>
      <b>{line.tobacco.name}</b> <span className="shelf-faint">{line.tobacco.manufacturer}</span>
    </>
  ) : null;

  return (
    <li className="m-deliv-line" data-line-id={line.id} data-match={match} data-warn={draft && needsTobacco ? true : undefined}>
      <div className="m-deliv-line__head">
        <span className="m-deliv-line__copy">
          <span className="m-deliv-line__raw">{line.rawName}</span>
          {tobaccoName ? (
            draft && !skip ? (
              <button
                type="button"
                className="m-deliv-line__tobacco"
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                aria-label={`Табак для строки ${line.n}: ${line.tobacco!.manufacturer} ${line.tobacco!.name}`}
                disabled={busy}
                onClick={(event) => onPicker(event.currentTarget)}
              >
                {tobaccoName}
              </button>
            ) : (
              <span className="m-deliv-line__tobacco">{tobaccoName}</span>
            )
          ) : null}
          {draft && hint ? (
            <small className="m-deliv-line__hint">
              {hint}
              {match === 'weak' ? (
                <button type="button" className="shelf-link deliv-link" disabled={busy} onClick={onPickCandidate}>
                  выбрать
                </button>
              ) : null}
            </small>
          ) : null}
        </span>
        <span className="m-deliv-line__nums shelf-num">
          {skip ? null : <span>{lineQty(line)}</span>}
          <span>{formatMoney(lineSumKop(line))}</span>
        </span>
      </div>
      <div className="m-deliv-line__foot">
        <ToneTag tone={tag.tone}>{tag.label}</ToneTag>
        <span className="m-deliv-line__end">
          {skip ? null : (
            <span className="m-deliv-line__arrived">
              <span aria-hidden="true">Пришло</span>
              {toggle}
            </span>
          )}
          {draft ? (
            <button type="button" className="icon-btn m-deliv-line__menu" aria-label={`Действия: строка ${line.n}`} disabled={busy} onClick={onMenu}>
              <Ellipsis size={18} aria-hidden />
            </button>
          ) : null}
        </span>
      </div>
      {draft && needsTobacco ? (
        <div className="m-deliv-line__acts">
          <button
            type="button"
            className="btn"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            disabled={busy}
            onClick={(event) => onPicker(event.currentTarget)}
          >
            Выбрать табак
          </button>
          {match === 'none' ? (
            <button type="button" className="btn" data-variant="ghost" disabled={busy} onClick={onCreate}>
              Создать карточку
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};
