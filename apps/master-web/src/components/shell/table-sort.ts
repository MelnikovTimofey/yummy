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
