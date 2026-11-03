import { useState } from 'react';
import { Check, CircleMinus, Copy } from 'lucide-react';
import type { ShelfOrder, ShelfOrderGroup } from '@/contracts';
import { groupMeta, groupTitle, notKeptText, orderCopyText, orderMixes } from '@/lib/order';
import { formatShelfDate } from '@/lib/shelf';
import { RowsSkeleton } from '@/components/ui/loading';

// «К заказу» (#518, #shot=order, order-copied, mobile-order, edge-order-empty):
// закончились и держим постоянно, группами по поставщику последнего счёта.

type ShelfOrderViewProps = {
  order: ShelfOrder | null;
  error: string;
  phone: boolean;
  onShowNotKept: () => void;
};

const groupKey = (group: ShelfOrderGroup) => group.supplier?.id ?? '';

export const ShelfOrderView = ({ order, error, phone, onShowNotKept }: ShelfOrderViewProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!order) return error ? <p className="error-text">{error}</p> : <RowsSkeleton label="Загружаем заявку" rows={6} />;

  // Буфер обмена может быть недоступен — тогда текст заявки остаётся на экране, его выделяют руками.
  const copy = (group: ShelfOrderGroup) => {
    setCopied(groupKey(group));
    void navigator.clipboard?.writeText(orderCopyText(group)).catch(() => undefined);
  };

  const notKept = order.notKept.length ? (
    <div className="shelf-order-notkept">
      <CircleMinus size={15} aria-hidden />
      <span>{notKeptText(order.notKept)}</span>
      <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onShowNotKept}>
        Показать на полке
      </button>
    </div>
  ) : null;

  if (!order.groups.length) {
    return (
      <div className="shelf-order-page">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="shelf-order-empty">
          <h2>Всё в наличии</h2>
          <p>Здесь появятся табаки, которые закончились и которые вы держите постоянно.</p>
        </div>
        {notKept}
      </div>
    );
  }

  return (
    <div className="shelf-order-page">
      {error ? <p className="error-text">{error}</p> : null}
      {order.groups.map((group) => {
        const key = groupKey(group);
        const isCopied = copied === key;
        const meta = groupMeta(group);
        return (
          <section key={key} className="shelf-order" aria-label={groupTitle(group)}>
            <header className="shelf-order__head">
              <h2>{groupTitle(group)}</h2>
              {meta && !phone ? <span className="shelf-order__meta">{meta}</span> : null}
              <button type="button" className="btn" data-size="sm" onClick={() => copy(group)}>
                {isCopied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {isCopied ? 'Скопировано' : phone ? 'Заявка' : 'Скопировать заявку'}
              </button>
            </header>
            {phone ? (
              <ul className="shelf-order__cards">
                {group.lines.map((line) => {
                  const mixes = orderMixes(line.mixes);
                  return (
                    <li key={line.tobacco.id} className="m-shelf-card" data-tobacco-id={line.tobacco.id}>
                      <span className="shelf-name">
                        <b>{line.tobacco.name}</b>
                        <span>{line.tobacco.manufacturer}</span>
                      </span>
                      <span className="shelf-order__out shelf-num">{formatShelfDate(line.outAt)}</span>
                      {line.mixes.hidden ? <span className="m-shelf-card__meta shelf-order__mixes">{mixes.text}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <table className="shelf-order__table">
                <colgroup>
                  <col />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 230 }} />
                  <col style={{ width: 160 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Табак</th>
                    <th scope="col">Закончился</th>
                    <th scope="col">Миксы</th>
                    <th scope="col">Последний приход</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lines.map((line) => {
                    const mixes = orderMixes(line.mixes);
                    return (
                      <tr key={line.tobacco.id} data-tobacco-id={line.tobacco.id}>
                        <td>
                          {line.tobacco.manufacturer} {line.tobacco.name}
                        </td>
                        <td className="shelf-order__out shelf-num">{formatShelfDate(line.outAt)}</td>
                        <td data-tone={mixes.tone}>{mixes.text}</td>
                        <td className="shelf-num shelf-order__arrived">{line.lastArrival ? formatShelfDate(line.lastArrival.at) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {isCopied ? <pre className="shelf-order__copy">{orderCopyText(group)}</pre> : null}
          </section>
        );
      })}
      {notKept}
    </div>
  );
};
