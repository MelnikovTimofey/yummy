import { useState } from 'react';
import { CalendarClock, Copy } from 'lucide-react';
import type { ReorderGroup, ReorderView } from '@/contracts';
import { formatGramPrice, formatNumber } from '@/lib/shelf';
import {
  REORDER_COPY_HINT,
  REORDER_HINT,
  groupCaption,
  groupKey,
  groupOrderText,
  intervalNote,
  reorderItemName,
  reorderMonth,
  untilLabel,
  type TextSegment,
} from '@/lib/reorder';
import type { ShelfToastData } from './shelf-toast';

type ShelfReorderProps = {
  reorder: ReorderView | null;
  error: string;
  notify: (toast: Omit<ShelfToastData, 'id'>) => void;
  onSettings: () => void;
};

const supplierTitle = (group: ReorderGroup) => group.supplier?.name ?? 'Поставщик не выбран';

export const Segments = ({ segments }: { segments: TextSegment[] }) => (
  <>
    {segments.map((segment, index) => (segment.strong ? <b key={index}>{segment.text}</b> : <span key={index}>{segment.text}</span>))}
  </>
);

// «К заказу» (#213, #323, #325, #shot=reorder, reorder-copied, edge-interval): группы
// по последнему поставщику. Сколько заказать, решает мастер — в заявке только названия.
export const ShelfReorder = ({ reorder, error, notify, onSettings }: ShelfReorderProps) => {
  const [copiedKey, setCopiedKey] = useState('');

  if (!reorder) {
    return error ? <p className="error-text">{error}</p> : <p className="meta-line">Считаем, что пора заказать…</p>;
  }

  const note = intervalNote(reorder.interval, reorder.horizon, reorder.settings.leadDays);
  const copied = reorder.groups.find((group) => groupKey(group) === copiedKey);

  const onCopy = async (group: ReorderGroup) => {
    setCopiedKey(groupKey(group));
    try {
      await navigator.clipboard.writeText(groupOrderText(group, reorder.text));
      notify({ title: 'Скопировано', text: `заявка для «${supplierTitle(group)}». Вставьте её в чат с поставщиком.` });
    } catch {
      notify({ title: supplierTitle(group), text: 'Не удалось скопировать автоматически — выделите текст заявки ниже.', error: true });
    }
  };

  return (
    <div className="reorder">
      {error ? <p className="error-text">{error}</p> : null}

      <div className="reorder-interval" role="note">
        <CalendarClock size={15} aria-hidden />
        <span className="reorder-interval__text">
          <Segments segments={note.segments} />
        </span>
        {note.known ? (
          <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onSettings}>
            Настройки
          </button>
        ) : null}
      </div>

      {!reorder.groups.length ? <p className="empty reorder__empty">Заказывать нечего. Полка в порядке.</p> : null}

      {reorder.groups.map((group) => {
        const caption = groupCaption(group);
        const title = supplierTitle(group);
        return (
          <section key={groupKey(group)} className="reorder-group" aria-label={title} data-supplier-id={groupKey(group)}>
            <header className="reorder-group__head">
              <h2>{title}</h2>
              <span className="reorder-group__caption">{caption}</span>
              <button type="button" className="btn" data-size="sm" onClick={() => void onCopy(group)}>
                <Copy size={14} aria-hidden />
                Скопировать заявку
              </button>
            </header>
            <table className="reorder-table">
              <colgroup>
                <col />
                <col style={{ width: 182 }} />
                <col style={{ width: 142 }} />
                <col style={{ width: 102 }} />
                <col style={{ width: 116 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Табак</th>
                  <th scope="col">Закончится</th>
                  <th scope="col">Расход в месяц</th>
                  <th scope="col">Остаток</th>
                  <th scope="col">Цена грамма</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const until = untilLabel(item, reorder.settings.leadDays);
                  const month = reorderMonth(item);
                  return (
                    <tr key={item.tobacco.id} data-tobacco-id={item.tobacco.id}>
                      <td>
                        {reorderItemName(item)}
                        {item.byInterval ? <span className="reorder-why">закончится до следующей поставки</span> : null}
                      </td>
                      <td>
                        <span className="shelf-num" data-tone={until.tone}>
                          {until.text}
                          {until.days ? <span className="shelf-faint"> · {until.days}</span> : null}
                        </span>
                      </td>
                      <td className={month.few ? 'shelf-faint' : 'shelf-num'}>
                        {month.value}
                        {month.brand ? <span className="shelf-faint"> · бренд</span> : null}
                      </td>
                      <td className="shelf-num">
                        {item.leftGrams === null ? <span className="shelf-faint">—</span> : `${formatNumber(item.leftGrams)} г`}
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
        <section className="reorder-copied" aria-label="Текст заявки">
          <p className="reorder-copied__eyebrow">Скопировано · {supplierTitle(copied)}</p>
          <h2>Текст для чата с поставщиком</h2>
          <pre>{groupOrderText(copied, reorder.text)}</pre>
          <p className="reorder-copied__hint">{REORDER_COPY_HINT}</p>
        </section>
      ) : null}

      <p className="reorder__hint">{REORDER_HINT}</p>
    </div>
  );
};
