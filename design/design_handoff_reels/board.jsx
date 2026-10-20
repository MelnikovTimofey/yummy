// Доска мокапа #153: «рилсы» миксов — полноэкранная лента со сценой, сгенерированной по вкусам микса.
// Миксы — витрина прода на 2026-10-15 (../design_handoff_showcase_compact/showcase-data.js).
// Сцены здесь — CSS-приближение; в приложении это композиции Remotion в @remotion/player.
const DS = window.DesignSystem_1aef33;
const { AromaCTA, AromaChip, ProfileGlyph, SignatureBar, RatingPill, CompositionStack } = DS;
const M = window.AROMA_MOCK;
const label = (p) => M.profileLabels[p] || p;
const mixById = (id) => M.mixes.find((mix) => mix.id === id);

// Оценок гостей в снапшоте нет; для части миксов — условные, чтобы показать «★» (без оценок гостей «★» нет, #185).
const RATED = { 'mix-catalog-hit-03': [4.7, 23], 'mix-catalog-niche-09': [4.4, 9], 'mix-catalog-hit-11': [4.6, 31], 'mix-catalog-hit-13': [4.8, 40], 'mix-catalog-niche-14': [4.5, 12], 'mix-catalog-niche-10': [4.2, 6] };
const withRating = (mix) => (RATED[mix.id] ? { ...mix, avgRating: RATED[mix.id][0], ratingsCount: RATED[mix.id][1] } : mix);

// ── Правило выбора сцены ──
// Профили у миксов прода раздуты (4–8 штук) и не упорядочены по силе, поэтому сцена берётся из flavors.

const CSS_VAR = (profile) => 'var(--profile-' + profile.replace('_', '-') + ')';

