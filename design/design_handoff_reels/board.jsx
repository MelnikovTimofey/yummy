// Доска мокапа #153: «рилсы» миксов — раздел нижней панели с лентой миксов; фон рилса — сцена по вкусам микса.
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

// Рилсы — отдельный раздел панели, как Reels в Instagram: третьим, ближе к центру.
const NAV_ITEMS = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
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

function BottomNav({ value, onChange }) {
  return (
    <nav className="bottom-nav nav-6" aria-label="Гостевая навигация">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function StubScreen({ title, text }) {
  return (
    <section className="reel-stub">
      <p className="aroma-caps">{title}</p>
      <p className="guest-status">{text}</p>
    </section>
  );
}

function HeartButton({ on, onClick }) {
  return (
    <button type="button" className="heart-btn" aria-pressed={on} aria-label={on ? 'Убрать из избранного' : 'В избранное'} onClick={onClick}>
      <Icon name="Heart" size={22} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

// ── Лента гостя без входа ──

// Гость выбрал в онбординге «Мятный» и «Ягодный»: сначала его подбор, затем остальные доступные миксы.
const LIKED = ['minty', 'berry'];
const FEED = [
  ...M.mixes.filter((m) => LIKED.some((p) => m.flavorProfiles.includes(p))).sort((a, b) => b.avgRating - a.avgRating),
  ...M.mixes.filter((m) => !LIKED.some((p) => m.flavorProfiles.includes(p))),
].map(withRating);
// Порядок кадров доски: первым — микс с холодом, как в примере клиента.
const START = ['mix-catalog-hit-03', 'mix-catalog-niche-09', 'mix-catalog-hit-11', 'mix-catalog-hit-13', 'mix-catalog-niche-14', 'mix-catalog-niche-06'];
const FEED_ORDERED = [...START.map((id) => FEED.find((m) => m.id === id)), ...FEED.filter((m) => !START.includes(m.id))];
const ANON_ITEMS = FEED_ORDERED.map((mix) => ({ mix }));

// ── Лента вошедшего гостя ──
// Тот же набор «Для вас» и те же причины, что в согласованном мокапе кабинета (#151, вариант A · по слотам).

const FOR_YOU = {
  again: { mix: mixById('mix-catalog-hit-01'), slot: 'Снова', reason: 'Ваша оценка ★ 5 · выбирали 5 раз' },
  hero: { mix: mixById('mix-catalog-hit-08'), slot: 'Новое в вашем вкусе', reason: 'Ягодное, как вы любите, — на персиковом чае.' },
  taste: [
    { mix: mixById('mix-catalog-hit-10'), slot: 'Новое в вашем вкусе', reason: 'Черника и холодок — рядом с вашими любимыми' },
    { mix: mixById('mix-catalog-hit-03'), slot: 'Новое в вашем вкусе', reason: 'Свежее и ягодное, но с яблоком' },
    { mix: mixById('mix-catalog-hit-26'), slot: 'Новое в вашем вкусе', reason: 'Похоже на «Морозную ягоду», только виноград и манго' },
  ],
  aside: { mix: mixById('mix-catalog-hit-02'), slot: 'Шаг в сторону', reason: 'Мастера часто сводят ягодное с цитрусовым' },
};
// История для строки «Выбирали N раз» на рилсах вне «Для вас».
const HISTORY = { 'mix-catalog-hit-01': { count: 5, rating: 5 }, 'mix-catalog-hit-05': { count: 1, rating: 4 } };
const FAVORITES = ['mix-catalog-hit-01', 'mix-catalog-niche-12', 'mix-catalog-hit-10'];

function loggedItems(persona) {
  if (persona === 'cold') return ANON_ITEMS;
  // Пузырь: «Шаг в сторону» первым, с подсказкой; иначе — как на Подборе: новое, шаг в сторону, повтор в конце.
  const head = persona === 'steady'
    ? [{ ...FOR_YOU.aside, bubble: true }, FOR_YOU.hero, ...FOR_YOU.taste, FOR_YOU.again]
    : [FOR_YOU.hero, ...FOR_YOU.taste, FOR_YOU.aside, FOR_YOU.again];
  const ids = head.map((item) => item.mix.id);
  const tail = FEED_ORDERED.filter((mix) => !ids.includes(mix.id)).map((mix) => ({ mix, history: HISTORY[mix.id] }));
  return [...head.map((item) => ({ ...item, mix: withRating(item.mix) })), ...tail];
}

const pad = (n) => String(n).padStart(2, '0');
const times = (n) => { const a = n % 10, b = n % 100; return n + (a >= 2 && a <= 4 && (b < 12 || b > 14) ? ' раза' : ' раз'); };

function Reel({ item, index, total, styleB, active, paused, onTogglePause, onOpen, onChoose, gone, hint, fav, onFav }) {
  const { mix, slot, reason, bubble, history } = item;
  return (
    <section className="reel" aria-label={mix.name}>
      <Scene mix={mix} styleB={styleB} playing={active && !paused} />
      <button type="button" className="reel-tap" aria-label={paused ? 'Продолжить' : 'Пауза'} onClick={onTogglePause} />
      {paused ? <span className="reel-paused"><Icon name="Play" size={22} /></span> : null}
      <div className="reel-top">
        <p className="reel-title">Рилсы</p>
        <p className="reel-count">{pad(index + 1) + ' · из ' + pad(total)}</p>
      </div>
      <div className={'reel-dock' + (active ? ' reel-reveal' : '')} key={active ? 'on' : 'off'}>
        {hint ? <span className="reel-hint"><Icon name="ChevronUp" size={18} />Листайте вверх</span> : null}
        {bubble ? (
          <section className="reel-bubble" aria-label="Подсказка">
            <p className="aroma-caps">Давно на одном вкусе</p>
            <p className="reel-bubble-text">Четыре из пяти последних — «Морозная ягода». Мастер уважает постоянство, но рядом есть кое-что.</p>
          </section>
        ) : null}
        <p className="aroma-caps">{slot || mix.flavorProfiles.slice(0, 3).map(label).join(' · ')}</p>
        <div className="reel-name-row">
          <h2 className="reel-name">{mix.name}</h2>
          <HeartButton on={fav} onClick={() => onFav(mix)} />
        </div>
        {reason ? <p className="reel-reason">{reason}</p> : null}
        {mix.ratingsCount || history ? (
          <div className="reel-meta">
            {mix.ratingsCount ? <RatingPill rating={mix.avgRating} count={mix.ratingsCount} /> : null}
            {history ? <span className="reel-own">{'Выбирали ' + times(history.count) + (history.rating ? ' · ваша ★ ' + history.rating : '')}</span> : null}
          </div>
        ) : null}
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

function Feed({ items, start = 0, styleB, paused: initialPaused = false, gone: goneId = null, hint = false, favs, onFav, onOpen, onChoose }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(start);
  const [paused, setPaused] = React.useState(initialPaused);
  const [gone, setGone] = React.useState([]);
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
      {items.map((item, i) => (
        <div key={item.mix.id} data-i={i} className="reel-slot">
          {Math.abs(i - active) <= 1 ? (
            <Reel
              item={item}
              index={i}
              total={items.length}
              styleB={styleB}
              active={i === active}
              paused={i === active && paused}
              hint={hint && i === start && !swiped}
              gone={gone.includes(item.mix.id)}
              fav={favs.includes(item.mix.id)}
              onFav={onFav}
              onTogglePause={() => setPaused(!paused)}
              onOpen={onOpen}
              onChoose={(m) => (goneId === m.id && !gone.includes(m.id) ? setGone([...gone, m.id]) : onChoose(m))}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FeedEmpty({ onRecs }) {
  return (
    <section className="reel-empty">
      <img src="../../.claude/skills/aroma-atelier-design/assets/logo-mark.svg" alt="" aria-hidden style={{ width: 56 }} />
      <p className="aroma-caps">Рилсы</p>
      <h1 className="aroma-empty-title">Сейчас показать нечего</h1>
      <p className="aroma-empty-text">Ни одного микса в наличии. Мастер уже в курсе — спросите его, что будет сегодня.</p>
      <button type="button" className="aroma-ghost" onClick={onRecs}>К подбору</button>
    </section>
  );
}

// ── Вход с Подбора ──

// Отвергнут владельцем 2026-10-20 — остаётся на доске для истории решения.
function EntryLink({ onOpen }) {
  return (
    <button type="button" className="reel-entry-link" onClick={() => onOpen(0)}>
      <span className="reel-entry-icon"><Icon name="Clapperboard" size={16} /></span>
      Смотреть лентой
      <Icon name="ChevronRight" size={18} />
    </button>
  );
}

function EntryStrip({ items, styleB, onOpen }) {
  return (
    <div className="reel-strip" role="list" aria-label="Рилсы">
      {items.slice(0, 8).map(({ mix }, i) => (
        <button key={mix.id} type="button" role="listitem" className="reel-strip-item" onClick={() => onOpen(i)}>
          <span className="reel-strip-thumb"><Scene mix={mix} styleB={styleB} playing={false} /></span>
          <span className="reel-strip-name">{mix.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Карточка микса из ленты: как MixSheet кита, надзаголовок «Из рилсов» ──

function ReelSheet({ mix, fav, onFav, onClose, onChoose }) {
  if (!mix) return null;
  const halo = CSS_VAR(pickScene(mix).c1);
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" onClick={(e) => e.stopPropagation()} style={{ background: 'radial-gradient(circle at 88% 0%, color-mix(in srgb, ' + halo + ' 31%, transparent) 0%, transparent 50%), var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
            <p className="aroma-caps">Из рилсов</p>
            <h2 className="aroma-sheet-title">{mix.name}</h2>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
          <HeartButton on={fav} onClick={() => onFav(mix)} />
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
          <button type="button" className="aroma-ghost" onClick={onClose}>К рилсам</button>
          <AromaCTA pulse onClick={() => onChoose(mix)}>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

// Тот же текст, что у сердечка без входа в карточке микса (#151).
function AnonHeartSheet({ onLogin, onClose }) {
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label="Избранное" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <p className="aroma-caps">Избранное</p>
        <h2 className="aroma-sheet-title">Избранное живёт в кабинете</h2>
        <p className="aroma-sheet-desc">Войдите через Telegram — и микс будет ждать вас в следующий раз. Без входа подбор работает как прежде.</p>
        <div className="reel-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>Не сейчас</button>
          <AromaCTA onClick={onLogin}>Войти</AromaCTA>
        </div>
      </section>
    </div>
  );
}

// ── Телефон ──

function GuestPhone({ view: initialView = 'recs', entry = 'B', styleB = true, logged: initialLogged = false, persona = 'steady', start = 0, paused = false, gone = null, hint = false, sheet: initialSheet = null, anonHeart = false, empty = false }) {
  const [view, setView] = React.useState(initialView);
  const [logged, setLogged] = React.useState(initialLogged);
  const [from, setFrom] = React.useState(start);
  const [sheet, setSheet] = React.useState(initialSheet);
  const [favs, setFavs] = React.useState(initialLogged ? FAVORITES : []);
  const [heartPrompt, setHeartPrompt] = React.useState(anonHeart);
  const items = logged ? loggedItems(persona) : ANON_ITEMS;
  const [chosen, setChosen] = React.useState(initialView === 'confirm' ? items[start].mix : null);
  const openReels = (i) => { setFrom(i); setView('reels'); };
  const choose = (mix) => { setSheet(null); setChosen(mix); setView('confirm'); };
  const toggleFav = (mix) => {
    if (!logged) return setHeartPrompt(true);
    setFavs(favs.includes(mix.id) ? favs.filter((id) => id !== mix.id) : [...favs, mix.id]);
  };
  const login = () => { setHeartPrompt(false); setLogged(true); setFavs(FAVORITES); };
  const go = (id) => (id === 'reels' ? openReels(0) : setView(id));

  let body;
  if (view === 'confirm') {
    body = <window.ConfirmationScreen mix={chosen} onDone={() => setView('reels')} />;
  } else if (view === 'reels') {
    body = (
      <>
        {empty
          ? <FeedEmpty onRecs={() => setView('recs')} />
          : <Feed key={String(logged) + from} items={items} start={from} styleB={styleB} paused={paused} gone={gone} hint={hint} favs={favs} onFav={toggleFav} onOpen={setSheet} onChoose={choose} />}
        <BottomNav value="reels" onChange={go} />
      </>
    );
  } else {
    let main;
    if (view !== 'recs') {
      main = <StubScreen title={NAV_ITEMS.find((item) => item.id === view).label} text="Экран не меняется." />;
    } else if (logged && persona !== 'cold') {
      main = (
        <>
          <EntryStrip items={items} styleB={styleB} onOpen={openReels} />
          <StubScreen title="Для вас" text="Подбор «Для вас» — как в мокапе кабинета (#151). Полоса рилсов над ним идёт в том же порядке, что и «Для вас»." />
        </>
      );
    } else {
      main = (
        <>
          {entry === 'A' ? <EntryLink onOpen={openReels} /> : <EntryStrip items={items} styleB={styleB} onOpen={openReels} />}
          <window.RecommendationsScreen mixes={FEED.slice(0, 5)} onOpen={setSheet} onChoose={choose} onOpenOnboarding={() => {}} onOpenCatalog={() => {}} />
        </>
      );
    }
    body = (
      <>
        <Topbar />
        <main className="content">{main}</main>
        <BottomNav value={view} onChange={go} />
      </>
    );
  }
  return (
    <div className="phone-shell">
      {body}
      <ReelSheet mix={sheet} fav={sheet ? favs.includes(sheet.id) : false} onFav={toggleFav} onClose={() => setSheet(null)} onChoose={choose} />
      {heartPrompt ? <AnonHeartSheet onLogin={login} onClose={() => setHeartPrompt(false)} /> : null}
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
  frost: 'Иней дышит по краям, сверху медленно оседают снежинки. Цвет — «Мятный».',
  bloom: 'Цветок из пяти лепестков раскрывается и медленно вращается, мелкие лепестки плывут вверх. Цвет — «Цветочно-травяной».',
  juicy: 'Кольцо медленно вращается, дольки поднимаются. Цвет — «Цитрусовый», без цитруса — «Фруктовый».',
  berry: 'Грозди ягод медленно падают. Цвет — «Ягодный».',
  warm: 'Искры поднимаются от тёплого свечения снизу. Цвет — «Десертный», у пряных — «Пряный».',
  smoke: 'Струи дыма прорисовываются снизу вверх и тают; это же сцена по умолчанию. Цвет — «Табачный».',
};
const RULE_EXAMPLES = ['mix-catalog-hit-01', 'mix-catalog-hit-03', 'mix-catalog-niche-10', 'mix-catalog-niche-05', 'mix-catalog-hit-07', 'mix-catalog-niche-01', 'mix-catalog-niche-08', 'mix-catalog-niche-04'];
const COSMOCOLA = loggedItems('varied').findIndex((item) => item.mix.id === 'mix-catalog-hit-05');

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
  { id: 'entry-b', group: 'entry', name: 'Подбор · полоса рилсов — выбрано', note: 'Кружки со статичным кадром сцены над подбором, как Stories. Нажатие открывает раздел «Рилсы» с этого микса.', props: {} },
  { id: 'entry-a', group: 'entry', name: 'Ссылка «Смотреть лентой» — отвергнут', note: 'Тихая ссылка над подбором. Владелец выбрал полосу и отдельный раздел панели.', props: { entry: 'A' } },
  { id: 'reels-first', group: 'feed', name: 'Раздел «Рилсы»', note: 'Третий пункт панели, Lucide Clapperboard. Панель остаётся, как в Instagram. Подсказка «Листайте вверх» — до первого свайпа.', props: { view: 'reels', hint: true } },
  { id: 'reel-bloom', group: 'feed', name: 'Цветы', note: '«Цветочный коктейль»: маргарита и цветочный.', props: { view: 'reels', start: 1 } },
  { id: 'reel-long', group: 'feed', name: 'Длинный состав', note: '«Френч-коктейль»: шесть вкусов и четыре табака. Название — до трёх строк целиком, док растёт вверх.', props: { view: 'reels', start: FEED_ORDERED.findIndex((m) => m.id === 'mix-catalog-niche-10') } },
  { id: 'reel-norating', group: 'feed', name: 'Без оценок гостей', note: '«Томат с перцем» гости ещё не оценивали — «★» нет, как в карточке (#185). Сцена «Дым».', props: { view: 'reels', start: 5 } },
  { id: 'reel-paused', group: 'feed', name: 'Пауза', note: 'Тап по сцене — пауза, ещё тап — продолжение. Текст и кнопки нажимаются как обычно.', props: { view: 'reels', start: 2, paused: true } },
  { id: 'reel-sheet', group: 'edge', name: 'Подробнее', note: 'Карточка микса поверх рилса: «Из рилсов», сердечко, оценка, «К рилсам».', props: { view: 'reels', start: 3, sheet: withRating(mixById('mix-catalog-hit-13')) } },
  { id: 'reel-confirm', group: 'edge', name: '«Покурить» → «Покажите мастеру»', note: 'Тот же экран и то же событие smoke-cta. «Готово» возвращает на тот же рилс.', props: { view: 'confirm' } },
  { id: 'reel-gone', group: 'edge', name: 'Микс закончился', note: 'Пока гость листал, табак кончился: smoke-cta отвечает 404. Нажмите «Покурить» — строка-статус и неактивная CTA.', props: { view: 'reels', start: 4, gone: 'mix-catalog-niche-14' } },
  { id: 'reel-empty', group: 'edge', name: 'Пусто', note: 'Ни одного доступного микса. Факт первым, затем выход на Подбор.', props: { view: 'reels', empty: true } },
  { id: 'reel-anon-heart', group: 'edge', name: 'Сердечко без входа', note: 'Как в карточке микса (#151): предложение войти. «Войти» в мокапе сразу логинит.', props: { view: 'reels', anonHeart: true } },
  { id: 'li-strip', group: 'logged', name: 'Подбор вошедшего гостя', note: 'Полоса рилсов в порядке «Для вас»: первым — «Шаг в сторону», потому что гость сидит на одном вкусе.', props: { logged: true } },
  { id: 'li-bubble', group: 'logged', name: 'Первый рилс · пузырь', note: '4 из 5 последних выборов — «Морозная ягода». Первым идёт «Шаг в сторону» с той же подсказкой, что на «Для вас». Ничего не запрещаем.', props: { view: 'reels', logged: true } },
  { id: 'li-taste', group: 'logged', name: '«Новое в вашем вкусе»', note: 'Надпись слота вместо профилей и причина одной фразой — как у карточек «Для вас». Сердечко залито: микс в избранном.', props: { view: 'reels', logged: true, persona: 'varied', start: 1 } },
  { id: 'li-again', group: 'logged', name: '«Снова»', note: 'Один повтор в конце блока «Для вас»: ваша оценка и сколько раз выбирали.', props: { view: 'reels', logged: true, persona: 'varied', start: 5 } },
  { id: 'li-history', group: 'logged', name: 'После «Для вас»', note: 'Дальше — остальные миксы каталога без слотов и причин. Если гость уже выбирал микс — «Выбирали 1 раз · ваша ★ 4».', props: { view: 'reels', logged: true, persona: 'varied', start: COSMOCOLA } },
];

function ShotFrame({ shot, styleB }) {
  return (
    <Frame name={shot.name} note={shot.note}>
      <GuestPhone {...shot.props} styleB={styleB} />
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
        <div className="scene-box"><Scene mix={mix} styleB /><span className="scene-box-label">B · Образ — выбран</span></div>
        <div className="scene-box scene-box-off"><Scene mix={mix} /><span className="scene-box-label">A · отвергнут</span></div>
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
  const [styleB, setStyleB] = React.useState(new URLSearchParams(location.hash.slice(1)).get('style') !== 'A');
  const section = (group) => SHOTS.filter((shot) => shot.group === group).map((shot) => <ShotFrame key={shot.id + styleB} shot={shot} styleB={styleB} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#153 · мокап на согласование · раунд 2</p>
        <h1 className="board-title">«Рилсы» миксов</h1>
        <p className="board-text">«Рилсы» — отдельный раздел нижней панели, как Reels в Instagram, плюс полоса превью над Подбором. Свайп вверх — следующий микс. Фон рилса — сцена, сгенерированная по вкусам микса: мятный дышит холодом, цветочный раскрывается лепестками. Сцены здесь — CSS-приближение. В приложении это композиции Remotion в @remotion/player на телефоне гостя: без видеофайлов и нагрузки на сервер. Миксы — витрина прода на 15 октября.</p>
        <p className="board-text">Решения владельца 2026-10-20: стиль сцен B · Образ; вход — полоса превью и отдельный раздел панели; лента проработана для вошедшего гостя.</p>
        <div className="tweaks">
          <div className="tweak">
            <span className="aroma-caps">Стиль сцен</span>
            <button type="button" className={styleB ? 'on' : ''} onClick={() => setStyleB(true)}>B · Образ — выбран</button>
            <button type="button" className={styleB ? '' : 'on'} onClick={() => setStyleB(false)}>A · Атмосфера — отвергнут</button>
          </div>
        </div>
      </header>
      <section className="board-section" id="scenes">
        <h2 className="board-h2">Сцены — выбран B</h2>
        <p className="board-text">B — тонкие линейные мотивы штрихом знака «Дым»: снежинки, лепестки, дольки, ягоды, искры, струи. Мотив считывается сразу. Это исключение из правила «без иллюстраций» (VISUAL FOUNDATIONS), только для рилсов. A — орбы и туман в духе ProfileGlyph — отвергнут: местами читался как цветное пятно.</p>
        <div className="scene-grid">{SCENE_EXAMPLES.map((s) => <SceneTile key={s.motif} {...s} />)}</div>
      </section>
      <section className="board-section" id="rule">
        <h2 className="board-h2">Как выбирается сцена</h2>
        <p className="board-text">У миксов прода по 4–8 профилей, и порядок профилей не говорит, какой главный: у «Морозной ягоды» первым идёт «Цветочно-травяной». Поэтому сцена берётся из flavors: каждый вкус относится к одному из шести мотивов, побеждает мотив с бо́льшим числом вкусов, при равенстве — тот, чей вкус идёт раньше. Холод перебивает всё. Второй мотив добавляет треть фигур своего цвета. Вкусы не узнали — сцена по первому профилю, профилей нет — «Дым».</p>
        <RuleTable />
      </section>
      <section className="board-section" id="entry">
        <h2 className="board-h2">Вход: полоса над Подбором и раздел панели</h2>
        <div className="board-row">{section('entry')}</div>
      </section>
      <section className="board-section" id="feed">
        <h2 className="board-h2">Раздел «Рилсы»</h2>
        <div className="board-row">{section('feed')}</div>
      </section>
      <section className="board-section" id="edge">
        <h2 className="board-h2">Подробнее, выбор и края</h2>
        <div className="board-row">{section('edge')}</div>
      </section>
      <section className="board-section" id="logged">
        <h2 className="board-h2">Вошедший гость</h2>
        <p className="board-text">Лента начинается с «Для вас» (PRD §6.5) — тот же набор и те же правила, что на Подборе: новое во вкусе, шаг в сторону, не больше одного повтора, подсказка против пузыря. Дальше — остальные доступные миксы. Сердечко добавляет в избранное кабинета; «Покурить» пишется в историю. Меньше трёх выборов — лента как у гостя без входа.</p>
        <div className="board-row">{section('logged')}</div>
      </section>
    </div>
  );
}

const params = new URLSearchParams(location.hash.slice(1));
const shotId = params.get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} styleB={params.get('style') !== 'A'} /> : <Board />);
