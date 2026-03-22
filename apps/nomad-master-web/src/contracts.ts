export type StaffUser = {
  login: string;
  name: string;
  role: 'admin' | 'nomad';
};

export type StaffAuthResponse = {
  accessToken: string;
  tokenType?: 'Bearer';
  user: StaffUser;
};

export type InventoryTobacco = {
  id: string;
  name: string;
  manufacturer: string;
  inStock: boolean;
  flavorProfiles?: string[];
  flavors?: string[];
};

export type DashboardSummary = {
  totalTobaccos: number;
  inStockCount: number;
  outOfStockCount: number;
  smokeCtaTotal: number;
  topMixes: Array<{
    mixId: string;
    name: string;
    smokeCtaCount: number;
  }>;
};

export const buildInventorySummary = (items: InventoryTobacco[]) => {
  const totalTobaccos = items.length;
  const inStockCount = items.filter((item) => item.inStock).length;
  const outOfStockCount = totalTobaccos - inStockCount;

  return {
    totalTobaccos,
    inStockCount,
    outOfStockCount,
  };
};

export const sortInventoryItems = (items: InventoryTobacco[]) => {
  return [...items].sort((left, right) => {
    if (left.inStock !== right.inStock) {
      return left.inStock ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'ru');
  });
};

export const formatMetricValue = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value);
};
