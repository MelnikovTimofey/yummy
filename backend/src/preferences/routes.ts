import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FlavorProfile } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth } from '../auth/guard';

const flavorProfileEnum = z.nativeEnum(FlavorProfile);

const preferenceProfileSchema = z.object({
  likedProfiles: z.array(flavorProfileEnum).default([]),
  dislikedProfiles: z.array(flavorProfileEnum).default([]),
  favoriteManufacturerIds: z.array(z.string().uuid()).default([]),
});

const uniq = <T>(values: T[]) => Array.from(new Set(values));

export const registerPreferenceRoutes = async (app: FastifyInstance) => {
  app.get('/preference-profile', { preHandler: requireAuth }, async (request) => {
    const profile = await prisma.preferenceProfile.findUnique({
      where: { userId: request.user!.id },
    });

    return { profile };
  });

  app.put('/preference-profile', { preHandler: requireAuth }, async (request, reply) => {
    const parseResult = preferenceProfileSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const likedProfiles = uniq(parseResult.data.likedProfiles);
    const dislikedProfiles = uniq(parseResult.data.dislikedProfiles).filter(
      (item) => !likedProfiles.includes(item),
    );
    const favoriteManufacturerIds = uniq(parseResult.data.favoriteManufacturerIds);

    const profile = await prisma.preferenceProfile.upsert({
      where: { userId: request.user!.id },
      create: {
        userId: request.user!.id,
        likedProfiles,
        dislikedProfiles,
        favoriteManufacturerIds,
      },
      update: {
        likedProfiles,
        dislikedProfiles,
        favoriteManufacturerIds,
      },
    });

    return reply.send({ profile });
  });
};
