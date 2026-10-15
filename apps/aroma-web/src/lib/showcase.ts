import { Feather, Flame, Star, Users, type LucideIcon } from 'lucide-react';

type ShowcaseRail = {
  id: string;
  name: string;
  type: 'statistical' | 'prepared' | 'curated';
  mixes: Array<{ id: string }>;
};

const railKindLabels: Record<ShowcaseRail['type'], string> = {
  statistical: 'Выбор гостей',
  prepared: 'Редакция',
  curated: 'Мастера',
};

// Id статистических рейлов стабильны: backend синтезирует их на лету
// (`rail-statistical-top`, `rail-statistical-rated` в apps/backend/src/state.ts).
export const railKindLabel = (rail: ShowcaseRail) =>
  rail.id === 'rail-statistical-rated' ? 'Оценки гостей' : railKindLabels[rail.type];

const railKindIcons: Record<ShowcaseRail['type'], LucideIcon> = {
  statistical: Users,
  prepared: Feather,
  curated: Flame,
};

// На Витрине тип полки виден значком (#175), словами он звучит в aria-label заголовка.
export const railKindIcon = (rail: ShowcaseRail) =>
  rail.id === 'rail-statistical-rated' ? Star : railKindIcons[rail.type];

export const railOpenLabel = (rail: ShowcaseRail) =>
  `Открыть подборку «${rail.name}», ${railKindLabel(rail).toLowerCase()}`;

// Рейл с тем же составом и порядком, что у рейла выше, и пустой рейл
// гостю ничего не добавляют.
export const dedupeRails = <R extends ShowcaseRail>(rails: R[]): R[] => {
  const seen = new Set<string>();
  return rails.filter((rail) => {
    if (!rail.mixes.length) return false;
    const key = rail.mixes.map((mix) => mix.id).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
