import { useEffect, useState } from 'react';
import { Ellipsis, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HtreviewsLink } from '@/components/ui/htreviews-link';
import { ProfileTag } from '@/components/ui/profile-tag';
import { formatCount, type ShelfCard as ShelfCardData, type ShelfRow, type ShelfSettings } from '@/contracts';
import type { ShelfPatch } from '@/hooks/use-shelf';
import {
  countedMarks,
  describeShelfError,
  formatBowlCost,
  formatDecimal,
  formatGramPrice,
  formatOneDecimal,
  formatRate,
  historyEntry,
  remainHint,
  shelfLevel,
  shelfRowMenu,
  shelfUntil,
  weekLabel,
} from '@/lib/shelf';
import { ShelfLeftPanel, type CountInput } from './shelf-forms';
import { ShelfLevel } from './shelf-level';
import { ShelfActionsSheet } from './shelf-mobile';
import type { ShelfRowActions } from './shelf-row-menu';

type ShelfCardProps = {
  row: ShelfRow;
  settings: ShelfSettings;
  loadCard: (tobaccoId: string) => Promise<ShelfCardData>;
  onEmpty: (row: ShelfRow) => void;
  onCount: (row: ShelfRow, input: CountInput) => void;
  onDeleteEntry: (row: ShelfRow, entryId: string) => Promise<void>;
  onUpdate: (row: ShelfRow, patch: ShelfPatch) => Promise<void>;
  onOpenCatalog: (row: ShelfRow) => void;
  onOpenMix: (mixId: string) => void;
  onClose: () => void;
  // Только на телефоне (#228): меню «⋯» строки здесь недоступно — его пункты в шапке карточки.
  actions?: ShelfRowActions;
};

const Tile = ({ label, value, hint, faint = false }: { label: string; value: string; hint?: string | null; faint?: boolean }) => (
  <div className="shelf-card__tile">
    <span>{label}</span>
    <b className={faint ? 'shelf-faint' : undefined}>{value}</b>
    {hint ? <small>{hint}</small> : null}
  </div>
);

