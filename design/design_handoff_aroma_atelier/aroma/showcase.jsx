// showcase.jsx — three "Витрина" variants.
// Fix: current (IMG_7263) is dense with two paragraph descriptions
// stacked above 2-col card grids. Pull density down, lean on
// typography for category personality.

const {
  aromaTokens: AST, mixes: ASMIXES, profileColor: ASPC, profileLabel: ASPLBL,
  PhoneShell, Topbar, CodeChip, SegmentNav, BottomDock, PhoneBody, CapsLabel,
  SignatureBar, ProfileGlyph, RatingPill, Chip,
} = window;

const railsData = [
  {
    id: 'soft',
    title: 'Мягкая витрина',
    kind: 'Редакция',
    mixes: ['silk-road', 'grape-atelier', 'apple-wave'],
  },
  {
    id: 'masters',
    title: 'От наших мастеров',
    kind: 'Мастера',
    mixes: ['amber-bazaar', 'dark-market', 'mint-veil'],
  },
  {
    id: 'top',
    title: 'Топ выбор гостей',
    kind: 'Выбор гостей',
    mixes: ['citrus-caravan', 'mint-veil', 'amber-bazaar'],
  },
];

function ShowHeader() {
  return (
    <Topbar
      right={<CodeChip />}
      navBelow={
        <SegmentNav
          items={[
            { id: 'recs',     label: 'Подбор' },
            { id: 'showcase', label: 'Витрина' },
            { id: 'catalog',  label: 'Каталог' },
          ]}
          value="showcase"
          onChange={() => {}}
        />
      }
    />
  );
}

const byId = (id) => ASMIXES.find(m => m.id === id) || ASMIXES[0];

