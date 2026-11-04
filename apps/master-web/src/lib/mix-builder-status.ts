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

// Нижняя панель конструктора на телефоне (#540): сумма и подсказка, что с ней не так.
export const builderSumLabel = (total: number) => {
  if (total === 100) return { value: '100 %', note: 'сумма пропорций', warn: false };
  const note = total > 100 ? `лишние ${total - 100} %` : `не хватает ${100 - total} %`;
  return { value: `${total} %`, note, warn: true };
};

// Пометка у табака в составе (#540): что увидит гость, пока табак закончился.
// Замена подходит, только если не хватает ровно этого табака (как в builderStockTag).
export const componentStockNote = (
  tobaccoId: string,
  inStock: boolean,
  missingIds: string[],
  substitution: MixSubstitution | null,
) => {
  if (inStock) return null;
  const tag = builderStockTag(missingIds, substitution);
  if (tag?.label === 'с заменой' && substitution?.from.tobaccoId === tobaccoId) {
    return { tone: 'warning' as const, text: `Закончился, гостю заменит ${substitution.to.name}` };
  }
  return { tone: 'danger' as const, text: 'Закончился, микс скрыт у гостя' };
};
