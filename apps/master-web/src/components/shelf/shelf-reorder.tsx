import { useState } from 'react';
import { Copy } from 'lucide-react';
import { formatCount, type ReorderGroup, type ReorderView } from '@/contracts';
import { formatMoney } from '@/lib/deliveries';
import { formatApproxRub } from '@/lib/shelf-dashboard';
import {
  groupCaption,
  groupKey,
  orderText,
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

// «К заказу» (#213, #shot=reorder): группы по последнему поставщику. Количество
// мастер правит здесь же — оно не сохраняется, а уходит в текст для чата.
export const ShelfReorder = ({ reorder, error, notify }: ShelfReorderProps) => {
  const [quantities, setQuantities] = useState<ReorderQuantities>({});
  const [copiedKey, setCopiedKey] = useState('');

  if (!reorder) {
    return error ? <p className="error-text">{error}</p> : <p className="meta-line">Считаем, что пора заказать…</p>;
  }

  const groups = reorder.groups.map((group) => ({ group, items: withQuantities(group.items, quantities) }));
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

      {groups.map(({ group, items }) => {
        const sum = reorderSum(items);
        const caption = groupCaption(group);
        const title = supplierTitle(group);
        return (
          <section key={groupKey(group)} className="reorder-group" aria-label={title} data-supplier-id={groupKey(group)}>
            <header className="reorder-group__head">
              <h2>{title}</h2>
              <span className="reorder-group__caption">{caption}</span>
              {sum !== null ? <span className="shelf-num reorder-group__sum">{formatApproxRub(sum)}</span> : null}
              <button type="button" className="btn" data-size="sm" onClick={() => void onCopy(group, orderText(items))}>
                <Copy size={14} aria-hidden />
                Скопировать заказ
              </button>
            </header>
            <table className="reorder-table">
              <colgroup>
                <col />
                <col style={{ width: 170 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 140 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Табак</th>
                  <th scope="col">Хватит до</th>
                  <th scope="col">Расход</th>
                  <th scope="col">Заказать</th>
                  <th scope="col">Последняя цена</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const name = reorderItemName(item);
                  const until = untilLabel(item, reorder.settings.leadDays);
                  const step = (delta: number) =>
                    setQuantities((current) => ({ ...current, [item.tobacco.id]: stepQuantity(item.quantity, delta) }));
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
                          <button type="button" aria-label="Меньше" disabled={item.quantity <= 1} onClick={() => step(-1)}>
                            −
                          </button>
                          <output aria-live="polite">{item.quantity}</output>
                          <button type="button" aria-label="Больше" onClick={() => step(1)}>
                            +
                          </button>
                        </span>
                      </td>
                      <td className="shelf-num">{formatMoney(item.lastPriceKop)}</td>
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
          <pre>{orderText(copied.items)}</pre>
        </section>
      ) : null}

      <p className="reorder__hint">
        Количество — расход на 21 день, округлено до банки. Срок поставки — {formatCount(reorder.settings.leadDays, ['день', 'дня', 'дней'])} (настройка полки).
      </p>
    </div>
  );
};
