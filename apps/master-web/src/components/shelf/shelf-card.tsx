import { useEffect, useState } from 'react';
import { Ellipsis, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HtreviewsLink } from '@/components/ui/htreviews-link';
import { ProfileTag } from '@/components/ui/profile-tag';
import type { InventoryTobacco, ShelfCard as ShelfCardData, ShelfRow, ShelfTrialVerdict } from '@/contracts';
import type { ShelfPatch } from '@/hooks/use-shelf';
import { arrivalLine, describeShelfError, formatShelfDate, shelfRowMenu, shelfState, trialArrival } from '@/lib/shelf';
import { ShelfAnalogsSections, ShelfCardMixes, type AnalogChange } from './shelf-analogs';
import { ShelfActionsSheet } from './shelf-mobile';
import type { ShelfRowActions } from './shelf-row-menu';
import { ShelfToggle } from './shelf-toggle';
import { TrialMark } from './shelf-trial-mark';
import { RowsSkeleton } from '@/components/ui/loading';

type ShelfCardProps = {
  row: ShelfRow;
  loadCard: (tobaccoId: string) => Promise<ShelfCardData>;
  searchCatalog: (query: string) => Promise<InventoryTobacco[]>;
  onSetAnalogs: (row: ShelfRow, ...change: Parameters<AnalogChange>) => Promise<void>;
  onEmpty: (row: ShelfRow) => void;
  onRestock: (row: ShelfRow) => void;
  onUpdate: (row: ShelfRow, patch: ShelfPatch) => Promise<void>;
  onTrialVerdict: (row: ShelfRow, verdict: ShelfTrialVerdict | null) => Promise<void>;
  onOpenCatalog: (row: ShelfRow) => void;
  onOpenMix: (mixId: string) => void;
  onClose: () => void;
  // Только на телефоне (#228): меню «⋯» строки здесь недоступно — его пункты в шапке карточки.
  actions?: ShelfRowActions;
};

