/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterTopBar, FilterChip, MasterSortPill } = window.DesignSystem_1aef33;
const SS = window.SS;
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

const byId = (id) => SS.shelf.find((r) => r.id === id) || SS.orderExtra[id];
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const mixesWord = (n) => n + ' ' + plural(n, 'микс', 'микса', 'миксов');
const hiddenText = (r) => (r.hidden === r.mixes ? mixesWord(r.hidden) : r.hidden + ' из ' + r.mixes) + (r.hidden === 1 && r.mixes === 1 ? ' скрыт' : ' скрыты') + ' у гостя';

function Status({ row }) {
  if (row.status === 'out') return <span className="ss-two"><span className="ss-status out"><i />Закончился {row.outAt}</span><small>{row.keep ? 'в заявке' : 'не держим'}</small></span>;
  if (row.status === 'stop') return <span className="ss-two"><span className="ss-status stop"><i />Стоп для гостей</span><small>{row.stopNote}</small></span>;
  if (row.status === 'plan') return <span className="ss-two"><span className="ss-status plan"><i />В плане</span><small>ждёт прихода</small></span>;
  return <span className="ss-status"><i />Есть</span>;
}

function RowAction({ row, onOut, onBack }) {
  if (row.status === 'out') return <MasterButton size="sm" variant="ghost" onClick={() => onBack(row)}>Вернуть в наличие</MasterButton>;
  if (row.status === 'stop') return <MasterButton size="sm" variant="ghost">Снять стоп</MasterButton>;
  if (row.status === 'plan') return <span className="ss-faint" style={{ fontSize: 12 }}>придёт по счёту</span>;
  return <MasterButton size="sm" onClick={() => onOut(row)}>Закончился</MasterButton>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <Overlay>
      <div className="ss-toast" role="status">
        <div><b>{toast.title}</b><span>{toast.text}</span></div>
        <span className="ss-timer">10 с</span>
        {toast.extra ? <MasterButton size="sm" variant="ghost">{toast.extra}</MasterButton> : null}
        <MasterButton size="sm">Отменить</MasterButton>
      </div>
    </Overlay>
  );
}

function BulkBar({ ids, onClear }) {
  if (!ids.length) return null;
  const rows = ids.map(byId);
  return (
    <Overlay>
      <div className="ss-bulk" role="toolbar" aria-label="Выбранные табаки">
        <b>Выбрано {rows.length}</b>
        <span className="ss-faint">{rows.slice(0, 3).map((r) => r.name).join(', ')}{rows.length > 3 ? ' и ещё ' + (rows.length - 3) : ''}</span>
        <span className="grow" />
        <MasterButton size="sm">Закончились</MasterButton>
        <MasterButton size="sm" variant="ghost">Вернуть в наличие</MasterButton>
        <MasterButton size="sm" variant="ghost">Держать постоянно</MasterButton>
        <MasterButton size="sm" variant="ghost">Стоп для гостей</MasterButton>
        <MasterIconButton label="Снять выделение" small onClick={onClear}><Ic name="X" size={14} /></MasterIconButton>
      </div>
    </Overlay>
  );
}

function Head({ view, setView }) {
  return (
    <header className="ss-head">
      <h1>Полка</h1>
      <div className="ss-head-side">
        <span className="ss-meta">{SS.total} табаков</span>
        <div className="ss-seg" role="group" aria-label="Вид полки">
          <button aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>Полка</button>
          <button aria-pressed={view === 'order'} onClick={() => setView('order')}>К заказу <em>6</em></button>
        </div>
        <MasterButton variant="ghost">Добавить из каталога</MasterButton>
        <MasterButton variant="primary" icon={<Ic name="FileUp" size={15} />}>Загрузить счёт</MasterButton>
      </div>
    </header>
  );
}

