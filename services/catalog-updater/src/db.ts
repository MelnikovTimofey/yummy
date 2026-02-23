import { PrismaClient } from '../../../backend/node_modules/@prisma/client';
import { config } from './config';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});
