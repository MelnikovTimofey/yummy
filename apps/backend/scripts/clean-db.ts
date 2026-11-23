import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { countDemoContent, wipeDemoContent } from '../src/demo-clean';

process.env.DATABASE_URL ??= 'postgresql://atelier:atelier@127.0.0.1:5433/atelier?schema=public';

const prisma = new PrismaClient();

// Подтверждение обязательно: операция необратима и может быть направлена на любую БД
// из DATABASE_URL. Без флага скрипт работает в режиме превью и ничего не удаляет.
const confirmed =
  process.argv.slice(2).some((arg) => arg === '--yes' || arg === '-y') ||
  process.env.ATELIER_CONFIRM_CLEAN === '1';

const maskDatabaseUrl = (url: string | undefined) =>
  url?.replace(/:[^:@/]*@/, ':***@') ?? '<no DATABASE_URL>';

const main = async () => {
  console.log(`[clean-db] target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);

  const before = await countDemoContent(prisma);
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
        '  (или ATELIER_CONFIRM_CLEAN=1 npm run db:clean)',
    );
    return;
  }

  const deleted = await wipeDemoContent(prisma);
  for (const [label, count] of Object.entries(deleted)) {
    console.log(`[clean-db] удалено «${label}»: ${count}`);
  }

  const after = await countDemoContent(prisma);
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
