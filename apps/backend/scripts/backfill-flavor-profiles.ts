import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { planMixProfileBackfill, planTobaccoProfileBackfill } from '../src/integrations/htreviews/profile-backfill';

process.env.DATABASE_URL ??= 'postgresql://atelier:atelier@127.0.0.1:5433/atelier?schema=public';

const prisma = new PrismaClient();

// Без --apply — превью, ничего не пишет (как scripts/backfill-flavors.ts).
const confirmed =
  process.argv.slice(2).some((arg) => arg === '--yes' || arg === '-y' || arg === '--apply') ||
  process.env.ATELIER_CONFIRM_BACKFILL === '1';

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

const serializeList = (items: string[]) => JSON.stringify(items);

const countProfiles = (lists: string[][]) => {
  const counts = new Map<string, number>();
  lists.flat().forEach((profile) => counts.set(profile, (counts.get(profile) ?? 0) + 1));
  return Object.fromEntries(Array.from(counts).sort(([left], [right]) => left.localeCompare(right)));
};

const main = async () => {
  console.log(`[backfill-profiles] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  // Issue #182: flavorProfiles пересчитываются из сохранённого rawSourceTags,
  // htreviews не опрашивается. flavors/flavorTags не трогаем (CLAUDE.md §7.4).
  const tobaccos = await prisma.tobacco.findMany({
    select: { id: true, name: true, manufacturer: true, rawSourceTags: true, flavorProfiles: true },
  });
  const tobaccoRows = tobaccos.map((row) => ({
    id: row.id,
    flavorProfiles: parseList(row.flavorProfiles),
    rawSourceTags: parseList(row.rawSourceTags),
  }));
  const tobaccoPlan = planTobaccoProfileBackfill(tobaccoRows);

  const nextProfiles = new Map(tobaccoRows.map((row) => [row.id, row.flavorProfiles]));
  tobaccoPlan.updates.forEach((item) => nextProfiles.set(item.id, item.to));

  const mixes = await prisma.mix.findMany({
    select: {
      id: true,
      name: true,
      flavorProfiles: true,
      components: { select: { tobaccoId: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  const mixRows = mixes.map((mix) => ({
    id: mix.id,
    flavorProfiles: parseList(mix.flavorProfiles),
    componentProfiles: mix.components.map((component) => nextProfiles.get(component.tobaccoId) ?? []),
  }));
  const mixPlan = planMixProfileBackfill(mixRows);

  const tobaccoById = new Map(tobaccos.map((row) => [row.id, row]));
  const mixById = new Map(mixes.map((mix) => [mix.id, mix]));

  console.log(`[backfill-profiles] табаков: ${tobaccos.length}, будет пересчитано: ${tobaccoPlan.updates.length}`);
  console.log('[backfill-profiles] профили табаков до → после:');
  console.table({
    до: countProfiles(tobaccoRows.map((row) => row.flavorProfiles)),
    после: countProfiles(Array.from(nextProfiles.values())),
  });

  if (tobaccoPlan.curated.length) {
    console.log(
      `[backfill-profiles] не трогаем ${tobaccoPlan.curated.length} табаков: профили отличаются от прежней` +
        ' логики синка (ручная курация или табак не из htreviews). Проверить вручную:',
    );
    console.table(
      tobaccoPlan.curated.map((item) => ({
        name: tobaccoById.get(item.id)?.name,
        manufacturer: tobaccoById.get(item.id)?.manufacturer,
        сейчас: item.current.join(', '),
        поТегам: item.expected.join(', '),
      })),
    );
  }

  console.log(`[backfill-profiles] миксов: ${mixes.length}, будет пересчитано: ${mixPlan.length}`);
  if (mixPlan.length) {
    console.table(
      mixPlan.map((item) => ({
        name: mixById.get(item.id)?.name,
        до: item.from.join(', '),
        после: item.to.join(', '),
      })),
    );
  }

  if (!confirmed) {
    console.log(
      '\n[backfill-profiles] РЕЖИМ ПРЕВЬЮ — ничего не записано.\n' +
        'Для применения запусти с подтверждением:\n' +
        '  npm run backfill:profiles -- --apply\n' +
        '  (или ATELIER_CONFIRM_BACKFILL=1 npm run backfill:profiles)',
    );
    return;
  }

  await prisma.$transaction([
    ...tobaccoPlan.updates.map((item) =>
      prisma.tobacco.update({ where: { id: item.id }, data: { flavorProfiles: serializeList(item.to) } }),
    ),
    ...mixPlan.map((item) =>
      prisma.mix.update({ where: { id: item.id }, data: { flavorProfiles: serializeList(item.to) } }),
    ),
  ]);
  console.log(
    `[backfill-profiles] готово. Табаков: ${tobaccoPlan.updates.length}, миксов: ${mixPlan.length}.` +
      ' Повторный прогон покажет 0 изменений.',
  );
};

void main()
  .catch((error) => {
    console.error('[backfill-profiles] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
