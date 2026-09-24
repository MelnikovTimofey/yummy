// Бесконечная колода: перемешанный «мешок» по кругу. Сверху лежит стопка до
// трёх разных карт, новая карта в стопку не совпадает ни с одной из лежащих —
// поэтому подряд одна и та же карта не выпадает (кроме колоды из одной карты).

export type Deck = {
  ids: string[];
  bag: string[];
  queue: string[];
  history: string[];
  rounds: number;
};

type Rng = () => number;

const STACK = 3;

const shuffled = (items: string[], rng: Rng) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const refill = (deck: Deck, rng: Rng): Deck => {
  const target = Math.min(STACK, deck.ids.length);
  let { bag, rounds } = deck;
  const queue = [...deck.queue];

  while (queue.length < target) {
    let index = bag.findIndex((id) => !queue.includes(id));
    if (index === -1) {
      bag = [...bag, ...shuffled(deck.ids, rng)];
      rounds += 1;
      index = bag.findIndex((id) => !queue.includes(id));
    }
    queue.push(bag[index]);
    bag = [...bag.slice(0, index), ...bag.slice(index + 1)];
  }

  return { ...deck, bag, queue, rounds };
};

export const createDeck = (ids: string[], rng: Rng = Math.random): Deck =>
  refill({ ids, bag: [], queue: [], history: [], rounds: 0 }, rng);

export const skipCard = (deck: Deck, rng: Rng = Math.random): { deck: Deck; looped: boolean } => {
  if (!deck.queue.length) {
    return { deck, looped: false };
  }
  const [top, ...rest] = deck.queue;
  const next = refill({ ...deck, queue: rest, history: [...deck.history, top] }, rng);
  return { deck: next, looped: deck.rounds === 1 && next.rounds === 2 };
};

export const rewindCard = (deck: Deck): Deck => {
  if (!deck.history.length) {
    return deck;
  }
  const back = deck.history[deck.history.length - 1];
  const queue = [back, ...deck.queue.filter((id) => id !== back)];
  const overflow = queue.splice(Math.min(STACK, deck.ids.length));
  return {
    ...deck,
    queue,
    bag: [...overflow, ...deck.bag],
    history: deck.history.slice(0, -1),
  };
};
