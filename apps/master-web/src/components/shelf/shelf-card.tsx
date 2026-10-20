import { useEffect, useState } from 'react';
import { Ellipsis, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HtreviewsLink } from '@/components/ui/htreviews-link';
import { ProfileTag } from '@/components/ui/profile-tag';
import { formatCount, type ShelfCard as ShelfCardData, type ShelfRow, type ShelfSettings } from '@/contracts';
import type { ShelfPatch } from '@/hooks/use-shelf';
import {
  MARK_OPTIONS,
  describeShelfError,
  formatBowlCost,
  formatDecimal,
  formatGramPrice,
  formatGrams,
  formatNumber,
  formatOneDecimal,
  formatRate,
  packLine,
  packTitle,
  shelfUntil,
} from '@/lib/shelf';
import { ShelfActionsSheet } from './shelf-mobile';
import type { ShelfRowActions } from './shelf-row-menu';

type ShelfCardProps = {
  row: ShelfRow;
  settings: ShelfSettings;
  loadCard: (tobaccoId: string) => Promise<ShelfCardData>;
  onEmpty: (row: ShelfRow) => void;
  onMark: (row: ShelfRow, fraction: number) => void;
  onUndoEmpty: (row: ShelfRow, packId: string) => void;
  onUpdate: (row: ShelfRow, patch: ShelfPatch) => Promise<void>;
  onOpenCatalog: (row: ShelfRow) => void;
  onOpenMix: (mixId: string) => void;
  onClose: () => void;
  // Только на телефоне (#228): меню «⋯» строки здесь недоступно — его пункты в шапке карточки.
  actions?: ShelfRowActions;
};

const PACK_WEIGHTS = [25, 50, 100, 125, 200, 250, 500, 1000];

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

