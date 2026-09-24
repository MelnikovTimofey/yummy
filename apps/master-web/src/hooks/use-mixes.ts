import { useCallback, useRef, useState, type FormEvent } from 'react';
import { requestJson } from '@/lib/api-client';
import { createLatestRequestGuard } from '@/lib/latest-request-guard';
import { rebalanceTo100 } from '@/components/mixes/mix-builder/rebalance';
import type {
  MixCatalogMode,
  MixEditorComponentInput,
  MixEditorViewState,
} from '@/components/mixes/mix-catalog-view';
import type {
  InventoryTobacco,
  MixComponent,
  MixFilterKey,
  MixListFilters,
  MixListMeta,
  MixListSort,
  MixRailFilter,
  MixRecord,
  MixStatusFilter,
} from '@/contracts';
import {
  buildMixRequestQuery,
  defaultMixListResponse,
  normalizeInventoryListResponse,
  normalizeMixListResponse,
  normalizeMixRecord,
  readEntityPayload,
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

// Состав микса несёт name/manufacturer/flavors, но не inStock/lineName/
// flavorProfiles. Сидируем карточки компонентов сразу из записи микса (чтобы
// не мигало «Табак не найден»), а полные данные дотягиваем запросом по ids.
const mixComponentToTobacco = (component: MixComponent): InventoryTobacco => ({
  id: component.tobaccoId,
  name: component.name,
  manufacturer: component.manufacturer,
  inStock: true,
  archived: false,
  flavors: component.flavors,
  flavorProfiles: [],
});

const mergeTobaccosById = (
  base: InventoryTobacco[],
  incoming: InventoryTobacco[],
): InventoryTobacco[] => {
  const byId = new Map(base.map((tobacco) => [tobacco.id, tobacco]));
  incoming.forEach((tobacco) => byId.set(tobacco.id, tobacco));
  return Array.from(byId.values());
};

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
  const [mixComponentTobaccos, setMixComponentTobaccos] = useState<InventoryTobacco[]>([]);
  const [mixEditor, setMixEditor] = useState<MixEditorState>(emptyMixEditor);
  const [mixesScreen, setMixesScreen] = useState<MixesScreenMode>('catalog');
  const [mixSaveStatus, setMixSaveStatus] = useState<MixesSaveStatus>('idle');
  const [mixSaveError, setMixSaveError] = useState('');
  const [mixRowPendingId, setMixRowPendingId] = useState('');
  // Обработчики каталога читают состояние поверхности отсюда, а не из
  // замыкания рендера: дебаунс поиска срабатывает через 250 мс после ввода, и
  // за это время статус, рейл-фильтр или сортировка успевают смениться (#63).
  const mixesFiltersRef = useRef(mixesFilters);
  const mixesSortRef = useRef(mixesSort);
  const mixesRequestGuard = useRef(createLatestRequestGuard()).current;

  const commitMixesFilters = (next: MixListFilters) => {
    mixesFiltersRef.current = next;
    setMixesFilters(next);
  };

  const commitMixesSort = (next: MixListSort) => {
    mixesSortRef.current = next;
    setMixesSort(next);
  };

  const loadMixes = useCallback(
    async (
      nextToken: string,
      nextFilters: MixListFilters = mixesFiltersRef.current,
      nextSort: MixListSort = mixesSortRef.current,
      nextPage: number = mixesMeta.page,
      nextPageSize: number = mixesMeta.pageSize,
    ) => {
      const ticket = mixesRequestGuard.start();
      setMixesStatus('loading');
      setMixesError('');

      try {
        const query = buildMixRequestQuery(nextFilters, nextSort, nextPage, nextPageSize);
        const response = await requestJson<unknown>(`/staff/mixes${query ? `?${query}` : ''}`, {}, nextToken);
        const payload = normalizeMixListResponse(response);

        // Ответ переустанавливает фильтры и сортировку из payload'а, поэтому
        // запоздавший результат вернул бы поверхность к состоянию, из которого
        // его отправили.
        if (mixesRequestGuard.isStale(ticket)) {
          return;
        }

        // Порядок задаёт сервер по выбранной сортировке — клиент его не трогает.
        setMixes(payload.items);
        commitMixesFilters(payload.filters);
        commitMixesSort(payload.sort);
        setMixesMeta(payload.meta);
        setMixesStatus('ready');
      } catch (cause) {
        if (mixesRequestGuard.isStale(ticket)) {
          return;
        }

        setMixes([]);
        setMixesMeta(defaultMixListResponse.meta);
        setMixesStatus('error');
        setMixesError(cause instanceof Error ? cause.message : 'Не удалось загрузить миксы');
      }
    },
    [mixesMeta.page, mixesMeta.pageSize],
  );

  const loadMixTobaccos = useCallback(async (nextToken: string) => {
    try {
      const response = await requestJson<unknown>(
        '/staff/inventory/tobaccos?sort=name&direction=asc&page=1&pageSize=100',
        {},
        nextToken,
      );
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

  // Server-side поиск табаков для библиотеки конструктора: ищем по всему
  // каталогу (не только по загруженным 100), отдаём первые 100 совпадений.
  const searchMixTobaccos = useCallback(
    async (query: string): Promise<InventoryTobacco[]> => {
      const params = new URLSearchParams({
        sort: 'name',
        direction: 'asc',
        page: '1',
        pageSize: '100',
      });
      const trimmed = query.trim();
      if (trimmed) {
        params.set('search', trimmed);
      }
      try {
        const response = await requestJson<unknown>(
          `/staff/inventory/tobaccos?${params.toString()}`,
          {},
          token,
        );
        return normalizeInventoryListResponse(response).items;
      } catch {
        return [];
      }
    },
    [token],
  );

  // Полные данные табаков для состава открытого микса — резолвим по точному
  // набору ids, чтобы карточки компонентов знали наличие/линейку/профили даже
  // для табаков за пределами загруженной сотни.
  const resolveComponentTobaccos = useCallback(
    async (tobaccoIds: string[], nextToken: string) => {
      const unique = Array.from(new Set(tobaccoIds.filter(Boolean)));
      if (!unique.length) {
        return;
      }
      try {
        const response = await requestJson<unknown>(
          `/staff/inventory/tobaccos?ids=${unique.map(encodeURIComponent).join(',')}`,
          {},
          nextToken,
        );
        const items = normalizeInventoryListResponse(response).items;
        if (items.length) {
          setMixComponentTobaccos((current) => mergeTobaccosById(current, items));
        }
      } catch {
        // оставляем сид из записи микса
      }
    },
    [],
  );

  const refreshSurface = async (
    nextFilters: MixListFilters = mixesFiltersRef.current,
    nextSort: MixListSort = mixesSortRef.current,
    nextPage: number = mixesMeta.page,
  ) => {
    if (!token) {
      return;
    }
    await loadMixes(token, nextFilters, nextSort, nextPage, mixesMeta.pageSize);
  };

  const onSearchChange = async (value: string) => {
    const next = { ...mixesFiltersRef.current, search: value };
    commitMixesFilters(next);
    await refreshSurface(next, mixesSortRef.current, 1);
  };

  const onStatusChange = async (value: MixStatusFilter) => {
    const next = { ...mixesFiltersRef.current, status: value };
    commitMixesFilters(next);
    await refreshSurface(next, mixesSortRef.current, 1);
  };

  const onRailStateChange = async (value: MixRailFilter) => {
    const next = { ...mixesFiltersRef.current, railState: value };
    commitMixesFilters(next);
    await refreshSurface(next, mixesSortRef.current, 1);
  };

  const onSortChange = async (next: MixListSort) => {
    commitMixesSort(next);
    await refreshSurface(mixesFiltersRef.current, next, 1);
  };

  const onToggleFilterValue = async (key: MixFilterKey, value: string) => {
    const current = mixesFiltersRef.current;
    const next = {
      ...current,
      [key]: toggleMixFilterValue(current[key], value),
    };
    commitMixesFilters(next);
    await refreshSurface(next, mixesSortRef.current, 1);
  };

  const onClearFilterGroup = async (key: MixFilterKey) => {
    const current = mixesFiltersRef.current;
    if (current[key].length === 0) {
      return;
    }
    const next = { ...current, [key]: [] };
    commitMixesFilters(next);
    await refreshSurface(next, mixesSortRef.current, 1);
  };

  const onPageChange = async (page: number) => {
    await refreshSurface(mixesFiltersRef.current, mixesSortRef.current, page);
  };

  const onSelectMix = useCallback(
    (mix: MixRecord) => {
      setMixEditor(toMixEditorState(mix));
      setMixComponentTobaccos(mix.components.map(mixComponentToTobacco));
      setMixesScreen('edit');
      setMixSaveError('');
      setMixSaveStatus('idle');
      void resolveComponentTobaccos(
        mix.components.map((component) => component.tobaccoId),
        token,
      );
    },
    [token, resolveComponentTobaccos],
  );

  const onStartCreate = useCallback(() => {
    setMixEditor(emptyMixEditor());
    setMixComponentTobaccos([]);
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
    setMixComponentTobaccos(mix.components.map(mixComponentToTobacco));
    setMixesScreen('create');
    setMixSaveError('');
    setMixSaveStatus('idle');
    void resolveComponentTobaccos(
      mix.components.map((component) => component.tobaccoId),
      token,
    );
  }, [token, resolveComponentTobaccos]);

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
        await loadMixes(token, mixesFiltersRef.current, mixesSortRef.current, mixesMeta.page, mixesMeta.pageSize);
        if (onRefreshSiblings) {
          await onRefreshSiblings(token);
        }
      } catch (cause) {
        setMixesError(cause instanceof Error ? cause.message : 'Не удалось обновить видимость микса');
      } finally {
        setMixRowPendingId('');
      }
    },
    [token, loadMixes, mixesMeta.page, mixesMeta.pageSize, onRefreshSiblings],
  );

  // Жёсткое удаление микса из каталога. Backend каскадом снимает его со всех
  // рейлов — после успеха перечитываем и каталог, и соседние поверхности
  // (рейлы), чтобы membership-теги и состав рейлов обновились.
  const onDeleteMix = useCallback(
    async (mix: MixRecord) => {
      if (!token) return;
      setMixRowPendingId(mix.id);
      try {
        await requestJson<unknown>(`/staff/mixes/${mix.id}`, { method: 'DELETE' }, token);
        await loadMixes(token, mixesFiltersRef.current, mixesSortRef.current, mixesMeta.page, mixesMeta.pageSize);
        if (onRefreshSiblings) {
          await onRefreshSiblings(token);
        }
      } catch (cause) {
        setMixesError(cause instanceof Error ? cause.message : 'Не удалось удалить микс');
      } finally {
        setMixRowPendingId('');
      }
    },
    [token, loadMixes, mixesMeta.page, mixesMeta.pageSize, onRefreshSiblings],
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

  // Добавление из библиотеки несёт полный объект табака — кладём его в пул
  // данных компонентов, чтобы карточка состава отрисовалась с наличием и
  // профилями (библиотека теперь поисковая, общего списка для резолва нет).
  const onAddComponent = useCallback(
    (tobacco: InventoryTobacco) => {
      setMixComponentTobaccos((current) => mergeTobaccosById(current, [tobacco]));
      onAddComponentById(tobacco.id);
    },
    [onAddComponentById],
  );

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
      setMixSaveError('Нужно название микса');
      setMixSaveStatus('error');
      return;
    }

    if (!description) {
      setMixSaveError('Нужно описание микса');
      setMixSaveStatus('error');
      return;
    }

    if (!components.length) {
      setMixSaveError('Нужен хотя бы один компонент');
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
        throw new Error('Сервер вернул пустой ответ');
      }

      setMixEditor(toMixEditorState(savedMix));
      setMixesScreen('catalog');
      await Promise.all([
        loadMixes(token, mixesFiltersRef.current, mixesSortRef.current),
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
    commitMixesFilters(defaultMixListResponse.filters);
    commitMixesSort(defaultMixListResponse.sort);
    setMixesMeta(defaultMixListResponse.meta);
    setMixTobaccos([]);
    setMixComponentTobaccos([]);
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
    mixComponentTobaccos,
    mixEditor,
    setMixEditor,
    mixesScreen,
    mixSaveStatus,
    mixSaveError,
    mixRowPendingId,
    reload,
    loadMixes,
    loadMixTobaccos,
    searchMixTobaccos,
    onSearchChange,
    onStatusChange,
    onRailStateChange,
    onSortChange,
    onToggleFilterValue,
    onClearFilterGroup,
    onPageChange,
    onSelectMix,
    onStartCreate,
    onStartCopy,
    onToggleMixAvailable,
    onDeleteMix,
    onCancelCreate,
    onResetEditor,
    onChangeEditorField,
    onChangeEditorAvailability,
    onAddComponentById,
    onAddComponent,
    onReplaceComponents,
    onRemoveComponentRebalanced,
    onUpdateComponent,
    onSubmitMix,
    reset,
  };
};
