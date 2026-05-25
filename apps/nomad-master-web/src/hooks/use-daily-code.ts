import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import type { AccessLoadStatus } from '@/components/access/types';
import type { DailyAccessCodeRecord } from '@/contracts';
import {
  normalizeDailyAccessCodeRecord,
  readListPayload,
  sortDailyAccessCodes,
} from '@/contracts';

export const useDailyCode = () => {
  const [dailyCodes, setDailyCodes] = useState<DailyAccessCodeRecord[]>([]);
  const [status, setStatus] = useState<AccessLoadStatus>('idle');
  const [error, setError] = useState('');

  const reload = useCallback(async (token: string) => {
    setStatus('loading');
    setError('');

    try {
      const response = await requestJson<unknown>('/staff/access/daily-codes', {}, token);
      const items = sortDailyAccessCodes(readListPayload<unknown>(response).map(normalizeDailyAccessCodeRecord));
      setDailyCodes(items);
      setStatus('ready');
    } catch (cause) {
      setDailyCodes([]);
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить коды доступа');
    }
  }, []);

  const reset = useCallback(() => {
    setDailyCodes([]);
    setStatus('idle');
    setError('');
  }, []);

  return { dailyCodes, status, error, reload, reset };
};
