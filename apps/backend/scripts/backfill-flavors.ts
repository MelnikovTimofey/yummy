import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { buildNomadTaxonomyCandidate } from '../src/integrations/htreviews/taxonomy';

process.env.DATABASE_URL ??= 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

const prisma = new PrismaClient();

// Подтверждение обязательно: при --apply скрипт меняет каталог в БД из
// DATABASE_URL. Без флага — режим превью (ничего не пишет). По аналогии с
// scripts/clean-db.ts.
const confirmed =
  process.argv.slice(2).some((arg) => arg === '--yes' || arg === '-y' || arg === '--apply') ||
  process.env.NOMAD_CONFIRM_BACKFILL === '1';

const maskDatabaseUrl = (url: string | undefined) =>
  url?.replace(/:[^:@/]*@/, ':***@') ?? '<no DATABASE_URL>';

const parseList = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

// Сериализуем как htreviews-синк (src/integrations/htreviews/sync.ts): кандидат
// уже trimmed/dedup/sorted внутри buildNomadTaxonomyCandidate.
const serializeList = (items: string[]) => JSON.stringify(items);

const main = async () => {
  console.log(`[backfill-flavors] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  // Чиним строго #118: фиксим только табаки с ПУСТЫМ flavors, у которых новая
  // таксономия (fallback по profile-only тегам) даёт вкусы из уже сохранённого
  // rawSourceTags. Непустой flavors не трогаем — это защита от затирания ручной
  // курации. flavorProfiles/flavorTags тоже не трогаем: их логика не менялась.
  const rows = await prisma.tobacco.findMany({
    select: { id: true, name: true, manufacturer: true, rawSourceTags: true, flavors: true },
  });

  const updates: Array<{ id: string; name: string; manufacturer: string; flavors: string[] }> = [];
  let emptyFlavors = 0;
  for (const row of rows) {
    if (parseList(row.flavors).length) {
      continue;
    }
    emptyFlavors++;
    const candidate = buildNomadTaxonomyCandidate(parseList(row.rawSourceTags));
    if (candidate.flavors.length) {
      updates.push({ id: row.id, name: row.name, manufacturer: row.manufacturer, flavors: candidate.flavors });
    }
  }

  console.log(`[backfill-flavors] всего табаков: ${rows.length}`);
  console.log(`[backfill-flavors] с пустым flavors: ${emptyFlavors}`);
  console.log(
    `[backfill-flavors] будет заполнено: ${updates.length}` +
      ` (останутся без вкусов: ${emptyFlavors - updates.length} — только зонтичные теги / без тегов)`,
  );
  if (updates.length) {
    console.log('[backfill-flavors] примеры (до 10):');
    console.table(
      updates.slice(0, 10).map((item) => ({
        name: item.name,
        manufacturer: item.manufacturer,
        flavors: item.flavors.join(', '),
      })),
    );
  }

  if (!confirmed) {
    console.log(
      '\n[backfill-flavors] РЕЖИМ ПРЕВЬЮ — ничего не записано.\n' +
        'Для применения запусти с подтверждением:\n' +
        '  npm run backfill:flavors -- --apply\n' +
        '  (или NOMAD_CONFIRM_BACKFILL=1 npm run backfill:flavors)',
    );
    return;
  }

  let applied = 0;
  for (const item of updates) {
    await prisma.tobacco.update({
      where: { id: item.id },
      data: { flavors: serializeList(item.flavors) },
    });
    applied += 1;
    if (applied % 100 === 0) {
      console.log(`[backfill-flavors] обновлено ${applied}/${updates.length}...`);
    }
  }
  console.log(`[backfill-flavors] готово. Обновлено строк: ${applied}. Повторный прогон покажет 0 изменений.`);
};

void main()
  .catch((error) => {
    console.error('[backfill-flavors] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
