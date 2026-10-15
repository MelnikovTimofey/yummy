// Доска мокапа #168: тонкая шапка + нижняя панель со значками.
// Экраны (Подбор, Витрина, Каталог, Подборка, карточка, «Покажите мастеру») — из гостевого
// UI-кита дизайн-системы без изменений; новое здесь — ThinTopbar, BottomNav и их видимость.
const DS = window.DesignSystem_1aef33;
const MOCK_DATA = window.AROMA_MOCK;

const NAV_ITEMS = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
];

function Icon({ name, size = 24, stroke = 1.8 }) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

function ThinTopbar({ onHome, onResetCode }) {
  return (
    <header className="topbar-thin">
      <button type="button" className="brand-home-btn" onClick={onHome}>
        <img className="brand-mark" src="../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg" alt="" aria-hidden />
        <span className="brand">Арома Ателье</span>
      </button>
      <button type="button" className="topbar-icon-btn" onClick={onResetCode} aria-label="Сменить код" title="Сменить код">
        <Icon name="KeyRound" size={20} />
      </button>
    </header>
  );
}

function BottomNav({ value, onChange, labels, mark }) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация" data-labels={labels ? 'true' : 'false'} data-mark={mark}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="bottom-nav-item"
          aria-label={labels ? undefined : item.label}
          aria-current={value === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <Icon name={item.icon} size={labels ? 22 : 24} stroke={value === item.id ? 2.1 : 1.8} />
          {labels ? <span className="bottom-nav-label">{item.label}</span> : null}
        </button>
      ))}
    </nav>
  );
}

// В мокапе Миксер упрощён: проверяем только, что он открывается на весь экран без панели
// и «Назад» возвращает туда, откуда гость пришёл. Сам экран не меняется.
function MixerMock({ onBack }) {
  return (
    <section className="mx">
      <header className="mx-top">
        <button type="button" className="mx-back" onClick={onBack} aria-label="Назад">←</button>
        <h1 className="mx-title">Намиксуй</h1>
        <span />
      </header>
      <div className="mx-progress">
        <div className="mx-progress-row">
          <span className="aroma-caps">Ход 1 из 3</span>
          <span className="aroma-caps">Основа · 40–70%</span>
        </div>
        <div className="mx-bar"><span /></div>
      </div>
      <article className="mx-card">
        <span className="aroma-caps">Darkside</span>
        <h2 className="mx-card-name">Wildberry</h2>
        <p className="mx-card-flavors">лесные ягоды · ежевика</p>
      </article>
      <div className="mx-actions">
        <button type="button" className="mx-round">Дальше</button>
        <button type="button" className="mx-round take">Беру</button>
      </div>
    </section>
  );
}

const TAB_VIEWS = ['recommendations', 'showcase', 'catalog'];

