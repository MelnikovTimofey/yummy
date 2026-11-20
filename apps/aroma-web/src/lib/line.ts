// Подпись линейки после бренда (#627, правило Р1 #621). htreviews часто повторяет
// бренд в названии линейки («Sebero Black») — в подписи он уже есть.
const HIDDEN = new Set(['', 'основная']);

export const lineLabel = (manufacturer: string, lineName: string | undefined): string => {
  const line = (lineName ?? '').trim();
  const brand = manufacturer.trim().toLowerCase();
  const rest = brand && line.toLowerCase().startsWith(`${brand} `) ? line.slice(brand.length).trim() : line;
  return HIDDEN.has(rest.toLowerCase()) || rest.toLowerCase() === brand ? '' : rest;
};
