import Fastify from 'fastify';
import { z } from 'zod';
import { config } from './config';
import { prisma } from './db';
import { createRefreshJob, getRefreshJob, listRefreshJobs } from './jobs/jobManager';

const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

const refreshRequestSchema = z
  .object({
    includeLocalSeeds: z.coerce.boolean().default(true),
    includeMustHaveMixes: z.coerce.boolean().default(false),
    includeHookahPortalTobaccos: z.coerce.boolean().default(false),
    mustHaveFromId: z.coerce.number().int().min(1).optional(),
    mustHaveToId: z.coerce.number().int().min(1).optional(),
    hookahPortalLimit: z.coerce.number().int().min(1).max(10000).optional(),
    hookahPortalDelayMs: z.coerce.number().int().min(0).optional(),
    delayMs: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (value) =>
      value.includeLocalSeeds || value.includeMustHaveMixes || value.includeHookahPortalTobaccos,
    {
      message: 'At least one source must be enabled',
    },
  )
  .refine(
    (value) =>
      !value.includeMustHaveMixes ||
      value.mustHaveFromId === undefined ||
      value.mustHaveToId === undefined ||
      value.mustHaveFromId <= value.mustHaveToId,
    {
      message: 'mustHaveFromId must be less than or equal to mustHaveToId',
    },
  )
  .refine(
    (value) =>
      !value.includeHookahPortalTobaccos ||
      value.hookahPortalLimit === undefined ||
      value.hookahPortalLimit > 0,
    {
      message: 'hookahPortalLimit must be greater than zero',
    },
  )
  .refine(
    (value) =>
      !value.includeHookahPortalTobaccos ||
      value.hookahPortalDelayMs === undefined ||
      value.hookahPortalDelayMs >= 0,
    {
      message: 'hookahPortalDelayMs must be zero or positive',
    },
  );

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

app.get('/health', async () => ({
  service: 'catalog-updater',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

app.post('/jobs/refresh', async (request, reply) => {
  if (config.updaterApiKey) {
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== config.updaterApiKey) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  }

  const parseResult = refreshRequestSchema.safeParse(request.body ?? {});
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.flatten() });
  }

  try {
    const job = createRefreshJob(parseResult.data);
    return reply.status(202).send(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start job';
    if (message.includes('already running')) {
      return reply.status(409).send({ error: message });
    }
    return reply.status(500).send({ error: message });
  }
});

app.get('/jobs/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const job = getRefreshJob(id);
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

  const jobs = listRefreshJobs(parseResult.data.limit);
  return reply.send({ items: jobs });
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

const start = async () => {
  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info(`catalog-updater listening on ${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
