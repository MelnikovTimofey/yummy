import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { acceptDelivery, addLine, createManualDraft } from './deliveries';
import { resetAppState } from './state';

// Ответ приёмки (#565): сколько пришло из плана и сколько миксов открылось гостям.

const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };

const tobacco = (id: string, inStock = false) =>
  prisma.tobacco.create({
    data: { id, manufacturer: 'S5', name: id, flavorProfiles: '[]', flavors: '[]', flavorTags: '[]', inStock },
  });

const onShelf = (tobaccoId: string, status: 'active' | 'plan') => prisma.shelfItem.create({ data: { tobaccoId, status } });

const mix = (id: string, tobaccoIds: string[]) =>
  prisma.mix.create({
    data: {
      id,
      name: id,
      description: '',
      flavorProfiles: '[]',
      flavors: '[]',
      flavorTags: '[]',
      components: { create: tobaccoIds.map((tobaccoId, sortOrder) => ({ tobaccoId, sortOrder })) },
    },
  });

const accept = async (tobaccoIds: string[]) => {
  const draft = await createManualDraft(actor, {});
  for (const tobaccoId of tobaccoIds) await addLine(draft.id, { rawName: tobaccoId, qty: 1, tobaccoId });
  return acceptDelivery(actor, draft.id);
};

test.beforeEach(async () => {
  await resetAppState();
  await tobacco('s5-ready', true);
  await onShelf('s5-ready', 'active');
});

test('табак из плана открывает микс, который ждал только его', async () => {
  await tobacco('s5-plan');
  await onShelf('s5-plan', 'plan');
  await mix('s5-mix', ['s5-plan', 's5-ready']);

  const accepted = await accept(['s5-plan']);

  assert.equal(accepted.status, 'received');
  assert.equal(accepted.fromPlan, 1);
  assert.equal(accepted.openedMixes, 1);
});

test('без плана и без открытых миксов — нули', async () => {
  await tobacco('s5-new');

  const accepted = await accept(['s5-new']);

  assert.deepEqual([accepted.fromPlan, accepted.openedMixes], [0, 0]);
});

test('микс, которому не хватает ещё одного табака, не открылся', async () => {
  await tobacco('s5-plan');
  await tobacco('s5-other');
  await onShelf('s5-plan', 'plan');
  await mix('s5-mix', ['s5-plan', 's5-other', 's5-ready']);

  const accepted = await accept(['s5-plan']);

  assert.deepEqual([accepted.fromPlan, accepted.openedMixes], [1, 0]);
});

test('уже видимый микс не считается, открытый аналогом — считается', async () => {
  await tobacco('s5-new');
  await tobacco('s5-gap');
  await prisma.tobaccoAnalog.create({ data: { tobaccoId: 's5-gap', analogId: 's5-new' } });
  await mix('s5-seen', ['s5-ready']);
  await mix('s5-subst', ['s5-gap', 's5-ready']);

  const accepted = await accept(['s5-new', 's5-ready']);

  assert.deepEqual([accepted.fromPlan, accepted.openedMixes], [0, 1]);
});
