import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assignRails, parsePool, parseRails, type PoolEntry, type PoolMix } from '../src/editorial-rails';

process.env.DATABASE_URL ??= 'postgresql://atelier:atelier@127.0.0.1:5433/atelier?schema=public';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Назначение: собрать редакторский слой Арома Ателье поверх уже залитого
// каталога табаков (htreviews) — пул миксов из docs/data/mixes.md и
// prepared-рейлы из docs/data/preset-rails.md. Рейл задан правилом над
// таксономией табаков (src/editorial-rails.ts), миксы по рейлам раскладываются
// автоматически в порядке пула.
//
// В микс берётся только актуальный табак: «Выпускается» и в наличии. Микс с
// несопоставленным или неактуальным компонентом пропускается с отчётом.
//
// Скрипт владеет только своими строками — миксами `mix-catalog-*` и рейлами
// `rail-prepared-*` — и пересобирает их при каждом запуске. Миксы и
// curated-рейлы Мастера, инвентарь и staff/auth не трогает.
// Это НЕ seed: демо-фикстуры prisma/seed.ts не затрагиваются.
// ---------------------------------------------------------------------------

const maskDatabaseUrl = (url: string | undefined) =>
  url?.replace(/:[^:@/]*@/, ':***@') ?? '<no DATABASE_URL>';

const DOCS_DIR = path.join(__dirname, '../../../docs/data');
const MIX_ID_PREFIX = 'mix-catalog-';
const RAIL_ID_PREFIX = 'rail-prepared-';
const RAIL_LIMITS = { maxSize: 8, maxRailsPerMix: 2 };
const MIN_RAIL_SIZE = 5;

const parseList = (value: string) => JSON.parse(value) as string[];
const unique = (items: string[]) => [...new Set(items)];
const key = (manufacturer: string, lineName: string, name: string) =>
  [manufacturer, lineName, name].map((part) => part.trim().toLowerCase()).join(' / ');

type CatalogTobacco = {
  id: string;
  productionStatus: string | null;
  inStock: boolean;
  archived: boolean;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  strength: string | null;
};

const blockerOf = (tobacco: CatalogTobacco) => {
  if (tobacco.productionStatus !== 'Выпускается') return `статус «${tobacco.productionStatus ?? 'не указан'}»`;
  if (tobacco.archived) return 'в архиве';
  if (!tobacco.inStock) return 'нет в наличии';
  return null;
};

type BuiltMix = { entry: PoolEntry; poolMix: PoolMix; tobaccoIds: string[] };

