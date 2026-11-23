import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Не env(): `prisma generate` при сборке образа идёт без DATABASE_URL.
    url: process.env.DATABASE_URL!,
  },
});
