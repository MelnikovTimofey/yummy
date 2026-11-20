/* eslint-disable */
const { MasterTag, MasterToggle, FilterChip } = window.DesignSystem_1aef33;
const MM = window.MM;
const MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';
const COMP = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];

function Ic({ name, size = 18 }) {
  const node = window.lucide && window.lucide.icons[name];
  if (!node) return null;
  const children = Array.isArray(node[0]) ? node : node[2] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

// ── Каркас ──
function Top({ title, back, children }) {
  return (
    <header className={'m-top' + (back ? ' sub' : '')}>
      {back ? <button className="m-icon" aria-label="Назад"><Ic name="ArrowLeft" /></button> : <img src={MARK} alt="" />}
      <h1>{title}</h1>
      {children}
    </header>
  );
}
function Nav({ on, land }) {
  return (
    <nav className="m-nav">
      {['Дашборд', 'Полка', 'Поставки', 'Ещё'].map((s) => <span key={s} className={s === on ? 'on' : ''}>{s}</span>)}
    </nav>
  );
}
function Phone({ children }) { return <div className="phone">{children}</div>; }
function Land({ children }) { return <div className="land">{children}</div>; }
function Search({ text, value }) {
  return <label className={'m-search' + (value ? ' on' : '')}><Ic name="Search" size={17} /><span>{value || text}</span></label>;
}
function Filters() { return <button className="m-btn"><Ic name="SlidersHorizontal" size={16} />Фильтры</button>; }

// ── Миксы ──
const MIX_TONE = { on: 'success', swap: 'warning', hidden: 'danger', off: 'ghost' };
function MixCard({ m }) {
  return (
    <div className={'m-card' + (m.status === 'off' ? ' dim' : '')}>
      <div className="m-card-head">
        <div className="grow">
          <span className="m-title">{m.name}<small>{m.ratio}</small></span>
          <span className="m-sub m-clamp">{m.parts.join(' + ')}</span>
        </div>
      </div>
      {m.note ? <span className="m-sub m-warn" style={m.status === 'hidden' ? { color: 'var(--danger)' } : null}>{m.note}</span> : null}
      <div className="m-card-foot">
        <MasterTag tone={MIX_TONE[m.status]} dot>{m.statusText}</MasterTag>
        <span className="stats"><span>{m.picks} выб.</span><span>★ {m.rating}</span></span>
      </div>
    </div>
  );
}
function MixesList({ land }) {
  const list = MM.mixes.map((m) => <MixCard key={m.id} m={m} />);
  const body = (
    <>
      <div className="m-row"><Search text="Микс или табак" /><Filters /></div>
      <div className="m-chips">
        <FilterChip active count={64}>Все</FilterChip>
        <FilterChip count={58}>Виден гостю</FilterChip>
        <FilterChip count={4}>С заменой</FilterChip>
        <FilterChip count={2}>Скрыт</FilterChip>
      </div>
      {land ? <div className="land-grid">{list}</div> : list}
    </>
  );
  const top = <Top title="Миксы"><button className="m-btn soft sm"><Ic name="Plus" size={15} />Новый</button></Top>;
  return land
    ? <Land>{top}<div className="m-body">{body}</div><Nav on="Ещё" /></Land>
    : <Phone>{top}<div className="m-body">{body}</div><Nav on="Ещё" /></Phone>;
}

function Comp({ c, i, pct }) {
  return (
    <div className="mb-comp">
      <div className="who">
        <b><i style={{ background: COMP[i] }} />{c.name}</b>
        <span className="m-sub">{c.brand}</span>
      </div>
      <div className="mb-step"><button aria-label="Меньше">−</button><span>{pct ?? c.pct} %</span><button aria-label="Больше">+</button></div>
      {c.state === 'swap' ? <span className="note m-warn">Закончился, гостю заменит {c.analog}</span> : null}
      {c.state === 'out' ? <span className="note m-danger">Закончился, микс скрыт у гостя</span> : null}
    </div>
  );
}
function Bar({ comps }) {
  return <div className="mb-bar">{comps.map((c, i) => <i key={c.id} style={{ width: c.pct + '%', background: COMP[i] }} />)}</div>;
}
function Composition({ comps, presets, empty }) {
  return (
    <>
      <div className="mb-section"><h2>Состав{comps.length ? ` (${comps.length})` : ''}</h2>{comps.length ? <button className="m-btn ghost sm">Поровну</button> : null}</div>
      {empty ? (
        <div className="mb-empty"><b>Состав пуст</b>Добавьте табаки, пропорции настроятся здесь.</div>
      ) : (
        <>
          <Bar comps={comps} />
          {presets ? <div className="m-chips">{presets.map((p, i) => <FilterChip key={p} active={i === 0}>{p}</FilterChip>)}</div> : null}
          {comps.map((c, i) => <Comp key={c.id} c={c} i={i} />)}
        </>
      )}
      <div className="mb-add"><Ic name="Plus" size={18} />Добавить табак</div>
    </>
  );
}
function Head({ name, desc, on, tag }) {
  return (
    <>
      <p className={'mb-name' + (name ? '' : ' empty')}>{name || 'Название микса'}</p>
      <div className={'mb-desc' + (desc ? '' : ' empty')}>{desc || 'Что почувствует гость, 1–2 строки'}</div>
      <div className="mb-vis"><span className="m-row">Виден гостю{tag}</span><MasterToggle checked={on} /></div>
    </>
  );
}
function ActionBar({ sum, warn, label, disabled }) {
  return (
    <div className="m-actionbar">
      <span className={'sum' + (warn ? ' warn' : '')}><b>{sum}</b>{warn || 'сумма пропорций'}</span>
      <button className="m-btn primary" style={disabled ? { opacity: 0.45 } : null}>{label}</button>
    </div>
  );
}
function MixEdit({ variant }) {
  const e = MM.edit;
  if (variant === 'new') {
    return (
      <Phone>
        <Top title="Новый микс" back />
        <div className="m-body bar"><Head on /><Composition comps={[]} empty /></div>
        <ActionBar sum="0 %" warn="не хватает 100 %" label="Создать" disabled />
      </Phone>
    );
  }
  const comps = variant === 'warn'
    ? [{ ...e.components[0], pct: 60 }, e.components[1], { ...e.components[2], state: 'out' }]
    : e.components;
  return (
    <Phone>
      <Top title="Микс" back><button className="m-icon" aria-label="Ещё действия"><Ic name="Ellipsis" /></button></Top>
      <div className="m-body bar" style={variant === 'scrolled' ? { justifyContent: 'flex-end' } : null}>
        {variant === 'scrolled' ? null : <Head name={e.name} desc={e.description} on tag={variant === 'warn' ? <MasterTag tone="danger">скрыт, нет Cane Mint</MasterTag> : <MasterTag tone="warning">с заменой</MasterTag>} />}
        <Composition comps={comps} presets={e.presets} />
        {variant === 'scrolled' ? <p className="m-meta" style={{ margin: '4px 2px' }}>автор {e.author}</p> : null}
      </div>
      {variant === 'warn' ? <ActionBar sum="110 %" warn="лишние 10 %" label="Сохранить" disabled /> : <ActionBar sum="100 %" label="Сохранить" />}
    </Phone>
  );
}
function MixLibrary() {
  const e = MM.edit;
  return (
    <Phone>
      <Top title="Микс" back><button className="m-icon"><Ic name="Ellipsis" /></button></Top>
      <div className="m-body bar"><Head name={e.name} desc={e.description} on /><Composition comps={e.components} presets={e.presets} /></div>
      <ActionBar sum="100 %" label="Сохранить" />
      <div className="m-scrim" />
      <div className="m-sheet" style={{ top: 64 }}>
        <span className="handle" />
        <div className="m-sheet-head"><h2>Добавить табак</h2><button className="m-icon" aria-label="Закрыть"><Ic name="X" /></button></div>
        <div className="m-sheet-body">
          <Search text="Табак, бренд, вкус" />
          <div className="m-row" style={{ justifyContent: 'space-between' }}>
            <span className="m-toggle-line"><MasterToggle checked />Только в наличии</span>
            <span className="m-select">По алфавиту<Ic name="ChevronDown" size={15} /></span>
          </div>
          <span className="m-meta">251 табак на полке</span>
          {MM.library.map((t) => (
            <div key={t.id} className={'lib-row' + (t.added ? ' added' : '')}>
              <span className="grow"><b>{t.name}</b><span className="m-sub">{t.brand}, {t.flavors}</span></span>
              {t.added ? <span className="m-btn ghost sm"><Ic name="Check" size={15} />в составе</span> : <button className="m-icon boxed" aria-label={'Добавить ' + t.name}><Ic name="Plus" /></button>}
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );
}
function MixEditLand() {
  const e = MM.edit;
  return (
    <Land>
      <Top title="Микс" back><button className="m-icon"><Ic name="Ellipsis" /></button></Top>
      <div className="m-body bar">
        <div className="land-split">
          <div><Head name={e.name} desc={e.description} on tag={<MasterTag tone="warning">с заменой</MasterTag>} /></div>
          <div><Composition comps={e.components} presets={e.presets} /></div>
        </div>
      </div>
      <ActionBar sum="100 %" label="Сохранить" />
    </Land>
  );
}

// ── Каталог ──
function ShelfState({ s }) {
  if (s === 'in') return <span className="m-status"><i />на полке</span>;
  if (s === 'out') return <span className="m-status out"><i />закончился</span>;
  return <span className="m-status none"><i />не на полке</span>;
}
function Catalog({ select }) {
  const picked = ['bb-lemon', 'ah-blansh'];
  return (
    <Phone>
      <Top title="Каталог">
        {select ? <button className="m-btn ghost sm">Готово</button> : <><button className="m-icon" aria-label="Новый табак"><Ic name="Plus" /></button><button className="m-btn sm">Выбрать</button></>}
      </Top>
      <div className="m-body">
        <div className="m-seg"><button aria-pressed="true">Все табаки</button><button>Идеи для закупки</button></div>
        <div className="m-row"><Search text="Табак или бренд" /><Filters /></div>
        <div className="m-chips">
          <FilterChip active count={3216}>Все</FilterChip>
          <FilterChip count={251}>На полке</FilterChip>
          <FilterChip count={9}>Закончились</FilterChip>
          <FilterChip count={12}>Архив</FilterChip>
        </div>
        {MM.catalog.map((t) => {
          const on = select && picked.includes(t.id);
          return (
            <div key={t.id} className={'m-card' + (on ? ' sel' : '')}>
              <div className="m-card-head">
                {select ? <span className={'m-check' + (on ? ' on' : '')}>{on ? <Ic name="Check" size={14} /> : null}</span> : null}
                <span className="grow">
                  <span className="m-title">{t.name}</span>
                  <span className="m-caps">{t.brand}{t.line ? `, ${t.line}` : ''}</span>
                  <span className="m-sub">{t.flavors}</span>
                </span>
                {select ? null : t.shelf ? <button className="m-icon" aria-label={'Действия ' + t.name}><Ic name="Ellipsis" /></button> : <button className="m-btn sm">На полку</button>}
              </div>
              <div className="m-card-foot"><ShelfState s={t.shelf} /><span>{t.mixes ? `в ${t.mixes} миксах` : 'нет в миксах'}</span></div>
            </div>
          );
        })}
      </div>
      {select ? <div className="m-bulk"><b>Выбрано 2</b><button className="m-btn primary sm">На полку</button><button className="m-icon" aria-label="Ещё действия"><Ic name="Ellipsis" /></button></div> : null}
      <Nav on="Ещё" />
    </Phone>
  );
}

// ── Поставки ──
const DL_TONE = { draft: 'warning', ok: 'ghost' };
function Deliveries() {
  return (
    <Phone>
      <Top title="Поставки" />
      <div className="m-body">
        <div className="m-row">
          <button className="m-btn primary" style={{ flex: 1, height: 44 }}><Ic name="FileUp" size={17} />Загрузить счёт</button>
          <button className="m-btn" style={{ height: 44 }}>Вручную</button>
        </div>
        <span className="m-meta">Ноябрь: 1 счёт</span>
        {MM.deliveries.map((d) => (
          <div key={d.id} className="m-card">
            <div className="m-card-head">
              <span className="grow">
                <span className="m-title">{d.supplier ?? 'Стартовый приход'}</span>
                <span className="m-sub">{d.date}{d.number ? `, счёт ${d.number}` : ''}</span>
              </span>
              <MasterTag tone={DL_TONE[d.status]}>{d.statusText}</MasterTag>
            </div>
            <div className="m-card-foot"><span>{d.lines} строк</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.sum}</span></div>
          </div>
        ))}
      </div>
      <Nav on="Поставки" />
    </Phone>
  );
}
function DeliveryCard() {
  return (
    <Phone>
      <Top title="Счёт 1201" back><button className="m-icon" aria-label="Открыть PDF, удалить черновик"><Ic name="Ellipsis" /></button></Top>
      <div className="m-body bar">
        <div className="m-row"><span className="grow" style={{ display: 'grid', gap: 2 }}><span className="m-title" style={{ fontSize: 18 }}>Каспий Опт</span><span className="m-sub">счёт от 3 ноября</span></span><MasterTag tone="warning">черновик</MasterTag></div>
        <div className="dl-sum">
          <div><span className="m-meta">строк</span><b>14</b></div>
          <div><span className="m-meta">сумма</span><b>38 420 ₽</b></div>
          <div><span className="m-meta">пришло</span><b>4 ноя</b></div>
        </div>
        {MM.draftLines.map((l, i) => (
          <div key={i} className={'m-card' + (l.match === 'danger' ? ' warn' : '') + (l.skip ? ' dim' : '')}>
            <div className="m-card-head">
              <span className="grow">
                <span className="m-sub">{l.text}</span>
                {l.tobacco ? <span className="m-title">{l.tobacco} <span className="m-faint" style={{ fontWeight: 400, fontSize: 14 }}>{l.brand}</span></span> : null}
              </span>
              <span className="m-sub" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.qty}{l.qty ? <br /> : null}{l.price}</span>
            </div>
            <div className="m-card-foot">
              <MasterTag tone={l.match}>{l.label}</MasterTag>
              {l.skip ? null : <span className="m-toggle-line" style={{ fontSize: 14 }}>Пришло<MasterToggle checked={l.arrived} /></span>}
            </div>
            {l.match === 'danger' ? <div className="m-row"><button className="m-btn sm">Выбрать табак</button><button className="m-btn ghost sm">Создать карточку</button></div> : null}
          </div>
        ))}
        <button className="m-btn ghost" style={{ alignSelf: 'flex-start' }}><Ic name="Plus" size={16} />Добавить строку</button>
      </div>
      <div className="m-actionbar"><span className="sum warn"><b>Без табака: 1 строка</b>вернутся в наличие 12 табаков</span><button className="m-btn primary" style={{ opacity: 0.45 }}>Принять</button></div>
    </Phone>
  );
}

// ── Рейлы ──
function Rails() {
  return (
    <Phone>
      <Top title="Рейлы"><button className="m-btn soft sm"><Ic name="Plus" size={15} />Новый</button></Top>
      <div className="m-body">
        {MM.rails.map((r) => (
          <div key={r.id} className={'m-card' + (r.off ? ' dim' : '')}>
            <div className="m-card-head">
              <span className="grow">
                <span className="m-title">{r.name}</span>
                {r.description ? <span className="m-sub m-clamp">{r.description}</span> : null}
              </span>
            </div>
            <div className="m-card-foot">
              <span className="m-row" style={{ gap: 6 }}><MasterTag tone="ghost">{r.type}</MasterTag>{r.off ? <MasterTag tone="ghost">выключен</MasterTag> : null}</span>
              <span>{r.count ? `${r.count} миксов` : 'пусто'}</span>
            </div>
            {r.mixes ? <span className="m-sub m-clamp" style={{ color: 'var(--text-faint)' }}>{r.mixes}</span> : null}
          </div>
        ))}
      </div>
      <Nav on="Ещё" />
    </Phone>
  );
}
function RailEditor({ fresh }) {
  const r = MM.rails[0];
  return (
    <Phone>
      <Top title={fresh ? 'Новый рейл' : 'Рейл'} back />
      <div className="m-body bar">
        {fresh ? (
          <>
            <p className="mb-name empty">Название рейла</p>
            <div className="mb-desc empty">Подзаголовок для гостя</div>
            <div className="mb-section"><h2>Миксы рейла</h2></div>
            <div className="mb-empty"><b>Рейл пуст</b>Добавьте миксы кнопкой ниже.</div>
            <div className="mb-add"><Ic name="Plus" size={18} />Добавить микс</div>
          </>
        ) : (
          <>
            <p className="mb-name">{r.name}</p>
            <span className="m-row" style={{ gap: 6 }}><MasterTag tone="ghost">Статистический</MasterTag><MasterTag tone="ghost">только просмотр</MasterTag></span>
            <span className="m-sub">{r.description}</span>
            <div className="mb-section"><h2>Миксы ({r.count})</h2></div>
            {MM.mixes.slice(0, 5).map((m, i) => (
              <div key={m.id} className="lib-row"><span className="m-meta" style={{ width: 18 }}>{i + 1}</span><span className="grow"><b>{m.name}</b><span className="m-sub">{m.picks} выборов за месяц</span></span></div>
            ))}
          </>
        )}
      </div>
      {fresh ? <div className="m-actionbar"><span className="sum"><b>0 миксов</b>рейл скрыт, пока пуст</span><button className="m-btn primary" style={{ opacity: 0.45 }}>Создать</button></div> : null}
    </Phone>
  );
}

// ── Доступ и «Ещё» ──
function CodeBlock({ compact }) {
  const c = MM.code;
  return (
    <div className="code">
      <div className="code-top"><span className="m-caps">Код смены</span><span className="m-status"><i />действует</span></div>
      <div className="code-top"><span className="code-num">{c.value}</span><button className="m-btn sm"><Ic name="Copy" size={15} />Копировать</button></div>
      <div className="code-progress"><i /></div>
      <div className="code-line"><span>{c.until}</span><span>{c.left}</span></div>
      {compact ? null : <button className="m-btn ghost sm" style={{ justifySelf: 'start', paddingLeft: 0 }}>Выпустить новый код</button>}
    </div>
  );
}
function Access() {
  return (
    <Phone>
      <Top title="Доступ" />
      <div className="m-body">
        <CodeBlock />
        <div className="m-card"><div className="m-card-head"><span className="grow"><span className="m-title">Telegram-бот</span><span className="m-sub">на связи 2 мин назад</span></span><span className="m-status"><i />работает</span></div></div>
        <div className="m-row" style={{ justifyContent: 'space-between' }}><h2 className="m-h2">Операторы бота</h2><button className="m-btn sm"><Ic name="Plus" size={15} />Добавить</button></div>
        {MM.operators.map((o) => (
          <div key={o.name} className="m-card">
            <div className="m-card-head"><span className="grow"><span className="m-title">{o.name}</span><span className="m-sub">{o.phone}, {o.tg}</span></span><button className="m-icon"><Ic name="Ellipsis" /></button></div>
            <div className="m-card-foot"><span>последний {o.last}</span></div>
          </div>
        ))}
        <div className="m-row" style={{ justifyContent: 'space-between' }}><h2 className="m-h2">Доступ к Мастеру</h2><button className="m-btn sm"><Ic name="Plus" size={15} />Сотрудник</button></div>
        {MM.staff.map((s) => (
          <div key={s.login} className={'m-card' + (s.on ? '' : ' dim')}>
            <div className="m-card-head"><span className="grow"><span className="m-title">{s.name}</span><span className="m-sub">{s.login}, {s.role}</span></span><MasterToggle checked={s.on} /></div>
            <div className="m-card-foot"><span>вход {s.last}</span><button className="m-btn ghost sm">Изменить</button></div>
          </div>
        ))}
      </div>
      <Nav on="Ещё" />
    </Phone>
  );
}
function More() {
  const items = [['Library', 'Каталог'], ['Blend', 'Миксы'], ['GalleryVerticalEnd', 'Рейлы'], ['ShieldCheck', 'Доступ'], ['Sparkles', 'Что нового'], ['LogOut', 'Выйти']];
  return (
    <Phone>
      <Top title="Полка" />
      <div className="m-body" />
      <Nav on="Ещё" />
      <div className="m-scrim" />
      <div className="m-sheet" style={{ bottom: 56 }}>
        <span className="handle" />
        <div className="m-sheet-body" style={{ paddingTop: 8 }}>
          <CodeBlock compact />
          <div className="more-grid">{items.map(([ic, t]) => <span key={t}><Ic name={ic} />{t}</span>)}</div>
        </div>
      </div>
    </Phone>
  );
}

// ── Кадры ──
const SHOTS = [
  { id: 'mixes', group: 'mixes', name: 'Миксы', note: 'Карточка: название, пропорции, состав, статус у гостя и чем закрыт недостающий табак. Тап открывает микс.', C: () => <MixesList /> },
  { id: 'mix-edit', group: 'mixes', name: 'Микс, правка', note: 'Одна колонка. «Отмена» — стрелка назад, «Сохранить» и сумма в нижней панели вместо меню разделов. Шаг процента ±5, все поля 16 px.', C: () => <MixEdit /> },
  { id: 'mix-edit-scrolled', group: 'mixes', name: 'Микс, состав', note: 'Пресеты пропорций и «Поровну» над составом, у каждого табака степпер. Замена и отсутствие пишутся у табака.', C: () => <MixEdit variant="scrolled" /> },
  { id: 'mix-library', group: 'mixes', name: 'Добавить табак', note: 'Библиотека табаков переезжает в лист снизу: на телефоне ей нет места рядом с составом. Добавленные отмечены.', C: () => <MixLibrary /> },
  { id: 'mix-new', group: 'mixes', name: 'Новый микс', note: 'Пустой состав, «Создать» неактивна, пока сумма не 100 %.', C: () => <MixEdit variant="new" /> },
  { id: 'mix-warn', group: 'mixes', name: 'Микс, сумма 110 %', note: 'Сумма в нижней панели жёлтая, «Сохранить» неактивна. Табак без замены помечен красным.', C: () => <MixEdit variant="warn" /> },
  { id: 'catalog', group: 'catalog', name: 'Каталог', note: 'Карточка табака: бренд и линейка, вкусы, место на полке, в скольких миксах. Не на полке — сразу «На полку».', C: () => <Catalog /> },
  { id: 'catalog-select', group: 'catalog', name: 'Каталог, выбор', note: '«Выбрать» как на «Полке»: чекбоксы в карточках, действия в панели снизу.', C: () => <Catalog select /> },
  { id: 'deliveries', group: 'deliveries', name: 'Поставки', note: 'Загрузка счёта крупной кнопкой, без зоны «перетащите сюда». Карточка: поставщик, дата и номер, статус, строки и сумма.', C: () => <Deliveries /> },
  { id: 'delivery', group: 'deliveries', name: 'Счёт, черновик', note: 'Строка счёта карточкой: текст из PDF, найденный табак, метка сопоставления, «Пришло». Тап по табаку открывает выбор. Строка без табака решается прямо в карточке, «Принять» ждёт её. «Открыть PDF» и «Удалить черновик» в меню «⋯».', C: () => <DeliveryCard /> },
  { id: 'rails', group: 'rails', name: 'Рейлы', note: 'Тип и число миксов в подвале карточки, описание и состав в две строки.', C: () => <Rails /> },
  { id: 'rail-stat', group: 'rails', name: 'Статистический рейл', note: 'Метки под названием, текст не сжимается. Панель на всю ширину, без полоски слева.', C: () => <RailEditor /> },
  { id: 'rail-new', group: 'rails', name: 'Новый рейл', note: 'Миксы добавляются кнопкой, без подсказки «из списка слева».', C: () => <RailEditor fresh /> },
  { id: 'more', group: 'access', name: 'Ещё', note: 'Код смены сверху листа «Ещё»: назвать гостю в одно касание.', C: () => <More /> },
  { id: 'access', group: 'access', name: 'Доступ', note: 'Код смены в столбик, бот, операторы и сотрудники карточками с действиями.', C: () => <Access /> },
  { id: 'land-mixes', group: 'land', name: 'Миксы, альбомная', wide: true, note: 'Повёрнутый телефон получает телефонную вёрстку: карточки в две колонки, нижнее меню. Подсказок клавиш нет.', C: () => <MixesList land /> },
  { id: 'land-mix-edit', group: 'land', name: 'Микс, альбомная', wide: true, note: 'Название и описание слева, состав справа.', C: () => <MixEditLand /> },
];

function Frame({ shot }) {
  return (
    <div className={'frame' + (shot.wide ? ' wide' : '')}>
      <p className="frame-name"><b>{shot.name}</b>, #shot={shot.id}</p>
      <shot.C />
      {shot.note ? <p className="frame-note">{shot.note}</p> : null}
    </div>
  );
}
const GROUPS = [
  ['mixes', 'Миксы: главный сценарий'],
  ['catalog', 'Каталог'],
  ['deliveries', 'Поставки'],
  ['rails', 'Рейлы'],
  ['access', 'Код смены и доступ'],
  ['land', 'Телефон в альбомной'],
];
function Board() {
  return (
    <div className="board">
      <header className="board-head">
        <p className="board-caps">#540, Мастер, телефон 375 и 812 в альбомной</p>
        <h1 className="board-title">Мобильный Мастер</h1>
        <p className="board-text">
          Мастер правит миксы с телефона каждый день. Таблицы становятся карточками, как на «Полке», конструктор микса
          встаёт в одну колонку, библиотека табаков уходит в лист снизу. Заголовок раздела один, в шапке. Ни один экран не шире телефона,
          поля не мельче 16 px. «Дашборд» и «Полка» уже готовы и не меняются.
        </p>
      </header>
      {GROUPS.map(([g, title]) => (
        <section key={g} className="board-section">
          <h2 className="board-h2">{title}</h2>
          <div className="board-row">{SHOTS.filter((s) => s.group === g).map((s) => <Frame key={s.id} shot={s} />)}</div>
        </section>
      ))}
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
const shot = shotId && SHOTS.find((s) => s.id === shotId);
ReactDOM.createRoot(document.getElementById('root')).render(shot ? <div className="shot"><shot.C /></div> : <Board />);
