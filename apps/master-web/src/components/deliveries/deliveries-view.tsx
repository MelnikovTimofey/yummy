import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Copy, FileUp, FileWarning } from 'lucide-react';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { ShelfToast, type ShelfToastData } from '@/components/shelf/shelf-toast';
import { formatMetricValue, type DeliveryCard } from '@/contracts';
import type { DeliveriesApi } from '@/hooks/use-deliveries';
import {
  acceptedToastTitle,
  deliveryStatusTag,
  formatDay,
  formatMoney,
  formatWeight,
  monthMeta,
  readUploadError,
  type UploadError,
} from '@/lib/deliveries';
import { DeliveryCardScreen, type Notify } from './delivery-card';
import { ManualDeliveryDialog } from './delivery-dialogs';
import { RowsSkeleton, SmokeMark } from '@/components/ui/loading';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type DeliveriesViewProps = {
  api: DeliveriesApi;
  pendingFile: File | null;
  onPendingFileTaken: () => void;
  onOpenShelf: () => void;
  onAccepted: () => void;
};

type UploadState = { file: File; error: UploadError } | null;

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export const DeliveriesView = ({ api, pendingFile, onPendingFileTaken, onOpenShelf, onAccepted }: DeliveriesViewProps) => {
  const [open, setOpen] = useState<{ id: string; card: DeliveryCard | null } | null>(null);
  const [uploading, setUploading] = useState<string>('');
  const [failure, setFailure] = useState<UploadState>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [toast, setToast] = useState<ShelfToastData | null>(null);
  const toastSeq = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { reload } = api;

  const notify: Notify = useCallback((next) => {
    toastSeq.current += 1;
    setToast({ ...next, id: toastSeq.current });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = useCallback(
    async (file: File, allowDuplicate = false) => {
      setFailure(null);
      if (!isPdf(file)) {
        setFailure({ file, error: { kind: 'other', message: 'Это не PDF. Загрузите счёт в формате PDF.' } });
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFailure({ file, error: { kind: 'other', message: 'Файл больше 5 МБ. Загрузите PDF из почты поставщика.' } });
        return;
      }
      setUploading(file.name);
      try {
        const card = await api.upload(file, allowDuplicate);
        setOpen({ id: card.id, card });
        void reload();
      } catch (cause) {
        setFailure({ file, error: readUploadError(cause) });
      } finally {
        setUploading('');
      }
    },
    [api, reload],
  );

  // Файл, выбранный на «Полке», разбираем сразу по приходу на вкладку. Ref
  // защищает от второй загрузки того же файла (StrictMode повторяет эффект).
  const takenFile = useRef<File | null>(null);
  useEffect(() => {
    if (!pendingFile || takenFile.current === pendingFile) return;
    takenFile.current = pendingFile;
    onPendingFileTaken();
    setOpen(null);
    void upload(pendingFile);
  }, [pendingFile, onPendingFileTaken, upload]);

  const backToList = useCallback(() => {
    setOpen(null);
    void reload();
  }, [reload]);

  const toastNode = toast ? <ShelfToast toast={toast} onUndo={closeToast} onClose={closeToast} /> : null;

  if (open) {
    return (
      <>
        <DeliveryCardScreen
          key={open.id}
          api={api}
          id={open.id}
          initial={open.card}
          notify={notify}
          onBack={backToList}
          onAccepted={(card) => {
            backToList();
            onAccepted();
            notify({ title: acceptedToastTitle(card.grams), text: '', action: { label: 'Открыть полку', onClick: onOpenShelf } });
          }}
          onDeleted={() => {
            backToList();
            notify({ title: 'Черновик удалён', text: '' });
          }}
        />
        {toastNode}
      </>
    );
  }

  const list = api.list;
  const items = list?.items ?? [];

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !uploading) void upload(file);
  };

  const pickFile = () => fileRef.current?.click();

  return (
    <section className="shelf-page deliv-page">
      <MasterPageHeader
        title="Поставки"
        meta={list ? monthMeta(items, new Date()) : undefined}
        actions={
          <>
            <button type="button" className="btn" data-variant="ghost" onClick={() => setManualOpen(true)}>
              Заполнить вручную
            </button>
            <button type="button" className="btn" data-variant="primary" disabled={Boolean(uploading)} onClick={pickFile}>
              <FileUp size={14} aria-hidden />
              Загрузить счёт
            </button>
          </>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        aria-label="PDF счёта"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />

      {api.status === 'error' ? <p className="error-text">{api.error}</p> : null}

      {failure ? (
        failure.error.kind === 'duplicate' ? (
          <div className="deliv-alert" role="alert">
            <Copy size={16} aria-hidden />
            <p className="deliv-alert__text">
              <b>{failure.error.message}.</b> Второй раз тот же приход не пишем.
            </p>
            <button
              type="button"
              className="btn"
              data-size="sm"
              onClick={() => {
                if (failure.error.kind !== 'duplicate') return;
                setOpen({ id: failure.error.deliveryId, card: null });
                setFailure(null);
              }}
            >
              {failure.error.deliveryStatus === 'draft' ? 'Открыть черновик' : 'Открыть принятый'}
            </button>
            <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={() => void upload(failure.file, true)}>
              Это другой счёт
            </button>
          </div>
        ) : (
          <div className="deliv-alert" data-tone="danger" role="alert">
            <FileWarning size={16} aria-hidden />
            <p className="deliv-alert__text">
              <b>Не удалось разобрать «{failure.file.name}».</b> {failure.error.message}
            </p>
            {failure.error.kind === 'unreadable' ? (
              <button type="button" className="btn" data-size="sm" onClick={() => setManualOpen(true)}>
                Заполнить вручную
              </button>
            ) : null}
            <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={pickFile}>
              Другой файл
            </button>
          </div>
        )
      ) : null}

      <div
        className="deliv-drop"
        data-state={uploading ? 'busy' : dragOver ? 'hover' : undefined}
        role="button"
        tabIndex={0}
        aria-busy={Boolean(uploading)}
        aria-label="Загрузить PDF счёта"
        onClick={() => !uploading && pickFile()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !uploading) {
            event.preventDefault();
            pickFile();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {uploading ? <SmokeMark inline /> : <FileUp size={20} aria-hidden />}
        <span role={uploading ? 'status' : undefined}>{uploading ? `Разбираем ${uploading}` : 'Перетащите PDF счёта сюда'}</span>
      </div>

      {api.status === 'loading' && !list ? <RowsSkeleton label="Загружаем поставки" /> : null}

      {list ? (
        <div className="shelf-table-shell">
          <table className="shelf-table deliv-table">
            <colgroup>
              <col style={{ width: 110 }} />
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Дата счёта</th>
                <th scope="col">Поставщик</th>
                <th scope="col">Счёт</th>
                <th scope="col" className="shelf-table__num">Строк</th>
                <th scope="col" className="shelf-table__num">Приход</th>
                <th scope="col" className="shelf-table__num">Сумма</th>
                <th scope="col">Пришло</th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const tag = deliveryStatusTag(item);
                return (
                  <tr
                    key={item.id}
                    data-delivery-id={item.id}
                    tabIndex={0}
                    onClick={() => setOpen({ id: item.id, card: null })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setOpen({ id: item.id, card: null });
                    }}
                  >
                    <td>
                      <b className="deliv-date-cell">{formatDay(item.invoiceDate ?? item.createdAt)}</b>
                    </td>
                    <td>{item.supplier ?? <span className="shelf-faint">{item.kind === 'start' ? 'без поставщика' : '—'}</span>}</td>
                    <td className="shelf-num">{item.number ? `№ ${item.number}` : <span className="shelf-faint">—</span>}</td>
                    <td className="shelf-table__num shelf-num">{formatMetricValue(item.lines)}</td>
                    <td className="shelf-table__num shelf-num">{item.grams ? formatWeight(item.grams) : <span className="shelf-faint">—</span>}</td>
                    <td className="shelf-table__num shelf-num">{formatMoney(item.totalKop)}</td>
                    <td className="shelf-num">{item.receivedAt ? formatDay(item.receivedAt) : <span className="shelf-faint">—</span>}</td>
                    <td>
                      <span className={tag.tone === 'ghost' ? 'tag tag--ghost' : 'tag'} data-tone={tag.tone === 'ghost' ? undefined : tag.tone}>
                        {tag.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length ? (
            <p className="empty shelf-table__empty">Поставок пока нет. Загрузите счёт поставщика или заполните поставку вручную.</p>
          ) : null}
        </div>
      ) : null}

      {manualOpen ? (
        <ManualDeliveryDialog
          open
          onClose={() => setManualOpen(false)}
          onCreate={async (input) => {
            const card = await api.createManual(input);
            setManualOpen(false);
            setFailure(null);
            setOpen({ id: card.id, card });
          }}
        />
      ) : null}

      {toastNode}
    </section>
  );
};
