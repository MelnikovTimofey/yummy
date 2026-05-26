export type SortDirection = 'asc' | 'desc';

export type CompoundSortKey<Field extends string> = `${Field}-${SortDirection}`;

export type SortPillOption<Field extends string> = {
  key: CompoundSortKey<Field>;
  label: string;
};

export const composeSortKey = <F extends string>(
  field: F,
  direction: SortDirection,
): CompoundSortKey<F> => {
  return `${field}-${direction}` as CompoundSortKey<F>;
};

// split по последнему дефису — поддерживает поля с дефисом (avg-rating и т.п.).
export const parseSortKey = <F extends string>(
  key: CompoundSortKey<F>,
): { field: F; direction: SortDirection } => {
  const idx = key.lastIndexOf('-');
  const field = key.slice(0, idx) as F;
  const direction = key.slice(idx + 1) as SortDirection;
  return { field, direction };
};

export const buildSortPillOptions = <F extends string>(
  fields: ReadonlyArray<{ value: F; label: string }>,
  directions: ReadonlyArray<{ value: SortDirection; label: string }>,
): SortPillOption<F>[] => {
  const result: SortPillOption<F>[] = [];
  for (const field of fields) {
    for (const direction of directions) {
      result.push({
        key: composeSortKey(field.value, direction.value),
        label: `${field.label} · ${direction.label}`,
      });
    }
  }
  return result;
};
