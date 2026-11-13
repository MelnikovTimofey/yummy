/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterTopBar, FilterChip, MasterSortPill } = window.DesignSystem_1aef33;
const PL = window.PL;
const MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

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

const OverlayCtx = React.createContext(null);
function Overlay({ children }) {
  const node = React.useContext(OverlayCtx);
  return node ? ReactDOM.createPortal(children, node) : null;
}
function Desk({ children }) {
  const [node, setNode] = React.useState(null);
  return (
    <div className="desk">
      <OverlayCtx.Provider value={node}><div className="desk-scroll">{children}</div></OverlayCtx.Provider>
      <div ref={setNode} />
    </div>
  );
}

function Shell({ tab, children }) {
  return (
    <main className="shell">
      <MasterTopBar markSrc={MARK} items={TABS} active={tab} userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">{children}</section>
    </main>
  );
}

const rowOf = (id) => PL.shelf.find((r) => r.id === id);

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <Overlay>
      <div className="ss-toast" role="status">
        <div><b>{toast.title}</b><span>{toast.text}</span></div>
        <span className="ss-timer">10 с</span>
        {toast.undo === false ? null : <MasterButton size="sm">Отменить</MasterButton>}
      </div>
    </Overlay>
  );
}

// ── Полка (S1, S2) ──
function Status({ row }) {
  if (row.status === 'out') return <span className="ss-two"><span className="ss-status out"><i />Закончился {row.outAt}</span><small>{row.keep ? 'в заявке' : 'не держим'}</small></span>;
  if (row.status === 'stop') return <span className="ss-two"><span className="ss-status stop"><i />Стоп для гостей</span><small>{row.stopNote}</small></span>;
  if (row.status === 'plan') return <span className="ss-two"><span className="ss-status plan"><i />В плане</span><small>с {row.planned}</small></span>;
  return <span className="ss-status"><i />Есть</span>;
}

function RowAction({ row, onIn }) {
  if (row.status === 'out') return <MasterButton size="sm" variant="ghost">Вернуть в наличие</MasterButton>;
  if (row.status === 'stop') return <MasterButton size="sm" variant="ghost">Снять стоп</MasterButton>;
  if (row.status === 'plan') return <MasterButton size="sm" variant="ghost" onClick={() => onIn(row)}>В наличие</MasterButton>;
  return <MasterButton size="sm">Закончился</MasterButton>;
}

function RowMenu() {
  return (
    <div className="pl-menu" role="menu">
      <button role="menuitem">Карточка в каталоге</button>
      <button role="menuitem" className="danger">Убрать из плана</button>
    </div>
  );
}

