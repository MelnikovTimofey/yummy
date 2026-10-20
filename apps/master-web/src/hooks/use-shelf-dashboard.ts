import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { normalizeShelfDashboard, type ShelfDashboard } from '@/contracts';
import type { ShelfLoadStatus } from './use-shelf';

// Блок «Полка» дашборда (#213): один запрос, перечитывается при открытии дашборда.
export const useShelfDashboard = (token: string) => {
  const [data, setData] = useState<ShelfDashboard | null>(null);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');

  const reload = useCallback(async (nextToken: string = token) => {
    setStatus('loading');
    setError('');
    try {
      setData(normalizeShelfDashboard(await requestJson<unknown>('/staff/shelf/dashboard', {}, nextToken)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить прогноз полки');
    }
  }, [token]);

  const reset = useCallback(() => {
    setData(null);
    setStatus('idle');
    setError('');
  }, []);

  return { data, status, error, reload, reset };
};

export type ShelfDashboardApi = ReturnType<typeof useShelfDashboard>;
