import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import type { AccessRoleStatus } from '@/components/access/types';
import type { AuditEventRecord, StaffUser } from '@/contracts';
import { normalizeAuditEventRecord, readListPayload } from '@/contracts';

export const useAuditEvents = () => {
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [status, setStatus] = useState<AccessRoleStatus>('idle');
  const [error, setError] = useState('');

  const reload = useCallback(async (token: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setAuditEvents([]);
      setStatus('forbidden');
      setError('Журнал изменений доступен только для admin.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await requestJson<unknown>('/staff/audit/events?limit=25', {}, token);
      setAuditEvents(readListPayload<unknown>(response).map(normalizeAuditEventRecord));
      setStatus('ready');
    } catch (cause) {
      setAuditEvents([]);
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить журнал изменений');
    }
  }, []);

  const reset = useCallback(() => {
    setAuditEvents([]);
    setStatus('idle');
    setError('');
  }, []);

  return { auditEvents, status, error, reload, reset };
};
