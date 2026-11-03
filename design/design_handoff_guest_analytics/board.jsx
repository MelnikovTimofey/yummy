/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTopBar, FilterChip } = window.DesignSystem_1aef33;
const GA = window.GA;
const MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';
const CAT = 'var(--chart-1)';
const OWN = 'var(--chart-5)';

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

const TABS = [
  { id: 'dashboard', label: 'Дашборд', icon: <Ic name="LayoutDashboard" size={14} /> },
  { id: 'shelf', label: 'Полка', icon: <Ic name="Package" size={14} /> },
  { id: 'deliveries', label: 'Поставки', icon: <Ic name="Truck" size={14} /> },
  { id: 'catalog', label: 'Каталог', icon: <Ic name="Library" size={14} /> },
  { id: 'mixes', label: 'Миксы', icon: <Ic name="Blend" size={14} /> },
  { id: 'rails', label: 'Рейлы', icon: <Ic name="GalleryVerticalEnd" size={14} /> },
  { id: 'access', label: 'Доступ', icon: <Ic name="ShieldCheck" size={14} /> },
];

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

// ── Динамика: столбцы с накоплением (shadcn Bar Chart, stacked) ──
function Dynamics({ byWeeks, tip, compact }) {
  const data = byWeeks ? GA.weeks : GA.days;
  const W = compact ? 320 : 1180, H = compact ? 150 : 210, L = 30, B = 22, T = 8;
  const max = byWeeks ? 200 : 40;
  const step = byWeeks ? 50 : 10;
  const cw = (W - L) / data.length;
  const bw = Math.max(4, cw * (byWeeks ? 0.5 : 0.62));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const every = compact ? 7 : byWeeks ? 1 : 3;
  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Выборы по дням">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="var(--border-subtle)" />
            <text x={L - 8} y={y(v) + 3} textAnchor="end" className="ga-axis">{v}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * cw + (cw - bw) / 2;
          const hc = (H - T - B) * (d.catalog / max);
          const ho = (H - T - B) * (d.own / max);
          const base = H - B;
          const on = tip === i;
          return (
            <g key={i} opacity={tip != null && !on ? 0.55 : 1}>
              {d.catalog ? <rect x={x} y={base - hc} width={bw} height={hc} fill={CAT} /> : null}
              {d.own ? <path d={`M${x},${base - hc} v${-ho + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${ho - 4} z`} fill={OWN} /> : null}
              {i % every === 0 ? <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="ga-axis">{byWeeks ? d.label : d.short}</text> : null}
            </g>
          );
        })}
      </svg>
      {tip != null ? (
        <div className="ga-tip" style={{ left: `${((L + tip * cw + cw) / W) * 100}%`, top: 24 }}>
          <b>{data[tip].label}, {data[tip].wd}</b>
          <span className="ga-tip-row"><i style={{ background: CAT }} />Миксы каталога<em>{data[tip].catalog}</em></span>
          <span className="ga-tip-row"><i style={{ background: OWN }} />Свои миксы<em>{data[tip].own}</em></span>
        </div>
      ) : null}
    </div>
  );
}

// ── Топ: горизонтальные столбцы с подписью внутри (shadcn Bar Chart, layout="vertical", custom label) ──
function HBars({ rows, kind, limit }) {
  const list = rows.slice(0, limit || rows.length);
  const max = list[0].n;
  return (
    <div className="ga-hbars">
      {list.map((r) => (
        <div key={r.name} className="ga-hbar">
          <div className="ga-hbar-track">
            <div className="ga-hbar-fill" style={{ width: Math.max(18, (r.n / max) * 100) + '%'}} />
            <span className="ga-hbar-label">
              {r.name}{kind === 'tobacco' ? <small>{r.brand}</small> : null}
              {r.mark === 'out' ? <span className="ga-mark">закончился</span> : null}
              {r.mark === 'trial' ? <span className="ga-mark faint">проба</span> : null}
              {r.mark === 'hidden' ? <span className="ga-mark">скрыт у гостя</span> : null}
              {r.mark === 'analog' ? <span className="ga-mark faint">с аналогом</span> : null}
              {kind === 'mix' && r.rating ? <span className="ga-rate">★ {r.rating}</span> : null}
            </span>
          </div>
          <em>{r.n}</em>
        </div>
      ))}
    </div>
  );
}

