import { FlavorProfile } from '@prisma/client';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../auth/jwt';
import { prisma } from '../db';

const RAIL_ITEM_LIMIT = 20;

const getOptionalUserId = (request: FastifyRequest) => {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }
  if (!header.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyAccessToken(token);
  return payload.sub;
};

const dedupe = <T>(items: T[]) => Array.from(new Set(items));

const fetchMixesByIds = async (mixIds: string[]) => {
  if (!mixIds.length) {
    return [];
  }

  const mixes = await prisma.mix.findMany({
    where: { id: { in: mixIds } },
    include: {
      components: {
        include: {
          tobacco: {
            include: {
              manufacturer: true,
            },
          },
        },
      },
      author: true,
    },
  });

  const byId = new Map(mixes.map((mix) => [mix.id, mix]));
  return mixIds.map((id) => byId.get(id)).filter(Boolean);
};

const getTopRatedMixIds = async (limit: number) => {
  const rows = await prisma.mixRating.groupBy({
    by: ['mixId'],
    where: { source: 'direct' },
    _avg: { rating: true },
    _count: { rating: true },
    orderBy: [{ _avg: { rating: 'desc' } }, { _count: { rating: 'desc' } }],
    take: limit,
  });

  return rows.map((row) => row.mixId);
};

const getTopSessionMixIds = async (limit: number) => {
  const rows = await prisma.smokingSession.groupBy({
    by: ['mixId'],
    _count: { mixId: true },
    orderBy: { _count: { mixId: 'desc' } },
    take: limit,
  });
  return rows.map((row) => row.mixId);
};

const getMostFavoritedMixIds = async (limit: number) => {
  const rows = await prisma.favoriteMix.groupBy({
    by: ['mixId'],
    _count: { mixId: true },
    orderBy: { _count: { mixId: 'desc' } },
    take: limit,
  });
  return rows.map((row) => row.mixId);
};

const getEditorialRailItems = async (profiles: FlavorProfile[]) => {
  return prisma.mix.findMany({
    where: {
      isUserMix: false,
      flavorProfiles: { hasSome: profiles },
    },
    orderBy: { createdAt: 'desc' },
    take: RAIL_ITEM_LIMIT,
    include: {
      components: {
        include: {
          tobacco: {
            include: {
              manufacturer: true,
            },
          },
        },
      },
      author: true,
    },
  });
};

const buildRecommendationRail = async (userId: string | null) => {
  let canShowPersonal = false;
  if (userId) {
    const [preferenceProfile, sessionCount] = await Promise.all([
      prisma.preferenceProfile.findUnique({
        where: { userId },
        select: { id: true },
      }),
      prisma.smokingSession.count({ where: { userId } }),
    ]);
    canShowPersonal = Boolean(preferenceProfile) || sessionCount > 0;
  }

  let source: 'model' | 'fallback' = 'fallback';

  let recommendationMixIds: string[] = [];
  if (userId && canShowPersonal) {
    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      select: { mixId: true },
      orderBy: { score: 'desc' },
      take: RAIL_ITEM_LIMIT,
    });
    recommendationMixIds = recommendations.map((item) => item.mixId);
    if (recommendationMixIds.length > 0) {
      source = 'model';
    }
  }

  if (!recommendationMixIds.length) {
    const topRated = await getTopRatedMixIds(RAIL_ITEM_LIMIT);
    const topSessions = await getTopSessionMixIds(RAIL_ITEM_LIMIT);
    recommendationMixIds = dedupe([...topRated, ...topSessions]).slice(0, RAIL_ITEM_LIMIT);
    source = 'fallback';
  }

  const items = await fetchMixesByIds(recommendationMixIds);
  return {
    id: 'recommendations',
    type: 'recommendations',
    title: 'Рекомендации для вас',
    size: 'hero',
    source,
    items,
  };
};

const buildFavoritesRail = async (userId: string) => {
  const favoriteRows = await prisma.favoriteMix.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: RAIL_ITEM_LIMIT,
    select: { mixId: true },
  });
  const items = await fetchMixesByIds(favoriteRows.map((row) => row.mixId));
  return {
    id: 'favorites',
    type: 'favorites',
    title: 'Избранное',
    items,
  };
};

export const registerHomeRoutes = async (app: FastifyInstance) => {
  app.get('/home/rails', async (request, reply) => {
    let userId: string | null = null;
    try {
      userId = getOptionalUserId(request);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const rails: Array<Record<string, unknown>> = [];

    rails.push(await buildRecommendationRail(userId));

    if (userId) {
      rails.push(await buildFavoritesRail(userId));
    }

    const [editorialChildhood, editorialMensDay, editorialTaiga] = await Promise.all([
      getEditorialRailItems(['sweet', 'dessert']),
      getEditorialRailItems(['tobacco', 'spicy']),
      getEditorialRailItems(['fresh', 'sour']),
    ]);

    rails.push(
      {
        id: 'editorial-childhood',
        type: 'editorial',
        title: 'Вкусы из детства',
        items: editorialChildhood,
      },
      {
        id: 'editorial-mens-day',
        type: 'editorial',
        title: 'Мужской день',
        items: editorialMensDay,
      },
      {
        id: 'editorial-taiga',
        type: 'editorial',
        title: 'Вкусы тайги',
        items: editorialTaiga,
      },
    );

    const [top100ByRatingIds, top10BySessionsIds, newestMixes, mostFavoritedIds] = await Promise.all([
      getTopRatedMixIds(100),
      getTopSessionMixIds(10),
      prisma.mix.findMany({
        orderBy: { createdAt: 'desc' },
        take: RAIL_ITEM_LIMIT,
        include: {
          components: {
            include: {
              tobacco: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
          author: true,
        },
      }),
      getMostFavoritedMixIds(RAIL_ITEM_LIMIT),
    ]);

    const [top100ByRating, top10BySessions, mostFavorited] = await Promise.all([
      fetchMixesByIds(top100ByRatingIds),
      fetchMixesByIds(top10BySessionsIds),
      fetchMixesByIds(mostFavoritedIds),
    ]);

    rails.push(
      {
        id: 'analytics-top-rating',
        type: 'analytics',
        title: 'ТОП-100 по оценкам',
        items: top100ByRating,
      },
      {
        id: 'analytics-top-sessions',
        type: 'analytics',
        title: 'ТОП-10 по частоте сессий',
        items: top10BySessions,
      },
      {
        id: 'analytics-new',
        type: 'analytics',
        title: 'Новинки',
        items: newestMixes,
      },
      {
        id: 'analytics-favorites',
        type: 'analytics',
        title: 'Самые добавляемые в избранное',
        items: mostFavorited,
      },
    );

    if (userId) {
      const myMixes = await prisma.mix.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: RAIL_ITEM_LIMIT,
        include: {
          components: {
            include: {
              tobacco: {
                include: {
                  manufacturer: true,
                },
              },
            },
          },
          author: true,
        },
      });

      if (myMixes.length > 0) {
        rails.push({
          id: 'my-mixes',
          type: 'my-mixes',
          title: 'Мои миксы',
          items: myMixes,
        });
      }
    }

    return reply.send({ items: rails });
  });
};