// Карточка табака на полке (#518, #shot=card, card-in): наличие одной кнопкой,
// «держим постоянно» и стоп, в каких миксах табак закрыт аналогом, приходы по счетам.
// Проба (#329) и аналоги (#482) — как раньше.
export const ShelfCard = ({
  row,
  loadCard,
  searchCatalog,
  onSetAnalogs,
  onEmpty,
  onRestock,
  onUpdate,
  onTrialVerdict,
  onOpenCatalog,
  onOpenMix,
  onClose,
  actions,
}: ShelfCardProps) => {
  const [card, setCard] = useState<ShelfCardData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [stopNote, setStopNote] = useState(row.stopNote ?? '');
  const [actionsOpen, setActionsOpen] = useState(false);
  const tobaccoId = row.tobacco.id;

  // Строка обновляется после каждого действия — карточку перечитываем вместе с ней.
  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    loadCard(tobaccoId)
      .then((next) => {
        if (!cancelled) setCard(next);
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(describeShelfError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [loadCard, tobaccoId, row]);

  useEffect(() => setStopNote(row.stopNote ?? ''), [row.stopNote]);

  const save = async (patch: ShelfPatch) => {
    setSaving(true);
    setSaveError('');
    try {
      await onUpdate(row, patch);
    } catch (cause) {
      setSaveError(describeShelfError(cause));
    } finally {
      setSaving(false);
    }
  };

  const state = shelfState(row);
  const items = shelfRowMenu(row);
  const arrival = card ? trialArrival(card.arrivals) : null;

  return (
    <Sheet open onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent
        side="right"
        className="shelf-card"
        showCloseButton={false}
        // Тост с «Отменить» живёт вне шторки — клик по нему не закрывает карточку.
        onInteractOutside={(event) => {
          if ((event.target as HTMLElement | null)?.closest('.shelf-toast')) event.preventDefault();
        }}
      >
        <SheetHeader className="shelf-card__head">
          <div className="shelf-card__title-row">
            <SheetTitle className="shelf-card__title">{row.tobacco.name}</SheetTitle>
            {actions ? (
              <span className="shelf-card__head-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Действия: ${row.tobacco.manufacturer} ${row.tobacco.name}`}
                  aria-expanded={actionsOpen}
                  onClick={() => setActionsOpen(true)}
                >
                  <Ellipsis size={18} aria-hidden />
                </button>
                <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>
                  <X size={18} aria-hidden />
                </button>
              </span>
            ) : (
              <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>
                <X size={16} aria-hidden />
              </button>
            )}
          </div>
          <SheetDescription className="shelf-card__brand">{row.tobacco.manufacturer}</SheetDescription>
          <div className="shelf-card__links">
            {row.shelfStatus === 'plan' ? <span className="tag">в плане</span> : null}
            {row.tobacco.flavorProfiles.map((profile) => (
              <ProfileTag key={profile} profile={profile} />
            ))}
            <button type="button" className="shelf-link" onClick={() => onOpenCatalog(row)}>
              Карточка в каталоге
            </button>
            {row.tobacco.sourceUrl ? <HtreviewsLink href={row.tobacco.sourceUrl} /> : null}
          </div>
        </SheetHeader>

        <div className="shelf-card__body">
          <section className="shelf-card__section">
            <div className="shelf-state" role="group" aria-label="Наличие">
              <button
                type="button"
                aria-pressed={state === 'in' || state === 'stop'}
                onClick={() => (items.canRestock ? onRestock(row) : undefined)}
              >
                <i aria-hidden />
                Есть
              </button>
              <button
                type="button"
                data-tone="out"
                aria-pressed={state === 'out'}
                disabled={state === 'plan'}
                onClick={() => (items.canEmpty ? onEmpty(row) : undefined)}
              >
                <i aria-hidden />
                {state === 'out' ? `Закончился ${formatShelfDate(row.outAt)}` : 'Закончился'}
              </button>
            </div>
            {state === 'out' ? <p className="shelf-card__note shelf-faint">Вернётся в наличие сам, когда примете счёт с этим табаком.</p> : null}
            {state === 'plan' ? <p className="shelf-card__note shelf-faint">В плане. Встанет «Есть» сам, когда примете счёт с этим табаком.</p> : null}
          </section>

          {row.trial ? (
            <section className="shelf-trial" aria-label="Проба">
              <p className="shelf-trial__row shelf-trial__row--head">
                <b>Проба</b>
                {arrival ? <span className="shelf-trial__muted">{arrival}</span> : null}
              </p>
              <div className="shelf-trial__row">
                <span className="shelf-trial__muted">Как зашёл гостям в зале?</span>
                <TrialMark value={row.trialVerdict} label="Как зашёл гостям в зале" onChange={(next) => onTrialVerdict(row, next)} />
              </div>
            </section>
          ) : null}

          <section className="shelf-card__section">
            <div className="shelf-card__setting">
              <span>
                Держим постоянно
                <small>Закончится, попадёт в заявку</small>
              </span>
              <ShelfToggle checked={row.keepStocked} label="Держим постоянно" disabled={saving} onChange={(next) => void save({ keepStocked: next })} />
            </div>
            <div className="shelf-card__setting">
              <span>
                Стоп для гостей
                <small>Есть на полке, но гостю не предлагаем</small>
              </span>
              <ShelfToggle
                checked={row.stopped}
                label="Стоп для гостей"
                disabled={saving}
                onChange={(next) => void save({ stopped: next, ...(next && stopNote.trim() ? { stopNote: stopNote.trim() } : {}) })}
              />
            </div>
            {row.stopped ? (
              <form
                className="shelf-card__stop-note"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save({ stopped: true, stopNote: stopNote.trim() });
                }}
              >
                <input
                  className="text-input"
                  aria-label="Заметка к стопу"
                  placeholder="Например, до декабря"
                  value={stopNote}
                  onChange={(event) => setStopNote(event.target.value)}
                />
                <button type="submit" className="btn" data-size="sm" disabled={saving || stopNote.trim() === (row.stopNote ?? '')}>
                  Сохранить
                </button>
              </form>
            ) : null}
            {saveError ? <p className="error-text">{saveError}</p> : null}
          </section>

          {loadError ? <p className="error-text">{loadError}</p> : null}

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">В миксах</h3>
            {card?.mixes.length ? (
              <ShelfCardMixes mixes={card.mixes} onOpenMix={onOpenMix} />
            ) : card ? (
              <p className="shelf-faint shelf-card__note">Ни в одном миксе.</p>
            ) : loadError ? null : (
              <RowsSkeleton label="Загружаем миксы" rows={3} />
            )}
          </section>

          <ShelfAnalogsSections row={row} card={card} searchCatalog={searchCatalog} onChange={(ids, added) => onSetAnalogs(row, ids, added)} />

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">Приходы</h3>
            {card ? (
              card.arrivals.length ? (
                <ul className="shelf-card-list">
                  {card.arrivals.map((item, index) => {
                    const line = arrivalLine(item);
                    return (
                      <li key={index} className="shelf-card-list__item">
                        <span>{line.title}</span>
                        <span className="shelf-card-list__note">{line.detail}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="shelf-faint shelf-card__note">Приходов ещё не было.</p>
              )
            ) : null}
          </section>
        </div>
      </SheetContent>
      {actions && actionsOpen ? <ShelfActionsSheet row={row} actions={actions} onClose={() => setActionsOpen(false)} /> : null}
    </Sheet>
  );
};
