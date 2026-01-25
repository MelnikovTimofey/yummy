import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});

const sessionRatingSchema = ratingSchema.extend({
  sessionId: z.string().uuid(),
});

const mixRatingSchema = ratingSchema.extend({
  mixId: z.string().uuid(),
});

const listSessionRatingsSchema = z.object({
  sessionId: z.string().uuid().optional(),
});

const listMixRatingsSchema = z.object({
  mixId: z.string().uuid().optional(),
});

export const registerRatingRoutes = async (app: FastifyInstance) => {
  app.get('/session-ratings', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listSessionRatingsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const ratings = await prisma.sessionRating.findMany({
      where: {
        userId: request.user!.id,
        ...(parseResult.data.sessionId ? { sessionId: parseResult.data.sessionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ items: ratings });
  });

  app.post('/session-ratings', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = sessionRatingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const { sessionId, rating } = parseResult.data;
    const session = await prisma.smokingSession.findFirst({
      where: { id: sessionId, userId: request.user!.id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const sessionRating = await prisma.sessionRating.upsert({
      where: { sessionId_userId: { sessionId, userId: request.user!.id } },
      create: {
        sessionId,
        userId: request.user!.id,
        rating,
      },
      update: { rating },
    });

    const directRating = await prisma.mixRating.findFirst({
      where: {
        mixId: session.mixId,
        userId: request.user!.id,
        source: 'direct',
      },
    });

    if (!directRating) {
      const average = await prisma.sessionRating.aggregate({
        where: {
          userId: request.user!.id,
          session: { mixId: session.mixId },
        },
        _avg: { rating: true },
      });

      if (average._avg.rating !== null) {
        await prisma.mixRating.upsert({
          where: { mixId_userId: { mixId: session.mixId, userId: request.user!.id } },
          create: {
            mixId: session.mixId,
            userId: request.user!.id,
            rating: Math.round(average._avg.rating),
            source: 'derived',
          },
          update: {
            rating: Math.round(average._avg.rating),
            source: 'derived',
          },
        });
      }
    }

    return reply.status(201).send(sessionRating);
  });

  app.get('/mix-ratings', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listMixRatingsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const ratings = await prisma.mixRating.findMany({
      where: {
        userId: request.user!.id,
        ...(parseResult.data.mixId ? { mixId: parseResult.data.mixId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ items: ratings });
  });

  app.get('/mix-ratings/summary', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listMixRatingsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const summaries = await prisma.mixRating.groupBy({
      by: ['mixId'],
      where: {
        source: 'direct',
        ...(parseResult.data.mixId ? { mixId: parseResult.data.mixId } : {}),
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return reply.send({
      items: summaries.map((summary) => ({
        mixId: summary.mixId,
        avgRating: summary._avg.rating,
        count: summary._count.rating,
      })),
    });
  });

  app.post('/mix-ratings', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = mixRatingSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const { mixId, rating } = parseResult.data;
    const mix = await prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      return reply.status(404).send({ error: 'Mix not found' });
    }

    const mixRating = await prisma.mixRating.upsert({
      where: { mixId_userId: { mixId, userId: request.user!.id } },
      create: {
        mixId,
        userId: request.user!.id,
        rating,
        source: 'direct',
      },
      update: {
        rating,
        source: 'direct',
      },
    });

    return reply.status(201).send(mixRating);
  });
};
