import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, FileText, Trash2, TriangleAlert } from 'lucide-react';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { formatCount, type DeliveryCard, type DeliveryLine } from '@/contracts';
import type { DeliveriesApi, DeliveryLinePatch } from '@/hooks/use-deliveries';
import {
  LINE_MATCH_TAG,
  acceptLabel,
  deliveryHeadline,
  deliveryTitle,
  formatMoney,
  formatPrice,
  formatWeight,
  guessTobaccoFromLine,
  lineGramsHint,
  lineMatch,
  lineMatchHint,
  localDateInput,
  parseReceivedGrams,
  receivedAtFromInput,
  sumCheck,
  summarizeLines,
} from '@/lib/deliveries';
import { describeShelfError } from '@/lib/shelf';
import { AddLineDialog, CreateTobaccoDialog, DeleteDraftDialog } from './delivery-dialogs';
import { TobaccoPicker } from './tobacco-picker';

export type Notify = (toast: { title: string; text: string; error?: boolean; action?: { label: string; onClick: () => void } }) => void;

type DeliveryCardScreenProps = {
  api: DeliveriesApi;
  id: string;
  initial: DeliveryCard | null;
  notify: Notify;
  onBack: () => void;
  onAccepted: (card: DeliveryCard) => void;
  onDeleted: () => void;
};

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

// Приход правится на месте, если пришло не всё: сохраняем по уходу из поля или
// Enter. Пустое поле — вернуть «кол-во × граммы по счёту».
const ReceivedInput = ({ line, disabled, onSave }: { line: DeliveryLine; disabled: boolean; onSave: (grams: number | null) => void }) => {
  const shown = line.receivedGrams === null ? '' : String(line.receivedGrams);
  const [value, setValue] = useState(shown);
  useEffect(() => setValue(shown), [shown]);
  const commit = () => {
    const grams = parseReceivedGrams(value);
    if (grams === undefined || grams === line.receivedGrams) {
      setValue(shown);
      return;
    }
    onSave(grams);
  };
  return (
    <span className="deliv-grams" data-state={line.arrived ? undefined : 'off'}>
      <input
        className="deliv-grams__input"
        data-tone={line.receivedGrams === null ? 'warn' : undefined}
        inputMode="numeric"
        aria-label={`Приход строки ${line.n}, граммов`}
        value={value}
        disabled={disabled}
        placeholder="—"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <span className="shelf-faint">г</span>
    </span>
  );
};

const lineSumKop = (line: DeliveryLine) => line.sumKop ?? (line.priceKop === null ? null : line.priceKop * line.qty);

