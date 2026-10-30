import type {
  InventoryArchivedFilter,
  InventoryListFilters,
  InventoryListMeta,
  InventorySortField,
  InventoryStockFilter,
  MixListMeta,
  MixSortField,
  MixStatusFilter,
} from '../contracts';

// Панель фильтров «Каталога» и «Миксов» (#467): фильтры там серверные, а
// общие компоненты панели (#464) работают с локальным набором значений.

type Direction = 'asc' | 'desc';

// Список значений отдаёт новый набор целиком, а сервер принимает переключение
// одного значения или очистку группы.
export const applyAttributeChange = (
  prev: string[],
  next: string[],
  { toggle, clear }: { toggle: (value: string) => void; clear: () => void },
) => {
  if (!next.length) {
    if (prev.length) clear();
    return;
  }
  const changed = next.find((value) => !prev.includes(value)) ?? prev.find((value) => !next.includes(value));
  if (changed !== undefined) toggle(changed);
};

// «Архив» стоит в одном ряду с наличием: архивные табаки — отдельный срез
// каталога, а не наличие.
export type CatalogStatus = InventoryStockFilter | 'archived';

export const CATALOG_STATUS_CHIPS: Array<[CatalogStatus, string]> = [
  ['all', 'Все'],
  ['in-stock', 'В наличии'],
  ['out-of-stock', 'Нет наличия'],
  ['archived', 'Архив'],
];

type CatalogStatusFilters = Pick<InventoryListFilters, 'stock' | 'archived'>;

export const catalogStatusOf = ({ stock, archived }: CatalogStatusFilters): CatalogStatus =>
  archived === 'archived' ? 'archived' : stock;

export const catalogStatusPatch = (current: CatalogStatusFilters, next: CatalogStatus) => {
  const target: { stock: InventoryStockFilter; archived: InventoryArchivedFilter } =
    next === 'archived' ? { stock: 'all', archived: 'archived' } : { stock: next, archived: 'active' };
  const patch: Partial<CatalogStatusFilters> = {};
  if (current.stock !== target.stock) patch.stock = target.stock;
  if (current.archived !== target.archived) patch.archived = target.archived;
  return patch;
};

// У «Все» числа нет: сколько всего, сказано в мете шапки (#348).
export const catalogStatusCount = (meta: InventoryListMeta, status: CatalogStatus) => {
  if (status === 'in-stock') return meta.inStockCount;
  if (status === 'out-of-stock') return meta.outOfStockCount;
  if (status === 'archived') return meta.archivedCount;
  return undefined;
};

export const MIX_STATUS_CHIPS: Array<[MixStatusFilter, string]> = [
  ['all', 'Все'],
  ['guest-visible', 'Виден гостю'],
  ['hidden', 'Скрыт'],
  ['blocked', 'Блокирован'],
];

export const mixStatusCount = (meta: MixListMeta, status: MixStatusFilter) => {
  if (status === 'guest-visible') return meta.guestVisibleCount;
  if (status === 'hidden') return meta.hiddenCount;
  if (status === 'blocked') return meta.blockedCount;
  return undefined;
};

// Пилюля «По …» и заголовки колонок меняют одно состояние сортировки. Первая
// опция — сортировка по умолчанию, к ней же возвращает третий клик по заголовку.
type SortOption<Field extends string> = { field: Field; label: string; direction: Direction };

export const CATALOG_SORTS: Array<SortOption<InventorySortField>> = [
  { field: 'stock', label: 'По наличию', direction: 'desc' },
  { field: 'name', label: 'По названию', direction: 'asc' },
  { field: 'manufacturer', label: 'По бренду', direction: 'asc' },
  { field: 'dependentMixes', label: 'По миксам', direction: 'desc' },
];

export const MIX_SORTS: Array<SortOption<MixSortField>> = [
  { field: 'demand', label: 'По спросу', direction: 'desc' },
  { field: 'avgRating', label: 'По рейтингу', direction: 'desc' },
  { field: 'name', label: 'По названию', direction: 'asc' },
];

export const sortPillOptions = <Field extends string>(sorts: Array<SortOption<Field>>): Array<[Field, string]> =>
  sorts.map(({ field, label }) => [field, label]);

export const pickSort = <Field extends string>(
  sorts: Array<SortOption<Field>>,
  current: { field: Field; direction: Direction },
  field: Field,
): { field: Field; direction: Direction } => {
  if (current.field === field) return current;
  return { field, direction: sorts.find((option) => option.field === field)?.direction ?? 'asc' };
};
