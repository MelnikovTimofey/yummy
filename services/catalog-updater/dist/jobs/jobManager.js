"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRefreshJobs = exports.getRefreshJob = exports.createRefreshJob = void 0;
const node_crypto_1 = require("node:crypto");
const refreshCatalogJob_1 = require("./refreshCatalogJob");
const jobs = new Map();
const runningJob = () => Array.from(jobs.values()).find((job) => job.status === 'queued' || job.status === 'running');
const createRefreshJob = (params) => {
    const active = runningJob();
    if (active) {
        throw new Error(`Another refresh job is already running: ${active.id}`);
    }
    const id = (0, node_crypto_1.randomUUID)();
    const job = {
        id,
        status: 'queued',
        createdAt: new Date().toISOString(),
        params,
    };
    jobs.set(id, job);
    void (async () => {
        const current = jobs.get(id);
        if (!current) {
            return;
        }
        current.status = 'running';
        current.startedAt = new Date().toISOString();
        try {
            const stats = await (0, refreshCatalogJob_1.runRefreshCatalogJob)(params);
            current.status = 'completed';
            current.stats = stats;
        }
        catch (error) {
            current.status = 'failed';
            current.error = error instanceof Error ? error.message : 'Unknown error';
        }
        finally {
            current.finishedAt = new Date().toISOString();
        }
    })();
    return job;
};
exports.createRefreshJob = createRefreshJob;
const getRefreshJob = (id) => jobs.get(id) ?? null;
exports.getRefreshJob = getRefreshJob;
const listRefreshJobs = (limit) => Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
exports.listRefreshJobs = listRefreshJobs;