// Карточка табака на полке: прогноз, история банок, расход по банкам, настройки.
export const ShelfCard = ({
  row,
  settings,
  loadCard,
  onEmpty,
  onMark,
  onUndoEmpty,
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

  const packs = card?.packs ?? [];
  const numbered = packs.map((pack, index) => ({ pack, number: index + 1 }));
  const used = numbered.filter(({ pack }) => pack.usage);
  const maxUsage = Math.max(1, ...used.map(({ pack }) => pack.usage!.gramsPerDay));
  const until = shelfUntil(row, settings.leadDays);
  const days = row.daysLeft === null ? null : Math.round(row.daysLeft);
  const openGrams = row.openPacks.reduce((total, pack) => total + pack.weight * pack.fraction, 0);
  const few = row.rateKind === 'none';
  // Вернуть в работу можно только последнюю опустевшую банку — это исправление
  // ошибочной отметки, а не способ открыть несколько банок сразу.
  const latestEmptyId = packs
    .filter((pack) => pack.state === 'empty' && pack.emptiedAt)
    .sort((a, b) => b.emptiedAt!.localeCompare(a.emptiedAt!))[0]?.id;
  const hasOpen = row.openPacks.length > 0;
  const weights = PACK_WEIGHTS.includes(row.packWeight) ? PACK_WEIGHTS : [...PACK_WEIGHTS, row.packWeight].sort((a, b) => a - b);

  const untilHint = row.rateKind === 'brand' && row.rate !== null
    ? `по бренду ${row.tobacco.manufacturer}: ≈ ${formatDecimal(row.rate)} г/день`
    : days !== null
      ? `${formatCount(days, ['день', 'дня', 'дней'])} · ${days > settings.leadDays ? 'с запасом' : 'меньше срока поставки'}`
      : few
        ? 'появится вместе с расходом'
        : null;
  const remainHint = hasOpen
    ? `открытая ${formatGrams(openGrams)} + ${formatNumber(row.sealedCount)} в запасе`
    : row.sealedCount
      ? `в запасе: ${formatNumber(row.sealedCount)}`
      : 'банок нет';
  const rateHint = row.rateKind === 'own'
    ? used.length
      ? `по ${formatCount(used.length, ['банке', 'банкам', 'банкам'])} за 60 дней`
      : 'по отметкам остатка'
    : row.rateKind === 'brand'
      ? 'своих данных ещё нет — медиана бренда'
      : 'появится, когда закончится первая банка или после двух отметок';

  const tiles = [
    <Tile key="until" label="Хватит до" value={until.text} hint={untilHint} faint={until.tone === 'faint'} />,
    <Tile key="remain" label="Остаток" value={formatGrams(row.remainingGrams)} hint={remainHint} />,
    <Tile key="rate" label="Расход" value={formatRate(row)} hint={rateHint} faint={few} />,
    <Tile
      key="price"
      label="Цена грамма"
      value={formatGramPrice(card?.gramPriceKop ?? null)}
      hint={formatBowlCost(card?.bowlCostKop ?? null, settings.bowlGrams) ?? 'цены нет — появится с поставкой по счёту'}
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
              {row.tobacco.manufacturer} · {row.packWeight} г · {row.shelfStatus === 'plan' ? 'в плане' : 'на полке'}
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
          <SheetDescription className="sr-only">Карточка табака на полке: банки, расход и настройки.</SheetDescription>
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
          <div className="shelf-card__actions">
            <button type="button" className="btn" data-variant="primary" disabled={!hasOpen} onClick={() => onEmpty(row)}>
              Закончилась
            </button>
            <span className="shelf-card__marks" role="group" aria-label="Сколько осталось в открытой">
              <span className="shelf-faint">Осталось</span>
              {MARK_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="shelf-menu__frac"
                  disabled={!hasOpen}
                  aria-label={`Осталось ${option.label}`}
                  onClick={() => onMark(row, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </span>
          </div>

          <div className="shelf-card__tiles">{tiles}</div>

          {loadError ? <p className="error-text">{loadError}</p> : null}

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">Банки</h3>
            {card ? (
              numbered.length ? (
                <div className="shelf-card__packs">
                  {[...numbered].reverse().map(({ pack, number }) => (
                    <div className="shelf-card__pack" key={pack.id}>
                      <span
                        className={`shelf-pip${pack.state === 'sealed' ? ' shelf-pip--sealed' : pack.state === 'open' ? '' : ' shelf-pip--none'}`}
                      >
                        {pack.state === 'open' ? (
                          <i style={{ height: `${Math.max(6, (row.openPacks.find((item) => item.id === pack.id)?.fraction ?? 1) * 100)}%` }} />
                        ) : null}
                      </span>
                      <span className="shelf-card__pack-copy">
                        <b>{packTitle(pack, number)}</b>
                        <span>{packLine(pack)}</span>
                      </span>
                      {pack.id === latestEmptyId ? (
                        <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={() => onUndoEmpty(row, pack.id)}>
                          Вернуть в работу
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="shelf-faint shelf-card__note">Банок ещё не было.</p>
              )
            ) : loadError ? null : (
              <p className="shelf-faint shelf-card__note">Загружаем историю банок…</p>
            )}
          </section>

          {used.length ? (
            <section className="shelf-card__section">
              <h3 className="shelf-card__h3">Расход по банкам, г/день</h3>
              <div className="shelf-card__bars">
                {used.map(({ pack, number }) => (
                  <div className="shelf-card__bar" key={pack.id}>
                    <span>{formatOneDecimal(pack.usage!.gramsPerDay)}</span>
                    <i style={{ height: `${(pack.usage!.gramsPerDay / maxUsage) * 70}px` }} />
                    <small>банка {number}</small>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="shelf-card__section">
            <h3 className="shelf-card__h3">Настройки</h3>
            <div className="shelf-card__setting">
              <span>
                Фасовка по умолчанию
                <small>для банок, добавленных вручную</small>
              </span>
              <select
                className="select-input shelf-card__select"
                aria-label="Фасовка по умолчанию"
                value={row.packWeight}
                disabled={saving}
                onChange={(event) => void save({ packWeight: Number(event.target.value) })}
              >
                {weights.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight} г
                  </option>
                ))}
              </select>
            </div>
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
                <small>банки есть, но гостю не предлагать</small>
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
