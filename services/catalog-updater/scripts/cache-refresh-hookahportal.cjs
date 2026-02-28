const path = require('node:path');

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
  const { loadHookahPortalCatalog } = require('../dist/importers/hookahPortalTobaccoImporter');

  const cacheDir = process.env.HOOKAHPORTAL_CACHE_DIR
    ? path.resolve(process.env.HOOKAHPORTAL_CACHE_DIR)
    : path.resolve(__dirname, '../cache/hookahportal');

  const catalog = await loadHookahPortalCatalog({
    tobaccosSitemapUrl: process.env.HOOKAHPORTAL_TOBACCOS_SITEMAP_URL || 'https://hookahportal.ru/tobaccos.xml',
    mixesSitemapUrl: process.env.HOOKAHPORTAL_MIXES_SITEMAP_URL || 'https://hookahportal.ru/mixes.xml',
    maxTobaccos: toInt(process.env.HOOKAHPORTAL_MAX_TOBACCOS, 2683),
    maxMixes: toInt(process.env.HOOKAHPORTAL_MAX_MIXES, 1018),
    delayMs: toInt(process.env.HOOKAHPORTAL_DELAY_MS, 0),
    concurrency: toInt(process.env.HOOKAHPORTAL_CONCURRENCY, 16),
    timeoutMs: toInt(process.env.HOOKAHPORTAL_TIMEOUT_MS, 15000),
    cacheDir,
    cacheRead: toBoolean(process.env.HOOKAHPORTAL_CACHE_READ, false),
    cacheWrite: toBoolean(process.env.HOOKAHPORTAL_CACHE_WRITE, true),
  });

  console.log(
    `[cache:refresh:hookahportal] completed: tobaccos=${catalog.tobaccos.length}, mixes=${catalog.mixes.length}`,
  );
  console.log(`[cache:refresh:hookahportal] cache dir: ${cacheDir}`);
};

main().catch((error) => {
  console.error('[cache:refresh:hookahportal] failed');
  console.error(error);
  process.exit(1);
});
