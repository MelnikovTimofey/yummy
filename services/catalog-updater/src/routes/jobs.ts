import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import { createRefreshJob, getRefreshJob, listRefreshJobs } from '../jobs/jobManager';
import { listQuerySchema, refreshRequestSchema } from './jobSchemas';

export const jobsRoutes: FastifyPluginAsync = async (app) => {
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
};
