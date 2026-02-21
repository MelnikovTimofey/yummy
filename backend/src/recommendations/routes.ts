import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 100;
// Fallback #2: both factors must affect ranking.
const TOP_RATING_WEIGHT = 0.7;
const TOP_SESSION_WEIGHT = 0.3;
// Fallback #3 (cold start): popularity + onboarding preferences.
const COLD_START_POPULARITY_WEIGHT = 0.6;
const COLD_START_ONBOARDING_WEIGHT = 0.4;
const ONBOARDING_LIKED_BONUS = 0.5;
const ONBOARDING_MANUFACTURER_BONUS = 0.5;
const ONBOARDING_DISLIKED_PENALTY = 0.4;

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

type MixWithComponents = {
  id: string;
  components: {
    tobacco: {
      manufacturerId: string;
      flavorProfiles: string[];
    };
  }[];
};

type RecommendationSource = 'model' | 'top' | 'cold_start';

type ScoredMix<T extends MixWithComponents> = {
  mix: T;
  score: number;
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const buildSessionCountMap = (rows: Array<{ mixId: string; _count: { mixId: number } }>) => {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.mixId] = row._count.mixId;
    return acc;
  }, {});
};

const buildAverageRatingMap = (
  rows: Array<{ mixId: string; _avg: { rating: number | null } }>,
) => {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.mixId] = row._avg.rating ?? 0;
    return acc;
  }, {});
};

const rankTopFallback = <T extends MixWithComponents>(
  mixes: T[],
  sessionCountByMixId: Record<string, number>,
  avgRatingByMixId: Record<string, number>,
) => {
  const sessionValues = Object.values(sessionCountByMixId);
  const maxSessionCount = sessionValues.length ? Math.max(...sessionValues) : 1;

  const ranked = mixes.map<ScoredMix<T>>((mix) => {
    const sessionCount = sessionCountByMixId[mix.id] ?? 0;
    const avgRating = avgRatingByMixId[mix.id] ?? 0;

    const ratingScore = clamp01(avgRating / 5);
    const sessionScore = clamp01(Math.log1p(sessionCount) / Math.log1p(maxSessionCount));
    const score = ratingScore * TOP_RATING_WEIGHT + sessionScore * TOP_SESSION_WEIGHT;

    return { mix, score };
  });

  return ranked.sort((a, b) => b.score - a.score);
};

