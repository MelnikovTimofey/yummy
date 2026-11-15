import type { MixSubstitution } from '@/contracts';

// Метка наличия в шапке конструктора (#494). Аналогов у табаков на клиенте нет, поэтому
// замену берём из сохранённого статуса микса: она подходит, пока не хватает ровно того
// табака, который она закрывает.
// plannedIds — недостающие табаки в плане (#566): если в плане все, микс ждёт план.
export const builderStockTag = (missingIds: string[], substitution: MixSubstitution | null, plannedIds: string[] = []) => {
  if (!missingIds.length) return null;
  if (missingIds.length === 1 && substitution?.from.tobaccoId === missingIds[0]) {
    return { tone: 'info' as const, label: 'с заменой', note: `${substitution.to.name} вместо ${substitution.from.name}` };
  }
  if (missingIds.every((id) => plannedIds.includes(id))) {
    return { tone: 'plan' as const, label: 'Ждёт табак из плана' };
  }
  return { tone: 'warning' as const, label: 'блокируется наличием' };
};

export const AWAITS_PLAN_HINT = 'Гость увидит микс, когда табаки из плана придут по счёту.';

// Табак в составе и полка (#566, #shot=mix-edit): «нет на полке» — строки нет или она
// убрана; закончившийся остаётся на полке и подписан, как раньше.
export type ComponentShelfState = 'in' | 'plan' | 'none' | 'out';

export const componentShelfState = (inStock: boolean, shelfStatus: 'active' | 'plan' | undefined): ComponentShelfState => {
  if (shelfStatus === 'plan') return 'plan';
  if (inStock) return 'in';
  return shelfStatus ? 'out' : 'none';
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
