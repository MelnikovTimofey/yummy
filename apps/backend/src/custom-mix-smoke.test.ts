import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildApp } from './app';
import { prisma } from './db';
import {
  createTobacco,
  getDashboardSummary,
  getGuestHomeRails,
  getSmokeCtaEvents,
  getSmokeCtaSummary,
  recordSmokeCtaEvent,
  resetAppState,
} from './state';

const lemonMint = [
  { tobaccoId: 'tobacco-citrus-breeze', proportion: 60 },
  { tobaccoId: 'tobacco-mint-veil', proportion: 40 },
];

const smoke = async (payload: unknown) => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/guest/events/custom-mix-smoke',
    payload: payload as object,
  });
  await app.close();
  return response;
};

type Created = { id: string; signature: string; harmony: number };

const storedEvent = (id: string) => prisma.customMixSmokeEvent.findUniqueOrThrow({ where: { id } });

test.describe('custom mix smoke event', () => {
  test.beforeEach(async () => {
    await resetAppState();
  });

  test('records a snapshot of the bowl and answers with id, signature and harmony', async () => {
    const response = await smoke({ components: lemonMint });

    assert.equal(response.statusCode, 201);
    const body = response.json() as Created;
    assert.deepEqual(Object.keys(body).sort(), ['harmony', 'id', 'signature']);

    const stored = await storedEvent(body.id);
    assert.deepEqual(stored.components, [
      { tobaccoId: 'tobacco-citrus-breeze', manufacturer: 'Ателье Reserve', name: 'Citrus Breeze', proportion: 60 },
      { tobaccoId: 'tobacco-mint-veil', manufacturer: 'Ателье Reserve', name: 'Mint Veil', proportion: 40 },
    ]);
    assert.equal(stored.signature, body.signature);
    assert.equal(stored.harmony, body.harmony);
    assert.equal(stored.name, 'Лимон и мята');
    assert.deepEqual(stored.swipes, []);
  });

  test('harmony is the same one the evaluate endpoint returns', async () => {
    const app = buildApp();
    const evaluated = await app.inject({ method: 'POST', url: '/guest/mixer/evaluate', payload: { components: lemonMint } });
    await app.close();

    const body = (await smoke({ components: lemonMint })).json() as Created;
    assert.equal(body.harmony, (evaluated.json() as { harmony: number }).harmony);
  });

  test('signature is sha1 of sorted tobacco ids and ignores order and proportions', async () => {
    const first = (await smoke({ components: lemonMint })).json() as Created;
    const reversed = (await smoke({
      components: [
        { tobaccoId: 'tobacco-mint-veil', proportion: 70 },
        { tobaccoId: 'tobacco-citrus-breeze', proportion: 30 },
      ],
    })).json() as Created;
    const other = (await smoke({ components: [{ tobaccoId: 'tobacco-mint-veil', proportion: 100 }] })).json() as Created;

    assert.equal(
      first.signature,
      createHash('sha1').update('tobacco-citrus-breeze|tobacco-mint-veil').digest('hex'),
    );
    assert.equal(reversed.signature, first.signature);
    assert.notEqual(other.signature, first.signature);
    assert.notEqual(reversed.id, first.id);
  });

  test('guest name is trimmed and capped at 60 characters', async () => {
    const trimmed = (await smoke({ components: lemonMint, name: '  Утренний туман  ' })).json() as Created;
    const long = (await smoke({ components: lemonMint, name: `${'я'.repeat(59)} хвост` })).json() as Created;

    assert.equal((await storedEvent(trimmed.id)).name, 'Утренний туман');
    assert.equal((await storedEvent(long.id)).name, 'я'.repeat(59));
  });

  test('empty or non-string name falls back to the generated name', async () => {
    for (const name of ['', '   ', 42, null]) {
      const body = (await smoke({ components: lemonMint, name })).json() as Created;
      assert.equal((await storedEvent(body.id)).name, 'Лимон и мята');
    }
  });

  test('stores valid swipes as given', async () => {
    const swipes = [
      { turn: 0, tobaccoId: 'tobacco-berry-oasis', direction: 'left' },
      { turn: 0, tobaccoId: 'tobacco-citrus-breeze', direction: 'right' },
      { turn: 1, tobaccoId: 'tobacco-mint-veil', direction: 'right' },
    ];
    const body = (await smoke({ components: lemonMint, swipes })).json() as Created;

    assert.deepEqual((await storedEvent(body.id)).swipes, swipes);
  });

  const swipe = { turn: 0, tobaccoId: 'tobacco-mint-veil', direction: 'right' };
  const invalidSwipes: Array<[string, unknown]> = [
    ['not an array', { turn: 0 }],
    ['more than 500 swipes', Array.from({ length: 501 }, () => swipe)],
    ['turn out of range', [{ ...swipe, turn: 3 }]],
    ['fractional turn', [{ ...swipe, turn: 0.5 }]],
    ['missing tobacco id', [{ turn: 0, direction: 'right' }]],
    ['empty tobacco id', [{ ...swipe, tobaccoId: '' }]],
    ['unknown direction', [{ ...swipe, direction: 'up' }]],
    ['non-object swipe', ['right']],
  ];

  for (const [label, swipes] of invalidSwipes) {
    test(`rejects swipes: ${label} with 400`, async () => {
      const response = await smoke({ components: lemonMint, swipes });
      assert.equal(response.statusCode, 400);
    });
  }

  test('accepts exactly 500 swipes', async () => {
    const response = await smoke({ components: lemonMint, swipes: Array.from({ length: 500 }, () => swipe) });
    assert.equal(response.statusCode, 201);
  });

  test('rejects an invalid bowl with the evaluate error', async () => {
    const response = await smoke({
      components: [
        { tobaccoId: 'tobacco-citrus-breeze', proportion: 50 },
        { tobaccoId: 'tobacco-mint-veil', proportion: 45 },
      ],
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'Proportions must total exactly 100' });
  });

  test('rejects unknown or out-of-stock tobacco with 409 and its id', async () => {
    const unknown = await smoke({ components: [{ tobaccoId: 'tobacco-nope', proportion: 100 }] });
    const outOfStock = await smoke({
      components: [
        { tobaccoId: 'tobacco-mint-veil', proportion: 50 },
        { tobaccoId: 'tobacco-peach-silk', proportion: 50 },
      ],
    });

    assert.equal(unknown.statusCode, 409);
    assert.equal((unknown.json() as { tobaccoId: string }).tobaccoId, 'tobacco-nope');
    assert.equal(outOfStock.statusCode, 409);
    assert.deepEqual(Object.keys(outOfStock.json()).sort(), ['error', 'tobaccoId']);
    assert.equal((outOfStock.json() as { tobaccoId: string }).tobaccoId, 'tobacco-peach-silk');
    assert.equal(await prisma.customMixSmokeEvent.count(), 0);
  });

  test('snapshot outlives the tobacco it was made of', async () => {
    const created = await createTobacco({
      manufacturer: 'Тест',
      name: 'Разовый',
      flavorProfiles: ['berry'],
      flavors: ['земляника'],
    });
    assert.ok(created && !('error' in created));

    const body = (await smoke({ components: [{ tobaccoId: created.id, proportion: 100 }] })).json() as Created;
    await prisma.tobacco.delete({ where: { id: created.id } });

    const stored = await storedEvent(body.id);
    assert.deepEqual(stored.components, [
      { tobaccoId: created.id, manufacturer: 'Тест', name: 'Разовый', proportion: 100 },
    ]);
  });

  test('does not create smoke CTA events and leaves rails and dashboard unchanged', async () => {
    const snapshot = async () => {
      const { window, ...dashboard } = await getDashboardSummary();
      return {
        events: await getSmokeCtaEvents(),
        summary: await getSmokeCtaSummary(),
        rails: await getGuestHomeRails(),
        dashboard,
      };
    };

    // Живое событие каталога — чтобы статистика была непустой и сдвиг был виден.
    await recordSmokeCtaEvent('mix-citrus-scout');
    const before = await snapshot();
    for (let index = 0; index < 3; index += 1) {
      assert.equal((await smoke({ components: lemonMint })).statusCode, 201);
    }

    assert.deepEqual(await snapshot(), before);
    assert.equal(before.events.length, 1);
  });
});
