import { useCallback, useRef, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { optimisticEmpty } from '@/lib/shelf-bulk';
import {
  buildInventoryRequestQuery,
  defaultInventoryListResponse,
  normalizeInventoryListResponse,
  normalizeShelfAnalogsResponse,
  normalizeShelfBatchUndoResponse,
  normalizeShelfCard,
  normalizeShelfEmptyManyResponse,
  normalizeShelfRestockManyResponse,
  normalizeShelfRestockResponse,
  normalizeShelfOrder,
  normalizeShelfRow,
  normalizeShelfView,
  readEntityPayload,
  type ShelfOrder,
  type ShelfRow,
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

const itemOf = (value: unknown) => normalizeShelfRow(value && typeof value === 'object' ? (value as { item?: unknown }).item : null);

// Полка грузится одним запросом; после действия строка приходит с сервера и
// встаёт на место, без перезагрузки всей полки. «К заказу» (#518) считает сервер
// по всей полке, поэтому его перечитываем вместе с полкой и после каждого действия.
export const useShelf = (token: string) => {
  const [view, setView] = useState<ShelfView | null>(null);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');
  const [order, setOrder] = useState<ShelfOrder | null>(null);
  const [orderError, setOrderError] = useState('');
  const orderGuard = useRef(createLatestRequestGuard()).current;

  const loadOrder = useCallback(async (nextToken: string = token) => {
    const ticket = orderGuard.start();
    try {
      const next = normalizeShelfOrder(await requestJson<unknown>('/staff/shelf/order', {}, nextToken));
      if (orderGuard.isStale(ticket)) return;
      setOrder(next);
      setOrderError('');
    } catch (cause) {
      if (orderGuard.isStale(ticket)) return;
      setOrderError(cause instanceof Error ? cause.message : 'Не удалось загрузить «К заказу»');
    }
  }, [orderGuard, token]);

  const reload = useCallback(async (nextToken: string = token) => {
    setStatus('loading');
    setError('');
    void loadOrder(nextToken);
    try {
      setView(normalizeShelfView(await requestJson<unknown>('/staff/shelf', {}, nextToken)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить полку');
    }
  }, [loadOrder, token]);

  // Строки с сервера (или оптимистичные) — на место.
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
      return { ...current, rows };
    });
  }, []);

  const applyRows = useCallback((items: ShelfRow[]) => {
    putRows(items);
    void loadOrder();
    return items;
  }, [loadOrder, putRows]);

  const send = useCallback(
    async (path: string, init: RequestInit) =>
      applyRows([normalizeShelfRow(readEntityPayload(await requestJson<unknown>(path, init, token)))])[0],
    [applyRows, token],
  );

  const update = useCallback((tobaccoId: string, patch: ShelfPatch) => send(shelfPath(tobaccoId), json('PATCH', patch)), [send]);

  // «Закончился»: пакет из одного табака, отмена — по пакету (undoBatch).
  const markEmpty = useCallback(async (tobaccoId: string) => {
    const response = await requestJson<unknown>(`${shelfPath(tobaccoId)}/empty`, json('POST'), token);
    const batchId = String((response as { batchId?: unknown } | null)?.batchId ?? '');
    return { batchId, item: applyRows([itemOf(response)])[0] };
  }, [applyRows, token]);

  // «Вернуть в наличие» (#518): пакет из одного табака, отмена — по пакету.
  const restock = useCallback(async (tobaccoId: string) => {
    const response = normalizeShelfRestockResponse(await requestJson<unknown>(`${shelfPath(tobaccoId)}/restock`, json('POST'), token));
    applyRows([response.item]);
    return response;
  }, [applyRows, token]);

  const undoRestock = useCallback(async (batchId: string) => {
    const { items } = normalizeShelfBatchUndoResponse(
      await requestJson<unknown>(`/staff/shelf/restock-batches/${encodeURIComponent(batchId)}`, json('DELETE'), token),
    );
    return applyRows(items);
  }, [applyRows, token]);

  // «Закончились» разом (#333): строки гаснут сразу, ошибка — возвращаем как были.
  const emptyMany = useCallback(async (rows: ShelfRow[]) => {
    const at = new Date().toISOString();
    putRows(rows.map((row) => (row.outAt || row.shelfStatus === 'plan' ? row : optimisticEmpty(row, at))));
    try {
      const response = normalizeShelfEmptyManyResponse(
        await requestJson<unknown>('/staff/shelf/empty', json('POST', { tobaccoIds: rows.map((row) => row.tobacco.id) }), token),
      );
      applyRows(response.items);
      return response;
    } catch (cause) {
      putRows(rows);
      throw cause;
    }
  }, [applyRows, putRows, token]);

  // Одна отмена на весь пакет «Закончились».
  const undoBatch = useCallback(async (batchId: string) => {
    const { items } = normalizeShelfBatchUndoResponse(
      await requestJson<unknown>(`/staff/shelf/batches/${encodeURIComponent(batchId)}`, json('DELETE'), token),
    );
    return applyRows(items);
  }, [applyRows, token]);

  const restockMany = useCallback(async (tobaccoIds: string[]) => {
    const response = normalizeShelfRestockManyResponse(
      await requestJson<unknown>('/staff/shelf/restock', json('POST', { tobaccoIds }), token),
    );
    applyRows(response.items);
    return response;
  }, [applyRows, token]);

  // «Держать постоянно» пачкой одним запросом.
  const keepMany = useCallback(async (tobaccoIds: string[], keepStocked: boolean) => {
    const { items } = normalizeShelfBatchUndoResponse(
      await requestJson<unknown>('/staff/shelf/keep', json('POST', { tobaccoIds, keepStocked }), token),
    );
    return applyRows(items);
  }, [applyRows, token]);

  // Стоп для нескольких: пакетного эндпоинта нет — по PATCH на табак, а строки и
  // «К заказу» обновляются один раз в конце.
  const sendMany = useCallback(async (requests: Array<() => Promise<unknown>>) => {
    const results = await Promise.allSettled(requests.map(async (request) => normalizeShelfRow(readEntityPayload(await request()))));
    const items = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failed = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
    applyRows(items);
    return { items, failed };
  }, [applyRows]);
  const updateMany = useCallback(
    (tobaccoIds: string[], patch: ShelfPatch) =>
      sendMany(tobaccoIds.map((tobaccoId) => () => requestJson<unknown>(shelfPath(tobaccoId), json('PATCH', patch), token))),
    [sendMany, token],
  );

  const remove = useCallback((tobaccoId: string) => send(shelfPath(tobaccoId), json('DELETE')), [send]);

  // «Убрать с полки» для нескольких (#517) и его отмена — тоже по запросу на табак.
  const removeMany = useCallback(
    (tobaccoIds: string[]) => sendMany(tobaccoIds.map((tobaccoId) => () => requestJson<unknown>(shelfPath(tobaccoId), json('DELETE'), token))),
    [sendMany, token],
  );
  // Отмена: строки возвращаются как были — наличие убранной строки сервер не трогает.
  const restoreMany = useCallback(
    (rows: ShelfRow[]) =>
      sendMany(rows.map((row) => () =>
        requestJson<unknown>('/staff/shelf', json('POST', { tobaccoId: row.tobacco.id, status: row.shelfStatus === 'plan' ? 'plan' : 'active' }), token),
      )),
    [sendMany, token],
  );

  // «На полку» из каталога: табак держим — значит, он есть. Новая строка без прихода
  // приходит «Закончился» — возвращаем её в наличие. Отмена «Убрать с полки» возвращает
  // строку как была (restock = false).
  const add = useCallback(async (tobaccoId: string, shelfStatus: 'active' | 'plan' = 'active', restockNew = true) => {
    const item = await send('/staff/shelf', json('POST', { tobaccoId, status: shelfStatus }));
    if (restockNew && shelfStatus === 'active' && item.outAt) return (await restock(tobaccoId)).item;
    return item;
  }, [restock, send]);

  const loadCard = useCallback(
    async (tobaccoId: string) => normalizeShelfCard(await requestJson<unknown>(shelfPath(tobaccoId), {}, token)),
    [token],
  );

  // Аналоги взаимные (#482): меняются строки и самого табака, и его аналогов, поэтому
  // после записи полку перечитываем целиком, без скелета.
  const setAnalogs = useCallback(async (tobaccoId: string, analogs: string[]) => {
    const response = normalizeShelfAnalogsResponse(
      await requestJson<unknown>(`${shelfPath(tobaccoId)}/analogs`, json('PUT', { analogs }), token),
    );
    putRows([response.item]);
    try {
      setView(normalizeShelfView(await requestJson<unknown>('/staff/shelf', {}, token)));
    } catch {
      // Строка самого табака уже на месте; соседние обновятся при следующей загрузке.
    }
    return response;
  }, [putRows, token]);

  // «Добавить аналог» ищет по всему каталогу, не только по полке.
  const searchCatalog = useCallback(async (query: string) => {
    const filters = { ...defaultInventoryListResponse.filters, search: query };
    const params = buildInventoryRequestQuery(filters, defaultInventoryListResponse.sort, 1, 8);
    return normalizeInventoryListResponse(await requestJson<unknown>(`/staff/inventory/tobaccos?${params}`, {}, token)).items;
  }, [token]);

  const reset = useCallback(() => {
    orderGuard.start();
    setView(null);
    setStatus('idle');
    setError('');
    setOrder(null);
    setOrderError('');
  }, [orderGuard]);

  return {
    view,
    status,
    error,
    order,
    orderError,
    reload,
    loadOrder,
    reset,
    markEmpty,
    restock,
    undoRestock,
    update,
    emptyMany,
    undoBatch,
    restockMany,
    keepMany,
    updateMany,
    remove,
    removeMany,
    restoreMany,
    add,
    loadCard,
    setAnalogs,
    searchCatalog,
  };
};

export type ShelfApi = ReturnType<typeof useShelf>;
