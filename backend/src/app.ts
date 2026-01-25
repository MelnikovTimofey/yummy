import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registerAuthRoutes } from './auth/routes';
import { config } from './config';
import { registerCatalogRoutes } from './catalog/routes';
import { registerMixRoutes } from './mixes/routes';
import { registerSessionRoutes } from './sessions/routes';
import { registerRatingRoutes } from './ratings/routes';
import { registerRecommendationRoutes } from './recommendations/routes';
import { registerPreferenceRoutes } from './preferences/routes';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.register(rateLimit, {
    global: false,
  });

  app.register(registerAuthRoutes);
  app.register(registerCatalogRoutes);
  app.register(registerMixRoutes);
  app.register(registerSessionRoutes);
  app.register(registerRatingRoutes);
  app.register(registerRecommendationRoutes);
  app.register(registerPreferenceRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
};
