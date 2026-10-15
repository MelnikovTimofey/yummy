// aroma-shared.jsx — brand tokens, sample data, primitive components.
// Loaded as a global Babel script; exposes shared symbols on window.

// ───────────────────────────────────────────────────────────
// Tokens (from PRD + brand brief — do not invent new colors)
// ───────────────────────────────────────────────────────────
const aromaTokens = {
  bg:         '#130807',
  surface:    '#1b0d0e',
  surfaceAlt: '#271314',
  elevated:   '#351717',
  primary:    '#d8ab68',
  accentSoft: '#f2d5a5',
  accentDeep: '#8c2d24',
  ember:      '#ee9d45',
  text0:      '#f8eee8',
  text1:      '#d0b5a3',
  text2:      '#8e7464',
  line:       'rgba(193,141,106,0.22)',
  lineSoft:   'rgba(193,141,106,0.12)',
  danger:     '#df6f5b',
  fontDisplay:'"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif',
  fontBody:   '"Avenir Next","Helvetica Neue","Segoe UI",sans-serif',
};

// One-time global CSS — keep it scoped to .aroma so it never leaks into
// the design canvas chrome.
if (typeof document !== 'undefined' && !document.getElementById('aroma-styles')) {
  const s = document.createElement('style');
  s.id = 'aroma-styles';
  s.textContent = `
    .aroma {
      font-family: ${aromaTokens.fontBody};
      color: ${aromaTokens.text0};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .aroma * { box-sizing: border-box; }
    .aroma ::-webkit-scrollbar { width: 0; height: 0; display: none; }
    .aroma * { scrollbar-width: none; }
    .aroma button { font: inherit; color: inherit; cursor: pointer; }
    .aroma h1, .aroma h2, .aroma h3, .aroma h4 { margin: 0; font-weight: 400; font-family: ${aromaTokens.fontDisplay}; letter-spacing: 0.01em; }
    .aroma p { margin: 0; }
    .aroma-caps {
      font-family: ${aromaTokens.fontBody};
      font-size: 10.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${aromaTokens.text2};
      font-weight: 500;
    }
    .aroma-serif { font-family: ${aromaTokens.fontDisplay}; }
    @keyframes aroma-ember {
      0% { box-shadow: 0 0 0 0 rgba(238,157,69,0.45), 0 14px 26px rgba(140,45,36,0.32); }
      60% { box-shadow: 0 0 0 18px rgba(238,157,69,0), 0 14px 26px rgba(140,45,36,0.32); }
      100% { box-shadow: 0 0 0 0 rgba(238,157,69,0), 0 14px 26px rgba(140,45,36,0.32); }
    }
    .aroma-ember-pulse { animation: aroma-ember 1.6s ease-out infinite; }
  `;
  document.head.appendChild(s);
}

// ───────────────────────────────────────────────────────────
// Profile → olfactory color signature
// These give each flavor profile a visual identity (dot / mazok)
// so mix cards stop relying on empty colored gradient blocks.
// ───────────────────────────────────────────────────────────
const profileColor = {
  citrus:        '#e8b948',
  berry:         '#a23048',
  floral_herbal: '#7a9560',
  fresh:         '#7fb5a3',
  sweet:         '#d98c5a',
  spicy:         '#c0492c',
  dessert:       '#b07747',
  tobacco:       '#7a5236',
  minty:         '#6ba88a',
  fruity:        '#dd8a4a',
  perfume:       '#c787a8',
  sour:          '#bcb04a',
};

const profileLabel = {
  citrus:        'Цитрусовый',
  berry:         'Ягодный',
  floral_herbal: 'Цветочно-травяной',
  fresh:         'Свежий',
  sweet:         'Сладкий',
  spicy:         'Пряный',
  dessert:       'Десертный',
  tobacco:       'Табачный',
  minty:         'Мятный',
  fruity:        'Фруктовый',
  perfume:       'Парфюмный',
  sour:          'Кислый',
};