function ShelfScreen({ init = {} }) {
  const [drawer, setDrawer] = React.useState(init.drawer || null);
  const [toast, setToast] = React.useState(init.toast || null);
  const onlyPlan = init.filter === 'plan';
  // После прихода по счёту 1207: Caramel и Clover Club — «Есть» и проба.
  const arrived = (r) => (['bn-caramel', 'bn-clover'].includes(r.id) ? { ...r, status: 'in', trial: true, keep: false, arrived: '12 ноя', supplier: 'Каспий Опт' } : r);
  const rows = onlyPlan ? PL.shelf.filter((r) => r.status === 'plan') : init.trial ? PL.shelf.map(arrived).filter((r) => r.trial) : PL.shelf;
  const onIn = (r) => setToast({ title: r.name + ' есть', text: 'Появился на витрине.' });
  return (
    <Shell tab="shelf">
      <header className="ss-head">
        <h1>Полка</h1>
        <div className="ss-head-side">
          <span className="ss-meta">{PL.total} табаков</span>
          <div className="ss-seg" role="group" aria-label="Вид полки">
            <button aria-pressed="true">Полка</button>
            <button aria-pressed="false">К заказу <em>8</em></button>
          </div>
          <MasterButton variant="ghost">Добавить из каталога</MasterButton>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={15} />}>Загрузить счёт</MasterButton>
        </div>
      </header>
      <div className="toolbar">
        <span className="ss-search"><Ic name="Search" size={14} /><span className="grow">Табак или бренд</span><span className="ss-kbd">/</span></span>
        <div className="toolbar-filters">
          <FilterChip active={!onlyPlan && !init.trial} count={PL.counts.all}>Все</FilterChip>
          <FilterChip count={PL.counts.in}>Есть</FilterChip>
          <FilterChip count={PL.counts.out}>Закончились</FilterChip>
          <FilterChip count={PL.counts.stop}>Стоп</FilterChip>
          <FilterChip active={onlyPlan} count={PL.counts.plan}>В плане</FilterChip>
          <FilterChip active={!!init.trial} count={PL.counts.trial}>Проба</FilterChip>
        </div>
        <MasterButton size="sm" variant="ghost">Фильтры</MasterButton>
        <MasterSortPill value="status" options={[{ key: 'status', label: 'Наличие' }, { key: 'name', label: 'Название' }, { key: 'arrived', label: 'Приход' }]} />
      </div>
      <div className="ss-table" role="table">
        <div className="ss-row th" role="row">
          <span className="ss-check" />
          <span>Табак</span><span>Наличие</span><span>Приход</span><span className="ss-right">Миксы</span><span>Держим</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={r.id} className="ss-row" role="row" onClick={() => setDrawer(r.id)}>
            <span className="ss-check" onClick={(e) => e.stopPropagation()} />
            <span className="ss-name"><b>{r.name}{r.trial ? <MasterTag tone="ghost">проба</MasterTag> : null}</b><span>{r.brand}</span></span>
            <Status row={r} />
            {r.arrived ? <span className="ss-two"><span className="ss-num">{r.arrived}</span><small>{r.supplier}</small></span> : <span className="ss-faint">—</span>}
            <span className="ss-right ss-num">{r.mixes || <span className="ss-faint">—</span>}</span>
            <span className="ss-muted">{r.status !== 'plan' && r.keep ? <Ic name="Check" size={15} /> : null}</span>
            <span className="cell-actions ss-right" onClick={(e) => e.stopPropagation()}>
              <RowAction row={r} onIn={onIn} />
              <span className={'ss-more' + (init.menu && i === init.menu ? ' on' : '')} aria-label="Ещё"><Ic name="Ellipsis" size={16} /></span>
              {init.menu && i === init.menu ? <RowMenu /> : null}
            </span>
          </div>
        ))}
      </div>
      {drawer ? <ShelfCard id={drawer} trial={init.trial} onClose={() => setDrawer(null)} /> : null}
      <Toast toast={toast} />
    </Shell>
  );
}

// ── Карточка табака: план (S2) и проба после прихода из плана (S7) ──
function ShelfCard({ id, trial, onClose }) {
  if (trial) return <TrialCard verdict={trial} onClose={onClose} />;
  const r = rowOf(id);
  const plan = r.status === 'plan';
  const mixes = PL.mixesOf[id] || [];
  return (
    <Overlay>
      <div className="ss-scrim" onClick={onClose} />
      <aside className="ss-drawer" role="dialog" aria-label={r.brand + ' ' + r.name}>
        <div className="ss-dhead">
          <div><h2>{r.name}</h2><p>{r.brand}</p></div>
          <MasterIconButton label="Закрыть" small onClick={onClose}><Ic name="X" size={14} /></MasterIconButton>
        </div>
        <div className="ss-block">
          <div className="ss-state" role="group" aria-label="Наличие">
            <button aria-pressed={!plan && r.status !== 'out'}><i />Есть</button>
            {plan
              ? <button className="plan" aria-pressed="true"><i />В плане с {r.planned}</button>
              : <button className="out" aria-pressed={r.status === 'out'}><i />Закончился</button>}
          </div>
          {plan ? <p className="ss-note">Встанет «Есть» сам, когда примете счёт с этим табаком.</p> : null}
        </div>
        {plan ? null : (
          <div className="ss-block">
            <div className="ss-setting"><span>Держим постоянно<small>Закончится, попадёт в заявку</small></span><MasterToggle checked={r.keep} /></div>
            <div className="ss-setting"><span>Стоп для гостей<small>Есть на полке, но гостю не предлагаем</small></span><MasterToggle checked={r.status === 'stop'} /></div>
          </div>
        )}
        <div className="ss-block">
          <h3 className="ss-h3">В миксах</h3>
          {mixes.length ? (
            <div className="ss-list">
              {mixes.map((m) => <div key={m.name} className="ss-li"><b style={{ fontWeight: 400 }}>{m.name}</b><span>{m.state}</span></div>)}
            </div>
          ) : <p className="ss-note">Ни в одном миксе.</p>}
        </div>
        {plan ? <div><MasterButton variant="ghost" icon={<Ic name="CircleMinus" size={14} />}>Убрать из плана</MasterButton></div> : null}
      </aside>
    </Overlay>
  );
}

