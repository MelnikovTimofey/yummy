import { useCallback, useRef, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { guestChoicesQuery, normalizeGuestChoices, type GuestChoices, type GuestChoicesPeriod } from '@/contracts';
import type { ShelfLoadStatus } from './use-shelf';

const DEFAULT_PERIOD: GuestChoicesPeriod = { key: '30d' };

// Дашборд (#520): выборы гостей за период. Период переключают быстро — ответ
// на прошлый период не должен перетереть выбранный.
export const useGuestChoices = (token: string) => {
  const [data, setData] = useState<GuestChoices | null>(null);
  const [period, setPeriod] = useState<GuestChoicesPeriod>(DEFAULT_PERIOD);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');
  const guard = useRef(createLatestRequestGuard()).current;
  const periodRef = useRef(period);

  const load = useCallback(
    async (nextPeriod: GuestChoicesPeriod, nextToken: string = token) => {
      periodRef.current = nextPeriod;
      setPeriod(nextPeriod);
      const ticket = guard.start();
      setStatus('loading');
      setError('');
      try {
        const response = await requestJson<unknown>(`/staff/dashboard/choices?${guestChoicesQuery(nextPeriod)}`, {}, nextToken);
        if (guard.isStale(ticket)) return;
        setData(normalizeGuestChoices(response));
        setStatus('ready');
      } catch (cause) {
        if (guard.isStale(ticket)) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить выборы гостей');
      }
    },
    [guard, token],
  );

  const reload = useCallback((nextToken: string = token) => load(periodRef.current, nextToken), [load, token]);

  const reset = useCallback(() => {
    guard.start();
    periodRef.current = DEFAULT_PERIOD;
    setPeriod(DEFAULT_PERIOD);
    setData(null);
    setStatus('idle');
    setError('');
  }, [guard]);

  return { data, period, status, error, load, reload, reset };
};

export type GuestChoicesApi = ReturnType<typeof useGuestChoices>;
