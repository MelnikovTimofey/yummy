// Контракт backend — issues #125 (палитра, оценка) и #126 (событие «Покурить»).

export type PaletteTobacco = {
  id: string;
  manufacturer: string;
  name: string;
  flavorProfiles: string[];
  flavors: string[];
  flavorTags: string[];
  cooling: boolean;
  twist: boolean;
  mixCount: number;
};

export type Palette = {
  tobaccos: PaletteTobacco[];
  // Ключ 'a|b' — профили по алфавиту, значение 0..1.
  affinity: Record<string, number>;
};

export type Verdict = 'classic' | 'confident' | 'bold' | 'ask-master';

export type EvaluationHint = {
  kind: 'mono' | 'too-cold' | 'weak-base' | 'heavy-twist';
  value?: number;
};

export type Evaluation = {
  harmony: number;
  verdict: Verdict;
  hints: EvaluationHint[];
  character: { sweet: number; sour: number; fresh: number; dense: number };
  name: string;
  similarMix: { id: string; name: string; avgRating: number; similarity: number } | null;
};

export type BowlComponent = { tobaccoId: string; proportion: number };

// Ход: 0 — основа, 1 — акцент, 2 — штрих.
export type Turn = 0 | 1 | 2;

export type SwipeRecord = {
  turn: Turn;
  tobaccoId: string;
  direction: 'right' | 'left';
};
