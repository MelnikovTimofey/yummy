import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public';

const prisma = new PrismaClient();

// Подтверждение обязательно: операция необратима и может быть направлена на любую БД
// из DATABASE_URL. Без флага скрипт работает в режиме превью и ничего не удаляет.
const confirmed =
  process.argv.slice(2).some((arg) => arg === '--yes' || arg === '-y') ||
  process.env.NOMAD_CONFIRM_CLEAN === '1';

const maskDatabaseUrl = (url: string | undefined) =>
  url?.replace(/:[^:@/]*@/, ':***@') ?? '<no DATABASE_URL>';

// Демо-контент и каталоги: всё это пересобирается при заливке прод-табаков
// (sync:htreviews) и работе приложения. Удаляем в FK-безопасном порядке: сначала
// дети, потом родители. Операционные данные (staff, daily-коды, intro-карточки,
// telegram-операторы, аудит) НЕ трогаем — иначе будет нечем логиниться и тестировать.
const targets = [
  { label: 'smoke-события', run: () => prisma.smokeCtaEvent.deleteMany() },
  { label: 'рейтинги миксов', run: () => prisma.mixRating.deleteMany() },
  { label: 'связи рейл↔микс', run: () => prisma.railMix.deleteMany() },
  { label: 'состав миксов', run: () => prisma.mixComponent.deleteMany() },
  { label: 'рейлы', run: () => prisma.rail.deleteMany() },
  { label: 'миксы', run: () => prisma.mix.deleteMany() },
  { label: 'табаки', run: () => prisma.tobacco.deleteMany() },
  { label: 'каталог профилей вкуса', run: () => prisma.flavorProfileCatalog.deleteMany() },
  { label: 'каталог вкусов', run: () => prisma.flavorCatalog.deleteMany() },
  { label: 'каталог мета-тегов', run: () => prisma.flavorTagCatalog.deleteMany() },
  { label: 'source-tag маппинги', run: () => prisma.sourceTagMapping.deleteMany() },
] as const;

const counts = async () => ({
  'smoke-события': await prisma.smokeCtaEvent.count(),
  'рейтинги миксов': await prisma.mixRating.count(),
  'связи рейл↔микс': await prisma.railMix.count(),
  'состав миксов': await prisma.mixComponent.count(),
  рейлы: await prisma.rail.count(),
  миксы: await prisma.mix.count(),
  табаки: await prisma.tobacco.count(),
  'каталог профилей вкуса': await prisma.flavorProfileCatalog.count(),
  'каталог вкусов': await prisma.flavorCatalog.count(),
  'каталог мета-тегов': await prisma.flavorTagCatalog.count(),
  'source-tag маппинги': await prisma.sourceTagMapping.count(),
});

const main = async () => {
  console.log(`[clean-db] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  const before = await counts();
  console.log('[clean-db] текущее наполнение (будет удалено):');
  console.table(before);

  const sohranyaem = {
    'staff-аккаунты': await prisma.staffAccount.count(),
    'daily-коды': await prisma.dailyAccessCode.count(),
    'intro-карточки': await prisma.introCard.count(),
    'telegram-операторы': await prisma.telegramOperator.count(),
    'telegram-recipients': await prisma.telegramRecipient.count(),
    'аудит-события': await prisma.auditEvent.count(),
  };
  console.log('[clean-db] сохраняется без изменений:');
  console.table(sohranyaem);

  if (!confirmed) {
    console.log(
      '\n[clean-db] РЕЖИМ ПРЕВЬЮ — ничего не удалено.\n' +
        'Для реальной очистки запусти с подтверждением:\n' +
        '  npm run db:clean -- --yes\n' +
        '  (или NOMAD_CONFIRM_CLEAN=1 npm run db:clean)',
    );
    return;
  }

  for (const target of targets) {
    const { count } = await target.run();
    console.log(`[clean-db] удалено «${target.label}»: ${count}`);
  }

  const after = await counts();
  console.log('[clean-db] наполнение после очистки:');
  console.table(after);
  console.log('[clean-db] готово. Теперь можно заливать прод-табаки: npm run sync:htreviews');
};

void main()
  .catch((error) => {
    console.error('[clean-db] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
