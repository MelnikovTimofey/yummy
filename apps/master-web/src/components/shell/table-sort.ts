export type SortDirection = 'asc' | 'desc';

export type SortState<F extends string> = {
  field: F;
  direction: SortDirection;
};

export const nextColumnSort = <F extends string>(
  current: SortState<F>,
  field: F,
  initialDirection: SortDirection,
  fallback: SortState<F>,
): SortState<F> => {
  if (current.field !== field) {
    return { field, direction: initialDirection };
  }

  if (current.direction === initialDirection) {
    return { field, direction: initialDirection === 'asc' ? 'desc' : 'asc' };
  }

  return fallback;
};

export const ariaSortFor = <F extends string>(current: SortState<F>, field: F) => {
  if (current.field !== field) {
    return 'none' as const;
  }

  return current.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
};

export const flipSortDirection = <F extends string>(current: SortState<F>): SortState<F> => ({
  field: current.field,
  direction: current.direction === 'asc' ? 'desc' : 'asc',
});

export const sortDirectionLabel = (direction: SortDirection) =>
  `Направление сортировки: ${direction === 'asc' ? 'по возрастанию' : 'по убыванию'}`;
