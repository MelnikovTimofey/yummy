import { useCallback, useState, type FormEvent } from 'react';
import { requestJson } from '@/lib/api-client';
import { rebalanceTo100 } from '@/components/mixes/mix-builder/rebalance';
import type {
  MixCatalogMode,
  MixEditorComponentInput,
  MixEditorViewState,
} from '@/components/mixes/mix-catalog-view';
import type {
  InventoryTobacco,
  MixFilterKey,
  MixListFilters,
  MixListMeta,
  MixListSort,
  MixRailFilter,
  MixRecord,
  MixSortDirection,
  MixSortField,
  MixStatusFilter,
} from '@/contracts';
import {
  buildMixRequestQuery,
  defaultMixListResponse,
  normalizeInventoryListResponse,
  normalizeMixListResponse,
  normalizeMixRecord,
  readEntityPayload,
  sortMixes,
  toggleMixFilterValue,
} from '@/contracts';

export type MixEditorState = MixEditorViewState;
export type MixesScreenMode = MixCatalogMode;

type MixesLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type MixesSaveStatus = 'idle' | 'loading' | 'ready' | 'error';

let mixEditorComponentDraftId = 0;

const createMixEditorComponent = (tobaccoId = '', proportion = ''): MixEditorComponentInput => ({
  key: `mix-component-${mixEditorComponentDraftId += 1}`,
  tobaccoId,
  proportion,
});

const emptyMixEditor = (): MixEditorState => ({
  id: '',
  name: '',
  description: '',
  components: [],
  available: true,
  railMemberships: [],
});

const toMixEditorState = (mix: MixRecord): MixEditorState => ({
  id: mix.id,
  name: mix.name,
  description: mix.description,
  components: mix.components.map((component) =>
    createMixEditorComponent(component.tobaccoId, String(component.proportion)),
  ),
  available: mix.available,
  railMemberships: mix.railMemberships,
});

const parseNumberInput = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

type UseMixesOptions = {
  token: string;
  onAfterSubmit?: () => void;
  onRefreshSiblings?: (token: string) => Promise<void>;
};