function TrialCard({ verdict, onClose }) {
  const yes = verdict === 'yes';
  return (
    <Overlay>
      <div className="ss-scrim" onClick={onClose} />
      <aside className="ss-drawer" role="dialog" aria-label="Bonche Caramel">
        <div className="ss-dhead">
          <div><h2>Caramel</h2><p>Bonche</p></div>
          <MasterIconButton label="Закрыть" small onClick={onClose}><Ic name="X" size={14} /></MasterIconButton>
        </div>
        <div className="ss-block">
          <div className="ss-state" role="group" aria-label="Наличие">
            <button aria-pressed="true"><i />Есть</button>
            <button className="out" aria-pressed="false"><i />Закончился</button>
          </div>
        </div>
        <section className="pl-trial" aria-label="Проба">
          <p className="pl-trial-head"><b>Проба</b><span>пришёл впервые 12 ноя, из плана</span></p>
          <div className="pl-verdict" role="group" aria-label="Как зашёл">
            <button aria-pressed={yes}><Ic name="ThumbsUp" size={14} />Зашло</button>
            <button aria-pressed="false"><Ic name="ThumbsDown" size={14} />Не зашло</button>
          </div>
          {yes ? (
            <div className="pl-suggest">
              <span>Держать постоянно?<small>Закончится, попадёт в заявку</small></span>
              <MasterButton size="sm">Держать постоянно</MasterButton>
            </div>
          ) : null}
        </section>
        <div className="ss-block">
          <div className="ss-setting"><span>Держим постоянно<small>Закончится, попадёт в заявку</small></span><MasterToggle checked={false} /></div>
          <div className="ss-setting"><span>Стоп для гостей<small>Есть на полке, но гостю не предлагаем</small></span><MasterToggle checked={false} /></div>
        </div>
        <div className="ss-block">
          <h3 className="ss-h3">В миксах</h3>
          <div className="ss-list"><div className="ss-li"><b style={{ fontWeight: 400 }}>Карамельный попкорн</b><span>на витрине</span></div></div>
        </div>
        <div className="ss-block">
          <h3 className="ss-h3">Приходы</h3>
          <div className="ss-list"><div className="ss-li"><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>12 ноя, Каспий Опт</span><span>2 шт., счёт 1207</span></div></div>
        </div>
      </aside>
    </Overlay>
  );
}

// ── К заказу (S3) ──
function PlanBlock() {
  return (
    <section className="ss-order">
      <header className="ss-order-head">
        <h2>В плане</h2>
        <span className="grow" />
        <MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Скопировать список</MasterButton>
      </header>
      <div className="ss-orow pl-orow th"><span>Табак</span><span>В плане с</span><span>Миксы</span><span /></div>
      {PL.planOrder.map((r) => (
        <div key={r.id} className="ss-orow pl-orow">
          <span>{r.name}</span>
          <span className={'ss-num' + (r.planned === '12 сен' ? ' pl-stale' : ' ss-muted')}>{r.planned}</span>
          <span className={r.mixes ? '' : 'ss-faint'}>{r.mixes || 'нет в миксах'}</span>
          <span className="cell-actions ss-right"><span className="ss-more" aria-label="Ещё"><Ic name="Ellipsis" size={16} /></span></span>
        </div>
      ))}
    </section>
  );
}

