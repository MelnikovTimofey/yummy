import type { MixSubstitution } from '@/contracts';

// Метка наличия в шапке конструктора (#494). Аналогов у табаков на клиенте нет, поэтому
// замену берём из сохранённого статуса микса: она подходит, пока не хватает ровно того
// табака, который она закрывает.
export const builderStockTag = (missingIds: string[], substitution: MixSubstitution | null) => {
  if (!missingIds.length) return null;
  if (missingIds.length === 1 && substitution?.from.tobaccoId === missingIds[0]) {
    return { tone: 'info' as const, label: 'с заменой', note: `${substitution.to.name} вместо ${substitution.from.name}` };
  }
  return { tone: 'warning' as const, label: 'блокируется наличием' };
};
