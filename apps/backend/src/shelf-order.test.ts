import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { acceptDelivery, addLine, createManualDraft } from './deliveries';
import { addToShelf, markEmpty, removeFromShelf, updateShelfItem } from './shelf';
import { getShelfOrder } from './shelf-order';
import { resetAppState } from './state';

// #518 S2: «К заказу» — закончились и держим постоянно, группы по поставщику последнего прихода.

const DAY = 86_400_000;
const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const MINT = 'tobacco-mint-veil';
const CITRUS = 'tobacco-citrus-breeze';
const BERRY = 'tobacco-berry-oasis';
const HONEY = 'tobacco-desert-honey';
const SPICE = 'tobacco-spice-route';
const ROSE = 'tobacco-rose-nocturne';
// Единственный табак без миксов.
const MELON = 'tobacco-melon-solo';

let start: Date;
const at = (days: number) => new Date(start.getTime() + days * DAY);

const deliver = async (supplierName: string, day: number, lines: Array<[string, number]>) => {
  const draft = await createManualDraft(actor, { supplierName });
  for (const [tobaccoId, qty] of lines) await addLine(draft.id, { rawName: tobaccoId, qty, tobaccoId });
  await acceptDelivery(actor, draft.id, { receivedAt: at(day) });
};

test.beforeEach(async () => {
  await resetAppState();
  start = (await prisma.delivery.findFirstOrThrow({ where: { kind: 'start' } })).receivedAt!;
});

test('пусто, пока всё в наличии', async () => {
  assert.deepEqual(await getShelfOrder(), { groups: [], notKept: [], plan: [] });
});

test('группы по поставщику последнего прихода, миксы скрыты или закрыты аналогом, не держим — отдельно', async () => {
  await deliver('Каспий Опт', 2, [[MINT, 2], [CITRUS, 1]]);
  await deliver('Южный табак', 4, [[BERRY, 1]]);
  await deliver('Южный табак', 6, [[CITRUS, 1]]);
  // Mint закрывает аналог Rose в миксах, где не хватает только мяты.
  await prisma.tobaccoAnalog.create({ data: { tobaccoId: MINT, analogId: ROSE } });

  await markEmpty(actor, MINT, at(8));
  await markEmpty(actor, CITRUS, at(9));
  await markEmpty(actor, HONEY, at(7));
  await markEmpty(actor, SPICE, at(5));
  await updateShelfItem(actor, SPICE, { keepStocked: false }, at(5));

  const order = await getShelfOrder();

  assert.deepEqual(
    order.groups.map((group) => [group.supplier?.name ?? null, group.lastDeliveryAt, group.lines.map((line) => line.tobacco.id)]),
    [
      ['Каспий Опт', at(2).toISOString(), [MINT]],
      ['Южный табак', at(6).toISOString(), [CITRUS]],
      [null, null, [HONEY]],
    ],
  );
  const line = (id: string) => order.groups.flatMap((group) => group.lines).find((item) => item.tobacco.id === id)!;

  // Мята в 5 миксах: цитрусовый (цитрус тоже закончился) и персиковый (персика нет) скрыты, три закрыты Rose.
  assert.deepEqual(line(MINT).mixes, { total: 5, hidden: 2, substituted: 3 });
  assert.equal(line(MINT).outAt, at(8).toISOString());
  assert.deepEqual(line(MINT).lastArrival && [line(MINT).lastArrival!.at, line(MINT).lastArrival!.supplier, line(MINT).lastArrival!.qty], [
    at(2).toISOString(),
    'Каспий Опт',
    2,
  ]);
  assert.deepEqual(line(CITRUS).mixes, { total: 1, hidden: 1, substituted: 0 });
  assert.deepEqual(line(HONEY).mixes, { total: 2, hidden: 2, substituted: 0 });
  assert.equal(line(HONEY).lastArrival?.kind, 'start');

  assert.deepEqual(order.notKept.map((item) => [item.tobaccoId, item.outAt]), [[SPICE, at(5).toISOString()]]);
});

// #563: план — отдельным списком после поставщиков, старый первым, на стопе тоже.
test('план: дата постановки и миксы, старый первым; группы и notKept не меняются', async () => {
  await removeFromShelf(actor, MELON, at(0));
  await addToShelf(actor, MELON, 'plan', at(4));
  await removeFromShelf(actor, HONEY, at(0));
  await addToShelf(actor, HONEY, 'plan', at(1));
  await prisma.shelfItem.update({ where: { tobaccoId: HONEY }, data: { stopped: true } });
  await markEmpty(actor, MINT, at(2));

  const order = await getShelfOrder();
  const ref = async (id: string) => {
    const { manufacturer, lineName, name } = await prisma.tobacco.findUniqueOrThrow({ where: { id } });
    return { id, manufacturer, lineName, name };
  };

  assert.deepEqual(order.plan, [
    {
      tobacco: await ref(HONEY),
      plannedAt: at(1).toISOString(),
      mixes: { total: 2, hidden: 2, substituted: 0 },
    },
    {
      tobacco: await ref(MELON),
      plannedAt: at(4).toISOString(),
      mixes: { total: 0, hidden: 0, substituted: 0 },
    },
  ]);
  assert.deepEqual(order.groups.map((group) => group.lines.map((line) => line.tobacco.id)), [[MINT]]);
  assert.deepEqual(order.notKept, []);
});

test('GET /staff/shelf/order', async () => {
  const app = buildApp();
  assert.equal((await app.inject({ method: 'GET', url: '/staff/shelf/order' })).statusCode, 401);
  const login = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
  const headers = { authorization: `Bearer ${(login.json() as { accessToken: string }).accessToken}` };

  await markEmpty(actor, MINT, at(1));
  await removeFromShelf(actor, MELON, at(0));
  await addToShelf(actor, MELON, 'plan', at(2));
  const response = await app.inject({ method: 'GET', url: '/staff/shelf/order', headers });
  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    groups: Array<{ supplier: unknown; lines: Array<{ tobacco: { id: string; manufacturer: string } }> }>;
    notKept: unknown[];
    plan: Array<{ tobacco: { id: string }; plannedAt: string; mixes: unknown }>;
  };
  assert.deepEqual(body.groups.map((group) => [group.supplier, group.lines.map((item) => item.tobacco.id)]), [[null, [MINT]]]);
  assert.equal(body.groups[0].lines[0].tobacco.manufacturer, 'Ателье Reserve');
  assert.deepEqual(body.plan.map((item) => [item.tobacco.id, item.plannedAt, item.mixes]), [
    [MELON, at(2).toISOString(), { total: 0, hidden: 0, substituted: 0 }],
  ]);
});
