/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterInput, MasterStatsRow, MasterPageHeader, FilterChip, MasterList, MasterSortPill, MasterCard, MasterTopBar, EmptyState } = window.DesignSystem_1aef33;
const PA = window.PA;
const GR = window.GR;
const PA_MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

const PA_TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'shelf', label: 'Полка' },
  { id: 'deliveries', label: 'Поставки' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'mixes', label: 'Миксы' },
  { id: 'rails', label: 'Рейлы' },
  { id: 'access', label: 'Доступ' },
];

const PA_PROFILE_LABEL = { berry: 'Ягодный', citrus: 'Цитрусовый', dessert: 'Десертный', fruity: 'Фруктовый', minty: 'Мятный', spicy: 'Пряный', floral_herbal: 'Травяной' };
const paProfileColor = (key) => `var(--profile-${key.replace('_', '-')})`;
const paNum = (v) => String(v).replace('.', ',');
const paMonth = (rate) => Math.round((rate * 30) / 10) * 10;

function Ic({ name, size = 15 }) {
  const node = window.lucide && window.lucide.icons[name];
  if (!node) return null;
  const children = Array.isArray(node[0]) ? node : node[2] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

const PaOverlayCtx = React.createContext(null);
function PaOverlay({ children }) {
  const node = React.useContext(PaOverlayCtx);
  return node ? ReactDOM.createPortal(children, node) : null;
}

function PaDesk({ tall, children }) {
  const [node, setNode] = React.useState(null);
  return (
    <div className={'desk' + (tall ? ' tall' : '')}>
      <PaOverlayCtx.Provider value={node}>
        <div className="desk-scroll">{children}</div>
      </PaOverlayCtx.Provider>
      <div ref={setNode} />
    </div>
  );
}

function PaShell({ tab, onTab, children }) {
  return (
    <main className="shell">
      <MasterTopBar markSrc={PA_MARK} items={PA_TABS} active={tab} onChange={onTab} userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">{children}</section>
    </main>
  );
}

// ── Полка: только то, что нужно для карточки; колонка расхода — в г/мес ──
function Level({ row, lg }) {
  if (row.left == null) return <span className="lvl"><span className="lvl-bar none" /><span className="lvl-copy"><b className="inv-faint">—</b><small>прихода не было</small></span></span>;
  const share = row.full ? row.left / row.full : 0;
  const tone = row.status === 'check' || (row.days != null && row.days <= 3) ? ' crit' : row.status === 'ending' ? ' low' : '';
  return (
    <span className={'lvl' + (lg ? ' lg' : '')}>
      <span className={'lvl-bar' + tone + (row.left === 0 ? ' none' : '')}><i style={{ width: Math.max(row.left ? 4 : 0, share * 100) + '%' }} /></span>
      <span className="lvl-copy">
        <b className={row.left === 0 ? 'inv-danger' : ''}>{row.left === 0 ? '0 г' : '≈ ' + row.left + ' г'}</b>
        <small>из {row.full} г после прихода</small>
      </span>
    </span>
  );
}

function MonthRate({ row }) {
  if (row.rateKind === 'none' || row.rate == null) return <span className="inv-faint">мало данных</span>;
  if (row.rateKind === 'brand') return <span className="inv-until"><span className="inv-num">≈ {paMonth(row.rate)} г/мес</span><small className="inv-faint">по бренду</small></span>;
  return <span className="inv-num">{paMonth(row.rate)} г/мес</span>;
}

function Until({ row }) {
  if (row.status === 'out') return <span className="inv-danger">{row.until}</span>;
  if (row.status === 'check') return <span className="inv-warn">проверьте остаток</span>;
  if (row.status === 'plan') return <span className="inv-faint">в плане</span>;
  if (row.status === 'stop') return <span className="inv-faint">стоп для гостей</span>;
  if (row.days == null) return <span className="inv-faint">—</span>;
  return <span className={'inv-num ' + (row.days <= 3 ? 'inv-danger' : row.days <= 7 ? 'inv-warn' : '')}>{row.until} <span className="inv-faint">· {row.days} дн</span></span>;
}

const PA_TRIAL_IDS = PA.trials.map((t) => t.id);
const PA_FRACS = [['¾', 0.75], ['½', 0.5], ['⅓', 1 / 3], ['¼', 0.25]];

// «Сколько осталось?» — без изменений с #306: доля от уровня после прихода или точные граммы.
function LeftPop({ row, pos, onMark }) {
  const [value, setValue] = React.useState('');
  return (
    <div className="inv-pop gr-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <span className="inv-pop-label">Сколько осталось · после прихода {row.arrived} было {row.full} г</span>
      <div className="gr-fracs">
        {PA_FRACS.map(([f, k]) => (
          <button key={f} className="gr-frac" onClick={() => onMark(row, f + ' — ' + Math.round(row.full * k) + ' г')}>{f}<small>{Math.round(row.full * k)} г</small></button>
        ))}
      </div>
      <div className="inv-sep" />
      <div className="gr-exact">
        <label>Точно, если взвесили</label>
        <span className={'gr-input' + (value ? ' on' : '')} onClick={() => setValue(value || '180')}><b>{value || <span className="inv-faint">—</span>}</b><span>г</span></span>
        <MasterButton size="sm" variant={value ? 'primary' : 'ghost'} disabled={!value} onClick={() => onMark(row, value + ' г')}>Сохранить</MasterButton>
      </div>
      <p className="gr-note">Сейчас по расчёту ≈ {row.left} г. Отмечать не обязательно — отметка уточняет расход и прогноз.</p>
    </div>
  );
}

function usePos(open, ref) {
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!open || !ref.current) { setPos(null); return; }
    const desk = ref.current.closest('.desk');
    const a = ref.current.getBoundingClientRect();
    const d = desk.getBoundingClientRect();
    setPos(a.bottom - d.top > d.height * 0.55 ? { bottom: d.bottom - a.top + 4, right: d.right - a.right } : { top: a.bottom - d.top + 4, right: d.right - a.right });
  }, [open]);
  return pos;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <PaOverlay>
      <div className="inv-toast" role="status">
        <Ic name="CircleCheck" />
        <p><b>{toast.title}</b> — {toast.text}</p>
        <span className="inv-toast-timer">10 с</span>
        <MasterButton size="sm">Отменить</MasterButton>
      </div>
    </PaOverlay>
  );
}

