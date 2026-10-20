import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { summarizeShelf } from '@/lib/shelf';
import {
  normalizeShelfCard,
  normalizeShelfEmptyResponse,
  normalizeShelfRow,
  normalizeShelfView,
  readEntityPayload,
  type ShelfRow,
  type ShelfView,
} from '@/contracts';

export type ShelfLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ShelfPatch = {
  stopped?: boolean;
  stopNote?: string;
  keepStocked?: boolean;
  packWeight?: number;
  note?: string;
};

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const shelfPath = (tobaccoId: string) => `/staff/shelf/${encodeURIComponent(tobaccoId)}`;
const packPath = (packId: string) => `/staff/shelf/packs/${encodeURIComponent(packId)}`;

// Полка грузится одним запросом; после действия строка приходит с сервера,
// а счётчики пересчитываются на месте, без перезагрузки всей полки.
export const useShelf = (token: string) => {
  const [view, setView] = useState<ShelfView | null>(null);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');

  const reload = useCallback(async (nextToken: string = token) => {
    setStatus('loading');
    setError('');
    try {
      setView(normalizeShelfView(await requestJson<unknown>('/staff/shelf', {}, nextToken)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить полку');
    }
  }, [token]);

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
    return item;
  }, []);

  const send = useCallback(
    async (path: string, init: RequestInit) => applyRow(normalizeShelfRow(readEntityPayload(await requestJson<unknown>(path, init, token)))),
    [applyRow, token],
  );

  const markEmpty = useCallback(async (tobaccoId: string) => {
    const response = normalizeShelfEmptyResponse(await requestJson<unknown>(`${shelfPath(tobaccoId)}/empty`, json('POST'), token));
    applyRow(response.item);
    return response;
  }, [applyRow, token]);

  const undoEmpty = useCallback((packId: string) => send(`${packPath(packId)}/undo-empty`, json('POST')), [send]);
  const mark = useCallback((tobaccoId: string, fraction: number) => send(`${shelfPath(tobaccoId)}/marks`, json('POST', { fraction })), [send]);
  const openAnother = useCallback((tobaccoId: string) => send(`${shelfPath(tobaccoId)}/open`, json('POST')), [send]);
  const addPack = useCallback(
    (tobaccoId: string, input: { weight?: number; priceKop?: number } = {}) => send(`${shelfPath(tobaccoId)}/packs`, json('POST', input)),
    [send],
  );
  const writeOff = useCallback((packId: string, reason: string) => send(`${packPath(packId)}/write-off`, json('POST', { reason })), [send]);
  const update = useCallback((tobaccoId: string, patch: ShelfPatch) => send(shelfPath(tobaccoId), json('PATCH', patch)), [send]);
  const remove = useCallback((tobaccoId: string) => send(shelfPath(tobaccoId), json('DELETE')), [send]);

  // «На полку» из каталога: табак держим — значит, на полке есть банка.
  // Сервис полки при добавлении банку не создаёт, поэтому добавляем её сами,
  // если у табака их нет.
  const add = useCallback(async (tobaccoId: string, shelfStatus: 'active' | 'plan' = 'active') => {
    const item = await send('/staff/shelf', json('POST', { tobaccoId, status: shelfStatus }));
    if (shelfStatus === 'active' && !item.openPacks.length && !item.sealedCount) {
      return addPack(tobaccoId);
    }
    return item;
  }, [addPack, send]);

  const loadCard = useCallback(
    async (tobaccoId: string) => normalizeShelfCard(await requestJson<unknown>(shelfPath(tobaccoId), {}, token)),
    [token],
  );

  const reset = useCallback(() => {
    setView(null);
    setStatus('idle');
    setError('');
  }, []);

  return { view, status, error, reload, reset, markEmpty, undoEmpty, mark, openAnother, addPack, writeOff, update, remove, add, loadCard };
};

export type ShelfApi = ReturnType<typeof useShelf>;
