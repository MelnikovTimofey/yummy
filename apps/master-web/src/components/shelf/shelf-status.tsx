import type { ShelfRow } from '@/contracts';
import { shelfStatusCell } from '@/lib/shelf';

// Наличие (#518, #shot=shelf): точка, статус и строка ниже — «в заявке», заметка к стопу.
export const ShelfStatusCell = ({ row }: { row: ShelfRow }) => {
  const cell = shelfStatusCell(row);
  return (
    <span className="shelf-two">
      <span className="shelf-status" data-tone={cell.tone}>
        <i aria-hidden />
        {cell.label}
      </span>
      {cell.note ? <small>{cell.note}</small> : null}
    </span>
  );
};