// ── Вкусы: кольцо с текстом в центре (shadcn Pie Chart, donut with text) ──
function Donut({ size = 200, total }) {
  const r = size / 2 - 18, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Доли вкусов">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {GA.profiles.map((p) => {
          const len = (p.share / 100) * c;
          const el = <circle key={p.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--profile-${p.key})`} strokeWidth={size > 150 ? 26 : 18} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </g>
      <text x="50%" y="48%" textAnchor="middle" className="ga-donut-center" style={size < 150 ? { fontSize: 20 } : null}>{fmt(total)}</text>
      <text x="50%" y="60%" textAnchor="middle" className="ga-donut-sub">{plural(total, 'выбор', 'выбора', 'выборов')}</text>
    </svg>
  );
}

function Shares() {
  return (
    <div className="ga-shares">
      {GA.profiles.map((p) => <span key={p.key} className="ga-share"><i style={{ background: `var(--profile-${p.key})` }} />{p.label}<em>{p.share}%</em></span>)}
    </div>
  );
}

function Signals() {
  const icon = { out: 'TriangleAlert', hidden: 'EyeOff', rail: 'GalleryVerticalEnd' };
  return (
    <div className="ga-signals">
      {GA.signals.map((s) => (
        <div key={s.kind} className={'ga-signal ' + s.kind}>
          <Ic name={icon[s.kind]} size={15} />
          <span className="grow">{s.text}</span>
          <MasterButton size="sm" variant="ghost">{s.action}</MasterButton>
        </div>
      ))}
    </div>
  );
}

function RangePop() {
  const oct = [];
  for (let i = 0; i < 2; i++) oct.push({ d: 29 + i, off: true });
  for (let d = 1; d <= 31; d++) oct.push({ d });
  const nov = [];
  for (let i = 0; i < 5; i++) nov.push({ d: 27 + i, off: true });
  for (let d = 1; d <= 30; d++) nov.push({ d, off: d > 4 });
  const cls = (m, x) => {
    if (x.off) return 'off';
    if (m === 'oct' && (x.d === 13 || x.d === 26)) return 'edge';
    if (m === 'oct' && x.d > 13 && x.d < 26) return 'in';
    return '';
  };
  const Month = ({ title, days, m }) => (
    <div className="ga-month">
      <h3>{title}</h3>
      <div className="ga-cal">
        {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((h) => <span key={h} className="h">{h}</span>)}
        {days.map((x, i) => <span key={i} className={cls(m, x)}>{x.d}</span>)}
      </div>
    </div>
  );
  return (
    <div className="ga-pop" role="dialog" aria-label="Период">
      <div className="ga-months"><Month title="Октябрь 2026" days={oct} m="oct" /><Month title="Ноябрь 2026" days={nov} m="nov" /></div>
      <div className="ga-pop-foot"><span>13 – 26 октября, 14 дней</span><MasterButton size="sm" variant="primary">Показать</MasterButton></div>
    </div>
  );
}

function Dashboard({ init = {} }) {
  const [period, setPeriod] = React.useState(init.period || 'month');
  const p = GA.periods.find((x) => x.id === period);
  const few = init.few, empty = init.empty;
  const range = few ? '4 ноября' : empty ? '1 – 5 октября' : p.range;
  const k = few ? { ...GA.kpi, choices: 9, own: 2, mixesChosen: 7, rating: '4,5', ratings: 3 } : empty ? { ...GA.kpi, choices: 0, own: 0, mixesChosen: 0, rating: '—', ratings: 0 } : GA.kpi;
  const noData = few || empty;
  const NoData = () => empty
    ? <div className="ga-few"><b>Выборов нет</b>За 1 – 5 октября гости ничего не выбирали.</div>
    : <div className="ga-few"><b>Мало данных</b>{range}: {k.choices} {plural(k.choices, 'выбор', 'выбора', 'выборов')}. Графики появятся с 20 выборов, выберите период длиннее.</div>;
  return (
    <main className="shell">
      <MasterTopBar markSrc={MARK} items={TABS} active="dashboard" userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">
        <header className="ga-head">
          <h1>Дашборд</h1>
          <div className="ga-head-side">
            <span className="ga-range">{range}</span>
            <div className="ga-seg" role="group" aria-label="Период">
              {GA.periods.map((x) => (
                <button key={x.id} aria-pressed={(few || empty) ? x.id === 'custom' : x.id === period} onClick={() => setPeriod(x.id)}>
                  {x.id === 'custom' ? <Ic name="CalendarRange" size={14} /> : null}{x.label}
                </button>
              ))}
            </div>
            {init.calendar ? <RangePop /> : null}
          </div>
        </header>
        <div className="ga-kpi">
          <div><span>Выборов</span><b>{fmt(k.choices)}</b><small>«Покурить» и свои миксы</small></div>
          <div><span>Свои миксы</span><b>{k.own}</b><small>собраны в «Намиксуй»</small></div>
          <div><span>Миксов выбирали</span><b>{k.mixesChosen}</b><small>из {GA.kpi.mixesTotal} на витрине</small></div>
          <div><span>Оценка гостей</span><b>{k.rating}</b><small>{k.ratings ? 'по ' + k.ratings + ' ' + plural(k.ratings, 'оценке', 'оценкам', 'оценкам') : 'оценок нет'}</small></div>
        </div>
        {noData ? (
          <>
            <section className="ga-card"><NoData /></section>
            <section className="ga-card"><div className="ga-card-head"><h2>Сигналы</h2></div><Signals /></section>
          </>
        ) : (
          <>
            <section className="ga-card">
              <div className="ga-card-head">
                <h2>Выборы {period === 'quarter' ? 'по неделям' : 'по дням'}</h2>
                <span className="ga-legend"><span><i style={{ background: CAT }} />Миксы каталога</span><span><i style={{ background: OWN }} />Свои миксы</span></span>
              </div>
              <Dynamics byWeeks={period === 'quarter'} tip={init.tip} />
            </section>
            <div className="ga-grid">
              <section className="ga-card">
                <div className="ga-card-head"><h2>Популярные табаки</h2><span className="ga-legend">в скольких выборах</span></div>
                <HBars rows={GA.tobaccos} kind="tobacco" />
              </section>
              <section className="ga-card">
                <div className="ga-card-head"><h2>Популярные миксы</h2><span className="ga-legend">выборов</span></div>
                <HBars rows={GA.mixes} kind="mix" />
              </section>
              <section className="ga-card">
                <div className="ga-card-head"><h2>Вкусы</h2><span className="ga-legend">доля выборов</span></div>
                <div className="ga-donut-wrap"><Donut total={k.choices} /><Shares /></div>
              </section>
              <section className="ga-card">
                <div className="ga-card-head"><h2>Сигналы</h2></div>
                <Signals />
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function MDash() {
  return (
    <div className="phone">
      <header className="m-top"><img src={MARK} alt="" /><h1>Дашборд</h1></header>
      <div className="m-body">
        <div className="m-chips">
          {GA.periods.map((x) => <FilterChip key={x.id} active={x.id === 'month'}>{x.label}</FilterChip>)}
        </div>
        <span className="ga-range">{GA.periods[1].range}</span>
        <div className="ga-kpi m-kpi">
          <div><span>Выборов</span><b>{GA.kpi.choices}</b></div>
          <div><span>Свои миксы</span><b>{GA.kpi.own}</b></div>
          <div><span>Миксов</span><b>{GA.kpi.mixesChosen}</b><small>из {GA.kpi.mixesTotal}</small></div>
          <div><span>Оценка</span><b>{GA.kpi.rating}</b></div>
        </div>
        <section className="ga-card">
          <div className="ga-card-head"><h2>Выборы по дням</h2></div>
          <Dynamics compact />
          <span className="ga-legend"><span><i style={{ background: CAT }} />Миксы каталога</span><span><i style={{ background: OWN }} />Свои</span></span>
        </section>
        <section className="ga-card">
          <div className="ga-card-head"><h2>Популярные табаки</h2></div>
          <HBars rows={GA.tobaccos} kind="tobacco" limit={5} />
          <MasterButton size="sm" variant="ghost">Все 10</MasterButton>
        </section>
        <section className="ga-card">
          <div className="ga-card-head"><h2>Вкусы</h2></div>
          <div className="ga-donut-wrap"><Donut size={120} total={GA.kpi.choices} /><Shares /></div>
        </section>
      </div>
      <nav className="m-nav"><span className="on">Дашборд</span><span>Полка</span><span>Поставки</span><span>Ещё</span></nav>
    </div>
  );
}

function Desk({ children }) {
  return <div className="desk"><div className="desk-scroll">{children}</div></div>;
}

const SHOTS = [
  { id: 'month', group: 'main', name: 'Месяц', note: 'Последние 30 дней. Плитки, выборы по дням, популярные табаки и миксы, вкусы, сигналы для команды.' },
  { id: 'month-tip', group: 'main', name: 'Месяц, подсказка', note: 'Наведение на столбец: дата, миксы каталога и свои отдельно.', init: { tip: 19 } },
  { id: 'month-bottom', group: 'main', name: 'Месяц, низ экрана', note: 'Вкусы по профилям выбранных миксов. Сигналы ведут в нужный раздел.', init: {}, scroll: 560 },
  { id: 'quarter', group: 'periods', name: 'Квартал', note: 'Больше 31 дня: столбцы по неделям. До начала пилота выборов нет.', init: { period: 'quarter' } },
  { id: 'calendar', group: 'periods', name: 'Даты', note: 'Произвольный период: календарь на два месяца, конец не позже сегодня.', init: { period: 'custom', calendar: true } },
  { id: 'mobile', group: 'mobile', name: 'Телефон', phone: true },
  { id: 'edge-few', group: 'edge', name: 'Мало данных', note: 'Меньше 20 выборов: графики не строим, плитки показываем.', init: { few: true } },
  { id: 'edge-empty', group: 'edge', name: 'Выборов нет', init: { empty: true } },
];

function ShotView({ shot }) {
  if (shot.phone) return <MDash />;
  return (
    <Desk>
      <ScrollTo y={shot.scroll}><Dashboard init={shot.init} /></ScrollTo>
    </Desk>
  );
}

function ScrollTo({ y, children }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    if (y && ref.current) ref.current.closest('.desk-scroll').scrollTop = y;
  }, [y]);
  return <div ref={ref}>{children}</div>;
}

function Frame({ shot }) {
  return (
    <div className="frame">
      <p className="frame-name"><b>{shot.name}</b>, #shot={shot.id}</p>
      {shot.note ? <p className="frame-note">{shot.note}</p> : null}
      <ShotView shot={shot} />
    </div>
  );
}

function Board() {
  const section = (g) => SHOTS.filter((s) => s.group === g).map((s) => <Frame key={s.id} shot={s} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#520, Мастер, десктоп 1280 и телефон 375</p>
        <h1 className="board-title">Дашборд: выборы гостей</h1>
        <p className="board-text">
          Дашборд смены заменяется аналитикой выборов гостей. Выбор: «Покурить» у микса каталога или свой микс из «Намиксуй».
          Табак засчитывается целиком за каждый выбор микса, где он есть. Периоды скользящие: 7, 30 и 90 дней, всё время и свои даты.
          Графики в реализации на shadcn charts (Recharts), цвета из токенов Film Noir. «Сегодня» 4 ноября.
        </p>
      </header>
      <section className="board-section"><h2 className="board-h2">Кликабельный прототип</h2><p className="frame-note">Переключатель периода сверху.</p><Desk><Dashboard /></Desk></section>
      <section className="board-section"><h2 className="board-h2">Дашборд</h2><div className="board-row">{section('main')}</div></section>
      <section className="board-section"><h2 className="board-h2">Периоды</h2><div className="board-row">{section('periods')}</div></section>
      <section className="board-section"><h2 className="board-h2">Телефон</h2><div className="board-row">{section('mobile')}</div></section>
      <section className="board-section"><h2 className="board-h2">Края</h2><div className="board-row">{section('edge')}</div></section>
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
const shot = shotId && SHOTS.find((s) => s.id === shotId);
ReactDOM.createRoot(document.getElementById('root')).render(shot ? <div className="shot"><ShotView shot={shot} /></div> : <Board />);
