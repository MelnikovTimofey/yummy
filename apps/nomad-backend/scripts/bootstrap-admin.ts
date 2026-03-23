import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

const prisma = new PrismaClient();

const env = (value: string | undefined, fallback = '') => value?.trim() || fallback;

const login = env(process.env.NOMAD_BOOTSTRAP_ADMIN_LOGIN, 'admin');
const name = env(process.env.NOMAD_BOOTSTRAP_ADMIN_NAME, 'Nomad Admin');
const password = env(process.env.NOMAD_BOOTSTRAP_ADMIN_PASSWORD);

const createSecretHash = (secret: string, salt: string) => crypto.scryptSync(secret, salt, 64).toString('hex');

const main = async () => {
  if (!password) {
    throw new Error('NOMAD_BOOTSTRAP_ADMIN_PASSWORD is required');
  }

  const current = await prisma.nomadStaffAccount.findUnique({
    where: { login },
    select: {
      id: true,
      login: true,
    },
  });

  const accountId = current?.id ?? `staff-${login.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-')}-bootstrap`;
  const passwordSalt = `bootstrap:${accountId}:${Date.now()}`;
  const passwordHash = createSecretHash(password, passwordSalt);

  const saved = await prisma.nomadStaffAccount.upsert({
    where: { login },
    update: {
      name,
      role: 'admin',
      active: true,
      passwordSalt,
      passwordHash,
    },
    create: {
      id: accountId,
      login,
      name,
      role: 'admin',
      active: true,
      passwordSalt,
      passwordHash,
    },
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      active: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: current ? 'updated' : 'created',
        account: {
          id: saved.id,
          login: saved.login,
          name: saved.name,
          role: saved.role,
          active: saved.active,
          createdAt: saved.createdAt.toISOString(),
          updatedAt: saved.updatedAt.toISOString(),
        },
      },
      null,
      2,
    ),
  );
};

void main()
  .catch((error) => {
    console.error('[nomad-backend] bootstrap-admin failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
