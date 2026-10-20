import test from 'node:test';
import assert from 'node:assert/strict';
import { affinityKey } from './mixer';
import {
  buildForYou,
  leadingProfile,
  tasteProfile,
  type ForYouHistoryEntry,
  type ForYouInput,
  type ForYouMix,
  type ForYouPersonal,
} from './for-you';

// «Для вас» (#241, PRD §6.5): правила против пузыря одного вкуса.

const NOW = new Date('2026-10-20T20:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

// Табак — один профиль, поэтому ведущий профиль микса задают доли компонентов.
const TOBACCO_PROFILES: Record<string, string[]> = {
  't-berry': ['berry'],
  't-berry-2': ['berry'],
  't-fresh': ['fresh'],
  't-citrus': ['citrus'],
  't-dessert': ['dessert'],
  't-spicy': ['spicy'],
  't-tobacco': ['tobacco'],
};

const mix = (id: string, components: Array<[string, number]>, flavors: string[] = []): ForYouMix => ({
  id,
  name: `Микс ${id}`,
  flavorProfiles: Array.from(new Set(components.flatMap(([tobaccoId]) => TOBACCO_PROFILES[tobaccoId] ?? []))),
  flavors,
  components: components.map(([tobaccoId, proportion]) => ({ tobaccoId, proportion })),
});

const MIXES = {
  frost: mix('frost', [['t-berry', 60], ['t-fresh', 40]], ['лесные ягоды', 'холодок']),
  berryTea: mix('berry-tea', [['t-berry', 70], ['t-dessert', 30]], ['малина']),
  berryFresh: mix('berry-fresh', [['t-berry-2', 55], ['t-fresh', 45]], ['черника']),
  berryOnly: mix('berry-only', [['t-berry', 50], ['t-berry-2', 50]], ['клубника']),
  freshBerry: mix('fresh-berry', [['t-fresh', 70], ['t-berry', 30]], ['мята']),
  citrus: mix('citrus', [['t-citrus', 70], ['t-berry', 30]], ['грейпфрут']),
  dessert: mix('dessert', [['t-dessert', 80], ['t-fresh', 20]], ['чизкейк']),
  spicy: mix('spicy', [['t-spicy', 60], ['t-tobacco', 40]], ['корица']),
};

const ALL_MIXES = Object.values(MIXES);

// berry↔citrus мастер сводит чаще случайного (lift > 1), остальное — нейтрально или реже.
const AFFINITY = {
  [affinityKey('berry', 'citrus')]: 0.8,
  [affinityKey('berry', 'spicy')]: 0.3,
  [affinityKey('berry', 'dessert')]: 0.55,
  [affinityKey('fresh', 'citrus')]: 0.6,
};

const catalogPick = (target: ForYouMix, at: Date): ForYouHistoryEntry => ({
  kind: 'catalog',
  at,
  mixId: target.id,
  name: target.name,
  profiles: target.flavorProfiles,
});

const repeat = (target: ForYouMix, times: number) =>
  Array.from({ length: times }, (_, index) => catalogPick(target, daysAgo(index + 1)));

const input = (overrides: Partial<ForYouInput> = {}): ForYouInput => ({
  now: NOW,
  history: repeat(MIXES.frost, 5),
  ratings: {},
  favoriteMixIds: [],
  onboarding: { likedProfiles: ['berry'], likedFlavors: [] },
  mixes: ALL_MIXES,
  tobaccoProfiles: TOBACCO_PROFILES,
  affinity: AFFINITY,
  ...overrides,
});

const personal = (result: ReturnType<typeof buildForYou>): ForYouPersonal => {
  assert.equal(result.mode, 'personal');
  return result as ForYouPersonal;
};

const allCards = (result: ForYouPersonal) => [...result.fresh, ...result.sidestep, ...result.again];

test.describe('for you', () => {
  test('leading profile is the one with the largest share across components', () => {
    assert.equal(leadingProfile(MIXES.frost, TOBACCO_PROFILES), 'berry');
    assert.equal(leadingProfile(MIXES.freshBerry, TOBACCO_PROFILES), 'fresh');
    assert.equal(leadingProfile(MIXES.citrus, TOBACCO_PROFILES), 'citrus');
  });

  test('fewer than three picks — cold mode by saved onboarding', () => {
    const result = buildForYou(input({ history: repeat(MIXES.frost, 2) }));
    assert.deepEqual(result, { mode: 'cold', picks: 2 });
  });

  test('«again» holds at most one card: the best rated mix in stock', () => {
    const history = [...repeat(MIXES.frost, 3), catalogPick(MIXES.berryTea, daysAgo(10))];
    const result = personal(buildForYou(input({ history, ratings: { 'berry-tea': 5, frost: 3 } })));

    assert.equal(result.again.length, 1);
    assert.equal(result.again[0].mix.id, 'berry-tea');
    assert.deepEqual(result.again[0].reason, { kind: 'again', rating: 5, timesChosen: 1 });
  });

  test('«fresh» is the hero and three rows, only from mixes the guest has not chosen', () => {
    const result = personal(buildForYou(input()));

    assert.equal(result.fresh.length, 4);
    assert.ok(result.fresh.every((card) => card.mix.id !== 'frost'));
    assert.ok(result.fresh.every((card) => card.reason.kind === 'taste'));
  });

  test('«sidestep» is a mix with a new leading profile that masters pair with the favorite one', () => {
    const result = personal(buildForYou(input()));

    assert.equal(result.sidestep.length, 1);
    assert.equal(result.sidestep[0].mix.id, 'citrus');
    assert.deepEqual(result.sidestep[0].reason, { kind: 'sidestep', fromProfile: 'berry', toProfile: 'citrus' });
  });

  test('no mix with lift > 1 in stock — neutral sidestep, the slot is still there', () => {
    const result = personal(buildForYou(input({ affinity: {} })));

    assert.equal(result.sidestep.length, 1);
    assert.equal(result.sidestep[0].reason.kind, 'sidestep-neutral');
    assert.notEqual(leadingProfile(result.sidestep[0].mix, TOBACCO_PROFILES), 'berry');
  });

  test('saturation: one mix counts in the taste at most three times', () => {
    const three = tasteProfile(input({ history: repeat(MIXES.frost, 3) }));
    const twenty = tasteProfile(input({ history: repeat(MIXES.frost, 20) }));

    assert.deepEqual(twenty, three);
  });

  test('decay: a pick older than 60 days weighs half', () => {
    const base = { onboarding: { likedProfiles: [], likedFlavors: [] } };
    const fresh = tasteProfile(input({ ...base, history: [catalogPick(MIXES.citrus, daysAgo(10))] }));
    const old = tasteProfile(input({ ...base, history: [catalogPick(MIXES.citrus, daysAgo(61))] }));

    assert.equal(old.citrus, fresh.citrus / 2);
  });

  test('at most two cards share a leading profile', () => {
    const result = personal(buildForYou(input()));
    const counts = new Map<string, number>();
    for (const card of allCards(result)) {
      const profile = leadingProfile(card.mix, TOBACCO_PROFILES);
      counts.set(profile, (counts.get(profile) ?? 0) + 1);
    }

    assert.ok([...counts.values()].every((count) => count <= 2), JSON.stringify([...counts]));
  });

  test('hint: four of the last five picks are one mix', () => {
    const history = [...repeat(MIXES.frost, 4), catalogPick(MIXES.dessert, daysAgo(30))];
    const result = personal(buildForYou(input({ history })));

    assert.deepEqual(result.hint, { kind: 'same-mix', mixName: 'Микс frost', count: 4, outOf: 5 });
  });

  test('hint: four of the last five picks share a leading profile', () => {
    const history = [
      catalogPick(MIXES.frost, daysAgo(1)),
      catalogPick(MIXES.berryTea, daysAgo(2)),
      catalogPick(MIXES.berryOnly, daysAgo(3)),
      catalogPick(MIXES.dessert, daysAgo(4)),
      catalogPick(MIXES.frost, daysAgo(5)),
    ];
    const result = personal(buildForYou(input({ history })));

    assert.deepEqual(result.hint, { kind: 'same-profile', profile: 'berry', count: 4, outOf: 5 });
  });

  test('no hint when picks are varied', () => {
    const history = [MIXES.frost, MIXES.citrus, MIXES.dessert, MIXES.spicy, MIXES.berryTea].map((item, index) =>
      catalogPick(item, daysAgo(index + 1)),
    );
    assert.equal(personal(buildForYou(input({ history }))).hint, null);
  });

  test('every card carries a structured reason', () => {
    const result = personal(buildForYou(input({ ratings: { frost: 5 } })));
    for (const card of allCards(result)) {
      assert.ok(['taste', 'sidestep', 'sidestep-neutral', 'again'].includes(card.reason.kind));
    }
  });

  test('scenario «20 times one mix»: one repeat, a sidestep and the hint', () => {
    const result = personal(buildForYou(input({ history: repeat(MIXES.frost, 20), ratings: { frost: 5 } })));

    assert.deepEqual(result.again.map((card) => card.mix.id), ['frost']);
    assert.equal(result.sidestep.length, 1);
    assert.deepEqual(result.hint, { kind: 'same-mix', mixName: 'Микс frost', count: 5, outOf: 5 });
    assert.equal(allCards(result).filter((card) => card.mix.id === 'frost').length, 1);
  });

  test('scenario «everything loved is out of stock»: no repeat, other slots from stock', () => {
    const inStock = ALL_MIXES.filter((item) => item.id !== 'frost');
    const result = personal(buildForYou(input({ history: repeat(MIXES.frost, 6), mixes: inStock })));

    assert.equal(result.again.length, 0);
    assert.ok(result.fresh.length > 0);
    assert.equal(result.sidestep.length, 1);
    assert.ok(allCards(result).every((card) => inStock.includes(card.mix)));
  });

  test('a custom mix counts by its tobaccos; a deleted tobacco is skipped', () => {
    const custom: ForYouHistoryEntry = {
      kind: 'custom',
      at: daysAgo(1),
      key: 'sig-1',
      name: 'Своё',
      components: [{ tobaccoId: 't-citrus', proportion: 60 }, { tobaccoId: 't-gone', proportion: 40 }],
    };
    const taste = tasteProfile(input({ history: [custom], onboarding: { likedProfiles: [], likedFlavors: [] } }));

    assert.deepEqual(Object.keys(taste), ['citrus']);
  });
});
