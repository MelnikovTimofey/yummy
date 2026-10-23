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
  leftGrams: number | null;
  fullGrams: number | null;
  lastCount: { grams: number; fraction: number | null } | null;
  stopped: boolean;
  guestAvailable: boolean;
  shelfStatus: string;
};

// Сид ставит табаки в наличии на полку стартовым приходом.
const firstShelfTobacco = async () => {
  const item = await prisma.shelfItem.findFirstOrThrow({
    where: { status: 'active', entries: { some: { kind: 'receipt' } } },
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
    totals: { kg: number };
    settings: { bowlGrams: number; leadDays: number; budgetKop: number | null };
    interval: { days: number | null; deliveries: number };
    horizon: { days: number; until: string };
  };
  assert.ok(body.rows.length > 0);
  assert.equal(body.counters.all, body.rows.length);
  assert.ok(body.totals.kg > 0);
  assert.ok(body.rows.every((row) => row.leftGrams === null || row.leftGrams <= (row.fullGrams ?? 0)));
  assert.deepEqual(body.settings, { bowlGrams: 18, leadDays: 7, budgetKop: null });
  assert.deepEqual(body.interval, { days: null, deliveries: 0 });
  assert.equal(body.horizon.days, 7);
  const row = body.rows[0] as Row & Record<string, unknown>;
  for (const key of ['monthGrams', 'leftSource', 'trial', 'trialVerdict', 'trialMarkedAt']) assert.ok(key in row, key);
});

test('«Закончился» takes the tobacco off the guest menu and deleting the entry brings it back', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();

  const emptied = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(emptied.statusCode, 200);
  const { entryId, item } = emptied.json() as { entryId: string; item: Row };
  assert.equal(item.status, 'out');
  assert.equal(item.leftGrams, 0);
  assert.equal(item.guestAvailable, false);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, false);

  const again = await app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/empty`, headers });
  assert.equal(again.statusCode, 409);
  assert.equal((again.json() as { code: string }).code, 'no_stock');

  const undone = await app.inject({ method: 'DELETE', url: `/staff/shelf/entries/${entryId}`, headers });
  assert.equal(undone.statusCode, 200);
  assert.equal((undone.json() as { item: Row }).item.guestAvailable, true);
  assert.equal((await prisma.tobacco.findUniqueOrThrow({ where: { id: tobaccoId } })).inStock, true);
});

test('counts by share or grams, receipts, write-offs, stop and card go through the shelf API', async () => {
  const app = buildApp();
  const token = await loginStaff(app);
  const headers = { authorization: `Bearer ${token}` };
  const tobaccoId = await firstShelfTobacco();
  const post = (path: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/staff/shelf/${tobaccoId}/${path}`, headers, payload });

  assert.equal((await post('counts', { fraction: 0.6 })).statusCode, 400);
  assert.equal((await post('counts', { grams: -1 })).statusCode, 400);

  const half = await post('counts', { fraction: 0.5 });
  assert.equal(half.statusCode, 200);
  const halfRow = (half.json() as { item: Row }).item;
  assert.equal(halfRow.lastCount?.fraction, 0.5);
  assert.equal(halfRow.lastCount?.grams, Math.round(halfRow.fullGrams! / 2));

  const exact = await post('counts', { grams: 80 });
  assert.equal((exact.json() as { item: Row }).item.leftGrams, 80);

  const receipt = await post('receipts', { grams: 250, priceKop: 180_000 });
  assert.equal(receipt.statusCode, 200);
  assert.equal((receipt.json() as { item: Row }).item.fullGrams, 330);

  assert.equal((await post('write-offs', { grams: 30 })).statusCode, 400);
  const writeOff = await post('write-offs', { grams: 30, reason: 'отсырел' });
  assert.equal(writeOff.statusCode, 200);
  assert.equal((writeOff.json() as { item: Row }).item.leftGrams, 300);

  const stop = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: { stopped: true, stopNote: 'бережём' } });
  assert.equal(stop.statusCode, 200);
  const stopped = (stop.json() as { item: Row }).item;
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.guestAvailable, false);

  const empty = await app.inject({ method: 'PATCH', url: `/staff/shelf/${tobaccoId}`, headers, payload: {} });
  assert.equal(empty.statusCode, 400);

  const card = await app.inject({ method: 'GET', url: `/staff/shelf/${tobaccoId}`, headers });
  assert.equal(card.statusCode, 200);
  const cardBody = (card.json() as {
    item: Row & { history: Array<{ kind: string; grams: number; delivery: unknown }>; weekly: unknown[]; gramPriceKop: number };
  }).item;
  assert.deepEqual(cardBody.history.map((entry) => [entry.kind, entry.grams]).slice(0, 4), [
    ['writeoff', 30],
    ['receipt', 250],
    ['count', 80],
    ['count', halfRow.lastCount!.grams],
  ]);
  assert.equal(cardBody.weekly.length, 5);
  assert.equal(cardBody.gramPriceKop, 720);

  // Стартовый приход живёт вместе с поставкой — удалить его из истории нельзя.
  const start = cardBody.history.at(-1) as { id?: string; delivery: unknown };
  const fromDelivery = await app.inject({ method: 'DELETE', url: `/staff/shelf/entries/${start.id}`, headers });
  assert.equal(fromDelivery.statusCode, 409);
  assert.equal((fromDelivery.json() as { code: string }).code, 'entry_from_delivery');

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
  assert.deepEqual(settings.json(), { bowlGrams: 20, leadDays: 7, budgetKop: null });

  const invalid = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { leadDays: 0 } });
  assert.equal(invalid.statusCode, 400);

  const budget = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { budgetKop: 15_000_000 } });
  assert.deepEqual(budget.json(), { bowlGrams: 20, leadDays: 7, budgetKop: 15_000_000 });
  const noBudget = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { budgetKop: null } });
  assert.equal((noBudget.json() as { budgetKop: number | null }).budgetKop, null);
  const badBudget = await app.inject({ method: 'PATCH', url: '/staff/shelf/settings', headers, payload: { budgetKop: '150000' } });
  assert.equal(badBudget.statusCode, 400);
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