function Actions({ row, pop, setPop, onMark }) {
  const ref = React.useRef(null);
  const open = pop === row.id;
  const pos = usePos(open, ref);
  if (row.status === 'out' || row.status === 'plan') return <span className="inv-faint" style={{ fontSize: 12 }}>в «К заказу»</span>;
  return (
    <span className="cell-actions" ref={ref} onClick={(e) => e.stopPropagation()}>
      <MasterButton size="sm" variant={row.status === 'check' ? 'primary' : 'ghost'} onClick={() => setPop(open ? null : row.id)}>{row.status === 'check' ? 'Отметить остаток' : 'Осталось…'}</MasterButton>
      {row.status === 'check' ? null : <MasterButton size="sm">Закончился</MasterButton>}
      {open && pos ? <PaOverlay><LeftPop row={row} pos={pos} onMark={(r, t) => { setPop(null); onMark(r, t); }} /></PaOverlay> : null}
    </span>
  );
}

function ShelfTable({ onOpen, pop, setPop, onMark }) {
  return (
    <MasterList
      onRowClick={(row) => onOpen(row.id)}
      columns={[
        { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.3fr)', render: (r) => <span className="inv-name"><b>{r.name}{PA_TRIAL_IDS.includes(r.id) ? <MasterTag tone="neutral" style={{ marginLeft: 8 }}>проба</MasterTag> : null}</b><span>{r.brand}</span></span> },
        { key: 'left', label: 'ОСТАТОК', width: '190px', render: (r) => <Level row={r} /> },
        { key: 'rate', label: 'РАСХОД', width: '130px', render: (r) => <MonthRate row={r} /> },
        { key: 'until', label: 'ХВАТИТ ДО', width: '170px', render: (r) => <Until row={r} /> },
        { key: 'arrived', label: 'ПРИХОД', width: '118px', render: (r) => <span className="inv-name"><b style={{ fontWeight: 400, fontSize: 13 }}>{r.arrived}</b><span>{r.supplier}</span></span> },
        { key: 'actions', label: '', width: '200px', align: 'right', render: (r) => <Actions row={r} pop={pop} setPop={setPop} onMark={onMark} /> },
      ]}
      rows={GR.shelf}
    />
  );
}

// ── Карточка: расход в г/мес, у пробы — отметка «зашло / не зашло» ──
function TrialMark({ value, onChange, big }) {
  return (
    <span className="pa-seg" role="group" aria-label="Как зашло гостям">
      <button className="yes" aria-pressed={value === 'yes'} onClick={() => onChange(value === 'yes' ? null : 'yes')}>Зашло</button>
      <button className="no" aria-pressed={value === 'no'} onClick={() => onChange(value === 'no' ? null : 'no')}>Не зашло</button>
    </span>
  );
}

