import 'dotenv/config';
import { createPrismaClient } from './prisma-client';

process.env.DATABASE_URL ??= process.env.NODE_ENV === 'test'
  ? 'postgresql://atelier:atelier@127.0.0.1:5433/atelier?schema=atelier_test'
  : 'postgresql://atelier:atelier@127.0.0.1:5433/atelier?schema=public';

const createClient = () =>
  createPrismaClient(process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']);

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: ReturnType<typeof createClient> | undefined;
}

export const prisma = globalThis.__prismaClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

export default prisma;
