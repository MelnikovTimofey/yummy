import { lineLabel } from '@/lib/line';

// Бренд и линейка в составе карточки для мастера (#627): «DARKSIDE Core» —
// мастер по ней берёт банку нужной линейки.
export function MakerLine({ manufacturer, lineName }: { manufacturer: string; lineName?: string }) {
  const line = lineLabel(manufacturer, lineName);
  return (
    <span className="aroma-mix-sheet-comp-maker">
      {manufacturer}
      {line ? <span className="aroma-mix-sheet-comp-line"> {line}</span> : null}
    </span>
  );
}
