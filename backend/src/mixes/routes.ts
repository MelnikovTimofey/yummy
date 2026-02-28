import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FlavorProfile } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 200;
const flavorProfileSchema = z.nativeEnum(FlavorProfile);
const uuidSchema = z.string().uuid();
const sortSchema = z.enum(['newest', 'rating', 'popularity']);
const multiSelectSchema = z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]);

const mixCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  components: z
    .array(
      z.object({
        tobaccoId: z.string().uuid(),
        proportion: z.coerce.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(10),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  authorId: z.string().uuid().optional(),
  isUserMix: z.coerce.boolean().optional(),
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

const validateComponents = (components: { tobaccoId: string; proportion: number }[]) => {
  const total = components.reduce((sum, item) => sum + item.proportion, 0);
  if (total !== 100) {
    return 'Components proportion must sum to 100';
  }

  const ids = components.map((item) => item.tobaccoId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return 'Duplicate tobacco components are not allowed';
  }

  return null;
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

export const registerMixRoutes = async (app: FastifyInstance) => {
  app.get('/mixes', async (request, reply) => {
    const parseResult = listSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const {
      limit,
      offset,
      authorId,
      isUserMix,
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

    const mixes = await prisma.mix.findMany({
      where: {
        ...(authorId ? { authorId } : {}),
        ...(isUserMix !== undefined ? { isUserMix } : {}),
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
      include: {
        components: {
          include: {
            tobacco: { include: { manufacturer: true } },
          },
        },
        author: true,
      },
    });

    const mixIds = mixes.map((mix) => mix.id);
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
        ? mixes.filter((mix) => (avgRatingByMixId[mix.id] ?? 0) >= minRating)
        : mixes;

    const sorted = [...filteredByRating].sort((a, b) => {
      if (sort === 'rating') {
        const avgDiff = (avgRatingByMixId[b.id] ?? 0) - (avgRatingByMixId[a.id] ?? 0);
        if (avgDiff !== 0) {
          return avgDiff;
        }
        const countDiff = (ratingCountByMixId[b.id] ?? 0) - (ratingCountByMixId[a.id] ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
      }

      if (sort === 'popularity') {
        const sessionDiff = (sessionCountByMixId[b.id] ?? 0) - (sessionCountByMixId[a.id] ?? 0);
        if (sessionDiff !== 0) {
          return sessionDiff;
        }
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const paged = sorted.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50));
    return reply.send({ items: paged });
  });

  app.get('/mixes/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const mix = await prisma.mix.findUnique({
      where: { id },
      include: {
        components: { include: { tobacco: { include: { manufacturer: true } } } },
        author: true,
      },
    });

    if (!mix) {
      return reply.status(404).send({ error: 'Mix not found' });
    }

    return reply.send(mix);
  });

  app.post('/mixes', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = mixCreateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const validationError = validateComponents(parseResult.data.components);
    if (validationError) {
      return reply.status(400).send({ error: validationError });
    }

    const tobaccoIds = dedupe(parseResult.data.components.map((item) => item.tobaccoId));
    const tobaccos = await prisma.tobacco.findMany({
      where: { id: { in: tobaccoIds } },
      select: {
        id: true,
        flavorProfiles: true,
        flavors: true,
        flavorTags: true,
      },
    });

    if (tobaccos.length !== tobaccoIds.length) {
      return reply.status(400).send({ error: 'One or more tobaccos not found' });
    }

    const flavorProfiles = dedupe(tobaccos.flatMap((tobacco) => tobacco.flavorProfiles));
    const flavors = dedupe(tobaccos.flatMap((tobacco) => tobacco.flavors));
    const tags = dedupe([
      ...(parseResult.data.tags ?? []).map((item) => item.toLowerCase().trim()),
      ...tobaccos.flatMap((tobacco) => tobacco.flavorTags),
    ]);

    const mix = await prisma.mix.create({
      data: {
        name: parseResult.data.name,
        description: parseResult.data.description ?? null,
        flavorProfiles,
        flavors,
        tags,
        isUserMix: true,
        authorId: request.user!.id,
        components: {
          create: parseResult.data.components.map((component) => ({
            tobaccoId: component.tobaccoId,
            proportion: component.proportion,
          })),
        },
      },
      include: {
        components: { include: { tobacco: { include: { manufacturer: true } } } },
        author: true,
      },
    });

    return reply.status(201).send(mix);
  });
};
