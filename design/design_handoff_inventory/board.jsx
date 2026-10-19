/* eslint-disable */
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterInput, MasterStatsRow, MasterPageHeader, FilterChip, MasterList, MasterSortPill, MasterCard, MasterTopBar, EmptyState } = window.DesignSystem_1aef33;
const INV_D = window.INV;
const INV_MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

const INV_TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'shelf', label: 'Полка' },
  { id: 'deliveries', label: 'Поставки' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'mixes', label: 'Миксы' },
  { id: 'rails', label: 'Рейлы' },
  { id: 'access', label: 'Доступ' },
];

const INV_PROFILE_LABEL = { berry: 'Ягодный', citrus: 'Цитрусовый', dessert: 'Десертный', fruity: 'Фруктовый', minty: 'Мятный', spicy: 'Пряный', floral_herbal: 'Травяной' };
const invProfileColor = (key) => `var(--profile-${key.replace('_', '-')})`;

// Иконки lucide рендерим сами: createIcons подменяет DOM под React.
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

// Оверлеи (шторка, тост, меню) живут поверх кадра, а не внутри прокрутки.
const InvOverlayCtx = React.createContext(null);
function InvOverlay({ children }) {
  const node = React.useContext(InvOverlayCtx);
  return node ? ReactDOM.createPortal(children, node) : null;
}

function InvDesk({ tall, children }) {
  const [node, setNode] = React.useState(null);
  return (
    <div className={'desk' + (tall ? ' tall' : '')}>
      <InvOverlayCtx.Provider value={node}>
        <div className="desk-scroll">{children}</div>
      </InvOverlayCtx.Provider>
      <div ref={setNode} />
    </div>
  );
}

function InvShell({ tab, onTab, children }) {
  return (
    <main className="shell">
      <MasterTopBar markSrc={INV_MARK} items={INV_TABS} active={tab} onChange={onTab} userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
      <section className="stage">{children}</section>
    </main>
  );
}

function Pips({ row, lg }) {
  const slots = [];
  if (row.open != null) {
    const tone = row.status === 'ending' && row.days != null && row.days <= 3 ? ' crit' : row.open < 0.34 ? ' low' : '';
    slots.push(<span key="o" className={'pip' + tone}><i style={{ height: Math.max(6, row.open * 100) + '%' }} /></span>);
  }
  for (let i = 0; i < row.sealed; i += 1) slots.push(<span key={'s' + i} className="pip sealed" />);
  if (!slots.length) slots.push(<span key="n" className="pip none" />);
  return (
    <span className={'pips' + (lg ? ' lg' : '')} title="Банки: в работе и в запасе">
      {slots}
      {!lg ? <span className="pips-meta">{row.open == null && !row.sealed ? 'нет' : (row.open != null ? '1' : '0') + ' + ' + row.sealed}</span> : null}
    </span>
  );
}

function InvRate({ row }) {
  if (row.rateKind === 'none') return <span className="inv-faint">мало данных</span>;
  if (row.rateKind === 'brand') return <span className="inv-faint" title="Своих данных ещё нет — медиана бренда">≈ {row.rate} г/день · бренд</span>;
  return <span className="inv-num">{row.rate} г/день</span>;
}

const INV_STATUS_TEXT = { out: ['inv-danger', 'закончился'], ending: ['inv-warn', 'заканчивается'], check: ['inv-warn', 'проверьте остаток'], plan: ['inv-faint', 'в плане'] };
const invStatusLine = (row) => {
  if (row.status === 'stop') return <span className="inv-faint">стоп для гостей · {row.note}</span>;
  if (INV_STATUS_TEXT[row.status]) { const [cls, text] = INV_STATUS_TEXT[row.status]; return <span className={cls}>{text}{row.last && row.status === 'ending' ? ' · последняя банка' : ''}</span>; }
  if (row.last) return <span className="inv-muted">последняя банка</span>;
  return null;
};

function InvUntilDate({ row }) {
  if (row.status === 'out') return <span className="inv-danger">{row.until}</span>;
  if (row.status === 'check') return <span className="inv-warn">должна была закончиться</span>;
  if (row.days == null) return <span className="inv-faint">—</span>;
  const cls = row.days <= 3 ? 'inv-danger' : row.days <= 7 ? 'inv-warn' : '';
  return <span className={'inv-num ' + cls}>{row.until} <span className="inv-faint">· {row.days} дн</span></span>;
}

function InvUntil({ row, stacked }) {
  const status = invStatusLine(row);
  if (!stacked) return <InvUntilDate row={row} />;
  return <span className="inv-until"><InvUntilDate row={row} />{status ? <small>{status}</small> : null}</span>;
}

function InvRowMenu({ row, pos, onMark, onClose }) {
  return (
    <div className="inv-pop" style={pos} onClick={(e) => e.stopPropagation()}>
      <span className="inv-pop-label">Сколько осталось в открытой</span>
      <div className="inv-fracs">
        {['¾', '½', '⅓', '¼'].map((f, i) => <button key={f} className="inv-frac" onClick={() => onMark(row, f)} title={'Клавиша ' + (i + 1)}>{f}</button>)}
      </div>
      <div className="inv-sep" />
      <button className="inv-pop-item" onClick={onClose}>Вскрыть ещё одну банку</button>
      <button className="inv-pop-item" onClick={onClose}>Добавить банку вручную</button>
      <button className="inv-pop-item" onClick={onClose}>{row.status === 'stop' ? 'Снять стоп для гостей' : 'Стоп для гостей'}</button>
      <button className="inv-pop-item" onClick={onClose}>Списать банку…</button>
      <div className="inv-sep" />
      <button className="inv-pop-item" onClick={onClose}>Убрать с полки <span className="inv-faint">история останется</span></button>
    </div>
  );
}

