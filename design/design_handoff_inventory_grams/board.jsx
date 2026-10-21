/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterInput, MasterStatsRow, MasterPageHeader, FilterChip, MasterList, MasterSortPill, MasterCard, MasterTopBar, EmptyState } = window.DesignSystem_1aef33;
const GR_D = window.GR;
const GR_INV = window.INV;
const GR_MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

const GR_TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'shelf', label: 'Полка' },
  { id: 'deliveries', label: 'Поставки' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'mixes', label: 'Миксы' },
  { id: 'rails', label: 'Рейлы' },
  { id: 'access', label: 'Доступ' },
];

const GR_PROFILE_LABEL = { berry: 'Ягодный', citrus: 'Цитрусовый', dessert: 'Десертный', fruity: 'Фруктовый', minty: 'Мятный', spicy: 'Пряный', floral_herbal: 'Травяной' };
const grProfileColor = (key) => `var(--profile-${key.replace('_', '-')})`;
const GR_FRACS = [['¾', 0.75], ['½', 0.5], ['⅓', 1 / 3], ['¼', 0.25]];
const grNum = (v) => String(v).replace('.', ',');

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

const GrOverlayCtx = React.createContext(null);
function GrOverlay({ children }) {
  const node = React.useContext(GrOverlayCtx);
  return node ? ReactDOM.createPortal(children, node) : null;
}

function GrDesk({ tall, children }) {
  const [node, setNode] = React.useState(null);
  return (
    <div className={'desk' + (tall ? ' tall' : '')}>
      <GrOverlayCtx.Provider value={node}>
        <div className="desk-scroll">{children}</div>
      </GrOverlayCtx.Provider>
      <div ref={setNode} />
    </div>
  );
}

function GrShell({ tab, onTab, children }) {
  return (
    <main className="shell">
      <MasterTopBar markSrc={GR_MARK} items={GR_TABS} active={tab} onChange={onTab} userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">{children}</section>
    </main>
  );
}

// Остаток: полоса — доля от уровня после последнего прихода, цифра — граммы сейчас.
function Level({ row, lg }) {
  if (row.left == null) return <span className="lvl"><span className="lvl-bar none" /><span className="lvl-copy"><b className="inv-faint">—</b><small>прихода не было</small></span></span>;
  const share = row.full ? row.left / row.full : 0;
  const tone = row.status === 'out' ? '' : row.status === 'check' || (row.days != null && row.days <= 3) ? ' crit' : row.status === 'ending' ? ' low' : '';
  return (
    <span className={'lvl' + (lg ? ' lg' : '')} title="Остаток от уровня после последнего прихода">
      <span className={'lvl-bar' + tone + (row.left === 0 ? ' none' : '')}><i style={{ width: Math.max(row.left ? 4 : 0, share * 100) + '%' }} /></span>
      <span className="lvl-copy">
        <b className={row.left === 0 ? 'inv-danger' : ''}>{row.left === 0 ? '0 г' : '≈ ' + row.left + ' г'}</b>
        <small>из {row.full} г после прихода</small>
      </span>
    </span>
  );
}

function GrRate({ row }) {
  if (row.rateKind === 'none') return <span className="inv-faint">мало данных</span>;
  if (row.rateKind === 'brand') return <span className="inv-until" title="Своих отметок ещё мало — медиана бренда"><span className="inv-num">≈ {grNum(row.rate)} г/день</span><small className="inv-faint">по бренду</small></span>;
  return <span className="inv-num">{grNum(row.rate)} г/день</span>;
}

function GrUntil({ row }) {
  let date;
  if (row.status === 'out') date = <span className="inv-danger">{row.until}</span>;
  else if (row.status === 'check') date = <span className="inv-warn">должен был закончиться</span>;
  else if (row.days == null) date = <span className="inv-faint">—</span>;
  else date = <span className={'inv-num ' + (row.days <= 3 ? 'inv-danger' : row.days <= 7 ? 'inv-warn' : '')}>{row.until} <span className="inv-faint">· {row.days} дн</span></span>;
  let status = null;
  if (row.status === 'stop') status = <span className="inv-faint">стоп для гостей · {row.note}</span>;
  else if (row.status === 'out') status = <span className="inv-danger">закончился</span>;
  else if (row.status === 'ending') status = <span className="inv-warn">заканчивается</span>;
  else if (row.status === 'check') status = <span className="inv-warn">проверьте остаток</span>;
  else if (row.status === 'plan') status = <span className="inv-faint">в плане</span>;
  else if (row.mark) status = <span className="inv-faint">отметка {row.mark}</span>;
  return <span className="inv-until">{date}{status ? <small>{status}</small> : null}</span>;
}

