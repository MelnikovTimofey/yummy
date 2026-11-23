import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client';

type PgAdapterOptions = ConstructorParameters<typeof PrismaPg>[1];

export const pgAdapterArgs = (databaseUrl: string): [PoolConfig, PgAdapterOptions] => {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? undefined;
  return [
    {
      connectionString: databaseUrl,
      // Таймауты Prisma 5: у pg по умолчанию ожидание соединения бесконечно.
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 300_000,
      // Как с движком Prisma 5: скрипты и тесты завершаются без $disconnect.
      allowExitOnIdle: true,
      // Схема адаптера квалифицирует запросы клиента, search_path — raw-запросы.
      ...(schema && { options: `-c search_path="${schema}"` }),
    },
    schema ? { schema } : undefined,
  ];
};

export const createPrismaClient = (log?: Prisma.LogLevel[]) =>
  new PrismaClient({ log, adapter: new PrismaPg(...pgAdapterArgs(process.env.DATABASE_URL!)) });
