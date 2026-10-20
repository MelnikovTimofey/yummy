import { useCallback, useState } from 'react';
import { requestJson } from '@/lib/api-client';
import { normalizeCatalogIdeas, type CatalogIdea, type CatalogIdeas } from '@/contracts';
import type { ShelfLoadStatus } from './use-shelf';

// «Каталог → Идеи для закупки» (#214): подборки перечитываются при каждом
// открытии вида. «В план» ставит табак на полку в плане; метка появляется
// сразу, а при ошибке снимается.
export const useCatalogIdeas = (token: string, addToPlan: (tobaccoId: string) => Promise<unknown>) => {
  const [ideas, setIdeas] = useState<CatalogIdeas | null>(null);
  const [status, setStatus] = useState<ShelfLoadStatus>('idle');
  const [error, setError] = useState('');
  const [planned, setPlanned] = useState<ReadonlySet<string>>(new Set());
  const [planError, setPlanError] = useState('');

  const reload = useCallback(async (nextToken: string = token) => {
    setStatus('loading');
    setError('');
    try {
      setIdeas(normalizeCatalogIdeas(await requestJson<unknown>('/staff/catalog/ideas', {}, nextToken)));
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить идеи для закупки');
    }
  }, [token]);

  const plan = useCallback(async (idea: CatalogIdea) => {
    setPlanError('');
    setPlanned((current) => new Set(current).add(idea.id));
    try {
      await addToPlan(idea.id);
    } catch (cause) {
      setPlanned((current) => {
        const next = new Set(current);
        next.delete(idea.id);
        return next;
      });
      setPlanError(cause instanceof Error ? cause.message : `Не удалось добавить в план «${idea.name}»`);
    }
  }, [addToPlan]);

  const reset = useCallback(() => {
    setIdeas(null);
    setStatus('idle');
    setError('');
    setPlanned(new Set());
    setPlanError('');
  }, []);

  return { ideas, status, error, planned, planError, reload, plan, reset };
};

export type CatalogIdeasApi = ReturnType<typeof useCatalogIdeas>;
