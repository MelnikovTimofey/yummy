import { mixes, tobaccos } from './catalog';
import type { Tobacco } from './catalog';

export type SmokeCtaEvent = {
  mixId: string;
  createdAt: string;
};

const cloneTobaccos = (): Tobacco[] =>
  tobaccos.map((item) => ({
    ...item,
    flavorProfiles: [...item.flavorProfiles],
    flavors: [...item.flavors],
  }));

let inventoryTobaccos = cloneTobaccos();
let smokeCtaEvents: SmokeCtaEvent[] = [];

export const resetNomadState = () => {
  inventoryTobaccos = cloneTobaccos();
  smokeCtaEvents = [];
};

export const getInventoryTobaccos = () => inventoryTobaccos;

export const getTobaccoById = (id: string) => inventoryTobaccos.find((item) => item.id === id) ?? null;

export const updateTobaccoInStock = (id: string, inStock: boolean) => {
  const tobacco = getTobaccoById(id);
  if (!tobacco) {
    return null;
  }

  tobacco.inStock = inStock;
  return tobacco;
};

export const getAvailableMixCatalog = () => mixes;

export const recordSmokeCtaEvent = (mixId: string) => {
  const event = {
    mixId,
    createdAt: new Date().toISOString(),
  };

  smokeCtaEvents.push(event);
  return event;
};

export const getSmokeCtaEvents = () => smokeCtaEvents.slice();

export const getInventorySummary = () => {
  const total = inventoryTobaccos.length;
  const inStockCount = inventoryTobaccos.filter((item) => item.inStock).length;

  return {
    total,
    inStockCount,
    outOfStockCount: total - inStockCount,
  };
};

export const getSmokeCtaSummary = () => {
  const counts = smokeCtaEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.mixId] = (acc[event.mixId] ?? 0) + 1;
    return acc;
  }, {});

  const topMixes = Object.entries(counts)
    .map(([mixId, count]) => ({
      mixId,
      mixName: mixes.find((mix) => mix.id === mixId)?.name ?? mixId,
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.mixId.localeCompare(right.mixId);
    });

  return {
    smokeCtaTotal: smokeCtaEvents.length,
    topMixes,
  };
};