function InvActions({ row, menuOpen, onEmpty, onMenu, onMark, onCloseMenu }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!menuOpen || !ref.current) return;
    const desk = ref.current.closest('.desk');
    const a = ref.current.getBoundingClientRect();
    const d = desk.getBoundingClientRect();
    setPos({ top: a.bottom - d.top + 4, right: d.right - a.right });
  }, [menuOpen]);
  let primary = <MasterButton size="sm" onClick={() => onEmpty(row)}>Закончилась</MasterButton>;
  if (row.status === 'out' || row.status === 'plan') primary = <span className="inv-faint" style={{ fontSize: 12 }}>в «К заказу»</span>;
  if (row.status === 'stop') primary = <MasterButton size="sm" variant="ghost">Снять стоп</MasterButton>;
  if (row.status === 'check') primary = <MasterButton size="sm" onClick={() => onMenu(row.id)}>Отметить остаток</MasterButton>;
  return (
    <span className="cell-actions" ref={ref} onClick={(e) => e.stopPropagation()}>
      {primary}
      <MasterIconButton label="Ещё действия" small onClick={() => onMenu(menuOpen ? null : row.id)}><Ic name="Ellipsis" size={14} /></MasterIconButton>
      {menuOpen && pos ? <InvOverlay><InvRowMenu row={row} pos={pos} onMark={onMark} onClose={onCloseMenu} /></InvOverlay> : null}
    </span>
  );
}

function InvShelfTable({ rows, menuFor, setMenuFor, onEmpty, onMark, onOpen }) {
  return (
    <MasterList
      onRowClick={(row) => onOpen(row.id)}
      columns={[
        { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.5fr)', render: (r) => (
          <span className="inv-name"><b>{r.name}</b><span>{r.brand} · {r.grams} г</span></span>
        ) },
        { key: 'packs', label: 'БАНКИ', width: '110px', render: (r) => <Pips row={r} /> },
        { key: 'remain', label: 'ОСТАТОК', width: '84px', align: 'right', render: (r) => <span className="inv-num">{r.remain ? '≈ ' + r.remain + ' г' : '—'}</span> },
        { key: 'rate', label: 'РАСХОД', width: '130px', render: (r) => <InvRate row={r} /> },
        { key: 'until', label: 'ХВАТИТ ДО', width: '200px', render: (r) => <InvUntil row={r} stacked /> },
        { key: 'arrived', label: 'ПРИХОД', width: '130px', render: (r) => <span className="inv-name"><b style={{ fontWeight: 400, fontSize: 13 }}>{r.arrived}</b><span>{r.supplier}</span></span> },
        { key: 'mixes', label: 'МИКСЫ', width: '56px', align: 'right', render: (r) => <span className="inv-num">{r.mixes || <span className="inv-faint">—</span>}</span> },
        { key: 'actions', label: '', width: '172px', render: (r) => (
          <InvActions row={r} menuOpen={menuFor === r.id} onEmpty={onEmpty} onMenu={setMenuFor} onMark={onMark} onCloseMenu={() => setMenuFor(null)} />
        ) },
      ]}
      rows={rows}
    />
  );
}

const INV_STATUS_CHIPS = [
  ['all', 'Все'], ['ok', 'Есть'], ['last', 'Последняя банка'], ['ending', 'Заканчивается'], ['out', 'Закончились'], ['stop', 'Стоп'], ['plan', 'В плане'],
];
const invMatchStatus = (row, key) => {
  if (key === 'all') return true;
  if (key === 'last') return !!row.last;
  if (key === 'ok') return row.status === 'ok' || row.status === 'last' || row.status === 'check';
  return row.status === key;
};

function InvFilterPanel() {
  const group = (title, items) => (
    <div className="inv-fgroup">
      <h4>{title}</h4>
      {items.map(([label, count, on]) => <span key={label} className={'inv-check' + (on ? ' on' : '')}><i>{on ? '✓' : ''}</i>{label}<em>{count}</em></span>)}
    </div>
  );
  return (
    <div className="inv-filterpanel">
      {group('Бренд', [['DARKSIDE', 39, true], ['Black Burn', 35, true], ['Сарма', 32], ['Sebero', 31], ['Trofimoff’s', 26], ['Ещё 8 брендов…', '']])}
      {group('Характер', [['Ягодный', 58], ['Фруктовый', 91], ['Цитрусовый', 34], ['Десертный', 47], ['Мятный', 12], ['Травяной', 21]])}
      {group('Крепость', [['Лёгкий', 74], ['Средний', 121], ['Крепкий', 52], ['Не указана', 22]])}
      {group('Поставщик', [['Каспий Опт', 142], ['Южный табак', 96], ['Стартовый приход', 31]])}
      {group('Ещё', [['Есть в миксах', 64], ['Нет в миксах', 205], ['Мало данных о расходе', 88], ['С отметкой остатка', 41]])}
    </div>
  );
}

function InvToast({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <InvOverlay>
      <div className="inv-toast" role="status">
        <Ic name="CircleCheck" />
        <p><b>{toast.title}</b> — {toast.text}</p>
        <span className="inv-toast-timer">10 с</span>
        <MasterButton size="sm" onClick={onUndo}>Отменить <span className="inv-kbd" style={{ marginLeft: 6 }}>Z</span></MasterButton>
      </div>
    </InvOverlay>
  );
}

