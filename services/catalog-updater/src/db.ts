import { config } from './config';

type PrismaClientCtor = new (options?: {
  datasources?: {
    db?: {
      url?: string;
    };
  };
}) => any;

const loadPrismaClient = (): { PrismaClient: PrismaClientCtor } => {
  try {
    return require('../../../backend/node_modules/@prisma/client') as { PrismaClient: PrismaClientCtor };
  } catch {
    return require('@prisma/client') as { PrismaClient: PrismaClientCtor };
  }
};

const { PrismaClient } = loadPrismaClient();

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});
