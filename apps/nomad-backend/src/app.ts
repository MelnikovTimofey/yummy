import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: config.appName,
  }));

  app.get('/meta', async () => ({
    appName: config.appName,
    mode: 'scaffold',
    scope: ['guest-access', 'staff-auth', 'inventory', 'mixes', 'rails', 'analytics'],
  }));

  return app;
};
