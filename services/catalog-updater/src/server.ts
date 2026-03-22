import Fastify from 'fastify';
import { config } from './config';
import { prisma } from './db';
import { jobsRoutes } from './routes/jobs';

const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

app.get('/health', async () => ({
  service: 'catalog-updater',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

app.register(jobsRoutes);

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

const start = async () => {
  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info(`catalog-updater listening on ${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
