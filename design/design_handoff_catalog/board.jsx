// Доска мокапа #181: Каталог — поиск и фильтры в одном месте, удобный список.
// Данные — 53 микса прода (catalog-data.js). «Сейчас», карточка микса и «Покажите мастеру» — из гостевого
// UI-кита без изменений; новое здесь — CtCatalogA, CtCatalogB, CtSuggest, CtFilterSheet.
// Верхнеуровневые имена с префиксом Ct/ct: Babel standalone делит глобальную область с GuestScreens.jsx кита.
const { AromaChip, AromaCTA, MixRow } = window.DesignSystem_1aef33;
const CT = window.AROMA_MOCK;
const ctLabel = (id) => CT.profileLabels[id] || id;
const ctPlural = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'микс'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'микса'; return 'миксов'; };
const ctByRu = (l, r) => l.localeCompare(r, 'ru');

const ctBrandCounts = CT.mixes.reduce((acc, mix) => {
  new Set(mix.components.map((c) => c.manufacturer)).forEach((b) => { acc[b] = (acc[b] || 0) + 1; });
  return acc;
}, {});
const ctProfiles = Object.keys(CT.profileCounts).sort((l, r) => CT.profileCounts[r] - CT.profileCounts[l] || ctByRu(ctLabel(l), ctLabel(r)));
const ctFlavors = [...CT.flavors].sort((l, r) => CT.flavorCounts[r] - CT.flavorCounts[l] || ctByRu(l, r));
const ctBrands = Object.keys(ctBrandCounts).sort((l, r) => ctBrandCounts[r] - ctBrandCounts[l] || ctByRu(l, r));
const ctCount = (t) => (t.type === 'profile' ? CT.profileCounts[t.value] : t.type === 'flavor' ? CT.flavorCounts[t.value] : ctBrandCounts[t.value]);
const ctTokenLabel = (t) => (t.type === 'profile' ? ctLabel(t.value) : t.value);
const ctSame = (a, b) => a.type === b.type && a.value === b.value;

// Внутри типа — «или», между типами и с текстом — «и», как фильтры каталога сейчас.
function ctFilter(query, tokens) {
  const q = query.trim().toLowerCase();
  const of = (type) => tokens.filter((t) => t.type === type).map((t) => t.value);
  const profiles = of('profile'), flavors = of('flavor'), brands = of('brand');
  return CT.mixes.filter((mix) =>
    (!profiles.length || mix.flavorProfiles.some((p) => profiles.includes(p)))
    && (!flavors.length || mix.flavors.some((f) => flavors.includes(f)))
    && (!brands.length || mix.components.some((c) => brands.includes(c.manufacturer)))
    && (!q || [mix.name, mix.description, ...mix.flavors, ...mix.components.flatMap((c) => [c.name, c.manufacturer])].join(' ').toLowerCase().includes(q)),
  );
}

// Сортировки нет (решение владельца): порядок по алфавиту, как меню.
const ctSorted = (mixes) => [...mixes].sort((l, r) => ctByRu(l.name, r.name));

// Совпавшие вкусы — первыми, чтобы было видно, почему микс в выдаче.
function ctFlavorLine(mix, query, tokens) {
  const q = query.trim().toLowerCase();
  const hit = (f) => tokens.some((t) => t.type === 'flavor' && t.value === f) || (q && f.includes(q));
  return [...mix.flavors.filter(hit), ...mix.flavors.filter((f) => !hit(f))];
}

const CT_NAV = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
];

function CtTopbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src="../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg" alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
        <button type="button" className="topbar-icon-btn" aria-label="Сменить код" title="Сменить код">
          <window.Icon name="KeyRound" size={20} />
        </button>
      </div>
    </header>
  );
}

function CtBottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {CT_NAV.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={item.id === 'catalog' ? 'page' : undefined}>
          <window.Icon name={item.icon} stroke={item.id === 'catalog' ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function CtFiltersIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

// Чип со счётчиком миксов: точка профиля — только у характера.
function CtCountChip({ token, active, onClick }) {
  return (
    <AromaChip profile={token.type === 'profile' ? token.value : undefined} active={active} onClick={onClick}>
      {ctTokenLabel(token)}<span className="ct-count">{ctCount(token)}</span>
    </AromaChip>
  );
}

function CtTokens({ tokens, onRemove }) {
  if (!tokens.length) return null;
  return (
    <div className="ct-tokens" aria-label="Выбранные фильтры">
      {tokens.map((t) => (
        <AromaChip key={t.type + t.value} active profile={t.type === 'profile' ? t.value : undefined} onClick={() => onRemove(t)}>
          {ctTokenLabel(t)}<span className="ct-x" aria-hidden>×</span>
        </AromaChip>
      ))}
    </div>
  );
}

function CtMeta({ count, dirty, onReset }) {
  return (
    <div className="aroma-catalog-meta">
      <p className="aroma-caps">{'Найдено · ' + count}</p>
      {dirty && count > 0 ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
    </div>
  );
}

function CtList({ mixes, query, tokens, onOpen }) {
  return (
    <div className="ct-list">
      {mixes.map((mix) => (
        <MixRow
          key={mix.id}
          name={mix.name}
          profiles={mix.flavorProfiles}
          flavors={ctFlavorLine(mix, query, tokens)}
          rating={mix.ratingsCount > 0 ? mix.avgRating : null}
          glyphSize={36}
          style={{ padding: '7px 12px' }}
          onClick={() => onOpen(mix, 'catalog')}
        />
      ))}
    </div>
  );
}

function CtEmpty({ query, tokens, onRemoveLast, onReset }) {
  const last = tokens.length ? '«' + ctTokenLabel(tokens[tokens.length - 1]) + '»' : query ? '«' + query.trim() + '»' : null;
  return (
    <div className="ct-empty">
      <p className="guest-status">По выбранным фильтрам ничего не найдено. Даже мастер развёл руками.</p>
      <div className="ct-empty-actions">
        {last ? <button type="button" className="aroma-ghost-sm" onClick={onRemoveLast}>{'Убрать ' + last}</button> : null}
        <button type="button" className="aroma-skip" onClick={onReset}>Сбросить всё</button>
      </div>
    </div>
  );
}

// ── A · всё в поле: подсказки под полем, выбор становится меткой ──

function CtSuggest({ query, tokens, count, short, onPick, onDone }) {
  const q = query.trim().toLowerCase();
  const free = (t) => !tokens.some((x) => ctSame(x, t));
  const groups = q
    ? [
        ['Характер', ctProfiles.filter((p) => ctLabel(p).toLowerCase().includes(q)).map((value) => ({ type: 'profile', value }))],
        ['Вкус', ctFlavors.filter((f) => f.includes(q)).map((value) => ({ type: 'flavor', value }))],
        ['Табак', ctBrands.filter((b) => b.toLowerCase().includes(q)).map((value) => ({ type: 'brand', value }))],
      ]
    : [
        ['Частые вкусы', ctFlavors.slice(0, 12).map((value) => ({ type: 'flavor', value }))],
        ['Характер', ctProfiles.map((value) => ({ type: 'profile', value }))],
        ['Табак', ctBrands.slice(0, 8).map((value) => ({ type: 'brand', value }))],
      ];
  const shown = groups.map(([title, items]) => [title, items.filter(free).slice(0, 8)]).filter(([, items]) => items.length);
  return (
    <div className={'ct-suggest' + (short ? ' short' : '')} role="listbox" aria-label="Подсказки поиска">
      {shown.map(([title, items]) => (
        <div key={title} className="ct-group">
          <p className="aroma-caps">{title}</p>
          <div className="ct-wrap">
            {items.map((t) => <CtCountChip key={t.type + t.value} token={t} onClick={() => onPick(t)} />)}
          </div>
        </div>
      ))}
      {q && !shown.length ? <p className="ct-hint">Подсказок нет — ищем по названиям и составу.</p> : null}
      <div className="ct-suggest-foot">
        <p className="ct-hint">{q ? 'И по названиям миксов' : 'Или начните вводить'}</p>
        <button type="button" className="aroma-ghost-sm" onClick={onDone}>{count ? 'Показать ' + count + ' ' + ctPlural(count) : 'Ничего не найдено'}</button>
      </div>
    </div>
  );
}

function CtCatalogA({ query, setQuery, tokens, setTokens, focused, setFocused, keyboard, onOpen }) {
  const results = ctSorted(ctFilter(query, tokens));
  const dirty = Boolean(query) || tokens.length > 0;
  const pick = (t) => { setTokens([...tokens, t]); setQuery(''); };
  const remove = (t) => setTokens(tokens.filter((x) => !ctSame(x, t)));
  const reset = () => { setTokens([]); setQuery(''); };
  const removeLast = () => (tokens.length ? setTokens(tokens.slice(0, -1)) : setQuery(''));
  return (
    <section className="aroma-catalog">
      <div className="aroma-catalog-rail ct-rail">
        <div className="ct-search-row">
          <input type="search" className={'ct-search' + (focused ? ' focus' : '')} value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} placeholder="Вкус, характер, табак или название" aria-label="Поиск по каталогу" autoComplete="off" />
        </div>
        <CtTokens tokens={tokens} onRemove={remove} />
        {focused ? <CtSuggest query={query} tokens={tokens} count={results.length} short={keyboard} onPick={pick} onDone={() => setFocused(false)} /> : null}
      </div>
      <CtMeta count={results.length} dirty={dirty} onReset={reset} />
      {results.length ? (
        <CtList mixes={results} query={query} tokens={tokens} onOpen={(mix, src) => { setFocused(false); onOpen(mix, src); }} />
      ) : (
        <CtEmpty query={query} tokens={tokens} onRemoveLast={removeLast} onReset={reset} />
      )}
    </section>
  );
}

// ── B · поле и одна шторка: «Фильтры» открывает характер и вкусы ──

function CtFilterSheet({ tokens, setTokens, count, onClose }) {
  const [find, setFind] = React.useState('');
  const [all, setAll] = React.useState(false);
  const has = (t) => tokens.some((x) => ctSame(x, t));
  const toggle = (t) => setTokens(has(t) ? tokens.filter((x) => !ctSame(x, t)) : [...tokens, t]);
  const f = find.trim().toLowerCase();
  const flavors = f ? ctFlavors.filter((x) => x.includes(f)) : all ? ctFlavors : ctFlavors.slice(0, 18);
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label="Фильтры каталога" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="ct-sheet-head">
          <h2 className="aroma-sheet-title">Фильтры</h2>
          {tokens.length ? <button type="button" className="aroma-skip" onClick={() => setTokens([])}>Сбросить</button> : null}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Характер</p>
          <div className="ct-wrap">
            {ctProfiles.map((value) => { const t = { type: 'profile', value }; return <CtCountChip key={value} token={t} active={has(t)} onClick={() => toggle(t)} />; })}
          </div>
        </section>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Вкусы</p>
          <input type="search" className="ct-sheet-search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Найти вкус" aria-label="Найти вкус" autoComplete="off" />
          <div className="ct-wrap">
            {flavors.map((value) => { const t = { type: 'flavor', value }; return <CtCountChip key={value} token={t} active={has(t)} onClick={() => toggle(t)} />; })}
          </div>
          {!f && !all ? <button type="button" className="aroma-skip" style={{ justifySelf: 'start', padding: 0 }} onClick={() => setAll(true)}>{'Все ' + ctFlavors.length + ' вкусов'}</button> : null}
          {f && !flavors.length ? <p className="ct-hint">Такого вкуса в каталоге нет.</p> : null}
        </section>
        <AromaCTA disabled={!count} onClick={onClose}>{count ? 'Показать ' + count + ' ' + ctPlural(count) : 'Ничего не найдено'}</AromaCTA>
      </section>
    </div>
  );
}

function CtCatalogB({ query, setQuery, tokens, setTokens, onOpenSheet, onOpen }) {
  const results = ctSorted(ctFilter(query, tokens));
  const dirty = Boolean(query) || tokens.length > 0;
  const remove = (t) => setTokens(tokens.filter((x) => !ctSame(x, t)));
  const reset = () => { setTokens([]); setQuery(''); };
  const removeLast = () => (tokens.length ? setTokens(tokens.slice(0, -1)) : setQuery(''));
  return (
    <section className="aroma-catalog">
      <div className="aroma-catalog-rail ct-rail">
        <div className="ct-search-row with-btn">
          <input type="search" className="ct-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Микс, вкус, табак" aria-label="Поиск по каталогу" autoComplete="off" />
          <button type="button" className={'ct-filter-btn' + (tokens.length ? ' on' : '')} onClick={onOpenSheet} aria-label={tokens.length ? 'Фильтры, выбрано ' + tokens.length : 'Фильтры'}>
            <CtFiltersIcon />
            <span>Фильтры</span>
            {tokens.length ? <span className="ct-filter-count">{tokens.length}</span> : null}
          </button>
        </div>
        <CtTokens tokens={tokens} onRemove={remove} />
      </div>
      <CtMeta count={results.length} dirty={dirty} onReset={reset} />
      {results.length ? (
        <CtList mixes={results} query={query} tokens={tokens} onOpen={onOpen} />
      ) : (
        <CtEmpty query={query} tokens={tokens} onRemoveLast={removeLast} onReset={reset} />
      )}
    </section>
  );
}

// ── Сейчас: экран кита с логикой apps/aroma-web (сортировка, рейтинг у всех) ──

function CtCatalogNow({ init, onOpen }) {
  const [query, setQuery] = React.useState(init.query || '');
  const [profiles, setProfiles] = React.useState(init.profiles || []);
  const [flavors, setFlavors] = React.useState(init.flavors || []);
  const [sort, setSort] = React.useState(init.sort || 'popularity');
  const [popoverOpen, setPopoverOpen] = React.useState(Boolean(init.popover));
  const toggle = (set) => (v) => set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  const q = query.toLowerCase();
  const results = CT.mixes
    .filter((m) => !q || [m.name, m.description, ...m.flavors, ...m.components.flatMap((c) => [c.name, c.manufacturer])].join(' ').toLowerCase().includes(q))
    .filter((m) => !profiles.length || m.flavorProfiles.some((p) => profiles.includes(p)))
    .filter((m) => !flavors.length || m.flavors.some((f) => flavors.includes(f)))
    .sort((l, r) => (sort === 'rating' && r.avgRating !== l.avgRating ? r.avgRating - l.avgRating : r.popularity - l.popularity || r.avgRating - l.avgRating || ctByRu(l.name, r.name)));
  return (
    <window.CatalogScreen
      query={query} setQuery={setQuery}
      profiles={profiles} toggleProfile={toggle(setProfiles)}
      flavors={flavors} toggleFlavor={toggle(setFlavors)}
      sort={sort} setSort={setSort}
      popoverOpen={popoverOpen} setPopoverOpen={setPopoverOpen}
      results={results} onOpen={onOpen}
      onReset={() => { setQuery(''); setProfiles([]); setFlavors([]); setSort('popularity'); }}
    />
  );
}

const CT_KEYS = [['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'], ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'], ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю']];