// «Сколько осталось?»: доля от уровня после прихода или точные граммы.
function LeftPop({ row, pos, exact, onMark, onEmpty }) {
  const [value, setValue] = React.useState(exact || '');
  return (
    <div className="inv-pop gr-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <span className="inv-pop-label">Сколько осталось · после прихода {row.arrived} было {row.full} г</span>
      <div className="gr-fracs">
        {GR_FRACS.map(([f, k], i) => (
          <button key={f} className="gr-frac" onClick={() => onMark(row, f + ' — ' + Math.round(row.full * k) + ' г')} title={'Клавиша ' + (i + 1)}>
            {f}<small>{Math.round(row.full * k)} г</small>
          </button>
        ))}
      </div>
      <div className="inv-sep" />
      <div className="gr-exact">
        <label>Точно, если взвесили</label>
        <span className={'gr-input' + (value ? ' on' : '')} onClick={() => setValue(value || '180')}><b>{value || <span className="inv-faint">—</span>}</b><span>г</span></span>
        <MasterButton size="sm" variant={value ? 'primary' : 'ghost'} disabled={!value} onClick={() => onMark(row, value + ' г')}>Сохранить</MasterButton>
      </div>
      <p className="gr-note">Сейчас по расчёту ≈ {row.left} г. Отмечать не обязательно — отметка уточняет расход и прогноз.</p>
      <div className="inv-sep" />
      <button className="inv-pop-item danger" onClick={() => onEmpty(row)}>Закончился <span className="inv-faint">0 г · гость перестанет видеть</span></button>
    </div>
  );
}

function RowMenu({ row, pos, form, onForm, onClose }) {
  if (form === 'receipt') return (
    <div className="inv-pop gr-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <span className="inv-pop-label">Приход без счёта</span>
      <div className="gr-form">
        <div className="gr-row"><span>Сколько пришло</span><span className="gr-input on"><b>250</b><span>г</span></span></div>
        <div className="gr-row"><span>Цена за весь приход</span><span className="gr-input"><b className="inv-faint">—</b><span>₽</span></span></div>
        <p className="gr-note" style={{ padding: 0 }}>Цена — по желанию, для цены грамма. Счёт поставщика лучше загрузить в «Поставки»: там сопоставление и цена сами.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <MasterButton size="sm" variant="ghost" onClick={onClose}>Отмена</MasterButton>
          <MasterButton size="sm" variant="primary" onClick={onClose}>Добавить 250 г</MasterButton>
        </div>
      </div>
    </div>
  );
  if (form === 'writeoff') return (
    <div className="inv-pop gr-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <span className="inv-pop-label">Списать</span>
      <div className="gr-form">
        <div className="gr-row"><span>Сколько</span><span className="gr-input on"><b>{row.left}</b><span>г</span></span></div>
        <MasterInput placeholder="Причина: брак, пересорт, потеря" value="Отсырел" onChange={() => {}} />
        <p className="gr-note" style={{ padding: 0 }}>Списанное не идёт в расход и прогноз. Списали весь остаток — гость перестанет видеть табак.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <MasterButton size="sm" variant="ghost" onClick={onClose}>Отмена</MasterButton>
          <MasterButton size="sm" variant="primary" onClick={onClose}>Списать {row.left} г</MasterButton>
        </div>
      </div>
    </div>
  );
  return (
    <div className="inv-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <button className="inv-pop-item" onClick={() => onForm('receipt')}>Добавить приход без счёта…</button>
      <button className="inv-pop-item" onClick={() => onForm('writeoff')}>Списать…</button>
      <button className="inv-pop-item" onClick={onClose}>{row.status === 'stop' ? 'Снять стоп для гостей' : 'Стоп для гостей'}</button>
      <div className="inv-sep" />
      <button className="inv-pop-item" onClick={onClose}>Убрать с полки <span className="inv-faint">история останется</span></button>
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
    // У нижних строк всплывашка открывается вверх, чтобы не уйти за край кадра.
    setPos(a.bottom - d.top > d.height * 0.55 ? { bottom: d.bottom - a.top + 4, right: d.right - a.right } : { top: a.bottom - d.top + 4, right: d.right - a.right });
  }, [open]);
  return pos;
}

