// recommendations.jsx — three rec-list variants.
// Fix: current cards (IMG_7264) are tall colored blocks with empty
// space + name floating + small footer. Three approaches that all
// reclaim the dead area as the olfactory signature.

const {
  aromaTokens: ART, mixes: MIXES, profileColor: RPC, profileLabel: RPLBL,
  PhoneShell, Topbar, CodeChip, SegmentNav, BottomDock, PhoneBody, CapsLabel,
  SignatureBar, ProfileGlyph, RatingPill, CTA,
} = window;

// Common: header for any recommendations screen
function RecHeader({ count = 6 }) {
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
          value="recs"
          onChange={() => {}}
        />
      }
    />
  );
}

// ───────────────────────────────────────────────────────────
// Variant A — Dense composite rows. Each row 84px tall, has:
//   ProfileGlyph (olfactory signature) | name + meta | rating
// Reclaims empty space. Reads like a curated menu.
// ───────────────────────────────────────────────────────────
function RecommendationsRows() {
  return (
    <PhoneShell>
      <RecHeader />
      <PhoneBody style={{ gap: 12 }}>
        <div>
          <CapsLabel>Подбор для вас</CapsLabel>
          <h2 className="aroma-serif" style={{ fontSize: 22, color: ART.text0, lineHeight: 1.1, marginTop: 6 }}>
            Шесть миксов под вашу палитру
          </h2>
          <p style={{ color: ART.text1, fontSize: 12.5, lineHeight: 1.5, marginTop: 6, maxWidth: '36ch' }}>
            Слева — ольфакторная сигнатура. Тап по карточке откроет состав.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {MIXES.slice(0, 6).map((m, i) => (
            <article key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr auto',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(34,15,16,0.96) 0%, rgba(22,11,12,0.88) 100%)',
              border: `1px solid ${ART.line}`,
              boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.04), 0 14px 28px rgba(0,0,0,0.18)',
              position: 'relative',
            }}>
              <ProfileGlyph profiles={m.profiles} size={56} />
              <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <h3 className="aroma-serif" style={{ fontSize: 16, color: ART.text0, lineHeight: 1.1, letterSpacing: '0.005em' }}>
                    {m.name}
                  </h3>
                </div>
                <p style={{ fontSize: 11.5, color: ART.text1, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.flavors.join(' · ')}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {m.profiles.slice(0, 2).map(p => (
                    <span key={p} style={{
                      fontSize: 10, color: ART.text1, letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>{RPLBL[p]}</span>
                  )).reduce((acc, el, i, arr) => {
                    acc.push(el);
                    if (i < arr.length - 1) acc.push(<span key={`s${i}`} style={{ color: ART.text2 }}>·</span>);
                    return acc;
                  }, [])}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                <RatingPill rating={m.rating} />
                <span style={{ fontSize: 10, color: ART.text2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {m.popularity}
                </span>
              </div>
            </article>
          ))}
        </div>
      </PhoneBody>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Hero + compact stack.
// First rec is a full-bleed hero card (ProfileGlyph + signature bar +
// composition + CTA), then 4 compact rows below. Best when there's
// one strong match.
// ───────────────────────────────────────────────────────────
function RecommendationsHero() {
  const [hero, ...rest] = MIXES.slice(0, 5);
  return (
    <PhoneShell>
      <RecHeader />
      <PhoneBody style={{ gap: 14 }}>
        <div>
          <CapsLabel>Лучшее совпадение</CapsLabel>
        </div>

        {/* Hero */}
        <article style={{
          borderRadius: 22,
          padding: 18,
          background: `
            radial-gradient(circle at 80% 0%, ${RPC[hero.profiles[0]]}55 0%, transparent 55%),
            linear-gradient(180deg, rgba(52,22,22,0.95) 0%, rgba(22,10,11,0.96) 100%)`,
          border: `1px solid ${ART.line}`,
          boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.06), 0 20px 36px rgba(0,0,0,0.28)',
          display: 'grid', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
            <ProfileGlyph profiles={hero.profiles} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="aroma-serif" style={{ fontSize: 22, color: ART.text0, lineHeight: 1.05 }}>
                {hero.name}
              </h2>
              <p style={{ fontSize: 12.5, color: ART.text1, lineHeight: 1.4, marginTop: 4 }}>
                {hero.description}
              </p>
            </div>
          </div>

          <SignatureBar profiles={hero.profiles} height={6} />

          <div style={{ display: 'grid', gap: 6 }}>
            {hero.components.map(c => (
              <div key={c.name} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
                fontSize: 12, color: ART.text1, alignItems: 'center',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: ART.text2, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 6 }}>{c.maker}</span>
                  {c.name}
                </span>
                <span style={{ color: ART.accentSoft, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{c.share}%</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RatingPill rating={hero.rating} count={hero.ratingCount} />
            <span style={{ color: ART.text2, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {hero.popularity} выборов
            </span>
            <span style={{ flex: 1 }} />
          </div>

          <CTA pulse>Покурить</CTA>
        </article>

        <CapsLabel>Тоже подходят</CapsLabel>
        <div style={{ display: 'grid', gap: 8 }}>
          {rest.map(m => (
            <article key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(28,13,13,0.84)',
              border: `1px solid ${ART.lineSoft}`,
            }}>
              <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                <h3 className="aroma-serif" style={{ fontSize: 14.5, color: ART.text0, lineHeight: 1.1 }}>
                  {m.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SignatureBar profiles={m.profiles} height={3} />
                </div>
                <p style={{ fontSize: 11, color: ART.text1, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.flavors.join(' · ')}
                </p>
              </div>
              <RatingPill rating={m.rating} />
            </article>
          ))}
        </div>
      </PhoneBody>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Numbered ranking list.
// Минимально, scan-friendly. Каждая строка 56px высотой.
// Большие порядковые номера в дисплейном шрифте дают ритм.
// ───────────────────────────────────────────────────────────
function RecommendationsRanked() {
  return (
    <PhoneShell>
      <RecHeader />
      <PhoneBody style={{ gap: 12 }}>
        <div>
          <CapsLabel>Подбор для вас</CapsLabel>
          <h2 className="aroma-serif" style={{ fontSize: 22, color: ART.text0, lineHeight: 1.1, marginTop: 6 }}>
            Шесть миксов в порядке совпадения
          </h2>
        </div>

        <div style={{ display: 'grid', gap: 0,
          borderRadius: 18, overflow: 'hidden',
          background: 'rgba(24,11,12,0.88)',
          border: `1px solid ${ART.line}`,
        }}>
          {MIXES.slice(0, 6).map((m, i) => (
            <article key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr auto',
              gap: 12,
              padding: '14px 14px 14px 10px',
              alignItems: 'center',
              borderTop: i === 0 ? 0 : `1px solid ${ART.lineSoft}`,
            }}>
              <span className="aroma-serif" style={{
                fontSize: 24,
                color: i < 3 ? ART.primary : ART.text2,
                lineHeight: 1, textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                <h3 className="aroma-serif" style={{ fontSize: 15.5, color: ART.text0, lineHeight: 1.1 }}>
                  {m.name}
                </h3>
                <SignatureBar profiles={m.profiles} height={3} />
                <p style={{ fontSize: 11.5, color: ART.text1, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.flavors.join(' · ')}
                </p>
              </div>
              <RatingPill rating={m.rating} />
            </article>
          ))}
        </div>
      </PhoneBody>
    </PhoneShell>
  );
}

Object.assign(window, { RecommendationsRows, RecommendationsHero, RecommendationsRanked });
