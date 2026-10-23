import type { ShelfDashboard } from '@/contracts';
import { untilLabel } from '@/lib/reorder';
import { formatNumber } from '@/lib/shelf';
import { bowlCostTile, forecastCaption, moneyCard, spendRows, stockValueTile, weekBars } from '@/lib/shelf-dashboard';
import { Segments } from '@/components/shelf/shelf-reorder';

type ShelfDashboardBlockProps = {
  data: ShelfDashboard | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  bowlGrams: number;
  leadDays: number;
  onOpenTobacco: (tobaccoId: string) => void;
  // «Указать» бюджет — открывает настройки полки.
  onSetBudget: () => void;
};

const BAR_MAX_PX = 110;

// Блок «Полка» дашборда (#213, #326, #shot=dashboard, edge-dash-no-budget): прогноз
// на сегодня, что заканчивается, деньги против бюджета и расход по неделям.
// Карточка — заголовок и содержимое, без надписи над заголовком (#365).
export function ShelfDashboardBlock({ data, status, error, bowlGrams, leadDays, onOpenTobacco, onSetBudget }: ShelfDashboardBlockProps) {
  if (!data) {
    if (status === 'error') return <div className="dashboard-page__error" role="status">{error}</div>;
    return <p className="meta-line">Считаем прогноз полки…</p>;
  }

  const spend = spendRows(data.spend);
  const bowl = bowlCostTile(data.bowlCostKop);
  const stock = stockValueTile(data.stockValueKop);
  const bars = weekBars(data.weekly);
  const money = moneyCard(data);

  return (
    <>
      {error ? <div className="dashboard-page__error" role="status">{error}</div> : null}
      <div className="shelf-dash__columns">
        <article className="dashboard-page__card" aria-labelledby="shelf-dash-forecast">
          <h2 className="dashboard-page__heading" id="shelf-dash-forecast">Прогноз на сегодня</h2>
          <div className="shelf-dash__forecast">
            <b>{formatNumber(data.today.grams)} г</b>
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
                        {until.days ? <span className="shelf-faint">, {until.days}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">Ничего не заканчивается.</p>
          )}
        </article>

        <article className="dashboard-page__card" aria-labelledby="shelf-dash-money">
          <h2 className="dashboard-page__heading" id="shelf-dash-money">{money.title}</h2>
          {money.kind === 'none' && spend.length ? <b className="shelf-dash__total">{formatNumber(data.spend.totalKop / 100)} ₽</b> : null}
          {money.kind === 'budget' ? (
            <div className="shelf-dash__budget">
              <div
                className="shelf-dash__meter"
                role="img"
                aria-label={`${money.spent} из бюджета, ${money.base}`}
              >
                <i style={{ width: `${money.spentShare * 100}%` }} />
                <em style={{ left: `calc(${money.baseShare * 100}% - 1px)` }} />
              </div>
              <div className="shelf-dash__legend">
                <span>
                  <i className="shelf-dash__swatch" aria-hidden="true" />
                  {money.spent}
                </span>
                <span>
                  <i className="shelf-dash__swatch shelf-dash__swatch--base" aria-hidden="true" />
                  {money.base}
                </span>
                <span>
                  {money.left.label} <b data-tone={money.left.tone}>{money.left.value}</b>
                </span>
              </div>
            </div>
          ) : null}
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
          {money.kind === 'none' ? (
            <div className="shelf-dash__invite">
              <span>
                <Segments segments={money.invite} />
              </span>
              <button type="button" className="btn" data-size="sm" onClick={onSetBudget}>
                Указать
              </button>
            </div>
          ) : null}
          <div className="shelf-dash__kv">
            <div>
              <span>Себестоимость чаши</span>
              <b>{bowl.value}</b>
              <small>{bowl.hint}</small>
            </div>
            <div>
              <span>Табак на полке</span>
              <b>{stock.value}</b>
              <small>{stock.hint}</small>
            </div>
          </div>
          {money.kind === 'budget' && money.unknown ? <p className="shelf-dash__note">{money.unknown}</p> : null}
        </article>
      </div>

      <article className="dashboard-page__card" aria-labelledby="shelf-dash-weeks">
        <h2 className="dashboard-page__heading" id="shelf-dash-weeks">Расход по неделям, г</h2>
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
          <p className="empty">Расхода пока нет. Он появится после первой отметки остатка.</p>
        )}
      </article>
    </>
  );
}