function OrderScreen({ onlyPlan }) {
  return (
    <Shell tab="shelf">
      <header className="ss-head">
        <h1>Полка</h1>
        <div className="ss-head-side">
          <span className="ss-meta">{PL.total} табаков</span>
          <div className="ss-seg" role="group" aria-label="Вид полки">
            <button aria-pressed="false">Полка</button>
            <button aria-pressed="true">К заказу <em>{onlyPlan ? 4 : 8}</em></button>
          </div>
          <MasterButton variant="ghost">Добавить из каталога</MasterButton>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={15} />}>Загрузить счёт</MasterButton>
        </div>
      </header>
      {onlyPlan ? <div className="ss-notkept"><Ic name="CircleCheck" size={15} /><span className="grow">Закончившихся нет, всё, что держим, в наличии.</span></div> : PL.order.map((g) => (
        <section key={g.supplier} className="ss-order">
          <header className="ss-order-head">
            <h2>{g.supplier}</h2>
            <span className="ss-muted" style={{ fontSize: 13 }}>{g.last}</span>
            <span className="grow" />
            <MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Скопировать заявку</MasterButton>
          </header>
          <div className="ss-orow th"><span>Табак</span><span>Закончился</span><span>Миксы</span><span>Последний приход</span></div>
          {g.rows.map((r) => (
            <div key={r.name} className="ss-orow">
              <span>{r.name}</span>
              <span className="ss-danger ss-num">{r.outAt}</span>
              <span className={r.muted ? 'ss-muted' : ''}>{r.mixes}</span>
              <span className="ss-num ss-muted">{r.arrived}</span>
            </div>
          ))}
        </section>
      ))}
      <PlanBlock />
    </Shell>
  );
}