function InvDrawer({ row, onClose, few }) {
  if (!row) return null;
  const hist = INV_D.rasp;
  const max = Math.max(...hist.bars);
  const mixes = INV_D.mixesByTobacco[row.id] || [];
  return (
    <InvOverlay>
      <div className="inv-scrim" onClick={onClose} />
      <aside className="inv-drawer" aria-label={'Карточка: ' + row.name}>
        <div className="inv-drawer-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="inv-eyebrow">{row.brand} · {row.grams} г · на полке</p>
            <MasterIconButton label="Закрыть" onClick={onClose}><Ic name="X" /></MasterIconButton>
          </div>
          <h1 className="inv-h1">{row.name}</h1>
          <div className="inv-links">
            {row.profiles.map((p) => <MasterTag key={p} tone="neutral"><span className="inv-dot" style={{ background: invProfileColor(p) }} />{INV_PROFILE_LABEL[p]}</MasterTag>)}
            <a className="inv-link" href="#" onClick={(e) => e.preventDefault()}>Карточка в каталоге</a>
            <a className="inv-link" href="#" onClick={(e) => e.preventDefault()}>htreviews <Ic name="ArrowUpRight" size={13} /></a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <MasterButton variant="primary">Закончилась</MasterButton>
          <MasterButton>Осталось ¾ ½ ⅓ ¼</MasterButton>
        </div>

        <div className="inv-kv">
          {few ? (
            <>
              <div><span>Расход</span><b className="inv-faint">мало данных</b><small>появится, когда закончится первая банка или после двух отметок</small></div>
              <div><span>Хватит до</span><b>~ 15 дек</b><small>по бренду Сарма: ≈ 8 г/день</small></div>
              <div><span>Остаток</span><b>≈ 380 г</b><small>открытая ≈ 180 г + 1 в запасе</small></div>
              <div><span>Цена грамма</span><b>7,65 ₽</b><small>≈ 138 ₽ на чашу 18 г</small></div>
            </>
          ) : (
            <>
              <div><span>Хватит до</span><b>11 дек</b><small>22 дня · с запасом</small></div>
              <div><span>Остаток</span><b>≈ 290 г</b><small>открытая ≈ 90 г + 1 в запасе</small></div>
              <div><span>Расход</span><b>13 г/день</b><small>по 3 банкам за 60 дней</small></div>
              <div><span>Цена грамма</span><b>7,75 ₽</b><small>≈ 140 ₽ на чашу 18 г</small></div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <h3 className="inv-h3">Банки</h3>
          <div className="inv-packs">
            {(few ? hist.packs.slice(0, 2) : hist.packs).map((p) => (
              <div className="inv-pack" key={p.n}>
                <span className={'pip ' + (p.state === 'sealed' ? 'sealed' : p.state === 'empty' ? 'none' : '')}>{p.state === 'open' ? <i style={{ height: p.fill * 100 + '%' }} /> : null}</span>
                <span className="inv-pack-copy"><b>{p.title} · банка {p.n}</b><span>{p.line}</span></span>
                <MasterIconButton label="Действия с банкой" small><Ic name="Ellipsis" size={14} /></MasterIconButton>
              </div>
            ))}
          </div>
        </div>

        {!few ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <h3 className="inv-h3">Расход по банкам, г/день</h3>
            <div className="inv-bars">
              {hist.bars.map((v, i) => (
                <div className={'inv-bar' + (i === hist.bars.length - 1 ? ' partial' : '')} key={i}>
                  <span>{String(v).replace('.', ',')}</span>
                  <i style={{ height: (v / max) * 70 + 'px' }} />
                </div>
              ))}
            </div>
            <div className="inv-bar-labels">{hist.barLabels.map((l) => <span key={l}>{l}</span>)}</div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 2 }}>
          <h3 className="inv-h3">Настройки</h3>
          <div className="inv-setting"><span>Фасовка по умолчанию<small>если в счёте вес не указан</small></span><span className="inv-select" style={{ width: 90 }}>{row.grams} г <Ic name="ChevronDown" size={13} /></span></div>
          <div className="inv-setting"><span>Держим постоянно<small>закончится — попадёт в «К заказу»</small></span><MasterToggle checked label="Держим постоянно" /></div>
          <div className="inv-setting"><span>Стоп для гостей<small>банки есть, но гостю не предлагать</small></span><MasterToggle checked={false} label="Стоп для гостей" /></div>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <h3 className="inv-h3">В миксах</h3>
          {mixes.length ? mixes.map((m) => <span key={m} className="inv-muted">{m}</span>) : <span className="inv-faint" style={{ fontSize: 13 }}>Пока ни в одном миксе.</span>}
        </div>
      </aside>
    </InvOverlay>
  );
}

function InvReorder({ copied }) {
  return (
    <div className="page">
      {INV_D.reorder.map((g) => (
        <section className="inv-order" key={g.supplier}>
          <header className="inv-order-head">
            <h3>{g.supplier}</h3>
            <span className="inv-muted" style={{ flex: 1 }}>{g.lastInvoice}</span>
            {g.sum !== '—' ? <span className="inv-num inv-muted">≈ {g.sum}</span> : null}
            <MasterButton size="sm" icon={<Ic name="Copy" size={14} />}>Скопировать заказ</MasterButton>
          </header>
          <div className="inv-order-row th"><span>Табак</span><span>Хватит до</span><span>Расход</span><span>Заказать</span><span>Последняя цена</span></div>
          {g.items.map((it) => (
            <div className="inv-order-row" key={it.name}>
              <span>{it.name}{it.soft ? <span className="inv-faint"> · можно со следующей</span> : null}</span>
              <span className={it.days === 0 ? 'inv-danger' : it.days != null && it.days <= 7 ? 'inv-warn' : 'inv-faint'}>{it.until}{it.days ? ' · ' + it.days + ' дн' : ''}</span>
              <span className="inv-num">{it.rate ? it.rate + ' г/день' : <span className="inv-faint">—</span>}</span>
              <span className="inv-stepper"><button>−</button><span>{it.qty}</span><button>+</button></span>
              <span className="inv-num">{it.price}</span>
            </div>
          ))}
        </section>
      ))}
      {copied ? (
        <MasterCard eyebrow="СКОПИРОВАНО" heading="Текст для чата с поставщиком">
          <pre className="inv-copy">{'Добрый день! Заказ:\nBlack Burn Cane Mint 200 г — 3 шт\nSebero Лимонная шипучка 200 г — 2 шт\nBlack Burn Pear lemonade 200 г — 2 шт\nСпасибо!'}</pre>
        </MasterCard>
      ) : null}
      <p className="hint">Количество — расход на 21 день, округлено до банки. Срок поставки — 7 дней (настройка точки).</p>
    </div>
  );
}

function InvShelfScreen({ init = {}, onTab }) {
  const [rows, setRows] = React.useState(init.rows || INV_D.shelf);
  const [status, setStatus] = React.useState(init.status || 'all');
  const [q, setQ] = React.useState('');
  const [filters, setFilters] = React.useState(!!init.filters);
  const [menuFor, setMenuFor] = React.useState(init.menu || null);
  const [toast, setToast] = React.useState(init.toast || null);
  const [drawer, setDrawer] = React.useState(init.drawer || null);
  const [view, setView] = React.useState(init.view || 'shelf');
  const [sort, setSort] = React.useState('until');
  const prev = React.useRef(null);

  const onEmpty = (row) => {
    prev.current = rows;
    setMenuFor(null);
    if (row.sealed > 0) {
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, open: 1, sealed: r.sealed - 1, last: r.sealed - 1 === 0 } : r)));
      setToast({ title: row.brand + ' ' + row.name, text: 'банка пустая, следующая вскрыта. В запасе: ' + (row.sealed - 1) + '.' });
    } else {
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, open: null, remain: 0, status: 'out', until: 'закончился сегодня', last: false } : r)));
      setToast({ title: row.brand + ' ' + row.name, text: 'табак закончился, гости его больше не видят' + (row.mixes ? '. Миксов скрыто: ' + row.mixes : '') + '. Добавлен в «К заказу».' });
    }
  };
  const onMark = (row, frac) => {
    setMenuFor(null);
    setToast({ title: row.brand + ' ' + row.name, text: 'отмечено: осталось ' + frac + '. Прогноз пересчитан.' });
  };
  const undo = () => { if (prev.current) setRows(prev.current); setToast(null); };

  const shown = rows
    .filter((r) => invMatchStatus(r, status))
    .filter((r) => !q || (r.brand + ' ' + r.name).toLowerCase().includes(q.toLowerCase()));
  const s = INV_D.stats;
  const drawerRow = rows.find((r) => r.id === drawer);

  return (
    <div className="page">
      <MasterPageHeader
        eyebrow={'ИНВЕНТАРИЗАЦИЯ · ' + INV_D.today}
        title="Полка"
        subtitle="Банки на полке, расход и прогноз. Закончилась банка — одна кнопка."
        meta={s.shelf + ' позиций · ' + s.packs + ' банок'}
        actions={<>
          <span className="inv-seg">
            <button aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>Полка</button>
            <button aria-pressed={view === 'reorder'} onClick={() => setView('reorder')}>К заказу · 6</button>
          </span>
          <MasterButton variant="ghost" onClick={() => onTab && onTab('catalog')}>Добавить из каталога</MasterButton>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />} onClick={() => onTab && onTab('parse')}>Загрузить счёт</MasterButton>
        </>}
      />
      <MasterStatsRow tiles={[
        { label: 'НА ПОЛКЕ', value: s.shelf, hint: s.packs + ' банок · ≈ ' + s.kg + ' кг' },
        { label: 'ЗАКАНЧИВАЕТСЯ', value: s.ending, hint: 'хватит на 7 дней и меньше', tone: 'warning' },
        { label: 'ЗАКОНЧИЛИСЬ', value: s.out, hint: 'держим постоянно — в «К заказу»', tone: 'danger' },
        { label: 'СЕГОДНЯ УЙДЁТ', value: '≈ ' + s.todayG + ' г', hint: '≈ ' + s.todayBowls + ' чаш по 18 г · четверг +8 %' },
      ]} />
      {view === 'reorder' ? <InvReorder copied={init.copied} /> : (
        <>
          <div className="toolbar">
            <MasterInput icon={<Ic name="Search" size={14} />} placeholder="Табак или бренд   /" value={q} onChange={setQ} style={{ minWidth: 260 }} />
            <div className="toolbar-filters">
              {INV_STATUS_CHIPS.map(([key, label]) => (
                <FilterChip key={key} active={status === key} count={INV_D.statusCounts[key]} onClick={() => setStatus(key)}>{label}</FilterChip>
              ))}
            </div>
            <FilterChip active={filters} count={filters ? 2 : undefined} onClick={() => setFilters(!filters)}>Фильтры</FilterChip>
            <MasterSortPill value={sort} onChange={setSort} options={[{ key: 'until', label: 'Хватит до' }, { key: 'rate', label: 'По расходу' }, { key: 'name', label: 'По названию' }, { key: 'arrived', label: 'По приходу' }]} />
          </div>
          {filters ? <InvFilterPanel /> : null}
          <InvShelfTable rows={shown} menuFor={menuFor} setMenuFor={setMenuFor} onEmpty={onEmpty} onMark={onMark} onOpen={setDrawer} />
          {!shown.length ? <EmptyState>По фильтрам ничего. Полка на месте, просто не здесь.</EmptyState> : null}
          <div className="inv-keys">
            <span><b className="inv-kbd">/</b> поиск</span>
            <span><b className="inv-kbd">↑</b><b className="inv-kbd">↓</b> строка</span>
            <span><b className="inv-kbd">E</b> закончилась</span>
            <span><b className="inv-kbd">1</b>–<b className="inv-kbd">4</b> осталось ¾ ½ ⅓ ¼</span>
            <span><b className="inv-kbd">Enter</b> карточка</span>
            <span><b className="inv-kbd">Z</b> отменить</span>
          </div>
        </>
      )}
      <InvToast toast={toast} onUndo={undo} />
      <InvDrawer row={drawerRow} few={init.few} onClose={() => setDrawer(null)} />
    </div>
  );
}

