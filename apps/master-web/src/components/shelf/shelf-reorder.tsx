import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { ReorderGroup, ReorderView } from '@/contracts';
import { formatGramPrice } from '@/lib/shelf';
import { formatApproxRub } from '@/lib/shelf-dashboard';
import {
  groupCaption,
  groupKey,
  groupOrderText,
  REORDER_STEP_GRAMS,
  reorderHint,
  reorderItemName,
  reorderRate,
  reorderSum,
  stepQuantity,
  untilLabel,
  withQuantities,
  type ReorderQuantities,
} from '@/lib/reorder';
import type { ShelfToastData } from './shelf-toast';

type ShelfReorderProps = {
  reorder: ReorderView | null;
  error: string;
  notify: (toast: Omit<ShelfToastData, 'id'>) => void;
};

const supplierTitle = (group: ReorderGroup) => group.supplier?.name ?? 'Поставщик не выбран';

// «К заказу» (#213, #310, #shot=reorder): группы по последнему поставщику. Граммы
// мастер правит здесь же — они не сохраняются, а уходят в текст для чата.
export const ShelfReorder = ({ reorder, error, notify }: ShelfReorderProps) => {
  const [quantities, setQuantities] = useState<ReorderQuantities>({});
  const [copiedKey, setCopiedKey] = useState('');

  if (!reorder) {
    return error ? <p className="error-text">{error}</p> : <p className="meta-line">Считаем, что пора заказать…</p>;
  }

  const groups = reorder.groups.map((group) => {
    const items = withQuantities(group.items, quantities);
    return { group, items, text: groupOrderText(group, items, reorder.text, quantities) };
  });
  const copied = groups.find(({ group }) => groupKey(group) === copiedKey);

  const onCopy = async (group: ReorderGroup, text: string) => {
    setCopiedKey(groupKey(group));
    try {
      await navigator.clipboard.writeText(text);
      notify({ title: 'Скопировано', text: `заказ для «${supplierTitle(group)}». Вставьте его в чат с поставщиком.` });
    } catch {
      notify({ title: supplierTitle(group), text: 'Не удалось скопировать автоматически — выделите текст заказа ниже.', error: true });
    }
  };

  return (
    <div className="reorder">
      {error ? <p className="error-text">{error}</p> : null}
      {!groups.length ? <p className="empty reorder__empty">Заказывать нечего. Полка в порядке.</p> : null}

      {groups.map(({ group, items, text }) => {
        const sum = reorderSum(items);
        const caption = groupCaption(group);
        const title = supplierTitle(group);
        return (
          <section key={groupKey(group)} className="reorder-group" aria-label={title} data-supplier-id={groupKey(group)}>
            <header className="reorder-group__head">
              <h2>{title}</h2>
              <span className="reorder-group__caption">{caption}</span>
              {sum !== null ? <span className="shelf-num reorder-group__sum">{formatApproxRub(sum)}</span> : null}
              <button type="button" className="btn" data-size="sm" onClick={() => void onCopy(group, text)}>
                <Copy size={14} aria-hidden />
                Скопировать заказ
              </button>
            </header>
            <table className="reorder-table">
              <colgroup>
                <col />
                <col style={{ width: 170 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Табак</th>
                  <th scope="col">Хватит до</th>
                  <th scope="col">Расход · остаток</th>
                  <th scope="col">Заказать</th>
                  <th scope="col">Цена грамма</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const name = reorderItemName(item);
                  const until = untilLabel(item, reorder.settings.leadDays);
                  const step = (delta: number) =>
                    setQuantities((current) => ({ ...current, [item.tobacco.id]: stepQuantity(item.quantityGrams, delta) }));
                  return (
                    <tr key={item.tobacco.id} data-tobacco-id={item.tobacco.id}>
                      <td>{name}</td>
                      <td>
                        <span className="shelf-num" data-tone={until.tone}>
                          {until.text}
                          {until.days ? <span className="shelf-faint"> · {until.days}</span> : null}
                        </span>
                      </td>
                      <td className={item.rateKind === 'own' ? 'shelf-num' : 'shelf-faint'}>{reorderRate(item)}</td>
                      <td>
                        <span className="reorder-stepper" role="group" aria-label={`Заказать: ${name}`}>
                          <button type="button" aria-label="Меньше" disabled={item.quantityGrams <= REORDER_STEP_GRAMS} onClick={() => step(-1)}>
                            −
                          </button>
                          <output aria-live="polite">{item.quantityGrams} г</output>
                          <button type="button" aria-label="Больше" onClick={() => step(1)}>
                            +
                          </button>
                        </span>
                      </td>
                      <td className="shelf-num">{formatGramPrice(item.gramPriceKop)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      {copied ? (
        <section className="reorder-copied" aria-label="Текст заказа">
          <p className="reorder-copied__eyebrow">Скопировано · {supplierTitle(copied.group)}</p>
          <h2>Текст для чата с поставщиком</h2>
          <pre>{copied.text}</pre>
        </section>
      ) : null}

      <p className="reorder__hint">{reorderHint(reorder.settings.leadDays)}</p>
    </div>
  );
};
