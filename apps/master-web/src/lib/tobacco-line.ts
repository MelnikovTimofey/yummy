// Линейка табака на «Полке» (#621, Р1–Р2): htreviews пишет её с брендом
// («Sebero Black»), подпись показывает только «Black». То же правило у гостя —
// apps/aroma-web/src/lib/line.ts.

const HIDDEN = new Set(['', 'основная']);

export const lineLabel = (manufacturer: string, lineName: string | undefined): string => {
  const line = (lineName ?? '').trim();
  const brand = manufacturer.trim().toLowerCase();
  const rest = brand && line.toLowerCase().startsWith(`${brand} `) ? line.slice(brand.length).trim() : line;
  return HIDDEN.has(rest.toLowerCase()) || rest.toLowerCase() === brand ? '' : rest;
};

type NamedTobacco = { manufacturer: string; lineName?: string; name: string };

// «Sebero Black Strawberry» — заявка поставщику, тосты, меню, aria-label.
export const tobaccoFullName = (tobacco: NamedTobacco) =>
  [tobacco.manufacturer, lineLabel(tobacco.manufacturer, tobacco.lineName), tobacco.name].filter(Boolean).join(' ');