function InvDeliveries({ onTab, edge }) {
  return (
    <div className="page">
      <MasterPageHeader
        eyebrow="ИНВЕНТАРИЗАЦИЯ · ПРИХОД"
        title="Поставки"
        subtitle="Счета поставщиков. Загрузили счёт — сверили строки — приняли, когда товар пришёл."
        meta="ноябрь: 4 счёта"
        actions={<MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />} onClick={() => onTab && onTab('parse')}>Загрузить счёт</MasterButton>}
      />
      <MasterStatsRow tiles={[
        { label: 'ЗА НОЯБРЬ', value: '66 076 ₽', hint: '45 банок' },
        { label: 'ЖДУТ ПРИХОДА', value: 1, hint: 'черновик от 18 ноя', tone: 'warning' },
        { label: 'ПОСТАВЩИКОВ', value: 2, hint: 'сопоставлений в памяти: 61' },
        { label: 'ЦЕНА ГРАММА', value: '7,6 ₽', hint: 'в среднем по полке' },
      ]} />
      {edge === 'pdf' ? (
        <div className="inv-alert danger">
          <Ic name="FileWarning" />
          <p className="grow"><b>Не удалось прочитать текст в «scan_1118.pdf».</b> Похоже, это скан или фото: в файле нет текстового слоя. Загрузите PDF из почты поставщика или заполните строки вручную.</p>
          <MasterButton size="sm">Заполнить вручную</MasterButton>
          <MasterButton size="sm" variant="ghost">Другой файл</MasterButton>
        </div>
      ) : null}
      {edge === 'dup' ? (
        <div className="inv-alert">
          <Ic name="Copy" />
          <p className="grow"><b>Счёт № 03944 от «Каспий Опт» уже загружен</b> 11 ноября и принят 12 ноября. Второй раз те же банки не создаём.</p>
          <MasterButton size="sm">Открыть принятый</MasterButton>
          <MasterButton size="sm" variant="ghost">Это другой счёт</MasterButton>
        </div>
      ) : null}
      <div className={'inv-drop' + (edge === 'hover' ? ' hover' : '')}>
        <Ic name="FileUp" size={20} />
        <span><b>Перетащите PDF счёта сюда</b> или нажмите «Загрузить счёт». Строки разберём и сопоставим с каталогом сами.</span>
      </div>
      <MasterList
        onRowClick={(row) => row.status === 'draft' && onTab && onTab('parse')}
        columns={[
          { key: 'date', label: 'ДАТА СЧЁТА', width: '110px' },
          { key: 'supplier', label: 'ПОСТАВЩИК', width: 'minmax(0,1fr)' },
          { key: 'number', label: 'СЧЁТ', width: '130px' },
          { key: 'lines', label: 'СТРОК', width: '70px', align: 'right' },
          { key: 'packs', label: 'БАНОК', width: '70px', align: 'right' },
          { key: 'sum', label: 'СУММА', width: '110px', align: 'right', render: (r) => <span className="inv-num">{r.sum}</span> },
          { key: 'arrived', label: 'ПРИШЛО', width: '100px' },
          { key: 'status', label: 'СТАТУС', width: '170px', render: (r) => r.status === 'draft'
            ? <MasterTag tone="warning" dot>черновик · ждёт прихода</MasterTag>
            : <MasterTag tone="success" dot>принята</MasterTag> },
        ]}
        rows={INV_D.deliveries}
      />
    </div>
  );
}

