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
  outAt: string | null;
  stopped: boolean;
  guestAvailable: boolean;
  shelfStatus: string;
};

// Сид ставит табаки в наличии на полку стартовой поставкой.
const firstShelfTobacco = async () => {
  const item = await prisma.shelfItem.findFirstOrThrow({ where: { status: 'active', outAt: null }, orderBy: { tobaccoId: 'asc' } });
  return item.tobaccoId;
};

test('shelf endpoints require a staff session', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/staff/shelf' });
  assert.equal(response.statusCode, 401);
});

test('shelf overview lists rows without grams', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const response = await app.inject({ method: 'GET', url: '/staff/shelf', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 200);
  const body = response.json() as { rows: Array<Row & Record<string, unknown>> };
  assert.deepEqual(Object.keys(body), ['rows']);
  assert.ok(body.rows.length > 0);
  for (const key of ['outAt', 'lastArrival', 'trial', 'trialVerdict', 'trialMarkedAt']) assert.ok(key in body.rows[0], key);
  for (const key of ['leftGrams', 'status', 'monthGrams', 'lastReceipt']) assert.equal(key in body.rows[0], false, key);
});

test('«Закончился» takes the tobacco off the guest menu and the batch undo brings it back', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();

  const emptied = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(emptied.statusCode, 200);
  const { batchId, item } = emptied.json() as { batchId: string; item: Row };
  assert.ok(batchId);
  assert.ok(item.outAt);
  assert.equal(item.guestAvailable, false);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, false);

  const again = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(again.statusCode, 409);
  assert.equal((again.json() as { code: string }).code, 'no_stock');

  const undone = await app.inject({ method: 'DELETE', url: `/staff/shelf/batches/${batchId}`, headers });
  assert.equal(undone.statusCode, 200);
  assert.equal((undone.json() as { items: Row[] }).items[0].guestAvailable, true);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, true);
});

test('stop and card go through the shelf API', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();

  const stop = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: { stopped: true, stopNote: 'бережём' } });
  assert.equal(stop.statusCode, 200);
  const stopped = (stop.json() as { item: Row }).item;
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.guestAvailable, false);

  const empty = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: {} });
  assert.equal(empty.statusCode, 400);

  const card = await app.inject({ method: 'GET', url: `/staff/shelf/${tobaccoId}`, headers });
  assert.equal(card.statusCode, 200);
  const cardBody = (card.json() as { item: Row & { arrivals: Array<{ kind: string; qty: number }>; mixes: unknown[]; similar: unknown[] } }).item;
  assert.deepEqual(cardBody.arrivals.map((arrival) => [arrival.kind, arrival.qty]), [['start', 1]]);
  assert.ok(Array.isArray(cardBody.mixes));
  assert.ok(Array.isArray(cardBody.similar));

  const missing = await app.inject({ method: 'GET', url: '/staff/shelf/no-such-tobacco', headers });
  assert.equal(missing.statusCode, 404);
});

test('gram endpoints are gone', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();
  const gone = [
    ['GET', '/staff/shelf/settings'],
    ['PATCH', '/staff/shelf/settings'],
    ['POST', `/staff/shelf/${tobaccoId}/counts`],
    ['POST', `/staff/shelf/${tobaccoId}/receipts`],
    ['POST', `/staff/shelf/${tobaccoId}/write-offs`],
    ['DELETE', '/staff/shelf/entries/entry-1'],
    ['GET', '/staff/shelf/reorder'],
    ['GET', '/staff/shelf/dashboard'],
    ['GET', '/staff/shelf/purchase'],
  ] as const;
  for (const [method, url] of gone) {
    const response = await app.inject({ method, url, headers, payload: method === 'GET' || method === 'DELETE' ? undefined : {} });
    // Маршруты строки /staff/shelf/:tobaccoId принимают settings, reorder и прочие за id
    // табака: 404 — нет на полке, 400 у PATCH — нечего менять.
    assert.ok([400, 404].includes(response.statusCode), `${method} ${url}: ${response.statusCode}`);
  }
});

test('tobacco can be planned and removed', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const offShelf = await prisma.tobacco.findFirstOrThrow({ where: { shelfItem: null, archived: false } });

  const planned = await app.inject({ method: 'POST', url: '/staff/shelf', headers, payload: { tobaccoId: offShelf.id, status: 'plan' } });
  assert.equal(planned.statusCode, 200);
  assert.equal((planned.json() as { item: Row }).item.shelfStatus, 'plan');

  const removed = await app.inject({ method: 'DELETE', url: `/staff/shelf/${offShelf.id}`, headers });
  assert.equal(removed.statusCode, 200);
  assert.equal((removed.json() as { item: Row }).item.shelfStatus, 'dropped');
});

test('trial verdict is set and cleared through the row patch', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();
  const patch = (payload: Record<string, unknown>) => app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload });

  const yes = await patch({ trialVerdict: 'yes' });
  assert.equal(yes.statusCode, 200);
  assert.equal((yes.json() as { item: { trialVerdict: string } }).item.trialVerdict, 'yes');
  const cleared = await patch({ trialVerdict: null });
  assert.equal((cleared.json() as { item: { trialVerdict: string | null } }).item.trialVerdict, null);
  assert.equal((await patch({ trialVerdict: 'maybe' })).statusCode, 400);
});

test('«Закончились» for several tobaccos at once and one undo for all', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const items = await prisma.shelfItem.findMany({ where: { status: 'active' }, orderBy: { tobaccoId: 'asc' }, take: 3 });
  const ids = items.map((item) => item.tobaccoId);
  await app.inject({ method: 'POST', url: `/staff/shelf/${ids[2]}/empty`, headers });

  const response = await app.inject({ method: 'POST', url: '/staff/shelf/empty', headers, payload: { tobaccoIds: ids } });
  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    batchId: string;
    done: string[];
    skipped: Array<{ tobaccoId: string; reason: string }>;
    hiddenMixes: number;
    items: Row[];
  };
  assert.deepEqual(Object.keys(body).sort(), ['batchId', 'done', 'hiddenMixes', 'items', 'skipped']);
  assert.deepEqual(body.done, ids.slice(0, 2));
  assert.deepEqual(body.skipped, [{ tobaccoId: ids[2], reason: 'out' }]);
  assert.ok(body.items.every((item) => !item.guestAvailable));

  const undone = await app.inject({ method: 'DELETE', url: `/staff/shelf/batches/${body.batchId}`, headers });
  assert.equal(undone.statusCode, 200);
  assert.ok((undone.json() as { items: Row[] }).items.every((item) => item.guestAvailable));
  assert.equal((await app.inject({ method: 'DELETE', url: `/staff/shelf/batches/${body.batchId}`, headers })).statusCode, 404);

  assert.equal((await app.inject({ method: 'POST', url: '/staff/shelf/empty', headers, payload: { tobaccoIds: [] } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/staff/shelf/empty', headers, payload: {} })).statusCode, 400);
  assert.equal(
    (await app.inject({ method: 'POST', url: '/staff/shelf/empty', headers, payload: { tobaccoIds: ['no-such-tobacco'] } })).statusCode,
    404,
  );
});