function CtKeyboard() {
  return (
    <div className="ct-keyboard" aria-hidden>
      {CT_KEYS.map((row, i) => <div key={i} className="ct-kb-row">{row.map((k) => <span key={k} className="ct-kb-key">{k}</span>)}</div>)}
      <div className="ct-kb-row"><span className="ct-kb-key go">123</span><span className="ct-kb-key wide">пробел</span><span className="ct-kb-key go">Найти</span></div>
    </div>
  );
}

function CtPhone({ variant = 'a', init = {} }) {
  const [query, setQuery] = React.useState(init.query || '');
  const [tokens, setTokens] = React.useState(init.tokens || []);
  const [focused, setFocused] = React.useState(Boolean(init.focused));
  const [filterSheet, setFilterSheet] = React.useState(Boolean(init.sheet));
  const [view, setView] = React.useState('catalog');
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const openMix = (mix, source) => { setSheet({ mix, source }); setRating(0); };
  const chooseMix = (mix, source) => { setSelected({ mix, source }); setSheet(null); setView('confirmation'); };
  const props = { query, setQuery, tokens, setTokens, onOpen: openMix };
  const results = ctFilter(query, tokens).length;
  return (
    <div className={'phone-shell with-bottom-nav' + (init.keyboard ? ' with-keyboard' : '')}>
      {view === 'confirmation' ? (
        <window.ConfirmationScreen mix={selected.mix} onDone={() => setView('catalog')} />
      ) : (
        <>
          <CtTopbar />
          {selected ? <window.GuestSelectedBar mix={selected.mix} source={selected.source} onOpen={() => openMix(selected.mix, selected.source)} /> : null}
          <main className="content">
            {variant === 'now' ? <CtCatalogNow init={init} onOpen={openMix} /> : null}
            {variant === 'a' ? <CtCatalogA {...props} focused={focused} setFocused={setFocused} keyboard={Boolean(init.keyboard)} /> : null}
            {variant === 'b' ? <CtCatalogB {...props} onOpenSheet={() => setFilterSheet(true)} /> : null}
          </main>
          <CtBottomNav />
        </>
      )}
      {init.keyboard ? <CtKeyboard /> : null}
      {variant === 'b' && filterSheet ? <CtFilterSheet tokens={tokens} setTokens={setTokens} count={results} onClose={() => setFilterSheet(false)} /> : null}
      <window.MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} />
    </div>
  );
}

