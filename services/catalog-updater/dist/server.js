"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const config_1 = require("./config");
const db_1 = require("./db");
const jobManager_1 = require("./jobs/jobManager");
const app = (0, fastify_1.default)({
    logger: {
        level: config_1.config.logLevel,
    },
});
const refreshRequestSchema = zod_1.z
    .object({
    includeLocalSeeds: zod_1.z.coerce.boolean().default(true),
    includeMustHaveMixes: zod_1.z.coerce.boolean().default(false),
    mustHaveFromId: zod_1.z.coerce.number().int().min(1).optional(),
    mustHaveToId: zod_1.z.coerce.number().int().min(1).optional(),
    delayMs: zod_1.z.coerce.number().int().min(0).optional(),
})
    .refine((value) => value.includeLocalSeeds || value.includeMustHaveMixes, {
    message: 'At least one source must be enabled',
})
    .refine((value) => !value.includeMustHaveMixes ||
    value.mustHaveFromId === undefined ||
    value.mustHaveToId === undefined ||
    value.mustHaveFromId <= value.mustHaveToId, {
    message: 'mustHaveFromId must be less than or equal to mustHaveToId',
});
const listQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(20),
});
app.get('/health', async () => ({
    service: 'catalog-updater',
    status: 'ok',
    timestamp: new Date().toISOString(),
}));
app.post('/jobs/refresh', async (request, reply) => {
    if (config_1.config.updaterApiKey) {
        const apiKey = request.headers['x-api-key'];
        if (apiKey !== config_1.config.updaterApiKey) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    }
    const parseResult = refreshRequestSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.flatten() });
    }
    try {
        const job = (0, jobManager_1.createRefreshJob)(parseResult.data);
        return reply.status(202).send(job);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start job';
        if (message.includes('already running')) {
            return reply.status(409).send({ error: message });
        }
        return reply.status(500).send({ error: message });
    }
});
app.get('/jobs/:id', async (request, reply) => {
    const { id } = request.params;
    const job = (0, jobManager_1.getRefreshJob)(id);
    if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
    }
    return reply.send(job);
});
app.get('/jobs', async (request, reply) => {
    const parseResult = listQuerySchema.safeParse(request.query ?? {});
    if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid query params' });
    }
    const jobs = (0, jobManager_1.listRefreshJobs)(parseResult.data.limit);
    return reply.send({ items: jobs });
});
app.addHook('onClose', async () => {
    await db_1.prisma.$disconnect();
});
const start = async () => {
    try {
        await app.listen({ host: config_1.config.host, port: config_1.config.port });
        app.log.info(`catalog-updater listening on ${config_1.config.host}:${config_1.config.port}`);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
void start();
