import path from 'node:path';

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: toNumber(process.env.PORT, 3011),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  databaseUrl,
  updaterApiKey: process.env.UPDATER_API_KEY,
  seedDir: process.env.CATALOG_SEED_DIR
    ? path.resolve(process.env.CATALOG_SEED_DIR)
    : path.resolve(process.cwd(), '../../backend/seed'),
  mustHave: {
    baseUrl: process.env.MUSTHAVE_BASE_URL ?? 'https://musthave.ru/showmixes/view/',
    fromId: toNumber(process.env.MUSTHAVE_ID_FROM, 1),
    toId: toNumber(process.env.MUSTHAVE_ID_TO, 2000),
    delayMs: toNumber(process.env.MUSTHAVE_DELAY_MS, 250),
  },
};
