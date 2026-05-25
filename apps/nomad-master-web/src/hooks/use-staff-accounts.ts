import { useCallback, useState, type FormEvent } from 'react';
import { requestJson } from '@/lib/api-client';
import { replaceOrInsert } from '@/lib/utils';
import {
  emptyStaffAccountEditor,
  toStaffAccountEditorState,
  type AccessRoleStatus,
  type AccessSaveStatus,
  type StaffAccountEditorState,
} from '@/components/access/types';
import type { StaffAccountRecord, StaffUser } from '@/contracts';
import {
  normalizeStaffAccountRecord,
  readEntityPayload,
  readListPayload,
  sortStaffAccounts,
} from '@/contracts';

type UseStaffAccountsOptions = {
  onAfterSubmit?: () => void;
};

export const useStaffAccounts = ({ onAfterSubmit }: UseStaffAccountsOptions = {}) => {
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountRecord[]>([]);
  const [status, setStatus] = useState<AccessRoleStatus>('idle');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<StaffAccountEditorState>(emptyStaffAccountEditor);
  const [saveStatus, setSaveStatus] = useState<AccessSaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [toggleId, setToggleId] = useState('');

  const reload = useCallback(async (token: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setStaffAccounts([]);
      setStatus('forbidden');
      setError('Раздел сотрудников доступен только для admin.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await requestJson<unknown>('/staff/access/accounts', {}, token);
      const items = sortStaffAccounts(readListPayload<unknown>(response).map(normalizeStaffAccountRecord));
      setStaffAccounts(items);
      setStatus('ready');
    } catch (cause) {
      setStaffAccounts([]);
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить сотрудников');
    }
  }, []);

  const onSelect = useCallback((account: StaffAccountRecord) => {
    setEditor(toStaffAccountEditorState(account));
    setSaveError('');
    setSaveStatus('idle');
  }, []);

  const onReset = useCallback(() => {
    setEditor(emptyStaffAccountEditor());
    setSaveError('');
    setSaveStatus('idle');
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>, token: string) => {
      event.preventDefault();
      if (!token) return;

      const loginValue = editor.login.trim();
      const name = editor.name.trim();
      const password = editor.password.trim();

      if (!loginValue) {
        setSaveError('Введите логин');
        setSaveStatus('error');
        return;
      }
      if (!name) {
        setSaveError('Введите имя');
        setSaveStatus('error');
        return;
      }
      if (!editor.id && !password) {
        setSaveError('Для нового сотрудника нужен пароль');
        setSaveStatus('error');
        return;
      }

      setSaveStatus('loading');
      setSaveError('');

      const payload = {
        login: loginValue,
        name,
        role: editor.role,
        active: editor.active,
        ...(password ? { password } : {}),
      };

      try {
        const response = await requestJson<unknown>(
          editor.id ? `/staff/access/accounts/${editor.id}` : '/staff/access/accounts',
          {
            method: editor.id ? 'PATCH' : 'POST',
            body: JSON.stringify(payload),
          },
          token,
        );

        const savedAccount = normalizeStaffAccountRecord(readEntityPayload<unknown>(response));
        if (!savedAccount.id) {
          throw new Error('Backend вернул пустого сотрудника');
        }

        setStaffAccounts((current) => sortStaffAccounts(replaceOrInsert(current, savedAccount)));
        setEditor(toStaffAccountEditorState(savedAccount));
        setSaveStatus('ready');
        onAfterSubmit?.();
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить сотрудника');
        setSaveStatus('error');
      }
    },
    [editor, onAfterSubmit],
  );

  const onToggleActive = useCallback(
    async (account: StaffAccountRecord, token: string) => {
      if (!token) return;

      setToggleId(account.id);
      setError('');

      try {
        const response = await requestJson<unknown>(
          `/staff/access/accounts/${account.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              login: account.login,
              name: account.name,
              role: account.role,
              active: !account.active,
            }),
          },
          token,
        );

        const savedAccount = normalizeStaffAccountRecord(readEntityPayload<unknown>(response));
        if (!savedAccount.id) {
          throw new Error('Backend вернул пустого сотрудника');
        }

        setStaffAccounts((current) => sortStaffAccounts(replaceOrInsert(current, savedAccount)));
        setEditor((current) => (current.id === account.id ? toStaffAccountEditorState(savedAccount) : current));
        setStatus('ready');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось обновить сотрудника');
        setStatus('error');
      } finally {
        setToggleId('');
      }
    },
    [],
  );

  const onDelete = useCallback(
    async (account: StaffAccountRecord, token: string) => {
      if (!token) return;

      setToggleId(account.id);
      setError('');

      try {
        await requestJson(
          `/staff/access/accounts/${account.id}`,
          { method: 'DELETE' },
          token,
        );

        setStaffAccounts((current) => sortStaffAccounts(current.filter((item) => item.id !== account.id)));
        setEditor((current) => (current.id === account.id ? emptyStaffAccountEditor() : current));
        setStatus('ready');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось удалить сотрудника');
        setStatus('error');
      } finally {
        setToggleId('');
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStaffAccounts([]);
    setStatus('idle');
    setError('');
    setEditor(emptyStaffAccountEditor());
    setSaveStatus('idle');
    setSaveError('');
    setToggleId('');
  }, []);

  return {
    staffAccounts,
    status,
    error,
    editor,
    setEditor,
    saveStatus,
    saveError,
    toggleId,
    reload,
    onSelect,
    onReset,
    onSubmit,
    onToggleActive,
    onDelete,
    reset,
  };
};
