import 'dotenv/config';

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  appName: process.env.APP_NAME ?? 'nomad-backend',
  host: process.env.HOST ?? '0.0.0.0',
  port: parsePort(process.env.PORT, 3021),
};
