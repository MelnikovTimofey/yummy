// Доска мокапа #349: рилсы — второй пункт панели и продолжение Подбора без повторов.
// Миксы — витрина прода на 2026-10-15 (../design_handoff_showcase_compact/showcase-data.js).
// Сцены, правило выбора сцены и афиша рилса — из ../design_handoff_reels_v2 (#314, вариант A) без изменений.
const DS = window.DesignSystem_1aef33;
const { AromaCTA, AromaChip, ProfileGlyph, SignatureBar, RatingPill, CompositionStack } = DS;
const M = window.AROMA_MOCK;
const label = (p) => M.profileLabels[p] || p;

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

// #349: рилсы — вторым, сразу после Подбора: лента его продолжает.
const NAV_BEFORE = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];
const NAV_AFTER = ['recs', 'reels', 'showcase', 'catalog', 'mixer', 'cabinet'].map((id) => NAV_BEFORE.find((item) => item.id === id));

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src="../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg" alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
      </div>
    </header>
  );
}

function BottomNav({ value, onChange, items = NAV_AFTER }) {
  return (
    <nav className="bottom-nav nav-6" aria-label="Гостевая навигация">
      {items.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function HeartButton({ on, onClick }) {
  return (
    <button type="button" className="heart-btn" aria-pressed={on} aria-label={on ? 'Убрать из избранного' : 'В избранное'} onClick={onClick}>
      <Icon name="Heart" size={22} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

const pluralRu = (n, forms) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};

// ── Данные ──

// Оценок гостей в снапшоте нет; для части миксов — условные, чтобы показать «★» (без оценок гостей «★» нет, #185).
const RATED = { 'mix-catalog-hit-03': [4.7, 23], 'mix-catalog-hit-04': [4.5, 17], 'mix-catalog-niche-09': [4.4, 9], 'mix-catalog-hit-11': [4.6, 31], 'mix-catalog-hit-13': [4.8, 40], 'mix-catalog-hit-22': [4.3, 8] };
const POPULAR = { 'mix-catalog-hit-03': 18 };
const withStats = (mix) => ({
  ...mix,
  ...(RATED[mix.id] ? { avgRating: RATED[mix.id][0], ratingsCount: RATED[mix.id][1] } : { ratingsCount: 0 }),
  popularity: POPULAR[mix.id] ?? mix.popularity,
});
// Каталог в порядке гостевой выдачи (недоступные уже отсек backend).
const CATALOG = M.mixes.map(withStats);
const mixOf = (id) => CATALOG.find((mix) => mix.id === id);

// Гость без входа выбрал в онбординге «Мятный» и «Ягодный». Выдача рекомендаций — 6 миксов,
// на экране герой и четыре «Тоже подходят»: шестой в Подбор не влез и открывает ленту.
const RANKED = ['mix-catalog-hit-03', 'mix-catalog-hit-01', 'mix-catalog-hit-10', 'mix-catalog-hit-26', 'mix-catalog-hit-05', 'mix-catalog-hit-04'].map(mixOf);
const ON_SCREEN = 5;

// «Для вас» вошедшего — тот же набор, что в согласованном мокапе кабинета (#151, вариант A · по слотам).
const FOR_YOU = {
  hero: { mix: mixOf('mix-catalog-hit-08'), reason: 'Ягодное, как вы любите, — на персиковом чае.' },
  taste: [
    { mix: mixOf('mix-catalog-hit-10'), reason: 'Черника и холодок — рядом с вашими любимыми' },
    { mix: mixOf('mix-catalog-hit-03'), reason: 'Свежее и ягодное, но с яблоком' },
    { mix: mixOf('mix-catalog-hit-26'), reason: 'Похоже на «Морозную ягоду», только виноград и манго' },
  ],
  sidestep: { mix: mixOf('mix-catalog-hit-02'), reason: 'Мастера часто сводят ягодное с цитрусовым' },
  again: { mix: mixOf('mix-catalog-hit-01'), reason: 'Ваша оценка ★ 5 · выбирали 5 раз' },
};
const FOR_YOU_SHOWN = [FOR_YOU.hero, ...FOR_YOU.taste, FOR_YOU.sidestep, FOR_YOU.again].map((row) => row.mix);

// Продолжение: сначала рекомендации, не поместившиеся на Подбор, затем остальной каталог — без показанных.
function continuation(ranked, shown, catalog) {
  const seen = new Set(shown.map((mix) => mix.id));
  return [...ranked, ...catalog].filter((mix) => {
    if (seen.has(mix.id)) return false;
    seen.add(mix.id);
    return true;
  });
}

// Пять миксов в наличии — каталог не больше Подбора, продолжение пустое.
const SMALL_CATALOG = RANKED.slice(0, ON_SCREEN);

const PERSONAS = {
  anon: { kind: 'anon', recs: RANKED, feed: continuation(RANKED, RANKED.slice(0, ON_SCREEN), CATALOG) },
  li: { kind: 'li', feed: continuation([], FOR_YOU_SHOWN, CATALOG) },
  empty: { kind: 'empty', recs: [], feed: CATALOG },
  small: { kind: 'anon', recs: SMALL_CATALOG, feed: continuation(SMALL_CATALOG, SMALL_CATALOG, SMALL_CATALOG) },
};

// ── Подбор ──

function MixerInvite() {
  return (
    <button type="button" className="mixer-invite">
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={44} />
      <span className="mixer-invite-text">
        <span className="aroma-caps">Намиксуй</span>
        <span className="mixer-invite-title">Не нашли своё? Намиксуйте сами</span>
        <span className="mixer-invite-note">Основа, акцент и штрих — из того, что сегодня есть на полках.</span>
      </span>
    </button>
  );
}

// Последний блок Подбора: под ним край, дотягивание за который открывает ленту. Тап — то же самое.
function ReelsTeaser({ feed, onOpen }) {
  const count = feed.length;
  const title = count ? 'Ещё ' + count + ' ' + pluralRu(count, ['микс', 'микса', 'миксов']) + ' в рилсах' : 'Других миксов нет';
  return (
    <button type="button" className="rt" onClick={onOpen}>
      {count ? (
        <span className="rt-stills" aria-hidden>
          {feed.slice(0, 3).map((mix) => <span key={mix.id} className="rt-still"><Scene mix={mix} styleB playing={false} /></span>)}
        </span>
      ) : null}
      <span className="rt-title">{title}</span>
      <span className="rt-pull"><Icon name="ChevronUp" size={20} /></span>
    </button>
  );
}

function ForYouRows({ rows }) {
  return rows.map((row) => (
    <button key={row.mix.id} type="button" className="cab-row">
      <ProfileGlyph profiles={row.mix.flavorProfiles} size={44} />
      <span className="cab-row-text">
        <span className="cab-row-name">{row.mix.name}</span>
        <SignatureBar profiles={row.mix.flavorProfiles} height={3} />
        <span className="cab-row-reason">{row.reason}</span>
      </span>
    </button>
  ));
}

// «Для вас» в режиме personal — как ForYou.tsx. Приглашения в «Намиксуй» здесь нет и сейчас.
function ForYouView({ teaser }) {
  const { hero } = FOR_YOU;
  return (
    <section className="aroma-recs">
      <header className="fy-head">
        <h1 className="fy-title">Для вас</h1>
        <p className="fy-sub">По вашим выборам, оценкам и избранному.</p>
        <button type="button" className="fy-mood-link">Подобрать под настроение<Icon name="ChevronRight" size={16} /></button>
      </header>
      <p className="aroma-caps">Новое в вашем вкусе</p>
      <article className="aroma-recs-hero" style={{ background: 'radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--profile-berry) 33%, transparent) 0%, transparent 55%), var(--guest-card-bg)' }}>
        <div className="aroma-recs-hero-head">
          <ProfileGlyph profiles={hero.mix.flavorProfiles} size={64} />
          <span className="aroma-recs-hero-head-text">
            <span className="aroma-recs-hero-title">{hero.mix.name}</span>
            <span className="aroma-recs-hero-desc">{hero.reason}</span>
          </span>
        </div>
        <SignatureBar profiles={hero.mix.flavorProfiles} height={6} />
        <CompositionStack components={hero.mix.components} showBar={false} />
        <AromaCTA pulse>Покурить</AromaCTA>
      </article>
      <div className="fy-list"><ForYouRows rows={FOR_YOU.taste} /></div>
      <p className="aroma-caps">Шаг в сторону</p>
      <div className="fy-list"><ForYouRows rows={[FOR_YOU.sidestep]} /></div>
      <p className="aroma-caps">Снова</p>
      <div className="fy-list"><ForYouRows rows={[FOR_YOU.again]} /></div>
      {teaser}
    </section>
  );
}

// Онбординг пропущен: Подбор пуст, тизера нет — лента из панели показывает весь каталог.
function EmptyRecs() {
  return (
    <section className="aroma-recs-empty">
      <p className="aroma-caps">Подбор пока пуст</p>
      <h1 className="aroma-empty-title">Сначала выберите вкусы</h1>
      <p className="aroma-empty-text">Откройте предпочтения, чтобы мы собрали подбор под текущее настроение, или сразу посмотрите весь каталог.</p>
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

function PullCue({ pull, dir }) {
  const r = 18;
  const len = 2 * Math.PI * r;
  return (
    <span className={'pull-cue' + (pull >= PULL_FIRE ? ' pull-cue-ready' : '')} aria-hidden>
      <span className="pull-ring">
        <svg className="ring" viewBox="0 0 40 40">
          <circle className="ring-track" cx="20" cy="20" r={r} />
          <circle className="ring-fill" cx="20" cy="20" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, pull / PULL_FIRE))} />
        </svg>
        <Icon name={dir === 'down' ? 'ChevronDown' : 'ChevronUp'} size={18} />
      </span>
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
      <window.RecommendationsScreen mixes={recs} onOpen={() => {}} onChoose={() => {}} />
      {variantB ? null : <MixerInvite />}
      {teaser}
    </>
  );

  return (
    <div className={'pull-wrap' + (dragging ? ' dragging' : '')} {...(teaser ? handlers : {})}>
      <main className="content" ref={ref} style={{ transform: pull ? 'translateY(' + -pull + 'px)' : undefined }}>{body}</main>
      {teaser ? (
        <div className="pull-reveal pull-reveal-bottom" style={{ height: pull }} aria-hidden={!pull}>
          {feed[0] ? <Scene mix={feed[0]} styleB playing={false} /> : null}
          {pull ? <PullCue pull={pull} dir="up" /> : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Лента ──

const PALETTE = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];
const percent = (v) => String(Number(v.toFixed(1))).replace('.', ',') + '%';

function CompositionBar({ components }) {
  const sorted = [...components].sort((a, b) => b.proportion - a.proportion);
  return (
    <>
      <div className="pv-bar" aria-hidden>
        {sorted.map((c, i) => <span key={c.id} style={{ flexGrow: c.proportion, background: PALETTE[i % PALETTE.length] }} />)}
      </div>
      <ul className={'pv-comp' + (sorted.length === 1 ? ' pv-comp-one' : '')} aria-label="Состав микса">
        {sorted.map((c, i) => (
          <li key={c.id}>
            <span className="pv-comp-dot" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden />
            <span className="pv-comp-text">
              <span className="aroma-caps pv-comp-maker">{c.manufacturer}</span>
              <span className="pv-comp-name">{c.name}</span>
            </span>
            <span className="pv-comp-share">{percent(c.proportion)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// Афиша A (#314). В продолжении надписей слотов «Для вас» и причин нет: эти миксы гость на Подборе не видел.
function Reel({ mix, active, back, hint, onBack }) {
  return (
    <section className="reel" aria-label={mix.name}>
      <Scene mix={mix} styleB playing={active} />
      <button type="button" className="reel-tap" aria-label="Пауза" />
      {back ? <button type="button" className="reel-back" onClick={onBack}><Icon name="ChevronDown" size={16} />К подбору</button> : null}
      <div className={'pv' + (active ? ' pv-enter' : '')}>
        <div className="pv-top" />
        <div className="pv-center">
          <h2 className="pv-name">{mix.name}</h2>
          {mix.description ? <p className="pv-desc">{mix.description}</p> : <p className="pv-flavors">{mix.flavors.join(' · ')}</p>}
        </div>
        <div className="pv-bottom">
          {hint ? <span className="reel-hint"><Icon name="ChevronUp" size={18} />Листайте вверх</span> : null}
          <div className="pv-details">
            <div className="pv-meta">
              {mix.ratingsCount ? <RatingPill rating={mix.avgRating} count={mix.ratingsCount} /> : null}
              <HeartButton on={false} onClick={() => {}} />
            </div>
            <CompositionBar components={mix.components} />
          </div>
          <div className="reel-actions">
            <button type="button" className="aroma-ghost">Подробнее</button>
            <AromaCTA pulse>Покурить</AromaCTA>
          </div>
        </div>
      </div>
    </section>
  );
}

// Конец ленты (#298) — как FeedEnd.tsx. Пустое продолжение начинается прямо с него.
function FeedEnd({ back, onBack }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      {back ? <button type="button" className="reel-back" onClick={onBack}><Icon name="ChevronDown" size={16} />К подбору</button> : null}
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={64} />
      <h2 className="aroma-empty-title">Не нашли своё?</h2>
      <p className="aroma-empty-text">Соберите микс сами — мастер подскажет.</p>
      <AromaCTA style={{ marginTop: 8 }}>Намиксуй</AromaCTA>
    </section>
  );
}

function ReelsScreen({ persona, backPull, onBack }) {
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
  return (
    <div className={'pull-wrap' + (dragging ? ' dragging' : '')} {...(canBack ? handlers : {})}>
      {canBack ? (
        <div className="pull-reveal pull-reveal-top" style={{ height: pull }} aria-hidden={!pull}>
          {pull ? <PullCue pull={pull} dir="down" /> : null}
        </div>
      ) : null}
      <div className="reels" ref={ref} style={{ transform: pull ? 'translateY(' + pull + 'px)' : undefined }}>
        {feed.map((mix, i) => (
          <div key={mix.id} data-i={i} className="reel-slot">
            {Math.abs(i - active) <= 1 ? <Reel mix={mix} active={i === active && !pull} back={canBack && i === 0} hint={i === 0} onBack={onBack} /> : null}
          </div>
        ))}
        <div data-i={feed.length} className="reel-slot reel-slot-end">
          <FeedEnd back={canBack && !feed.length} onBack={onBack} />
        </div>
      </div>
    </div>
  );
}

// ── Телефон ──

function StubScreen({ title }) {
  return (
    <section className="reel-stub">
      <p className="aroma-caps">{title}</p>
      <p className="guest-status">Экран не меняется.</p>
    </section>
  );
}

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
        <Topbar />
        <RecsScreen key={recsAt} persona={persona} at={recsAt} pull={view === initialView ? pull : 0} variantB={variantB} onReels={() => setView('reels')} />
      </>
    );
  } else if (view === 'reels') {
    body = <ReelsScreen persona={persona} backPull={view === initialView ? backPull : 0} onBack={() => { setRecsAt('end'); setView('recs'); }} />;
  } else {
    body = (
      <>
        <Topbar />
        <main className="content"><StubScreen title={NAV_BEFORE.find((item) => item.id === view).label} /></main>
      </>
    );
  }
  return (
    <div className="phone-shell">
      {body}
      <BottomNav value={view} onChange={go} />
    </div>
  );
}

// ── Доска ──

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
  { id: 'end-anon', group: 'end', name: 'Без входа', note: '«Намиксуй», под ним тизер. Под тизером — край.', props: { at: 'end' } },
  { id: 'end-li', group: 'end', name: 'Вошедший', note: 'После «Снова» — тизер.', props: { persona: 'li', at: 'end' } },
  { id: 'end-anon-b', group: 'end', name: 'Вариант Б', note: 'Тизер вместо «Намиксуй».', props: { at: 'end', variantB: true } },
  { id: 'pull-mid', group: 'pull', name: 'Тянем', note: 'Кольцо — ход до порога.', props: { at: 'end', pull: 84 } },
  { id: 'pull-ready', group: 'pull', name: 'Порог', note: '120 px сверх края. Отпустил — рилсы.', props: { at: 'end', pull: 150 } },
  { id: 'cont-first', group: 'reels', name: 'Первый рилс', note: 'Шестой из выдачи — на Подбор не влез.', props: { view: 'reels' } },
  { id: 'cont-first-li', group: 'reels', name: 'Первый рилс · вошедший', note: 'Каталог без шести миксов «Для вас».', props: { persona: 'li', view: 'reels' } },
  { id: 'back-pull', group: 'reels', name: 'Назад', note: 'Свайп вниз — конец Подбора.', props: { view: 'reels', backPull: 150 } },
  { id: 'nav-recs', group: 'nav', name: 'Подбор', note: 'Без полосы кружков.', props: {} },
  { id: 'nav-reels', group: 'nav', name: 'Рилсы из панели', note: 'Та же лента.', props: { view: 'reels' } },
  { id: 'empty-recs', group: 'edge', name: 'Подбор пуст', note: 'Тизера нет.', props: { persona: 'empty' } },
  { id: 'empty-reels', group: 'edge', name: 'Подбор пуст · рилсы', note: 'Весь каталог. Назад некуда.', props: { persona: 'empty', view: 'reels' } },
  { id: 'small-end', group: 'edge', name: 'Продолжение пустое', note: 'Все миксы уже на Подборе.', props: { persona: 'small', at: 'end' } },
  { id: 'small-reels', group: 'edge', name: 'Продолжение пустое · рилсы', note: 'Сразу конец ленты (#298).', props: { persona: 'small', view: 'reels' } },
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
  const row = (title, items, note) => (
    <div className="nav-compare-row">
      <p className="aroma-caps">{title}</p>
      <BottomNav value="recs" items={items} onChange={() => {}} />
      <div className="nav-compare-labels">{items.map((item) => <span key={item.id} className={item.id === 'reels' ? 'on' : ''}>{item.label}</span>)}</div>
      {note ? <p className="frame-note">{note}</p> : null}
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
        <p className="aroma-caps">#349 · мокап на согласование</p>
        <h1 className="board-title">Рилсы после Подбора</h1>
        <p className="board-text">Подбор продолжается рилсами без повторов. Рилсы — второй пункт панели.</p>
        <p className="board-text">Телефоны живые: колесо или мышь у нижнего края — дотягивание, тап по тизеру — рилсы.</p>
      </header>
      <section className="board-section">
        <h2 className="board-h2">Конец Подбора</h2>
        <p className="board-note">Основной вариант или Б — выбор владельца.</p>
        <div className="board-row">{row('end')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Дотягивание за край</h2>
        <div className="board-row">{row('pull')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Лента продолжения</h2>
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

const params = new URLSearchParams(location.hash.slice(1));
const shotId = params.get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
