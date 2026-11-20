import { buildTaxonomyCandidate } from './taxonomy';

type TobaccoProfilesRow = { id: string; flavorProfiles: string[]; rawSourceTags: string[] };
type MixProfilesRow = { id: string; flavorProfiles: string[]; componentProfiles: string[][] };

const sameSet = (left: string[], right: string[]) =>
  new Set(left).size === new Set(right).size && left.every((item) => right.includes(item));

// Профили, которые выдавал buildTaxonomyCandidate до #182: по ним отличаем
// синхронизированный табак от вручную отредактированного мастером.
const legacyFlavorProfiles = (profiles: string[]) => {
  const legacy = new Set(profiles);
  if (legacy.has('citrus') || legacy.has('berry')) {
    legacy.add('fruity');
  }
  if (legacy.has('citrus')) {
    legacy.add('sour');
  }
  if (legacy.has('minty')) {
    legacy.add('fresh');
  }
  if (legacy.has('dessert')) {
    legacy.add('sweet');
  }
  return Array.from(legacy);
};

export const planTobaccoProfileBackfill = (rows: TobaccoProfilesRow[]) => {
  const updates: Array<{ id: string; from: string[]; to: string[] }> = [];
  const curated: Array<{ id: string; current: string[]; expected: string[] }> = [];

  for (const row of rows) {
    const expected = buildTaxonomyCandidate(row.rawSourceTags).flavorProfiles;
    if (sameSet(row.flavorProfiles, expected)) {
      continue;
    }
    // Подмножество, а не равенство: напитки и гастро профили только добавили.
    const synced = legacyFlavorProfiles(expected);
    if (row.flavorProfiles.every((profile) => synced.includes(profile))) {
      updates.push({ id: row.id, from: row.flavorProfiles, to: expected });
    } else {
      curated.push({ id: row.id, current: row.flavorProfiles, expected });
    }
  }

  return { updates, curated };
};

// Mix.flavorProfiles — кэш: при чтении профили микса и так собираются из
// табаков (getMixFlavorShape в state.ts), здесь держим его в согласии. Без
// профилей у табаков state.ts читает колонку — её не обнуляем.
export const planMixProfileBackfill = (rows: MixProfilesRow[]) =>
  rows.flatMap((row) => {
    const next = Array.from(new Set(row.componentProfiles.flat()));
    if (!next.length || sameSet(row.flavorProfiles, next)) {
      return [];
    }
    return [{ id: row.id, from: row.flavorProfiles, to: next }];
  });
