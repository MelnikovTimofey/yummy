import { config } from '../config';
import { loadHookahPortalCatalog } from '../importers/hookahPortalTobaccoImporter';
import { loadLocalSeedCatalog } from '../importers/localSeedImporter';
import { upsertCatalogFromSources } from '../pipeline/upsertCatalog';
import { CatalogSourcePayload, RefreshParams, RefreshStats } from '../types';

export const runRefreshCatalogJob = async (params: RefreshParams): Promise<RefreshStats> => {
  const sources: CatalogSourcePayload[] = [];

  if (params.includeLocalSeeds) {
    sources.push(await loadLocalSeedCatalog(config.seedDir));
  }

  if (params.includeHookahPortalTobaccos) {
    if (!config.allowTestSources) {
      throw new Error(
        'Test sources are disabled. Set CATALOG_ALLOW_TEST_SOURCES=true to enable hookahportal source.',
      );
    }

    sources.push(
      await loadHookahPortalCatalog({
        tobaccosSitemapUrl: config.hookahPortal.tobaccosSitemapUrl,
        mixesSitemapUrl: config.hookahPortal.mixesSitemapUrl,
        maxTobaccos: params.hookahPortalTobaccosLimit ?? config.hookahPortal.maxTobaccos,
        maxMixes: params.hookahPortalMixesLimit ?? config.hookahPortal.maxMixes,
        delayMs: params.hookahPortalDelayMs ?? config.hookahPortal.delayMs,
        concurrency: config.hookahPortal.concurrency,
        timeoutMs: config.hookahPortal.timeoutMs,
        cacheDir: config.hookahPortal.cacheDir,
        cacheRead: config.hookahPortal.cacheRead,
        cacheWrite: config.hookahPortal.cacheWrite,
      }),
    );
  }

  if (!sources.length) {
    throw new Error('No sources selected. Enable includeLocalSeeds and/or includeHookahPortalTobaccos.');
  }

  return upsertCatalogFromSources(sources);
};
