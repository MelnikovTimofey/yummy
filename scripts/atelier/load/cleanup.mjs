#!/usr/bin/env node
// SQL, удаляющий ровно события прогона: k6 пишет созданные записи в --console-output.
// Клики живых гостей и сотрудников в то же окно не трогаются. Без --commit транзакция откатывается.
//   node cleanup.mjs created.log [--commit] | ssh atelier-prod 'cd /opt/atelier && docker compose \
//     -f docker-compose.prod.yml --env-file .env exec -T db psql -U atelier -d atelier -v ON_ERROR_STOP=1'
import { readFileSync } from 'node:fs';

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error('Использование: node cleanup.mjs <created.log> [--commit]');
  process.exit(1);
}

const pattern = /created (SmokeCtaEvent|CustomMixSmokeEvent) ([^\s"]+)(?: ([^\s"]+))?/g;
const smoke = [];
const custom = [];
for (const [, table, id, recordedAt] of readFileSync(file, 'utf8').matchAll(pattern)) {
  if (table === 'SmokeCtaEvent') {
    smoke.push([id, recordedAt]);
  } else {
    custom.push(id);
  }
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const insert = (table, rows) => (rows.length ? `INSERT INTO ${table} VALUES ${rows.join(', ')};` : '');

console.log(`BEGIN;
CREATE TEMP TABLE load_smoke (mix_id text, created_at timestamp(3)) ON COMMIT DROP;
${insert('load_smoke', smoke.map(([mixId, at]) => `(${quote(mixId)}, ${quote(at)}::timestamptz AT TIME ZONE 'UTC')`))}
CREATE TEMP TABLE load_custom (id text) ON COMMIT DROP;
${insert('load_custom', custom.map((id) => `(${quote(id)})`))}
SELECT
  (SELECT count(*) FROM load_smoke) AS smoke_ours,
  (SELECT count(*) FROM "SmokeCtaEvent" e JOIN load_smoke l ON e."mixId" = l.mix_id AND e."createdAt" = l.created_at) AS smoke_found,
  (SELECT count(*) FROM "SmokeCtaEvent"
    WHERE "createdAt" BETWEEN (SELECT min(created_at) FROM load_smoke) AND (SELECT max(created_at) FROM load_smoke)) AS smoke_in_window,
  (SELECT count(*) FROM load_custom) AS custom_ours,
  (SELECT count(*) FROM "CustomMixSmokeEvent" WHERE id IN (SELECT id FROM load_custom)) AS custom_found,
  (SELECT count(*) FROM "CustomMixSmokeEvent" WHERE name = 'k6 #154') AS custom_with_marker;
DELETE FROM "SmokeCtaEvent" e USING load_smoke l WHERE e."mixId" = l.mix_id AND e."createdAt" = l.created_at;
DELETE FROM "CustomMixSmokeEvent" WHERE id IN (SELECT id FROM load_custom);
-- Учётки входа из прогона (LOGIN_SHARE, #239): Telegram id с префиксом прогона.
SELECT count(*) AS load_guests FROM "GuestAccount" WHERE "telegramId" LIKE '999000%';
DELETE FROM "GuestAccount" WHERE "telegramId" LIKE '999000%';
DELETE FROM "GuestLoginCode" WHERE "telegramId" LIKE '999000%' OR "telegramId" IS NULL AND "expiresAt" < now();
${flag === '--commit' ? 'COMMIT' : 'ROLLBACK'};`);