function ShelfTable({ rows, selected, toggleSel, onOpen, onOut, onBack }) {
  const all = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  return (
    <div className="ss-table" role="table">
      <div className="ss-row th" role="row">
        <span className={'ss-check' + (all ? ' on' : '')}>{all ? '✓' : ''}</span>
        <span>Табак</span><span>Наличие</span><span>Приход</span><span className="ss-right">Миксы</span><span>Держим</span><span />
      </div>
      {rows.map((r) => {
        const sel = selected.includes(r.id);
        return (
          <div key={r.id} className={'ss-row' + (sel ? ' sel' : '')} role="row" onClick={() => (selected.length ? toggleSel(r.id) : onOpen(r.id))}>
            <span className={'ss-check' + (sel ? ' on' : '')} onClick={(e) => { e.stopPropagation(); toggleSel(r.id); }}>{sel ? '✓' : ''}</span>
            <span className="ss-name"><b>{r.name}{r.trial ? <MasterTag tone="ghost">проба</MasterTag> : null}</b><span>{r.brand}</span></span>
            <Status row={r} />
            {r.arrived ? <span className="ss-two"><span className="ss-num">{r.arrived}</span><small>{r.supplier}</small></span> : <span className="ss-faint">—</span>}
            <span className="ss-right ss-num">{r.mixes || <span className="ss-faint">—</span>}</span>
            <span className="ss-muted" aria-label={r.keep ? 'Держим постоянно' : 'Не держим'}>{r.keep ? <Ic name="Check" size={15} /> : null}</span>
            <span className="cell-actions ss-right" onClick={(e) => e.stopPropagation()}>
              <RowAction row={r} onOut={onOut} onBack={onBack} />
              <span className="ss-more" aria-label="Ещё"><Ic name="Ellipsis" size={16} /></span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderView({ copied, empty, setCopied }) {
  if (empty) {
    return (
      <div className="ss-empty">
        <b>Всё в наличии</b>
        Здесь появятся табаки, которые закончились и которые вы держите постоянно.
      </div>
    );
  }
  return (
    <>
      {SS.order.map((g) => (
        <section key={g.supplier} className="ss-order">
          <header className="ss-order-head">
            <h2>{g.supplier}</h2>
            <span className="ss-muted" style={{ fontSize: 13 }}>{g.last}</span>
            <span className="grow" />
            <MasterButton size="sm" icon={<Ic name={copied === g.supplier ? 'Check' : 'Copy'} size={14} />} onClick={() => setCopied(g.supplier)}>{copied === g.supplier ? 'Скопировано' : 'Скопировать заявку'}</MasterButton>
          </header>
          <div className="ss-orow th"><span>Табак</span><span>Закончился</span><span>Миксы</span><span>Последний приход</span></div>
          {g.ids.map((id) => {
            const r = byId(id);
            return (
              <div key={id} className="ss-orow">
                <span>{r.brand} {r.name}</span>
                <span className="ss-danger ss-num">{r.outAt}</span>
                <span className={r.hidden ? '' : 'ss-muted'}>
                  {!r.mixes ? <span className="ss-faint">нет в миксах</span>
                    : r.hidden ? hiddenText(r)
                    : 'закрыт аналогом'}
                </span>
                <span className="ss-num ss-muted">{r.arrived}</span>
              </div>
            );
          })}
          {copied === g.supplier ? <pre className="ss-copy">{g.ids.map((id) => { const r = byId(id); return r.brand + ' ' + r.name; }).join('\n')}</pre> : null}
        </section>
      ))}
      <div className="ss-notkept">
        <Ic name="CircleMinus" size={15} />
        <span className="grow">Ещё {SS.notKept.length} закончились, их не держим постоянно: {SS.notKept.join(', ')}.</span>
        <MasterButton size="sm" variant="ghost">Показать на полке</MasterButton>
      </div>
    </>
  );
}

function Drawer({ id, onClose }) {
  const r = byId(id);
  const mixes = SS.mixesOf[id] || [];
  const receipts = SS.receipts[id] || [];
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
            <button aria-pressed={r.status !== 'out'}><i />Есть</button>
            <button className="out" aria-pressed={r.status === 'out'}><i />{r.status === 'out' ? 'Закончился ' + r.outAt : 'Закончился'}</button>
          </div>
          {r.status === 'out' ? <p className="ss-note">Вернётся в наличие сам, когда примете счёт с этим табаком.</p> : null}
        </div>
        <div className="ss-block">
          <div className="ss-setting"><span>Держим постоянно<small>Закончится, попадёт в заявку</small></span><MasterToggle checked={r.keep} /></div>
          <div className="ss-setting"><span>Стоп для гостей<small>Есть на полке, но гостю не предлагаем</small></span><MasterToggle checked={r.status === 'stop'} /></div>
        </div>
        <div className="ss-block">
          <h3 className="ss-h3">В миксах</h3>
          {mixes.length ? (
            <div className="ss-list">
              {mixes.map((m) => <div key={m.name} className="ss-li"><b style={{ fontWeight: 400 }}>{m.name}</b><span className={m.state === 'скрыт' ? 'ss-danger' : ''}>{m.state}</span></div>)}
            </div>
          ) : <p className="ss-note">Ни в одном миксе.</p>}
        </div>
        <div className="ss-block">
          <h3 className="ss-h3">Приходы</h3>
          <div className="ss-list">
            {receipts.map((x) => <div key={x.date} className="ss-li"><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{x.date}, {x.supplier}</span><span>{x.what}, {x.doc}</span></div>)}
          </div>
        </div>
      </aside>
    </Overlay>
  );
}

function ShelfApp({ init = {} }) {
  const [view, setView] = React.useState(init.view || 'shelf');
  const [drawer, setDrawer] = React.useState(init.drawer || null);
  const [selected, setSelected] = React.useState(init.selected || []);
  const [toast, setToast] = React.useState(init.toast || null);
  const [copied, setCopied] = React.useState(init.copied || null);
  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const onOut = (r) => setToast(r.keep
    ? { title: r.name + ' закончился', text: r.mixes ? 'Снят с витрины. Добавлен в заявку.' : 'Добавлен в заявку.' }
    : { title: r.name + ' закончился', text: 'В заявку не попадёт: не держим постоянно.', extra: 'Держать постоянно' });
  const onBack = (r) => setToast({ title: r.name + ' снова есть', text: 'Вернулся на витрину.' });
  const rows = init.searchEmpty ? [] : SS.shelf;
  return (
    <main className="shell">
      <MasterTopBar markSrc={MARK} items={TABS} active="shelf" userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">
        <Head view={view} setView={setView} />
        {view === 'shelf' ? (
          <>
            <div className="toolbar">
              <span className={'ss-search' + (init.searchEmpty ? ' on' : '')}><Ic name="Search" size={14} /><span className="grow">{init.searchEmpty ? 'Адалия банан' : 'Табак или бренд'}</span><span className="ss-kbd">/</span></span>
              <div className="toolbar-filters">
                <FilterChip active count={SS.counts.all}>Все</FilterChip>
                <FilterChip count={SS.counts.in}>Есть</FilterChip>
                <FilterChip count={SS.counts.out}>Закончились</FilterChip>
                <FilterChip count={SS.counts.stop}>Стоп</FilterChip>
                <FilterChip count={SS.counts.plan}>В плане</FilterChip>
                <FilterChip count={SS.counts.trial}>Проба</FilterChip>
              </div>
              <MasterButton size="sm" variant="ghost">Фильтры</MasterButton>
              <MasterSortPill value="status" options={[{ key: 'status', label: 'Наличие' }, { key: 'name', label: 'Название' }, { key: 'arrived', label: 'Приход' }]} />
            </div>
            {rows.length ? <ShelfTable rows={rows} selected={selected} toggleSel={toggleSel} onOpen={setDrawer} onOut={onOut} onBack={onBack} />
              : <div className="ss-empty"><b>Ничего не нашлось</b>На полке нет такого табака. Добавьте его из каталога.<MasterButton size="sm" style={{ marginTop: 6 }}>Добавить из каталога</MasterButton></div>}
          </>
        ) : <OrderView copied={copied} empty={init.orderEmpty} setCopied={setCopied} />}
      </section>
      {drawer ? <Drawer id={drawer} onClose={() => setDrawer(null)} /> : null}
      <BulkBar ids={selected} onClear={() => setSelected([])} />
      {!selected.length ? <Toast toast={toast} /> : null}
    </main>
  );
}

// ── Телефон за стойкой ──
function MShelf({ order }) {
  const rows = SS.shelf.slice(0, 7);
  return (
    <div className="phone">
      <header className="m-top"><img src={MARK} alt="" /><h1>Полка</h1><MasterIconButton label="Найти" small><Ic name="Search" size={16} /></MasterIconButton></header>
      <div className="m-body">
        <div className="ss-seg m-seg" role="group" aria-label="Вид полки">
          <button aria-pressed={!order}>Полка</button>
          <button aria-pressed={!!order}>К заказу <em>6</em></button>
        </div>
        {order ? SS.order.map((g) => (
          <React.Fragment key={g.supplier}>
            <div className="m-group"><h2>{g.supplier}</h2><MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Заявка</MasterButton></div>
            {g.ids.map((id) => {
              const r = byId(id);
              return (
                <div key={id} className="m-card">
                  <span className="ss-name"><b>{r.name}</b><span>{r.brand}</span></span>
                  <span className="ss-danger ss-num" style={{ fontSize: 13 }}>{r.outAt}</span>
                  {r.hidden ? <span className="m-card-meta ss-muted">{hiddenText(r)}</span> : null}
                </div>
              );
            })}
          </React.Fragment>
        )) : (
          <>
            <div className="m-chips">
              <FilterChip active count={SS.counts.all}>Все</FilterChip>
              <FilterChip count={SS.counts.in}>Есть</FilterChip>
              <FilterChip count={SS.counts.out}>Закончились</FilterChip>
              <FilterChip count={SS.counts.stop}>Стоп</FilterChip>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="m-card">
                <span className="ss-name"><b>{r.name}</b><span>{r.brand}</span></span>
                {r.status === 'in' ? <button className="m-btn">Закончился</button>
                  : r.status === 'out' ? <button className="m-btn" aria-label={'Вернуть в наличие ' + r.name}>Вернуть</button>
                  : <span />}
                <span className="m-card-meta"><Status row={r} />{r.trial ? <MasterTag tone="ghost">проба</MasterTag> : null}</span>
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
  { id: 'shelf', group: 'shelf', name: 'Полка', note: 'Колонки: наличие, последний приход, в скольких миксах, держим постоянно. Граммов, расхода и прогноза нет.' },
  { id: 'shelf-out', group: 'shelf', name: 'Полка, закончился', note: 'Табак держим постоянно: снят с витрины и попал в заявку.', init: { toast: { title: 'Raspberries закончился', text: 'Снят с витрины. Добавлен в заявку.' } } },
  { id: 'shelf-out-notkept', group: 'shelf', name: 'Полка, закончилась проба', note: 'Не держим постоянно: в заявку не попадает, из тоста можно сразу включить «держать».', init: { toast: { title: 'Panama закончился', text: 'В заявку не попадёт: не держим постоянно.', extra: 'Держать постоянно' } } },
  { id: 'shelf-bulk', group: 'shelf', name: 'Полка, выбрано 4', note: 'Выделение как в #517. Действия: закончились, вернуть в наличие, держать постоянно, стоп.', init: { selected: ['bb-rasp', 'ds-wild', 'ds-redtea', 'ds-mango'] } },
  { id: 'card', group: 'card', name: 'Карточка, закончился', note: 'Наличие одной кнопкой. Видно, какие миксы закрыты аналогом, а какие скрыты.', init: { drawer: 'bb-cane' } },
  { id: 'card-in', group: 'card', name: 'Карточка, есть', init: { drawer: 'bb-rasp' } },
  { id: 'order', group: 'order', name: 'К заказу', note: 'Закончились и держим постоянно. Группы по поставщику последнего прихода. Миксы: сколько скрыто у гостя, пока табака нет.', init: { view: 'order' } },
  { id: 'order-copied', group: 'order', name: 'К заказу, заявка', note: 'Только названия, объём мастер пишет сам.', init: { view: 'order', copied: 'Каспий Опт' } },
  { id: 'mobile-shelf', group: 'mobile', name: 'Телефон, полка', phone: true },
  { id: 'mobile-order', group: 'mobile', name: 'Телефон, к заказу', phone: true, order: true },
  { id: 'edge-order-empty', group: 'edge', name: 'К заказу пусто', init: { view: 'order', orderEmpty: true } },
  { id: 'edge-search-empty', group: 'edge', name: 'Поиск без результата', init: { searchEmpty: true } },
];

function ShotView({ shot }) {
  if (shot.phone) return <MShelf order={shot.order} />;
  return <Desk><ShelfApp init={shot.init} /></Desk>;
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
        <p className="board-caps">#518, Мастер, десктоп 1280 и телефон 375</p>
        <h1 className="board-title">Полка без граммов</h1>
        <p className="board-text">
          Остаток в граммах, расход, прогноз и вид «Закупка» уходят. У табака два состояния: есть или закончился.
          Закончился и держим постоянно, значит в заявке. Принятый счёт возвращает табак в наличие сам. «Сегодня» 4 ноября.
        </p>
      </header>
      <section className="board-section"><h2 className="board-h2">Кликабельный прототип</h2><p className="frame-note">Переключатель «Полка, К заказу», клик по строке открывает карточку, «Закончился» показывает тост.</p><Desk><ShelfApp /></Desk></section>
      <section className="board-section"><h2 className="board-h2">Полка</h2><div className="board-row">{section('shelf')}</div></section>
      <section className="board-section"><h2 className="board-h2">Карточка табака</h2><div className="board-row">{section('card')}</div></section>
      <section className="board-section"><h2 className="board-h2">К заказу</h2><div className="board-row">{section('order')}</div></section>
      <section className="board-section"><h2 className="board-h2">Телефон за стойкой</h2><div className="board-row">{section('mobile')}</div></section>
      <section className="board-section"><h2 className="board-h2">Края</h2><div className="board-row">{section('edge')}</div></section>
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
const shot = shotId && SHOTS.find((s) => s.id === shotId);
ReactDOM.createRoot(document.getElementById('root')).render(shot ? <div className="shot"><ShotView shot={shot} /></div> : <Board />);
