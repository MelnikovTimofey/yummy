import type { ShelfDashboard } from '@/contracts';
import { untilLabel } from '@/lib/reorder';
import { formatNumber } from '@/lib/shelf';
import { bowlCostTile, forecastCaption, spendRows, spendTitle, stockValueTile, weekBars } from '@/lib/shelf-dashboard';

type ShelfDashboardBlockProps = {
  data: ShelfDashboard | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  bowlGrams: number;
  leadDays: number;
  onOpenTobacco: (tobaccoId: string) => void;
};

const BAR_MAX_PX = 110;

// Блок «Полка» дашборда (#213, #shot=dashboard): прогноз на сегодня, что
// заканчивается, траты месяца и расход по неделям.
export function ShelfDashboardBlock({ data, status, error, bowlGrams, leadDays, onOpenTobacco }: ShelfDashboardBlockProps) {
  if (!data) {
    if (status === 'error') return <div className="dashboard-page__error" role="status">{error}</div>;
    return <p className="meta-line">Считаем прогноз полки…</p>;
  }

  const spend = spendRows(data.spend);
  const bowl = bowlCostTile(data.bowlCostKop, bowlGrams);
  const stock = stockValueTile(data.stockValueKop);
  const bars = weekBars(data.weekly);

  return (
    <>
      {error ? <div className="dashboard-page__error" role="status">{error}</div> : null}
      <div className="shelf-dash__columns">
        <article className="dashboard-page__card" aria-label="Прогноз расхода">
          <p className="shelf-dash__eyebrow">Полка сегодня</p>
          <h2 className="dashboard-page__heading">Прогноз расхода</h2>
          <div className="shelf-dash__forecast">
            <b>≈ {formatNumber(data.today.grams)} г</b>
            <span>{forecastCaption(data.today, bowlGrams)}</span>
          </div>
          <h3 className="shelf-dash__subhead">Заканчивается</h3>
          {data.ending.length ? (
            <ul className="shelf-dash__ending">
              {data.ending.map((item) => {
                const until = untilLabel(item, leadDays);
                return (
                  <li key={item.tobacco.id}>
                    <button type="button" className="shelf-dash__ending-row" onClick={() => onOpenTobacco(item.tobacco.id)}>
                      <span>
                        {item.tobacco.manufacturer} {item.tobacco.name}
                      </span>
                      <span className="shelf-num" data-tone={until.tone}>
                        {until.text}
                        {until.days ? <span className="shelf-faint"> · {until.days}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">Ничего не заканчивается. Полка в порядке.</p>
          )}
        </article>

        <article className="dashboard-page__card" aria-label="Деньги">
          <p className="shelf-dash__eyebrow">Деньги</p>
          <h2 className="dashboard-page__heading">{spendTitle(data.spend.month)}</h2>
          {spend.length ? (
            <div className="shelf-dash__spend">
              {spend.map((row) => (
                <div className="shelf-dash__spend-row" key={row.key}>
                  <span>{row.name}</span>
                  <i style={{ width: `${Math.max(2, row.share * 100)}%` }} aria-hidden="true" />
                  <span className="shelf-num">{row.sum}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">В этом месяце принятых поставок с ценами нет.</p>
          )}
          <div className="shelf-dash__kv">
            <div>
              <span>Себестоимость чаши</span>
              <b>{bowl.value}</b>
              <small>{bowl.hint}</small>
            </div>
            <div>
              <span>Табака на полке</span>
              <b>{stock.value}</b>
              <small>{stock.hint}</small>
            </div>
          </div>
        </article>
      </div>

      <article className="dashboard-page__card" aria-label="Расход по неделям">
        <p className="shelf-dash__eyebrow">Расход</p>
        <h2 className="dashboard-page__heading">По неделям, г</h2>
        {bars ? (
          <>
            <div className="shelf-dash__weeks">
              {bars.map((bar) => (
                <div className={`shelf-dash__bar${bar.partial ? ' shelf-dash__bar--partial' : ''}`} key={bar.key}>
                  <span>{bar.value}</span>
                  <i style={{ height: `${Math.max(2, bar.height * BAR_MAX_PX)}px` }} aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="shelf-dash__bar-labels">
              {bars.map((bar) => (
                <span key={bar.key}>{bar.label}</span>
              ))}
            </div>
          </>
        ) : (
          <p className="empty">Расхода пока нет: он появится после первой отметки остатка или «Закончился».</p>
        )}
      </article>
    </>
  );
}
