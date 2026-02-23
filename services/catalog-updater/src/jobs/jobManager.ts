import { randomUUID } from 'node:crypto';
import { runRefreshCatalogJob } from './refreshCatalogJob';
import { RefreshJob, RefreshParams } from '../types';

const jobs = new Map<string, RefreshJob>();

const runningJob = () =>
  Array.from(jobs.values()).find((job) => job.status === 'queued' || job.status === 'running');

export const createRefreshJob = (params: RefreshParams): RefreshJob => {
  const active = runningJob();
  if (active) {
    throw new Error(`Another refresh job is already running: ${active.id}`);
  }

  const id = randomUUID();
  const job: RefreshJob = {
    id,
    status: 'queued',
    createdAt: new Date().toISOString(),
    params,
  };

  jobs.set(id, job);

  void (async () => {
    const current = jobs.get(id);
    if (!current) {
      return;
    }

    current.status = 'running';
    current.startedAt = new Date().toISOString();

    try {
      const stats = await runRefreshCatalogJob(params);
      current.status = 'completed';
      current.stats = stats;
    } catch (error) {
      current.status = 'failed';
      current.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      current.finishedAt = new Date().toISOString();
    }
  })();

  return job;
};

export const getRefreshJob = (id: string) => jobs.get(id) ?? null;

export const listRefreshJobs = (limit: number) =>
  Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
