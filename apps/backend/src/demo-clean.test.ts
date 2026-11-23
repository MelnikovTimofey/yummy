import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from './generated/prisma/client';
import { prisma } from './db';
import { countDemoContent, demoContentModels, keptModels, wipeDemoContent } from './demo-clean';
import { resetAppState } from './state';

// `npm run db:clean` (#115, #654): каталог и демо-контент уходят, операционные
// данные остаются, иначе после очистки нечем войти.

const keptCounts = async () => ({
  staff: await prisma.staffAccount.count(),
  codes: await prisma.dailyAccessCode.count(),
  introCards: await prisma.introCard.count(),
  operators: await prisma.telegramOperator.count(),
  recipients: await prisma.telegramRecipient.count(),
  audit: await prisma.auditEvent.count(),
});

test('каждая модель схемы либо чистится db:clean, либо явно сохраняется', () => {
  const covered = [...demoContentModels, ...keptModels].sort();
  assert.deepEqual(covered, Object.values(Prisma.ModelName).sort());
});

test('db:clean на засеянной БД чистит каталог и демо-контент, операционные данные не трогает', async () => {
  await resetAppState();
  await prisma.tobaccoAnalog.create({ data: { tobaccoId: 'tobacco-citrus-breeze', analogId: 'tobacco-peach-silk' } });
  const supplier = await prisma.supplier.create({ data: { name: 'Поставщик' } });
  await prisma.supplierItem.create({
    data: { supplierId: supplier.id, normalizedName: 'цитрус', tobaccoId: 'tobacco-citrus-breeze' },
  });
  await prisma.delivery.create({
    data: {
      supplierId: supplier.id,
      kind: 'invoice',
      lines: { create: { n: 1, rawName: 'Цитрус', qty: 1, tobaccoId: 'tobacco-citrus-breeze' } },
    },
  });
  await prisma.flavorProfileCatalog.create({ data: { key: 'citrus', label: 'Цитрусовые' } });
  await prisma.flavorCatalog.create({ data: { key: 'lemon', label: 'Лимон' } });
  await prisma.flavorTagCatalog.create({ data: { key: 'ice', label: 'Холодок' } });
  await prisma.sourceTagMapping.create({
    data: {
      id: 'htreviews:лимон',
      sourceKind: 'htreviews',
      sourceTag: 'Лимон',
      normalizedSourceTag: 'лимон',
      flavorProfiles: '[]',
      flavors: '[]',
      flavorTags: '[]',
    },
  });
  const mix = await prisma.mix.findFirstOrThrow();
  const guest = await prisma.guestAccount.create({ data: { telegramId: '1', consentAt: new Date() } });
  await prisma.guestFavorite.create({ data: { guestId: guest.id, mixId: mix.id, mixName: mix.name } });
  await prisma.smokeCtaEvent.create({ data: { mixId: mix.id, mixName: mix.name } });
  await prisma.mixRating.create({ data: { mixId: mix.id, value: 5 } });

  const before = await countDemoContent(prisma);
  for (const [label, count] of Object.entries(before)) {
    assert.ok(count > 0, `до очистки пусто: ${label}`);
  }
  const kept = await keptCounts();

  await wipeDemoContent(prisma);

  for (const [label, count] of Object.entries(await countDemoContent(prisma))) {
    assert.equal(count, 0, `после очистки осталось: ${label}`);
  }
  assert.deepEqual(await keptCounts(), kept);
});
