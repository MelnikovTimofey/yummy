// Доска мокапа #314: рилс без дока — A · Афиша и C · История, с описанием и без.
// Миксы — витрина прода на 2026-10-15 (../design_handoff_showcase_compact/showcase-data.js).
// Сцены, правило выбора сцены, данные ленты и карточки — из ../design_handoff_reels (#153) без изменений.
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

// ── #314: рилс без дока ──
// Сцена — фон, а не видео: перекрывать её не страшно. Поэтому главное — название и описание — по центру,
// внизу остаются только рейтинг, сердечко, полоса состава и кнопки.

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

function Bubble() {
  return (
    <section className="reel-bubble" aria-label="Подсказка">
      <p className="aroma-caps">Давно на одном вкусе</p>
      <p className="reel-bubble-text">Четыре из пяти последних — «Морозная ягода». Мастер уважает постоянство, но рядом есть кое-что.</p>
    </section>
  );
}

// Центр афиши: надпись слота, название, описание (без описания — вкусы капсами), причина «Для вас».
function PosterCenter({ item, noDesc }) {
  const { mix, slot, reason } = item;
  const description = noDesc ? '' : mix.description;
  return (
    <>
      {slot ? <p className="aroma-caps pv-slot">{slot}</p> : null}
      <h2 className="pv-name">{mix.name}</h2>
      {description ? <p className="pv-desc">{description}</p> : <p className="pv-flavors">{mix.flavors.join('\u00a0· ')}</p>}
      {reason ? <p className="pv-reason">{reason}</p> : null}
    </>
  );
}

// ── C · История: три такта, финал держится. Кнопки и сердечко видны с первой секунды. ──

const BEATS = [[0, 1.8], [1.8, 4.2], [4.2, 6]];
const END = 6;
const beatOf = (t) => (t < BEATS[1][0] ? 0 : t < BEATS[2][0] ? 1 : 2);
const FLAVOR_STEP = 0.45;
const MAX_FLAVORS = 4;

const motifOf = (flavor) => Object.keys(MOTIFS).find((id) => MOTIFS[id].words.some((w) => flavor.toLowerCase().includes(w)));

function FlavorBeat({ mix, t }) {
  const shown = mix.flavors.slice(0, MAX_FLAVORS).filter((_, i) => t >= BEATS[1][0] + i * FLAVOR_STEP);
  const rest = mix.flavors.length - MAX_FLAVORS;
  return (
    <div className="st-flavor-list">
      {shown.map((flavor) => {
        const motif = motifOf(flavor);
        return (
          <span key={flavor} className="st-flavor">
            {motif ? <span className="st-flavor-icon" style={{ color: CSS_VAR(MOTIFS[motif].profile) }}>{SHAPES[motif === 'smoke' ? 'warm' : motif]}</span> : null}
            {flavor}
          </span>
        );
      })}
      {rest > 0 && shown.length === MAX_FLAVORS ? <p className="st-flavor-more">{'и ещё ' + rest}</p> : null}
    </div>
  );
}

function Progress({ t }) {
  return (
    <div className="st-progress" aria-hidden>
      {BEATS.map(([a, b]) => (
        <span key={a} className="st-seg"><span style={{ width: Math.min(100, Math.max(0, ((t - a) / (b - a)) * 100)) + '%' }} /></span>
      ))}
    </div>
  );
}

// ── Рилс ──

