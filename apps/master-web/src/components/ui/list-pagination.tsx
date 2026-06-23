import { Button } from '@/components/ui/button';

type ListPaginationProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  filteredItems: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};

const formatNumber = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

export const ListPagination = ({
  page,
  pageSize,
  totalPages,
  filteredItems,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: ListPaginationProps) => {
  const showSizeSelector = Boolean(onPageSizeChange && pageSizeOptions?.length);

  if (totalPages <= 1 && !showSizeSelector) {
    return null;
  }

  const start = filteredItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredItems);

  return (
    <div className="list-pagination">
      <p className="meta-line list-pagination__summary">
        Показаны {formatNumber(start)}-{formatNumber(end)} из {formatNumber(filteredItems)}
      </p>

      {showSizeSelector ? (
        <label className="list-pagination__size">
          <span className="meta-line">Строк на странице</span>
          <select
            className="select-input"
            aria-label="Строк на странице"
            value={pageSize}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          >
            {pageSizeOptions?.map((option) => (
              <option key={option} value={option}>
                {formatNumber(option)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {totalPages > 1 ? (
        <div className="list-pagination__actions">
          <Button type="button" size="sm" variant="outline" onClick={() => onPageChange(1)} disabled={page <= 1}>
            Первая
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Назад
          </Button>
          <span className="list-pagination__status">
            Страница {formatNumber(page)} из {formatNumber(totalPages)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Вперёд
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            Последняя
          </Button>
        </div>
      ) : null}
    </div>
  );
};
