import type { Evaluation, EvaluationHint, Palette, PaletteTobacco, Verdict } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeTobacco = (item: unknown): PaletteTobacco | null => {
  if (!isRecord(item) || !text(item.id)) {
    return null;
  }
  return {
    id: text(item.id),
    manufacturer: text(item.manufacturer),
    name: text(item.name) || text(item.id),
    flavorProfiles: strings(item.flavorProfiles),
    flavors: strings(item.flavors),
    flavorTags: strings(item.flavorTags),
    cooling: item.cooling === true,
    twist: item.twist === true,
    mixCount: num(item.mixCount),
  };
};

export const normalizePalette = (payload: unknown): Palette => {
  const record = isRecord(payload) ? payload : {};
  const tobaccos = Array.isArray(record.tobaccos)
    ? record.tobaccos.map(normalizeTobacco).filter((item): item is PaletteTobacco => item !== null)
    : [];
  const affinity = isRecord(record.affinity)
    ? Object.fromEntries(
        Object.entries(record.affinity).filter(
          (entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]),
        ),
      )
    : {};
  return { tobaccos, affinity };
};

const verdicts: Verdict[] = ['classic', 'confident', 'bold', 'ask-master'];
const hintKinds: EvaluationHint['kind'][] = ['mono', 'too-cold', 'weak-base', 'heavy-twist'];

export const normalizeEvaluation = (payload: unknown): Evaluation => {
  const record = isRecord(payload) ? payload : {};
  const character = isRecord(record.character) ? record.character : {};
  const similar = isRecord(record.similarMix) && text(record.similarMix.id) ? record.similarMix : null;

  return {
    harmony: Math.round(clamp(num(record.harmony), 0, 100)),
    verdict: verdicts.includes(record.verdict as Verdict) ? (record.verdict as Verdict) : 'ask-master',
    hints: Array.isArray(record.hints)
      ? record.hints
          .filter(
            (hint): hint is Record<string, unknown> =>
              isRecord(hint) && hintKinds.includes(hint.kind as EvaluationHint['kind']),
          )
          .map((hint) => ({
            kind: hint.kind as EvaluationHint['kind'],
            ...(typeof hint.value === 'number' ? { value: hint.value } : {}),
          }))
      : [],
    character: {
      sweet: clamp(num(character.sweet), 0, 1),
      sour: clamp(num(character.sour), 0, 1),
      fresh: clamp(num(character.fresh), 0, 1),
      dense: clamp(num(character.dense), 0, 1),
    },
    name: text(record.name),
    similarMix: similar
      ? {
          id: text(similar.id),
          name: text(similar.name),
          avgRating: num(similar.avgRating),
          similarity: Math.round(num(similar.similarity)),
        }
      : null,
  };
};