const INV_MATCH_TAG = {
  memory: <MasterTag tone="success">по памяти</MasterTag>,
  suggest: <MasterTag tone="warning">проверьте</MasterTag>,
  none: <MasterTag tone="danger">не найдено</MasterTag>,
  skip: <MasterTag tone="ghost">не табак</MasterTag>,
};

function InvParse({ edge }) {
  const P = INV_D.parse;
  const [lines, setLines] = React.useState(P.lines.map((l, i) => ({ ...l, i, came: true })));
  const resolve = (i, patch) => setLines((cur) => cur.map((l) => (l.i === i ? { ...l, ...patch } : l)));
  const pending = lines.filter((l) => l.match === 'none' || (l.match === 'suggest' && (l.confidence || 0) < 50)).length;
  const packs = lines.filter((l) => l.match !== 'skip' && l.came).reduce((n, l) => n + l.qty, 0);
  const count = (m) => lines.filter((l) => l.match === m).length;
  return (
    <div className="page">
      <MasterPageHeader
        eyebrow="ПОСТАВКА · ЧЕРНОВИК"
        title={P.title}
        subtitle={P.supplier + ' · загружен 18 ноя · PDF, 1 страница'}
        meta={'итог счёта ' + P.total}
        actions={<><MasterButton variant="ghost" icon={<Ic name="FileText" size={14} />}>Открыть PDF</MasterButton><MasterButton variant="ghost">Удалить черновик</MasterButton></>}
      />
      <div className="inv-parse-head">
        <MasterTag tone="success" dot>{count('memory')} по памяти</MasterTag>
        <MasterTag tone="warning" dot>{count('suggest')} предложено — проверьте</MasterTag>
        <MasterTag tone="danger" dot>{count('none')} нет в каталоге</MasterTag>
        <MasterTag tone="ghost">{count('skip')} не табак — пропущено</MasterTag>
        <span className="inv-muted" style={{ marginLeft: 'auto' }}>Подтверждённое сопоставление запомним: следующий счёт этого поставщика разберётся сам.</span>
      </div>
      {edge === 'sum' ? (
        <div className="inv-alert">
          <Ic name="TriangleAlert" />
          <p className="grow"><b>Сумма строк 21 770 ₽ не сходится с итогом счёта 22 270 ₽</b> (не хватает 500 ₽). Возможно, одна строка не распозналась. Сверьте со счётом — принять поставку можно и так.</p>
          <MasterButton size="sm">Добавить строку</MasterButton>
        </div>
      ) : null}
      <MasterList
        columns={[
          { key: 'n', label: '№', width: '34px', render: (r) => <span className="inv-faint inv-num">{r.i + 1}</span> },
          { key: 'raw', label: 'СТРОКА СЧЁТА', width: 'minmax(0,1.35fr)', wrap: true, render: (r) => <span className={'inv-raw' + (r.match === 'skip' ? ' inv-skip' : '')}>{r.raw}</span> },
          { key: 'match', label: 'ТАБАК НА ПОЛКЕ', width: 'minmax(0,1.25fr)', render: (r) => {
            if (r.match === 'skip') return <span className="inv-match"><span className="inv-faint">Пропущено</span><small>нет бренда и веса · <a className="inv-link" href="#" onClick={(e) => { e.preventDefault(); resolve(r.i, { match: 'none' }); }}>это табак</a></small></span>;
            if (r.match === 'none') return (
              <span className="inv-match">
                <span className="inv-select danger">Выбрать табак… <Ic name="ChevronDown" size={13} /></span>
                <small>{r.hint} · <a className="inv-link" href="#" onClick={(e) => { e.preventDefault(); resolve(r.i, { match: 'memory', brand: 'Blansh', name: r.raw.split(' гр ')[1] || 'новый', created: true }); }}>создать карточку</a></small>
              </span>
            );
            return (
              <span className="inv-match">
                <span className={'inv-select' + (r.match === 'suggest' ? ' warn' : '')}><span><b>{r.name}</b> <span className="inv-faint">{r.brand}</span></span><Ic name="ChevronDown" size={13} /></span>
                <small>{r.created ? 'новая карточка каталога' : r.match === 'memory' ? 'по памяти: строка этого поставщика' : 'похоже на ' + r.confidence + ' % · ' + r.hint}{r.newOnShelf ? ' · новый на полке' : ''}</small>
              </span>
            );
          } },
          { key: 'tag', label: '', width: '110px', render: (r) => (r.created ? <MasterTag tone="info">создана</MasterTag> : INV_MATCH_TAG[r.match]) },
          { key: 'grams', label: 'ФАСОВКА', width: '76px', render: (r) => (r.grams ? <span className="inv-num">{r.grams} г</span> : <span className="inv-faint">—</span>) },
          { key: 'qty', label: 'БАНОК', width: '86px', render: (r) => (r.match === 'skip' ? <span className="inv-faint">—</span> : <span className="inv-stepper"><button>−</button><span>{r.qty}</span><button>+</button></span>) },
          { key: 'price', label: 'ЦЕНА', width: '84px', align: 'right', render: (r) => <span className="inv-num">{r.price}</span> },
          { key: 'came', label: 'ПРИШЛО', width: '70px', align: 'center', render: (r) => (r.match === 'skip' ? null : <MasterToggle checked={r.came} onChange={(v) => resolve(r.i, { came: v })} label="Пришло" />) },
        ]}
        rows={lines}
      />
      <div className="inv-footbar">
        <span className="inv-date">Дата прихода <b>19.11.2026</b></span>
        <p className="grow">{edge === 'sum'
          ? <span className="inv-warn">Сумма строк 21 770 ₽ ≠ итог 22 270 ₽</span>
          : <span className="inv-ok">Сумма строк 22 270 ₽ = итог счёта</span>}
          {' · будет ' + packs + ' банок'}{pending ? <span className="inv-warn">{' · без табака: ' + pending + ' строки'}</span> : null}</p>
        <MasterButton variant="ghost">Сохранить черновик</MasterButton>
        <MasterButton variant="primary" disabled={pending > 0}>{pending ? 'Выберите табак в ' + pending + ' строках' : 'Принять поставку'}</MasterButton>
      </div>
    </div>
  );
}