function Actions({ row, pop, setPop, onEmpty, onMark, exact }) {
  const ref = React.useRef(null);
  const open = pop && pop.id === row.id ? pop : null;
  const pos = usePos(open && open.kind, ref);
  const close = () => setPop(null);
  let main;
  if (row.status === 'out' || row.status === 'plan') main = <span className="inv-faint" style={{ fontSize: 12 }}>в «К заказу»</span>;
  else if (row.status === 'stop') main = <MasterButton size="sm" variant="ghost">Снять стоп</MasterButton>;
  else main = (
    <>
      <MasterButton size="sm" variant={row.status === 'check' ? 'primary' : 'ghost'} onClick={() => setPop(open && open.kind === 'left' ? null : { id: row.id, kind: 'left' })}>{row.status === 'check' ? 'Отметить остаток' : 'Осталось…'}</MasterButton>
      {row.status === 'check' ? null : <MasterButton size="sm" onClick={() => onEmpty(row)}>Закончился</MasterButton>}
    </>
  );
  return (
    <span className="cell-actions" ref={ref} onClick={(e) => e.stopPropagation()}>
      {main}
      <MasterIconButton label="Ещё действия" small onClick={() => setPop(open && open.kind === 'menu' ? null : { id: row.id, kind: 'menu' })}><Ic name="Ellipsis" size={14} /></MasterIconButton>
      {open && pos ? (
        <GrOverlay>
          {open.kind === 'left'
            ? <LeftPop row={row} pos={pos} exact={exact} onMark={(r, t) => { close(); onMark(r, t); }} onEmpty={(r) => { close(); onEmpty(r); }} />
            : <RowMenu row={row} pos={pos} form={open.form} onForm={(form) => setPop({ ...open, form })} onClose={close} />}
        </GrOverlay>
      ) : null}
    </span>
  );
}

function ShelfTable({ rows, pop, setPop, onEmpty, onMark, onOpen, exact }) {
  return (
    <MasterList
      onRowClick={(row) => onOpen(row.id)}
      columns={[
        { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.3fr)', render: (r) => <span className="inv-name"><b>{r.name}</b><span>{r.brand}</span></span> },
        { key: 'left', label: 'ОСТАТОК', width: '190px', render: (r) => <Level row={r} /> },
        { key: 'rate', label: 'РАСХОД', width: '120px', render: (r) => <GrRate row={r} /> },
        { key: 'until', label: 'ХВАТИТ ДО', width: '180px', render: (r) => <GrUntil row={r} /> },
        { key: 'arrived', label: 'ПРИХОД', width: '118px', render: (r) => <span className="inv-name"><b style={{ fontWeight: 400, fontSize: 13 }}>{r.arrived}{r.plus ? <span className="inv-faint"> · +{r.plus} г</span> : null}</b><span>{r.supplier}</span></span> },
        { key: 'mixes', label: 'МИКСЫ', width: '52px', align: 'right', render: (r) => <span className="inv-num">{r.mixes || <span className="inv-faint">—</span>}</span> },
        { key: 'actions', label: '', width: '236px', align: 'right', render: (r) => <Actions row={r} pop={pop} setPop={setPop} onEmpty={onEmpty} onMark={onMark} exact={exact} /> },
      ]}
      rows={rows}
    />
  );
}

const GR_STATUS_CHIPS = [['all', 'Все'], ['ok', 'Есть'], ['ending', 'Заканчивается'], ['check', 'Проверьте остаток'], ['out', 'Закончились'], ['stop', 'Стоп'], ['plan', 'В плане']];

function Toast({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <GrOverlay>
      <div className="inv-toast" role="status">
        <Ic name={toast.warn ? 'Info' : 'CircleCheck'} />
        <p><b>{toast.title}</b> — {toast.text}</p>
        <span className="inv-toast-timer">10 с</span>
        <MasterButton size="sm" onClick={onUndo}>Отменить <span className="inv-kbd" style={{ marginLeft: 6 }}>Z</span></MasterButton>
      </div>
    </GrOverlay>
  );
}

const GR_EV_CLASS = { receipt: 'plus', empty: 'zero', count: '', writeoff: '' };

