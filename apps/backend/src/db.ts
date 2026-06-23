import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= process.env.NODE_ENV === 'test'
  ? 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=nomad_test'
  : 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

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
