import { prisma } from './db';
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

export type RuleTobaccoRecord = { id: string; manufacturer: string; name: string; flavors: string; inStock: boolean; archived: boolean };

// Аналоги и полка для правила: два запроса параллельно с выборкой миксов, без чтения
// каталога и без запроса на микс. Связей аналогов сотни, позиций полки — сотни.
export type RuleContext = {
  analogsOf: Map<string, RuleTobaccoRecord[]>;
  shelfStatus: Map<string, string>;
};

export const loadRuleContext = async (): Promise<RuleContext> => {
  const [links, shelf] = await Promise.all([
    prisma.tobaccoAnalog.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        tobaccoId: true,
        analog: { select: { id: true, manufacturer: true, name: true, flavors: true, inStock: true, archived: true } },
      },
    }),
    prisma.shelfItem.findMany({ select: { tobaccoId: true, status: true } }),
  ]);
  const analogsOf = new Map<string, RuleTobaccoRecord[]>();
  for (const link of links) {
    analogsOf.set(link.tobaccoId, [...(analogsOf.get(link.tobaccoId) ?? []), link.analog]);
  }
  return { analogsOf, shelfStatus: new Map(shelf.map((item) => [item.tobaccoId, item.status])) };
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
const toRuleTobacco = (tobacco: RuleTobaccoRecord, shelfStatus: string | undefined): RuleTobacco => ({
  id: tobacco.id,
  manufacturer: tobacco.manufacturer,
  name: tobacco.name,
  flavors: parseFlavors(tobacco.flavors),
  inStock: tobacco.inStock,
  archived: tobacco.archived,
  onShelf: shelfStatus != null && shelfStatus !== 'dropped',
});

export const toRuleComponent = (tobacco: RuleTobaccoRecord, context: RuleContext): RuleComponent => ({
  tobacco: toRuleTobacco(tobacco, context.shelfStatus.get(tobacco.id)),
  analogs: (context.analogsOf.get(tobacco.id) ?? []).map((analog) => toRuleTobacco(analog, undefined)),
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