// ── Доска ──

function CtFrame({ name, note, children }) {
  return (
    <figure className="frame">
      <figcaption className="frame-label">
        <p className="frame-name">{name}</p>
        {note ? <p className="frame-note">{note}</p> : null}
      </figcaption>
      {children}
    </figure>
  );
}

function CtToggle({ title, value, options, onChange }) {
  return (
    <div className="tweak">
      <span className="aroma-caps">{title}</span>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

const ctFl = (value) => ({ type: 'flavor', value });
const ctPr = (value) => ({ type: 'profile', value });
const ctBr = (value) => ({ type: 'brand', value });

const CT_SHOTS = [
  { id: 'now', group: 'now', name: 'Сейчас', note: 'Поле, лента профилей (видно 3 из 11) и поповер за кнопкой. «★ 4,5» у 49 миксов без оценок. 7 строк на экране.', variant: 'now', init: {} },
  { id: 'now-hidden', group: 'now', name: 'Сейчас · фильтры спрятаны', note: 'Выбраны «холодок», «малина» и сортировка по рейтингу. На экране — только точка на кнопке и «Найдено · 17».', variant: 'now', init: { flavors: ['холодок', 'малина'], sort: 'rating' } },
  { id: 'a', group: 'a', name: 'A · покой', note: 'Одно поле, ленты профилей и поповера нет. Рейтинг только у миксов с оценками, названия чаще в одну строку: 9 строк на экране вместо 7.', variant: 'a', init: {} },
  { id: 'a-focus', group: 'a', name: 'A · фокус в пустом поле', note: 'Подсказки без ввода: частые вкусы со счётчиками, характер, табак. Касание добавляет метку.', variant: 'a', init: { focused: true } },
  { id: 'a-typing', group: 'a', name: 'A · ввод «ви»', note: 'Подсказки по типам: вкусы и табаки, где есть «ви». Список под панелью уже отфильтрован по тексту.', variant: 'a', init: { focused: true, query: 'ви' } },
  { id: 'a-tokens', group: 'a', name: 'A · выбраны «холодок» и «Ягодный»', note: 'Метки под полем, каждая снимается касанием. Совпавший вкус — первым в строке микса.', variant: 'a', init: { tokens: [ctFl('холодок'), ctPr('berry')] } },
  { id: 'b', group: 'b', name: 'B · покой', note: 'Поле и кнопка «Фильтры». Ленты профилей нет, рейтинг только у миксов с оценками.', variant: 'b', init: {} },
  { id: 'b-sheet', group: 'b', name: 'B · шторка фильтров', note: 'Характер и вкусы со счётчиками, частые вкусы первыми, поиск по вкусам. Кнопка показывает, сколько миксов найдётся.', variant: 'b', init: { sheet: true, tokens: [ctFl('холодок')] } },
  { id: 'b-tokens', group: 'b', name: 'B · выбраны «холодок» и «Ягодный»', note: 'Выбранное видно метками под полем, на кнопке — счётчик.', variant: 'b', init: { tokens: [ctFl('холодок'), ctPr('berry')] } },
  { id: 'edge-empty', group: 'edge', name: 'Пусто', note: 'Adalya (текстом) и «холодок» вместе не встречаются. Одно касание убирает последнюю метку.', variant: 'b', init: { query: 'Adalya', tokens: [ctFl('холодок')] } },
  { id: 'edge-many', group: 'edge', name: 'Много меток', note: 'Пять меток в одну строку с прокруткой, шапка не растёт. На кнопке — 5.', variant: 'b', init: { tokens: [ctFl('холодок'), ctFl('малина'), ctFl('лимон'), ctPr('berry'), ctPr('fresh')] } },
  { id: 'edge-keyboard', group: 'edge', name: 'Открыта клавиатура', note: 'Табак ищется текстом: «darkside» — 12 миксов, список виден над клавиатурой.', variant: 'b', init: { query: 'darkside', keyboard: true } },
  { id: 'edge-long', group: 'edge', name: 'Длинные названия', note: 'Без «★» название получает всю ширину. Если не помещается — вторая строка.', variant: 'b', init: { tokens: [ctFl('жвачка'), ctFl('огурец'), ctFl('мохито'), ctFl('тархун')] } },
];

function CtShotFrame({ shot }) {
  return (
    <CtFrame name={shot.name} note={shot.note}>
      <CtPhone variant={shot.variant} init={shot.init} />
    </CtFrame>
  );
}

// mockups.html#shot=<id> — один телефон без доски: для скриншотов в issue и в PR реализации.
function CtShot({ id }) {
  const shot = CT_SHOTS.find((item) => item.id === id) ?? CT_SHOTS[0];
  return (
    <div className="shot">
      <CtPhone variant={shot.variant} init={shot.init} />
    </div>
  );
}

function CtBoard() {
  const [variant, setVariant] = React.useState('b');
  const section = (group) => CT_SHOTS.filter((shot) => shot.group === group).map((shot) => <CtShotFrame key={shot.id} shot={shot} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#181 · гость · 375 px</p>
        <h1 className="board-title">Каталог: поиск и фильтры в одном месте</h1>
        <p className="board-text">
          Сейчас выдачу настраивают в трёх местах: поле, лента профилей и поповер со вкусами и сортировкой.
          Два варианта собирают всё у поля поиска, владелец выбрал B: поле и одна шторка «Фильтры».
          Сортировки нет, «★» только у миксов с оценками (#185), порядок по алфавиту. Данные — 53 микса прода на 16 октября.
        </p>
      </header>

      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <div className="tweaks">
          <CtToggle title="Вариант" value={variant} options={[['b', 'B · поле и шторка'], ['a', 'A · всё в поле'], ['now', 'Сейчас']]} onChange={setVariant} />
        </div>
        <div className="board-row">
          <CtFrame name="Попробуйте: «Фильтры» → характер или вкус → метка → микс → «Покурить»">
            <CtPhone key={variant} variant={variant} />
          </CtFrame>
        </div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Итог: B · поле и одна шторка — выбран</h2>
        <div className="board-row">{section('b')}</div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Сейчас</h2>
        <div className="board-row">{section('now')}</div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">A · всё в поле — отвергнут</h2>
        <div className="board-row">{section('a')}</div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Края на варианте B</h2>
        <div className="board-row">{section('edge')}</div>
      </section>
    </div>
  );
}

const ctShotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(ctShotId ? <CtShot id={ctShotId} /> : <CtBoard />);
