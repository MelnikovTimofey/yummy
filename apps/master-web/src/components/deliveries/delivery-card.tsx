import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { formatCount, type DeliveryCard, type DeliveryLine } from '@/contracts';
import type { DeliveriesApi, DeliveryLinePatch } from '@/hooks/use-deliveries';
import { useIsPhone } from '@/hooks/use-is-phone';
import {
  LINE_MATCH_TAG,
  acceptBarSummary,
  acceptLabel,
  deliveryHeadline,
  deliveryPhoneHead,
  deliveryStatusTag,
  deliveryTitle,
  formatDay,
  formatMoney,
  formatPrice,
  guessTobaccoFromLine,
  lineMatch,
  lineMatchHint,
  lineQty,
  localDateInput,
  parseSummary,
  receivedAtFromInput,
  sumCheck,
  tobaccosToReceive,
} from '@/lib/deliveries';
import { describeShelfError } from '@/lib/shelf';
import { AddLineDialog, CreateTobaccoDialog, DeleteDraftDialog } from './delivery-dialogs';
import { TobaccoPicker } from './tobacco-picker';
import { DeliveryActionsSheet, DeliveryLineCard, DeliveryMobileTop, ToneTag, lineSumKop } from './delivery-mobile';
import { BusyLabel, RowsSkeleton } from '@/components/ui/loading';

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
  // Телефон: «⋯» шапки ('card') или строки (её id).
  const [menu, setMenu] = useState<string | null>(null);
  const isPhone = useIsPhone();
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
        {loadError ? <p className="error-text">{loadError}</p> : <RowsSkeleton label="Загружаем поставку" />}
      </section>
    );
  }

  const draft = card.status === 'draft';
  const title = deliveryTitle(card);
  // Итог разбора — только у черновика из PDF: у ручной поставки разбора не было.
  const summary = draft && card.kind === 'invoice' ? parseSummary(card.lines) : [];
  const sum = sumCheck(card);
  const pickerLine = picker ? card.lines.find((line) => line.id === picker.lineId) ?? null : null;
  const status = draft ? { tone: 'warning' as const, text: 'черновик' } : deliveryStatusTag(card);
  const total = card.totalKop !== null ? `итог счёта ${formatMoney(card.totalKop)}` : card.lines.length ? `сумма строк ${formatMoney(card.linesSumKop)}` : '';

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

  const dateInput = (className: string, label?: string) => (
    <input
      type="date"
      className={className}
      aria-label={label}
      onClick={label ? (event) => event.currentTarget.showPicker?.() : undefined}
      value={receivedDate}
      max={localDateInput(new Date())}
      onChange={(event) => setReceivedDate(event.target.value || localDateInput(new Date()))}
    />
  );

  const sumAlert = sum.alert ? (
    <div className="deliv-alert" role="alert">
      <TriangleAlert size={16} aria-hidden />
      <p className="deliv-alert__text">
        <b>{sum.alert}.</b>{' '}
        {draft ? 'Возможно, одна строка не распозналась. Сверьте со счётом. Принять поставку можно и так.' : null}
      </p>
      {draft ? (
        <button type="button" className="btn" data-size="sm" onClick={() => setAddOpen(true)}>
          Добавить строку
        </button>
      ) : null}
    </div>
  ) : null;

  const lineToggle = (line: DeliveryLine, busy: boolean) => (
    <Toggle checked={line.arrived} label={`Пришло: строка ${line.n}`} disabled={!draft || busy} onChange={(arrived) => void patchLine(line, { arrived })} />
  );

  const isCreatedLine = (line: DeliveryLine) => Boolean(line.tobacco && created.has(line.tobacco.id) && line.matchReason === 'manual');

  // Телефон (#540, #shot=delivery): строки карточками, дата прихода плиткой,
  // «Сохранить черновик» — стрелка назад, PDF и удаление — в «⋯» шапки.
  const renderPhone = () => {
    const head = deliveryPhoneHead(card);
    const bar = acceptBarSummary(card);
    const cardMenu = [
      ...(card.hasFile ? [{ label: 'Открыть PDF', onClick: openPdf }] : []),
      ...(draft ? [{ label: 'Удалить черновик', onClick: () => setDeleteOpen(true) }] : []),
    ];
    const menuLine = menu && menu !== 'card' ? card.lines.find((line) => line.id === menu) ?? null : null;
    return (
      <>
        <DeliveryMobileTop title={head.title} onBack={onBack} onMenu={cardMenu.length ? () => setMenu('card') : null} />

        <div className="m-deliv-head">
          <span className="m-deliv-head__copy">
            <b>{head.name}</b>
            {head.sub ? <span>{head.sub}</span> : null}
          </span>
          <ToneTag tone={status.tone}>{status.text}</ToneTag>
        </div>

        <div className="m-deliv-sum">
          <div>
            <span>строк</span>
            <b className="shelf-num">{card.lines.length}</b>
          </div>
          <div>
            <span>сумма</span>
            <b className="shelf-num">{formatMoney(card.totalKop ?? card.linesSumKop)}</b>
          </div>
          {draft ? (
            // Дата словами, как в мокапе; поверх — прозрачное поле даты с системным выбором.
            <label className="m-deliv-sum__when">
              <span>пришло</span>
              <b className="shelf-num">{formatDay(receivedDate)}</b>
              {dateInput('m-deliv-sum__date', 'Пришло')}
            </label>
          ) : (
            <div>
              <span>пришло</span>
              <b className="shelf-num">{formatDay(card.receivedAt)}</b>
            </div>
          )}
        </div>

        {sumAlert}

        {card.lines.length ? (
          <ul className="m-deliv-lines" aria-label="Строки счёта">
            {card.lines.map((line) => (
              <DeliveryLineCard
                key={line.id}
                line={line}
                draft={draft}
                busy={busyLine === line.id || accepting}
                created={isCreatedLine(line)}
                pickerOpen={picker?.lineId === line.id}
                toggle={lineToggle(line, busyLine === line.id || accepting)}
                onPicker={(anchor) => setPicker(picker?.lineId === line.id ? null : { lineId: line.id, anchor })}
                onPickCandidate={() => void patchLine(line, { tobaccoId: line.candidates[0].id })}
                onCreate={() => setCreatingFor(line)}
                onMenu={() => setMenu(line.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="empty shelf-table__empty">{draft ? 'Строк пока нет. Добавьте первую строку счёта.' : 'В поставке нет строк.'}</p>
        )}

        {draft ? (
          <div>
            <button type="button" className="btn" data-variant="ghost" onClick={() => setAddOpen(true)}>
              <Plus size={16} aria-hidden />
              Добавить строку
            </button>
          </div>
        ) : null}

        {draft ? (
          <div className="deliv-footbar m-deliv-bar">
            <p className="m-deliv-bar__summary">
              <b className={bar.warn ? 'deliv-warn' : undefined}>{bar.main}</b>
              {bar.sub ? <span>{bar.sub}</span> : null}
            </p>
            <button
              type="button"
              className="btn"
              data-variant="primary"
              aria-label={acceptLabel(card.pendingLines)}
              title={card.pendingLines ? acceptLabel(card.pendingLines) : undefined}
              disabled={card.pendingLines > 0 || accepting || Boolean(busyLine) || !card.lines.length}
              onClick={() => void accept()}
              aria-busy={accepting || undefined}
            >
              <BusyLabel busy={accepting}>Принять</BusyLabel>
            </button>
          </div>
        ) : null}

        {menu === 'card' ? <DeliveryActionsSheet label={head.title} items={cardMenu} onClose={() => setMenu(null)} /> : null}
        {menuLine ? (
          <DeliveryActionsSheet
            label={`Строка ${menuLine.n}`}
            items={[
              ...(lineMatch(menuLine) === 'skip' ? [{ label: 'Это табак', onClick: () => void patchLine(menuLine, { kind: 'tobacco' }) }] : []),
              { label: 'Удалить строку', onClick: () => void runLine(menuLine.id, () => api.deleteLine(id, menuLine.id)) },
            ]}
            onClose={() => setMenu(null)}
          />
        ) : null}
      </>
    );
  };

  return (
    <section className={`shelf-page deliv-page${isPhone ? ' deliv-page--phone' : ''}`} aria-busy={accepting || Boolean(busyLine)}>
      {isPhone ? (
        renderPhone()
      ) : (
        <>
          <button type="button" className="btn deliv-back" data-variant="ghost" data-size="sm" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden /> Поставки
          </button>

          <MasterPageHeader
            title={title}
            subtitle={deliveryHeadline(card) || undefined}
            meta={
              <span className="deliv-meta">
                <span className={status.tone === 'ghost' ? 'tag tag--ghost' : 'tag'} data-tone={status.tone === 'ghost' ? undefined : status.tone}>
                  {status.text}
                </span>
                {total}
              </span>
            }
            actions={
              card.hasFile || draft ? (
                <>
                  {card.hasFile ? (
                    <button type="button" className="btn" data-variant="ghost" onClick={openPdf}>
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

          {summary.length ? (
            <p className="deliv-parse-line">
              {summary.map((segment, index) => (segment.strong ? <b key={index}>{segment.text}</b> : <span key={index}>{segment.text}</span>))}
            </p>
          ) : null}

          {sumAlert}

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
                  const isCreated = isCreatedLine(line);
                  const tag = isCreated ? { tone: 'info' as const, label: 'создана' } : LINE_MATCH_TAG[match];
                  const hint = isCreated ? (line.newOnShelf ? 'новый на полке' : '') : lineMatchHint(line);
                  const skip = match === 'skip';
                  const selectTone = match === 'none' ? 'danger' : match === 'suggest' || match === 'weak' ? 'warn' : undefined;
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
                                <button type="button" className="shelf-link deliv-link" disabled={busy} onClick={() => void patchLine(line, { kind: 'tobacco' })}>
                                  это табак
                                </button>
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
                                  <span className="deliv-select__value">Выбрать табак</span>
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
                            {hint || (draft && (match === 'weak' || match === 'none')) ? (
                              <small>
                                {hint}
                                {draft && match === 'weak' ? (
                                  <button
                                    type="button"
                                    className="shelf-link deliv-link"
                                    disabled={busy}
                                    onClick={() => void patchLine(line, { tobaccoId: line.candidates[0].id })}
                                  >
                                    выбрать
                                  </button>
                                ) : null}
                                {draft && match === 'none' ? (
                                  <button type="button" className="shelf-link deliv-link" disabled={busy} onClick={() => setCreatingFor(line)}>
                                    создать карточку
                                  </button>
                                ) : null}
                              </small>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td>
                        {skip ? null : (
                          <span className="tag" data-tone={tag.tone}>
                            {tag.label}
                          </span>
                        )}
                      </td>
                      <td>
                        {skip ? <span className="shelf-faint">—</span> : <span className="shelf-num">{lineQty(line)}</span>}
                      </td>
                      <td className="shelf-table__num shelf-num">{formatPrice(lineSumKop(line))}</td>
                      <td className="deliv-center">
                        {skip ? null : (
                          lineToggle(line, busy)
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
                {draft ? 'Строк пока нет. Добавьте первую строку счёта.' : 'В поставке нет строк.'}
              </p>
            ) : null}
          </div>

          {draft ? (
            <div>
              <button type="button" className="btn" data-variant="ghost" onClick={() => setAddOpen(true)}>
                Добавить строку
              </button>
            </div>
          ) : null}

          {draft ? (
            <div className="deliv-footbar">
              <p className="deliv-footbar__summary">
                <span className={sum.tone === 'ok' ? 'deliv-ok' : sum.tone === 'warn' ? 'deliv-warn' : undefined}>{sum.short}</span>
                <span>
                  Вернутся в наличие: <b>{formatCount(tobaccosToReceive(card.lines), ['табак', 'табака', 'табаков'])}</b>
                </span>
                {card.pendingLines ? (
                  <span className="deliv-warn">Без табака: {formatCount(card.pendingLines, ['строка', 'строки', 'строк'])}</span>
                ) : null}
              </p>
              <label className="deliv-date">
                Пришло
                {dateInput('deliv-date__input')}
              </label>
              <button type="button" className="btn" data-variant="ghost" onClick={onBack}>
                Сохранить черновик
              </button>
              <button
                type="button"
                className="btn"
                data-variant="primary"
                disabled={card.pendingLines > 0 || accepting || Boolean(busyLine) || !card.lines.length}
                onClick={() => void accept()}
                aria-busy={accepting || undefined}
              >
                <BusyLabel busy={accepting}>{acceptLabel(card.pendingLines)}</BusyLabel>
              </button>
            </div>
          ) : null}

        </>
      )}

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
          initial={{ ...guessTobaccoFromLine(creatingFor.rawName), lineName: '', rawName: creatingFor.rawName }}
          onClose={() => setCreatingFor(null)}
          onCreate={async (input) => {
            const tobacco = await api.createTobacco(input);
            setCard(await api.updateLine(id, creatingFor.id, { tobaccoId: tobacco.id }));
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
