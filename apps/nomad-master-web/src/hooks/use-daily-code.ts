import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import type { AccessLoadStatus } from '@/components/access/types';
import type { DailyAccessCodeRecord } from '@/contracts';
import {
  normalizeDailyAccessCodeRecord,
  readListPayload,
  sortDailyAccessCodes,
} from '@/contracts';

export type DailyCodeRotateStatus = 'idle' | 'rotating' | 'error';

const generateRotatedCode = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const useDailyCode = () => {
  const [dailyCodes, setDailyCodes] = useState<DailyAccessCodeRecord[]>([]);
  const [status, setStatus] = useState<AccessLoadStatus>('idle');
  const [error, setError] = useState('');
  const [rotateStatus, setRotateStatus] = useState<DailyCodeRotateStatus>('idle');
  const [rotateError, setRotateError] = useState('');

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

  const rotate = useCallback(async (token: string) => {
    setRotateStatus('rotating');
    setRotateError('');

    const codeValue = generateRotatedCode();
    const now = new Date();
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      await requestJson<unknown>(
        '/staff/access/daily-codes',
        {
          method: 'POST',
          body: JSON.stringify({
            codeValue,
            codeLabel: codeValue,
            active: true,
            startsAt: now.toISOString(),
            endsAt: endsAt.toISOString(),
          }),
        },
        token,
      );
      await reload(token);
      setRotateStatus('idle');
    } catch (cause) {
      setRotateStatus('error');
      setRotateError(cause instanceof Error ? cause.message : 'Не удалось сгенерировать новый код');
    }
  }, [reload]);

  const reset = useCallback(() => {
    setDailyCodes([]);
    setStatus('idle');
    setError('');
    setRotateStatus('idle');
    setRotateError('');
  }, []);

  return { dailyCodes, status, error, rotateStatus, rotateError, reload, rotate, reset };
};
