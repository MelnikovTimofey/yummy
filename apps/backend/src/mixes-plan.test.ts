import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGuestApp as buildApp } from './test-app';
import { prisma } from './db';
import { getStaffMixes, resetAppState } from './state';
import type { GuestCatalogMixesResponse, StaffMixesResponse } from './types';

// «Ждут план» в «Миксах» (#566): микс, которому не хватает только табаков из плана,
// отдельно от «Блокирован». Гость, дашборд и «К заказу» видят blocked, как раньше.

const tobacco = (id: string, inStock = false) =>
  prisma.tobacco.create({
    data: { id, manufacturer: 'S6', name: id, flavorProfiles: '[]', flavors: '[]', flavorTags: '[]', inStock },
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

const ids = (result: { items: Array<{ id: string }> }) => result.items.map((item) => item.id).sort();

test.beforeEach(async () => {
  await resetAppState();
  await tobacco('s6-ready', true);
  await onShelf('s6-ready', 'active');
  await tobacco('s6-plan');
  await onShelf('s6-plan', 'plan');
  await tobacco('s6-plan-2');
  await onShelf('s6-plan-2', 'plan');
  await tobacco('s6-out');
  await onShelf('s6-out', 'active');
  await mix('s6-waits', ['s6-plan', 's6-ready']);
  await mix('s6-waits-two', ['s6-plan', 's6-plan-2']);
  await mix('s6-blocked', ['s6-plan', 's6-out']);
});

test('у недостающего табака признак planned, у ждущего план микса статус blocked', async () => {
  const all = await getStaffMixes({ manufacturers: ['S6'] });
  const waits = all.items.find((item) => item.id === 's6-waits');
  assert.equal(waits?.status, 'blocked');
  assert.deepEqual(waits?.missing, [{ tobaccoId: 's6-plan', manufacturer: 'S6', name: 's6-plan', onShelf: true, planned: true }]);
  const blocked = all.items.find((item) => item.id === 's6-blocked');
  assert.deepEqual(blocked?.missing.map((item) => [item.tobaccoId, item.planned]), [['s6-plan', true], ['s6-out', false]]);
});

test('чипы «Ждут план» и «Блокирован» взаимоисключающие, у каждого свой счётчик', async () => {
  const all = await getStaffMixes({ manufacturers: ['S6'] });
  assert.equal(all.meta.awaitingPlanCount, 2);
  assert.equal(all.meta.blockedCount, 1);

  const awaiting = await getStaffMixes({ manufacturers: ['S6'], status: 'awaiting-plan' });
  assert.equal(awaiting.filters.status, 'awaiting-plan');
  assert.deepEqual(ids(awaiting), ['s6-waits', 's6-waits-two']);
  assert.deepEqual(ids(await getStaffMixes({ manufacturers: ['S6'], status: 'blocked' })), ['s6-blocked']);
});

test('GET /staff/mixes?status=awaiting-plan, гостю ждущий план микс не виден', async () => {
  const app = buildApp();
  try {
    const login = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
    const headers = { authorization: `Bearer ${(login.json() as { accessToken: string }).accessToken}` };
    const response = await app.inject({ method: 'GET', url: '/staff/mixes?status=awaiting-plan&manufacturers=S6', headers });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(ids(response.json() as StaffMixesResponse), ['s6-waits', 's6-waits-two']);

    const guest = await app.inject({ method: 'GET', url: '/guest/catalog/mixes' });
    const guestIds = (guest.json() as GuestCatalogMixesResponse).items.map((item) => item.id);
    assert.ok(!guestIds.some((id) => id.startsWith('s6-')));
  } finally {
    await app.close();
  }
});