const Toggle = ({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled?: boolean; onChange: (next: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={`toggle ${checked ? 'toggle--on' : 'toggle--off'}`}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle__track" aria-hidden="true">
      <span className="toggle__thumb" />
    </span>
  </button>
);

// Карточка табака на полке (#306, #shot=shelf-drawer, edge-few): остаток,
// прогноз, история журнала, расход по неделям, настройки.
export const ShelfCard = ({
  row,
  settings,
  loadCard,
  onEmpty,
  onCount,
  onDeleteEntry,
  onUpdate,
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
  const [leftOpen, setLeftOpen] = useState(false);
  const [entryMenu, setEntryMenu] = useState('');
  const [entryError, setEntryError] = useState('');
  const [deleting, setDeleting] = useState('');
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

  const deleteEntry = async (entryId: string) => {
    setEntryMenu('');
    setEntryError('');
    setDeleting(entryId);
    try {
      await onDeleteEntry(row, entryId);
    } catch (cause) {
      setEntryError(describeShelfError(cause));
    } finally {
      setDeleting('');
    }
  };

  const items = shelfRowMenu(row);
  const until = shelfUntil(row, settings.leadDays);
  const days = row.daysLeft === null ? null : Math.round(row.daysLeft);
  const few = row.rateKind === 'none';
  const marks = card ? countedMarks(card.history) : 0;
  const weeks = card?.weekly ?? [];
  const maxWeek = Math.max(0, ...weeks.map((week) => week.gramsPerDay));

  const untilHint = row.rateKind === 'brand' && row.rate !== null
    ? `по бренду ${row.tobacco.manufacturer}: ≈ ${formatDecimal(row.rate)} г/день`
    : days !== null
      ? formatCount(days, ['день', 'дня', 'дней'])
      : few
        ? 'появится вместе с расходом'
        : null;
  const rateHint = row.rateKind === 'own'
    ? marks
      ? `по ${formatCount(marks, ['отметке', 'отметкам', 'отметкам'])} за 60 дней`
      : 'по отметкам остатка'
    : row.rateKind === 'brand'
      ? 'своих отметок ещё мало — медиана бренда'
      : 'появится после первой отметки остатка или «Закончился»';

  const tiles = [
    <Tile key="until" label="Хватит до" value={until.text} hint={untilHint} faint={until.tone === 'faint'} />,
    <Tile key="remain" label="Остаток" value={shelfLevel(row).value} hint={remainHint(row)} />,
    <Tile key="rate" label="Расход" value={formatRate(row)} hint={rateHint} faint={few} />,
    <Tile
      key="price"
      label="Цена грамма"
      value={formatGramPrice(card?.gramPriceKop ?? null)}
      hint={formatBowlCost(card?.bowlCostKop ?? null, settings.bowlGrams) ?? 'цены нет — появится с приходом по счёту'}
    />,
  ];
  if (few) tiles.unshift(tiles.splice(2, 1)[0]);

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
          <div className="shelf-card__eyebrow-row">
            <p className="shelf-card__eyebrow">
              {row.tobacco.manufacturer} · {row.shelfStatus === 'plan' ? 'в плане' : 'на полке'}
            </p>
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
          <SheetTitle className="shelf-card__title">{row.tobacco.name}</SheetTitle>
          <SheetDescription className="sr-only">Карточка табака на полке: остаток, история, расход и настройки.</SheetDescription>
          <div className="shelf-card__links">
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
          <div className="shelf-card__level">
            <ShelfLevel row={row} large />
            <div className="shelf-card__actions">
              <button type="button" className="btn" data-variant="primary" disabled={!items.canEmpty} onClick={() => onEmpty(row)}>
                Закончился
              </button>
              <button
                type="button"
                className="btn"
                aria-expanded={leftOpen}
                disabled={!items.canMark}
                onClick={() => setLeftOpen((current) => !current)}
              >
                Сколько осталось…
              </button>
            </div>
            {leftOpen && items.canMark ? (
              <div className="shelf-card__left">
                <ShelfLeftPanel
                  row={row}
                  onCount={(input) => {
                    setLeftOpen(false);
                    onCount(row, input);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="shelf-card__tiles">{tiles}</div>

          {loadError ? <p className="error-text">{loadError}</p> : null}

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">История</h3>
            {card ? (
              card.history.length ? (
                <div className="shelf-history">
                  {card.history.map((entry) => {
                    const line = historyEntry(entry);
                    const open = entryMenu === entry.id;
                    return (
                      <div className="shelf-history__item" key={entry.id}>
                        <span className="shelf-history__grams" data-tone={line.tone}>
                          {line.grams}
                        </span>
                        <span className="shelf-history__copy">
                          <b>{line.title}</b>
                          <span>{line.line}</span>
                        </span>
                        {line.deletable ? (
                          <span className="shelf-history__actions">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Действия с записью: ${line.title}`}
                              aria-expanded={open}
                              disabled={deleting === entry.id}
                              onClick={() => setEntryMenu(open ? '' : entry.id)}
                            >
                              <Ellipsis size={14} aria-hidden />
                            </button>
                            {open ? (
                              <span className="shelf-menu shelf-history__menu">
                                <button type="button" className="shelf-menu__item shelf-menu__item--danger" onClick={() => void deleteEntry(entry.id)}>
                                  Удалить <span className="shelf-faint">остаток пересчитается</span>
                                </button>
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="shelf-faint shelf-card__note">Записей ещё не было.</p>
              )
            ) : loadError ? null : (
              <p className="shelf-faint shelf-card__note">Загружаем историю…</p>
            )}
            {entryError ? <p className="error-text">{entryError}</p> : null}
          </section>

          {maxWeek > 0 ? (
            <section className="shelf-card__section">
              <h3 className="shelf-card__h3">Расход по неделям, г/день</h3>
              <div className="shelf-card__bars">
                {weeks.map((week) => (
                  <div className="shelf-card__bar" data-partial={week.partial || undefined} key={week.from}>
                    <span>{formatOneDecimal(week.gramsPerDay)}</span>
                    <i style={{ height: `${(week.gramsPerDay / maxWeek) * 70}px` }} />
                    <small>{weekLabel(week)}</small>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">Настройки</h3>
            <div className="shelf-card__setting">
              <span>
                Держим постоянно
                <small>закончится — попадёт в «К заказу»</small>
              </span>
              <Toggle checked={row.keepStocked} label="Держим постоянно" disabled={saving} onChange={(next) => void save({ keepStocked: next })} />
            </div>
            <div className="shelf-card__setting">
              <span>
                Стоп для гостей
                <small>табак есть, но гостю не предлагать</small>
              </span>
              <Toggle
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
                  placeholder="Заметка: например, «стоп до декабря»"
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

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">В миксах</h3>
            {card?.mixes.length ? (
              card.mixes.map((mix) => (
                <button key={mix.id} type="button" className="shelf-link shelf-card__mix" onClick={() => onOpenMix(mix.id)}>
                  {mix.name}
                </button>
              ))
            ) : (
              <p className="shelf-faint shelf-card__note">{card ? 'Пока ни в одном миксе.' : '…'}</p>
            )}
          </section>
        </div>
      </SheetContent>
      {actions && actionsOpen ? <ShelfActionsSheet row={row} actions={actions} onClose={() => setActionsOpen(false)} /> : null}
    </Sheet>
  );
};
