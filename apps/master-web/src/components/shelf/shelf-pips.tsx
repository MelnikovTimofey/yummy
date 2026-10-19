import type { ShelfRow } from '@/contracts';
import { shelfPips } from '@/lib/shelf';

// Банки строки: открытая — заливка по остатку, в запасе — сплошная, банок нет — пунктир.
export const ShelfPips = ({ row, large = false }: { row: ShelfRow; large?: boolean }) => {
  const pips = shelfPips(row);
  return (
    <span className={`shelf-pips${large ? ' shelf-pips--lg' : ''}`} title="Банки: в работе и в запасе">
      {pips.open.map((pip) => (
        <span key={pip.id} className="shelf-pip" data-tone={pip.tone}>
          <i style={{ height: `${Math.max(6, pip.fill * 100)}%` }} />
        </span>
      ))}
      {Array.from({ length: Math.min(pips.sealed, 6) }, (_, index) => (
        <span key={`sealed-${index}`} className="shelf-pip shelf-pip--sealed" />
      ))}
      {!pips.open.length && !pips.sealed ? <span className="shelf-pip shelf-pip--none" /> : null}
      {large ? null : <span className="shelf-pips__meta">{pips.label}</span>}
    </span>
  );
};