function Drawer({ id, onClose, onMark }) {
  const row = GR.shelf.find((r) => r.id === id);
  const trial = PA.trials.find((t) => t.id === id);
  const [mark, setMark] = React.useState(trial ? trial.mark : null);
  const [left, setLeft] = React.useState(false);
  if (!row) return null;
  const rasp = row.id === 'bb-rasp';
  return (
    <PaOverlay>
      <div className="inv-scrim" onClick={onClose} />
      <aside className="inv-drawer" aria-label={'Карточка: ' + row.name}>
        <div className="inv-drawer-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="inv-eyebrow">{row.brand} · на полке</p>
            <MasterIconButton label="Закрыть" onClick={onClose}><Ic name="X" /></MasterIconButton>
          </div>
          <h1 className="inv-h1">{row.name}</h1>
          <div className="inv-links">
            {row.profiles.map((p) => <MasterTag key={p} tone="neutral"><span className="inv-dot" style={{ background: paProfileColor(p) }} />{PA_PROFILE_LABEL[p]}</MasterTag>)}
          </div>
        </div>

        {trial ? (
          <div className="pa-trial">
            <div className="pa-trial-row">
              <span><b style={{ fontWeight: 500 }}>Проба</b> <span className="inv-muted">· пришёл впервые {trial.arrived}, {trial.plus} г</span></span>
            </div>
            <div className="pa-trial-row">
              <span className="inv-muted">Как зашёл гостям в зале?</span>
              <TrialMark value={mark} onChange={setMark} />
            </div>
            <span className="inv-faint" style={{ fontSize: 12 }}>Отзывы о заказах в зале есть только у мастера. Отметку можно поменять.</span>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          <Level row={row} lg />
          <div style={{ display: 'flex', gap: 8 }}>
            <MasterButton variant="primary">Закончился</MasterButton>
            <MasterButton onClick={() => setLeft(!left)}>Сколько осталось…</MasterButton>
          </div>
          {left ? (
            <div className="gr-fracs" style={{ padding: 0 }}>
              {PA_FRACS.map(([f, k]) => (
                <button key={f} className="gr-frac" onClick={() => { setLeft(false); onMark(row, f + ' — ' + Math.round(row.full * k) + ' г'); }}>{f}<small>{Math.round(row.full * k)} г</small></button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="inv-kv">
          <div><span>Хватит до</span><b>{row.until}</b><small>{row.days != null ? row.days + ' дней' : '—'}</small></div>
          <div><span>Остаток</span><b>≈ {row.left} г</b><small>из {row.full} г после прихода {row.arrived}</small></div>
          <div><span>Расход</span><b>{row.rate ? (row.rateKind === 'brand' ? '≈ ' : '') + paMonth(row.rate) + ' г/мес' : <span className="inv-faint">мало данных</span>}</b><small>{row.rate ? '≈ ' + paNum(row.rate) + ' г/день' + (row.rateKind === 'brand' ? ' · по бренду' : rasp ? ' · по 3 отметкам за 60 дней' : '') : 'появится после первой отметки'}</small></div>
          <div><span>Цена грамма</span><b>7,75 ₽</b><small>≈ 140 ₽ на чашу 18 г</small></div>
        </div>

        <div style={{ display: 'grid', gap: 2 }}>
          <h3 className="inv-h3">Настройки</h3>
          <div className="inv-setting"><span>Держим постоянно<small>закончится до следующей поставки — попадёт в «К заказу»</small></span><MasterToggle checked={!trial} label="Держим постоянно" /></div>
          <div className="inv-setting"><span>Стоп для гостей<small>табак есть, но гостю не предлагать</small></span><MasterToggle checked={false} label="Стоп для гостей" /></div>
        </div>
      </aside>
    </PaOverlay>
  );
}

// ── #323 + #325: «К заказу» — прогноз без количества ──
function IntervalNote({ unknown }) {
  if (unknown) return (
    <div className="pa-interval">
      <Ic name="CalendarClock" />
      <span className="grow">Интервал поставок пока неизвестен: принято <b>2 счёта</b> из 3 нужных. В списке — что закончится за срок поставки, <b>7 дней</b>.</span>
    </div>
  );
  const I = PA.interval;
  return (
    <div className="pa-interval">
      <Ic name="CalendarClock" />
      <span className="grow">Поставки примерно <b>раз в {I.days} дней</b> · по {I.invoices} счетам за 90 дней. В списке — что закончится до следующей поставки с запасом на срок поставки: <b>до {I.horizon}</b>.</span>
      <MasterButton size="sm" variant="ghost">Настройки</MasterButton>
    </div>
  );
}

function Reorder({ copied, unknown }) {
  const groups = unknown ? PA.reorder.map((g) => ({ ...g, items: g.items.filter((it) => !it.byInterval) })) : PA.reorder;
  return (
    <div className="page">
      <IntervalNote unknown={unknown} />
      {groups.map((g) => (
        <section className="inv-order" key={g.supplier}>
          <header className="inv-order-head">
            <h3>{g.supplier}</h3>
            <span className="inv-muted" style={{ flex: 1 }}>{g.lastInvoice}</span>
            <MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Скопировать заявку</MasterButton>
          </header>
          <div className="inv-order-row pa-order-row th"><span>Табак</span><span>Закончится</span><span>Расход в месяц</span><span>Остаток</span><span>Цена грамма</span></div>
          {g.items.map((it) => (
            <div className="inv-order-row pa-order-row" key={it.name}>
              <span>{it.name}{it.byInterval ? <span className="pa-why">закончится до следующей поставки</span> : null}</span>
              <span className={it.days != null && it.days <= 3 ? 'inv-danger' : it.check ? 'inv-warn' : it.plan ? 'inv-faint' : it.days != null && it.days <= 7 ? 'inv-warn' : ''}>{it.until}{it.days ? <span className="inv-faint"> · {it.days} дн</span> : null}</span>
              <span className="inv-num">{it.brand ? <>≈ {it.month} г <span className="inv-faint">· бренд</span></> : it.month + ' г'}</span>
              <span className="inv-num">{it.left == null ? <span className="inv-faint">—</span> : it.left + ' г'}</span>
              <span className="inv-num">{it.gram}</span>
            </div>
          ))}
        </section>
      ))}
      {copied ? (
        <MasterCard eyebrow="СКОПИРОВАНО · КАСПИЙ ОПТ" heading="Текст для чата с поставщиком">
          <pre className="inv-copy">{'Добрый день! Заказ:\nBlack Burn Cane Mint\nSebero Лимонная шипучка\nХулиган Panama\nBlack Burn Pear lemonade\nСпасибо!'}</pre>
          <p className="hint" style={{ marginTop: 8 }}>Объём впишите сами — перед отправкой в чате.</p>
        </MasterCard>
      ) : null}
      <p className="hint">Сколько заказать, решает мастер. Расход в месяц — средний за 60 дней; «бренд» — своих отметок мало, взята медиана бренда.</p>
    </div>
  );
}

// ── #326: бюджет ──
function BudgetStrip({ none }) {
  const B = PA.budget;
  if (none) return (
    <div className="pa-interval">
      <Ic name="Wallet" />
      <span className="grow">База в месяц стоит <b>{B.base}</b>. Укажите бюджет на табак — покажем, сколько остаётся на то, чего нет, и на пробы.</span>
      <MasterButton size="sm" variant="primary">Указать бюджет</MasterButton>
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="pa-budget">
        <div><span>Бюджет · {B.month}</span><b>{B.budget}</b><small>настройка полки</small></div>
        <div><span>База в месяц</span><b>{B.base}</b><small>{B.baseCount} табаков «держим постоянно»</small></div>
        <div><span>Остаётся на пробы</span><b style={{ color: 'var(--success)' }}>{B.left}</b><small>и на то, чего нет</small></div>
        <div><span>Потрачено в ноябре</span><b>{B.spent}</b><small>по принятым счетам · {Math.round(B.spentShare * 100)} % бюджета</small></div>
      </div>
      <p className="hint"><span className="inv-warn">У {B.unknown} табаков базы нет цены</span> — стартовый остаток заводился без счёта. Сумма базы станет точной после их первого прихода по счёту.</p>
    </div>
  );
}

// ── #327–#331: «Закупка» ──
const PA_SUBS = [['base', 'База'], ['fast', 'Закончились быстро'], ['trials', 'Пробы'], ['idle', 'Лежит'], ['profiles', 'Вкусы']];
const PA_SUB_COUNT = { base: 4, fast: 3, trials: 4, idle: 4, profiles: 2 };

function Section({ title, text, extra, children }) {
  return (
    <section className="pa-section">
      <div className="pa-section-head">
        <div><h2>{title}</h2><p>{text}</p></div>
        {extra}
      </div>
      {children}
    </section>
  );
}

const PaName = ({ r }) => <span className="inv-name"><b>{r.name}</b><span>{r.brand}</span></span>;
const PaApp = ({ n }) => <span className="pa-app">{n || '—'}</span>;

function BaseSection() {
  const [f, setF] = React.useState('all');
  const rows = PA.base.filter((r) => f === 'all' || r.flag === f);
  return (
    <Section
      title="Что держать в базе"
      text="По расходу точки за 30 дней — в нём все кальяны, включая заказы в зале. «В приложении» — выбор гостей в Арома Ателье, только часть заказов: в подсказки не входит."
    >
      <div className="pa-sub">
        <FilterChip active={f === 'all'} onClick={() => setF('all')}>Все</FilterChip>
        <FilterChip active={f === 'notBase'} count={2} onClick={() => setF('notBase')}>Часто берут, но не в базе</FilterChip>
        <FilterChip active={f === 'idleBase'} count={2} onClick={() => setF('idleBase')}>В базе, но почти не берут</FilterChip>
      </div>
      <MasterList
        columns={[
          { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.3fr)', render: (r) => <PaName r={r} /> },
          { key: 'month', label: 'РАСХОД В МЕСЯЦ', width: '140px', render: (r) => <span className="inv-num">{r.month} г</span> },
          { key: 'share', label: 'ДОЛЯ РАСХОДА', width: '120px', render: (r) => <span className="inv-num">{r.share}</span> },
          { key: 'rub', label: 'В МЕСЯЦ', width: '100px', render: (r) => <span className="inv-num">{r.rub}</span> },
          { key: 'app', label: 'В ПРИЛОЖЕНИИ', width: '120px', render: (r) => <PaApp n={r.app} /> },
          { key: 'flag', label: '', width: '200px', render: (r) => r.flag === 'notBase' ? <span className="pa-flag inv-warn"><Ic name="TrendingUp" size={13} />берут часто, не в базе</span> : r.flag === 'idleBase' ? <span className="pa-flag inv-faint"><Ic name="TrendingDown" size={13} />почти не берут</span> : null },
          { key: 'keep', label: 'ДЕРЖИМ', width: '70px', align: 'center', render: (r) => <MasterToggle checked={r.keep} onChange={() => {}} label="Держим постоянно" /> },
        ]}
        rows={rows}
      />
    </Section>
  );
}

function FastSection() {
  return (
    <Section title="Закончились быстро" text="Приход ушёл за 3 дня и быстрее — за 60 дней. «Без табака» — сколько дней полка стояла пустой до следующего прихода.">
      <MasterList
        columns={[
          { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.3fr)', render: (r) => <PaName r={r} /> },
          { key: 'plus', label: 'ПРИХОД', width: '130px', render: (r) => <span className="inv-num">+{r.plus} г <span className="inv-faint">· {r.arrived}</span></span> },
          { key: 'gone', label: 'УШЁЛ ЗА', width: '100px', render: (r) => <span className="inv-num inv-danger">{r.gone} дня</span> },
          { key: 'empty', label: 'БЕЗ ТАБАКА', width: '110px', render: (r) => <span className="inv-num">{r.empty} дн{r.nowOut ? <span className="inv-faint"> · идёт</span> : null}</span> },
          { key: 'next', label: 'ДАЛЬШЕ', width: '150px', render: (r) => r.next ? <span className="inv-num">{r.next}</span> : <span className="inv-faint">прихода ещё не было</span> },
          { key: 'now', label: 'СЕЙЧАС', width: '130px', render: (r) => <span className={r.nowOut ? 'inv-danger' : r.now === 'заканчивается' ? 'inv-warn' : ''}>{r.now}</span> },
        ]}
        rows={PA.fast}
      />
    </Section>
  );
}

function trialVerdict(t, mark) {
  if (t.speed == null) return <span className="inv-faint">мало данных: отметок остатка ещё не было</span>;
  const speed = t.speed > 1 ? 'расходится быстрее полки' : 'расходится медленнее полки';
  const m = mark === 'yes' ? ' · гостям зашло' : mark === 'no' ? ' · гостям не зашло' : ' · ждёт вашей отметки';
  return <span className={mark === 'no' || (t.speed < 1 && !mark) ? 'inv-muted' : ''}>{speed}{m}</span>;
}

function TrialsSection() {
  const [marks, setMarks] = React.useState(Object.fromEntries(PA.trials.map((t) => [t.id, t.mark])));
  return (
    <Section title="Как зашли пробы" text="Табаки, впервые пришедшие за 60 дней. Главное — скорость расхода и ваша отметка: отзывы о заказах в зале есть только у мастера.">
      <MasterList
        columns={[
          { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.1fr)', render: (r) => <PaName r={r} /> },
          { key: 'plus', label: 'ПРИШЛО', width: '110px', render: (r) => <span className="inv-num">{r.plus} г <span className="inv-faint">· {r.arrived}</span></span> },
          { key: 'speed', label: 'РАСХОД', width: '140px', render: (r) => r.speed == null ? <span className="inv-faint">мало данных</span> : <span className="pa-speed"><span className={'inv-num ' + (r.speed > 1 ? 'inv-ok' : 'inv-muted')}>×{paNum(r.speed)} к полке</span>{r.speedText ? <small>{r.speedText}</small> : null}</span> },
          { key: 'app', label: 'В ПРИЛОЖЕНИИ', width: '130px', render: (r) => r.mixes ? <span className="pa-app">{r.app} · ★ {r.rating || '—'}</span> : <span className="pa-flag inv-warn">нет в миксах</span> },
          { key: 'mark', label: 'ГОСТЯМ В ЗАЛЕ', width: '170px', render: (r) => <TrialMark value={marks[r.id]} onChange={(v) => setMarks({ ...marks, [r.id]: v })} /> },
          { key: 'v', label: 'ИТОГ', width: 'minmax(0,1fr)', wrap: true, render: (r) => <span className="pa-verdict">{trialVerdict(r, marks[r.id])}</span> },
        ]}
        rows={PA.trials}
      />
      <p className="hint">«Нет в миксах» — гости приложения пробу не увидят: добавьте её в микс. Рейтинг htreviews — в карточке каталога.</p>
    </Section>
  );
}

function IdleSection() {
  return (
    <Section
      title="Что лежит"
      text="В наличии, пришёл больше 21 дня назад, расход за 21 день — меньше 2 г в день. Табак на стопе для гостей сюда не попадает."
      extra={<span className="inv-muted">заморожено <b className="inv-num" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{PA.idle.total}</b></span>}
    >
      <MasterList
        columns={[
          { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.3fr)', render: (r) => <PaName r={r} /> },
          { key: 'left', label: 'ОСТАТОК', width: '100px', render: (r) => <span className="inv-num">≈ {r.left} г</span> },
          { key: 'rate', label: 'РАСХОД ЗА 21 ДЕНЬ', width: '150px', render: (r) => <span className="inv-num">{r.rate21}</span> },
          { key: 'rub', label: 'ДЕНЕГ В НЁМ', width: '120px', render: (r) => <span className="inv-num">{r.rub}</span> },
          { key: 'arr', label: 'ПРИХОД', width: '120px', render: (r) => <span className="inv-num">{r.arrived} <span className="inv-faint">· {r.days} дн</span></span> },
          { key: 'keep', label: 'ДЕРЖИМ', width: '70px', align: 'center', render: (r) => <MasterToggle checked={r.keep} onChange={() => {}} label="Держим постоянно" /> },
        ]}
        rows={PA.idle.rows}
      />
      <p className="hint">Выключить «Держим» — табак не попадёт в «К заказу», когда закончится. Гость его видит, пока он есть на полке.</p>
    </Section>
  );
}

function ProfilesSection() {
  return (
    <Section title="Вкусы: расход против полки" text="Доля направления в расходе точки за 30 дней и доля табаков этого направления на полке. Выбор в приложении — для справки, часть заказов.">
      <div className="inv-order">
        <div className="pa-prof th"><span>Направление</span><span>Расход · полка · в приложении</span><span /></div>
        {PA.profiles.map((p) => (
          <div className="pa-prof" key={p.key}>
            <span><span className="inv-dot" style={{ background: paProfileColor(p.key) }} />{PA_PROFILE_LABEL[p.key]}</span>
            <span className="pa-bars2">
              <span className="pa-bar2"><span>расход</span><i style={{ width: p.spend * 2.4 + '%', background: paProfileColor(p.key) }} /><b>{p.spend} %</b></span>
              <span className="pa-bar2"><span>полка</span><i style={{ width: p.shelf * 2.4 + '%', background: 'var(--text-faint)' }} /><b>{p.shelf} %</b></span>
              <span className="pa-bar2" style={{ opacity: 0.6 }}><span>приложение</span><i style={{ width: p.app * 2.4 + '%', border: '1px dashed var(--text-faint)', boxSizing: 'border-box' }} /><b>{p.app} %</b></span>
            </span>
            <span>
              {p.flag === 'more' ? <span style={{ display: 'grid', gap: 4 }}><span className="pa-flag inv-warn">расходится больше, чем есть</span><MasterButton size="sm" variant="ghost">Идеи: {PA_PROFILE_LABEL[p.key].toLowerCase()}</MasterButton></span> : null}
              {p.flag === 'less' ? <span className="pa-flag inv-faint">на полке больше, чем расходится</span> : null}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FewData() {
  return (
    <div className="inv-empty-hero">
      <h2>Данных пока мало</h2>
      <p>Учёт в граммах идёт 3 дня. Расход и всё, что из него следует, появится через 2–4 недели: заносите счета в «Поставки» и жмите «Закончился», когда табак кончился. Ориентир — 10 декабря; раньше цифры случайные.</p>
    </div>
  );
}

function Purchase({ sub: initSub = 'base', noBudget, few }) {
  const [sub, setSub] = React.useState(initSub);
  const body = { base: BaseSection, fast: FastSection, trials: TrialsSection, idle: IdleSection, profiles: ProfilesSection }[sub];
  return (
    <div className="page">
      <BudgetStrip none={noBudget} />
      <div className="toolbar">
        <div className="toolbar-filters">
          {PA_SUBS.map(([k, l]) => <FilterChip key={k} active={sub === k} count={few ? undefined : PA_SUB_COUNT[k]} onClick={() => setSub(k)}>{l}</FilterChip>)}
        </div>
        <span className="inv-faint" style={{ fontSize: 12 }}>за 30–60 дней · {PA.today}</span>
      </div>
      {few ? <FewData /> : React.createElement(body)}
    </div>
  );
}

// ── Полка: переключатель «Полка · К заказу · Закупка» ──
function ShelfScreen({ init = {} }) {
  const [view, setView] = React.useState(init.view || 'shelf');
  const [drawer, setDrawer] = React.useState(init.drawer || null);
  const [settings, setSettings] = React.useState(!!init.settings);
  const [pop, setPop] = React.useState(init.pop || null);
  const [toast, setToast] = React.useState(null);
  const onMark = (row, text) => setToast({ title: row.brand + ' ' + row.name, text: 'осталось ' + text + '. Расход в месяц и «закончится» пересчитаны.' });
  const s = GR.stats;
  const count = init.unknown ? 5 : 7;
  return (
    <div className="page">
      <MasterPageHeader
        eyebrow={'ИНВЕНТАРИЗАЦИЯ · ' + GR.today}
        title="Полка"
        subtitle="Сколько табака осталось, расход и прогноз. Закончился — одна кнопка, остаток — когда удобно."
        meta={s.shelf + ' позиций · ≈ ' + s.kg + ' кг'}
        actions={<>
          <span className="inv-seg">
            <button aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>Полка</button>
            <button aria-pressed={view === 'reorder'} onClick={() => setView('reorder')}>К заказу · {count}</button>
            <button aria-pressed={view === 'purchase'} onClick={() => setView('purchase')}>Закупка</button>
          </span>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />}>Загрузить счёт</MasterButton>
          <MasterIconButton label="Настройки полки" onClick={() => setSettings(true)}><Ic name="Settings" /></MasterIconButton>
        </>}
      />
      {view === 'shelf' ? (
        <>
          <MasterStatsRow tiles={[
            { label: 'НА ПОЛКЕ', value: s.shelf, hint: '≈ ' + s.kg + ' кг табака' },
            { label: 'ЗАКАНЧИВАЕТСЯ', value: 16, hint: 'до следующей поставки, до ' + PA.interval.horizon, tone: 'warning' },
            { label: 'ЗАКОНЧИЛИСЬ', value: s.out, hint: 'держим постоянно — в «К заказу»', tone: 'danger' },
            { label: 'В МЕСЯЦ УХОДИТ', value: '≈ 16 кг', hint: '≈ 540 г в день · 30 чаш по 18 г' },
          ]} />
          <ShelfTable onOpen={setDrawer} pop={pop} setPop={setPop} onMark={onMark} />
        </>
      ) : view === 'reorder' ? <Reorder copied={init.copied} unknown={init.unknown} /> : <Purchase sub={init.sub} noBudget={init.noBudget} few={init.few} />}
      <Drawer key={drawer} id={drawer} onClose={() => setDrawer(null)} onMark={onMark} />
      <Toast toast={toast} />
      {settings ? <Settings onClose={() => setSettings(false)} /> : null}
    </div>
  );
}

function Settings({ onClose }) {
  return (
    <PaOverlay>
      <div className="pa-dlg-scrim" onClick={onClose} />
      <section className="pa-dlg" role="dialog" aria-label="Настройки полки">
        <div className="pa-dlg-head">
          <p className="inv-eyebrow" style={{ color: 'var(--text-muted)' }}>Полка · настройки</p>
          <h2 className="inv-h1" style={{ fontSize: 22 }}>Настройки полки</h2>
          <span className="inv-muted">Из них считаются чаши в прогнозе, «Заканчивается», «К заказу» и бюджет в «Закупке».</span>
        </div>
        <div className="pa-dlg-body">
          <label className="pa-field">Граммовка чаши, г<span className="gr-input"><b>18</b></span></label>
          <label className="pa-field">Срок поставки, дней<span className="gr-input"><b>7</b></span></label>
          <label className="pa-field wide">Бюджет на табак, ₽ в месяц<span className="gr-input on"><b>150 000</b><span>₽</span></span>
            <span className="inv-faint" style={{ fontSize: 12 }}>Необязательно. Покажем, сколько из него съедает база и сколько остаётся на то, чего нет, и на пробы.</span>
          </label>
          <p className="hint wide" style={{ margin: 0 }}>Интервал между поставками считается сам по принятым счетам: сейчас примерно раз в {PA.interval.days} дней.</p>
        </div>
        <div className="pa-dlg-foot">
          <MasterButton variant="ghost" onClick={onClose}>Отмена</MasterButton>
          <MasterButton variant="primary" onClick={onClose}>Сохранить</MasterButton>
        </div>
      </section>
    </PaOverlay>
  );
}

// ── #326: дашборд, карточка «Деньги» ──
function Dashboard({ noBudget }) {
  const B = PA.budget;
  return (
    <div className="page">
      <MasterPageHeader eyebrow="ОКНО: 6 НОЯБРЯ — 19 НОЯБРЯ" title="Дашборд смены" subtitle="Что важно знать команде до открытия зала." />
      <div className="pa-dash">
        <section className="pa-card">
          <p className="inv-eyebrow" style={{ color: 'var(--text-muted)' }}>Полка сегодня</p>
          <h2>Прогноз расхода</h2>
          <div className="inv-forecast"><b>≈ 540 г</b><span className="inv-muted">≈ 30 чаш по 18 г · четверг: +8 % к среднему дню</span></div>
          <p className="hint">Без изменений — экран из #306.</p>
        </section>
        <section className="pa-card">
          <p className="inv-eyebrow" style={{ color: 'var(--text-muted)' }}>Деньги</p>
          <h2>{noBudget ? 'Траты за ноябрь' : 'Ноябрь: бюджет ' + B.budget}</h2>
          {noBudget ? null : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="pa-meter"><i style={{ width: B.spentShare * 100 + '%' }} /><em style={{ left: B.baseShare * 100 + '%' }} /></div>
              <div className="pa-meter-legend">
                <span><i style={{ background: 'var(--chart-1)' }} />потрачено {B.spent}</span>
                <span><i style={{ background: 'var(--text-primary)', width: 2 }} />база {B.base} в месяц</span>
                <span>на пробы остаётся <b style={{ color: 'var(--success)', fontWeight: 500 }}>{B.left}</b></span>
              </div>
            </div>
          )}
          <div className="inv-spend">
            {[['Каспий Опт', '51 080 ₽', 0.6], ['Южный табак', '36 136 ₽', 0.4]].map(([n, v, sh]) => (
              <div className="inv-spend-row" key={n}><span>{n}</span><i style={{ width: sh * 100 + '%' }} /><span className="inv-num" style={{ textAlign: 'right' }}>{v}</span></div>
            ))}
          </div>
          {noBudget ? (
            <div className="pa-interval"><span className="grow">База стоит <b>{B.base}</b> в месяц. Укажите бюджет — покажем остаток на пробы.</span><MasterButton size="sm">Указать</MasterButton></div>
          ) : (
            <div className="pa-kv2">
              <div><span>Себестоимость чаши</span><b>≈ 138 ₽</b><small>18 г по средней цене</small></div>
              <div><span>Табака на полке</span><b>≈ 604 000 ₽</b><small>по ценам прихода</small></div>
            </div>
          )}
          {noBudget ? null : <p className="hint">У {B.unknown} табаков базы нет цены — сумма базы неполная.</p>}
        </section>
      </div>
    </div>
  );
}

function PaApp_({ start = 'shelf', init = {} }) {
  const [tab, setTab] = React.useState(start);
  let screen;
  if (tab === 'shelf') screen = <ShelfScreen init={init} />;
  else if (tab === 'dashboard') screen = <Dashboard noBudget={init.noBudget} />;
  else screen = <EmptyState>Экран не меняется в этой фиче.</EmptyState>;
  return <PaShell tab={tab} onTab={setTab}>{screen}</PaShell>;
}

// ── Телефон: отметка пробы у стойки ──
function MShelf({ sheet }) {
  const [mark, setMark] = React.useState(null);
  const [open, setOpen] = React.useState(sheet ? 'bb-rasp' : null);
  const [frac, setFrac] = React.useState(null);
  const rows = GR.shelf.filter((r) => ['bb-cane', 'bb-pear', 'sr-passion', 'bb-rasp'].includes(r.id));
  return (
    <div className="phone">
      <header className="m-top">
        <img src={PA_MARK} alt="" />
        <h1>Полка</h1>
        <MasterIconButton label="К заказу"><Ic name="ShoppingCart" /></MasterIconButton>
      </header>
      <div className="m-body">
        <div className="m-search"><Ic name="Search" size={16} /> Табак или бренд</div>
        <div className="m-chips">
          <FilterChip active count={269}>Все</FilterChip>
          <FilterChip count={16}>Заканчивается</FilterChip>
          <FilterChip count={4}>Пробы</FilterChip>
        </div>
        {rows.map((r) => {
          const trial = PA.trials.find((t) => t.id === r.id);
          return (
            <article className="m-card" key={r.id}>
              <span className="inv-name"><b>{r.name}</b><span>{r.brand}</span></span>
              <span style={{ fontSize: 13, textAlign: 'right' }}><Until row={r} /></span>
              <div className="m-card-meta"><Level row={r} /><span style={{ fontSize: 13 }}><MonthRate row={r} /></span></div>
              {trial ? (
                <div className="m-trial">
                  <span>Проба · как зашла?</span>
                  <TrialMark value={r.id === 'bb-pear' ? 'yes' : mark} onChange={setMark} />
                </div>
              ) : null}
              <div className="m-acts">
                <button className="m-ghost-btn" onClick={() => setOpen(r.id)}>Осталось…</button>
                <button className="m-empty-btn">Закончился</button>
              </div>
            </article>
          );
        })}
      </div>
      <nav className="m-nav"><span>Дашборд</span><span className="on">Полка</span><span>Поставки</span><span>Ещё</span></nav>
      {open ? (() => {
        const row = GR.shelf.find((r) => r.id === open);
        return (
          <>
            <div className="m-scrim" onClick={() => setOpen(null)} />
            <section className="m-sheet" role="dialog" aria-label={'Сколько осталось: ' + row.name}>
              <span className="m-grab" />
              <div>
                <p className="inv-eyebrow">{row.brand}</p>
                <h2>{row.name}</h2>
                <span className="inv-muted">После прихода {row.arrived} было {row.full} г · сейчас ≈ {row.left} г</span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <h3 className="inv-h3">Сколько осталось?</h3>
                <div className="m-fracs four">
                  {PA_FRACS.map(([f, k]) => <button key={f} className={'m-frac' + (frac === f ? ' on' : '')} onClick={() => setFrac(f)}>{f}<small>{Math.round(row.full * k)} г</small></button>)}
                </div>
                <h3 className="inv-h3" style={{ marginTop: 6 }}>Или точно, если взвесили</h3>
                <div className="m-exact">
                  <span className="gr-input"><b><span className="inv-faint">граммы</span></b><span>г</span></span>
                  <button className="m-save" disabled={!frac} onClick={() => setOpen(null)}>Сохранить</button>
                </div>
              </div>
              <button className="m-big">Закончился · 0 г</button>
            </section>
          </>
        );
      })() : null}
    </div>
  );
}

// ── Кадры доски и режим #shot= ──
const PA_SHOTS = [
  { id: 'reorder', group: 'order', name: 'К заказу', note: '#323 + #325. Количества и суммы нет: «закончится», расход в месяц, остаток. В список попадает всё, что закончится до следующей поставки с запасом на срок поставки.', start: 'shelf', init: { view: 'reorder' }, tall: true },
  { id: 'reorder-copied', group: 'order', name: 'К заказу · текст заявки', note: 'Только названия — объём мастер впишет в чате сам.', start: 'shelf', init: { view: 'reorder', copied: true }, tall: true },
  { id: 'shelf', group: 'order', name: 'Полка', note: '#323. Колонка «Расход» — в г/мес, как в «К заказу» и карточке. «Заканчивается» — до следующей поставки. Новинки помечены «проба».', start: 'shelf' },
  { id: 'shelf-left', group: 'order', name: 'Полка · «Сколько осталось?»', note: 'Без изменений с #306: доля ¾ ½ ⅓ ¼ от уровня после прихода или точно в граммах.', start: 'shelf', init: { pop: 'bb-rasp' } },
  { id: 'card', group: 'order', name: 'Карточка', note: '#323. Расход — г/мес, под ним г/день.', start: 'shelf', init: { drawer: 'bb-rasp' }, tall: true },
  { id: 'card-trial', group: 'order', name: 'Карточка пробы', note: '#329. Отметка «зашло / не зашло» — одно касание, можно поменять.', start: 'shelf', init: { drawer: 'bb-pear' }, tall: true },
  { id: 'settings', group: 'budget', name: 'Настройки полки', note: '#326. Бюджет на табак в ₽ в месяц — необязательное поле.', start: 'shelf', init: { view: 'reorder', settings: true } },
  { id: 'dashboard', group: 'budget', name: 'Дашборд · Деньги', note: '#326. Потрачено против бюджета, отметка базы, остаток на пробы.', start: 'dashboard' },
  { id: 'purchase-base', group: 'purchase', name: 'Закупка · База', note: '#326 + #327. Полоса бюджета сверху. Подсказки — только по расходу; «В приложении» — справочно.', start: 'shelf', init: { view: 'purchase', sub: 'base' }, tall: true },
  { id: 'purchase-fast', group: 'purchase', name: 'Закупка · Закончились быстро', note: '#328. Ушёл за 3 дня и быстрее; дни без табака; что было дальше — видно правило «×2».', start: 'shelf', init: { view: 'purchase', sub: 'fast' } },
  { id: 'purchase-trials', group: 'purchase', name: 'Закупка · Пробы', note: '#329. Скорость к полке + отметка мастера. Приложение — справочно; «нет в миксах» — гости приложения пробу не увидят.', start: 'shelf', init: { view: 'purchase', sub: 'trials' } },
  { id: 'purchase-idle', group: 'purchase', name: 'Закупка · Лежит', note: '#330. Заморожено денег; выключить «Держим» — не докупать.', start: 'shelf', init: { view: 'purchase', sub: 'idle' } },
  { id: 'purchase-profiles', group: 'purchase', name: 'Закупка · Вкусы', note: '#331. Расход направления против доли на полке; переход в «Идеи».', start: 'shelf', init: { view: 'purchase', sub: 'profiles' }, tall: true },
  { id: 'mobile-trial', group: 'mobile', name: 'Телефон · отметка пробы', phone: true },
  { id: 'mobile-left', group: 'mobile', name: 'Телефон · «Сколько осталось?»', note: 'Без изменений с #306.', phone: true, sheet: true },
  { id: 'edge-interval', group: 'edge', name: 'Интервал поставок неизвестен', note: 'Меньше 3 принятых счетов: считаем по сроку поставки, как сейчас.', start: 'shelf', init: { view: 'reorder', unknown: true } },
  { id: 'edge-no-budget', group: 'edge', name: 'Бюджет не указан', note: 'Показываем стоимость базы и предлагаем указать бюджет.', start: 'shelf', init: { view: 'purchase', sub: 'base', noBudget: true }, tall: true },
  { id: 'edge-dash-no-budget', group: 'edge', name: 'Дашборд без бюджета', start: 'dashboard', init: { noBudget: true } },
  { id: 'edge-few', group: 'edge', name: 'Закупка · мало данных', note: 'Первые недели: аналитики нет, объясняем, когда будет.', start: 'shelf', init: { view: 'purchase', few: true } },
];

function ShotView({ shot }) {
  if (shot.phone) return <MShelf sheet={shot.sheet} />;
  return <PaDesk tall={shot.tall}><PaApp_ start={shot.start} init={shot.init} /></PaDesk>;
}

function Frame({ shot }) {
  return (
    <div className="frame">
      <p className="frame-name"><b>{shot.name}</b> · #shot={shot.id}</p>
      {shot.note ? <p className="frame-note">{shot.note}</p> : null}
      <ShotView shot={shot} />
    </div>
  );
}

function Board() {
  const section = (group) => PA_SHOTS.filter((s) => s.group === group).map((s) => <Frame key={s.id} shot={s} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#324 + #323 · Мастер · десктоп 1280 и телефон 375</p>
        <h1 className="board-title">Аналитика закупки</h1>
        <p className="board-text">
          Сколько заказать, решает мастер: сервис показывает, когда табак закончится и сколько уходит в месяц.
          Интервал поставок считается по счетам, бюджет на табак — настройка полки в ₽ в месяц. Новый вид «Закупка» отвечает
          на шаги закупки мастера: база, что закончилось быстро, как зашли пробы, что лежит, какие вкусы расходятся.
          Основа — расход точки (все кальяны, включая зал); выбор в Арома Ателье — справочно. Данные — из мокапа #306, «сегодня» 19 ноября.
        </p>
      </header>
      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <p className="frame-note">Переключатель «Полка · К заказу · Закупка», клик по строке полки — карточка, шестерёнка — настройки, «Дашборд» в шапке.</p>
        <PaDesk tall><PaApp_ start="shelf" init={{ view: 'purchase' }} /></PaDesk>
      </section>
      <section className="board-section"><h2 className="board-h2">Прогноз вместо количества</h2><div className="board-row">{section('order')}</div></section>
      <section className="board-section"><h2 className="board-h2">Бюджет</h2><div className="board-row">{section('budget')}</div></section>
      <section className="board-section"><h2 className="board-h2">Закупка</h2><div className="board-row">{section('purchase')}</div></section>
      <section className="board-section"><h2 className="board-h2">Телефон за стойкой</h2><div className="board-row">{section('mobile')}</div></section>
      <section className="board-section"><h2 className="board-h2">Края</h2><div className="board-row">{section('edge')}</div></section>
    </div>
  );
}

function Shot({ id }) {
  const shot = PA_SHOTS.find((s) => s.id === id) || PA_SHOTS[0];
  return <div className="shot"><ShotView shot={shot} /></div>;
}

const paShotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(paShotId ? <Shot id={paShotId} /> : <Board />);
