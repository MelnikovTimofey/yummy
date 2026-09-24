import { ArrowDown, ArrowUp } from 'lucide-react';
import { ariaSortFor, nextColumnSort, type SortDirection, type SortState } from './table-sort';

type SortableHeaderProps<F extends string> = {
  label: string;
  field: F;
  sort: SortState<F>;
  fallback: SortState<F>;
  initialDirection: SortDirection;
  /** Что даёт каждое направление, словами поля: «А → Я», «Больше миксов». */
  directionLabels: Record<SortDirection, string>;
  onSortChange: (next: SortState<F>) => void;
  className?: string;
};

export const SortableHeader = <F extends string>({
  label,
  field,
  sort,
  fallback,
  initialDirection,
  directionLabels,
  onSortChange,
  className,
}: SortableHeaderProps<F>) => {
  const ariaSort = ariaSortFor(sort, field);
  const next = nextColumnSort(sort, field, initialDirection, fallback);
  const nextHint = next.field === field ? directionLabels[next.direction] : 'порядок по умолчанию';
  const Arrow = sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <button
        type="button"
        className="sortable-header"
        data-active={ariaSort !== 'none' || undefined}
        title={`Сортировать: ${nextHint}`}
        onClick={() => onSortChange(next)}
      >
        {label}
        {ariaSort !== 'none' ? <Arrow size={12} aria-hidden="true" /> : null}
      </button>
    </th>
  );
};