function InvIdeaCard({ it }) {
  return (
    <article className="inv-idea">
      <span className="inv-eyebrow" style={{ color: 'var(--text-muted)' }}>{it.brand}</span>
      <h3 className="inv-idea-name">{it.name}</h3>
      <div className="inv-links">{it.profiles.map((p) => <MasterTag key={p} tone="neutral"><span className="inv-dot" style={{ background: invProfileColor(p) }} />{INV_PROFILE_LABEL[p]}</MasterTag>)}</div>
      <div className="inv-idea-stats">
        <span><Ic name="Star" size={13} /> {it.rating}</span>
        <span>{it.votes} оценок</span>
        <span><Ic name="Eye" size={13} /> {it.views}</span>
      </div>
      {it.why ? <p className="inv-idea-why">{it.why}</p> : null}
      <div className="inv-idea-actions">
        <a className="inv-link" href="#" onClick={(e) => e.preventDefault()}>htreviews <Ic name="ArrowUpRight" size={13} /></a>
        {it.planned ? <MasterTag tone="info">в плане</MasterTag> : <MasterButton size="sm">В план</MasterButton>}
      </div>
    </article>
  );
}

function InvCatalog({ init = {} }) {
  const [view, setView] = React.useState(init.view || 'ideas');
  const allRows = [
    ...INV_D.shelf.slice(4, 9).map((r) => ({ id: r.id, name: r.name, brand: r.brand, rating: '4,' + (3 + (r.name.length % 5)), votes: (300 + r.name.length * 61).toLocaleString('ru'), views: 20 + r.name.length * 3 + ' тыс.', shelf: true })),
    ...INV_D.ideas[0].items.map((r) => ({ id: r.name, ...r, shelf: false })),
  ];
  return (
    <div className="page">
      <MasterPageHeader
        eyebrow="КАТАЛОГ · HTREVIEWS"
        title="Каталог"
        subtitle="Все табаки: карточки htreviews и свои. Наличия здесь нет — оно на «Полке»."
        meta="11 505 карточек · синхронизация 17 ноя"
        actions={<><span className="inv-seg">
          <button aria-pressed={view === 'all'} onClick={() => setView('all')}>Все табаки</button>
          <button aria-pressed={view === 'ideas'} onClick={() => setView('ideas')}>Идеи для закупки</button>
        </span><MasterButton variant="ghost">Создать карточку</MasterButton></>}
      />
      {view === 'ideas' ? (
        <>
          {INV_D.ideas.map((g) => (
            <section key={g.title} style={{ display: 'grid', gap: 10 }}>
              <div className="inv-group-head"><h2>{g.title}</h2><span className="inv-muted">{g.hint}</span></div>
              <div className="inv-ideas">{g.items.map((it) => <InvIdeaCard key={it.brand + it.name} it={it} />)}</div>
            </section>
          ))}
          <p className="hint">Только табаки, которых нет на полке. Цифры — с последней синхронизации htreviews; отзывы и обсуждения — по ссылке на сайте.</p>
        </>
      ) : (
        <>
          <div className="toolbar">
            <MasterInput icon={<Ic name="Search" size={14} />} placeholder="Поиск по 11 505 карточкам" style={{ minWidth: 300 }} />
            <div className="toolbar-filters">
              <FilterChip>Бренд</FilterChip><FilterChip>Характер</FilterChip><FilterChip active>Нет на полке</FilterChip><FilterChip>Рейтинг от 4,5</FilterChip>
            </div>
            <MasterSortPill value="views" options={[{ key: 'views', label: 'По просмотрам' }, { key: 'rating', label: 'По рейтингу' }, { key: 'name', label: 'По названию' }]} />
          </div>
          <MasterList
            columns={[
              { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.6fr)', render: (r) => <span className="inv-name"><b>{r.name}</b><span>{r.brand}</span></span> },
              { key: 'rating', label: '★ HTREVIEWS', width: '110px', align: 'right', render: (r) => <span className="inv-num">{r.rating}</span> },
              { key: 'votes', label: 'ОЦЕНОК', width: '90px', align: 'right', render: (r) => <span className="inv-num">{r.votes}</span> },
              { key: 'views', label: 'ПРОСМОТРОВ', width: '110px', align: 'right', render: (r) => <span className="inv-num">{r.views}</span> },
              { key: 'shelf', label: 'ПОЛКА', width: '170px', render: (r) => (r.shelf ? <MasterTag tone="success" dot>на полке</MasterTag> : r.planned ? <MasterTag tone="info">в плане</MasterTag> : <MasterButton size="sm">В план</MasterButton>) },
            ]}
            rows={allRows}
          />
          <p className="hint">Серверная пагинация и поиск — как сейчас на «Табаках».</p>
        </>
      )}
    </div>
  );
}

