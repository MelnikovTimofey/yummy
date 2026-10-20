import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import { resetAppState } from './state';

const loginStaff = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/staff/auth/login',
    payload: { login: 'admin', password: 'admin' },
  });
  assert.equal(response.statusCode, 200);
  return (response.json() as { accessToken: string }).accessToken;
};

test.beforeEach(async () => {
  await resetAppState();
});

type Row = {
  tobacco: { id: string };
  status: string;
  openPacks: Array<{ id: string; fraction: number }>;
  sealedCount: number;
  stopped: boolean;
  guestAvailable: boolean;
  shelfStatus: string;
};

const firstShelfTobacco = async () => {
  const item = await prisma.shelfItem.findFirstOrThrow({
    where: { status: 'active', packs: { some: { emptiedAt: null, writtenOffAt: null } } },
    orderBy: { tobaccoId: 'asc' },
  });
  return item.tobaccoId;
};

test('shelf endpoints require a staff session', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/staff/shelf' });
  assert.equal(response.statusCode, 401);
});

test('shelf overview lists rows, counters, totals and settings', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const response = await app.inject({ method: 'GET', url: '/staff/shelf', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    rows: Row[];
    counters: Record<string, number>;
    totals: { packs: number; kg: number };
    settings: { bowlGrams: number; leadDays: number };
  };
  assert.ok(body.rows.length > 0);
  assert.equal(body.counters.all, body.rows.length);
  assert.ok(body.totals.packs >= body.rows.length);
  assert.deepEqual(body.settings, { bowlGrams: 18, leadDays: 7 });
});

test('marking a pack empty takes the tobacco off the guest menu and undo brings it back', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();

  const emptied = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(emptied.statusCode, 200);
  const { packId, item } = emptied.json() as { packId: string; item: Row };
  assert.equal(item.status, 'out');
  assert.equal(item.guestAvailable, false);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, false);

  const again = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(again.statusCode, 409);
  assert.equal((again.json() as { code: string }).code, 'no_open_pack');

  const undone = await app.inject({ method: 'POST', url: `/staff/shelf/packs/${packId}/undo-empty`, headers });
  assert.equal(undone.statusCode, 200);
  assert.equal((undone.json() as { item: Row }).item.guestAvailable, true);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, true);
});

test('marks, stop, extra packs and card go through the shelf API', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();

  const badMark = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/marks`, headers, payload: { fraction: 0.6 } });
  assert.equal(badMark.statusCode, 400);

  const mark = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/marks`, headers, payload: { fraction: 0.5 } });
  assert.equal(mark.statusCode, 200);

  const pack = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/packs`, headers, payload: { weight: 250 } });
  assert.equal(pack.statusCode, 200);
  assert.equal((pack.json() as { item: Row }).item.sealedCount, 1);

  const stop = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: { stopped: true, stopNote: 'бережём' } });
  assert.equal(stop.statusCode, 200);
  const stopped = (stop.json() as { item: Row }).item;
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.guestAvailable, false);

  const empty = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: {} });
  assert.equal(empty.statusCode, 400);

  const card = await app.inject({ method: 'GET', url: `/staff/shelf/${tobaccoId}`, headers });
  assert.equal(card.statusCode, 200);
  const cardBody = (card.json() as { item: Row & { packs: Array<{ marks: unknown[] }> } }).item;
  assert.equal(cardBody.packs.length, 2);
  assert.ok(cardBody.packs.some((item) => item.marks.length === 1));

  const missing = await app.inject({ method: 'GET', url: '/staff/shelf/no-such-tobacco', headers });
  assert.equal(missing.statusCode, 404);
});

test('tobacco can be planned, removed and settings updated', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const offShelf = await prisma.tobacco.findFirstOrThrow({ where: { shelfItem: null, archived: false } });

  const planned = await app.inject({ method: 'POST', url: '/staff/shelf', headers, payload: { tobaccoId: offShelf.id, status: 'plan' } });
  assert.equal(planned.statusCode, 200);
  assert.equal((planned.json() as { item: Row }).item.status, 'plan');

  const removed = await app.inject({ method: 'DELETE', url: `/staff/shelf/${offShelf.id}`, headers });
  assert.equal(removed.statusCode, 200);
  assert.equal((removed.json() as { item: Row }).item.shelfStatus, 'dropped');

  const settings = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { bowlGrams: 20 } });
  assert.equal(settings.statusCode, 200);
  assert.deepEqual(settings.json(), { bowlGrams: 20, leadDays: 7 });

  const invalid = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { leadDays: 0 } });
  assert.equal(invalid.statusCode, 400);
});
