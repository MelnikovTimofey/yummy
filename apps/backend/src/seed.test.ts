import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { prisma } from './db';
import { resetAppState } from './state';

// Повторный seed на засеянной и «пожившей» БД (#391): полка, план, аналоги,
// поставки, кабинет гостя — всё это ссылается на табак и миксы.

const runSeed = () => {
  const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
};

const ids = async (rows: Promise<Array<{ id: string }>>) => (await rows).map((row) => row.id).sort();

const snapshot = async () => ({
  staff: await ids(prisma.staffAccount.findMany({ select: { id: true } })),
  codes: await ids(prisma.dailyAccessCode.findMany({ select: { id: true } })),
  introCards: await ids(prisma.introCard.findMany({ select: { id: true } })),
  operators: await ids(prisma.telegramOperator.findMany({ select: { id: true } })),
  recipients: await prisma.telegramRecipient.count(),
  automation: await prisma.telegramAutomationState.count(),
  audit: await prisma.auditEvent.count(),
  tobaccos: await ids(prisma.tobacco.findMany({ select: { id: true } })),
  analogs: (await prisma.tobaccoAnalog.findMany({ orderBy: [{ tobaccoId: 'asc' }, { analogId: 'asc' }] })).map(
    (link) => `${link.tobaccoId}>${link.analogId}:${link.sortOrder}`,
  ),
  shelf: (await prisma.shelfItem.findMany({ orderBy: { tobaccoId: 'asc' } })).map((item) => ({
    tobaccoId: item.tobaccoId,
    status: item.status,
    keepStocked: item.keepStocked,
    stopped: item.stopped,
    outAt: item.outAt,
    plannedAt: item.plannedAt,
    trialVerdict: item.trialVerdict,
  })),
  deliveries: (await prisma.delivery.findMany({ include: { lines: true } })).map((delivery) => ({
    kind: delivery.kind,
    lines: delivery.lines.map((line) => line.tobaccoId).sort(),
  })),
  suppliers: await prisma.supplier.count(),
  supplierItems: await prisma.supplierItem.count(),
  mixes: (await prisma.mix.findMany({ orderBy: { id: 'asc' } })).map((mix) => `${mix.id}:${mix.authorId}`),
  components: await prisma.mixComponent.count(),
  rails: await ids(prisma.rail.findMany({ select: { id: true } })),
  railMixes: await prisma.railMix.count(),
  guests: await prisma.guestAccount.count(),
  loginCodes: await prisma.guestLoginCode.count(),
  favorites: await prisma.guestFavorite.count(),
  smokeEvents: await prisma.smokeCtaEvent.count(),
  customSmokeEvents: await prisma.customMixSmokeEvent.count(),
  ratings: await prisma.mixRating.count(),
});

const liveOnTopOfSeed = async () => {
  const now = new Date();
  await prisma.tobacco.create({
    data: { id: 'tobacco-from-master', manufacturer: 'Darkside', name: 'Ручной', flavorProfiles: '[]', flavors: '[]', flavorTags: '[]' },
  });
  await prisma.shelfItem.update({
    where: { tobaccoId: 'tobacco-citrus-breeze' },
    data: { outAt: now, trialVerdict: 'yes', trialMarkedAt: now, keepStocked: false },
  });
  await prisma.shelfItem.create({ data: { tobaccoId: 'tobacco-peach-silk', plannedAt: now } });
  await prisma.shelfItem.create({ data: { tobaccoId: 'tobacco-from-master', stopped: true } });
  await prisma.tobaccoAnalog.createMany({
    data: [
      { tobaccoId: 'tobacco-peach-silk', analogId: 'tobacco-from-master' },
      { tobaccoId: 'tobacco-from-master', analogId: 'tobacco-peach-silk' },
    ],
  });
  const supplier = await prisma.supplier.create({ data: { name: 'Поставщик' } });
  await prisma.supplierItem.create({ data: { supplierId: supplier.id, normalizedName: 'ручной', tobaccoId: 'tobacco-from-master' } });
  await prisma.delivery.create({
    data: {
      supplierId: supplier.id,
      kind: 'invoice',
      status: 'received',
      lines: { create: [{ n: 1, rawName: 'Ручной', qty: 1, tobaccoId: 'tobacco-from-master' }] },
    },
  });
  await prisma.mix.update({ where: { id: 'mix-citrus-scout' }, data: { authorId: 'staff-admin' } });
  await prisma.mixComponent.create({ data: { mixId: 'mix-citrus-scout', tobaccoId: 'tobacco-from-master' } });
  const guest = await prisma.guestAccount.create({ data: { telegramId: '42', consentAt: now } });
  const custom = await prisma.customMixSmokeEvent.create({
    data: { guestId: guest.id, components: [], signature: 'sig', name: 'Свой', harmony: 80 },
  });
  await prisma.guestFavorite.createMany({
    data: [
      { guestId: guest.id, mixId: 'mix-citrus-scout', mixName: 'Цитрусовый караван' },
      { guestId: guest.id, customMixEventId: custom.id, mixName: 'Свой' },
    ],
  });
  await prisma.smokeCtaEvent.create({
    data: {
      mixId: 'mix-citrus-scout',
      guestId: guest.id,
      mixName: 'Цитрусовый караван',
      substitutedFromId: 'tobacco-citrus-breeze',
      substitutedToId: 'tobacco-lime-spark',
    },
  });
  await prisma.mixRating.create({ data: { mixId: 'mix-citrus-scout', guestId: guest.id, value: 5 } });
  await prisma.guestLoginCode.create({ data: { code: 'code-391', expiresAt: now } });
  await prisma.telegramAutomationState.create({ data: { id: 'default' } });
  await prisma.auditEvent.create({
    data: { actorLogin: 'admin', actorName: 'Админ', actorRole: 'admin', action: 'update', entityType: 'shelf', entityId: 'x', entityLabel: 'x' },
  });
};

test('повторный prisma seed на пожившей БД даёт то же состояние, что первый', async () => {
  try {
    runSeed();
    const fresh = await snapshot();
    assert.ok(fresh.shelf.length > 0, 'seed заводит полку');

    await liveOnTopOfSeed();
    runSeed();

    assert.deepEqual(await snapshot(), fresh);
  } finally {
    await resetAppState();
  }
});
