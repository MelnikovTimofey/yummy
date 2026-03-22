import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'file:./nomad.db';

declare global {
  // eslint-disable-next-line no-var
  var __nomadPrismaClient: PrismaClient | undefined;
}

const createClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

export const prisma = globalThis.__nomadPrismaClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nomadPrismaClient = prisma;
}

export default prisma;