function Drawer({ row, onClose, few }) {
  if (!row) return null;
  const hist = GR_D.rasp;
  const max = Math.max(...hist.weeks);
  const events = few
    ? [{ kind: 'receipt', grams: '+400 г', title: 'Приход', line: '12 ноя · Каспий Опт · счёт № 03944 · 3 060 ₽ · 7,65 ₽/г' }]
    : hist.events;
  return (
    <GrOverlay>
      <div className="inv-scrim" onClick={onClose} />
      <aside className="inv-drawer" aria-label={'Карточка: ' + row.name}>
        <div className="inv-drawer-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="inv-eyebrow">{row.brand} · на полке</p>
            <MasterIconButton label="Закрыть" onClick={onClose}><Ic name="X" /></MasterIconButton>
          </div>
          <h1 className="inv-h1">{row.name}</h1>
          <div className="inv-links">
            {row.profiles.map((p) => <MasterTag key={p} tone="neutral"><span className="inv-dot" style={{ background: grProfileColor(p) }} />{GR_PROFILE_LABEL[p]}</MasterTag>)}
            <a className="inv-link" href="#" onClick={(e) => e.preventDefault()}>Карточка в каталоге</a>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <Level row={row} lg />
          <div style={{ display: 'flex', gap: 8 }}>
            <MasterButton variant="primary">Закончился</MasterButton>
            <MasterButton>Сколько осталось…</MasterButton>
          </div>
        </div>

        <div className="inv-kv">
          {few ? (
            <>
              <div><span>Расход</span><b className="inv-faint">мало данных</b><small>появится после первой отметки остатка или «Закончился»</small></div>
              <div><span>Хватит до</span><b>~ 15 дек</b><small>по бренду Сарма: ≈ 8 г/день</small></div>
              <div><span>Остаток</span><b>≈ 380 г</b><small>из 400 г после прихода 12 ноя</small></div>
              <div><span>Цена грамма</span><b>7,65 ₽</b><small>≈ 138 ₽ на чашу 18 г</small></div>
            </>
          ) : (
            <>
              <div><span>Хватит до</span><b>9 дек</b><small>20 дней</small></div>
              <div><span>Остаток</span><b>≈ 300 г</b><small>330 г по отметке 17 ноя</small></div>
              <div><span>Расход</span><b>14,7 г/день</b><small>по 3 отметкам за 60 дней</small></div>
              <div><span>Цена грамма</span><b>7,75 ₽</b><small>≈ 140 ₽ на чашу 18 г</small></div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <h3 className="inv-h3">История</h3>
          <div className="gr-hist">
            {events.map((e, i) => (
              <div className="gr-ev" key={i}>
                <span className={'gr-ev-g ' + GR_EV_CLASS[e.kind]}>{e.grams}</span>
                <span className="gr-ev-copy"><b>{e.title}</b><span>{e.line}</span></span>
                <MasterIconButton label="Исправить или удалить" small><Ic name="Ellipsis" size={14} /></MasterIconButton>
              </div>
            ))}
          </div>
        </div>

        {!few ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <h3 className="inv-h3">Расход по неделям, г/день</h3>
            <div className="inv-bars">
              {hist.weeks.map((v, i) => (
                <div className={'inv-bar' + (i === hist.weeks.length - 1 ? ' partial' : '')} key={i}>
                  <span>{grNum(v)}</span>
                  <i style={{ height: (v / max) * 70 + 'px' }} />
                </div>
              ))}
            </div>
            <div className="inv-bar-labels">{hist.weekLabels.map((l) => <span key={l}>{l}</span>)}</div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 2 }}>
          <h3 className="inv-h3">Настройки</h3>
          <div className="inv-setting"><span>Держим постоянно<small>закончится — попадёт в «К заказу»</small></span><MasterToggle checked label="Держим постоянно" /></div>
          <div className="inv-setting"><span>Стоп для гостей<small>табак есть, но гостю не предлагать</small></span><MasterToggle checked={false} label="Стоп для гостей" /></div>
        </div>
      </aside>
    </GrOverlay>
  );
}

function Reorder({ copied }) {
  return (
    <div className="page">
      {GR_D.reorder.map((g) => (
        <section className="inv-order" key={g.supplier}>
          <header className="inv-order-head">
            <h3>{g.supplier}</h3>
            <span className="inv-muted" style={{ flex: 1 }}>{g.lastInvoice}</span>
            <span className="inv-num inv-muted">{g.sum}</span>
            <MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Скопировать заказ</MasterButton>
          </header>
          <div className="inv-order-row th"><span>Табак</span><span>Хватит до</span><span>Расход · остаток</span><span>Заказать</span><span>Цена грамма</span></div>
          {g.items.map((it) => (
            <div className="inv-order-row" key={it.name}>
              <span>{it.name}</span>
              <span className={it.days === 0 ? 'inv-danger' : it.check ? 'inv-warn' : it.days != null && it.days <= 7 ? 'inv-warn' : 'inv-faint'}>{it.until}{it.days ? ' · ' + it.days + ' дн' : ''}</span>
              <span className="inv-num">{it.rate ? it.rate + ' г/день · ' + it.left + ' г' : <span className="inv-faint">≈ {it.brandRate} г/день · бренд</span>}</span>
              <span className="inv-stepper"><button>−</button><span style={{ minWidth: 52 }}>{it.qty} г</span><button>+</button></span>
              <span className="inv-num">{it.gram}</span>
            </div>
          ))}
        </section>
      ))}
      {copied ? (
        <MasterCard eyebrow="СКОПИРОВАНО" heading="Текст для чата с поставщиком">
          <pre className="inv-copy">{'Добрый день! Заказ:\nBlack Burn Cane Mint — 450 г\nSebero Лимонная шипучка — 350 г\nХулиган Panama — 150 г\nСпасибо!'}</pre>
        </MasterCard>
      ) : null}
      <p className="hint">Заказать — расход на 21 день минус остаток, вверх до 50 г; шаг ± 50 г. Срок поставки — 7 дней (настройка точки).</p>
    </div>
  );
}

function ShelfScreen({ init = {}, onTab }) {
  const [rows, setRows] = React.useState(init.rows || GR_D.shelf);
  const [status, setStatus] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [pop, setPop] = React.useState(init.pop || null);
  const [toast, setToast] = React.useState(init.toast || null);
  const [drawer, setDrawer] = React.useState(init.drawer || null);
  const [view, setView] = React.useState(init.view || 'shelf');
  const [sort, setSort] = React.useState('until');
  const prev = React.useRef(null);

  const onEmpty = (row) => {
    prev.current = rows;
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, left: 0, status: 'out', until: 'закончился сегодня', days: 0 } : r)));
    setToast({ title: row.brand + ' ' + row.name, text: 'закончился: 0 г, гости его больше не видят' + (row.mixes ? '. Миксов скрыто: ' + row.mixes : '') + '. Добавлен в «К заказу».' });
  };
  const onMark = (row, text) => setToast({ title: row.brand + ' ' + row.name, text: 'осталось ' + text + '. Расход и «хватит до» пересчитаны.' });
  const undo = () => { if (prev.current) setRows(prev.current); setToast(null); };

  const shown = rows
    .filter((r) => status === 'all' || r.status === status)
    .filter((r) => !q || (r.brand + ' ' + r.name).toLowerCase().includes(q.toLowerCase()));
  const s = GR_D.stats;
  const drawerRow = rows.find((r) => r.id === drawer);

  return (
    <div className="page">
      <MasterPageHeader
        eyebrow={'ИНВЕНТАРИЗАЦИЯ · ' + GR_D.today}
        title="Полка"
        subtitle="Сколько табака осталось, расход и прогноз. Закончился — одна кнопка, остаток — когда удобно."
        meta={s.shelf + ' позиций · ≈ ' + s.kg + ' кг'}
        actions={<>
          <span className="inv-seg">
            <button aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>Полка</button>
            <button aria-pressed={view === 'reorder'} onClick={() => setView('reorder')}>К заказу · 5</button>
          </span>
          <MasterButton variant="ghost">Добавить из каталога</MasterButton>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />} onClick={() => onTab && onTab('parse')}>Загрузить счёт</MasterButton>
        </>}
      />
      <MasterStatsRow tiles={[
        { label: 'НА ПОЛКЕ', value: s.shelf, hint: '≈ ' + s.kg + ' кг табака' },
        { label: 'ЗАКАНЧИВАЕТСЯ', value: s.ending, hint: 'хватит на 7 дней и меньше', tone: 'warning' },
        { label: 'ЗАКОНЧИЛИСЬ', value: s.out, hint: 'держим постоянно — в «К заказу»', tone: 'danger' },
        { label: 'СЕГОДНЯ УЙДЁТ', value: '≈ ' + s.todayG + ' г', hint: '≈ ' + s.todayBowls + ' чаш по 18 г · четверг +8 %' },
      ]} />
      {view === 'reorder' ? <Reorder copied={init.copied} /> : (
        <>
          <div className="toolbar">
            <MasterInput icon={<Ic name="Search" size={14} />} placeholder="Табак или бренд   /" value={q} onChange={setQ} style={{ minWidth: 240 }} />
            <div className="toolbar-filters">
              {GR_STATUS_CHIPS.map(([key, label]) => <FilterChip key={key} active={status === key} count={GR_D.statusCounts[key]} onClick={() => setStatus(key)}>{label}</FilterChip>)}
            </div>
            <MasterSortPill value={sort} onChange={setSort} options={[{ key: 'until', label: 'Хватит до' }, { key: 'rate', label: 'По расходу' }, { key: 'left', label: 'По остатку' }, { key: 'name', label: 'По названию' }]} />
          </div>
          <ShelfTable rows={shown} pop={pop} setPop={setPop} onEmpty={onEmpty} onMark={onMark} onOpen={setDrawer} exact={init.exact} />
          {!shown.length ? <EmptyState>По фильтрам ничего. Полка на месте, просто не здесь.</EmptyState> : null}
          <div className="inv-keys">
            <span><b className="inv-kbd">/</b> поиск</span>
            <span><b className="inv-kbd">↑</b><b className="inv-kbd">↓</b> строка</span>
            <span><b className="inv-kbd">E</b> закончился</span>
            <span><b className="inv-kbd">O</b> сколько осталось</span>
            <span><b className="inv-kbd">1</b>–<b className="inv-kbd">4</b> осталось ¾ ½ ⅓ ¼</span>
            <span><b className="inv-kbd">Enter</b> карточка</span>
            <span><b className="inv-kbd">Z</b> отменить</span>
          </div>
        </>
      )}
      <Toast toast={toast} onUndo={undo} />
      <Drawer row={drawerRow} few={init.few} onClose={() => setDrawer(null)} />
    </div>
  );
}

