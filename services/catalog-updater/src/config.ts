import path from 'node:path';

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
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
  allowTestSources: toBoolean(process.env.CATALOG_ALLOW_TEST_SOURCES, false),
  seedDir: process.env.CATALOG_SEED_DIR
    ? path.resolve(process.env.CATALOG_SEED_DIR)
    : path.resolve(process.cwd(), '../../backend/seed'),
  hookahPortal: {
    tobaccosSitemapUrl: process.env.HOOKAHPORTAL_TOBACCOS_SITEMAP_URL ?? 'https://hookahportal.ru/tobaccos.xml',
    mixesSitemapUrl: process.env.HOOKAHPORTAL_MIXES_SITEMAP_URL ?? 'https://hookahportal.ru/mixes.xml',
    maxTobaccos: toNumber(process.env.HOOKAHPORTAL_MAX_TOBACCOS, 250),
    maxMixes: toNumber(process.env.HOOKAHPORTAL_MAX_MIXES, 250),
    delayMs: toNumber(process.env.HOOKAHPORTAL_DELAY_MS, 100),
    concurrency: toNumber(process.env.HOOKAHPORTAL_CONCURRENCY, 12),
    timeoutMs: toNumber(process.env.HOOKAHPORTAL_TIMEOUT_MS, 15000),
    cacheDir: process.env.HOOKAHPORTAL_CACHE_DIR
      ? path.resolve(process.env.HOOKAHPORTAL_CACHE_DIR)
      : path.resolve(process.cwd(), './cache/hookahportal'),
    cacheRead: toBoolean(process.env.HOOKAHPORTAL_CACHE_READ, true),
    cacheWrite: toBoolean(process.env.HOOKAHPORTAL_CACHE_WRITE, true),
  },
};
