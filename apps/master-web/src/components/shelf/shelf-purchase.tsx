import { useState, type ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import { flavorProfileColor, formatMetricValue, type PurchaseView, type ShelfTobaccoRef, type ShelfTrialVerdict } from '@/contracts';
import {
  PURCHASE_SECTIONS,
  baseRowView,
  budgetStrip,
  fastRowView,
  fewDataText,
  idleNotes,
  idleRowView,
  profileBars,
  trialRowView,
  trialVerdictText,
  type PurchaseSection,
} from '@/lib/purchase';
import { Segments } from './shelf-reorder';
import { ShelfToggle } from './shelf-toggle';
import { TrialMark } from './shelf-trial-mark';

type ShelfPurchaseProps = {
  purchase: PurchaseView | null;
  error: string;
  onSettings: () => void;
  onKeep: (tobacco: ShelfTobaccoRef, keep: boolean) => Promise<void>;
  onVerdict: (tobacco: ShelfTobaccoRef, verdict: ShelfTrialVerdict | null) => Promise<void>;
  onIdeas: () => void;
};

const Name = ({ tobacco }: { tobacco: ShelfTobaccoRef }) => (
  <span className="shelf-name">
    <b>{tobacco.name}</b>
    <span>{tobacco.manufacturer}</span>
  </span>
);

// Подпись под заголовком раздела — только критерий отбора, его из заголовка не видно.
const Section = ({ title, text, extra, children }: { title: string; text: string; extra?: ReactNode; children: ReactNode }) => (
  <section className="purchase-section" aria-label={title}>
    <div className="purchase-section__head">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {extra}
    </div>
    {children}
  </section>
);

type Column = { label: string; width?: number; align?: 'center' };

const Table = ({ columns, children }: { columns: Column[]; children: ReactNode }) => (
  <div className="purchase-table-shell">
    <table className="purchase-table">
      <colgroup>
        {columns.map((column, index) => (
          <col key={index} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index} scope="col" data-align={column.align}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const FewData = ({ since }: { since: string | null }) => (
  <div className="purchase-few">
    <h2>Данных пока мало</h2>
    <p>{fewDataText(since)}</p>
  </div>
);

// Полоса бюджета (#326): одна строка, а не ряд плиток — KPI-ряд только на Дашборде (#364).
// Без бюджета — стоимость базы и «Указать бюджет», с бюджетом — «Настройки».
const BudgetStrip = ({ purchase, onSettings }: { purchase: PurchaseView; onSettings: () => void }) => {
  const strip = budgetStrip(purchase);
  return (
    <div className="purchase-budget-wrap">
      <div className="reorder-interval" role="note" aria-label="Бюджет на табак">
        <Wallet size={15} aria-hidden />
        <span className="reorder-interval__text">
          <Segments segments={strip.segments} />
        </span>
        {strip.kind === 'none' ? (
          <button type="button" className="btn" data-size="sm" data-variant="primary" onClick={onSettings}>
            Указать бюджет
          </button>
        ) : (
          <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onSettings}>
            Настройки
          </button>
        )}
      </div>
      {strip.unknown ? (
        <p className="purchase-hint">
          <span className="purchase-warn">{strip.unknown.warn}</span>
          {strip.unknown.text}
        </p>
      ) : null}
    </div>
  );
};

type BaseFilter = 'all' | 'notBase' | 'idleBase';

const BaseSection = ({ purchase, onKeep, busy }: { purchase: PurchaseView; onKeep: ShelfPurchaseProps['onKeep']; busy: string }) => {
  const [filter, setFilter] = useState<BaseFilter>('all');
  const { base, profiles } = purchase;
  // Выбор в приложении — часть заказов; мало событий — колонку не показываем.
  const showApp = profiles.appEnough;
  const rows = base.rows.filter((row) => filter === 'all' || row.flag === filter);
  const chip = (key: BaseFilter, label: string, count?: number) => (
    <button
      type="button"
      className={`filter-chip${filter === key ? ' filter-chip--active' : ''}`}
      aria-pressed={filter === key}
      onClick={() => setFilter(key)}
    >
      <span>{label}</span>
      <span className="filter-chip__count" hidden={count === undefined}>
        {formatMetricValue(count ?? 0)}
      </span>
    </button>
  );
  return (
    <Section
      title="Что держать в базе"
      text={
        showApp
          ? 'Расход точки за 30 дней, включая заказы в зале. Выбор гостей в приложении показан для справки и в подсказки не входит.'
          : 'Расход точки за 30 дней, включая заказы в зале.'
      }
    >
      <div className="purchase-sub" role="group" aria-label="Подсказки базы">
        {chip('all', 'Все')}
        {chip('notBase', 'Часто берут, но не в базе', base.counts.notBase)}
        {chip('idleBase', 'В базе, но почти не берут', base.counts.idleBase)}
      </div>
      <Table
        columns={[
          { label: 'Табак' },
          { label: 'Расход в месяц', width: 150 },
          { label: 'Доля расхода', width: 120 },
          { label: 'В месяц', width: 110 },
          ...(showApp ? [{ label: 'В приложении', width: 130 }] : []),
          { label: '', width: 210 },
          { label: 'Держим', width: 80, align: 'center' as const },
        ]}
      >
        {rows.map((row) => {
          const line = baseRowView(row);
          return (
            <tr key={row.tobacco.id} data-tobacco-id={row.tobacco.id}>
              <td>
                <Name tobacco={row.tobacco} />
              </td>
              <td className={line.few ? 'shelf-faint' : 'shelf-num'}>
                {line.month}
                {line.brand ? <span className="shelf-faint"> по бренду</span> : null}
              </td>
              <td className={line.share === '—' ? 'shelf-faint' : 'shelf-num'}>{line.share}</td>
              <td className={line.rub === '—' ? 'shelf-faint' : 'shelf-num'}>{line.rub}</td>
              {showApp ? <td className="purchase-app shelf-num">{line.app}</td> : null}
              <td>
                {line.flag ? (
                  <span className="purchase-flag" data-tone={line.flag.tone}>
                    {line.flag.text}
                  </span>
                ) : null}
              </td>
              <td data-align="center">
                <ShelfToggle
                  checked={row.keepStocked}
                  label={`Держим постоянно: ${row.tobacco.manufacturer} ${row.tobacco.name}`}
                  disabled={busy === row.tobacco.id}
                  onChange={(next) => void onKeep(row.tobacco, next)}
                />
              </td>
            </tr>
          );
        })}
      </Table>
      {!rows.length ? <p className="empty">Таких табаков нет.</p> : null}
    </Section>
  );
};

const FastSection = ({ purchase }: { purchase: PurchaseView }) => (
  <Section
    title="Закончились быстро"
    text="Приходы за 60 дней, которые ушли за 3 дня и быстрее. Без табака: сколько дней полка стояла пустой до следующего прихода."
  >
    {purchase.fast.rows.length ? (
      <Table
        columns={[
          { label: 'Табак' },
          { label: 'Приход', width: 150 },
          { label: 'Ушёл за', width: 130 },
          { label: 'Без табака', width: 120 },
          { label: 'Дальше', width: 170 },
          { label: 'Сейчас', width: 150 },
        ]}
      >
        {purchase.fast.rows.map((row) => {
          const line = fastRowView(row);
          return (
            <tr key={row.tobacco.id} data-tobacco-id={row.tobacco.id}>
              <td>
                <Name tobacco={row.tobacco} />
              </td>
              <td className="shelf-num">
                {line.receivedAt}, {line.receipt}
              </td>
              <td>
                <span className="purchase-stack">
                  <span className="shelf-num purchase-danger">{line.gone}</span>
                  {line.times ? <small>{line.times}</small> : null}
                </span>
              </td>
              <td className="shelf-num">
                {line.empty}
                {line.ongoing ? <span className="shelf-faint">, идёт</span> : null}
              </td>
              <td className={line.next ? 'shelf-num' : 'shelf-faint'}>{line.next ?? 'прихода ещё не было'}</td>
              <td>
                <span className="shelf-num" data-tone={line.now.tone}>
                  {line.now.text}
                </span>
              </td>
            </tr>
          );
        })}
      </Table>
    ) : (
      <p className="empty">За 60 дней ни один приход не ушёл за 3 дня.</p>
    )}
  </Section>
);

const TrialsSection = ({ purchase, onVerdict }: { purchase: PurchaseView; onVerdict: ShelfPurchaseProps['onVerdict'] }) => (
  <Section
    title="Как зашли пробы"
    text="Табаки, которые впервые пришли за 60 дней."
  >
    {purchase.trials.rows.length ? (
      <>
        <Table
          columns={[
            { label: 'Табак' },
            { label: 'Пришло', width: 130 },
            { label: 'Расход', width: 150 },
            { label: 'В приложении', width: 140 },
            { label: 'Гостям в зале', width: 180 },
            { label: 'Итог', width: 300 },
          ]}
        >
          {purchase.trials.rows.map((row) => {
            const line = trialRowView(row);
            const verdict = trialVerdictText(row.speed, row.trialVerdict);
            return (
              <tr key={row.tobacco.id} data-tobacco-id={row.tobacco.id}>
                <td>
                  <Name tobacco={row.tobacco} />
                </td>
                <td className="shelf-num">
                  {line.receivedAt}, {line.receipt}
                </td>
                <td>
                  {line.speed ? (
                    <span className="purchase-stack">
                      <span className="shelf-num" data-tone={line.speed.fast ? 'success' : 'muted'}>
                        {line.speed.text}
                      </span>
                      {line.gone ? <small>{line.gone}</small> : null}
                    </span>
                  ) : (
                    <span className="shelf-faint">мало данных</span>
                  )}
                </td>
                <td>
                  {line.app.kind === 'noMixes' ? (
                    <span className="purchase-flag" data-tone="warning">
                      {line.app.text}
                    </span>
                  ) : (
                    <span className="purchase-app shelf-num">{line.app.text}</span>
                  )}
                </td>
                <td>
                  <TrialMark
                    value={row.trialVerdict}
                    label={`Как зашло гостям: ${row.tobacco.manufacturer} ${row.tobacco.name}`}
                    onChange={(next) => onVerdict(row.tobacco, next)}
                  />
                </td>
                <td className="purchase-verdict" data-tone={verdict.tone}>
                  {verdict.text}
                </td>
              </tr>
            );
          })}
        </Table>
        {purchase.trials.rows.some((row) => row.mixCount === 0) ? <p className="purchase-hint">Пробу без миксов гости приложения не видят.</p> : null}
      </>
    ) : (
      <p className="empty">За 60 дней новых табаков на полке не было.</p>
    )}
  </Section>
);

const IdleSection = ({ purchase, onKeep, busy }: { purchase: PurchaseView; onKeep: ShelfPurchaseProps['onKeep']; busy: string }) => {
  const notes = idleNotes(purchase.idle);
  return (
    <Section
      title="Что лежит"
      text="Пришли больше 21 дня назад и расходуются медленнее 2 г в день. Табак на стопе для гостей сюда не попадает."
      extra={
        <span className="purchase-frozen">
          Заморожено <b className="shelf-num">{notes.total}</b>
        </span>
      }
    >
      {purchase.idle.rows.length ? (
        <Table
          columns={[
            { label: 'Табак' },
            { label: 'Остаток по учёту', width: 160 },
            { label: 'Расход за 21 день', width: 160 },
            { label: 'Денег в нём', width: 130 },
            { label: 'Приход', width: 140 },
            { label: 'Держим', width: 80, align: 'center' },
          ]}
        >
          {purchase.idle.rows.map((row) => {
            const line = idleRowView(row);
            return (
              <tr key={row.tobacco.id} data-tobacco-id={row.tobacco.id}>
                <td>
                  <Name tobacco={row.tobacco} />
                </td>
                <td className="shelf-num">{line.left}</td>
                <td className="shelf-num">{line.rate}</td>
                <td className={line.rub === '—' ? 'shelf-faint' : 'shelf-num'}>{line.rub}</td>
                <td className="shelf-num">
                  {line.receivedAt}
                  <span className="shelf-faint">, {line.days}</span>
                </td>
                <td data-align="center">
                  <ShelfToggle
                    checked={row.keepStocked}
                    label={`Держим постоянно: ${row.tobacco.manufacturer} ${row.tobacco.name}`}
                    disabled={busy === row.tobacco.id}
                    onChange={(next) => void onKeep(row.tobacco, next)}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <p className="empty">Ничего не лежит.</p>
      )}
      {notes.unmarked ? <p className="purchase-hint">{notes.unmarked}</p> : null}
      {notes.unknownPrice ? <p className="purchase-hint">{notes.unknownPrice}</p> : null}
      <p className="purchase-hint">Табак, который не держим постоянно, не попадёт в заказ, когда закончится. Гости видят его, пока он есть на полке.</p>
    </Section>
  );
};

const ProfilesSection = ({ purchase, onIdeas }: { purchase: PurchaseView; onIdeas: () => void }) => {
  const showApp = purchase.profiles.appEnough;
  return (
    <Section
      title="Вкусы: расход против полки"
      text={
        showApp
          ? 'Доля направления в расходе точки за 30 дней и доля табаков этого направления на полке. Выбор в приложении показан для справки.'
          : 'Доля направления в расходе точки за 30 дней и доля табаков этого направления на полке.'
      }
    >
      <div className="purchase-profiles">
        <div className="purchase-prof purchase-prof--head">
          <span>Направление</span>
          <span>Доля</span>
          <span />
        </div>
        {profileBars(purchase.profiles.rows).map((row) => (
          <div className="purchase-prof" key={row.key} data-profile={row.key}>
            <span className="purchase-prof__name">
              <span className="tag__dot" style={{ background: flavorProfileColor(row.key) }} aria-hidden="true" />
              {row.label}
            </span>
            <span className="purchase-bars">
              <span className="purchase-bar">
                <span>расход</span>
                <i style={{ width: `${row.spend.width * 100}%`, background: flavorProfileColor(row.key) }} />
                <b>{row.spend.text}</b>
              </span>
              <span className="purchase-bar">
                <span>полка</span>
                <i data-kind="shelf" style={{ width: `${row.shelf.width * 100}%` }} />
                <b>{row.shelf.text}</b>
              </span>
              {showApp ? (
                <span className="purchase-bar purchase-bar--app">
                  <span>приложение</span>
                  <i data-kind="app" style={{ width: `${row.app.width * 100}%` }} />
                  <b>{row.app.text}</b>
                </span>
              ) : null}
            </span>
            <span className="purchase-prof__flag">
              {row.flag ? (
                <span className="purchase-flag" data-tone={row.flag.tone}>
                  {row.flag.text}
                </span>
              ) : null}
              {row.ideas ? (
                <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onIdeas}>
                  {row.ideas}
                </button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// «Закупка» — третий вид «Полки» (#327–#331, #shot=purchase-*, edge-no-budget, edge-few):
// шаги закупки мастера по расходу точки. Сколько заказать, решает мастер.
export const ShelfPurchase = ({ purchase, error, onSettings, onKeep, onVerdict, onIdeas }: ShelfPurchaseProps) => {
  const [section, setSection] = useState<PurchaseSection>('base');
  const [busy, setBusy] = useState('');

  if (!purchase) {
    return error ? <p className="error-text">{error}</p> : <p className="meta-line">Считаем закупку…</p>;
  }

  const keep = async (tobacco: ShelfTobaccoRef, next: boolean) => {
    setBusy(tobacco.id);
    try {
      await onKeep(tobacco, next);
    } finally {
      setBusy('');
    }
  };

  let body: ReactNode;
  if (!purchase[section].enough) body = <FewData since={purchase.since} />;
  else if (section === 'base') body = <BaseSection purchase={purchase} onKeep={keep} busy={busy} />;
  else if (section === 'fast') body = <FastSection purchase={purchase} />;
  else if (section === 'trials') body = <TrialsSection purchase={purchase} onVerdict={onVerdict} />;
  else if (section === 'idle') body = <IdleSection purchase={purchase} onKeep={keep} busy={busy} />;
  else body = <ProfilesSection purchase={purchase} onIdeas={onIdeas} />;

  return (
    <div className="purchase">
      {error ? <p className="error-text">{error}</p> : null}
      <BudgetStrip purchase={purchase} onSettings={onSettings} />
      <div className="shelf-toolbar purchase-toolbar">
        <div className="shelf-toolbar__chips" role="group" aria-label="Разделы закупки">
          {/* Разделы — навигация, а не фильтры-статусы: без счётчиков (#364). */}
          {PURCHASE_SECTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`filter-chip${section === key ? ' filter-chip--active' : ''}`}
              aria-pressed={section === key}
              onClick={() => setSection(key)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {body}
    </div>
  );
};
