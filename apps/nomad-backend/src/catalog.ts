export const flavorProfiles = ['fresh', 'sweet', 'dessert', 'berry', 'citrus', 'spicy', 'tobacco'] as const;

export type FlavorProfile = (typeof flavorProfiles)[number];

export type Tobacco = {
  id: string;
  name: string;
  manufacturer: string;
  flavorProfiles: FlavorProfile[];
  flavors: string[];
  inStock: boolean;
};

export type Mix = {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  popularity: number;
  avgRating: number;
};

export const tobaccos: Tobacco[] = [
  {
    id: 'tobacco-citrus-breeze',
    name: 'Citrus Breeze',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['fresh', 'citrus'],
    flavors: ['лимон', 'грейпфрут', 'лайм'],
    inStock: true,
  },
  {
    id: 'tobacco-berry-oasis',
    name: 'Berry Oasis',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['berry', 'sweet'],
    flavors: ['малина', 'черника'],
    inStock: true,
  },
  {
    id: 'tobacco-desert-honey',
    name: 'Desert Honey',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['dessert', 'sweet'],
    flavors: ['мед', 'ваниль'],
    inStock: true,
  },
  {
    id: 'tobacco-spice-route',
    name: 'Spice Route',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'кардамон'],
    inStock: true,
  },
  {
    id: 'tobacco-mint-veil',
    name: 'Mint Veil',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['fresh'],
    flavors: ['мята'],
    inStock: true,
  },
  {
    id: 'tobacco-peach-silk',
    name: 'Peach Silk',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['sweet'],
    flavors: ['персик'],
    inStock: false,
  },
];

export const mixes: Mix[] = [
  {
    id: 'mix-citrus-scout',
    name: 'Цитрусовый караван',
    description: 'Свежий микс с ярким лимонно-мятным акцентом.',
    componentIds: ['tobacco-citrus-breeze', 'tobacco-mint-veil'],
    popularity: 92,
    avgRating: 4.8,
  },
  {
    id: 'mix-berry-dawn',
    name: 'Ягодный рассвет',
    description: 'Мягкая ягодная сладость с холодным хвостом.',
    componentIds: ['tobacco-berry-oasis', 'tobacco-mint-veil'],
    popularity: 85,
    avgRating: 4.7,
  },
  {
    id: 'mix-silk-road',
    name: 'Шёлковый путь',
    description: 'Десертный микс с медом и ванилью.',
    componentIds: ['tobacco-desert-honey', 'tobacco-berry-oasis'],
    popularity: 78,
    avgRating: 4.6,
  },
  {
    id: 'mix-amber-bazaar',
    name: 'Янтарный базар',
    description: 'Пряно-табачный профиль с теплым послевкусием.',
    componentIds: ['tobacco-spice-route', 'tobacco-desert-honey'],
    popularity: 74,
    avgRating: 4.5,
  },
  {
    id: 'mix-peach-mirage',
    name: 'Персиковый мираж',
    description: 'Сладкий фруктовый микс, который сейчас недоступен по наличию.',
    componentIds: ['tobacco-peach-silk', 'tobacco-mint-veil'],
    popularity: 81,
    avgRating: 4.4,
  },
];
