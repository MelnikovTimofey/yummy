import { setTimeout as delay } from 'node:timers/promises';
import { normalizeBaseUrl, toBoolean, toInt } from './lib/normalize';

type RefreshPayload = {
  includeLocalSeeds: boolean;
  includeHookahPortalTobaccos: boolean;
  hookahPortalTobaccosLimit: number;
  hookahPortalMixesLimit: number;
  hookahPortalDelayMs: number;
};

type RefreshJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  stats?: unknown;
  error?: string;
};

const parseJsonSafely = (raw: string) => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const requestJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, init);
  const raw = await response.text();
  const parsed = parseJsonSafely(raw);

  if (!response.ok) {
    const details =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error?: unknown }).error ?? '')
        : raw;
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${details}`);
  }

  if (!parsed) {
    throw new Error(`Invalid JSON response from ${url}`);
  }

  return parsed as T;
};

const startRefreshJob = async (
  updaterUrl: string,
  payload: RefreshPayload,
  updaterApiKey?: string,
) => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (updaterApiKey) {
    headers['x-api-key'] = updaterApiKey;
  }

  return requestJson<RefreshJob>(`${updaterUrl}/jobs/refresh`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
};

const getRefreshJob = async (updaterUrl: string, jobId: string, updaterApiKey?: string) => {
  const headers: Record<string, string> = {};
  if (updaterApiKey) {
    headers['x-api-key'] = updaterApiKey;
  }

  return requestJson<RefreshJob>(`${updaterUrl}/jobs/${encodeURIComponent(jobId)}`, {
    headers,
  });
};

const pollJobUntilFinished = async (
  updaterUrl: string,
  jobId: string,
  pollIntervalMs: number,
  timeoutMs: number,
  updaterApiKey?: string,
) => {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const job = await getRefreshJob(updaterUrl, jobId, updaterApiKey);
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await delay(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for job ${jobId} after ${timeoutMs}ms`);
};

const main = async () => {
  const updaterUrl = normalizeBaseUrl(process.env.UPDATER_URL, 'http://localhost:3011');
  const updaterApiKey = process.env.UPDATER_API_KEY?.trim() || undefined;

  const payload: RefreshPayload = {
    includeLocalSeeds: toBoolean(process.env.INCLUDE_LOCAL_SEEDS, false),
    includeHookahPortalTobaccos: true,
    hookahPortalTobaccosLimit: toInt(process.env.HOOKAHPORTAL_TOBACCOS_LIMIT, 2683),
    hookahPortalMixesLimit: toInt(process.env.HOOKAHPORTAL_MIXES_LIMIT, 1018),
    hookahPortalDelayMs: toInt(process.env.HOOKAHPORTAL_DELAY_MS, 0),
  };

  const pollIntervalMs = Math.max(250, toInt(process.env.POLL_INTERVAL_MS, 1500));
  const timeoutMs = Math.max(5000, toInt(process.env.POLL_TIMEOUT_MS, 30 * 60 * 1000));

  console.log(`[import:tobaccos] starting refresh via ${updaterUrl}`);
  console.log(`[import:tobaccos] payload: ${JSON.stringify(payload)}`);

  const createdJob = await startRefreshJob(updaterUrl, payload, updaterApiKey);
  console.log(`[import:tobaccos] job created: ${createdJob.id}`);

  const finalJob = await pollJobUntilFinished(
    updaterUrl,
    createdJob.id,
    pollIntervalMs,
    timeoutMs,
    updaterApiKey,
  );

  if (finalJob.status === 'failed') {
    throw new Error(finalJob.error ?? `Job ${finalJob.id} failed`);
  }

  console.log(`[import:tobaccos] completed: ${finalJob.id}`);
  console.log(JSON.stringify(finalJob.stats ?? {}, null, 2));
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[import:tobaccos] ${message}`);
  process.exit(1);
});