function GuestPhone({ initial = 'recommendations', labels = false, mark = 'line', emptyRecs = false, selectedMixId = null, initialRail = null }) {
  const [view, setView] = React.useState(initial);
  const [returnView, setReturnView] = React.useState('recommendations');
  const [rail, setRail] = React.useState(initialRail ? MOCK_DATA.rails.find((r) => r.id === initialRail) : null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(() => {
    const mix = selectedMixId && MOCK_DATA.mixes.find((m) => m.id === selectedMixId);
    return mix ? { mix, source: 'showcase' } : null;
  });
  const [query, setQuery] = React.useState('');
  const [profiles, setProfiles] = React.useState([]);
  const [flavors, setFlavors] = React.useState([]);
  const [sort, setSort] = React.useState('popularity');
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const toggle = (setter) => (value) => setter((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  const recommendations = emptyRecs ? [] : [...MOCK_DATA.mixes].sort((a, b) => b.popularity - a.popularity).slice(0, 5);
  const catalog = MOCK_DATA.mixes
    .filter((m) => !query || (m.name + ' ' + m.flavors.join(' ')).toLowerCase().includes(query.toLowerCase()))
    .filter((m) => !profiles.length || m.flavorProfiles.some((p) => profiles.includes(p)))
    .filter((m) => !flavors.length || m.flavors.some((f) => flavors.includes(f)));

  const navValue = view === 'rail' ? 'showcase' : view;
  const go = (target) => {
    if (target === 'mixer') {
      setReturnView(view === 'rail' ? 'showcase' : view);
    }
    setView(target);
  };
  const openMix = (mix, source) => { setSheet({ mix, source }); setRating(0); };
  const chooseMix = (mix, source) => { setSelected({ mix, source }); setSheet(null); setReturnView(view); setView('confirmation'); };

  const withNav = TAB_VIEWS.includes(view) || view === 'rail';

  return (
    <div className={'phone-shell' + (withNav ? ' with-bottom-nav' : '')}>
      {view === 'mixer' ? (
        <MixerMock onBack={() => setView(returnView)} />
      ) : view === 'confirmation' ? (
        <window.ConfirmationScreen mix={selected.mix} onDone={() => setView(returnView)} />
      ) : (
        <>
          {view !== 'rail' ? <ThinTopbar onHome={() => setView('recommendations')} onResetCode={() => setSelected(null)} /> : null}
          {selected && view !== 'rail' ? (
            <window.GuestSelectedBar mix={selected.mix} source={selected.source} onOpen={() => openMix(selected.mix, selected.source)} />
          ) : null}
          {view === 'rail' && rail ? (
            <div className="rail-in-shell">
              <window.RailScreen rail={rail} filters={railFilters} toggleFilter={(p) => (p === null ? setRailFilters([]) : toggle(setRailFilters)(p))} onBack={() => setView('showcase')} onOpen={openMix} />
            </div>
          ) : (
            <main className="content">
              {view === 'recommendations' ? (
                <window.RecommendationsScreen mixes={recommendations} onOpen={openMix} onChoose={chooseMix} onOpenOnboarding={() => {}} onOpenCatalog={() => setView('catalog')} />
              ) : null}
              {view === 'showcase' ? (
                <window.ShowcaseScreen onOpen={openMix} onOpenRail={(r) => { setRail(r); setRailFilters([]); setView('rail'); }} />
              ) : null}
              {view === 'catalog' ? (
                <window.CatalogScreen
                  query={query} setQuery={setQuery}
                  profiles={profiles} toggleProfile={toggle(setProfiles)}
                  flavors={flavors} toggleFlavor={toggle(setFlavors)}
                  sort={sort} setSort={setSort}
                  popoverOpen={popoverOpen} setPopoverOpen={setPopoverOpen}
                  results={catalog} onOpen={openMix}
                  onReset={() => { setQuery(''); setProfiles([]); setFlavors([]); setSort('popularity'); }}
                />
              ) : null}
            </main>
          )}
          {withNav ? <BottomNav value={navValue} onChange={go} labels={labels} mark={mark} /> : null}
        </>
      )}
      <window.MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} />
    </div>
  );
}

function Frame({ name, note, children }) {
  return (
    <figure className="frame" style={{ margin: 0 }}>
      <figcaption className="frame-label">
        <p className="frame-name">{name}</p>
        {note ? <p className="frame-note">{note}</p> : null}
      </figcaption>
      {children}
    </figure>
  );
}

function Toggle({ title, value, options, onChange }) {
  return (
    <div className="tweak">
      <span className="aroma-caps">{title}</span>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

const SHOTS = [
  { id: 'a-line', group: 'variant', name: 'A · только значки, черта', note: 'Как в Instagram. Названия — в aria-label для экранного диктора.', props: { labels: false, mark: 'line' } },
  { id: 'b-line', group: 'variant', name: 'B · значок + подпись, черта', note: 'Понятнее с первого раза: гость видит интерфейс впервые.', props: { labels: true, mark: 'line' } },
  { id: 'a-dot', group: 'variant', name: 'A · только значки, точка', note: 'Метка-точка под значком вместо черты по верхней кромке.', props: { labels: false, mark: 'dot' } },
  { id: 'b-dot', group: 'variant', name: 'B · значок + подпись, точка', note: 'Подпись и точка вместе.', props: { labels: true, mark: 'dot' } },
  { id: 'showcase', group: 'state', name: 'Витрина + «Карточка для мастера»', note: 'Выбранный микс по-прежнему закреплён под шапкой.', props: { initial: 'showcase', selectedMixId: 'm1' } },
  { id: 'catalog', group: 'state', name: 'Каталог', note: 'Поиск и фильтры прилипают к верху, панель — к низу. Последняя строка видна целиком.', props: { initial: 'catalog' } },
  { id: 'rail', group: 'state', name: 'Подборка из Витрины', note: 'Своя шапка с «←» остаётся, в панели активна Витрина.', props: { initial: 'rail', initialRail: MOCK_DATA.rails[0].id } },
  { id: 'empty', group: 'state', name: 'Пустой Подбор', note: 'Панель на месте — гость может уйти в Каталог или Миксер.', props: { emptyRecs: true } },
  { id: 'mixer', group: 'state', name: 'Миксер — без панели', note: 'Открывается на весь экран, «←» возвращает на экран, откуда пришли.', props: { initial: 'mixer' } },
];

function ShotFrame({ shot }) {
  return (
    <Frame name={shot.name} note={shot.note}>
      <GuestPhone {...shot.props} />
    </Frame>
  );
}

// mockups.html#shot=<id> — один телефон без доски: для скриншотов в issue и в PR реализации.
function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} />
    </div>
  );
}

function Board() {
  const [labels, setLabels] = React.useState(false);
  const [mark, setMark] = React.useState('line');
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#168 · гость · 375 px</p>
        <h1 className="board-title">Нижняя панель со значками</h1>
        <p className="board-text">
          Подбор, Витрина, Каталог и Миксер переезжают в панель внизу, как в Instagram. Шапка становится тонкой:
          знак и название, справа иконка «Сменить код». Экраны под панелью не меняются.
        </p>
      </header>

      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <div className="tweaks">
          <Toggle title="Подписи" value={labels} options={[[false, 'Только значки'], [true, 'Значок + подпись']]} onChange={setLabels} />
          <Toggle title="Метка" value={mark} options={[['line', 'Черта сверху'], ['dot', 'Точка снизу']]} onChange={setMark} />
        </div>
        <div className="board-row">
          <Frame name="Попробуйте: табы, подборка «Все», Миксер, карточка микса → «Покурить»">
            <GuestPhone key={String(labels) + mark} labels={labels} mark={mark} />
          </Frame>
        </div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Варианты панели — выбрать один</h2>
        <div className="board-row">
          {SHOTS.filter((shot) => shot.group === 'variant').map((shot) => <ShotFrame key={shot.id} shot={shot} />)}
        </div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Экраны и состояния (вариант A, черта)</h2>
        <div className="board-row">
          {SHOTS.filter((shot) => shot.group === 'state').map((shot) => <ShotFrame key={shot.id} shot={shot} />)}
        </div>
      </section>
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
