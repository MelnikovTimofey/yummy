import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCountdownState } from './use-countdown';

const baseNow = new Date('2026-05-26T12:00:00Z').getTime();

test('computeCountdownState returns fresh state for >30 minutes ahead', () => {
  const endsAt = new Date(baseNow + 2 * 3600_000 + 14 * 60_000).toISOString();
  const state = computeCountdownState(endsAt, baseNow);
  assert.equal(state.remaining, '2ч 14м');
  assert.equal(state.expired, false);
  assert.equal(state.urgency, 'fresh');
});

test('computeCountdownState marks soon when ≤30 minutes remain', () => {
  const endsAt = new Date(baseNow + 25 * 60_000).toISOString();
  const state = computeCountdownState(endsAt, baseNow);
  assert.equal(state.urgency, 'soon');
  assert.equal(state.expired, false);
  assert.equal(state.remaining, '25м 00с');
});

test('computeCountdownState marks expired when diff <= 0', () => {
  const endsAt = new Date(baseNow - 5_000).toISOString();
  const state = computeCountdownState(endsAt, baseNow);
  assert.equal(state.expired, true);
  assert.equal(state.urgency, 'expired');
  assert.equal(state.remaining, 'Истёк');
});

test('computeCountdownState handles empty input gracefully', () => {
  const state = computeCountdownState('', baseNow);
  assert.equal(state.remaining, '—');
  assert.equal(state.expired, false);
  assert.equal(state.urgency, 'fresh');
});

test('computeCountdownState handles invalid ISO gracefully', () => {
  const state = computeCountdownState('not-a-date', baseNow);
  assert.equal(state.remaining, '—');
  assert.equal(state.expired, false);
});

test('computeCountdownState renders seconds-only when <1 minute', () => {
  const endsAt = new Date(baseNow + 42_000).toISOString();
  const state = computeCountdownState(endsAt, baseNow);
  assert.equal(state.remaining, '42с');
  assert.equal(state.urgency, 'soon');
});
