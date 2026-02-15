import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const MAX_LIMIT = 200;

const mixCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
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
});

const applyPagination = (query: { limit?: number; offset?: number }) => ({
  take: query.limit ?? 50,
  skip: query.offset ?? 0,
});

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

export const registerMixRoutes = async (app: FastifyInstance) => {
  app.get('/mixes', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = listSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query params' });
    }

    const { authorId, ...pagination } = parseResult.data;

    const mixes = await prisma.mix.findMany({
      where: authorId ? { authorId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        components: {
          include: {
            tobacco: { include: { manufacturer: true } },
          },
        },
        author: true,
      },
      ...applyPagination(pagination),
    });

    return reply.send({ items: mixes });
  });

  app.get('/mixes/:id', { preHandler: requireAuth }, async (request, reply) => {
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

    const tobaccoIds = parseResult.data.components.map((item) => item.tobaccoId);
    const tobaccoCount = await prisma.tobacco.count({
      where: { id: { in: tobaccoIds } },
    });

    if (tobaccoCount !== tobaccoIds.length) {
      return reply.status(400).send({ error: 'One or more tobaccos not found' });
    }

    const mix = await prisma.mix.create({
      data: {
        name: parseResult.data.name,
        description: parseResult.data.description ?? null,
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
