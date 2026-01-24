import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 100;

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

type MixWithComponents = {
  id: string;
  components: {
    tobacco: {
      manufacturerId: string;
    };
  }[];
};

const getPrimaryManufacturerId = (mix: MixWithComponents) => {
  const counts = new Map<string, number>();
  for (const component of mix.components) {
    const id = component.tobacco.manufacturerId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let bestId = '';
  let bestCount = -1;
  for (const [id, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
};

const diversifyByManufacturer = <T extends MixWithComponents>(mixes: T[], limit: number) => {
  const buckets = new Map<string, T[]>();
  for (const mix of mixes) {
    const manufacturerId = getPrimaryManufacturerId(mix) || 'unknown';
    if (!buckets.has(manufacturerId)) {
      buckets.set(manufacturerId, []);
    }
    buckets.get(manufacturerId)!.push(mix);
  }

  const bucketKeys = Array.from(buckets.keys());
  const result: T[] = [];
  let index = 0;

  while (result.length < limit && bucketKeys.length > 0) {
    const key = bucketKeys[index % bucketKeys.length];
    const bucket = buckets.get(key);
    if (!bucket || bucket.length === 0) {
      buckets.delete(key);
      bucketKeys.splice(index % bucketKeys.length, 1);
      if (bucketKeys.length === 0) {
        break;
      }
      continue;
    }
    result.push(bucket.shift()!);
    index += 1;
  }

  return result;
};

export const registerRecommendationRoutes = async (app: FastifyInstance) => {
  app.get('/recommendations', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const limit = parseResult.data.limit ?? 20;
    const userId = request.user!.id;

    const userSessions = await prisma.smokingSession.findMany({
      where: { userId },
      select: { mixId: true },
    });
    const seenMixIds = new Set(userSessions.map((session) => session.mixId));

    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      include: {
        mix: {
          include: {
            components: { include: { tobacco: { include: { manufacturer: true } } } },
          },
        },
      },
    });

    const filtered = recommendations
      .filter((rec) => !seenMixIds.has(rec.mixId))
      .slice(0, limit)
      .map((rec) => ({
        score: rec.score,
        mix: rec.mix,
      }));

    if (filtered.length >= limit) {
      return reply.send({ items: filtered });
    }

    const fallbackPool = await prisma.mix.findMany({
      orderBy: { sessions: { _count: 'desc' } },
      take: limit * 5,
      include: {
        components: { include: { tobacco: { include: { manufacturer: true } } } },
      },
    });

    const fallbackCandidates = fallbackPool.filter((mix) => !seenMixIds.has(mix.id));
    const diversified = diversifyByManufacturer(fallbackCandidates, limit - filtered.length);

    return reply.send({
      items: [
        ...filtered,
        ...diversified.map((mix) => ({ score: null, mix })),
      ],
    });
  });
};
