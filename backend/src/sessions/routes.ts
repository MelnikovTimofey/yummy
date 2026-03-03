import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 200;

const sessionCreateSchema = z.object({
  mixId: z.string().uuid(),
  date: z.string().datetime(),
  locationType: z.enum(['home', 'lounge']),
  locationName: z.string().trim().min(1).optional(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const applyPagination = (query: { limit?: number; offset?: number }) => ({
  take: query.limit ?? 50,
  skip: query.offset ?? 0,
});

export const registerSessionRoutes = async (app: FastifyInstance) => {
  app.get('/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const sessions = await prisma.smokingSession.findMany({
      where: { userId: request.user!.id },
      orderBy: { date: 'desc' },
      include: {
        mix: {
          include: {
            components: { include: { tobacco: { include: { manufacturer: true } } } },
          },
        },
      },
      ...applyPagination(parseResult.data),
    });

    return reply.send({ items: sessions });
  });

  app.get('/sessions/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = idParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid session id' });
    }

    const { id } = parseResult.data;
    const session = await prisma.smokingSession.findFirst({
      where: { id, userId: request.user!.id },
      include: {
        mix: {
          include: {
            components: { include: { tobacco: { include: { manufacturer: true } } } },
          },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send(session);
  });

  app.post('/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = sessionCreateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const { mixId, date, locationType, locationName } = parseResult.data;

    if (locationType === 'lounge' && !locationName) {
      return reply.status(400).send({ error: 'Location name is required for lounge' });
    }

    const mix = await prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      return reply.status(400).send({ error: 'Mix not found' });
    }

    const session = await prisma.smokingSession.create({
      data: {
        userId: request.user!.id,
        mixId,
        date: new Date(date),
        locationType,
        locationName: locationType === 'lounge' ? locationName : null,
      },
      include: {
        mix: {
          include: {
            components: { include: { tobacco: { include: { manufacturer: true } } } },
          },
        },
      },
    });

    return reply.status(201).send(session);
  });

  app.delete('/sessions/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = idParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid session id' });
    }

    const { id } = parseResult.data;
    const deleted = await prisma.smokingSession.deleteMany({
      where: {
        id,
        userId: request.user!.id,
      },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send({ ok: true });
  });
};
