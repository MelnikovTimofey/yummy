import { useCallback, useState, type FormEvent } from 'react';
import { requestJson } from '@/lib/api-client';
import { replaceOrInsert } from '@/lib/utils';
import {
  emptyTelegramOperatorEditor,
  toTelegramOperatorEditorState,
  type AccessRoleStatus,
  type AccessSaveStatus,
  type TelegramOperatorEditorState,
} from '@/components/access/types';
import type {
  StaffUser,
  TelegramAutomationStateRecord,
  TelegramOperatorRecord,
} from '@/contracts';
import {
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramOperatorRecord,
  readEntityPayload,
  readListPayload,
  sortTelegramOperators,
} from '@/contracts';

type UseTelegramOperatorsOptions = {
  onAfterSubmit?: () => void;
};

export const useTelegramOperators = ({ onAfterSubmit }: UseTelegramOperatorsOptions = {}) => {
  const [operators, setOperators] = useState<TelegramOperatorRecord[]>([]);
  const [status, setStatus] = useState<AccessRoleStatus>('idle');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<TelegramOperatorEditorState>(emptyTelegramOperatorEditor);
  const [saveStatus, setSaveStatus] = useState<AccessSaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [toggleId, setToggleId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [automationState, setAutomationState] = useState<TelegramAutomationStateRecord | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AccessRoleStatus>('idle');
  const [automationError, setAutomationError] = useState('');

  const reloadOperators = useCallback(async (token: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setOperators([]);
      setStatus('forbidden');
      setError('Allowlist Telegram доступен только для admin.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await requestJson<unknown>('/staff/access/telegram-operators', {}, token);
      const items = sortTelegramOperators(readListPayload<unknown>(response).map(normalizeTelegramOperatorRecord));
      setOperators(items);
      setStatus('ready');
    } catch (cause) {
      setOperators([]);
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить Telegram allowlist');
    }
  }, []);

  const reloadAutomationState = useCallback(async (token: string, role: StaffUser['role']) => {
    if (role !== 'admin') {
      setAutomationState(null);
      setAutomationStatus('forbidden');
      setAutomationError('Статус Telegram automation доступен только для admin.');
      return;
    }

    setAutomationStatus('loading');
    setAutomationError('');

    try {
      const response = await requestJson<unknown>('/staff/access/telegram-automation-state', {}, token);
      setAutomationState(normalizeTelegramAutomationStateRecord(readEntityPayload<unknown>(response)));
      setAutomationStatus('ready');
    } catch (cause) {
      setAutomationState(null);
      setAutomationStatus('error');
      setAutomationError(cause instanceof Error ? cause.message : 'Не удалось загрузить статус Telegram automation');
    }
  }, []);

  const reload = useCallback(
    async (token: string, role: StaffUser['role']) => {
      await Promise.all([reloadOperators(token, role), reloadAutomationState(token, role)]);
    },
    [reloadOperators, reloadAutomationState],
  );

  const onSelect = useCallback((operator: TelegramOperatorRecord) => {
    setEditor(toTelegramOperatorEditorState(operator));
    setSaveError('');
    setSaveStatus('idle');
  }, []);

  const onReset = useCallback(() => {
    setEditor(emptyTelegramOperatorEditor());
    setSaveError('');
    setSaveStatus('idle');
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>, token: string) => {
      event.preventDefault();
      if (!token) return;

      const name = editor.name.trim();
      const phone = editor.phone.trim();

      if (!name) {
        setSaveError('Укажите имя оператора');
        setSaveStatus('error');
        return;
      }
      if (!phone) {
        setSaveError('Укажите номер телефона');
        setSaveStatus('error');
        return;
      }

      setSaveStatus('loading');
      setSaveError('');

      try {
        const response = await requestJson<unknown>(
          editor.id
            ? `/staff/access/telegram-operators/${editor.id}`
            : '/staff/access/telegram-operators',
          {
            method: editor.id ? 'PATCH' : 'POST',
            body: JSON.stringify({ name, phone, active: editor.active }),
          },
          token,
        );

        const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
        if (!savedOperator.id) {
          throw new Error('Backend вернул пустую запись Telegram доступа');
        }

        setOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
        setEditor(toTelegramOperatorEditorState(savedOperator));
        setSaveStatus('ready');
        setDialogOpen(false);
        onAfterSubmit?.();
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить Telegram доступ');
        setSaveStatus('error');
      }
    },
    [editor, onAfterSubmit],
  );

  const onToggleActive = useCallback(
    async (operator: TelegramOperatorRecord, token: string) => {
      if (!token) return;

      setToggleId(operator.id);
      setError('');

      try {
        const response = await requestJson<unknown>(
          `/staff/access/telegram-operators/${operator.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: operator.name,
              phone: operator.phone,
              active: !operator.active,
            }),
          },
          token,
        );

        const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
        if (!savedOperator.id) {
          throw new Error('Backend вернул пустую запись Telegram доступа');
        }

        setOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
        setEditor((current) => (current.id === operator.id ? toTelegramOperatorEditorState(savedOperator) : current));
        setStatus('ready');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось обновить Telegram доступ');
        setStatus('error');
      } finally {
        setToggleId('');
      }
    },
    [],
  );

  const onClearLink = useCallback(
    async (operator: TelegramOperatorRecord, token: string) => {
      if (!token) return;

      setToggleId(operator.id);
      setError('');

      try {
        const response = await requestJson<unknown>(
          `/staff/access/telegram-operators/${operator.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: operator.name,
              phone: operator.phone,
              active: operator.active,
              clearLink: true,
            }),
          },
          token,
        );

        const savedOperator = normalizeTelegramOperatorRecord(readEntityPayload<unknown>(response));
        if (!savedOperator.id) {
          throw new Error('Backend вернул пустую запись Telegram доступа');
        }

        setOperators((current) => sortTelegramOperators(replaceOrInsert(current, savedOperator)));
        setEditor((current) => (current.id === operator.id ? toTelegramOperatorEditorState(savedOperator) : current));
        setStatus('ready');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось сбросить привязку Telegram');
        setStatus('error');
      } finally {
        setToggleId('');
      }
    },
    [],
  );

  const onDelete = useCallback(
    async (operator: TelegramOperatorRecord, token: string) => {
      if (!token) return;

      setToggleId(operator.id);
      setError('');

      try {
        await requestJson(
          `/staff/access/telegram-operators/${operator.id}`,
          { method: 'DELETE' },
          token,
        );

        setOperators((current) => sortTelegramOperators(current.filter((item) => item.id !== operator.id)));
        setEditor((current) => (current.id === operator.id ? emptyTelegramOperatorEditor() : current));
        setStatus('ready');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось удалить Telegram доступ');
        setStatus('error');
      } finally {
        setToggleId('');
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setOperators([]);
    setStatus('idle');
    setError('');
    setEditor(emptyTelegramOperatorEditor());
    setSaveStatus('idle');
    setSaveError('');
    setToggleId('');
    setDialogOpen(false);
    setAutomationState(null);
    setAutomationStatus('idle');
    setAutomationError('');
  }, []);

  return {
    operators,
    status,
    error,
    editor,
    setEditor,
    saveStatus,
    saveError,
    toggleId,
    dialogOpen,
    setDialogOpen,
    automationState,
    automationStatus,
    automationError,
    reload,
    onSelect,
    onReset,
    onSubmit,
    onToggleActive,
    onClearLink,
    onDelete,
    reset,
  };
};