const GR_MATCH_TAG = {
  memory: <MasterTag tone="success">по памяти</MasterTag>,
  suggest: <MasterTag tone="warning">проверьте</MasterTag>,
  none: <MasterTag tone="danger">не найдено</MasterTag>,
  skip: <MasterTag tone="ghost">не табак</MasterTag>,
};

// Разбор счёта: меняются только колонки количества — строка счёта превращается в граммы.
function Parse() {
  const P = GR_INV.parse;
  const lines = P.lines.map((l, i) => ({ ...l, i, came: !(l.name === 'Pear lemonade') }));
  const grams = lines.filter((l) => l.match !== 'skip' && l.came).reduce((n, l) => n + l.qty * l.grams, 0);
  const pending = lines.filter((l) => l.match === 'none' || (l.match === 'suggest' && (l.confidence || 0) < 50)).length;
  return (
    <div className="page">
      <MasterPageHeader
        eyebrow="ПОСТАВКА · ЧЕРНОВИК"
        title={P.title}
        subtitle={P.supplier + ' · загружен 18 ноя · PDF, 1 страница'}
        meta={'итог счёта ' + P.total}
        actions={<><MasterButton variant="ghost" icon={<Ic name="FileText" size={14} />}>Открыть PDF</MasterButton><MasterButton variant="ghost">Удалить черновик</MasterButton></>}
      />
      <MasterList
        columns={[
          { key: 'n', label: '№', width: '34px', render: (r) => <span className="inv-faint inv-num">{r.i + 1}</span> },
          { key: 'raw', label: 'СТРОКА СЧЁТА', width: 'minmax(0,1.35fr)', wrap: true, render: (r) => <span className={'inv-raw' + (r.match === 'skip' ? ' inv-skip' : '')}>{r.raw}</span> },
          { key: 'match', label: 'ТАБАК НА ПОЛКЕ', width: 'minmax(0,1.1fr)', render: (r) => {
            if (r.match === 'skip') return <span className="inv-faint">Пропущено</span>;
            if (r.match === 'none') return <span className="inv-match"><span className="inv-select danger">Выбрать табак… <Ic name="ChevronDown" size={13} /></span><small>{r.hint}</small></span>;
            return <span className="inv-match"><span className={'inv-select' + (r.match === 'suggest' ? ' warn' : '')}><span><b>{r.name}</b> <span className="inv-faint">{r.brand}</span></span><Ic name="ChevronDown" size={13} /></span></span>;
          } },
          { key: 'tag', label: '', width: '100px', render: (r) => GR_MATCH_TAG[r.match] },
          { key: 'grams', label: 'ПРИХОД', width: '150px', render: (r) => (r.match === 'skip' ? <span className="inv-faint">—</span> : (
            <span className="inv-match">
              <span className={'gr-input' + (r.came ? '' : ' inv-skip')} style={{ width: 84 }}><b>{r.qty * r.grams}</b><span>г</span></span>
              <small>{r.qty > 1 ? r.qty + ' × ' + r.grams + ' г по счёту' : r.grams + ' г по счёту'}</small>
            </span>
          )) },
          { key: 'price', label: 'СУММА', width: '84px', align: 'right', render: (r) => <span className="inv-num">{r.sum}</span> },
          { key: 'came', label: 'ПРИШЛО', width: '70px', align: 'center', render: (r) => (r.match === 'skip' ? null : <MasterToggle checked={r.came} onChange={() => {}} label="Пришло" />) },
        ]}
        rows={lines}
      />
      <div className="inv-footbar">
        <span className="inv-date">Дата прихода <b>19.11.2026</b></span>
        <p className="grow"><span className="inv-ok">Сумма строк 22 270 ₽ = итог счёта</span>{' · на полку ≈ ' + grNum((grams / 1000).toFixed(1)) + ' кг'}{pending ? <span className="inv-warn">{' · без табака: ' + pending + ' строки'}</span> : null}</p>
        <MasterButton variant="ghost">Сохранить черновик</MasterButton>
        <MasterButton variant="primary" disabled={pending > 0}>{pending ? 'Выберите табак в ' + pending + ' строках' : 'Принять поставку'}</MasterButton>
      </div>
    </div>
  );
}

