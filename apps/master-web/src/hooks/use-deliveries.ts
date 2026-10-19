import { useCallback, useState } from 'react';
import { apiBaseUrl, requestJson } from '@/lib/api-client';
import {
  normalizeDeliveryCard,
  normalizeDeliveryList,
  normalizeInventoryListResponse,
  normalizeInventoryTobacco,
  readEntityPayload,
  type DeliveryCard,
  type DeliveryLineKind,
  type DeliveryList,
  type InventoryTobacco,
} from '@/contracts';

export type DeliveryLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type DeliveryPatch = { receivedAt?: string | null; number?: string | null; invoiceDate?: string | null };

export type DeliveryLinePatch = {
  tobaccoId?: string | null;
  qty?: number;
  grams?: number | null;
  priceKop?: number | null;
  arrived?: boolean;
  kind?: DeliveryLineKind;
};

export type DeliveryLineInput = {
  rawName: string;
  qty: number;
  priceKop?: number | null;
  grams?: number | null;
  tobaccoId?: string | null;
};

export type ManualDeliveryInput = { supplierName?: string; number?: string; invoiceDate?: string };

export type NewTobaccoInput = { manufacturer: string; lineName: string; name: string };

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const deliveryPath = (id: string) => `/staff/deliveries/${encodeURIComponent(id)}`;
const linePath = (id: string, lineId: string) => `${deliveryPath(id)}/lines/${encodeURIComponent(lineId)}`;

const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*;base64,/, ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

// Поставки: список грузится одним запросом, карточка — отдельно; каждое
// действие над черновиком возвращает карточку целиком.
export const useDeliveries = (token: string) => {
  const [list, setList] = useState<DeliveryList | null>(null);
  const [status, setStatus] = useState<DeliveryLoadStatus>('idle');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      setList(normalizeDeliveryList(await requestJson<unknown>('/staff/deliveries', {}, token)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить поставки');
    }
  }, [token]);

  const card = useCallback(
    async (path: string, init: RequestInit = {}) => normalizeDeliveryCard(await requestJson<unknown>(path, init, token)),
    [token],
  );

  const upload = useCallback(
    async (file: File, allowDuplicate = false) =>
      card('/staff/deliveries', json('POST', { fileName: file.name, contentBase64: await readBase64(file), allowDuplicate })),
    [card],
  );

  const createManual = useCallback((input: ManualDeliveryInput) => card('/staff/deliveries/manual', json('POST', input)), [card]);
  const load = useCallback((id: string) => card(deliveryPath(id)), [card]);
  const update = useCallback((id: string, patch: DeliveryPatch) => card(deliveryPath(id), json('PATCH', patch)), [card]);
  const accept = useCallback((id: string, receivedAt: string) => card(`${deliveryPath(id)}/accept`, json('POST', { receivedAt })), [card]);
  const addLine = useCallback((id: string, input: DeliveryLineInput) => card(`${deliveryPath(id)}/lines`, json('POST', input)), [card]);
  const updateLine = useCallback(
    (id: string, lineId: string, patch: DeliveryLinePatch) => card(linePath(id, lineId), json('PATCH', patch)),
    [card],
  );
  const deleteLine = useCallback((id: string, lineId: string) => card(linePath(id, lineId), json('DELETE')), [card]);

  const remove = useCallback(
    async (id: string) => {
      await requestJson<unknown>(deliveryPath(id), json('DELETE'), token);
    },
    [token],
  );

  // PDF отдаётся только с Bearer-токеном, поэтому ссылкой его не открыть:
  // скачиваем и показываем через object URL. Окно открывается сразу по клику,
  // иначе браузер сочтёт его всплывающим.
  const openFile = useCallback(
    async (id: string) => {
      const target = window.open('', '_blank');
      try {
        const response = await fetch(`${apiBaseUrl}${deliveryPath(id)}/file`, { headers: { authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Файл счёта не найден');
        const url = URL.createObjectURL(await response.blob());
        if (target) target.location.href = url;
        else window.open(url, '_blank');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (cause) {
        target?.close();
        throw cause;
      }
    },
    [token],
  );

  const searchTobaccos = useCallback(
    async (query: string): Promise<InventoryTobacco[]> => {
      const params = new URLSearchParams({ search: query.trim(), sort: 'name', direction: 'asc', page: '1', pageSize: '20' });
      return normalizeInventoryListResponse(await requestJson<unknown>(`/staff/inventory/tobaccos?${params.toString()}`, {}, token)).items;
    },
    [token],
  );

  // Карточка каталога для строки «нет в каталоге». inStock: false — банку на
  // полку кладёт приёмка поставки, а не создание карточки.
  const createTobacco = useCallback(
    async (input: NewTobaccoInput) =>
      normalizeInventoryTobacco(
        readEntityPayload(await requestJson<unknown>('/staff/inventory/tobaccos', json('POST', { ...input, inStock: false }), token)),
      ),
    [token],
  );

  const reset = useCallback(() => {
    setList(null);
    setStatus('idle');
    setError('');
  }, []);

  return {
    list,
    status,
    error,
    reload,
    reset,
    upload,
    createManual,
    load,
    update,
    accept,
    addLine,
    updateLine,
    deleteLine,
    remove,
    openFile,
    searchTobaccos,
    createTobacco,
  };
};

export type DeliveriesApi = ReturnType<typeof useDeliveries>;
