import { useCallback, useRef, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { defaultReceiptGrams, summarizeShelf } from '@/lib/shelf';
import { optimisticEmpty } from '@/lib/shelf-bulk';
import { patchPurchase, type PurchasePatch } from '@/lib/purchase';
import {
  normalizePurchaseView,
  normalizeReorderView,
  normalizeShelfBatchUndoResponse,
  normalizeShelfCard,
  normalizeShelfEmptyManyResponse,
  normalizeShelfEntryResponse,
  normalizeShelfRow,
  normalizeShelfSettings,
  normalizeShelfView,
  readEntityPayload,
  type PurchaseView,
  type ReorderView,
  type ShelfRow,
  type ShelfSettings,
  type ShelfTrialVerdict,
  type ShelfView,
} from '@/contracts';

export type ShelfLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ShelfPatch = {
  stopped?: boolean;
  stopNote?: string;
  keepStocked?: boolean;
  note?: string;
  // Отметка пробы (#329): null — снять.
  trialVerdict?: ShelfTrialVerdict | null;
};

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const shelfPath = (tobaccoId: string) => `/staff/shelf/${encodeURIComponent(tobaccoId)}`;

// Полка грузится одним запросом; после действия строка приходит с сервера,
// а счётчики пересчитываются на месте, без перезагрузки всей полки.
// «К заказу» (#213) считает сервер по всей полке, поэтому его перечитываем
// вместе с полкой и после каждого действия.
export const useShelf = (token: string) => {
  const [view, setView] = useState<ShelfView | null>(null);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');
  const [reorder, setReorder] = useState<ReorderView | null>(null);
  const [reorderError, setReorderError] = useState('');
  const reorderGuard = useRef(createLatestRequestGuard()).current;
  // «Закупка» (#327–#331) — по запросу: считается по журналу за 30–90 дней.
  const [purchase, setPurchase] = useState<PurchaseView | null>(null);
  const [purchaseError, setPurchaseError] = useState('');
  const purchaseGuard = useRef(createLatestRequestGuard()).current;

  const loadPurchase = useCallback(async () => {
    const ticket = purchaseGuard.start();
    try {
      const next = normalizePurchaseView(await requestJson<unknown>('/staff/shelf/purchase', {}, token));
      if (purchaseGuard.isStale(ticket)) return;
      setPurchase(next);
      setPurchaseError('');
    } catch (cause) {
      if (purchaseGuard.isStale(ticket)) return;
      setPurchaseError(cause instanceof Error ? cause.message : 'Не удалось загрузить «Закупку»');
    }
  }, [purchaseGuard, token]);

  // «Держим» и отметка пробы видны в «Закупке» сразу, до перечитывания.
  const patchPurchaseItem = useCallback((tobaccoId: string, patch: PurchasePatch) => {
    setPurchase((current) => (current ? patchPurchase(current, tobaccoId, patch) : current));
  }, []);

  const loadReorder = useCallback(async (nextToken: string = token) => {
    const ticket = reorderGuard.start();
    try {
      const next = normalizeReorderView(await requestJson<unknown>('/staff/shelf/reorder', {}, nextToken));
      if (reorderGuard.isStale(ticket)) return;
      setReorder(next);
      setReorderError('');
    } catch (cause) {
      if (reorderGuard.isStale(ticket)) return;
      setReorderError(cause instanceof Error ? cause.message : 'Не удалось загрузить «К заказу»');
    }
  }, [reorderGuard, token]);

  const reload = useCallback(async (nextToken: string = token) => {
    setStatus('loading');
    setError('');
    void loadReorder(nextToken);
    try {
      setView(normalizeShelfView(await requestJson<unknown>('/staff/shelf', {}, nextToken)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить полку');
    }
  }, [loadReorder, token]);

  // Строки с сервера (или оптимистичные) — на место, счётчики пересчитываются.
  const putRows = useCallback((items: ShelfRow[]) => {
    setView((current) => {
      if (!current) return current;
      let rows = current.rows;
      for (const item of items) {
        const exists = rows.some((row) => row.tobacco.id === item.tobacco.id);
        rows = item.shelfStatus === 'dropped'
          ? rows.filter((row) => row.tobacco.id !== item.tobacco.id)
          : exists
            ? rows.map((row) => (row.tobacco.id === item.tobacco.id ? item : row))
            : [...rows, item];
      }
      return { ...current, rows, ...summarizeShelf(rows) };
    });
  }, []);

  const applyRow = useCallback((item: ShelfRow) => {
    putRows([item]);
    void loadReorder();
    return item;
  }, [loadReorder, putRows]);

  const send = useCallback(
    async (path: string, init: RequestInit) => applyRow(normalizeShelfRow(readEntityPayload(await requestJson<unknown>(path, init, token)))),
    [applyRow, token],
  );

  // «Закончился», отметка и списание возвращают id записи журнала — для отмены в тосте.
  const sendEntry = useCallback(async (path: string, init: RequestInit) => {
    const response = normalizeShelfEntryResponse(await requestJson<unknown>(path, init, token));
    applyRow(response.item);
    return response;
  }, [applyRow, token]);

  const markEmpty = useCallback((tobaccoId: string) => sendEntry(`${shelfPath(tobaccoId)}/empty`, json('POST')), [sendEntry]);
  const count = useCallback(
    (tobaccoId: string, input: { fraction: number } | { grams: number }) => sendEntry(`${shelfPath(tobaccoId)}/counts`, json('POST', input)),
    [sendEntry],
  );
  const writeOff = useCallback(
    (tobaccoId: string, input: { grams: number; reason: string }) => sendEntry(`${shelfPath(tobaccoId)}/write-offs`, json('POST', input)),
    [sendEntry],
  );
  const addReceipt = useCallback(
    (tobaccoId: string, input: { grams: number; priceKop?: number }) => send(`${shelfPath(tobaccoId)}/receipts`, json('POST', input)),
    [send],
  );
  // Отмена в тосте и удаление из истории карточки.
  const deleteEntry = useCallback((entryId: string) => send(`/staff/shelf/entries/${encodeURIComponent(entryId)}`, json('DELETE')), [send]);
  const update = useCallback((tobaccoId: string, patch: ShelfPatch) => send(shelfPath(tobaccoId), json('PATCH', patch)), [send]);

  // «Закончились» разом (#333): строки гаснут сразу, ошибка — возвращаем как были.
  const emptyMany = useCallback(async (rows: ShelfRow[]) => {
    const at = new Date().toISOString();
    putRows(rows.map((row) => (row.status === 'out' || row.status === 'plan' ? row : optimisticEmpty(row, at))));
    try {
      const response = normalizeShelfEmptyManyResponse(
        await requestJson<unknown>('/staff/shelf/empty', json('POST', { tobaccoIds: rows.map((row) => row.tobacco.id) }), token),
      );
      putRows(response.items);
      void loadReorder();
      return response;
    } catch (cause) {
      putRows(rows);
      throw cause;
    }
  }, [loadReorder, putRows, token]);

  // Одна отмена на весь пакет «Закончились».
  const undoBatch = useCallback(async (batchId: string) => {
    const { items } = normalizeShelfBatchUndoResponse(
      await requestJson<unknown>(`/staff/shelf/batches/${encodeURIComponent(batchId)}`, json('DELETE'), token),
    );
    putRows(items);
    void loadReorder();
    return items;
  }, [loadReorder, putRows, token]);

  // Стоп и «держим постоянно» для нескольких: пакетного эндпоинта нет — по PATCH
  // на табак, а строки и «К заказу» обновляются один раз в конце.
  const updateMany = useCallback(async (tobaccoIds: string[], patch: ShelfPatch) => {
    const results = await Promise.allSettled(
      tobaccoIds.map(async (tobaccoId) =>
        normalizeShelfRow(readEntityPayload(await requestJson<unknown>(shelfPath(tobaccoId), json('PATCH', patch), token))),
      ),
    );
    const items = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failed = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
    putRows(items);
    void loadReorder();
    return { items, failed };
  }, [loadReorder, putRows, token]);
  const remove = useCallback((tobaccoId: string) => send(shelfPath(tobaccoId), json('DELETE')), [send]);

  // «На полку» из каталога: табак держим — значит, он есть. Сервис полки при
  // добавлении прихода не пишет, поэтому, если остатка нет, добавляем приход
  // типичной фасовки бренда — как тумблер наличия на backend. Отмена «Убрать
  // с полки» возвращает строку как была, без прихода (restock = false).
  const add = useCallback(async (tobaccoId: string, shelfStatus: 'active' | 'plan' = 'active', restock = true) => {
    const item = await send('/staff/shelf', json('POST', { tobaccoId, status: shelfStatus }));
    if (restock && shelfStatus === 'active' && item.status === 'out') {
      return addReceipt(tobaccoId, { grams: defaultReceiptGrams(item.tobacco.manufacturer) });
    }
    return item;
  }, [addReceipt, send]);

  const loadCard = useCallback(
    async (tobaccoId: string) => normalizeShelfCard(await requestJson<unknown>(shelfPath(tobaccoId), {}, token)),
    [token],
  );

  // Граммовка чаши и срок поставки меняют прогноз всей полки и «К заказу».
  const saveSettings = useCallback(async (settings: ShelfSettings) => {
    const saved = normalizeShelfSettings(await requestJson<unknown>('/staff/shelf/settings', json('PATCH', settings), token));
    await reload();
    return saved;
  }, [reload, token]);

  const reset = useCallback(() => {
    reorderGuard.start();
    purchaseGuard.start();
    setPurchase(null);
    setPurchaseError('');
    setView(null);
    setStatus('idle');
    setError('');
    setReorder(null);
    setReorderError('');
  }, [purchaseGuard, reorderGuard]);

  return {
    view,
    status,
    error,
    reorder,
    reorderError,
    purchase,
    purchaseError,
    loadPurchase,
    patchPurchaseItem,
    reload,
    loadReorder,
    reset,
    markEmpty,
    count,
    writeOff,
    addReceipt,
    deleteEntry,
    update,
    emptyMany,
    undoBatch,
    updateMany,
    remove,
    add,
    loadCard,
    saveSettings,
  };
};

export type ShelfApi = ReturnType<typeof useShelf>;
