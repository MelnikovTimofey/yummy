import { useCallback, useState, type FormEvent } from 'react';
import { requestJson } from '@/lib/api-client';
import { replaceOrInsert } from '@/lib/utils';
import { type RailEditorState } from '@/components/rails/rail-editor';
import type { MixRecord, RailRecord } from '@/contracts';
import {
  normalizeMixListResponse,
  normalizeRailRecord,
  readEntityPayload,
  readListPayload,
  sortRails,
} from '@/contracts';

type RailsLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type RailsSaveStatus = 'idle' | 'loading' | 'ready' | 'error';

const emptyRailEditor = (): RailEditorState => ({
  id: '',
  name: '',
  description: '',
  type: 'curated',
  mixIds: [],
  active: true,
  editable: true,
  readOnlyReason: '',
});

const toRailEditorState = (rail: RailRecord): RailEditorState => ({
  id: rail.id,
  name: rail.name,
  description: rail.description,
  type: rail.type,
  mixIds: [...rail.mixIds],
  active: rail.active,
  editable: rail.editable,
  readOnlyReason: rail.readOnlyReason,
});

type UseRailsOptions = {
  onAfterSubmit?: () => void;
  onRefreshSiblings?: (token: string) => Promise<void>;
};

export const useRails = ({ onAfterSubmit, onRefreshSiblings }: UseRailsOptions = {}) => {
  const [rails, setRails] = useState<RailRecord[]>([]);
  const [railsStatus, setRailsStatus] = useState<RailsLoadStatus>('idle');
  const [railsError, setRailsError] = useState('');
  const [railMixCatalog, setRailMixCatalog] = useState<MixRecord[]>([]);
  const [railEditor, setRailEditor] = useState<RailEditorState>(emptyRailEditor);
  const [railEditorSheetOpen, setRailEditorSheetOpen] = useState(false);
  const [railMixCandidateId, setRailMixCandidateId] = useState('');
  const [railSaveStatus, setRailSaveStatus] = useState<RailsSaveStatus>('idle');
  const [railSaveError, setRailSaveError] = useState('');

  const loadRails = useCallback(async (token: string) => {
    setRailsStatus('loading');
    setRailsError('');

    try {
      const response = await requestJson<unknown>('/staff/rails', {}, token);
      const items = readListPayload<unknown>(response).map(normalizeRailRecord);
      setRails(sortRails(items));
      setRailsStatus('ready');
    } catch (cause) {
      setRails([]);
      setRailsStatus('error');
      setRailsError(cause instanceof Error ? cause.message : 'Не удалось загрузить рейлы');
    }
  }, []);

  const reloadCatalog = useCallback(async (token: string) => {
    try {
      const response = await requestJson<unknown>('/staff/mixes?sort=name&direction=asc', {}, token);
      const payload = normalizeMixListResponse(response);
      setRailMixCatalog(payload.items);
    } catch {
      setRailMixCatalog([]);
    }
  }, []);

  const reload = useCallback(
    async (token: string) => {
      await Promise.all([loadRails(token), reloadCatalog(token)]);
    },
    [loadRails, reloadCatalog],
  );

  const onSelectRail = useCallback((rail: RailRecord) => {
    setRailEditor(toRailEditorState(rail));
    setRailMixCandidateId('');
    setRailSaveError('');
    setRailSaveStatus('idle');
  }, []);

  const onResetRailEditor = useCallback(() => {
    setRailEditor(emptyRailEditor());
    setRailMixCandidateId('');
    setRailSaveError('');
    setRailSaveStatus('idle');
  }, []);

  const onAddRailMix = useCallback((mixId: string) => {
    if (!mixId) return;

    setRailEditor((current) => (
      current.mixIds.includes(mixId)
        ? current
        : { ...current, mixIds: [...current.mixIds, mixId] }
    ));
  }, []);

  const onRemoveRailMix = useCallback((mixId: string) => {
    setRailEditor((current) => ({
      ...current,
      mixIds: current.mixIds.filter((item) => item !== mixId),
    }));
  }, []);

  const onReorderRailMixes = useCallback((sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;

    setRailEditor((current) => {
      const sourceIndex = current.mixIds.indexOf(sourceId);
      const targetIndex = current.mixIds.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const nextMixIds = current.mixIds.filter((id) => id !== sourceId);
      const insertAt = nextMixIds.indexOf(targetId);
      nextMixIds.splice(insertAt < 0 ? nextMixIds.length : insertAt, 0, sourceId);

      return { ...current, mixIds: nextMixIds };
    });
  }, []);

  const onMoveRailMix = useCallback((mixId: string, direction: 'up' | 'down') => {
    setRailEditor((current) => {
      const index = current.mixIds.indexOf(mixId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.mixIds.length) {
        return current;
      }

      const nextMixIds = [...current.mixIds];
      const [item] = nextMixIds.splice(index, 1);
      nextMixIds.splice(targetIndex, 0, item);

      return { ...current, mixIds: nextMixIds };
    });
  }, []);

  const onSubmitRail = useCallback(
    async (event: FormEvent<HTMLFormElement>, token: string) => {
      event.preventDefault();
      if (!token) return;

      const name = railEditor.name.trim();
      const description = railEditor.description.trim();
      const mixIds = railEditor.mixIds;

      if (railEditor.id && !railEditor.editable) {
        setRailSaveError(railEditor.readOnlyReason || 'Этот рейл доступен только для просмотра');
        setRailSaveStatus('error');
        return;
      }

      if (!name) {
        setRailSaveError('Введите название рейла');
        setRailSaveStatus('error');
        return;
      }

      if (!mixIds.length) {
        setRailSaveError('Добавьте хотя бы один микс');
        setRailSaveStatus('error');
        return;
      }

      setRailSaveStatus('loading');
      setRailSaveError('');

      const payload = {
        name,
        description,
        mixIds,
        active: railEditor.active,
      };

      try {
        const response = await requestJson<unknown>(
          railEditor.id ? `/staff/rails/${railEditor.id}` : '/staff/rails',
          {
            method: railEditor.id ? 'PATCH' : 'POST',
            body: JSON.stringify(payload),
          },
          token,
        );

        const savedRail = normalizeRailRecord(readEntityPayload<unknown>(response));
        if (!savedRail.id) {
          throw new Error('Backend вернул пустой рейл');
        }

        setRails((current) => sortRails(replaceOrInsert(current, savedRail)));
        setRailEditor(toRailEditorState(savedRail));
        await Promise.all([
          loadRails(token),
          reloadCatalog(token),
          onRefreshSiblings ? onRefreshSiblings(token) : Promise.resolve(),
        ]);
        setRailSaveStatus('ready');
        setRailEditorSheetOpen(false);
        onAfterSubmit?.();
      } catch (cause) {
        setRailSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить рейл');
        setRailSaveStatus('error');
      }
    },
    [railEditor, loadRails, reloadCatalog, onAfterSubmit, onRefreshSiblings],
  );

  const reset = useCallback(() => {
    setRails([]);
    setRailsStatus('idle');
    setRailsError('');
    setRailMixCatalog([]);
    setRailEditor(emptyRailEditor());
    setRailEditorSheetOpen(false);
    setRailMixCandidateId('');
    setRailSaveStatus('idle');
    setRailSaveError('');
  }, []);

  return {
    rails,
    railsStatus,
    railsError,
    railMixCatalog,
    railEditor,
    setRailEditor,
    railEditorSheetOpen,
    setRailEditorSheetOpen,
    railMixCandidateId,
    setRailMixCandidateId,
    railSaveStatus,
    railSaveError,
    reload,
    reloadCatalog,
    onSelectRail,
    onResetRailEditor,
    onAddRailMix,
    onRemoveRailMix,
    onMoveRailMix,
    onReorderRailMixes,
    onSubmitRail,
    reset,
  };
};
