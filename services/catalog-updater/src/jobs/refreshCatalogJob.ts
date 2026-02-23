import { config } from '../config';
import { loadHookahPortalTobaccos } from '../importers/hookahPortalTobaccoImporter';
import { loadLocalSeedCatalog } from '../importers/localSeedImporter';
import { loadMustHaveMixes } from '../importers/musthaveMixesImporter';
import { upsertCatalogFromSources } from '../pipeline/upsertCatalog';
import { CatalogSourcePayload, RefreshParams, RefreshStats } from '../types';

export const runRefreshCatalogJob = async (params: RefreshParams): Promise<RefreshStats> => {
  const sources: CatalogSourcePayload[] = [];

  if (params.includeLocalSeeds) {
    sources.push(await loadLocalSeedCatalog(config.seedDir));
  }

  if (params.includeMustHaveMixes) {
    sources.push(
      await loadMustHaveMixes({
        baseUrl: config.mustHave.baseUrl,
        fromId: params.mustHaveFromId ?? config.mustHave.fromId,
        toId: params.mustHaveToId ?? config.mustHave.toId,
        delayMs: params.delayMs ?? config.mustHave.delayMs,
      }),
    );
  }

  if (params.includeHookahPortalTobaccos) {
    if (!config.allowTestSources) {
      throw new Error(
        'Test sources are disabled. Set CATALOG_ALLOW_TEST_SOURCES=true to enable hookahportal source.',
      );
    }

    sources.push(
      await loadHookahPortalTobaccos({
        sitemapUrl: config.hookahPortal.tobaccosSitemapUrl,
        maxItems: params.hookahPortalLimit ?? config.hookahPortal.maxItems,
        delayMs: params.hookahPortalDelayMs ?? config.hookahPortal.delayMs,
      }),
    );
  }

  if (!sources.length) {
    throw new Error(
      'No sources selected. Enable includeLocalSeeds, includeMustHaveMixes and/or includeHookahPortalTobaccos.',
    );
  }

  return upsertCatalogFromSources(sources);
};