export const DeliveryCardScreen = ({ api, id, initial, notify, onBack, onAccepted, onDeleted }: DeliveryCardScreenProps) => {
  const [card, setCard] = useState<DeliveryCard | null>(initial);
  const [loadError, setLoadError] = useState('');
  const [busyLine, setBusyLine] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [receivedDate, setReceivedDate] = useState(() => localDateInput(new Date()));
  const [picker, setPicker] = useState<{ lineId: string; anchor: HTMLElement } | null>(null);
  const [creatingFor, setCreatingFor] = useState<DeliveryLine | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Карточки, созданные из строк в этом сеансе, — метка «создана» вместо «выбрано».
  const [created, setCreated] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (initial?.id === id) return;
    let alive = true;
    api
      .load(id)
      .then((next) => alive && setCard(next))
      .catch((cause) => alive && setLoadError(describeShelfError(cause)));
    return () => {
      alive = false;
    };
  }, [api, id, initial]);

  useEffect(() => {
    if (card?.receivedAt) setReceivedDate(localDateInput(new Date(card.receivedAt)));
  }, [card?.receivedAt]);

  const runLine = useCallback(
    async (lineId: string, action: () => Promise<DeliveryCard>) => {
      setPicker(null);
      setBusyLine(lineId);
      try {
        setCard(await action());
      } catch (cause) {
        notify({ title: 'Строка не сохранена', text: describeShelfError(cause), error: true });
      } finally {
        setBusyLine('');
      }
    },
    [notify],
  );

  const patchLine = (line: DeliveryLine, patch: DeliveryLinePatch) => runLine(line.id, () => api.updateLine(id, line.id, patch));

  if (!card) {
    return (
      <section className="shelf-page">
        <button type="button" className="btn deliv-back" data-variant="ghost" data-size="sm" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden /> Поставки
        </button>
        {loadError ? <p className="error-text">{loadError}</p> : <p className="meta-line">Загружаем поставку…</p>}
      </section>
    );
  }

  const draft = card.status === 'draft';
  const title = deliveryTitle(card);
  const summary = summarizeLines(card.lines);
  const sum = sumCheck(card);
  const pickerLine = picker ? card.lines.find((line) => line.id === picker.lineId) ?? null : null;
  const eyebrow = card.kind === 'start' ? 'ПОСТАВКА · СТАРТОВЫЙ ПРИХОД' : draft ? 'ПОСТАВКА · ЧЕРНОВИК' : 'ПОСТАВКА · ПРИНЯТА';

  const accept = async () => {
    setAccepting(true);
    try {
      const next = await api.accept(id, receivedAtFromInput(receivedDate));
      setCard(next);
      onAccepted(next);
    } catch (cause) {
      notify({ title: 'Поставка не принята', text: describeShelfError(cause), error: true });
      api.load(id).then(setCard).catch(() => undefined);
    } finally {
      setAccepting(false);
    }
  };

  const openPdf = () => {
    api.openFile(id).catch((cause) => notify({ title: 'PDF не открылся', text: describeShelfError(cause), error: true }));
  };

  return (
    <section className="shelf-page deliv-page" aria-busy={accepting || Boolean(busyLine)}>
      <button type="button" className="btn deliv-back" data-variant="ghost" data-size="sm" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden /> Поставки
      </button>

      <MasterPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={deliveryHeadline(card)}
        meta={card.totalKop !== null ? `итог счёта ${formatMoney(card.totalKop)}` : card.lines.length ? `сумма строк ${formatMoney(card.linesSumKop)}` : undefined}
        actions={
          card.hasFile || draft ? (
            <>
              {card.hasFile ? (
                <button type="button" className="btn" data-variant="ghost" onClick={openPdf}>
                  <FileText size={14} aria-hidden />
                  Открыть PDF
                </button>
              ) : null}
              {draft ? (
                <button type="button" className="btn" data-variant="ghost" onClick={() => setDeleteOpen(true)}>
                  Удалить черновик
                </button>
              ) : null}
            </>
          ) : undefined
        }
      />

      {card.lines.length ? (
        <div className="deliv-parse-head">
          {summary.memory ? <span className="tag" data-tone="success"><span className="tag__dot deliv-dot" />{summary.memory} по памяти</span> : null}
          {summary.catalog ? <span className="tag" data-tone="success"><span className="tag__dot deliv-dot" />{summary.catalog} по каталогу</span> : null}
          {summary.suggest ? <span className="tag" data-tone="warning"><span className="tag__dot deliv-dot" />{summary.suggest} предложено — проверьте</span> : null}
          {summary.none ? <span className="tag" data-tone="danger"><span className="tag__dot deliv-dot" />{summary.none} нет в каталоге</span> : null}
          {summary.manual ? <span className="tag" data-tone="info"><span className="tag__dot deliv-dot" />{summary.manual} выбрано вручную</span> : null}
          {summary.skip ? <span className="tag tag--ghost">{summary.skip} не табак — пропущено</span> : null}
          {draft ? (
            <span className="deliv-muted deliv-parse-head__hint">
              Подтверждённое сопоставление запомним: следующий счёт этого поставщика разберётся сам.
            </span>
          ) : null}
        </div>
      ) : null}

      {sum.alert ? (
        <div className="deliv-alert" role="alert">
          <TriangleAlert size={16} aria-hidden />
          <p className="deliv-alert__text">
            <b>{sum.alert}.</b>{' '}
            {draft ? 'Возможно, одна строка не распозналась. Сверьте со счётом — принять поставку можно и так.' : null}
          </p>
          {draft ? (
            <button type="button" className="btn" data-size="sm" onClick={() => setAddOpen(true)}>
              Добавить строку
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="shelf-table-shell">
        <table className="shelf-table deliv-lines">
          <colgroup>
            <col style={{ width: 44 }} />
            <col />
            <col style={{ width: '31%' }} />
            <col style={{ width: 118 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 104 }} />
            <col style={{ width: 76 }} />
            {draft ? <col style={{ width: 44 }} /> : null}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">№</th>
              <th scope="col">Строка счёта</th>
              <th scope="col">Табак на полке</th>
              <th scope="col" aria-label="Сопоставление" />
              <th scope="col">Приход</th>
              <th scope="col" className="shelf-table__num">Сумма</th>
              <th scope="col" className="deliv-center">Пришло</th>
              {draft ? <th scope="col" aria-label="Удалить" /> : null}
            </tr>
          </thead>
          <tbody>
            {card.lines.map((line) => {
              const match = lineMatch(line);
              const busy = busyLine === line.id || accepting;
              const isCreated = Boolean(line.tobacco && created.has(line.tobacco.id) && line.matchReason === 'manual');
              const tag = isCreated ? { tone: 'info' as const, label: 'создана' } : LINE_MATCH_TAG[match];
              const hint = isCreated ? `новая карточка каталога${line.newOnShelf ? ' · новый на полке' : ''}` : lineMatchHint(line);
              const skip = match === 'skip';
              const selectTone = match === 'none' ? 'danger' : match === 'suggest' || match === 'weak' ? 'warn' : undefined;
              const gramsHint = lineGramsHint(line);
              return (
                <tr key={line.id} data-line-id={line.id} data-match={match}>
                  <td className="shelf-faint shelf-num">{line.n}</td>
                  <td>
                    <span className={`deliv-raw${skip ? ' deliv-raw--skip' : ''}`}>{line.rawName}</span>
                  </td>
                  <td>
                    {skip ? (
                      <span className="deliv-match">
                        <span className="shelf-faint">Пропущено</span>
                        <small>
                          {hint}
                          {draft ? (
                            <>
                              {' · '}
                              <button type="button" className="shelf-link deliv-link" disabled={busy} onClick={() => void patchLine(line, { kind: 'tobacco' })}>
                                это табак
                              </button>
                            </>
                          ) : null}
                        </small>
                      </span>
                    ) : (
                      <span className="deliv-match">
                        {draft ? (
                          <button
                            type="button"
                            className="deliv-select"
                            data-tone={selectTone}
                            aria-haspopup="dialog"
                            aria-expanded={picker?.lineId === line.id}
                            aria-label={`Табак для строки ${line.n}: ${line.tobacco ? `${line.tobacco.manufacturer} ${line.tobacco.name}` : 'не выбран'}`}
                            disabled={busy}
                            onClick={(event) => setPicker(picker?.lineId === line.id ? null : { lineId: line.id, anchor: event.currentTarget })}
                          >
                            {line.tobacco ? (
                              <span className="deliv-select__value">
                                <b>{line.tobacco.name}</b> <span className="shelf-faint">{line.tobacco.manufacturer}</span>
                              </span>
                            ) : (
                              <span className="deliv-select__value">Выбрать табак…</span>
                            )}
                            <ChevronDown size={13} aria-hidden />
                          </button>
                        ) : (
                          <span className="deliv-select__value">
                            {line.tobacco ? (
                              <>
                                <b>{line.tobacco.name}</b> <span className="shelf-faint">{line.tobacco.manufacturer}</span>
                              </>
                            ) : (
                              <span className="shelf-faint">без табака</span>
                            )}
                          </span>
                        )}
                        <small>
                          {hint}
                          {draft && match === 'weak' ? (
                            <>
                              {' · '}
                              <button
                                type="button"
                                className="shelf-link deliv-link"
                                disabled={busy}
                                onClick={() => void patchLine(line, { tobaccoId: line.candidates[0].id })}
                              >
                                выбрать
                              </button>
                            </>
                          ) : null}
                          {draft && match === 'none' ? (
                            <>
                              {' · '}
                              <button type="button" className="shelf-link deliv-link" disabled={busy} onClick={() => setCreatingFor(line)}>
                                создать карточку
                              </button>
                            </>
                          ) : null}
                        </small>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={tag.tone === 'ghost' ? 'tag tag--ghost' : 'tag'} data-tone={tag.tone === 'ghost' ? undefined : tag.tone}>
                      {tag.label}
                    </span>
                  </td>
                  <td>
                    {skip ? (
                      <span className="shelf-faint">—</span>
                    ) : (
                      <span className="deliv-match">
                        {draft ? (
                          <ReceivedInput line={line} disabled={busy} onSave={(receivedGrams) => void patchLine(line, { receivedGrams })} />
                        ) : (
                          <span className="shelf-num">{line.receivedGrams === null ? '—' : `${line.receivedGrams} г`}</span>
                        )}
                        <small className={line.receivedGrams === null ? 'deliv-warn' : undefined}>{gramsHint}</small>
                      </span>
                    )}
                  </td>
                  <td className="shelf-table__num shelf-num">{formatPrice(lineSumKop(line))}</td>
                  <td className="deliv-center">
                    {skip ? null : (
                      <Toggle
                        checked={line.arrived}
                        label={`Пришло: строка ${line.n}`}
                        disabled={!draft || busy}
                        onChange={(arrived) => void patchLine(line, { arrived })}
                      />
                    )}
                  </td>
                  {draft ? (
                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Удалить строку ${line.n}`}
                        disabled={busy}
                        onClick={() => void runLine(line.id, () => api.deleteLine(id, line.id))}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!card.lines.length ? (
          <p className="empty shelf-table__empty">
            {draft ? 'Строк пока нет. Добавьте строки счёта: название, количество, цена — и табак из каталога.' : 'В поставке нет строк.'}
          </p>
        ) : null}
      </div>

      {draft ? (
        <div>
          <button type="button" className="btn" data-variant="ghost" onClick={() => setAddOpen(true)}>
            + Добавить строку
          </button>
        </div>
      ) : null}

      {draft ? (
        <div className="deliv-footbar">
          <label className="deliv-date">
            Дата прихода
            <input
              type="date"
              className="deliv-date__input"
              value={receivedDate}
              max={localDateInput(new Date())}
              onChange={(event) => setReceivedDate(event.target.value || localDateInput(new Date()))}
            />
          </label>
          <p className="deliv-footbar__summary">
            {sum.tone ? <span className={sum.tone === 'ok' ? 'deliv-ok' : 'deliv-warn'}>{sum.short}</span> : <span>{sum.short}</span>}
            {` · на полку ≈ ${formatWeight(card.gramsToReceive)}`}
            {card.pendingLines ? (
              <span className="deliv-warn">{` · без табака или граммов: ${formatCount(card.pendingLines, ['строка', 'строки', 'строк'])}`}</span>
            ) : null}
          </p>
          <button type="button" className="btn" data-variant="ghost" onClick={onBack}>
            Сохранить черновик
          </button>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            disabled={card.pendingLines > 0 || accepting || Boolean(busyLine) || !card.lines.length}
            onClick={() => void accept()}
          >
            {accepting ? 'Принимаем…' : acceptLabel(card.pendingLines)}
          </button>
        </div>
      ) : null}

      {picker && pickerLine ? (
        <TobaccoPicker
          line={pickerLine}
          anchor={picker.anchor}
          search={api.searchTobaccos}
          onPick={(tobaccoId) => void patchLine(pickerLine, { tobaccoId })}
          onClear={() => void patchLine(pickerLine, { tobaccoId: null })}
          onSkip={() => void patchLine(pickerLine, { kind: 'skip' })}
          onCreate={() => {
            setPicker(null);
            setCreatingFor(pickerLine);
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}

      {creatingFor ? (
        <CreateTobaccoDialog
          initial={{ ...guessTobaccoFromLine(creatingFor.rawName), lineName: '', grams: creatingFor.grams, rawName: creatingFor.rawName }}
          onClose={() => setCreatingFor(null)}
          onCreate={async (input, grams) => {
            const tobacco = await api.createTobacco(input);
            const line = creatingFor;
            setCard(await api.updateLine(id, line.id, { tobaccoId: tobacco.id, ...(grams !== line.grams ? { grams } : {}) }));
            setCreated((current) => new Set(current).add(tobacco.id));
            setCreatingFor(null);
          }}
        />
      ) : null}

      {addOpen ? (
        <AddLineDialog
          open
          search={api.searchTobaccos}
          onClose={() => setAddOpen(false)}
          onAdd={async (input) => {
            setCard(await api.addLine(id, input));
            setAddOpen(false);
          }}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteDraftDialog
          open
          title={title}
          onClose={() => setDeleteOpen(false)}
          onDelete={async () => {
            await api.remove(id);
            setDeleteOpen(false);
            onDeleted();
          }}
        />
      ) : null}
    </section>
  );
};