const rankColdStartFallback = <T extends MixWithComponents>(
  mixes: T[],
  sessionCountByMixId: Record<string, number>,
  likedProfiles: Set<string>,
  dislikedProfiles: Set<string>,
  favoriteManufacturerIds: Set<string>,
) => {
  const sessionValues = Object.values(sessionCountByMixId);
  const maxSessionCount = sessionValues.length ? Math.max(...sessionValues) : 1;

  const ranked = mixes.map<ScoredMix<T>>((mix) => {
    const sessionCount = sessionCountByMixId[mix.id] ?? 0;
    const popularityScore = clamp01(Math.log1p(sessionCount) / Math.log1p(maxSessionCount));

    const profileSet = new Set(mix.components.flatMap((component) => component.tobacco.flavorProfiles));
    const manufacturerSet = new Set(
      mix.components.map((component) => component.tobacco.manufacturerId),
    );

    const likedHit = Array.from(profileSet).some((profile) => likedProfiles.has(profile)) ? 1 : 0;
    const dislikedHit = Array.from(profileSet).some((profile) => dislikedProfiles.has(profile))
      ? 1
      : 0;
    const manufacturerHit = Array.from(manufacturerSet).some((id) => favoriteManufacturerIds.has(id))
      ? 1
      : 0;

    const onboardingRaw =
      likedHit * ONBOARDING_LIKED_BONUS +
      manufacturerHit * ONBOARDING_MANUFACTURER_BONUS -
      dislikedHit * ONBOARDING_DISLIKED_PENALTY;
    const onboardingScore = clamp01(onboardingRaw);

    const score =
      popularityScore * COLD_START_POPULARITY_WEIGHT +
      onboardingScore * COLD_START_ONBOARDING_WEIGHT;

    return { mix, score };
  });

  return ranked.sort((a, b) => b.score - a.score);
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

    const modelItems = recommendations
      .filter((rec) => !seenMixIds.has(rec.mixId))
      .slice(0, limit)
      .map((rec) => ({
        score: rec.score,
        source: 'model' as RecommendationSource,
        mix: rec.mix,
      }));

    if (modelItems.length >= limit) {
      return reply.send({ items: modelItems });
    }

    const selectedMixIds = new Set(modelItems.map((item) => item.mix.id));
    const remaining = limit - modelItems.length;

    const fallbackPool = await prisma.mix.findMany({
      orderBy: { sessions: { _count: 'desc' } },
      take: limit * 5,
      include: {
        components: { include: { tobacco: { include: { manufacturer: true } } } },
      },
    });

    const fallbackCandidates = fallbackPool.filter(
      (mix) => !seenMixIds.has(mix.id) && !selectedMixIds.has(mix.id),
    );
    const fallbackMixIds = fallbackCandidates.map((mix) => mix.id);

    const [sessionCountRows, ratingSummaryRows, preferenceProfile] = await Promise.all([
      prisma.smokingSession.groupBy({
        by: ['mixId'],
        where: {
          mixId: { in: fallbackMixIds },
        },
        _count: { mixId: true },
      }),
      prisma.mixRating.groupBy({
        by: ['mixId'],
        where: {
          mixId: { in: fallbackMixIds },
          source: 'direct',
        },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.preferenceProfile.findUnique({
        where: { userId },
      }),
    ]);

    const sessionCountByMixId = buildSessionCountMap(sessionCountRows);
    const avgRatingByMixId = buildAverageRatingMap(ratingSummaryRows);
    const hasAnyRatings = ratingSummaryRows.some((row) => (row._count.rating ?? 0) > 0);

    const fallbackItems: Array<{
      score: number | null;
      source: RecommendationSource;
      mix: (typeof fallbackCandidates)[number];
    }> = [];

    const selectedFallbackMixIds = new Set<string>();

    if (hasAnyRatings) {
      const rankedTop = rankTopFallback(fallbackCandidates, sessionCountByMixId, avgRatingByMixId);
      const rankedTopByMixId = new Map(rankedTop.map((item) => [item.mix.id, item]));
      const diversifiedTop = diversifyByManufacturer(
        rankedTop.map((item) => item.mix),
        remaining,
      );

      for (const mix of diversifiedTop) {
        const ranked = rankedTopByMixId.get(mix.id);
        fallbackItems.push({
          score: ranked?.score ?? null,
          source: 'top',
          mix,
        });
        selectedFallbackMixIds.add(mix.id);
      }
    }

    if (fallbackItems.length < remaining) {
      const left = remaining - fallbackItems.length;
      const coldStartCandidates = fallbackCandidates.filter(
        (mix) => !selectedFallbackMixIds.has(mix.id),
      );
      const likedProfiles = new Set(preferenceProfile?.likedProfiles ?? []);
      const dislikedProfiles = new Set(preferenceProfile?.dislikedProfiles ?? []);
      const favoriteManufacturerIds = new Set(preferenceProfile?.favoriteManufacturerIds ?? []);

      const rankedColdStart = rankColdStartFallback(
        coldStartCandidates,
        sessionCountByMixId,
        likedProfiles,
        dislikedProfiles,
        favoriteManufacturerIds,
      );
      const diversifiedColdStart = diversifyByManufacturer(
        rankedColdStart.map((item) => item.mix),
        left,
      );

      fallbackItems.push(
        ...diversifiedColdStart.map((mix) => ({
          score: null,
          source: 'cold_start' as RecommendationSource,
          mix,
        })),
      );
    }

    return reply.send({
      items: [...modelItems, ...fallbackItems],
    });
  });
};
