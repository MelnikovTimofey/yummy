import 'dotenv/config';

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const env = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const config = {
  appName: process.env.APP_NAME ?? 'nomad-backend',
  host: process.env.HOST ?? '0.0.0.0',
  port: parsePort(process.env.PORT, 3021),
  automationKey: env(process.env.NOMAD_AUTOMATION_KEY, 'nomad-local-automation-key'),
  tokenSecret: env(process.env.NOMAD_TOKEN_SECRET, 'nomad-local-secret'),
  tokenTtlHours: parsePort(process.env.NOMAD_TOKEN_TTL_HOURS, 24),
};