// ───────────────────────────────────────────────────────────
// Variant A — Editorial single-column with serif category labels.
// One hero card per rail. Category name is the label, no paragraph.
// ───────────────────────────────────────────────────────────
function ShowcaseEditorial() {
  return (
    <PhoneShell>
      <ShowHeader />
      <PhoneBody style={{ gap: 18 }}>
        {railsData.map((rail, i) => {
          const hero = byId(rail.mixes[0]);
          return (
            <section key={rail.id} style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <h2 className="aroma-serif" style={{ fontSize: 22, color: AST.text0, lineHeight: 1.1, letterSpacing: '0.005em' }}>
                  {rail.title}
                </h2>
                <span className="aroma-caps">{rail.kind}</span>
              </div>

              {/* Hero */}
              <article style={{
                borderRadius: 18,
                padding: 14,
                background: `
                  radial-gradient(circle at 88% 0%, ${ASPC[hero.profiles[0]]}50 0%, transparent 60%),
                  linear-gradient(180deg, rgba(40,17,17,0.96) 0%, rgba(22,11,12,0.96) 100%)`,
                border: `1px solid ${AST.line}`,
                boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.05), 0 16px 28px rgba(0,0,0,0.22)',
                display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 12, alignItems: 'center',
              }}>
                <ProfileGlyph profiles={hero.profiles} size={60} />
                <div style={{ minWidth: 0, display: 'grid', gap: 5 }}>
                  <h3 className="aroma-serif" style={{ fontSize: 17, color: AST.text0, lineHeight: 1.1 }}>{hero.name}</h3>
                  <SignatureBar profiles={hero.profiles} height={3} />
                  <p style={{ fontSize: 11.5, color: AST.text1, lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hero.flavors.join(' · ')}
                  </p>
                </div>
                <RatingPill rating={hero.rating} />
              </article>

              {/* Companion rows */}
              <div style={{ display: 'grid', gap: 4 }}>
                {rail.mixes.slice(1, 3).map(id => {
                  const m = byId(id);
                  return (
                    <button key={id} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'transparent',
                      border: `1px solid ${AST.lineSoft}`,
                      borderRadius: 12,
                      textAlign: 'left',
                    }}>
                      <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <h4 className="aroma-serif" style={{ fontSize: 14, color: AST.text0, lineHeight: 1.1 }}>{m.name}</h4>
                        </div>
                        <p style={{ fontSize: 11, color: AST.text1, lineHeight: 1.2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.flavors.join(' · ')}
                        </p>
                      </div>
                      <RatingPill rating={m.rating} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </PhoneBody>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Category switcher. Big serif category tabs at the
// top; results below show the selected rail only. Minimum density.
// ───────────────────────────────────────────────────────────
function ShowcaseTabs() {
  const [active, setActive] = React.useState('soft');
  const rail = railsData.find(r => r.id === active);
  return (
    <PhoneShell>
      <ShowHeader />

      {/* Category switcher */}
      <div style={{
        padding: '12px 20px 4px',
        borderBottom: `1px solid ${AST.lineSoft}`,
        display: 'flex', gap: 14, overflowX: 'auto',
      }}>
        {railsData.map(r => {
          const isActive = r.id === active;
          return (
            <button key={r.id} onClick={() => setActive(r.id)} style={{
              background: 'transparent', border: 0,
              padding: '6px 0 12px',
              display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
              borderBottom: `2px solid ${isActive ? AST.primary : 'transparent'}`,
              flex: '0 0 auto',
              cursor: 'pointer',
            }}>
              <span className="aroma-caps" style={{ color: isActive ? AST.accentSoft : AST.text2 }}>{r.kind}</span>
              <span className="aroma-serif" style={{
                fontSize: 19, color: isActive ? AST.text0 : AST.text1,
                lineHeight: 1.1, whiteSpace: 'nowrap', letterSpacing: '0.005em',
              }}>{r.title}</span>
            </button>
          );
        })}
      </div>

      <PhoneBody style={{ gap: 10 }}>
        {rail.mixes.map((id, i) => {
          const m = byId(id);
          return (
            <article key={id} style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr auto',
              gap: 12,
              padding: 12,
              alignItems: 'center',
              borderRadius: 16,
              background: i === 0
                ? `radial-gradient(circle at 90% 0%, ${ASPC[m.profiles[0]]}45 0%, transparent 55%),
                   linear-gradient(180deg, rgba(42,18,18,0.96) 0%, rgba(22,11,12,0.96) 100%)`
                : 'rgba(28,13,13,0.84)',
              border: `1px solid ${i === 0 ? AST.line : AST.lineSoft}`,
              boxShadow: i === 0 ? 'inset 0 1px 0 rgba(255,244,236,0.05), 0 14px 24px rgba(0,0,0,0.22)' : 'none',
            }}>
              <ProfileGlyph profiles={m.profiles} size={56} />
              <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                <h3 className="aroma-serif" style={{ fontSize: 16, color: AST.text0, lineHeight: 1.1 }}>{m.name}</h3>
                <SignatureBar profiles={m.profiles} height={3} />
                <p style={{ fontSize: 11.5, color: AST.text1, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.flavors.join(' · ')}
                </p>
              </div>
              <RatingPill rating={m.rating} />
            </article>
          );
        })}
      </PhoneBody>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Quiet horizontal rails. Keep the multi-rail shape
// but kill paragraph descriptions; tiny meta-pill replaces them.
// Each rail = serif title + meta-pill + horizontally scrolling
// compact cards.
// ───────────────────────────────────────────────────────────
function ShowcaseRails() {
  return (
    <PhoneShell>
      <ShowHeader />
      <PhoneBody style={{ gap: 22, padding: '16px 0 20px' }}>
        {railsData.map(rail => (
          <section key={rail.id} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 20px' }}>
              <h2 className="aroma-serif" style={{ fontSize: 21, color: AST.text0, lineHeight: 1.1, letterSpacing: '0.005em' }}>
                {rail.title}
              </h2>
              <span className="aroma-caps" style={{
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(81,33,21,0.5)',
                border: `1px solid ${AST.lineSoft}`,
                color: AST.text1,
              }}>{rail.kind}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 4px' }}>
              {rail.mixes.map(id => {
                const m = byId(id);
                return (
                  <article key={id} style={{
                    flex: '0 0 auto',
                    width: 196,
                    borderRadius: 16,
                    padding: 12,
                    background: `
                      radial-gradient(circle at 86% 0%, ${ASPC[m.profiles[0]]}48 0%, transparent 60%),
                      linear-gradient(180deg, rgba(40,17,17,0.96) 0%, rgba(22,11,12,0.96) 100%)`,
                    border: `1px solid ${AST.line}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.04), 0 14px 24px rgba(0,0,0,0.22)',
                    display: 'grid', gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ProfileGlyph profiles={m.profiles} size={44} />
                      <RatingPill rating={m.rating} style={{ marginLeft: 'auto' }} />
                    </div>
                    <h3 className="aroma-serif" style={{ fontSize: 15.5, color: AST.text0, lineHeight: 1.1, minHeight: '2.2em' }}>
                      {m.name}
                    </h3>
                    <SignatureBar profiles={m.profiles} height={3} />
                    <p style={{ fontSize: 11, color: AST.text1, lineHeight: 1.25,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {m.flavors.join(' · ')}
                    </p>
                  </article>
                );
              })}
              {/* Trailing "all" pill */}
              <button style={{
                flex: '0 0 auto', width: 64,
                borderRadius: 16,
                border: `1px dashed ${AST.line}`,
                background: 'rgba(20,10,10,0.5)',
                color: AST.text1,
                fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', lineHeight: 1.2,
                padding: 8,
              }}>Все</button>
            </div>
          </section>
        ))}
      </PhoneBody>
    </PhoneShell>
  );
}

Object.assign(window, { ShowcaseEditorial, ShowcaseTabs, ShowcaseRails });