function GrApp({ start = 'shelf', init = {} }) {
  const [tab, setTab] = React.useState(start);
  const top = tab === 'parse' ? 'deliveries' : tab;
  let screen;
  if (tab === 'shelf') screen = <ShelfScreen init={init} onTab={setTab} />;
  else if (tab === 'parse' || tab === 'deliveries') screen = <Parse />;
  else screen = <EmptyState>Экран не меняется в этой фиче, кроме слова «банка» в подписях.</EmptyState>;
  return <GrShell tab={top} onTab={setTab}>{screen}</GrShell>;
}

// ── Телефон ──
function MShelf({ sheet, exact }) {
  const [open, setOpen] = React.useState(sheet ? 'bb-rasp' : null);
  const [frac, setFrac] = React.useState(null);
  const [value, setValue] = React.useState(exact || '');
  const rows = GR_D.shelf.filter((r) => ['bb-cane', 'ds-blackcurrant', 'hl-panama', 'bb-pear', 'bb-rasp', 'ds-peach'].includes(r.id));
  const row = GR_D.shelf.find((r) => r.id === open);
  return (
    <div className="phone">
      <header className="m-top">
        <img src={GR_MARK} alt="" />
        <h1>Полка</h1>
        <MasterIconButton label="К заказу"><Ic name="ShoppingCart" /></MasterIconButton>
      </header>
      <div className="m-body">
        <div className="m-search"><Ic name="Search" size={16} /> Табак или бренд</div>
        <div className="m-chips">
          <FilterChip active count={269}>Все</FilterChip>
          <FilterChip count={14}>Заканчивается</FilterChip>
          <FilterChip count={9}>Проверьте</FilterChip>
          <FilterChip count={6}>Закончились</FilterChip>
        </div>
        {rows.map((r) => (
          <article className="m-card" key={r.id}>
            <span className="inv-name"><b>{r.name}</b><span>{r.brand}</span></span>
            <span style={{ fontSize: 13, textAlign: 'right' }}><GrUntil row={r} /></span>
            <div className="m-card-meta"><Level row={r} /></div>
            <div className="m-acts">
              <button className="m-ghost-btn" onClick={() => setOpen(r.id)}>{r.status === 'check' ? 'Отметить остаток' : 'Осталось…'}</button>
              <button className="m-empty-btn">Закончился</button>
            </div>
          </article>
        ))}
      </div>
      <nav className="m-nav"><span>Дашборд</span><span className="on">Полка</span><span>Поставки</span><span>Ещё</span></nav>
      {row ? (
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
                {GR_FRACS.map(([f, k]) => (
                  <button key={f} className={'m-frac' + (frac === f ? ' on' : '')} onClick={() => { setFrac(f); setValue(''); }}>{f}<small>{Math.round(row.full * k)} г</small></button>
                ))}
              </div>
              <h3 className="inv-h3" style={{ marginTop: 6 }}>Или точно, если взвесили</h3>
              <div className="m-exact">
                <span className={'gr-input' + (value ? ' on' : '')} onClick={() => { setValue(value || '180'); setFrac(null); }}><b>{value || <span className="inv-faint">граммы</span>}</b><span>г</span></span>
                <button className="m-save" disabled={!value && !frac}>Сохранить</button>
              </div>
              <span className="inv-faint" style={{ fontSize: 12 }}>Можно не отмечать — отметка только уточняет расход и прогноз.</span>
            </div>
            <button className="m-big">Закончился · 0 г</button>
          </section>
        </>
      ) : null}
    </div>
  );
}

