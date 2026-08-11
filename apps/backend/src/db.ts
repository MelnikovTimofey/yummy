import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= process.env.NODE_ENV === 'test'
  ? 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=nomad_test'
  : 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

export const prisma = globalThis.__prismaClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

export default prisma;
