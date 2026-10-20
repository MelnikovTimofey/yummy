import { formatCount, type CatalogIdea, type CatalogIdeas } from '../contracts';

// Чистая логика вида «Каталог → Идеи для закупки» (#214): подборки и числа htreviews.

const NO_DATA = '—';

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const rating = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatHtRating = (value: number | null) => (value === null ? NO_DATA : rating.format(value));

export const formatRatingsCount = (value: number | null) =>
  value === null ? 'нет оценок' : formatCount(value, ['оценка', 'оценки', 'оценок']);

// 96 400 → «96 тыс.»: до десяти тысяч оставляем десятые, дальше — целые.
export const formatViews = (value: number | null) => {
  if (value === null) return NO_DATA;
  if (value < 1000) return decimal.format(value);
  const thousands = value / 1000;
  if (thousands < 999.5) {
    return `${decimal.format(thousands < 10 ? Math.round(thousands * 10) / 10 : Math.round(thousands))} тыс.`;
  }
  return `${decimal.format(Math.round(value / 100_000) / 10)} млн`;
};

const SECTIONS: Array<{ key: keyof CatalogIdeas; title: string; hint: string }> = [
  {
    key: 'popularOnShelfBrands',
    title: 'Популярное у ваших брендов',
    hint: 'Бренды полки, отсортированы по просмотрам на htreviews',
  },
  {
    key: 'topRated',
    title: 'Высокий рейтинг',
    hint: 'С поправкой на число оценок: 5,0 с тремя оценками не обгоняет 4,7 с тысячей',
  },
  {
    key: 'likeFastMoving',
    title: 'Похоже на то, что быстро уходит',
    hint: 'Вкусы и характеры десяти табаков с самым большим расходом',
  },
];

export type IdeaSection = { key: keyof CatalogIdeas; title: string; hint: string; items: CatalogIdea[] };

// Идеи — только то, чего нет на полке. Табак «в плане» остаётся с меткой:
// сервер считает полкой наличие, а план наличия не даёт.
export const ideaSections = (ideas: CatalogIdeas, shelfStatuses: ReadonlyMap<string, 'active' | 'plan'>): IdeaSection[] =>
  SECTIONS.map((section) => ({
    ...section,
    items: ideas[section.key].filter((item) => shelfStatuses.get(item.id) !== 'active'),
  })).filter((section) => section.items.length > 0);
