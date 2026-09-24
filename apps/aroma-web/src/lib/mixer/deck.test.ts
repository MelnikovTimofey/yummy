import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, rewindCard, skipCard, type Deck } from './deck';

// Детерминированный генератор, чтобы тасовка в тестах была воспроизводимой.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const tops = (deck: Deck, steps: number, rng: () => number) => {
  const seen: string[] = [];
  let current = deck;
  for (let i = 0; i < steps; i += 1) {
    seen.push(current.queue[0]);
    current = skipCard(current, rng).deck;
  }
  return seen;
};

test('createDeck кладёт в стопку до трёх разных карт', () => {
  const deck = createDeck(['a', 'b', 'c', 'd', 'e'], seeded(1));
  assert.equal(deck.queue.length, 3);
  assert.equal(new Set(deck.queue).size, 3);

  assert.equal(createDeck(['a', 'b'], seeded(1)).queue.length, 2);
  assert.equal(createDeck(['a'], seeded(1)).queue.length, 1);
  assert.deepEqual(createDeck([], seeded(1)).queue, []);
});

test('колода бесконечная и не повторяет карту подряд', () => {
  for (const size of [2, 3, 4, 7]) {
    const ids = Array.from({ length: size }, (_, index) => `t${index}`);
    const seen = tops(createDeck(ids, seeded(size)), 60, seeded(size + 100));
    assert.equal(seen.length, 60);
    for (let i = 1; i < seen.length; i += 1) {
      assert.notEqual(seen[i], seen[i - 1], `повтор подряд при размере ${size}`);
    }
  }
});

test('за один круг каждая карта показывается ровно один раз', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const seen = tops(createDeck(ids, seeded(7)), ids.length, seeded(8));
  assert.deepEqual([...seen].sort(), ids);
});

test('skipCard сообщает о втором круге один раз', () => {
  const rng = seeded(3);
  let deck = createDeck(['a', 'b', 'c', 'd'], rng);
  const loops: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const result = skipCard(deck, rng);
    if (result.looped) loops.push(i);
    deck = result.deck;
  }
  assert.equal(loops.length, 1);
});

test('rewindCard возвращает последнюю пропущенную карту наверх', () => {
  const rng = seeded(5);
  const start = createDeck(['a', 'b', 'c', 'd', 'e'], rng);
  const skipped = start.queue[0];
  const afterSkip = skipCard(start, rng).deck;
  assert.equal(afterSkip.history[afterSkip.history.length - 1], skipped);

  const back = rewindCard(afterSkip);
  assert.equal(back.queue[0], skipped);
  assert.equal(back.queue.length, 3);
  assert.equal(back.history.length, 0);
  assert.equal(new Set(back.queue).size, back.queue.length);
});

test('rewindCard без истории ничего не меняет', () => {
  const deck = createDeck(['a', 'b'], seeded(2));
  assert.equal(rewindCard(deck), deck);
});

test('колода из одной карты показывает её снова', () => {
  const rng = seeded(9);
  const deck = createDeck(['solo'], rng);
  const next = skipCard(deck, rng).deck;
  assert.deepEqual(next.queue, ['solo']);
});