// ───────────────────────────────────────────────────────────
// Sample data — flavors, profiles, mixes
// ───────────────────────────────────────────────────────────
const profileList = [
  { id: 'citrus',        label: 'Цитрусовый' },
  { id: 'berry',         label: 'Ягодный' },
  { id: 'fresh',         label: 'Свежий' },
  { id: 'sweet',         label: 'Сладкий' },
  { id: 'spicy',         label: 'Пряный' },
  { id: 'dessert',       label: 'Десертный' },
  { id: 'floral_herbal', label: 'Цветочно-травяной' },
  { id: 'minty',         label: 'Мятный' },
  { id: 'fruity',        label: 'Фруктовый' },
  { id: 'perfume',       label: 'Парфюмный' },
  { id: 'sour',          label: 'Кислый' },
  { id: 'tobacco',       label: 'Табачный' },
];

const flavorList = [
  'грейпфрут', 'лимон', 'лайм', 'апельсин', 'мандарин',
  'малина', 'ежевика', 'клубника', 'виноград', 'смородина',
  'мята', 'базилик', 'розмарин', 'лаванда',
  'ваниль', 'мёд', 'карамель', 'шоколад',
  'кардамон', 'корица', 'имбирь',
  'персик', 'яблоко', 'груша', 'дыня',
  'белые цветы', 'жасмин', 'роза',
];

