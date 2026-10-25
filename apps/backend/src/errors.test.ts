import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { resetAppState } from './state';

test.beforeEach(async () => {
  await resetAppState();
});

test('an unexpected error is a generic 500: the exception text stays in the log', async () => {
  const app = buildApp();
  app.get('/test/boom', async () => {
    throw new Error('Invalid `prisma.mix.findMany()` invocation: secret detail');
  });
  try {
    const response = await app.inject({ method: 'GET', url: '/test/boom' });
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.json(), { error: 'Internal server error' });
  } finally {
    await app.close();
  }
});

test('client errors keep their status and message', async () => {
  const app = buildApp();
  try {
    const malformed = await app.inject({
      method: 'POST',
      url: '/guest/onboarding/recommendations',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });
    assert.equal(malformed.statusCode, 400);

    const empty = await app.inject({ method: 'POST', url: '/guest/onboarding/recommendations', payload: {} });
    assert.deepEqual([empty.statusCode, empty.json()], [400, { error: 'Choose at least one flavor profile or flavor' }]);
  } finally {
    await app.close();
  }
});

test('recommendations reject non-string tastes with 400 instead of crashing', async () => {
  const app = buildApp();
  try {
    for (const payload of [{ likedProfiles: [1] }, { likedFlavors: [null] }, { likedProfiles: 'berry' }]) {
      const response = await app.inject({ method: 'POST', url: '/guest/onboarding/recommendations', payload });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
    }
    const ok = await app.inject({ method: 'POST', url: '/guest/onboarding/recommendations', payload: { likedProfiles: ['sweet'] } });
    assert.equal(ok.statusCode, 200);
  } finally {
    await app.close();
  }
});
