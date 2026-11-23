import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { pgAdapterArgs } from './prisma-client';

// Prisma 7 ходит в Postgres через pg, а pg не знает параметра ?schema= из
// DATABASE_URL: без явной передачи тесты и raw-запросы ушли бы в public (#649).
test('pgAdapterArgs переносит ?schema= в адаптер и search_path', () => {
  const [pool, options] = pgAdapterArgs('postgresql://u:p@db:5432/atelier?schema=atelier_test');

  assert.equal(pool.connectionString, 'postgresql://u:p@db:5432/atelier?schema=atelier_test');
  assert.equal(pool.options, '-c search_path="atelier_test"');
  assert.deepEqual(options, { schema: 'atelier_test' });
});

test('pgAdapterArgs без ?schema= оставляет схему по умолчанию', () => {
  const [pool, options] = pgAdapterArgs('postgresql://u:p@db:5432/atelier');

  assert.equal(pool.options, undefined);
  assert.equal(options, undefined);
});

test('raw-запросы идут в схему из DATABASE_URL', async () => {
  const expected = new URL(process.env.DATABASE_URL!).searchParams.get('schema');
  const [row] = await prisma.$queryRaw<Array<{ schema: string }>>`SELECT current_schema() AS "schema"`;

  assert.equal(row.schema, expected);
});
