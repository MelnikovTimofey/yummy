// Доска мокапа #349: рилсы второй пункт панели, лента продолжает Подбор без повторов.
// Перерисовано под канон #348: Подбор, рилс, приглашение и сцены берутся из гостевого UI-кита после перевода на канон
// (GuestScreens.jsx), имена кита здесь не переопределяются. Миксы: витрина прода на 2026-10-15.

// ── Данные ──

// Оценок гостей в снапшоте нет; для части миксов условные, чтобы показать «★».
const RATED = { 'mix-catalog-hit-03': [4.7, 23], 'mix-catalog-hit-04': [4.5, 17], 'mix-catalog-hit-11': [4.6, 31], 'mix-catalog-hit-13': [4.8, 40], 'mix-catalog-hit-22': [4.3, 8] };
const POPULAR = { 'mix-catalog-hit-03': 18 };
const CATALOG = window.AROMA_MOCK.mixes.map((mix) => ({
  ...mix,
  ...(RATED[mix.id] ? { avgRating: RATED[mix.id][0], ratingsCount: RATED[mix.id][1] } : { ratingsCount: 0 }),
  popularity: POPULAR[mix.id] ?? mix.popularity,
}));
const mixOf = (id) => CATALOG.find((mix) => mix.id === id);

// Гость без входа выбрал «Мятный» и «Ягодный». Выдача рекомендаций — 6 миксов, на экране герой и четыре
// «Тоже подходят»: шестой в Подбор не влез и открывает ленту.
const RANKED = ['mix-catalog-hit-03', 'mix-catalog-hit-01', 'mix-catalog-hit-10', 'mix-catalog-hit-26', 'mix-catalog-hit-05', 'mix-catalog-hit-04'].map(mixOf);
const ON_SCREEN = 5;

// «Для вас» вошедшего: набор из мокапа кабинета (#151), причины без middot и тире (инвентаризация №40–41).
const FOR_YOU = {
  hero: { mix: mixOf('mix-catalog-hit-08'), reason: 'Ягодное, как вы любите, на персиковом чае.' },
  taste: [
    { mix: mixOf('mix-catalog-hit-10'), reason: 'Черника и холодок, как в ваших любимых' },
    { mix: mixOf('mix-catalog-hit-03'), reason: 'Свежее и ягодное, но с яблоком' },
    { mix: mixOf('mix-catalog-hit-26'), reason: 'Похоже на «Морозную ягоду», только виноград и манго' },
  ],
  sidestep: { mix: mixOf('mix-catalog-hit-02'), reason: 'Мастера часто сводят ягодное с цитрусовым' },
  again: { mix: mixOf('mix-catalog-hit-01'), reason: 'Ваша оценка ★ 5, выбирали 5 раз' },
};
const FOR_YOU_SHOWN = [FOR_YOU.hero, ...FOR_YOU.taste, FOR_YOU.sidestep, FOR_YOU.again].map((row) => row.mix);

// Продолжение: сначала рекомендации, не поместившиеся на Подбор, затем остальной каталог, без показанных.
function continuation(ranked, shown, catalog) {
  const seen = new Set(shown.map((mix) => mix.id));
  return [...ranked, ...catalog].filter((mix) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}

// Пять миксов в наличии: каталог не больше Подбора, продолжение пустое.
const SMALL_CATALOG = RANKED.slice(0, ON_SCREEN);

const PERSONAS = {
  anon: { kind: 'anon', recs: RANKED, feed: continuation(RANKED, RANKED.slice(0, ON_SCREEN), CATALOG) },
  li: { kind: 'li', feed: continuation([], FOR_YOU_SHOWN, CATALOG) },
  empty: { kind: 'empty', recs: [], feed: CATALOG },
  small: { kind: 'anon', recs: SMALL_CATALOG, feed: [] },
  none: { kind: 'empty', recs: [], feed: [], noStock: true },
};

const mixCount = (n) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return n + ' микс';
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return n + ' микса';
  return n + ' миксов';
};

