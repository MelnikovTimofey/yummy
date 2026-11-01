import type { MissingTobaccoView, MixGuestStatus, MixSubstituteView, MixSubstitutionView, TobaccoRef } from './state';

// Правило доступности микса с заменой (PRD §6.2 п.1, #479). Одно на всех потребителей:
// гостевую выдачу, кабинет, «Покурить», оценку, статусы и дашборд Мастера.

export type RuleTobacco = {
  id: string;
  manufacturer: string;
  name: string;
  flavors: string[];
  inStock: boolean;
  archived: boolean;
  onShelf: boolean;
};

// analogs — аналоги табака компонента в его порядке замены.
export type RuleComponent = {
  tobacco: RuleTobacco;
  analogs: RuleTobacco[];
};

export type MixAvailability = {
  status: MixGuestStatus;
  substitution: MixSubstitutionView | null;
  // tobaccoId — компонент, который закрыт заменой.
  substitute: { tobaccoId: string; to: MixSubstituteView } | null;
  missing: MissingTobaccoView[];
};

// Выборка Prisma для правила: табак компонента с карточкой полки и аналоги в его порядке.
// Аналоги читаются вместе с миксами — отдельного запроса на микс нет, каталог не читается.
const analogSelect = { id: true, manufacturer: true, name: true, flavors: true, inStock: true, archived: true } as const;

export const ruleTobaccoRelations = {
  shelfItem: { select: { status: true } },
  analogs: { orderBy: { sortOrder: 'asc' }, select: { analog: { select: analogSelect } } },
} as const;

type AnalogRecord = { id: string; manufacturer: string; name: string; flavors: string; inStock: boolean; archived: boolean };

export type RuleTobaccoRecord = AnalogRecord & {
  shelfItem: { status: string } | null;
  analogs: Array<{ analog: AnalogRecord }>;
};

const parseFlavors = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

// onShelf — есть карточка полки, куда ведёт «Нет: X»; иначе — карточка каталога.
const toRuleTobacco = (tobacco: AnalogRecord, shelfItem: { status: string } | null): RuleTobacco => ({
  id: tobacco.id,
  manufacturer: tobacco.manufacturer,
  name: tobacco.name,
  flavors: parseFlavors(tobacco.flavors),
  inStock: tobacco.inStock,
  archived: tobacco.archived,
  onShelf: shelfItem != null && shelfItem.status !== 'dropped',
});

export const toRuleComponent = (tobacco: RuleTobaccoRecord): RuleComponent => ({
  tobacco: toRuleTobacco(tobacco, tobacco.shelfItem),
  analogs: tobacco.analogs.map((link) => toRuleTobacco(link.analog, null)),
});

const ready = (tobacco: RuleTobacco) => tobacco.inStock && !tobacco.archived;

const refOf = (tobacco: RuleTobacco): TobaccoRef => ({
  tobaccoId: tobacco.id,
  manufacturer: tobacco.manufacturer,
  name: tobacco.name,
});

export const resolveMixAvailability = (available: boolean, components: RuleComponent[]): MixAvailability => {
  const lacking = components.filter((component) => !ready(component.tobacco));
  const missing = lacking.map((component) => ({ ...refOf(component.tobacco), onShelf: component.tobacco.onShelf }));
  const none = { substitution: null, substitute: null, missing };

  if (!available) return { status: 'hidden', ...none };
  if (!lacking.length) return { status: 'visible', ...none };
  if (lacking.length > 1) return { status: 'blocked', ...none };

  const [gap] = lacking;
  const inMix = new Set(components.map((component) => component.tobacco.id));
  const analog = gap.analogs.find((candidate) => ready(candidate) && !inMix.has(candidate.id));
  if (!analog) return { status: 'blocked', ...none };

  return {
    status: 'substituted',
    substitution: { from: refOf(gap.tobacco), to: refOf(analog) },
    substitute: { tobaccoId: gap.tobacco.id, to: { ...refOf(analog), flavors: analog.flavors } },
    missing,
  };
};