export const useMixes = ({ token, onAfterSubmit, onRefreshSiblings }: UseMixesOptions) => {
  const [mixes, setMixes] = useState<MixRecord[]>([]);
  const [mixesStatus, setMixesStatus] = useState<MixesLoadStatus>('idle');
  const [mixesError, setMixesError] = useState('');
  const [mixesFilters, setMixesFilters] = useState<MixListFilters>(defaultMixListResponse.filters);
  const [mixesSort, setMixesSort] = useState<MixListSort>(defaultMixListResponse.sort);
  const [mixesMeta, setMixesMeta] = useState<MixListMeta>(defaultMixListResponse.meta);
  const [mixTobaccos, setMixTobaccos] = useState<InventoryTobacco[]>([]);
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixesScreen, setMixesScreen] = useState<MixesScreenMode>('catalog');
  const [mixSaveStatus, setMixSaveStatus] = useState<MixesSaveStatus>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [mixRowPendingId, setMixRowPendingId] = useState('');

  const loadMixes = useCallback(
    async (
      nextToken: string,
      nextFilters: MixListFilters = mixesFilters,
      nextSort: MixListSort = mixesSort,
      nextPage: number = mixesMeta.page,
      nextPageSize: number = mixesMeta.pageSize,
    ) => {
      setMixesStatus('loading');
      setMixesError('');

      try {
        const query = buildMixRequestQuery(nextFilters, nextSort, nextPage, nextPageSize);
        const response = await requestJson<unknown>(`/staff/mixes${query ? `?${query}` : ''}`, {}, nextToken);
        const payload = normalizeMixListResponse(response);
        setMixes(sortMixes(payload.items));
        setMixesFilters(payload.filters);
        setMixesSort(payload.sort);
        setMixesMeta(payload.meta);
        setMixesStatus('ready');
      } catch (cause) {
        setMixes([]);
        setMixesMeta(defaultMixListResponse.meta);
        setMixesStatus('error');
        setMixesError(cause instanceof Error ? cause.message : 'Не удалось загрузить миксы');
      }
    },
    [mixesFilters, mixesSort, mixesMeta.page, mixesMeta.pageSize],
  );

  const loadMixTobaccos = useCallback(async (nextToken: string) => {
    try {
      const response = await requestJson<unknown>('/staff/inventory/tobaccos?sort=name&direction=asc', {}, nextToken);
      const payload = normalizeInventoryListResponse(response);
      setMixTobaccos(payload.items);
    } catch {
      setMixTobaccos([]);
    }
  }, []);

  const reload = useCallback(
    async (nextToken: string) => {
      await Promise.all([loadMixes(nextToken), loadMixTobaccos(nextToken)]);
    },
    [loadMixes, loadMixTobaccos],
  );

  const refreshSurface = async (
    nextFilters: MixListFilters = mixesFilters,
    nextSort: MixListSort = mixesSort,
    nextPage: number = mixesMeta.page,
  ) => {
    if (!token) {
      return;
    }
    await loadMixes(token, nextFilters, nextSort, nextPage, mixesMeta.pageSize);
  };

  const onSearchChange = async (value: string) => {
    const next = { ...mixesFilters, search: value };
    setMixesFilters(next);
    await refreshSurface(next, mixesSort, 1);
  };

  const onStatusChange = async (value: MixStatusFilter) => {
    const next = { ...mixesFilters, status: value };
    setMixesFilters(next);
    await refreshSurface(next, mixesSort, 1);
  };

  const onRailStateChange = async (value: MixRailFilter) => {
    const next = { ...mixesFilters, railState: value };
    setMixesFilters(next);
    await refreshSurface(next, mixesSort, 1);
  };

  const onSortFieldChange = async (field: MixSortField) => {
    const next = { ...mixesSort, field };
    setMixesSort(next);
    await refreshSurface(mixesFilters, next, 1);
  };

  const onSortDirectionChange = async (direction: MixSortDirection) => {
    const next = { ...mixesSort, direction };
    setMixesSort(next);
    await refreshSurface(mixesFilters, next, 1);
  };

  const onToggleFilterValue = async (key: MixFilterKey, value: string) => {
    const next = {
      ...mixesFilters,
      [key]: toggleMixFilterValue(mixesFilters[key], value),
    };
    setMixesFilters(next);
    await refreshSurface(next, mixesSort, 1);
  };

  const onClearFilterGroup = async (key: MixFilterKey) => {
    if (mixesFilters[key].length === 0) {
      return;
    }
    const next = { ...mixesFilters, [key]: [] };
    setMixesFilters(next);
    await refreshSurface(next, mixesSort, 1);
  };

  const onResetFilters = async () => {
    const nextFilters = {
      ...defaultMixListResponse.filters,
      options: mixesFilters.options,
    };
    const nextSort = defaultMixListResponse.sort;
    setMixesFilters(nextFilters);
    setMixesSort(nextSort);
    await refreshSurface(nextFilters, nextSort, 1);
  };

  const onPageChange = async (page: number) => {
    await refreshSurface(mixesFilters, mixesSort, page);
  };

  const onSelectMix = useCallback((mix: MixRecord) => {
    setMixEditor(toMixEditorState(mix));
    setMixesScreen('edit');
    setMixSaveError('');
    setMixSaveStatus('idle');
  }, []);

  const onStartCreate = useCallback(() => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('create');
    setMixSaveError('');
    setMixSaveStatus('idle');
  }, []);

  // Открывает редактор в режиме «новый микс», но prefill'ом из существующего —
  // быстрый «дубликат» из row-action каталога. id пустой, имя с суффиксом
  // «(копия)» чтобы оператор сразу видел, что это draft.
  const onStartCopy = useCallback((mix: MixRecord) => {
    const draft: MixEditorState = {
      id: '',
      name: `${mix.name} (копия)`,
      description: mix.description,
      components: mix.components.map((component) =>
        createMixEditorComponent(component.tobaccoId, String(component.proportion)),
      ),
      available: mix.available,
      railMemberships: [],
    };
    setMixEditor(draft);
    setMixesScreen('create');
    setMixSaveError('');
    setMixSaveStatus('idle');
  }, []);

  // Toggle «Виден/Блокирован» прямо из строки каталога (без открытия editor'а).
  // В backend нет отдельного PATCH visibility — `guestVisible` производный
  // (available + все табаки in-stock). Меняем `available`: false = блок, true
  // = вернуть в витрину (при условии наличия табаков). Re-fetch после.
  const onToggleMixAvailable = useCallback(
    async (mix: MixRecord) => {
      if (!token) return;
      setMixRowPendingId(mix.id);
      try {
        await requestJson<unknown>(
          `/staff/mixes/${mix.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: mix.name,
              description: mix.description,
              components: mix.components.map((component, index) => ({
                tobaccoId: component.tobaccoId,
                proportion: component.proportion,
                sortOrder: index,
              })),
              available: !mix.available,
            }),
          },
          token,
        );
        await loadMixes(token, mixesFilters, mixesSort, mixesMeta.page, mixesMeta.pageSize);
        if (onRefreshSiblings) {
          await onRefreshSiblings(token);
        }
      } catch (cause) {
        setMixesError(cause instanceof Error ? cause.message : 'Не удалось обновить видимость микса');
      } finally {
        setMixRowPendingId('');
      }
    },
    [token, loadMixes, mixesFilters, mixesSort, mixesMeta.page, mixesMeta.pageSize, onRefreshSiblings],
  );

  const onCancelCreate = useCallback(() => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('catalog');
    setMixSaveError('');
    setMixSaveStatus('idle');
  }, []);

  const onResetEditor = useCallback(() => {
    setMixEditor(emptyMixEditor());
    setMixesScreen('catalog');
    setMixSaveError('');
    setMixSaveStatus('idle');
  }, []);

  const onChangeEditorField = useCallback((field: 'name' | 'description', value: string) => {
    setMixEditor((current) => ({ ...current, [field]: value }));
  }, []);

  const onChangeEditorAvailability = useCallback((value: boolean) => {
    setMixEditor((current) => ({ ...current, available: value }));
  }, []);

  // MixBuilder добавляет компонент по конкретному tobaccoId и сразу
  // ребалансирует доли так, чтобы сумма = 100%.
  const onAddComponentById = useCallback((tobaccoId: string) => {
    if (!tobaccoId) return;
    setMixEditor((current) => {
      if (current.components.some((component) => component.tobaccoId === tobaccoId)) {
        return current;
      }
      const next = [...current.components, createMixEditorComponent(tobaccoId, '')];
      return { ...current, components: rebalanceTo100(next) };
    });
  }, []);

  // ProportionBar drag-resize меняет весь массив компонентов разом —
  // даём отдельный setter, который принимает уже посчитанный список.
  const onReplaceComponents = useCallback((components: MixEditorComponentInput[]) => {
    setMixEditor((current) => ({ ...current, components }));
  }, []);

  // MixBuilder remove: ребалансируем после удаления так же, как в прототипе.
  const onRemoveComponentRebalanced = useCallback((key: string) => {
    setMixEditor((current) => ({
      ...current,
      components: rebalanceTo100(current.components.filter((component) => component.key !== key)),
    }));
  }, []);

  const onUpdateComponent = useCallback(
    (key: string, patch: Partial<Omit<MixEditorComponentInput, 'key'>>) => {
      setMixEditor((current) => ({
        ...current,
        components: current.components.map((component) =>
          component.key === key ? { ...component, ...patch } : component,
        ),
      }));
    },
    [],
  );

  const onSubmitMix = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const name = mixEditor.name.trim();
    const description = mixEditor.description.trim();
    const components = mixEditor.components
      .map((component, index) => ({
        tobaccoId: component.tobaccoId.trim(),
        proportion: parseNumberInput(component.proportion, 0),
        sortOrder: index,
      }))
      .filter((component) => component.tobaccoId);

    if (!name) {
      setMixSaveError('Введите название микса');
      setMixSaveStatus('error');
      return;
    }

    if (!description) {
      setMixSaveError('Добавьте описание микса');
      setMixSaveStatus('error');
      return;
    }

    if (!components.length) {
      setMixSaveError('Добавьте хотя бы один компонент');
      setMixSaveStatus('error');
      return;
    }

    const total = components.reduce((sum, component) => sum + component.proportion, 0);
    if (total !== 100) {
      setMixSaveError('Сумма долей должна быть ровно 100%');
      setMixSaveStatus('error');
      return;
    }

    setMixSaveStatus('loading');
    setMixSaveError('');

    const payload = {
      name,
      description,
      components,
      available: mixEditor.available,
    };

    try {
      const response = await requestJson<unknown>(
        mixEditor.id ? `/staff/mixes/${mixEditor.id}` : '/staff/mixes',
        {
          method: mixEditor.id ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      const savedMix = normalizeMixRecord(readEntityPayload<unknown>(response));
      if (!savedMix.id) {
        throw new Error('Backend вернул пустой микс');
      }

      setMixEditor(toMixEditorState(savedMix));
      setMixesScreen('catalog');
      await Promise.all([
        loadMixes(token, mixesFilters, mixesSort),
        onRefreshSiblings ? onRefreshSiblings(token) : Promise.resolve(),
      ]);
      setMixSaveStatus('ready');
      onAfterSubmit?.();
    } catch (cause) {
      setMixSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить микс');
      setMixSaveStatus('error');
    }
  };

  const reset = useCallback(() => {
    setMixes([]);
    setMixesStatus('idle');
    setMixesError('');
    setMixesFilters(defaultMixListResponse.filters);
    setMixesSort(defaultMixListResponse.sort);
    setMixesMeta(defaultMixListResponse.meta);
    setMixTobaccos([]);
    setMixEditor(emptyMixEditor());
    setMixesScreen('catalog');
    setMixSaveStatus('idle');
    setMixSaveError('');
  }, []);

  return {
    mixes,
    mixesStatus,
    mixesError,
    mixesFilters,
    mixesSort,
    mixesMeta,
    mixTobaccos,
    mixEditor,
    setMixEditor,
    mixesScreen,
    mixSaveStatus,
    mixSaveError,
    mixRowPendingId,
    reload,
    loadMixes,
    loadMixTobaccos,
    onSearchChange,
    onStatusChange,
    onRailStateChange,
    onSortFieldChange,
    onSortDirectionChange,
    onToggleFilterValue,
    onClearFilterGroup,
    onResetFilters,
    onPageChange,
    onSelectMix,
    onStartCreate,
    onStartCopy,
    onToggleMixAvailable,
    onCancelCreate,
    onResetEditor,
    onChangeEditorField,
    onChangeEditorAvailability,
    onAddComponentById,
    onReplaceComponents,
    onRemoveComponentRebalanced,
    onUpdateComponent,
    onSubmitMix,
    reset,
  };
};