function Reel({ item, variant, storyAt, noDesc, active, paused, onTogglePause, onOpen, onChoose, gone, hint, fav, onFav }) {
  const { mix, bubble } = item;
  const story = variant === 'C';
  const fixed = storyAt != null;
  // Соседний рилс — статичный первый такт: при свайпе история начинается с того же кадра.
  const [t, setT] = React.useState(fixed ? storyAt : 0);
  React.useEffect(() => { if (!fixed) setT(0); }, [active]);
  React.useEffect(() => {
    if (!story || fixed || !active || paused || t >= END) return;
    const id = setTimeout(() => setT((v) => Math.min(END, Math.round((v + 0.1) * 10) / 10)), 100);
    return () => clearTimeout(id);
  }, [t, active, paused]);

  const live = active && !fixed;
  const beat = story ? beatOf(fixed || active ? t : 0) : 2;
  const final = beat === 2;

  let center;
  if (beat === 0) center = <h2 key="b0" className={'st-intro-name' + (live ? '' : ' st-static')}>{mix.name}</h2>;
  else if (beat === 1) center = <><p key="b1" className="st-flavors-name">{mix.name}</p><FlavorBeat mix={mix} t={t} /></>;
  else center = <PosterCenter item={item} noDesc={noDesc} />;

  return (
    <section className="reel" aria-label={mix.name}>
      <Scene mix={mix} styleB playing={active && !paused} />
      <button type="button" className="reel-tap" aria-label={paused ? 'Продолжить' : 'Пауза'} onClick={onTogglePause} />
      {paused ? <span className="reel-paused"><Icon name="Play" size={22} /></span> : null}
      {story ? <Progress t={fixed || active ? t : 0} /> : null}
      <div className={'pv' + (live && final ? ' pv-enter' : '')} key={beat + String(active)}>
        <div className="pv-top" style={story ? { paddingTop: 26 } : null}>{bubble && final ? <Bubble /> : null}</div>
        <div className="pv-center">{center}</div>
        <div className="pv-bottom">
          {hint && final ? <span className="reel-hint"><Icon name="ChevronUp" size={18} />Листайте вверх</span> : null}
          {final ? (
            <div className="pv-details">
              <div className="pv-meta">
                {mix.ratingsCount ? <RatingPill rating={mix.avgRating} count={mix.ratingsCount} /> : null}
                <HeartButton on={fav} onClick={() => onFav(mix)} />
              </div>
              {gone ? <p className="reel-toast" role="status">Этот микс сейчас недоступен по наличию. Листайте дальше — остальные на месте.</p> : <CompositionBar components={mix.components} />}
            </div>
          ) : (
            <div className="pv-meta"><HeartButton on={fav} onClick={() => onFav(mix)} /></div>
          )}
          <div className="reel-actions">
            <button type="button" className="aroma-ghost" onClick={() => onOpen(mix)}>Подробнее</button>
            <AromaCTA pulse={!gone} disabled={gone} onClick={() => onChoose(mix)}>Покурить</AromaCTA>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feed({ items, variant, storyAt, noDesc, start = 0, paused: initialPaused = false, gone: goneId = null, hint = false, favs, onFav, onOpen, onChoose }) {
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

  return (
    <div className="reels" ref={ref}>
      {items.map((item, i) => (
        <div key={item.mix.id} data-i={i} className="reel-slot">
          {Math.abs(i - active) <= 1 ? (
            <Reel
              item={item}
              variant={variant}
              storyAt={i === start && !swiped ? storyAt : undefined}
              noDesc={noDesc}
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

// ── Телефон ──

function GuestPhone({ variant = 'A', storyAt, noDesc = false, logged: initialLogged = false, persona = 'steady', start = 0, paused = false, gone = null, hint = false, sheet: initialSheet = null, confirm = false }) {
  const [view, setView] = React.useState(confirm ? 'confirm' : 'reels');
  const [logged, setLogged] = React.useState(initialLogged);
  const [sheet, setSheet] = React.useState(initialSheet);
  const [favs, setFavs] = React.useState(initialLogged ? FAVORITES : []);
  const [heartPrompt, setHeartPrompt] = React.useState(false);
  const items = logged ? loggedItems(persona) : ANON_ITEMS;
  const [chosen, setChosen] = React.useState(items[start].mix);
  const choose = (mix) => { setSheet(null); setChosen(mix); setView('confirm'); };
  const toggleFav = (mix) => {
    if (!logged) return setHeartPrompt(true);
    setFavs(favs.includes(mix.id) ? favs.filter((id) => id !== mix.id) : [...favs, mix.id]);
  };
  const login = () => { setHeartPrompt(false); setLogged(true); setFavs(FAVORITES); };

  let body;
  if (view === 'confirm') {
    body = <window.ConfirmationScreen mix={chosen} onDone={() => setView('reels')} />;
  } else if (view === 'reels') {
    body = (
      <>
        <Feed key={String(logged)} items={items} variant={variant} storyAt={storyAt} noDesc={noDesc} start={start} paused={paused} gone={gone} hint={hint} favs={favs} onFav={toggleFav} onOpen={setSheet} onChoose={choose} />
        <BottomNav value="reels" onChange={setView} />
      </>
    );
  } else {
    body = (
      <>
        <Topbar />
        <main className="content"><StubScreen title={NAV_ITEMS.find((item) => item.id === view).label} text="Экран не меняется." /></main>
        <BottomNav value={view} onChange={setView} />
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

const at = (id) => FEED_ORDERED.findIndex((m) => m.id === id);

const SHOTS = [
  { id: 'a-first', group: 'A', name: 'Афиша · с описанием', note: '«Ледяное яблоко с клюквой». Название и описание по центру, сцена видна по всему экрану. Внизу — рейтинг, сердечко, полоса состава, кнопки.', props: { hint: true } },
  { id: 'a-nodesc', group: 'A', name: 'Афиша · без описания', note: 'Тот же микс без описания: на месте описания — вкусы капсами через точку.', props: { noDesc: true } },
  { id: 'a-long', group: 'A', name: 'Длинный состав', note: '«Френч-коктейль»: шесть вкусов, четыре табака — состав в две колонки, полоса пропорций сверху.', props: { start: at('mix-catalog-niche-10') } },
  { id: 'a-long-nodesc', group: 'A', name: 'Длинный состав · без описания', note: 'Шесть вкусов капсами переносятся по центру, до трёх строк.', props: { start: at('mix-catalog-niche-10'), noDesc: true } },
  { id: 'a-bare', group: 'A', name: 'Без оценок и описания', note: '«Томат с перцем»: гости не оценивали, описания нет. Сердечко остаётся справа.', props: { start: at('mix-catalog-niche-06'), noDesc: true } },
  { id: 'a-paused', group: 'A', name: 'Пауза', note: 'Тап по сцене или тексту — пауза. Текст тапы не перехватывает.', props: { start: 2, paused: true } },
  { id: 'a-gone', group: 'A', name: 'Микс закончился', note: 'Нажмите «Покурить»: вместо состава — строка-статус, CTA неактивна.', props: { start: 4, gone: 'mix-catalog-niche-14' } },
  { id: 'a-li-bubble', group: 'A', name: 'Вошедший гость · подсказка', note: '«Давно на одном вкусе» поднялась наверх — центр занят афишей.', props: { logged: true } },
  { id: 'a-li-taste', group: 'A', name: 'Вошедший гость · «Для вас»', note: 'Надпись слота над названием, причина — под описанием.', props: { logged: true, persona: 'varied', start: 1 } },
  { id: 'c-live', group: 'C', name: 'История · живая', note: 'Играет с начала: ≈ 6 с, финал держится. Листните вниз и обратно — история начнётся заново. Тап — пауза.', props: { variant: 'C' } },
  { id: 'c-1', group: 'C', name: 'Такт 1 · название', note: '0–1,8 с. Название по центру. Кнопки и сердечко видны сразу — выбирать можно не дожидаясь финала.', props: { variant: 'C', storyAt: 1 } },
  { id: 'c-2', group: 'C', name: 'Такт 2 · вкусы', note: '1,8–4,2 с. Вкусы появляются по одному со своим мотивом сцены: мята — снежинка, яблоко — долька, клюква — ягоды.', props: { variant: 'C', storyAt: 3.6 } },
  { id: 'c-3', group: 'C', name: 'Такт 3 · финал', note: 'С 4,2 с. Афиша A: описание, рейтинг, полоса состава прорисовывается слева направо. Финал держится.', props: { variant: 'C', storyAt: 6 } },
  { id: 'c-3-nodesc', group: 'C', name: 'Финал · без описания', note: 'Без описания финал повторяет вкусы капсами — как в A.', props: { variant: 'C', storyAt: 6, noDesc: true } },
  { id: 'c-2-long', group: 'C', name: 'Такт 2 · много вкусов', note: '«Френч-коктейль»: показываем четыре вкуса и «и ещё 2» — шесть строк не влезут в такт.', props: { variant: 'C', storyAt: 4, start: at('mix-catalog-niche-10') } },
  { id: 'c-li-taste', group: 'C', name: 'Вошедший гость · финал', note: 'Слот и причина «Для вас» — только в финале, как в A.', props: { variant: 'C', storyAt: 6, logged: true, persona: 'varied', start: 1 } },
];

function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} />
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
        <p className="aroma-caps">#314 · мокап на согласование · раунд 1</p>
        <h1 className="board-title">Рилс без дока</h1>
        <p className="board-text">Сейчас вся информация о миксе — плотный док на нижней половине рилса, сцена видна только сверху. Но сцена — абстрактный фон, а не видео: перекрывать её не страшно. Поэтому главное — название и описание — переезжает в центр, а внизу остаются рейтинг, сердечко, полоса состава и кнопки. Профили и строка вкусов уходят: их передают сцена и описание.</p>
        <p className="board-text">Два варианта: A · Афиша — всё видно сразу; C · История — та же афиша в финале, но перед ней ≈ 4 с рассказа: название, затем вкусы по одному. У каждого — с описанием и без: описание есть у всех миксов прода, но мастер может завести микс без него. Миксы — витрина прода на 15 октября; сцены — CSS-приближение Remotion из #153.</p>
      </header>
      <section className="board-section" id="a">
        <h2 className="board-h2">A · Афиша</h2>
        <div className="board-row">{row('A')}</div>
      </section>
      <section className="board-section" id="c">
        <h2 className="board-h2">C · История</h2>
        <div className="timeline">
          <div className="timeline-step"><p className="aroma-caps">0–1,8 с · название</p><p>Название по центру, крупно. Соседний рилс при свайпе показывает этот же кадр.</p></div>
          <div className="timeline-step"><p className="aroma-caps">1,8–4,2 с · вкусы</p><p>До четырёх вкусов по одному, каждый со своим мотивом сцены. Больше четырёх — «и ещё N».</p></div>
          <div className="timeline-step"><p className="aroma-caps">с 4,2 с · финал</p><p>Афиша A. Держится, пока гость не листнёт. Без анимаций (reduced motion) и в полосе над Подбором — сразу финал.</p></div>
        </div>
        <div className="board-row">{row('C')}</div>
      </section>
    </div>
  );
}

const params = new URLSearchParams(location.hash.slice(1));
const shotId = params.get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
