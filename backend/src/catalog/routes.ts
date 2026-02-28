import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FlavorProfile } from '@prisma/client';
import { prisma } from '../db';

const MAX_LIMIT = 200;

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const manufacturerQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
});

const tobaccoQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  manufacturerId: z.string().uuid().optional(),
  profile: z.nativeEnum(FlavorProfile).optional(),
  flavor: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  strengthMin: z.coerce.number().int().min(0).max(10).optional(),
  strengthMax: z.coerce.number().int().min(0).max(10).optional(),
});

const applyPagination = (query: { limit?: number; offset?: number }) => ({
  take: query.limit ?? 50,
  skip: query.offset ?? 0,
});

export const registerCatalogRoutes = async (app: FastifyInstance) => {
  app.get('/manufacturers', async (request, reply) => {
    const parseResult = manufacturerQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const { search, ...pagination } = parseResult.data;

    const manufacturers = await prisma.manufacturer.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: { name: 'asc' },
      ...applyPagination(pagination),
    });

    return reply.send({ items: manufacturers });
  });

  app.get('/manufacturers/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const manufacturer = await prisma.manufacturer.findUnique({ where: { id } });

    if (!manufacturer) {
      return reply.status(404).send({ error: 'Manufacturer not found' });
    }

    return reply.send(manufacturer);
  });

  app.get('/tobaccos', async (request, reply) => {
    const parseResult = tobaccoQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const { search, manufacturerId, profile, flavor, tag, strengthMin, strengthMax, ...pagination } =
      parseResult.data;

    const tobaccos = await prisma.tobacco.findMany({
      where: {
        ...(manufacturerId ? { manufacturerId } : {}),
        ...(profile ? { flavorProfiles: { has: profile } } : {}),
        ...(flavor ? { flavors: { has: flavor.trim().toLowerCase() } } : {}),
        ...(tag ? { flavorTags: { has: tag.trim().toLowerCase() } } : {}),
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(strengthMin !== undefined || strengthMax !== undefined
          ? {
              strength: {
                ...(strengthMin !== undefined ? { gte: strengthMin } : {}),
                ...(strengthMax !== undefined ? { lte: strengthMax } : {}),
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { manufacturer: true },
      ...applyPagination(pagination),
    });

    return reply.send({ items: tobaccos });
  });

  app.get('/tobaccos/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const tobacco = await prisma.tobacco.findUnique({
      where: { id },
      include: { manufacturer: true },
    });

    if (!tobacco) {
      return reply.status(404).send({ error: 'Tobacco not found' });
    }

    return reply.send(tobacco);
  });
};