const mixes = [
  {
    id: 'citrus-caravan',
    name: 'Цитрусовый караван',
    profiles: ['citrus', 'fresh'],
    flavors: ['лимон', 'грейпфрут', 'лайм'],
    rating: 5.0, ratingCount: 84, popularity: 312, available: true,
    description: 'Сухой грейпфрут, лимонная цедра и свежесть мяты.',
    components: [
      { name: 'Citrus Breeze', maker: 'Adalya', share: 50 },
      { name: 'Mint Veil',     maker: 'Element', share: 30 },
      { name: 'Lime Edge',     maker: 'Darkside', share: 20 },
    ],
  },
  {
    id: 'apple-wave',
    name: 'Яблочная волна',
    profiles: ['fruity', 'sour'],
    flavors: ['зелёное яблоко', 'лимон', 'мята'],
    rating: 4.4, ratingCount: 51, popularity: 198, available: true,
    description: 'Кислое зелёное яблоко с прохладной мятной волной.',
    components: [
      { name: 'Apple Fizz', maker: 'Element', share: 60 },
      { name: 'Mint Veil',  maker: 'Element', share: 40 },
    ],
  },
  {
    id: 'silk-road',
    name: 'Шёлковый путь',
    profiles: ['sweet', 'dessert'],
    flavors: ['мёд', 'ваниль', 'малина'],
    rating: 4.6, ratingCount: 67, popularity: 244, available: true,
    description: 'Тёплый мёд, ванильный шлейф и нота малины.',
    components: [
      { name: 'Honey Cream',  maker: 'Tangiers', share: 45 },
      { name: 'Vanilla Dust', maker: 'Darkside', share: 30 },
      { name: 'Raspberry',    maker: 'Adalya',   share: 25 },
    ],
  },
  {
    id: 'grape-atelier',
    name: 'Виноградное ателье',
    profiles: ['berry', 'perfume'],
    flavors: ['виноград', 'ежевика', 'роза'],
    rating: 4.5, ratingCount: 59, popularity: 187, available: true,
    description: 'Глубокий виноград и тёмная ягода с парфюмным шлейфом.',
    components: [
      { name: 'Black Grape',   maker: 'Darkside',  share: 55 },
      { name: 'Wild Berry',    maker: 'Tangiers',  share: 30 },
      { name: 'Rose Whisper',  maker: 'Adalya',    share: 15 },
    ],
  },
  {
    id: 'amber-bazaar',
    name: 'Янтарный базар',
    profiles: ['spicy', 'dessert'],
    flavors: ['корица', 'кардамон', 'мёд'],
    rating: 4.5, ratingCount: 72, popularity: 221, available: true,
    description: 'Пряная корица и кардамон с тёплой медовой подложкой.',
    components: [
      { name: 'Cinnamon Bark', maker: 'Tangiers', share: 40 },
      { name: 'Cardamom',      maker: 'Darkside', share: 35 },
      { name: 'Honey Cream',   maker: 'Tangiers', share: 25 },
    ],
  },
  {
    id: 'dark-market',
    name: 'Тёмный рынок',
    profiles: ['tobacco', 'spicy'],
    flavors: ['сухофрукты', 'пряности', 'табак'],
    rating: 4.3, ratingCount: 44, popularity: 165, available: true,
    description: 'Сухофрукты, дымные пряности и тёплая табачная основа.',
    components: [
      { name: 'Dry Fruit',  maker: 'Tangiers', share: 50 },
      { name: 'Spice Trail',maker: 'Darkside', share: 30 },
      { name: 'Tobacco Base', maker: 'Tangiers', share: 20 },
    ],
  },
  {
    id: 'mint-veil',
    name: 'Мятный шлейф',
    profiles: ['minty', 'fresh'],
    flavors: ['мята', 'эвкалипт', 'лайм'],
    rating: 4.7, ratingCount: 91, popularity: 287, available: true,
    description: 'Холодная мята, эвкалипт и капля лайма.',
    components: [
      { name: 'Mint Veil',   maker: 'Element',  share: 60 },
      { name: 'Eucalyptus',  maker: 'Darkside', share: 25 },
      { name: 'Lime Edge',   maker: 'Darkside', share: 15 },
    ],
  },
  {
    id: 'white-bouquet',
    name: 'Белый букет',
    profiles: ['floral_herbal', 'perfume'],
    flavors: ['белые цветы', 'жасмин', 'базилик'],
    rating: 4.2, ratingCount: 38, popularity: 124, available: true,
    description: 'Жасмин и белые цветы с травянистой ноткой базилика.',
    components: [
      { name: 'Jasmine',      maker: 'Adalya',   share: 50 },
      { name: 'White Flower', maker: 'Element',  share: 30 },
      { name: 'Basil Leaf',   maker: 'Darkside', share: 20 },
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Primitive components
// ───────────────────────────────────────────────────────────

// PhoneShell — 430-wide dark phone-shell frame. The product lives inside
// here whether it's on iPhone Safari or a desktop browser; we use it as
// the artboard's canvas.
function PhoneShell({ children, label, scale = 1 }) {
  const W = 414, H = 880;
  return (
    <div
      className="aroma"
      style={{
        width: W, height: H,
        borderRadius: 28,
        background: `
          radial-gradient(circle at 50% -10%, rgba(122,28,25,0.55), transparent 36%),
          radial-gradient(circle at 90% 12%, rgba(238,157,69,0.18), transparent 30%),
          radial-gradient(circle at 0% 95%, rgba(238,157,69,0.10), transparent 35%),
          linear-gradient(180deg, #1d0a0a 0%, #130807 60%, #0d0405 100%)
        `,
        border: `1px solid ${aromaTokens.line}`,
        boxShadow: '0 30px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,244,236,0.05)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}

// Topbar — brand mark + (optional) action pill. Sticky at top.
function Topbar({ right, navBelow, compact = false }) {
  return (
    <div style={{
      flex: '0 0 auto',
      padding: compact ? '14px 20px 10px' : '18px 20px 12px',
      borderBottom: `1px solid ${aromaTokens.lineSoft}`,
      background: 'linear-gradient(180deg, rgba(37,14,15,0.92) 0%, rgba(28,11,12,0.62) 100%)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      display: 'grid',
      gap: 12,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontFamily: aromaTokens.fontDisplay,
          fontSize: 28,
          lineHeight: 1,
          letterSpacing: '0.02em',
          textTransform: 'lowercase',
          color: aromaTokens.text0,
        }}>nomad</span>
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {navBelow}
    </div>
  );
}

// CodeChip — the "Новый код" header action.
function CodeChip({ children = 'Новый код' }) {
  return (
    <button style={{
      border: `1px solid rgba(242,213,165,0.20)`,
      background: 'rgba(63,20,20,0.62)',
      color: aromaTokens.accentSoft,
      borderRadius: 999,
      height: 34,
      padding: '0 14px',
      fontSize: 10.5,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    }}>{children}</button>
  );
}

// Chip — flavor / profile chip. Tiers: `lg` for profiles, `sm` for flavors.
function Chip({ active, onClick, children, tier = 'sm', color, style }) {
  const isLg = tier === 'lg';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        border: `1px solid ${active ? aromaTokens.primary : aromaTokens.line}`,
        background: active
          ? 'linear-gradient(180deg, rgba(216,171,104,0.20) 0%, rgba(140,45,36,0.18) 100%)'
          : 'rgba(40,18,18,0.6)',
        color: active ? aromaTokens.accentSoft : aromaTokens.text1,
        borderRadius: 999,
        padding: isLg ? '10px 14px' : '7px 12px',
        fontSize: isLg ? 13 : 12,
        fontWeight: 400,
        letterSpacing: 0,
        textTransform: 'none',
        lineHeight: 1.1,
        boxShadow: active ? 'inset 0 1px 0 rgba(255,244,236,0.10)' : 'none',
        transition: 'background 120ms, border-color 120ms, color 120ms',
        ...style,
      }}
    >
      {color && <span style={{
        width: isLg ? 8 : 6, height: isLg ? 8 : 6, borderRadius: 999,
        background: color, flex: '0 0 auto',
        boxShadow: active ? `0 0 0 2px rgba(216,171,104,0.18)` : 'none',
      }} />}
      <span>{children}</span>
    </button>
  );
}

// CapsLabel — small all-caps section label.
function CapsLabel({ children, color, style }) {
  return (
    <p className="aroma-caps" style={{ color: color || aromaTokens.text2, ...style }}>
      {children}
    </p>
  );
}

// CTA — primary ember-glow button.
function CTA({ children, onClick, disabled, style, pulse = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={pulse ? 'aroma-ember-pulse' : ''}
      style={{
        width: '100%',
        border: '1px solid rgba(242,213,165,0.28)',
        background: disabled
          ? 'rgba(60,28,22,0.6)'
          : 'linear-gradient(180deg, #e0b878 0%, #c08a4a 100%)',
        color: disabled ? aromaTokens.text2 : '#23120d',
        borderRadius: 14,
        minHeight: 52,
        padding: '0 18px',
        fontSize: 13,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 600,
        boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,243,220,0.28), 0 14px 26px rgba(140,45,36,0.32)',
        ...style,
      }}
    >{children}</button>
  );
}

// GhostButton — secondary outlined button.
function GhostButton({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      width: '100%',
      border: `1px solid ${aromaTokens.line}`,
      background: 'rgba(40,18,18,0.5)',
      color: aromaTokens.text0,
      borderRadius: 14,
      minHeight: 48,
      padding: '0 16px',
      fontSize: 12,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      fontWeight: 500,
      ...style,
    }}>{children}</button>
  );
}

// SegmentNav — pill-segmented bottom nav (or top tabs).
function SegmentNav({ items, value, onChange, style }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`,
      gap: 6,
      ...style,
    }}>
      {items.map((it) => {
        const isActive = value === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange && onChange(it.id)}
            style={{
              border: `1px solid ${isActive ? 'rgba(255,220,175,0.36)' : aromaTokens.line}`,
              borderRadius: 999,
              padding: '10px 8px',
              minHeight: 40,
              background: isActive
                ? 'linear-gradient(180deg, #e0b878 0%, #cb974c 100%)'
                : 'rgba(56,24,22,0.54)',
              color: isActive ? '#2b160f' : aromaTokens.text1,
              fontSize: 11,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: isActive ? 600 : 500,
            }}
          >{it.label}</button>
        );
      })}
    </div>
  );
}

// ProfileGlyph — a small composite "olfactory signature" using profile colors.
// Drawn as overlapping circles inside a rounded card (no SVG icon, just dots).
function ProfileGlyph({ profiles, size = 56 }) {
  const list = (profiles || []).slice(0, 3);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 14,
      background: 'radial-gradient(circle at 30% 30%, rgba(255,244,236,0.04), transparent 70%), rgba(20,10,10,0.5)',
      border: `1px solid ${aromaTokens.lineSoft}`,
      position: 'relative',
      flex: '0 0 auto',
      overflow: 'hidden',
    }}>
      {list.map((p, i) => {
        const c = profileColor[p] || aromaTokens.primary;
        const positions = [
          { left: 8,  top: 8,  s: 26, o: 0.92 },
          { left: 22, top: 22, s: 24, o: 0.78 },
          { left: 14, top: 28, s: 18, o: 0.62 },
        ];
        const pos = positions[i] || positions[0];
        return (
          <span key={p + i} style={{
            position: 'absolute',
            left: pos.left, top: pos.top,
            width: pos.s, height: pos.s,
            borderRadius: 999,
            background: `radial-gradient(circle at 30% 30%, ${c} 0%, ${c}66 70%, transparent 100%)`,
            opacity: pos.o,
            mixBlendMode: 'screen',
            filter: 'blur(2px)',
          }} />
        );
      })}
    </div>
  );
}

// SignatureBar — horizontal stripe of profile colors (proportional).
// Replaces the empty image-area in mix cards.
function SignatureBar({ profiles, height = 4, radius = 999 }) {
  const list = (profiles || []);
  if (!list.length) return null;
  return (
    <div style={{
      display: 'flex', width: '100%', height, borderRadius: radius, overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(255,244,236,0.04)',
    }}>
      {list.map((p, i) => (
        <span key={p + i} style={{
          flex: 1,
          background: `linear-gradient(90deg, ${profileColor[p] || aromaTokens.primary} 0%, ${profileColor[p] || aromaTokens.primary}aa 100%)`,
        }} />
      ))}
    </div>
  );
}

// RatingPill — compact rating chip.
function RatingPill({ rating, count, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(81,33,21,0.7)',
      border: '1px solid rgba(240,194,123,0.22)',
      color: '#f1cf93',
      borderRadius: 999,
      padding: '3px 9px',
      fontSize: 11,
      lineHeight: 1.2,
      ...style,
    }}>
      <span style={{ color: aromaTokens.ember, fontSize: 10 }}>★</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{rating.toFixed(1).replace('.', ',')}</span>
      {count != null && <span style={{ color: aromaTokens.text2, fontSize: 10 }}>· {count}</span>}
    </span>
  );
}

// BottomDock — sticky footer container (CTA region).
function BottomDock({ children, style }) {
  return (
    <div style={{
      flex: '0 0 auto',
      padding: '12px 20px 22px',
      borderTop: `1px solid ${aromaTokens.lineSoft}`,
      background: 'linear-gradient(180deg, rgba(15,7,7,0) 0%, rgba(15,7,7,0.78) 30%, rgba(15,7,7,0.95) 100%)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      display: 'grid',
      gap: 10,
      ...style,
    }}>{children}</div>
  );
}

// Scroll wrapper — the main scrollable area between Topbar and BottomDock.
function PhoneBody({ children, style }) {
  return (
    <div style={{
      flex: '1 1 auto',
      minHeight: 0,
      overflowY: 'auto',
      padding: '14px 20px 20px',
      display: 'grid',
      gap: 14,
      alignContent: 'start',
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  aromaTokens,
  profileColor, profileLabel, profileList, flavorList, mixes,
  PhoneShell, Topbar, CodeChip,
  Chip, CapsLabel, CTA, GhostButton, SegmentNav,
  ProfileGlyph, SignatureBar, RatingPill,
  BottomDock, PhoneBody,
});