// ── Каталог (S4) ──
function CatalogScreen() {
  return (
    <Shell tab="catalog">
      <header className="ss-head">
        <h1>Каталог</h1>
        <div className="ss-head-side">
          <span className="ss-meta">11 482 табака</span>
          <div className="ss-seg" role="group" aria-label="Вид каталога">
            <button aria-pressed="true">Все</button>
            <button aria-pressed="false">Идеи для закупки</button>
          </div>
          <MasterButton variant="ghost" icon={<Ic name="Plus" size={15} />}>Своя карточка</MasterButton>
        </div>
      </header>
      <div className="toolbar">
        <span className="ss-search on"><Ic name="Search" size={14} /><span className="grow">Bonche, Догма</span><span className="ss-kbd">/</span></span>
        <div className="toolbar-filters">
          <FilterChip active count={8}>Все</FilterChip>
          <FilterChip count={3}>На полке</FilterChip>
          <FilterChip count={2}>В плане</FilterChip>
          <FilterChip count={3}>Не на полке</FilterChip>
        </div>
        <MasterSortPill value="rating" options={[{ key: 'rating', label: 'Рейтинг' }, { key: 'name', label: 'Название' }]} />
      </div>
      <div className="ss-table" role="table">
        <div className="pl-crow th" role="row"><span>Табак</span><span>Профили</span><span className="ss-right">Рейтинг</span><span className="ss-right">Оценок</span><span>Полка</span></div>
        {PL.catalog.map((t) => (
          <div key={t.id} className="pl-crow" role="row">
            <span className="ss-name"><b>{t.name}</b><span>{t.brand}</span></span>
            <span className="pl-tags">{t.profiles.map((p) => <MasterTag key={p} tone="neutral">{p}</MasterTag>)}</span>
            <span className="ss-right ss-num">{t.rating}</span>
            <span className="ss-right ss-num ss-muted">{t.votes}</span>
            <span className="cell-actions">
              {t.shelf === 'in' ? <MasterTag tone="success">на полке</MasterTag>
                : t.shelf === 'plan' ? <MasterTag tone="info">в плане</MasterTag>
                : <><MasterButton size="sm">На полку</MasterButton><MasterButton size="sm" variant="ghost">В план</MasterButton></>}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ── Поставка (S5, S7) ──
function DeliveryScreen({ accepted }) {
  const d = PL.delivery;
  return (
    <Shell tab="deliveries">
      <header className="ss-head">
        <div className="pl-crumbs"><span className="ss-muted">Поставки</span><h1>{d.supplier}, счёт {d.number}</h1></div>
        <div className="ss-head-side">
          <span className="ss-meta">от {d.date}</span>
          {accepted ? <MasterTag tone="success" dot>принята</MasterTag> : <MasterButton variant="primary">Принять поставку</MasterButton>}
        </div>
      </header>
      <div className="ss-table" role="table">
        <div className="pl-drow th" role="row"><span>Строка счёта</span><span>Табак</span><span className="ss-right">Кол-во</span><span className="ss-right">Сумма</span><span /></div>
        {d.lines.map((l) => (
          <div key={l.raw} className="pl-drow" role="row">
            <span className="ss-muted">{l.raw}</span>
            <span>{l.tobacco}</span>
            <span className="ss-right ss-num">{l.qty} шт.</span>
            <span className="ss-right ss-num">{l.price}</span>
            <span>{l.tag === 'plan' ? <MasterTag tone="info">из плана</MasterTag> : l.tag === 'out' ? <MasterTag tone="ghost">закончился</MasterTag> : null}</span>
          </div>
        ))}
        <div className="pl-drow pl-total"><span /><span className="ss-muted">Итого</span><span className="ss-right ss-num">6 шт.</span><span className="ss-right ss-num">7 380 ₽</span><span /></div>
      </div>
      {accepted ? <Toast toast={{ title: 'Поставка принята', text: 'Из плана пришли: 2. Открылись миксы: 2.', undo: false }} /> : null}
    </Shell>
  );
}

// ── Миксы (S6) ──
function MixStatus({ m }) {
  if (m.status === 'visible') return <span className="ss-status"><i />Виден гостю</span>;
  if (m.status === 'sub') return <span className="ss-two"><span className="ss-status"><i />С заменой</span><small>{m.sub}</small></span>;
  if (m.status === 'wait') return <span className="ss-two"><span className="ss-status plan"><i />Ждёт табак из плана</span><small>{m.wait}</small></span>;
  return <span className="ss-two"><span className="ss-status out"><i />Заблокирован наличием</span><small>{m.wait}</small></span>;
}

function MixesScreen() {
  return (
    <Shell tab="mixes">
      <header className="ss-head">
        <h1>Миксы</h1>
        <div className="ss-head-side"><span className="ss-meta">64 микса</span><MasterButton variant="primary" icon={<Ic name="Plus" size={15} />}>Новый микс</MasterButton></div>
      </header>
      <div className="toolbar">
        <span className="ss-search"><Ic name="Search" size={14} /><span className="grow">Микс или табак</span><span className="ss-kbd">/</span></span>
        <div className="toolbar-filters">
          <FilterChip active count={64}>Все</FilterChip>
          <FilterChip count={52}>Видны гостю</FilterChip>
          <FilterChip count={6}>С заменой</FilterChip>
          <FilterChip count={3}>Ждут план</FilterChip>
          <FilterChip count={4}>Заблокированы</FilterChip>
        </div>
      </div>
      <div className="ss-table" role="table">
        <div className="pl-mrow th" role="row"><span>Микс</span><span>Состав</span><span>Статус</span></div>
        {PL.mixes.map((m) => (
          <div key={m.name} className="pl-mrow" role="row">
            <b className="pl-mname">{m.name}</b>
            <span className="ss-muted">{m.comp}</span>
            <MixStatus m={m} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

function MixEditScreen({ planned }) {
  const e = PL.mixEdit;
  return (
    <Shell tab="mixes">
      <header className="ss-head">
        <div className="pl-crumbs"><span className="ss-muted">Миксы</span><h1>{e.name}</h1></div>
        <div className="ss-head-side">
          <span className="ss-status plan"><i />Ждёт табак из плана</span>
          <MasterButton variant="ghost">Отмена</MasterButton>
          <MasterButton variant="primary">Сохранить</MasterButton>
        </div>
      </header>
      <section className="pl-editor">
        <h3 className="ss-h3">Состав</h3>
        <div className="ss-list">
          {e.rows.map((r) => {
            const state = r.state === 'none' && planned ? 'plan' : r.state;
            return (
              <div key={r.tobacco} className="pl-erow">
                <span className="ss-name"><b>{r.tobacco}</b><span>{r.brand}</span></span>
                <span className="pl-pct ss-num">{r.pct} %</span>
                <span className="cell-actions ss-right">
                  {state === 'in' ? <span className="ss-status"><i />на полке</span>
                    : state === 'plan' ? <MasterTag tone="info">в плане</MasterTag>
                    : <><span className="ss-faint pl-small">нет на полке</span><MasterButton size="sm" variant="ghost">В план</MasterButton></>}
                </span>
              </div>
            );
          })}
        </div>
        <p className="ss-note">Гость увидит микс, когда табаки из плана придут по счёту.</p>
      </section>
      {planned ? <Toast toast={{ title: 'Тархун в плане', text: 'Попадёт в «К заказу».' }} /> : null}
    </Shell>
  );
}

// ── Телефон (S1, S2, S3) ──
function MShelf({ order }) {
  const rows = PL.shelf.filter((r) => r.status === 'plan');
  return (
    <div className="phone">
      <header className="m-top"><img src={MARK} alt="" /><h1>Полка</h1><MasterIconButton label="Найти" small><Ic name="Search" size={16} /></MasterIconButton></header>
      <div className="m-body">
        <div className="ss-seg m-seg" role="group" aria-label="Вид полки">
          <button aria-pressed={!order}>Полка</button>
          <button aria-pressed={!!order}>К заказу <em>8</em></button>
        </div>
        {order ? (
          <>
            <div className="m-group"><h2>Каспий Опт</h2><MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Заявка</MasterButton></div>
            {PL.order[0].rows.slice(0, 2).map((r) => (
              <div key={r.name} className="m-card"><span className="ss-name"><b>{r.name}</b></span><span className="ss-danger ss-num" style={{ fontSize: 13 }}>{r.outAt}</span></div>
            ))}
            <div className="m-group"><h2>В плане</h2><MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Список</MasterButton></div>
            {PL.planOrder.map((r) => (
              <div key={r.id} className="m-card">
                <span className="ss-name"><b>{r.name}</b></span>
                <span className={'ss-num' + (r.planned === '12 сен' ? ' pl-stale' : ' ss-muted')} style={{ fontSize: 13 }}>с {r.planned}</span>
                {r.mixes ? <span className="m-card-meta ss-muted">{r.mixes}</span> : null}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="m-chips">
              <FilterChip count={PL.counts.all}>Все</FilterChip>
              <FilterChip count={PL.counts.in}>Есть</FilterChip>
              <FilterChip count={PL.counts.out}>Закончились</FilterChip>
              <FilterChip active count={PL.counts.plan}>В плане</FilterChip>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="m-card">
                <span className="ss-name"><b>{r.name}</b><span>{r.brand}</span></span>
                <button className="m-btn" aria-label={'В наличие ' + r.name}>В наличие</button>
                <span className="m-card-meta"><Status row={r} /></span>
              </div>
            ))}
          </>
        )}
      </div>
      <nav className="m-nav"><span>Дашборд</span><span className="on">Полка</span><span>Поставки</span><span>Ещё</span></nav>
    </div>
  );
}

// ── Кадры доски и режим #shot= ──
const SHOTS = [
  { id: 'shelf-plan', group: 'shelf', slice: 'S1, S2', name: 'Полка, в плане', note: 'Дата постановки вместо «ждёт прихода». Галочки «Держим» у плана нет. Кнопка «В наличие» (S1, #558).', view: () => <ShelfScreen init={{ filter: 'plan' }} /> },
  { id: 'shelf-plan-menu', group: 'shelf', slice: 'S2', name: 'Меню строки плана', note: 'Убрать из плана без похода в каталог.', view: () => <ShelfScreen init={{ filter: 'plan', menu: 1 }} /> },
  { id: 'shelf-plan-in', group: 'shelf', slice: 'S1', name: 'В наличие из плана', note: 'Табак сразу «Есть» и у гостя. Отмена возвращает его в план.', view: () => <ShelfScreen init={{ filter: 'plan', toast: { title: 'Clover Club есть', text: 'Появился на витрине.' } }} /> },
  { id: 'card-plan', group: 'card', slice: 'S2', name: 'Карточка, в плане', note: 'Наличие: «Есть» или «В плане с 11 ноя». «Держим» и «Стоп» появятся после прихода. Видно, какие миксы ждут табак.', view: () => <ShelfScreen init={{ filter: 'plan', drawer: 'bn-clover' }} /> },
  { id: 'card-trial', group: 'card', slice: 'S7', name: 'Проба после плана', note: 'Пришёл из плана: «Проба», «Держим» выключено.', view: () => <ShelfScreen init={{ drawer: 'bn-caramel', trial: 'none' }} /> },
  { id: 'card-trial-yes', group: 'card', slice: 'S7', name: 'Проба, зашло', note: 'Система предлагает держать постоянно, решает мастер. Галочка сама не ставится.', view: () => <ShelfScreen init={{ drawer: 'bn-caramel', trial: 'yes' }} /> },
  { id: 'order-plan', group: 'order', slice: 'S3', name: 'К заказу с планом', note: 'Блок «В плане» после поставщиков: дата постановки, сколько миксов ждут. Старый план (12 сен) выделен. Счётчик вкладки: закончившиеся и план. В меню строки «Убрать из плана».', view: () => <OrderScreen /> },
  { id: 'order-only-plan', group: 'order', slice: 'S3', name: 'К заказу, только план', note: 'Закончившихся нет, план остаётся на виду.', view: () => <OrderScreen onlyPlan /> },
  { id: 'catalog', group: 'catalog', slice: 'S4', name: 'Каталог', note: 'Рядом с «На полку» кнопка «В план». У табака в плане метка, как в «Идеях для закупки».', view: () => <CatalogScreen /> },
  { id: 'delivery', group: 'delivery', slice: 'S5', name: 'Поставка, разбор счёта', note: 'Строки, которые закрывают план, помечены «из плана».', view: () => <DeliveryScreen /> },
  { id: 'delivery-accepted', group: 'delivery', slice: 'S5, S6', name: 'Поставка принята', note: 'Тост: сколько пришло из плана и сколько миксов открылось гостям.', view: () => <DeliveryScreen accepted /> },
  { id: 'mixes', group: 'mixes', slice: 'S6', name: 'Миксы', note: '«Ждёт табак из плана» отдельно от «Заблокирован наличием»: такой микс откроется сам с приходом.', view: () => <MixesScreen /> },
  { id: 'mix-edit', group: 'mixes', slice: 'S6', name: 'Редактор микса', note: 'Табака нет на полке: «В план» прямо из состава.', view: () => <MixEditScreen /> },
  { id: 'mix-edit-planned', group: 'mixes', slice: 'S6', name: 'Редактор, табак в плане', view: () => <MixEditScreen planned /> },
  { id: 'mobile-plan', group: 'mobile', slice: 'S1, S2', name: 'Телефон, в плане', phone: true, view: () => <MShelf /> },
  { id: 'mobile-order-plan', group: 'mobile', slice: 'S3', name: 'Телефон, к заказу', phone: true, view: () => <MShelf order /> },
];

function ShotView({ shot }) {
  return shot.phone ? shot.view() : <Desk>{shot.view()}</Desk>;
}

function Frame({ shot }) {
  return (
    <div className="frame">
      <p className="frame-name"><b>{shot.name}</b>, {shot.slice}, #shot={shot.id}</p>
      {shot.note ? <p className="frame-note">{shot.note}</p> : null}
      <ShotView shot={shot} />
    </div>
  );
}

const SECTIONS = [
  ['shelf', 'Полка'],
  ['card', 'Карточка табака'],
  ['order', 'К заказу'],
  ['catalog', 'Каталог'],
  ['delivery', 'Поставки'],
  ['mixes', 'Миксы'],
  ['mobile', 'Телефон за стойкой'],
];

function Board() {
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#559, Мастер, десктоп 1280 и телефон 375</p>
        <h1 className="board-title">«В плане»: от идеи до полки</h1>
        <p className="board-text">
          План — итог аналитики мастера по новинкам. Он виден в «К заказу», ставится из каталога и редактора микса,
          закрывается счётом или кнопкой «В наличие». Микс под табак из плана открывается гостям сам с приходом.
          «Держать постоянно» мастер решает после пробы. «Сегодня» 13 ноября.
        </p>
      </header>
      {SECTIONS.map(([g, title]) => (
        <section key={g} className="board-section"><h2 className="board-h2">{title}</h2><div className="board-row">{SHOTS.filter((s) => s.group === g).map((s) => <Frame key={s.id} shot={s} />)}</div></section>
      ))}
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
const shot = shotId && SHOTS.find((s) => s.id === shotId);
ReactDOM.createRoot(document.getElementById('root')).render(shot ? <div className="shot"><ShotView shot={shot} /></div> : <Board />);
