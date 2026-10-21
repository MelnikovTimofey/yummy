import { useCallback, useRef, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { defaultReceiptGrams, summarizeShelf } from '@/lib/shelf';
import {
  normalizeReorderView,
  normalizeShelfCard,
  normalizeShelfEntryResponse,
  normalizeShelfRow,
  normalizeShelfSettings,
  normalizeShelfView,
  readEntityPayload,
  type ReorderView,
  type ShelfRow,
  type ShelfSettings,
  type ShelfView,
} from '@/contracts';

export type ShelfLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ShelfPatch = {
  stopped?: boolean;
  stopNote?: string;
  keepStocked?: boolean;
  note?: string;
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

  const applyRow = useCallback((item: ShelfRow) => {
    setView((current) => {
      if (!current) return current;
      const exists = current.rows.some((row) => row.tobacco.id === item.tobacco.id);
      const rows = item.shelfStatus === 'dropped'
        ? current.rows.filter((row) => row.tobacco.id !== item.tobacco.id)
        : exists
          ? current.rows.map((row) => (row.tobacco.id === item.tobacco.id ? item : row))
          : [...current.rows, item];
      return { ...current, rows, ...summarizeShelf(rows) };
    });
    void loadReorder();
    return item;
  }, [loadReorder]);

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
    setView(null);
    setStatus('idle');
    setError('');
    setReorder(null);
    setReorderError('');
  }, [reorderGuard]);

  return {
    view,
    status,
    error,
    reorder,
    reorderError,
    reload,
    loadReorder,
    reset,
    markEmpty,
    count,
    writeOff,
    addReceipt,
    deleteEntry,
    update,
    remove,
    add,
    loadCard,
    saveSettings,
  };
};

export type ShelfApi = ReturnType<typeof useShelf>;
