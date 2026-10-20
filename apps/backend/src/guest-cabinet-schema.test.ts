import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from './db';
import {
  deleteMix,
  getDashboardSummary,
  getMixById,
  getSmokeCtaSummary,
  recordSmokeCtaEvent,
  resetAppState,
} from './state';

// Схема кабинета гостя (#238, PRD §4 п. 3–5, §5.3–5.4): история переживает
// удаление микса, удаление учётки отвязывает события и оценки от гостя.

const MIX_ID = 'mix-citrus-scout';

const smokeMix = async (mixId = MIX_ID) => {
  const mix = await getMixById(mixId);
  assert.ok(mix);
  return recordSmokeCtaEvent(mix);
};

const createGuest = (telegramId = '1001') =>
  prisma.guestAccount.create({ data: { telegramId, consentAt: new Date() } });

test.describe('guest cabinet schema', () => {
  test.beforeEach(async () => {
    await resetAppState();
  });

  test('smoke event stores a snapshot of the mix name and profiles', async () => {
    const mix = await getMixById(MIX_ID);
    assert.ok(mix);

    await smokeMix();

    const stored = await prisma.smokeCtaEvent.findFirstOrThrow({ where: { mixId: MIX_ID } });
    assert.equal(stored.mixName, mix.name);
    assert.deepEqual(stored.mixProfiles, mix.flavorProfiles);
  });

  test('smoke event survives mix deletion: mixId becomes null, snapshot stays', async () => {
    const mix = await getMixById(MIX_ID);
    assert.ok(mix);
    await smokeMix();

    await deleteMix(MIX_ID);

    const events = await prisma.smokeCtaEvent.findMany();
    assert.equal(events.length, 1);
    assert.equal(events[0].mixId, null);
    assert.equal(events[0].mixName, mix.name);
  });

  test('dashboard total counts presses on deleted mixes, per-mix stats only existing mixes', async () => {
    await smokeMix();
    await smokeMix('mix-apple-wave');
    await deleteMix(MIX_ID);

    const summary = await getSmokeCtaSummary();
    assert.equal(summary.smokeCtaTotal, 2);
    assert.deepEqual(summary.topMixes.map((item) => item.mixId), ['mix-apple-wave']);

    const dashboard = await getDashboardSummary();
    assert.equal(dashboard.product.smokeCtaTotal, 2);
  });

  test('deleting a guest account removes favorites and unlinks events and ratings', async () => {
    const guest = await createGuest();
    const event = await prisma.smokeCtaEvent.create({
      data: { mixId: MIX_ID, guestId: guest.id, mixName: 'Снимок', mixProfiles: ['citrus'] },
    });
    const custom = await prisma.customMixSmokeEvent.create({
      data: { guestId: guest.id, components: [], signature: 'sig', name: 'Своё', harmony: 70 },
    });
    await prisma.mixRating.create({ data: { mixId: MIX_ID, guestId: guest.id, value: 5 } });
    await prisma.guestFavorite.create({ data: { guestId: guest.id, mixId: MIX_ID, mixName: 'Снимок' } });
    await prisma.guestFavorite.create({ data: { guestId: guest.id, customMixEventId: custom.id, mixName: 'Своё' } });

    await prisma.guestAccount.delete({ where: { id: guest.id } });

    assert.equal(await prisma.guestFavorite.count(), 0);
    assert.equal((await prisma.smokeCtaEvent.findUniqueOrThrow({ where: { id: event.id } })).guestId, null);
    assert.equal((await prisma.customMixSmokeEvent.findUniqueOrThrow({ where: { id: custom.id } })).guestId, null);
    const ratings = await prisma.mixRating.findMany({ where: { mixId: MIX_ID } });
    assert.equal(ratings.length, 1);
    assert.equal(ratings[0].guestId, null);
  });

  test('a signed-in guest has one rating per mix, anonymous ratings stay multiple', async () => {
    const guest = await createGuest();
    await prisma.mixRating.create({ data: { mixId: MIX_ID, guestId: guest.id, value: 4 } });

    await assert.rejects(
      prisma.mixRating.create({ data: { mixId: MIX_ID, guestId: guest.id, value: 5 } }),
      (error: { code?: string }) => error.code === 'P2002',
    );

    await prisma.mixRating.create({ data: { mixId: MIX_ID, value: 3 } });
    await prisma.mixRating.create({ data: { mixId: MIX_ID, value: 2 } });
    assert.equal(await prisma.mixRating.count({ where: { mixId: MIX_ID, guestId: null } }), 2);
  });

  test('favorite of a mix the master deleted keeps its name snapshot', async () => {
    const guest = await createGuest();
    await prisma.guestFavorite.create({
      data: { guestId: guest.id, mixId: MIX_ID, mixName: 'Цитрусовый разведчик', mixProfiles: ['citrus'] },
    });

    await deleteMix(MIX_ID);

    const favorite = await prisma.guestFavorite.findFirstOrThrow({ where: { guestId: guest.id } });
    assert.equal(favorite.mixId, null);
    assert.equal(favorite.mixName, 'Цитрусовый разведчик');
    assert.deepEqual(favorite.mixProfiles, ['citrus']);
  });

  test('the same catalog mix can be favorited by a guest only once', async () => {
    const guest = await createGuest();
    await prisma.guestFavorite.create({ data: { guestId: guest.id, mixId: MIX_ID, mixName: 'Снимок' } });

    await assert.rejects(
      prisma.guestFavorite.create({ data: { guestId: guest.id, mixId: MIX_ID, mixName: 'Снимок' } }),
      (error: { code?: string }) => error.code === 'P2002',
    );
  });

  test('telegram id identifies one guest account', async () => {
    await createGuest('42');
    await assert.rejects(createGuest('42'), (error: { code?: string }) => error.code === 'P2002');
  });
});
