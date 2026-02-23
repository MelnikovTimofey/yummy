import { config } from '../config';
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

  if (!sources.length) {
    throw new Error('No sources selected. Enable includeLocalSeeds and/or includeMustHaveMixes.');
  }

  return upsertCatalogFromSources(sources);
};