// ── Кадры доски и режим #shot= ──
const grWith = (id, patch) => GR_D.shelf.map((r) => (r.id === id ? { ...r, ...patch } : r));
const GR_SHOTS = [
  { id: 'shelf', group: 'shelf', name: 'Полка', note: 'Остаток в граммах: полоса — доля от уровня после прихода. «Осталось…» и «Закончился» в строке, банок нет.', start: 'shelf' },
  { id: 'shelf-left', group: 'shelf', name: 'Полка · «Сколько осталось?»', note: 'Доля ¾ ½ ⅓ ¼ от уровня после прихода — с граммами на кнопке. Или точно в граммах.', start: 'shelf', init: { pop: { id: 'bb-rasp', kind: 'left' } } },
  { id: 'shelf-left-exact', group: 'shelf', name: 'Полка · остаток точно в граммах', note: 'Взвесили — вписали число, «Сохранить».', start: 'shelf', init: { pop: { id: 'bb-rasp', kind: 'left' }, exact: '180' } },
  { id: 'shelf-menu', group: 'shelf', name: 'Полка · меню строки', note: 'Редкие действия: приход без счёта, списание, стоп, убрать с полки.', start: 'shelf', init: { pop: { id: 'ds-blackcurrant', kind: 'menu' } } },
  { id: 'shelf-receipt', group: 'shelf', name: 'Полка · приход без счёта', note: 'Вместо «Добавить банку вручную» — граммы и, по желанию, цена.', start: 'shelf', init: { pop: { id: 'bb-pear', kind: 'menu', form: 'receipt' } } },
  { id: 'shelf-writeoff', group: 'shelf', name: 'Полка · списание', note: 'Вместо «Списать банку» — граммы и причина; по умолчанию весь остаток.', start: 'shelf', init: { pop: { id: 'ds-blackcurrant', kind: 'menu', form: 'writeoff' } } },
  { id: 'shelf-undo', group: 'shelf', name: 'Полка · «Закончился» и отмена', note: 'Одно нажатие = 0 г, 10 секунд на отмену, гость сразу перестаёт видеть табак.', start: 'shelf', init: { rows: grWith('bb-cane', { left: 0, status: 'out', until: 'закончился сегодня', days: 0 }), toast: { title: 'Black Burn Cane Mint', text: 'закончился: 0 г, гости его больше не видят. Миксов скрыто: 3. Добавлен в «К заказу».' } } },
  { id: 'shelf-drawer', group: 'shelf', name: 'Карточка на полке', note: 'История вместо банок: приходы, отметки, «Закончился», списания. Расход по неделям.', start: 'shelf', init: { drawer: 'bb-rasp' }, tall: true },
  { id: 'reorder', group: 'shelf', name: 'К заказу', note: 'Количество в граммах: расход на 21 день минус остаток. Текст заказа — тоже в граммах.', start: 'shelf', init: { view: 'reorder', copied: true }, tall: true },
  { id: 'delivery-parse', group: 'deliveries', name: 'Разбор счёта', note: 'Строка счёта «2 × 200 г» на приёмке становится «+400 г». Граммы можно поправить, если пришло не всё.', start: 'parse', tall: true },
  { id: 'edge-more', group: 'edge', name: 'Отметили больше, чем по расчёту', note: 'Досыпали без счёта или раньше ошиблись: отметка принимается, расход этого отрезка не считается.', start: 'shelf', init: { toast: { warn: true, title: 'DARKSIDE Bittersweet', text: 'осталось 700 г — больше, чем по расчёту (≈ 600 г). Отметку сохранили, расход за этот отрезок не считаем.' } } },
  { id: 'edge-check', group: 'edge', name: 'Должен был закончиться', note: 'Расчёт ушёл ниже 10 % уровня после прихода. Гость табак видит, пока мастер не скажет обратное.', start: 'shelf', init: { pop: { id: 'hl-panama', kind: 'left' } } },
  { id: 'edge-few', group: 'edge', name: 'Мало данных о расходе', note: 'Прогноз по бренду, пока нет ни одной отметки после прихода.', start: 'shelf', init: { drawer: 'sr-passion', few: true }, tall: true },
  { id: 'shelf-mobile', group: 'mobile', name: 'Полка · 375 px', phone: true },
  { id: 'shelf-mobile-sheet', group: 'mobile', name: 'Шторка «Сколько осталось?»', phone: true, sheet: true },
  { id: 'shelf-mobile-exact', group: 'mobile', name: 'Шторка · точно в граммах', phone: true, sheet: true, exact: '180' },
];

