const toInt = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const main = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for catalog:refresh:from-cache');
  }

  process.env.CATALOG_ALLOW_TEST_SOURCES = process.env.CATALOG_ALLOW_TEST_SOURCES || 'true';
  process.env.HOOKAHPORTAL_CACHE_READ = process.env.HOOKAHPORTAL_CACHE_READ || 'true';
  process.env.HOOKAHPORTAL_CACHE_WRITE = process.env.HOOKAHPORTAL_CACHE_WRITE || 'false';

  const { runRefreshCatalogJob } = require('../dist/jobs/refreshCatalogJob');

  const params = {
    includeLocalSeeds: toBoolean(process.env.INCLUDE_LOCAL_SEEDS, false),
    includeHookahPortalTobaccos: true,
    hookahPortalTobaccosLimit: toInt(process.env.HOOKAHPORTAL_MAX_TOBACCOS, 2683),
    hookahPortalMixesLimit: toInt(process.env.HOOKAHPORTAL_MAX_MIXES, 1018),
    hookahPortalDelayMs: toInt(process.env.HOOKAHPORTAL_DELAY_MS, 0),
  };

  const stats = await runRefreshCatalogJob(params);
  console.log('[catalog:refresh:from-cache] completed');
  console.log(JSON.stringify(stats, null, 2));
};

main().catch((error) => {
  console.error('[catalog:refresh:from-cache] failed');
  console.error(error);
  process.exit(1);
});