function InvDashboard() {
  const max = Math.max(...INV_D.weekly.map((w) => w.g));
  const ending = INV_D.shelf.filter((r) => r.status === 'ending' || r.status === 'out');
  return (
    <div className="page">
      <MasterPageHeader eyebrow={'ДАШБОРД · ' + INV_D.today} title="Дашборд смены" subtitle="Полка, расход и деньги. Остальные блоки дашборда — без изменений." />
      <div className="cols">
        <MasterCard eyebrow="ПОЛКА СЕГОДНЯ" heading="Прогноз расхода">
          <div className="inv-forecast">
            <b>≈ 540 г</b>
            <span className="inv-muted">≈ 30 чаш по 18 г · четверг: +8 % к среднему дню по «Покурить»</span>
          </div>
          <div className="inv-sep" style={{ margin: '12px 0' }} />
          <h3 className="inv-h3" style={{ marginBottom: 6 }}>Заканчивается</h3>
          {ending.map((r) => (
            <div className="inv-setting" key={r.id}><span>{r.brand} {r.name}</span><InvUntil row={r} /></div>
          ))}
        </MasterCard>
        <MasterCard eyebrow="ДЕНЬГИ" heading="Траты за ноябрь">
          <div className="inv-spend">
            {INV_D.spend.map((s) => (
              <div className="inv-spend-row" key={s.supplier}><span>{s.supplier}</span><i style={{ width: s.share * 100 + '%' }} /><span className="inv-num" style={{ textAlign: 'right' }}>{s.sum}</span></div>
            ))}
          </div>
          <div className="inv-kv" style={{ marginTop: 14 }}>
            <div><span>Себестоимость чаши</span><b>≈ 137 ₽</b><small>18 г по средней цене табаков в работе</small></div>
            <div><span>Табака на полке</span><b>≈ 594 000 ₽</b><small>78 кг по ценам прихода</small></div>
          </div>
        </MasterCard>
      </div>
      <MasterCard eyebrow="РАСХОД" heading="По неделям, г">
        <div className="inv-week">
          {INV_D.weekly.map((w) => (
            <div className={'inv-bar' + (w.partial ? ' partial' : '')} key={w.label}>
              <span>{w.g.toLocaleString('ru')}</span>
              <i style={{ height: (w.g / max) * 110 + 'px', maxWidth: 90 }} />
            </div>
          ))}
        </div>
        <div className="inv-bar-labels">{INV_D.weekly.map((w) => <span key={w.label}>{w.label}{w.partial ? ' · идёт' : ''}</span>)}</div>
      </MasterCard>
    </div>
  );
}

function InvEmptyShelf({ onTab }) {
  return (
    <div className="page">
      <MasterPageHeader eyebrow="ИНВЕНТАРИЗАЦИЯ" title="Полка" subtitle="Банки на полке, расход и прогноз." />
      <div className="inv-empty-hero">
        <h2>Полка пуста</h2>
        <p>Банки появляются из поставок. Загрузите первый счёт поставщика — строки сопоставим с каталогом, вы проверите и примете. Табаки, которые уже стоят на полке, можно добавить из каталога без счёта.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />} onClick={() => onTab && onTab('parse')}>Загрузить счёт</MasterButton>
          <MasterButton variant="ghost">Добавить из каталога</MasterButton>
        </div>
      </div>
    </div>
  );
}

// Интерактивный «Мастер»: вкладки, «Закончилась», меню, карточка, поставки.
function InvApp({ start = 'shelf', init = {} }) {
  const [tab, setTab] = React.useState(start);
  const top = tab === 'parse' ? 'deliveries' : tab;
  let screen;
  if (tab === 'shelf') screen = init.empty ? <InvEmptyShelf onTab={setTab} /> : <InvShelfScreen init={init} onTab={setTab} />;
  else if (tab === 'deliveries') screen = <InvDeliveries onTab={setTab} edge={init.edge} />;
  else if (tab === 'parse') screen = <InvParse edge={init.edge} />;
  else if (tab === 'catalog') screen = <InvCatalog init={init} />;
  else if (tab === 'dashboard') screen = <InvDashboard />;
  else screen = <EmptyState>Экран не меняется в этой фиче.</EmptyState>;
  return <InvShell tab={top} onTab={setTab}>{screen}</InvShell>;
}

