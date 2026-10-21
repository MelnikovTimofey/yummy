import type { ShelfRow } from '@/contracts';
import { shelfLevel } from '@/lib/shelf';

// Остаток (#306, #shot=shelf): полоса — доля от уровня после последнего прихода,
// цифра — граммы сейчас по расчёту.
export const ShelfLevel = ({ row, large = false }: { row: ShelfRow; large?: boolean }) => {
  const level = shelfLevel(row);
  return (
    <span className={`shelf-level${large ? ' shelf-level--lg' : ''}`} title="Остаток от уровня после последнего прихода">
      <span className="shelf-level__bar" data-tone={level.tone} data-none={level.none || undefined}>
        {level.none ? null : <i style={{ width: `${Math.max(4, level.share * 100)}%` }} />}
      </span>
      <span className="shelf-level__copy">
        <b data-tone={level.empty ? 'danger' : level.value === '—' ? 'faint' : undefined}>{level.value}</b>
        <small>{level.hint}</small>
      </span>
    </span>
  );
};
