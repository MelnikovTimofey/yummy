import { profileLabelMap } from './profile-labels';
import { matchSearch, rankBySearch } from './search-match';

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

// Как гости пишут латинские бренды прода по-русски (#187). Бренды из Каталога прода на 2026-10-19;
// кириллические (Сарма, База, Северный, Кобра, Хулиган) находятся и так. Транслит
// и опечатки (#522) покрывают часть списка, но не созвучия вроде «масхэв».
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

// Поиск — по неточному совпадению (#522); описание — только точной подстрокой.
const searchFields = (mix: CatalogMix) => [
  mix.name,
  ...mix.flavors,
  ...mix.flavorProfiles.map((profile) => profileLabelMap[profile] ?? ''),
  ...mix.components.flatMap((component) => [
    component.name,
    component.manufacturer,
    ...(brandAliases[component.manufacturer.toLowerCase()] ?? []),
  ]),
];

// Внутри характеров и внутри вкусов — «или», между ними и с текстом — «и».
// Сортировки нет (#181): у «Покурить» и оценок пока нет данных, поэтому порядок — по алфавиту,
// при поиске точные совпадения выше похожих.
export const filterCatalogMixes = <T extends CatalogMix>(mixes: T[], { query, profiles, flavors }: CatalogFilter): T[] =>
  rankBySearch(
    mixes
      .filter((mix) => mix.available)
      .filter((mix) => !profiles.length || mix.flavorProfiles.some((profile) => profiles.includes(profile)))
      .filter((mix) => !flavors.length || mix.flavors.some((flavor) => flavors.includes(flavor)))
      .sort((left, right) => byRu(left.name, right.name)),
    query,
    searchFields,
    (mix) => [mix.description],
  );

export const flavorsMatchedFirst = (flavors: string[], query: string, selectedFlavors: string[]) => {
  const isMatch = (flavor: string) =>
    selectedFlavors.includes(flavor) || (query.trim() !== '' && matchSearch(query, [flavor]) !== null);
  return [...flavors.filter(isMatch), ...flavors.filter((flavor) => !isMatch(flavor))];
};

export const byCountDesc = (
  values: string[],
  counts: Record<string, number>,
  label: (value: string) => string = (value) => value,
) => [...values].sort((left, right) => (counts[right] ?? 0) - (counts[left] ?? 0) || byRu(label(left), label(right)));
