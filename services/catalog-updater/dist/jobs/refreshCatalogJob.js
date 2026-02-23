"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRefreshCatalogJob = void 0;
const config_1 = require("../config");
const localSeedImporter_1 = require("../importers/localSeedImporter");
const musthaveMixesImporter_1 = require("../importers/musthaveMixesImporter");
const upsertCatalog_1 = require("../pipeline/upsertCatalog");
const runRefreshCatalogJob = async (params) => {
    const sources = [];
    if (params.includeLocalSeeds) {
        sources.push(await (0, localSeedImporter_1.loadLocalSeedCatalog)(config_1.config.seedDir));
    }
    if (params.includeMustHaveMixes) {
        sources.push(await (0, musthaveMixesImporter_1.loadMustHaveMixes)({
            baseUrl: config_1.config.mustHave.baseUrl,
            fromId: params.mustHaveFromId ?? config_1.config.mustHave.fromId,
            toId: params.mustHaveToId ?? config_1.config.mustHave.toId,
            delayMs: params.delayMs ?? config_1.config.mustHave.delayMs,
        }));
    }
    if (!sources.length) {
        throw new Error('No sources selected. Enable includeLocalSeeds and/or includeMustHaveMixes.');
    }
    return (0, upsertCatalog_1.upsertCatalogFromSources)(sources);
};
exports.runRefreshCatalogJob = runRefreshCatalogJob;
