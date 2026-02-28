import { FlavorProfile } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 200;
const flavorProfileSchema = z.nativeEnum(FlavorProfile);
const uuidSchema = z.string().uuid();
const sortSchema = z.enum(['newest', 'rating', 'popularity']);
const multiSelectSchema = z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]);

const createSchema = z.object({
  mixId: z.string().uuid(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  search: z.string().trim().min(1).optional(),
  manufacturerId: z.string().uuid().optional(),
  manufacturerIds: multiSelectSchema.optional(),
  tobaccoId: z.string().uuid().optional(),
  tobaccoIds: multiSelectSchema.optional(),
  profile: flavorProfileSchema.optional(),
  profiles: multiSelectSchema.optional(),
  flavor: z.string().trim().min(1).optional(),
  flavors: multiSelectSchema.optional(),
  tag: z.string().trim().min(1).optional(),
  tags: multiSelectSchema.optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: sortSchema.optional(),
});

const dedupe = <T>(items: T[]) => Array.from(new Set(items));

const parseMultiSelect = (input?: string | string[]) => {
  if (!input) {
    return [];
  }

  const values = Array.isArray(input) ? input : [input];
  return dedupe(
    values
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
};

const parseUuidList = (values: string[], label: string) => {
  const parsed: string[] = [];
  for (const value of values) {
    const result = uuidSchema.safeParse(value);
    if (!result.success) {
      throw new Error(`${label} contains invalid UUID`);
    }
    parsed.push(result.data);
  }
  return dedupe(parsed);
};

const parseProfileList = (values: string[]) => {
  const parsed: FlavorProfile[] = [];
  for (const value of values) {
    const result = flavorProfileSchema.safeParse(value);
    if (!result.success) {
      throw new Error('profiles contains invalid value');
    }
    parsed.push(result.data);
  }
  return dedupe(parsed);
};

export const registerFavoriteRoutes = async (app: FastifyInstance) => {
  app.get('/favorites', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const {
      limit,
      offset,
      search,
      manufacturerId,
      manufacturerIds: manufacturerIdsRaw,
      tobaccoId,
      tobaccoIds: tobaccoIdsRaw,
      profile,
      profiles: profilesRaw,
      flavor,
      flavors: flavorsRaw,
      tag,
      tags: tagsRaw,
      minRating,
      sort,
    } = parseResult.data;

    let manufacturerIds: string[];
    let tobaccoIds: string[];
    let profiles: FlavorProfile[];
    try {
      manufacturerIds = parseUuidList(
        dedupe([manufacturerId, ...parseMultiSelect(manufacturerIdsRaw)].filter(Boolean) as string[]),
        'manufacturerIds',
      );
      tobaccoIds = parseUuidList(
        dedupe([tobaccoId, ...parseMultiSelect(tobaccoIdsRaw)].filter(Boolean) as string[]),
        'tobaccoIds',
      );
      profiles = parseProfileList(
        dedupe([profile, ...parseMultiSelect(profilesRaw)].filter(Boolean) as string[]),
      );
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Invalid query params',
      });
    }

    const tags = dedupe([tag, ...parseMultiSelect(tagsRaw)].filter(Boolean) as string[]).map((item) =>
      item.toLowerCase(),
    );
    const flavors = dedupe([flavor, ...parseMultiSelect(flavorsRaw)].filter(Boolean) as string[]).map(
      (item) => item.toLowerCase(),
    );

    const componentFilter = {
      ...(tobaccoIds.length ? { tobaccoId: { in: tobaccoIds } } : {}),
      ...(manufacturerIds.length
        ? {
            tobacco: {
              manufacturerId: { in: manufacturerIds },
            },
          }
        : {}),
    };

    const favorites = await prisma.favoriteMix.findMany({
      where: {
        userId: request.user!.id,
        mix: {
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
          ...(profiles.length ? { flavorProfiles: { hasSome: profiles } } : {}),
          ...(flavors.length ? { flavors: { hasSome: flavors } } : {}),
          ...(tags.length ? { tags: { hasSome: tags } } : {}),
          ...(manufacturerIds.length || tobaccoIds.length
            ? {
                components: {
                  some: componentFilter,
                },
              }
            : {}),
        },
      },
      include: {
        mix: {
          include: {
            components: {
              include: {
                tobacco: { include: { manufacturer: true } },
              },
            },
            author: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mixIds = favorites.map((item) => item.mixId);
    const [ratingSummaryRows, sessionCountRows] = await Promise.all([
      mixIds.length
        ? prisma.mixRating.groupBy({
            by: ['mixId'],
            where: {
              mixId: { in: mixIds },
              source: 'direct',
            },
            _avg: { rating: true },
            _count: { rating: true },
          })
        : Promise.resolve([]),
      mixIds.length
        ? prisma.smokingSession.groupBy({
            by: ['mixId'],
            where: { mixId: { in: mixIds } },
            _count: { mixId: true },
          })
        : Promise.resolve([]),
    ]);

    const avgRatingByMixId = ratingSummaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.mixId] = row._avg.rating ?? 0;
      return acc;
    }, {});
    const ratingCountByMixId = ratingSummaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.mixId] = row._count.rating;
      return acc;
    }, {});
    const sessionCountByMixId = sessionCountRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.mixId] = row._count.mixId;
      return acc;
    }, {});

    const filteredByRating =
      minRating !== undefined
        ? favorites.filter((item) => (avgRatingByMixId[item.mixId] ?? 0) >= minRating)
        : favorites;

    const sorted = [...filteredByRating].sort((a, b) => {
      if (sort === 'rating') {
        const avgDiff = (avgRatingByMixId[b.mixId] ?? 0) - (avgRatingByMixId[a.mixId] ?? 0);
        if (avgDiff !== 0) {
          return avgDiff;
        }
        const countDiff =
          (ratingCountByMixId[b.mixId] ?? 0) - (ratingCountByMixId[a.mixId] ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
      }

      if (sort === 'popularity') {
        const sessionDiff =
          (sessionCountByMixId[b.mixId] ?? 0) - (sessionCountByMixId[a.mixId] ?? 0);
        if (sessionDiff !== 0) {
          return sessionDiff;
        }
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const paged = sorted.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50));
    return reply.send({ items: paged });
  });

  app.get('/favorites/ids', { preHandler: requireAuth }, async (request, reply) => {
    const rows = await prisma.favoriteMix.findMany({
      where: { userId: request.user!.id },
      select: { mixId: true },
    });
    return reply.send({ items: rows.map((row) => row.mixId) });
  });

  app.post('/favorites', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = createSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const mix = await prisma.mix.findUnique({ where: { id: parseResult.data.mixId } });
    if (!mix) {
      return reply.status(404).send({ error: 'Mix not found' });
    }

    const favorite = await prisma.favoriteMix.upsert({
      where: {
        userId_mixId: {
          userId: request.user!.id,
          mixId: parseResult.data.mixId,
        },
      },
      create: {
        userId: request.user!.id,
        mixId: parseResult.data.mixId,
      },
      update: {},
    });

    return reply.status(201).send(favorite);
  });

  app.delete('/favorites/:mixId', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = z.object({ mixId: z.string().uuid() }).safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid params' });
    }

    await prisma.favoriteMix.deleteMany({
      where: {
        userId: request.user!.id,
        mixId: parseResult.data.mixId,
      },
    });

    return reply.send({ ok: true });
  });
};