// ── Телефон ──
function MShelf({ sheet }) {
  const [open, setOpen] = React.useState(sheet ? 'ds-blackcurrant' : null);
  const [frac, setFrac] = React.useState(null);
  const rows = INV_D.shelf.slice(0, 7);
  const row = INV_D.shelf.find((r) => r.id === open);
  return (
    <div className="phone">
      <header className="m-top">
        <img src={INV_MARK} alt="" />
        <h1>Полка</h1>
        <MasterIconButton label="К заказу"><Ic name="ShoppingCart" /></MasterIconButton>
      </header>
      <div className="m-body">
        <div className="m-search"><Ic name="Search" size={16} /> Табак или бренд</div>
        <div className="m-chips">
          <FilterChip active count={14}>Заканчивается</FilterChip>
          <FilterChip count={38}>Последняя</FilterChip>
          <FilterChip count={6}>Закончились</FilterChip>
          <FilterChip count={269}>Все</FilterChip>
        </div>
        {rows.map((r) => (
          <article className="m-card" key={r.id}>
            <span className="inv-name"><b>{r.name}</b><span>{r.brand} · {r.grams} г</span></span>
            {r.status === 'check'
              ? <button className="m-empty-btn" onClick={() => setOpen(r.id)}>Проверить</button>
              : <button className="m-empty-btn">Закончилась</button>}
            <div className="m-card-meta">
              <button className="m-pips" onClick={() => setOpen(r.id)} aria-label={'Сколько осталось: ' + r.name}><Pips row={r} /></button>
              <span style={{ fontSize: 13, textAlign: 'right' }}><InvUntil row={r} stacked /></span>
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
              <p className="inv-eyebrow">{row.brand} · {row.grams} г</p>
              <h2>{row.name}</h2>
              <span className="inv-muted">Открытая банка · вскрыта 7 ноя · {row.mark ? 'отметка ' + row.mark : 'отметок нет'}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <h3 className="inv-h3">Сколько осталось в открытой?</h3>
              <div className="m-fracs">
                {[['1', 'полная'], ['¾', ''], ['½', ''], ['⅓', ''], ['¼', '']].map(([f, sub]) => (
                  <button key={f} className={'m-frac' + (frac === f ? ' on' : '')} onClick={() => setFrac(f)}>{f}{sub ? <small>{sub}</small> : null}</button>
                ))}
              </div>
              <span className="inv-faint" style={{ fontSize: 12 }}>Можно не отмечать — отметка только уточняет прогноз.</span>
            </div>
            <button className="m-big">Закончилась · запаса нет</button>
          </section>
        </>
      ) : null}
    </div>
  );
}

// ── Кадры доски и режим #shot= ──
const INV_SHOTS = [
  { id: 'shelf', group: 'shelf', name: 'Полка', note: 'Статусы-чипы со счётчиками, банки-пипсы, «хватит до», «Закончилась» в строке.', start: 'shelf' },
  { id: 'shelf-filters', group: 'shelf', name: 'Полка · фильтры', note: 'Все фильтры в браузере: 269 строк, без запросов к серверу.', start: 'shelf', init: { filters: true } },
  { id: 'shelf-menu', group: 'shelf', name: 'Полка · меню строки', note: 'Отметка ¾ ½ ⅓ ¼ — по желанию. Остальное — редкие действия.', start: 'shelf', init: { menu: 'ds-blackcurrant' } },
  { id: 'shelf-undo', group: 'shelf', name: 'Полка · «Закончилась» и отмена', note: 'Одно нажатие, 10 секунд на отмену, гость сразу перестаёт видеть табак.', start: 'shelf', init: { rows: INV_D.shelf.map((r) => (r.id === 'bb-cane' ? { ...r, open: null, remain: 0, status: 'out', until: 'закончился сегодня', last: false } : r)), toast: { title: 'Black Burn Cane Mint', text: 'табак закончился, гости его больше не видят. Миксов скрыто: 3. Добавлен в «К заказу».' } } },
  { id: 'shelf-drawer', group: 'shelf', name: 'Карточка на полке', note: 'История банок, расход по банкам, прогноз, настройки.', start: 'shelf', init: { drawer: 'bb-rasp' } },
  { id: 'reorder', group: 'shelf', name: 'К заказу', note: 'Группы по последнему поставщику, количество — расход на 21 день.', start: 'shelf', init: { view: 'reorder', copied: true }, tall: true },
  { id: 'deliveries', group: 'deliveries', name: 'Поставки', note: 'Счета, черновик ждёт прихода.', start: 'deliveries' },
  { id: 'delivery-parse', group: 'deliveries', name: 'Разбор счёта', note: 'Реальный счёт поставщика: память, предложения, нет в каталоге, не табак, фасовка 25 г, ×2.', start: 'parse', tall: true },
  { id: 'ideas', group: 'catalog', name: 'Каталог → Идеи для закупки', note: 'Три подборки из htreviews, ссылка на сайт, «В план».', start: 'catalog', tall: true },
  { id: 'catalog-all', group: 'catalog', name: 'Каталог → Все табаки', note: 'Каталог отделён от полки, колонки htreviews.', start: 'catalog', init: { view: 'all' } },
  { id: 'dashboard', group: 'dashboard', name: 'Дашборд: блок полки', note: 'Прогноз на сегодня, что заканчивается, траты, расход по неделям.', start: 'dashboard', tall: true },
  { id: 'edge-empty', group: 'edge', name: 'Пустая полка', start: 'shelf', init: { empty: true } },
  { id: 'edge-few', group: 'edge', name: 'Мало данных о расходе', note: 'Прогноз по бренду, пока нет своей пустой банки.', start: 'shelf', init: { drawer: 'sr-passion', few: true } },
  { id: 'edge-pdf', group: 'edge', name: 'PDF без текста', start: 'deliveries', init: { edge: 'pdf' } },
  { id: 'edge-dup', group: 'edge', name: 'Счёт уже загружен', start: 'deliveries', init: { edge: 'dup' } },
  { id: 'edge-sum', group: 'edge', name: 'Сумма не сходится', start: 'parse', init: { edge: 'sum' }, tall: true },
  { id: 'shelf-mobile', group: 'mobile', name: 'Полка · 375 px', phone: true },
  { id: 'shelf-mobile-sheet', group: 'mobile', name: 'Шторка «Сколько осталось?»', phone: true, sheet: true },
];

function InvShotView({ shot }) {
  if (shot.phone) return <MShelf sheet={shot.sheet} />;
  return <InvDesk tall={shot.tall}><InvApp start={shot.start} init={shot.init} /></InvDesk>;
}

function InvFrame({ shot }) {
  return (
    <div className="frame">
      <p className="frame-name"><b>{shot.name}</b> · #shot={shot.id}</p>
      {shot.note ? <p className="frame-note">{shot.note}</p> : null}
      <InvShotView shot={shot} />
    </div>
  );
}

function InvBoard() {
  const section = (group) => INV_SHOTS.filter((s) => s.group === group).map((s) => <InvFrame key={s.id} shot={s} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#152 · Мастер · десктоп 1280 и телефон 375</p>
        <h1 className="board-title">Инвентарь: поставки, банки, расход</h1>
        <p className="board-text">
          Каталог (что бывает) отделён от полки (что держим). Банка приходит по счёту поставщика, вскрывается сама,
          мастер отмечает только «Закончилась» и, если хочет, остаток ¾ ½ ⅓ ¼. Из дат прихода, вскрытия и окончания
          считаются расход, прогноз «хватит до» и список «К заказу». htreviews — для идей закупки.
          Табаки и миксы — прод на 19 октября; мокап показывает полку через месяц после запуска, поставщики вымышлены, цифры htreviews условные.
        </p>
      </header>

      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <p className="frame-note">Вкладки «Полка», «Поставки», «Каталог», «Дашборд»; «Закончилась» и отмена; меню «⋯»; клик по строке — карточка; «Загрузить счёт» — разбор.</p>
        <InvDesk><InvApp start="shelf" /></InvDesk>
      </section>
      <section className="board-section"><h2 className="board-h2">Полка</h2><div className="board-row">{section('shelf')}</div></section>
      <section className="board-section"><h2 className="board-h2">Телефон за стойкой</h2><div className="board-row">{section('mobile')}</div></section>
      <section className="board-section"><h2 className="board-h2">Поставки</h2><div className="board-row">{section('deliveries')}</div></section>
      <section className="board-section"><h2 className="board-h2">Каталог и идеи из htreviews</h2><div className="board-row">{section('catalog')}</div></section>
      <section className="board-section"><h2 className="board-h2">Дашборд</h2><div className="board-row">{section('dashboard')}</div></section>
      <section className="board-section"><h2 className="board-h2">Края</h2><div className="board-row">{section('edge')}</div></section>
    </div>
  );
}

function InvShot({ id }) {
  const shot = INV_SHOTS.find((s) => s.id === id) || INV_SHOTS[0];
  return <div className="shot"><InvShotView shot={shot} /></div>;
}

const invShotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(invShotId ? <InvShot id={invShotId} /> : <InvBoard />);