const main = async () => {
  console.log(`[build-catalog] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  const tobaccoCount = await prisma.tobacco.count();
  console.log(`[build-catalog] табаков в каталоге: ${tobaccoCount}`);
  if (tobaccoCount < 1000) {
    throw new Error(
      `Каталог табаков слишком мал (${tobaccoCount} < 1000) — сначала восстанови ` +
        `каталог (снапшот или ~/nomad-backups/latest-tobacco.sql). Стоп.`,
    );
  }

  const pool = parsePool(fs.readFileSync(path.join(DOCS_DIR, 'mixes.md'), 'utf8'));
  const rails = parseRails(fs.readFileSync(path.join(DOCS_DIR, 'preset-rails.md'), 'utf8'));
  console.log(`[build-catalog] распарсено: миксов=${pool.length}, рейлов=${rails.length}`);

  const manufacturers = unique(pool.flatMap((entry) => entry.components.map((item) => item.manufacturer)));
  const records = await prisma.tobacco.findMany({
    where: { manufacturer: { in: manufacturers } },
    select: {
      id: true,
      manufacturer: true,
      lineName: true,
      name: true,
      productionStatus: true,
      inStock: true,
      archived: true,
      flavorProfiles: true,
      flavors: true,
      flavorTags: true,
      officialStrength: true,
    },
  });
  // Дубли карточек в каталоге бывают; актуальная карточка важнее снятой.
  const catalog = new Map<string, CatalogTobacco>();
  for (const { officialStrength, ...record } of records) {
    const tobacco: CatalogTobacco = {
      ...record,
      strength: officialStrength,
      flavorProfiles: parseList(record.flavorProfiles),
      flavors: parseList(record.flavors),
      flavorTags: parseList(record.flavorTags),
    };
    const id = key(record.manufacturer, record.lineName, record.name);
    const current = catalog.get(id);
    if (!current || (blockerOf(current) && !blockerOf(tobacco))) catalog.set(id, tobacco);
  }

  const built: BuiltMix[] = [];
  const skipped: string[] = [];
  for (const entry of pool) {
    const problems: string[] = [];
    const components: PoolMix['components'] = [];
    const tobaccoIds: string[] = [];
    for (const ref of entry.components) {
      const label = `${ref.manufacturer} / ${ref.lineName || '—'} / ${ref.name}`;
      const tobacco = catalog.get(key(ref.manufacturer, ref.lineName, ref.name));
      const blocker = tobacco ? blockerOf(tobacco) : 'нет в каталоге';
      if (!tobacco || blocker) {
        problems.push(`${label}: ${blocker}`);
        continue;
      }
      components.push({ tobacco, proportion: ref.proportion });
      tobaccoIds.push(tobacco.id);
    }
    if (problems.length) {
      skipped.push(`${entry.slug} «${entry.name}» — ${problems.join('; ')}`);
      continue;
    }
    built.push({ entry, poolMix: { slug: entry.slug, set: entry.set, components }, tobaccoIds });
  }

  console.log(`\n[build-catalog] миксов готово: ${built.length}/${pool.length}, пропущено: ${skipped.length}`);
  for (const line of skipped) console.log(`  пропуск ${line}`);

  const assigned = assignRails(rails, built.map((mix) => mix.poolMix), RAIL_LIMITS);
  const nameOf = new Map(built.map((mix) => [mix.entry.slug, mix.entry.name]));
  console.log('\n[build-catalog] === РАСКЛАДКА ПО РЕЙЛАМ ===');
  for (const rail of rails) {
    const slugs = assigned.get(rail.slug) ?? [];
    console.log(`«${rail.title}» (${rail.slug}): ${slugs.length}`);
    for (const slug of slugs) console.log(`  · ${slug} ${nameOf.get(slug)}`);
  }
  const railed = new Set([...assigned.values()].flat());
  const orphans = built.filter((mix) => !railed.has(mix.entry.slug));
  if (orphans.length) {
    console.log(`\nвне рейлов (только в каталоге): ${orphans.map((mix) => `${mix.entry.slug} ${mix.entry.name}`).join(', ')}`);
  }

  const thin = rails.filter((rail) => (assigned.get(rail.slug)?.length ?? 0) < MIN_RAIL_SIZE);
  if (thin.length) {
    throw new Error(
      `Рейлы меньше ${MIN_RAIL_SIZE} миксов: ${thin.map((rail) => rail.slug).join(', ')} — ` +
        `поправь правило или пул. Ничего не записано. Стоп.`,
    );
  }

  const args = process.argv.slice(2);
  if (!args.some((arg) => arg === '--yes' || arg === '-y')) {
    console.log('\n[build-catalog] РЕЖИМ ПРЕВЬЮ — БД не изменена. Запись: npm run build:catalog -- --yes');
    return;
  }

  // Пересборка удаляет миксы скрипта вместе с их событиями «Покурить» и
  // оценками — на живом проде это потеря аналитики, поэтому только осознанно.
  const ownedMixes = { id: { startsWith: MIX_ID_PREFIX } };
  const analytics =
    (await prisma.smokeCtaEvent.count({ where: { mix: ownedMixes } })) +
    (await prisma.mixRating.count({ where: { mix: ownedMixes } }));
  if (analytics > 0 && !args.includes('--drop-analytics')) {
    throw new Error(
      `Событий «Покурить» и оценок у пересобираемых миксов: ${analytics} — они будут удалены. ` +
        `Сними pg_dump и запусти с --drop-analytics, если это осознанно. Стоп.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.rail.deleteMany({ where: { id: { startsWith: RAIL_ID_PREFIX } } });
    await tx.mix.deleteMany({ where: ownedMixes });

    for (const { entry, poolMix, tobaccoIds } of built) {
      const tobaccos = poolMix.components.map((item) => item.tobacco);
      await tx.mix.create({
        data: {
          id: `${MIX_ID_PREFIX}${entry.slug}`,
          name: entry.name,
          description: entry.description,
          // Как у миксов Мастера: таксономия микса — объединение таксономии табаков.
          flavorProfiles: JSON.stringify(unique(tobaccos.flatMap((item) => item.flavorProfiles))),
          flavors: JSON.stringify(unique(tobaccos.flatMap((item) => item.flavors))),
          flavorTags: JSON.stringify(unique(tobaccos.flatMap((item) => item.flavorTags))),
          components: {
            create: tobaccoIds.map((tobaccoId, index) => ({
              tobaccoId,
              proportion: poolMix.components[index].proportion,
              sortOrder: index,
            })),
          },
        },
      });
    }

    for (const rail of rails) {
      await tx.rail.create({
        data: {
          id: `${RAIL_ID_PREFIX}${rail.slug}`,
          name: rail.title,
          description: rail.subtitle,
          type: 'prepared',
          mixes: {
            create: (assigned.get(rail.slug) ?? []).map((slug, index) => ({
              mixId: `${MIX_ID_PREFIX}${slug}`,
              sortOrder: index,
            })),
          },
        },
      });
    }
  });

  console.log('\n[build-catalog] состояние после записи:');
  console.table({
    'миксы скрипта': await prisma.mix.count({ where: ownedMixes }),
    'prepared-рейлы': await prisma.rail.count({ where: { id: { startsWith: RAIL_ID_PREFIX } } }),
    'связи рейл↔микс': await prisma.railMix.count({ where: { rail: { id: { startsWith: RAIL_ID_PREFIX } } } }),
  });
};

void main()
  .catch((error) => {
    console.error('[build-catalog] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