const MOTIFS = {
  frost: { label: 'Холод', profile: 'minty', alt: 'fresh', words: ['холодок', 'мята', 'ментол', 'лёд', 'лед', 'ледян'] },
  bloom: { label: 'Цветы и травы', profile: 'floral_herbal', alt: 'perfume', words: ['цветочн', 'лаванда', 'ромашка', 'роза', 'бузина', 'жасмин', 'хвойн', 'базилик', 'тархун', 'травян', 'можжевельник', 'чай'] },
  juicy: { label: 'Сок', profile: 'citrus', alt: 'fruity', words: ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот', 'ананас', 'манго', 'банан', 'киви', 'персик', 'яблоко', 'груша', 'арбуз', 'дыня', 'кокос', 'марула', 'кола', 'энергетик', 'огурец'] },
  berry: { label: 'Ягоды', profile: 'berry', alt: 'fruity', words: ['малина', 'клубника', 'черника', 'вишня', 'ежевика', 'голубика', 'клюква', 'смородина', 'барбарис', 'виноград', 'ягод', 'ревень'] },
  warm: { label: 'Тепло', profile: 'dessert', alt: 'spicy', words: ['ваниль', 'шоколад', 'какао', 'печенье', 'пирог', 'чизкейк', 'тирамису', 'молоко', 'булочка', 'корица', 'кардамон', 'перец', 'кашмир', 'мед', 'мёд', 'орех', 'орчата', 'ром', 'жвачка'] },
  smoke: { label: 'Дым', profile: 'tobacco', alt: 'spicy', words: ['табачн', 'сигар', 'бекон', 'томат', 'копчен'] },
};
const CITRUS = ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот'];
const SPICE = ['корица', 'кардамон', 'перец', 'кашмир'];
const PROFILE_TO_MOTIF = { minty: 'frost', fresh: 'frost', floral_herbal: 'bloom', perfume: 'bloom', citrus: 'juicy', fruity: 'juicy', sour: 'juicy', berry: 'berry', dessert: 'warm', sweet: 'warm', spicy: 'warm', tobacco: 'smoke' };

const hits = (flavors, words) => flavors.filter((f) => words.some((w) => f.toLowerCase().includes(w)));

function pickScene(mix) {
  const scored = Object.entries(MOTIFS)
    .map(([id, motif]) => {
      const found = hits(mix.flavors, motif.words);
      return { id, found, count: found.length, first: found.length ? mix.flavors.indexOf(found[0]) : 99 };
    })
    .filter((m) => m.count)
    // Холод перебивает всё: самое яркое ощущение, и это пример клиента.
    .sort((a, b) => (b.id === 'frost') - (a.id === 'frost') || b.count - a.count || a.first - b.first);
  let primary = scored[0]?.id;
  let secondary = scored[1]?.id;
  let reason = scored[0] ? scored[0].found.join(', ') : null;
  if (!primary) {
    primary = PROFILE_TO_MOTIF[mix.flavorProfiles[0]] || 'smoke';
    reason = mix.flavorProfiles[0] ? 'профиль «' + label(mix.flavorProfiles[0]) + '»' : 'нет вкусов — «Дым»';
  }
  const colorOf = (id) => {
    const motif = MOTIFS[id];
    if (id === 'juicy') return hits(mix.flavors, CITRUS).length ? 'citrus' : 'fruity';
    if (id === 'warm') return hits(mix.flavors, SPICE).length >= hits(mix.flavors, MOTIFS.warm.words).length / 2 ? 'spicy' : 'dessert';
    return motif.profile;
  };
  return { primary, secondary, reason, c1: colorOf(primary), c2: secondary ? colorOf(secondary) : MOTIFS[primary].alt };
}

// Детерминированный шум: один и тот же микс всегда выглядит одинаково (в Remotion — random(seed)).
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ── Линейные мотивы стиля B: штрих 1.4, как у знака «Дым» ──

const SHAPES = {
  frost: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">{[0, 60, 120].map((r) => <g key={r} transform={'rotate(' + r + ')'}><path d="M0 -11V11" /><path d="M-3 -8L0 -5L3 -8M-3 8L0 5L3 8" /></g>)}</svg>,
  bloom: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M0 -11C6 -5 6 5 0 11C-6 5 -6 -5 0 -11Z" /><path d="M0 -8V8" strokeLinecap="round" /></svg>,
  juicy: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle r="10" /><circle r="7.5" />{[0, 60, 120].map((r) => <path key={r} d="M0 -7.5V7.5" transform={'rotate(' + r + ')'} />)}</svg>,
  berry: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="-4" cy="2" r="5" /><circle cx="4" cy="3" r="5" /><circle cx="0" cy="-4" r="5" /></svg>,
  warm: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M0 8V-8" /></svg>,
  smoke: <svg viewBox="0 0 40 120" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M20 118C4 96 36 78 20 58C6 40 32 22 22 2" /></svg>,
};

const PARTICLES = {
  frost: { n: 26, size: [3, 7], sizeB: [10, 18], y: [-8, 10], dur: 6 },
  bloom: { n: 12, size: [14, 26], sizeB: [14, 22], y: [70, 100], dur: 6 },
  juicy: { n: 16, size: [8, 18], sizeB: [16, 26], y: [80, 105], dur: 6 },
  berry: { n: 9, nB: 16, size: [50, 90], sizeB: [16, 24], y: [10, 60], dur: 6 },
  warm: { n: 26, size: [4, 8], sizeB: [12, 18], y: [85, 105], dur: 6 },
  smoke: { n: 9, nB: 7, size: [90, 150], sizeB: [30, 44], y: [70, 100], dur: 6 },
};

function particles(motif, rand, color, styleB, count) {
  const cfg = PARTICLES[motif];
  const [lo, hi] = styleB ? cfg.sizeB : cfg.size;
  return Array.from({ length: count ?? ((styleB && cfg.nB) || cfg.n) }, (_, i) => {
    const s = lo + rand() * (hi - lo);
    const style = {
      '--x': (rand() * 100).toFixed(1) + '%',
      '--y': (cfg.y[0] + rand() * (cfg.y[1] - cfg.y[0])).toFixed(1) + '%',
      '--s': Math.round(motif === 'smoke' && styleB ? s * 3 : s) + 'px',
      '--dl': (-rand() * cfg.dur).toFixed(2) + 's',
      '--d': cfg.dur * (motif === 'smoke' ? 2 : 1) + 's',
      '--dx': Math.round((rand() - 0.5) * 80) + 'px',
      '--pc': CSS_VAR(color),
      '--b': (rand() * 1.5).toFixed(1) + 'px',
    };
    if (motif === 'smoke' && styleB) style.width = Math.round(s) + 'px';
    return (
      <span key={motif + i} className={'p m-' + motif + (styleB ? ' p-b' : ' p-a')} style={style}>
        {styleB ? SHAPES[motif] : null}
      </span>
    );
  });
}

function Scene({ mix, styleB, playing = true }) {
  const scene = pickScene(mix);
  const rand = seeded(mix.id);
  const { primary, secondary, c1, c2 } = scene;
  return (
    <div className={'scene' + (playing ? '' : ' scene-paused')} style={{ '--c1': CSS_VAR(c1), '--c2': CSS_VAR(c2) }} aria-hidden>
      {primary === 'frost' ? <span className="frost-rim" /> : null}
      {primary === 'bloom' ? (
        <span className={'bloom-core' + (styleB ? ' bloom-core-b' : '')}>
          {[0, 72, 144, 216, 288].map((r, i) => <span key={r} className="bloom-petal" style={{ rotate: r + 'deg', animationDelay: -i * 0.4 + 's' }} />)}
        </span>
      ) : null}
      {primary === 'juicy' ? <span className={'juicy-sun' + (styleB ? ' juicy-sun-b' : '')} /> : null}
      {primary === 'warm' ? <span className="warm-glow" /> : null}
      {particles(primary, rand, c1, styleB)}
      {secondary ? particles(secondary, rand, c2, styleB, Math.ceil(PARTICLES[secondary].n / 3)) : null}
    </div>
  );
}

// ── Общие куски экрана ──

function Icon({ name, size = 24, stroke = 1.8, fill = 'none' }) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src="../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg" alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
        <button type="button" className="topbar-icon-btn" aria-label="Сменить код" title="Сменить код">
          <Icon name="KeyRound" size={20} />
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav nav-5" aria-label="Гостевая навигация">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={item.id === 'recs' ? 'page' : undefined}>
          <Icon name={item.icon} stroke={item.id === 'recs' ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

// ── Лента ──

// Гость выбрал в онбординге «Мятный» и «Ягодный»: сначала его подбор, затем остальные доступные миксы.
const LIKED = ['minty', 'berry'];
const FEED = [
  ...M.mixes.filter((m) => LIKED.some((p) => m.flavorProfiles.includes(p))).sort((a, b) => b.avgRating - a.avgRating),
  ...M.mixes.filter((m) => !LIKED.some((p) => m.flavorProfiles.includes(p))),
].map(withRating);
// Порядок кадров доски: первым — микс с холодом, как в примере клиента.
const START = ['mix-catalog-hit-03', 'mix-catalog-niche-09', 'mix-catalog-hit-11', 'mix-catalog-hit-13', 'mix-catalog-niche-14', 'mix-catalog-niche-06'];
const FEED_ORDERED = [...START.map((id) => FEED.find((m) => m.id === id)), ...FEED.filter((m) => !START.includes(m.id))];

const pad = (n) => String(n).padStart(2, '0');

function Reel({ mix, index, total, styleB, active, paused, onTogglePause, onClose, onOpen, onChoose, gone, hint }) {
  const profiles = mix.flavorProfiles.slice(0, 3);
  return (
    <section className="reel" aria-label={mix.name}>
      <Scene mix={mix} styleB={styleB} playing={active && !paused} />
      <button type="button" className="reel-tap" aria-label={paused ? 'Продолжить' : 'Пауза'} onClick={onTogglePause} />
      {paused ? <span className="reel-paused"><Icon name="Play" size={22} /></span> : null}
      <div className="reel-top">
        <button type="button" className="reel-close" aria-label="Закрыть ленту" onClick={onClose}><Icon name="X" size={22} /></button>
        <p className="reel-count">{pad(index + 1) + ' · из ' + pad(total)}</p>
        <span />
      </div>
      <div className={'reel-dock' + (active ? ' reel-reveal' : '')} key={active ? 'on' : 'off'}>
        {hint ? <span className="reel-hint"><Icon name="ChevronUp" size={18} />Листайте вверх</span> : null}
        <p className="aroma-caps">{profiles.map(label).join(' · ')}</p>
        <h2 className="reel-name">{mix.name}</h2>
        {mix.ratingsCount ? <div className="reel-meta"><RatingPill rating={mix.avgRating} count={mix.ratingsCount} /></div> : null}
        <p className="reel-flavors">{mix.flavors.join(' · ')}</p>
        <CompositionStack components={mix.components} showBar={false} />
        {gone ? <p className="reel-toast" role="status">Этот микс сейчас недоступен по наличию. Листайте дальше — остальные на месте.</p> : null}
        <div className="reel-actions">
          <button type="button" className="aroma-ghost" onClick={() => onOpen(mix)}>Подробнее</button>
          <AromaCTA pulse={!gone} disabled={gone} onClick={() => onChoose(mix)}>Покурить</AromaCTA>
        </div>
      </div>
    </section>
  );
}

function Feed({ items, start = 0, styleB, paused: initialPaused = false, gone: goneId = null, hint = false, onClose, onOpen, onChoose }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(start);
  const [paused, setPaused] = React.useState(initialPaused);
  const [gone, setGone] = React.useState(goneId ? [] : null);
  const [swiped, setSwiped] = React.useState(false);

  React.useEffect(() => {
    const root = ref.current;
    root.scrollTop = start * root.clientHeight;
    // Первый вызов observer — стартовый рилс: паузу кадра доски не сбрасываем.
    let initial = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || initial) return;
        setActive(Number(e.target.dataset.i));
        setPaused(false);
        setSwiped(true);
      });
      initial = false;
    }, { root, threshold: 0.6 });
    root.querySelectorAll('[data-i]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Рендерятся только соседи активного: остальные — пустые слоты той же высоты.
  return (
    <div className="reels" ref={ref}>
      {items.map((mix, i) => (
        <div key={mix.id} data-i={i} style={{ height: '100%', scrollSnapAlign: 'start' }}>
          {Math.abs(i - active) <= 1 ? (
            <Reel
              mix={mix}
              index={i}
              total={items.length}
              styleB={styleB}
              active={i === active}
              paused={i === active && paused}
              hint={hint && i === start && !swiped}
              gone={gone && gone.includes(mix.id)}
              onTogglePause={() => setPaused(!paused)}
              onClose={onClose}
              onOpen={onOpen}
              onChoose={(m) => (goneId === m.id && !gone.includes(m.id) ? setGone([...gone, m.id]) : onChoose(m))}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FeedEmpty({ onClose }) {
  return (
    <>
      <div className="reel-top" style={{ position: 'static' }}>
        <button type="button" className="reel-close" aria-label="Закрыть ленту" onClick={onClose}><Icon name="X" size={22} /></button>
      </div>
      <section className="reel-empty">
        <img src="../../.claude/skills/aroma-atelier-design/assets/logo-mark.svg" alt="" aria-hidden style={{ width: 56 }} />
        <p className="aroma-caps">Лента миксов</p>
        <h1 className="aroma-empty-title">Сейчас показать нечего</h1>
        <p className="aroma-empty-text">Ни одного микса в наличии. Мастер уже в курсе — спросите его, что будет сегодня.</p>
        <button type="button" className="aroma-ghost" onClick={onClose}>Вернуться</button>
      </section>
    </>
  );
}

// ── Вход в ленту ──

function EntryLink({ onOpen }) {
  return (
    <button type="button" className="reel-entry-link" onClick={() => onOpen(0)}>
      <span className="reel-entry-icon"><Icon name="Clapperboard" size={16} /></span>
      Смотреть лентой
      <Icon name="ChevronRight" size={18} />
    </button>
  );
}

function EntryStrip({ styleB, onOpen }) {
  return (
    <div className="reel-strip" role="list" aria-label="Лента миксов">
      {FEED_ORDERED.slice(0, 8).map((mix, i) => (
        <button key={mix.id} type="button" role="listitem" className="reel-strip-item" onClick={() => onOpen(i)}>
          <span className="reel-strip-thumb"><Scene mix={mix} styleB={styleB} playing={false} /></span>
          <span className="reel-strip-name">{mix.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Карточка микса из ленты: как MixSheet кита, надзаголовок «Из ленты» ──

function ReelSheet({ mix, onClose, onChoose }) {
  if (!mix) return null;
  const halo = CSS_VAR(pickScene(mix).c1);
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" onClick={(e) => e.stopPropagation()} style={{ background: 'radial-gradient(circle at 88% 0%, color-mix(in srgb, ' + halo + ' 31%, transparent) 0%, transparent 50%), var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
            <p className="aroma-caps">Из ленты</p>
            <h2 className="aroma-sheet-title">{mix.name}</h2>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
        </div>
        <p className="aroma-sheet-desc">{mix.description}</p>
        <div className="aroma-sheet-tags">
          {mix.flavorProfiles.map((p) => <AromaChip key={p} tier="lg" active profile={p}>{label(p)}</AromaChip>)}
          {mix.flavors.map((f) => <AromaChip key={f}>{f}</AromaChip>)}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Состав микса</p>
          <CompositionStack components={mix.components} />
        </section>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Ваша оценка</p>
          <div className="aroma-stars" role="group" aria-label="Оценка микса">
            {[1, 2, 3, 4, 5].map((v) => <button key={v} type="button" className="aroma-star" aria-label={'Оценить на ' + v}>★</button>)}
          </div>
        </section>
        <div className="aroma-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>К ленте</button>
          <AromaCTA pulse onClick={() => onChoose(mix)}>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

// ── Телефон ──

function GuestPhone({ view: initialView = 'recs', entry = 'A', styleB = false, start = 0, paused = false, gone = null, hint = false, sheet: initialSheet = null, empty = false }) {
  const [view, setView] = React.useState(initialView);
  const [from, setFrom] = React.useState(start);
  const [sheet, setSheet] = React.useState(initialSheet);
  const [chosen, setChosen] = React.useState(initialView === 'confirm' ? FEED_ORDERED[start] : null);
  const openFeed = (i) => { setFrom(i); setView('feed'); };
  const choose = (mix) => { setSheet(null); setChosen(mix); setView('confirm'); };

  let body;
  if (view === 'feed') {
    body = empty
      ? <FeedEmpty onClose={() => setView('recs')} />
      : <Feed items={FEED_ORDERED} start={from} styleB={styleB} paused={paused} gone={gone} hint={hint} onClose={() => setView('recs')} onOpen={setSheet} onChoose={choose} />;
  } else if (view === 'confirm') {
    body = <window.ConfirmationScreen mix={chosen} onDone={() => setView('feed')} />;
  } else {
    const recs = FEED.slice(0, 5).map((m) => ({ ...m, popularity: m.popularity || 0 }));
    body = (
      <>
        <Topbar />
        <main className="content">
          {entry === 'A' ? <EntryLink onOpen={openFeed} /> : <EntryStrip styleB={styleB} onOpen={openFeed} />}
          <window.RecommendationsScreen mixes={recs} onOpen={setSheet} onChoose={choose} onOpenOnboarding={() => {}} onOpenCatalog={() => {}} />
        </main>
        <BottomNav />
      </>
    );
  }
  return (
    <div className="phone-shell">
      {body}
      <ReelSheet mix={sheet} onClose={() => setSheet(null)} onChoose={choose} />
    </div>
  );
}

// ── Доска ──

const SCENE_EXAMPLES = [
  { motif: 'frost', id: 'mix-catalog-hit-03' },
  { motif: 'bloom', id: 'mix-catalog-niche-09' },
  { motif: 'juicy', id: 'mix-catalog-hit-11' },
  { motif: 'berry', id: 'mix-catalog-hit-13' },
  { motif: 'warm', id: 'mix-catalog-niche-14' },
  { motif: 'smoke', id: 'mix-catalog-niche-06' },
];
const SCENE_NOTES = {
  frost: 'Иней дышит по краям, сверху медленно оседает снежная пыль. Цвет — «Мятный».',
  bloom: 'Пять лепестков раскрываются и медленно вращаются, мелкие лепестки плывут вверх. Цвет — «Цветочно-травяной».',
  juicy: 'Тёплое «солнце» дышит, пузырьки поднимаются. Цвет — «Цитрусовый», без цитруса — «Фруктовый».',
  berry: 'Капли падают и расходятся, как чернила в воде. Цвет — «Ягодный».',
  warm: 'Угли и искры поднимаются от тёплого свечения снизу. Цвет — «Десертный», у пряных — «Пряный».',
  smoke: 'Клубы дыма поднимаются и тают; это же сцена по умолчанию. Цвет — «Табачный».',
};
const RULE_EXAMPLES = ['mix-catalog-hit-01', 'mix-catalog-hit-03', 'mix-catalog-niche-10', 'mix-catalog-niche-05', 'mix-catalog-hit-07', 'mix-catalog-niche-01', 'mix-catalog-niche-08', 'mix-catalog-niche-04'];

function Frame({ name, note, children }) {
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

const SHOTS = [
  { id: 'entry-a', group: 'entry', name: 'Вход A · ссылка над подбором', note: 'Тихая ссылка «Смотреть лентой» над «Лучшим совпадением», как «Подобрать под настроение». Подбор не меняется.', props: { entry: 'A' } },
  { id: 'entry-b', group: 'entry', name: 'Вход B · полоса превью', note: 'Кружки со статичным кадром сцены над подбором, как Stories. Нажатие открывает ленту с этого микса.', props: { entry: 'B' } },
  { id: 'reel-first', group: 'feed', name: 'Первый рилс', note: 'Сцена «Холод». Подсказка «Листайте вверх» исчезает после первого свайпа. Листайте колесом или тачпадом внутри телефона.', props: { view: 'feed', hint: true } },
  { id: 'reel-bloom', group: 'feed', name: 'Цветы', note: '«Цветочный коктейль»: маргарита и цветочный. Рядом с текстом сцена приглушена доком.', props: { view: 'feed', start: 1 } },
  { id: 'reel-long', group: 'feed', name: 'Длинный состав', note: '«Френч-коктейль»: шесть вкусов и четыре табака. Название — до двух строк, док растёт вверх, сцена остаётся сверху.', props: { view: 'feed', start: FEED_ORDERED.findIndex((m) => m.id === 'mix-catalog-niche-10') } },
  { id: 'reel-norating', group: 'feed', name: 'Без оценок гостей', note: '«Томат с перцем» гости ещё не оценивали — «★» нет, как в карточке (#185). Сцена «Дым».', props: { view: 'feed', start: 5 } },
  { id: 'reel-paused', group: 'feed', name: 'Пауза', note: 'Тап по сцене — пауза, ещё тап — продолжение. Текст и кнопки нажимаются как обычно.', props: { view: 'feed', start: 2, paused: true } },
  { id: 'reel-sheet', group: 'edge', name: 'Подробнее', note: 'Карточка микса поверх ленты: надзаголовок «Из ленты», оценка, «К ленте».', props: { view: 'feed', start: 3, sheet: withRating(mixById('mix-catalog-hit-13')) } },
  { id: 'reel-confirm', group: 'edge', name: '«Покурить» → «Покажите мастеру»', note: 'Тот же экран и то же событие smoke-cta. «Готово» возвращает в ленту на тот же рилс.', props: { view: 'confirm', start: 0 } },
  { id: 'reel-gone', group: 'edge', name: 'Микс закончился', note: 'Пока гость листал, табак кончился: smoke-cta отвечает 404. Нажмите «Покурить» — строка-статус и неактивная CTA, листать дальше можно.', props: { view: 'feed', start: 4, gone: 'mix-catalog-niche-14' } },
  { id: 'reel-empty', group: 'edge', name: 'Пустая лента', note: 'Ни одного доступного микса. Факт первым, затем выход.', props: { view: 'feed', empty: true } },
];

function ShotFrame({ shot, styleB }) {
  return (
    <Frame name={shot.name} note={shot.note}>
      <GuestPhone {...shot.props} styleB={shot.props.styleB ?? styleB} />
    </Frame>
  );
}

function Shot({ id, styleB }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} styleB={styleB} />
    </div>
  );
}

function SceneTile({ motif, id }) {
  const mix = mixById(id);
  return (
    <figure className="scene-tile">
      <div className="scene-pair">
        <div className="scene-box"><Scene mix={mix} /><span className="scene-box-label">A · Атмосфера</span></div>
        <div className="scene-box"><Scene mix={mix} styleB /><span className="scene-box-label">B · Образ</span></div>
      </div>
      <p className="scene-tile-name">{MOTIFS[motif].label + ' — ' + mix.name}</p>
      <p className="scene-tile-note">{SCENE_NOTES[motif]}</p>
    </figure>
  );
}

function RuleTable() {
  return (
    <table className="rule-table">
      <thead>
        <tr><th>Микс</th><th>flavors</th><th>flavorProfiles</th><th>Сцена</th><th>Почему</th></tr>
      </thead>
      <tbody>
        {RULE_EXAMPLES.map((id) => {
          const mix = mixById(id);
          const scene = pickScene(mix);
          return (
            <tr key={id}>
              <td>{mix.name}</td>
              <td>{mix.flavors.join(' · ')}</td>
              <td>{mix.flavorProfiles.map(label).join(' · ')}</td>
              <td className="rule-hit">{MOTIFS[scene.primary].label + (scene.secondary ? ' + ' + MOTIFS[scene.secondary].label.toLowerCase() : '')}</td>
              <td>{scene.reason}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Board() {
  const [styleB, setStyleB] = React.useState(new URLSearchParams(location.hash.slice(1)).get('style') === 'B');
  const section = (group) => SHOTS.filter((shot) => shot.group === group).map((shot) => <ShotFrame key={shot.id + styleB} shot={shot} styleB={styleB} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#153 · мокап на согласование</p>
        <h1 className="board-title">«Рилсы» миксов</h1>
        <p className="board-text">Полноэкранная лента миксов: свайп вверх — следующий микс. Фон рилса — сцена, сгенерированная по вкусам микса: мятный дышит холодом, цветочный раскрывается лепестками. Сцены здесь — CSS-приближение. В приложении это композиции Remotion, их играет @remotion/player на телефоне гостя, без видеофайлов и без нагрузки на сервер. Миксы — витрина прода на 15 октября.</p>
        <div className="tweaks">
          <div className="tweak">
            <span className="aroma-caps">Стиль сцен</span>
            <button type="button" className={styleB ? '' : 'on'} onClick={() => setStyleB(false)}>A · Атмосфера</button>
            <button type="button" className={styleB ? 'on' : ''} onClick={() => setStyleB(true)}>B · Образ</button>
          </div>
        </div>
      </header>
      <section className="board-section" id="scenes">
        <h2 className="board-h2">Сцены: A или B</h2>
        <p className="board-text">A продолжает язык ProfileGlyph: размытые орбы, туман и свет в цветах профиля, без предметов. B — тонкие линейные мотивы штрихом знака «Дым»: снежинки, лепестки, дольки, ягоды. Оба стиля — исключение из правила «без иллюстраций» (VISUAL FOUNDATIONS), только для ленты.</p>
        <div className="scene-grid">{SCENE_EXAMPLES.map((s) => <SceneTile key={s.motif} {...s} />)}</div>
      </section>
      <section className="board-section" id="rule">
        <h2 className="board-h2">Как выбирается сцена</h2>
        <p className="board-text">У миксов прода по 4–8 профилей, и порядок профилей не говорит, какой главный: у «Морозной ягоды» первым идёт «Цветочно-травяной». Поэтому сцена берётся из flavors: каждый вкус относится к одному из шести мотивов, побеждает мотив с бо́льшим числом вкусов, при равенстве — тот, чей вкус идёт раньше. Холод перебивает всё. Второй мотив добавляет треть частиц своего цвета. Вкусы не узнали — сцена по первому профилю, профилей нет — «Дым».</p>
        <RuleTable />
      </section>
      <section className="board-section" id="entry">
        <h2 className="board-h2">Вход в ленту</h2>
        <div className="board-row">{section('entry')}</div>
      </section>
      <section className="board-section" id="feed">
        <h2 className="board-h2">Лента</h2>
        <div className="board-row">{section('feed')}</div>
      </section>
      <section className="board-section" id="edge">
        <h2 className="board-h2">Подробнее, выбор и края</h2>
        <div className="board-row">{section('edge')}</div>
      </section>
    </div>
  );
}

const params = new URLSearchParams(location.hash.slice(1));
const shotId = params.get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} styleB={params.get('style') === 'B'} /> : <Board />);
