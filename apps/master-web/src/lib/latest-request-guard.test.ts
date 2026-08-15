import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequestGuard } from './latest-request-guard';

test('createLatestRequestGuard keeps a single in-flight request fresh', () => {
  const guard = createLatestRequestGuard();
  const ticket = guard.start();
  assert.equal(guard.isStale(ticket), false);
});

test('createLatestRequestGuard marks every superseded request stale', () => {
  const guard = createLatestRequestGuard();
  const first = guard.start();
  const second = guard.start();

  assert.equal(guard.isStale(first), true);
  assert.equal(guard.isStale(second), false);
});

test('createLatestRequestGuard keeps the newest ticket fresh after many starts', () => {
  const guard = createLatestRequestGuard();
  const tickets = [guard.start(), guard.start(), guard.start()];

  assert.deepEqual(
    tickets.map((ticket) => guard.isStale(ticket)),
    [true, true, false],
  );
});

test('createLatestRequestGuard keeps guards independent', () => {
  const inventory = createLatestRequestGuard();
  const mixes = createLatestRequestGuard();

  const inventoryTicket = inventory.start();
  mixes.start();
  mixes.start();

  assert.equal(inventory.isStale(inventoryTicket), false);
});