function ShotView({ shot }) {
  if (shot.phone) return <MShelf sheet={shot.sheet} exact={shot.exact} />;
  return <GrDesk tall={shot.tall}><GrApp start={shot.start} init={shot.init} /></GrDesk>;
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
  const section = (group) => GR_SHOTS.filter((s) => s.group === group).map((s) => <Frame key={s.id} shot={s} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#306 · Мастер · десктоп 1280 и телефон 375</p>
        <h1 className="board-title">Инвентарь в граммах</h1>
        <p className="board-text">
          У табака на полке нет банок — есть остаток в граммах. Его меняют четыре события: приход (+ г из счёта),
          отметка «осталось» (долей от уровня после прихода или точно в граммах), «Закончился» (0 г) и списание (− г).
          Расход считается между отметками: было + пришло − списано − стало. Из него — «хватит до», «К заказу» и дашборд.
          Табаки и счёт — из мокапа #152, «сегодня» 19 ноября.
        </p>
      </header>
      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <p className="frame-note">«Осталось…», «Закончился» и отмена; меню «⋯»; клик по строке — карточка; «К заказу»; «Загрузить счёт» — разбор.</p>
        <GrDesk><GrApp start="shelf" /></GrDesk>
      </section>
      <section className="board-section"><h2 className="board-h2">Полка</h2><div className="board-row">{section('shelf')}</div></section>
      <section className="board-section"><h2 className="board-h2">Телефон за стойкой</h2><div className="board-row">{section('mobile')}</div></section>
      <section className="board-section"><h2 className="board-h2">Поставки</h2><div className="board-row">{section('deliveries')}</div></section>
      <section className="board-section"><h2 className="board-h2">Края</h2><div className="board-row">{section('edge')}</div></section>
    </div>
  );
}

function Shot({ id }) {
  const shot = GR_SHOTS.find((s) => s.id === id) || GR_SHOTS[0];
  return <div className="shot"><ShotView shot={shot} /></div>;
}

const grShotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(grShotId ? <Shot id={grShotId} /> : <Board />);
