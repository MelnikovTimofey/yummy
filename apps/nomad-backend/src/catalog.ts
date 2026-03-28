export const flavorProfiles = [
  'sweet',
  'sour',
  'spicy',
  'fresh',
  'dessert',
  'tobacco',
  'minty',
  'fruity',
  'floral_herbal',
  'citrus',
  'berry',
  'perfume',
] as const;

export type FlavorProfile = (typeof flavorProfiles)[number];

export type Tobacco = {
  id: string;
  name: string;
  manufacturer: string;
  flavorProfiles: FlavorProfile[];
  flavors: string[];
  flavorTags: string[];
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
    flavorProfiles: ['fresh', 'citrus', 'sour'],
    flavors: ['лимон', 'грейпфрут', 'лайм'],
    flavorTags: ['fresh'],
    inStock: true,
  },
  {
    id: 'tobacco-berry-oasis',
    name: 'Berry Oasis',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['berry', 'sweet', 'fruity'],
    flavors: ['малина', 'черника'],
    flavorTags: ['berry'],
    inStock: true,
  },
  {
    id: 'tobacco-desert-honey',
    name: 'Desert Honey',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['dessert', 'sweet'],
    flavors: ['мед', 'ваниль'],
    flavorTags: ['dessert'],
    inStock: true,
  },
  {
    id: 'tobacco-spice-route',
    name: 'Spice Route',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['spicy', 'tobacco'],
    flavors: ['корица', 'кардамон'],
    flavorTags: ['spicy'],
    inStock: true,
  },
  {
    id: 'tobacco-mint-veil',
    name: 'Mint Veil',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['fresh', 'minty'],
    flavors: ['мята'],
    flavorTags: ['minty'],
    inStock: true,
  },
  {
    id: 'tobacco-peach-silk',
    name: 'Peach Silk',
    manufacturer: 'Nomad Reserve',
    flavorProfiles: ['sweet', 'fruity'],
    flavors: ['персик'],
    flavorTags: ['fruity'],
    inStock: false,
  },
  {
    id: 'tobacco-herbal-dawn',
    name: 'Herbal Dawn',
    manufacturer: 'Lounge Garden',
    flavorProfiles: ['fresh', 'floral_herbal'],
    flavors: ['зелёный чай', 'мелисса', 'лайм'],
    flavorTags: ['herbal'],
    inStock: true,
  },
  {
    id: 'tobacco-rose-nocturne',
    name: 'Rose Nocturne',
    manufacturer: 'Lounge Garden',
    flavorProfiles: ['perfume', 'floral_herbal'],
    flavors: ['роза', 'личи'],
    flavorTags: ['floral'],
    inStock: true,
  },
  {
    id: 'tobacco-apple-fizz',
    name: 'Apple Fizz',
    manufacturer: 'North Wind',
    flavorProfiles: ['sour', 'fruity', 'fresh'],
    flavors: ['зелёное яблоко', 'лимон'],
    flavorTags: ['fruity'],
    inStock: true,
  },
  {
    id: 'tobacco-coconut-cream',
    name: 'Coconut Cream',
    manufacturer: 'North Wind',
    flavorProfiles: ['dessert', 'sweet'],
    flavors: ['кокос', 'сливки', 'ваниль'],
    flavorTags: ['dessert'],
    inStock: true,
  },
  {
    id: 'tobacco-grape-fog',
    name: 'Grape Fog',
    manufacturer: 'Atlas Smoke',
    flavorProfiles: ['berry', 'fruity'],
    flavors: ['виноград', 'ежевика'],
    flavorTags: ['berry'],
    inStock: true,
  },
  {
    id: 'tobacco-dark-leaf',
    name: 'Dark Leaf',
    manufacturer: 'Atlas Smoke',
    flavorProfiles: ['tobacco', 'spicy'],
    flavors: ['сухофрукты', 'пряности'],
    flavorTags: ['tobacco'],
    inStock: true,
  },
  {
    id: 'tobacco-pear-bloom',
    name: 'Pear Bloom',
    manufacturer: 'Velvet Line',
    flavorProfiles: ['fruity', 'floral_herbal'],
    flavors: ['груша', 'белые цветы'],
    flavorTags: ['floral'],
    inStock: true,
  },
  {
    id: 'tobacco-iced-plum',
    name: 'Iced Plum',
    manufacturer: 'Velvet Line',
    flavorProfiles: ['berry', 'minty', 'fresh'],
    flavors: ['слива', 'лёд'],
    flavorTags: ['minty'],
    inStock: true,
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
  {
    id: 'mix-herbal-garden',
    name: 'Травяной сад',
    description: 'Спокойный чайный микс с цитрусовой свежестью.',
    componentIds: ['tobacco-herbal-dawn', 'tobacco-mint-veil'],
    popularity: 63,
    avgRating: 4.3,
  },
  {
    id: 'mix-rose-afterglow',
    name: 'Розовый сумрак',
    description: 'Нежный цветочно-парфюмный микс для медленного вечера.',
    componentIds: ['tobacco-rose-nocturne', 'tobacco-coconut-cream'],
    popularity: 58,
    avgRating: 4.2,
  },
  {
    id: 'mix-apple-wave',
    name: 'Яблочная волна',
    description: 'Сочный кисло-свежий микс с холодным послевкусием.',
    componentIds: ['tobacco-apple-fizz', 'tobacco-mint-veil'],
    popularity: 69,
    avgRating: 4.4,
  },
  {
    id: 'mix-grape-atelier',
    name: 'Виноградное ателье',
    description: 'Фруктовый микс с ягодной глубиной и мягкой основой.',
    componentIds: ['tobacco-grape-fog', 'tobacco-pear-bloom'],
    popularity: 66,
    avgRating: 4.5,
  },
  {
    id: 'mix-dark-market',
    name: 'Тёмный рынок',
    description: 'Табачный микс с сухофруктами и тёплыми специями.',
    componentIds: ['tobacco-dark-leaf', 'tobacco-spice-route'],
    popularity: 61,
    avgRating: 4.3,
  },
  {
    id: 'mix-iced-plum-night',
    name: 'Сливовая ночь',
    description: 'Ледяная ягодная подача для тех, кто любит прохладный дым.',
    componentIds: ['tobacco-iced-plum', 'tobacco-berry-oasis'],
    popularity: 64,
    avgRating: 4.4,
  },
];