// ── Оболочка ──

const MARK_SRC = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

// #349: рилсы вторые, сразу после Подбора.
const NAV_BEFORE = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];
const NAV_AFTER = ['recs', 'reels', 'showcase', 'catalog', 'mixer', 'cabinet'].map((id) => NAV_BEFORE.find((item) => item.id === id));

function GuestNav({ value, onChange, items = NAV_AFTER }) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {items.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function GuestTopbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src={MARK_SRC} alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
      </div>
    </header>
  );
}

// ── Подбор ──

// Последний блок Подбора. Под ним край: дотягивание за него открывает ленту, тап тоже.
function ReelsTeaser({ feed, onOpen }) {
  return (
    <button type="button" className="rt" onClick={onOpen}>
      <Icon name="ChevronUp" size={20} />
      <span className="rt-title">{feed.length ? 'Ещё ' + mixCount(feed.length) + ' в рилсах' : 'Других миксов нет'}</span>
    </button>
  );
}

function ReasonRows({ rows }) {
  return (
    <div className="fy-list">
      {rows.map((row) => (
        <button key={row.mix.id} type="button" className="cab-row">
          <ProfileGlyph profiles={row.mix.flavorProfiles} size={44} />
          <span className="cab-row-text">
            <span className="cab-row-name">{row.mix.name}</span>
            <span className="cab-row-reason">{row.reason}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// «Для вас» (personal) по #360: без подзаголовка и надписей слотов, слоты — заголовки секций. Приглашения нет и сейчас.
function ForYouView({ teaser }) {
  const { hero } = FOR_YOU;
  return (
    <section className="aroma-recs">
      <h1 className="fy-title">Для вас</h1>
      <button type="button" className="fy-mood-link">Подобрать под настроение</button>
      <h2 className="aroma-section-title">Новое в вашем вкусе</h2>
      <article className="aroma-recs-hero">
        <div className="aroma-recs-hero-head">
          <ProfileGlyph profiles={hero.mix.flavorProfiles} size={64} />
          <div className="aroma-recs-hero-text">
            <h2 className="aroma-recs-hero-title">{hero.mix.name}</h2>
            <p className="aroma-recs-hero-desc">{hero.reason}</p>
          </div>
        </div>
        <SignatureBar profiles={hero.mix.flavorProfiles} height={6} />
        <CompositionStack components={hero.mix.components} showBar={false} />
        <AromaCTA>Покурить</AromaCTA>
      </article>
      <ReasonRows rows={FOR_YOU.taste} />
      <h2 className="aroma-section-title">Шаг в сторону</h2>
      <ReasonRows rows={[FOR_YOU.sidestep]} />
      <h2 className="aroma-section-title">Снова</h2>
      <ReasonRows rows={[FOR_YOU.again]} />
      {teaser}
    </section>
  );
}

// Онбординг пропущен: Подбор пуст, тизера нет (инвентаризация №25–26).
function EmptyRecs() {
  return (
    <section className="aroma-recs-empty">
      <h1 className="aroma-empty-title">Сначала выберите вкусы</h1>
      <p className="aroma-empty-text">Выберите вкусы, и мы соберём подбор.</p>
      <div className="aroma-empty-actions">
        <AromaCTA>Открыть предпочтения</AromaCTA>
        <button type="button" className="aroma-skip">Открыть каталог</button>
      </div>
    </section>
  );
}

// ── Дотягивание за край ──
// Срабатывает только сверх края: долистать до низа мало, нужно потянуть дальше на PULL_FIRE px.

const PULL_FIRE = 120;
const PULL_MAX = 190;

function usePull({ atEdge, sign, onFire, initial = 0 }) {
  const [pull, setPullState] = React.useState(initial);
  const [dragging, setDragging] = React.useState(false);
  const state = React.useRef({ pull: initial, timer: 0, y: null });
  const setPull = (value) => { state.current.pull = value; setPullState(value); };
  const release = () => {
    const fire = state.current.pull >= PULL_FIRE;
    setDragging(false);
    setPull(0);
    if (fire) onFire();
  };
  // Сопротивление: лента идёт за пальцем вдвое медленнее, как резинка у края в iOS.
  const add = (delta) => {
    setDragging(true);
    setPull(Math.max(0, Math.min(PULL_MAX, state.current.pull + delta * 0.5)));
  };
  const handlers = {
    onWheel: (e) => {
      const delta = e.deltaY * sign;
      if (state.current.pull === 0 && (delta <= 0 || !atEdge())) return;
      add(delta);
      clearTimeout(state.current.timer);
      state.current.timer = setTimeout(release, 180);
    },
    onPointerDown: (e) => { state.current.y = e.clientY; },
    onPointerMove: (e) => {
      if (state.current.y == null) return;
      const delta = (state.current.y - e.clientY) * sign;
      state.current.y = e.clientY;
      if (state.current.pull === 0 && (delta <= 0 || !atEdge())) return;
      add(delta);
    },
    onPointerUp: () => {
      if (state.current.y == null) return;
      state.current.y = null;
      if (state.current.pull > 0) release();
    },
  };
  handlers.onPointerLeave = handlers.onPointerUp;
  return { pull, dragging, handlers };
}

// Кольцо — ход до порога; на пороге заливается. Подписи нет: жест уже идёт.
function PullRing({ pull, dir }) {
  const r = 18;
  const len = 2 * Math.PI * r;
  return (
    <span className={'pull-ring' + (pull >= PULL_FIRE ? ' pull-ring-ready' : '')} aria-hidden>
      <svg className="ring" viewBox="0 0 40 40">
        <circle className="ring-track" cx="20" cy="20" r={r} />
        <circle className="ring-fill" cx="20" cy="20" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, pull / PULL_FIRE))} />
      </svg>
      <Icon name={dir === 'down' ? 'ChevronDown' : 'ChevronUp'} size={18} />
    </span>
  );
}

function RecsScreen({ persona, at, pull: initialPull, variantB, onReels }) {
  const ref = React.useRef(null);
  const { kind, recs, feed } = persona;
  const teaser = kind === 'empty' ? null : <ReelsTeaser feed={feed} onOpen={onReels} />;
  const { pull, dragging, handlers } = usePull({
    initial: initialPull,
    sign: 1,
    atEdge: () => teaser && ref.current.scrollTop + ref.current.clientHeight >= ref.current.scrollHeight - 2,
    onFire: onReels,
  });
  React.useEffect(() => {
    if (at === 'end') ref.current.scrollTop = ref.current.scrollHeight;
  }, []);

  let body;
  if (kind === 'li') body = <ForYouView teaser={teaser} />;
  else if (kind === 'empty') body = <EmptyRecs />;
  else body = (
    <>
      <RecommendationsScreen mixes={recs} onOpen={() => {}} onChoose={() => {}} onOpenOnboarding={() => {}} onOpenMixer={variantB ? undefined : () => {}} />
      {teaser}
    </>
  );

  return (
    <div className={'pull-wrap' + (dragging ? ' dragging' : '')} {...(teaser ? handlers : {})}>
      <main className="content" ref={ref} style={{ transform: pull ? 'translateY(' + -pull + 'px)' : undefined }}>{body}</main>
      {teaser ? (
        <div className="pull-reveal pull-reveal-bottom" style={{ height: pull }}>
          {feed[0] ? <Scene mix={feed[0]} playing={false} /> : null}
          {pull ? <PullRing pull={pull} dir="up" /> : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Лента ──

// Конец ленты по инвентаризации №52. Пояснение «Можно собрать свой.» не ставим: его пересказывает кнопка.
function FeedEnd() {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      <h2 className="aroma-empty-title">Это все миксы</h2>
      <AromaCTA>Собрать свой микс</AromaCTA>
    </section>
  );
}

// Пустая лента по инвентаризации №51: ни одного микса в наличии.
function FeedEmpty() {
  return (
    <section className="reel-end">
      <h1 className="aroma-empty-title">Миксов в наличии нет</h1>
      <p className="aroma-empty-text">Спросите мастера, что есть сегодня.</p>
    </section>
  );
}

function ReelsView({ persona, backPull, onBack }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(0);
  const canBack = persona.kind !== 'empty';
  const { pull, dragging, handlers } = usePull({
    initial: backPull,
    sign: -1,
    atEdge: () => canBack && ref.current.scrollTop <= 0,
    onFire: onBack,
  });

  React.useEffect(() => {
    const root = ref.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)); });
    }, { root, threshold: 0.6 });
    root.querySelectorAll('[data-i]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const { feed } = persona;
  const back = <button type="button" className="reel-back" onClick={onBack}>К подбору</button>;
  return (
    <div className={'pull-wrap' + (dragging ? ' dragging' : '')} {...(canBack ? handlers : {})}>
      {canBack ? (
        <div className="pull-reveal pull-reveal-top" style={{ height: pull }}>
          {pull ? <PullRing pull={pull} dir="down" /> : null}
        </div>
      ) : null}
      <div className="reels" ref={ref} style={{ transform: pull ? 'translateY(' + pull + 'px)' : undefined }}>
        {persona.noStock ? (
          <div className="reel-slot"><FeedEmpty /></div>
        ) : (
          <>
            {feed.map((mix, i) => (
              <div key={mix.id} data-i={i} className="reel-slot">
                {Math.abs(i - active) <= 1 ? (
                  <Reel mix={mix} active={i === active && !pull} paused={false} hint={i === 0} favorite={false} onFavorite={() => {}} onTogglePause={() => {}} onOpen={() => {}} onChoose={() => {}} />
                ) : null}
                {canBack && i === 0 ? back : null}
              </div>
            ))}
            <div data-i={feed.length} className="reel-slot">
              <FeedEnd />
              {canBack && !feed.length ? back : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Телефон ──

function GuestPhone({ persona: personaId = 'anon', view: initialView = 'recs', at = 'top', pull = 0, backPull = 0, variantB = false }) {
  const persona = PERSONAS[personaId];
  const [view, setView] = React.useState(initialView);
  // Возврат свайпом — на то же место: в конец Подбора, к тизеру.
  const [recsAt, setRecsAt] = React.useState(at);
  const go = (next) => { setRecsAt('top'); setView(next); };

  let body;
  if (view === 'recs') {
    body = (
      <>
        <GuestTopbar />
        <RecsScreen key={recsAt} persona={persona} at={recsAt} pull={view === initialView ? pull : 0} variantB={variantB} onReels={() => setView('reels')} />
      </>
    );
  } else if (view === 'reels') {
    body = <ReelsView persona={persona} backPull={view === initialView ? backPull : 0} onBack={() => { setRecsAt('end'); setView('recs'); }} />;
  } else {
    body = (
      <>
        <GuestTopbar />
        <main className="content"><p className="guest-status">{NAV_BEFORE.find((item) => item.id === view).label}: экран не меняется.</p></main>
      </>
    );
  }
  return (
    <div className="phone-shell">
      {body}
      <GuestNav value={view} onChange={go} />
    </div>
  );
}

// ── Доска ──

function Frame({ name, note, children }) {
  return (
    <figure className="frame">
      <p className="frame-name">{name}</p>
      {note ? <p className="frame-note">{note}</p> : null}
      {children}
    </figure>
  );
}

const SHOTS = [
  { id: 'end-anon', group: 'end', name: 'Без входа', note: 'Приглашение, под ним тизер. Под тизером край.', props: { at: 'end' } },
  { id: 'end-li', group: 'end', name: 'Вошедший', note: 'После «Снова» сразу тизер.', props: { persona: 'li', at: 'end' } },
  { id: 'end-anon-b', group: 'end', name: 'Вариант Б', note: 'Тизер вместо приглашения.', props: { at: 'end', variantB: true } },
  { id: 'pull-mid', group: 'pull', name: 'Тянем', note: 'Кольцо показывает ход до порога.', props: { at: 'end', pull: 84 } },
  { id: 'pull-ready', group: 'pull', name: 'Порог', note: '120 px сверх края. Отпустил, открылись рилсы.', props: { at: 'end', pull: 150 } },
  { id: 'cont-first', group: 'reels', name: 'Первый рилс', note: 'Шестой из выдачи: на Подбор не влез.', props: { view: 'reels' } },
  { id: 'cont-first-li', group: 'reels', name: 'Первый рилс, вошедший', note: 'Каталог без шести миксов «Для вас».', props: { persona: 'li', view: 'reels' } },
  { id: 'back-pull', group: 'reels', name: 'Назад', note: 'Свайп вниз ведёт в конец Подбора.', props: { view: 'reels', backPull: 150 } },
  { id: 'nav-recs', group: 'nav', name: 'Подбор', note: 'Без полосы кружков.', props: {} },
  { id: 'nav-reels', group: 'nav', name: 'Рилсы из панели', note: 'Та же лента.', props: { view: 'reels' } },
  { id: 'empty-recs', group: 'edge', name: 'Подбор пуст', note: 'Тизера нет.', props: { persona: 'empty' } },
  { id: 'empty-reels', group: 'edge', name: 'Подбор пуст, рилсы', note: 'Весь каталог. Назад некуда.', props: { persona: 'empty', view: 'reels' } },
  { id: 'small-end', group: 'edge', name: 'Продолжение пустое', note: 'Все миксы уже на Подборе.', props: { persona: 'small', at: 'end' } },
  { id: 'small-reels', group: 'edge', name: 'Конец ленты', note: 'Пустое продолжение начинается с него.', props: { persona: 'small', view: 'reels' } },
  { id: 'feed-empty', group: 'edge', name: 'Пустая лента', note: 'В наличии ни одного микса.', props: { persona: 'none', view: 'reels' } },
];

function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} />
    </div>
  );
}

function NavCompare() {
  const row = (title, items) => (
    <div className="nav-compare-row">
      <p className="frame-name">{title}</p>
      <GuestNav value="recs" items={items} onChange={() => {}} />
      <div className="nav-compare-labels">{items.map((item) => <span key={item.id}>{item.label}</span>)}</div>
    </div>
  );
  return (
    <div className="nav-compare">
      {row('Было', NAV_BEFORE)}
      {row('Стало', NAV_AFTER)}
    </div>
  );
}

function Board() {
  const row = (group) => SHOTS.filter((shot) => shot.group === group).map((shot) => (
    <Frame key={shot.id} name={shot.name} note={shot.note}><GuestPhone {...shot.props} /></Frame>
  ));
  return (
    <div className="board">
      <header className="board-head">
        <h1 className="board-title">Рилсы после Подбора</h1>
        <p className="board-text">Мокап #349 по канону #348. Подбор продолжается рилсами без повторов, рилсы стали вторым пунктом панели.</p>
        <p className="board-text">Телефоны живые: колесо или мышь у нижнего края тянут за край, тап по тизеру открывает рилсы.</p>
      </header>
      <section className="board-section">
        <h2 className="board-h2">Конец Подбора</h2>
        <p className="frame-note">Основной вариант или Б: выбор владельца.</p>
        <div className="board-row">{row('end')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Дотягивание за край</h2>
        <div className="board-row">{row('pull')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Лента</h2>
        <div className="board-row">{row('reels')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Нижняя панель</h2>
        <NavCompare />
        <div className="board-row">{row('nav')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Края</h2>
        <div className="board-row">{row('edge')}</div>
      </section>
    </div>
  );
}

const shotParam = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotParam ? <Shot id={shotParam} /> : <Board />);
