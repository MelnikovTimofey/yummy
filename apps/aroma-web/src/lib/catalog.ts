import { profileLabelMap } from './profile-labels';

type CatalogMix = {
  name: string;
  description: string;
  flavorProfiles: string[];
  flavors: string[];
  available: boolean;
  components: Array<{ name: string; manufacturer: string }>;
};

export type CatalogFilter = {
  query: string;
  profiles: string[];
  flavors: string[];
};

const byRu = (left: string, right: string) => left.localeCompare(right, 'ru');

export const normalizeSearchText = (text: string) => text.trim().toLowerCase().replace(/ё/g, 'е');

// Как гости пишут латинские бренды прода по-русски (#187). Бренды из Каталога прода на 2026-10-19;
// кириллические (Сарма, База, Северный, Кобра, Хулиган) находятся и так.
const brandAliases: Record<string, string[]> = {
  musthave: ['масхэв', 'мастхэв', 'масхев', 'мастхев', 'маст хэв'],
  darkside: ['дарксайд', 'дарк сайд'],
  tangiers: ['танжирс', 'танжерс'],
  satyr: ['сатир', 'сатыр'],
  'black burn': ['блэк берн', 'блек берн', 'блэкберн'],
  spectrum: ['спектрум'],
  sebero: ['себеро'],
  adalya: ['адалия', 'адалья'],
  serbetli: ['щербетли', 'шербетли', 'сербетли'],
  nirvana: ['нирвана'],
  'sapphire crown': ['сапфир краун'],
  mattpear: ['матпир', 'маттпир', 'мэтпир'],
  'al fakher': ['аль фахер', 'альфахер', 'аль факер'],
  'trofimoff’s': ['трофимов'],
  oven: ['овен'],
  // В данных прода «Nаш» набран с латинской N.
  'nаш': ['наш'],
  chabacco: ['чабакко', 'чабако'],
  banger: ['бангер', 'бэнгер'],
  afzal: ['афзал'],
};

const matchesQuery = (mix: CatalogMix, query: string) =>
  normalizeSearchText(
    [
      mix.name,
      mix.description,
      ...mix.flavors,
      ...mix.flavorProfiles.map((profile) => profileLabelMap[profile] ?? ''),
      ...mix.components.flatMap((component) => [
        component.name,
        component.manufacturer,
        ...(brandAliases[component.manufacturer.toLowerCase()] ?? []),
      ]),
    ].join(' '),
  ).includes(query);

// Внутри характеров и внутри вкусов — «или», между ними и с текстом — «и».
// Сортировки нет (#181): у «Покурить» и оценок пока нет данных, поэтому порядок — по алфавиту.
export const filterCatalogMixes = <T extends CatalogMix>(mixes: T[], { query, profiles, flavors }: CatalogFilter): T[] => {
  const normalizedQuery = normalizeSearchText(query);
  return mixes
    .filter((mix) => mix.available)
    .filter((mix) => !normalizedQuery || matchesQuery(mix, normalizedQuery))
    .filter((mix) => !profiles.length || mix.flavorProfiles.some((profile) => profiles.includes(profile)))
    .filter((mix) => !flavors.length || mix.flavors.some((flavor) => flavors.includes(flavor)))
    .sort((left, right) => byRu(left.name, right.name));
};

export const flavorsMatchedFirst = (flavors: string[], query: string, selectedFlavors: string[]) => {
  const normalizedQuery = normalizeSearchText(query);
  const isMatch = (flavor: string) =>
    selectedFlavors.includes(flavor) || (normalizedQuery !== '' && normalizeSearchText(flavor).includes(normalizedQuery));
  return [...flavors.filter(isMatch), ...flavors.filter((flavor) => !isMatch(flavor))];
};

export const byCountDesc = (
  values: string[],
  counts: Record<string, number>,
  label: (value: string) => string = (value) => value,
) => [...values].sort((left, right) => (counts[right] ?? 0) - (counts[left] ?? 0) || byRu(label(left), label(right)));
