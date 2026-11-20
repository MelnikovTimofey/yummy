import { useState } from 'react';
import { Check, CircleCheck, CircleMinus, Copy, Ellipsis } from 'lucide-react';
import type { ShelfOrder, ShelfOrderGroup, ShelfOrderPlanLine } from '@/contracts';
import { groupMeta, groupTitle, isStalePlan, notKeptText, orderCopyText, orderMixes, planCopyText, planMixes } from '@/lib/order';
import { formatShelfDate } from '@/lib/shelf';
import { RowsSkeleton } from '@/components/ui/loading';

// «К заказу» (#518, #shot=order, order-copied, mobile-order, edge-order-empty):
// закончились и держим постоянно, группами по поставщику последнего счёта.
// Ниже групп — план (#563, #shot=order-plan, order-only-plan, mobile-order-plan).

type ShelfOrderViewProps = {
  order: ShelfOrder | null;
  error: string;
  phone: boolean;
  onShowNotKept: () => void;
  // Меню строки плана — то же, что на «Полке»: «Убрать из плана» с отменой (#562).
  menuId: string | null;
  pendingId: string;
  onOpenMenu: (tobaccoId: string, anchor: HTMLElement) => void;
};

const groupKey = (group: ShelfOrderGroup) => group.supplier?.id ?? '';
// У групп ключ — id поставщика, у плана своего поставщика нет.
const PLAN_KEY = 'plan';

const planName = (line: ShelfOrderPlanLine) => `${line.tobacco.manufacturer} ${line.tobacco.name}`;

export const ShelfOrderView = ({ order, error, phone, onShowNotKept, menuId, pendingId, onOpenMenu }: ShelfOrderViewProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!order) return error ? <p className="error-text">{error}</p> : <RowsSkeleton label="Загружаем заявку" rows={6} />;

  // Буфер обмена может быть недоступен — тогда текст заявки остаётся на экране, его выделяют руками.
  const copy = (key: string, text: string) => {
    setCopied(key);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const planCopied = copied === PLAN_KEY;
  const plan = order.plan.length ? (
    <section className="shelf-order" aria-label="В плане">
      <header className="shelf-order__head">
        <h2>В плане</h2>
        <button type="button" className="btn" data-size="sm" onClick={() => copy(PLAN_KEY, planCopyText(order.plan))}>
          {planCopied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {planCopied ? 'Скопировано' : phone ? 'Список' : 'Скопировать список'}
        </button>
      </header>
      {phone ? (
        <ul className="shelf-order__cards">
          {order.plan.map((line) => (
            <li key={line.tobacco.id} className="m-shelf-card" data-tobacco-id={line.tobacco.id}>
              <span className="shelf-name">
                <b>{line.tobacco.name}</b>
                <span>{line.tobacco.manufacturer}</span>
              </span>
              <span className="shelf-order__planned shelf-num" data-stale={isStalePlan(line.plannedAt) || undefined}>
                с {formatShelfDate(line.plannedAt)}
              </span>
              <span className="m-shelf-card__meta shelf-order__mixes">{planMixes(line.mixes).text}</span>
            </li>
          ))}
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
              <th scope="col">В плане с</th>
              <th scope="col">Миксы</th>
              <th scope="col">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {order.plan.map((line) => {
              const mixes = planMixes(line.mixes);
              const open = menuId === line.tobacco.id;
              return (
                <tr key={line.tobacco.id} data-tobacco-id={line.tobacco.id}>
                  <td>{planName(line)}</td>
                  <td className="shelf-order__planned shelf-num" data-stale={isStalePlan(line.plannedAt) || undefined}>
                    {formatShelfDate(line.plannedAt)}
                  </td>
                  <td data-tone={mixes.tone}>{mixes.text}</td>
                  <td className="shelf-order__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Ещё действия: ${planName(line)}`}
                      aria-expanded={open}
                      disabled={pendingId === line.tobacco.id}
                      onClick={(event) => onOpenMenu(line.tobacco.id, event.currentTarget)}
                    >
                      <Ellipsis size={15} aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {planCopied ? <pre className="shelf-order__copy">{planCopyText(order.plan)}</pre> : null}
    </section>
  ) : null;

  const notKept = order.notKept.length ? (
    <div className="shelf-order-notkept">
      <CircleMinus size={15} aria-hidden />
      <span>{notKeptText(order.notKept)}</span>
      <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onShowNotKept}>
        Показать на полке
      </button>
    </div>
  ) : null;

  if (!order.groups.length && plan) {
    return (
      <div className="shelf-order-page">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="shelf-order-notkept">
          <CircleCheck size={15} aria-hidden />
          <span>Закончившихся нет, всё, что держим, в наличии.</span>
        </div>
        {notKept}
        {plan}
      </div>
    );
  }

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
              <button type="button" className="btn" data-size="sm" onClick={() => copy(key, orderCopyText(group))}>
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
      {plan}
    </div>
  );
};
