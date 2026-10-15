// mix-card.jsx — Карточка микса (modal) + Smoke confirmation card + Rail view.
// Brief hierarchy: имя → ольфакторный портрет → состав → CTA.

const {
  aromaTokens: MT, mixes: MMIXES, profileColor: MPC, profileLabel: MPLBL,
  PhoneShell, Topbar, CodeChip, SegmentNav, PhoneBody, BottomDock, CapsLabel,
  CTA, GhostButton, SignatureBar, ProfileGlyph, RatingPill, Chip,
} = window;

// Stacked horizontal proportion bar — single bar split into segments
function ProportionStack({ components, palette = ['#d8ab68', '#c08a4a', '#a23048', '#7a9560', '#7fb5a3'] }) {
  return (
    <div style={{
      display: 'flex', width: '100%', height: 10,
      borderRadius: 999, overflow: 'hidden',
      border: `1px solid ${MT.lineSoft}`,
      background: 'rgba(20,10,10,0.6)',
    }}>
      {components.map((c, i) => (
        <span key={c.name} style={{
          width: `${c.share}%`,
          background: palette[i % palette.length],
        }} />
      ))}
    </div>
  );
}

// Used by all mix-card variants to dim the canvas behind a modal.
function ModalBackdrop({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      background: 'rgba(8,4,4,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>{children}</div>
  );
}

// Faded background list — what's "behind" the modal for context.
function MixCardBackdrop() {
  return (
    <PhoneBody style={{ gap: 8, opacity: 0.42 }}>
      <CapsLabel>Подбор для вас</CapsLabel>
      <h2 className="aroma-serif" style={{ fontSize: 22, color: MT.text0 }}>Шесть миксов под вашу палитру</h2>
      {MMIXES.slice(1, 4).map(m => (
        <div key={m.id} style={{
          height: 64, borderRadius: 14,
          background: 'rgba(28,13,13,0.84)',
          border: `1px solid ${MT.lineSoft}`,
        }} />
      ))}
    </PhoneBody>
  );
}

// ───────────────────────────────────────────────────────────
// Variant A — Hero portrait bottom-sheet
// ───────────────────────────────────────────────────────────
function MixCardHero() {
  const m = MMIXES[0]; // Цитрусовый караван
  const [rating, setRating] = React.useState(0);

  return (
    <PhoneShell>
      <Topbar right={<CodeChip />} />
      <MixCardBackdrop />
      <ModalBackdrop>
        <div style={{
          background: `
            radial-gradient(circle at 88% 0%, ${MPC[m.profiles[0]]}50 0%, transparent 50%),
            linear-gradient(180deg, #2a1212 0%, #150909 100%)`,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          border: `1px solid ${MT.line}`,
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          padding: '14px 22px 22px',
          maxHeight: '92%',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(216,171,104,0.30)' }} />
          </div>

          {/* Portrait + identity */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <ProfileGlyph profiles={m.profiles} size={72} />
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
              <CapsLabel>Подбор для вас</CapsLabel>
              <h1 className="aroma-serif" style={{ fontSize: 24, lineHeight: 1.05, color: MT.text0 }}>{m.name}</h1>
              <SignatureBar profiles={m.profiles} height={4} />
            </div>
          </div>

          <p style={{ fontSize: 13.5, color: MT.text1, lineHeight: 1.55 }}>{m.description}</p>

          {/* Tags trio per taxonomy */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.profiles.map(p => (
              <Chip key={p} color={MPC[p]} active>{MPLBL[p]}</Chip>
            ))}
            {m.flavors.slice(0, 3).map(f => (
              <Chip key={f}>{f}</Chip>
            ))}
          </div>

          {/* Composition */}
          <div style={{ display: 'grid', gap: 10 }}>
            <CapsLabel>Состав микса</CapsLabel>
            <ProportionStack components={m.components} />
            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
              {m.components.map((c, i) => (
                <div key={c.name} style={{
                  display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 10, alignItems: 'center',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 999,
                    background: ['#d8ab68', '#c08a4a', '#a23048'][i % 3],
                  }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="aroma-caps" style={{ color: MT.text2, marginRight: 6 }}>{c.maker}</span>
                    <span style={{ color: MT.text0, fontSize: 13.5 }}>{c.name}</span>
                  </span>
                  <span style={{ color: MT.accentSoft, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{c.share}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingTop: 8, borderTop: `1px solid ${MT.lineSoft}`,
          }}>
            <CapsLabel style={{ flex: '0 0 auto' }}>Ваша оценка</CapsLabel>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {[1,2,3,4,5].map(v => {
                const filled = rating >= v;
                return (
                  <button key={v} onClick={() => setRating(v)} style={{
                    width: 28, height: 28, borderRadius: 999,
                    border: `1px solid ${filled ? MT.primary : MT.lineSoft}`,
                    background: filled ? 'rgba(216,171,104,0.20)' : 'transparent',
                    color: filled ? MT.ember : MT.text2, fontSize: 12,
                  }}>★</button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton style={{ width: 'auto', flex: '0 0 auto', padding: '0 16px' }}>Закрыть</GhostButton>
            <CTA pulse style={{ flex: 1 }}>Покурить</CTA>
          </div>
        </div>
      </ModalBackdrop>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Composition-first card. Full-screen "page" feel.
// Composition takes center stage with proportional donut + legend.
// ───────────────────────────────────────────────────────────
function MixCardComposition() {
  const m = MMIXES[2]; // Шёлковый путь
  const palette = ['#d8ab68', '#c08a4a', '#a23048', '#7a9560'];

  // Donut math
  const R = 56, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = m.components.map((c, i) => {
    const len = (c.share / 100) * C;
    const seg = { color: palette[i % palette.length], dasharray: `${len} ${C - len}`, dashoffset: -acc };
    acc += len;
    return seg;
  });

  return (
    <PhoneShell>
      {/* Mini header — close button + breadcrumb */}
      <div style={{
        padding: '18px 20px 12px',
        borderBottom: `1px solid ${MT.lineSoft}`,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(180deg, rgba(37,14,15,0.92) 0%, rgba(28,11,12,0.62) 100%)',
        backdropFilter: 'blur(18px)',
      }}>
        <button style={{
          width: 36, height: 36, borderRadius: 999,
          border: `1px solid ${MT.line}`,
          background: 'rgba(56,24,22,0.54)',
          color: MT.text1, fontSize: 16,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CapsLabel>Карточка микса</CapsLabel>
          <p style={{ fontSize: 12, color: MT.text1, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>Из подбора</p>
        </div>
        <RatingPill rating={m.rating} count={m.ratingCount} />
      </div>

      <PhoneBody style={{ gap: 18 }}>
        {/* Identity */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <ProfileGlyph profiles={m.profiles} size={64} />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
            <h1 className="aroma-serif" style={{ fontSize: 24, lineHeight: 1.05, color: MT.text0 }}>{m.name}</h1>
            <SignatureBar profiles={m.profiles} height={4} />
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: MT.text1, lineHeight: 1.55 }}>{m.description}</p>

        {/* Donut composition */}
        <div style={{
          background: 'rgba(28,13,13,0.84)',
          border: `1px solid ${MT.lineSoft}`,
          borderRadius: 18,
          padding: 16,
          display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'center',
        }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg viewBox="0 0 140 140" width="140" height="140">
              <circle cx="70" cy="70" r={R} fill="transparent" stroke="rgba(216,171,104,0.10)" strokeWidth="14" />
              {segs.map((s, i) => (
                <circle key={i} cx="70" cy="70" r={R}
                  fill="transparent" stroke={s.color} strokeWidth="14"
                  strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset}
                  transform="rotate(-90 70 70)" strokeLinecap="butt"
                />
              ))}
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="aroma-caps" style={{ color: MT.text2 }}>Состав</span>
              <span className="aroma-serif" style={{ fontSize: 22, color: MT.text0 }}>{m.components.length}</span>
              <span className="aroma-caps" style={{ color: MT.text2 }}>табака</span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {m.components.map((c, i) => (
              <div key={c.name} style={{ display: 'grid', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: palette[i % palette.length] }} />
                  <span style={{ fontSize: 12.5, color: MT.text0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: MT.accentSoft, fontVariantNumeric: 'tabular-nums' }}>{c.share}%</span>
                </div>
                <span className="aroma-caps" style={{ color: MT.text2, paddingLeft: 16 }}>{c.maker}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profiles + flavors */}
        <div style={{ display: 'grid', gap: 10 }}>
          <CapsLabel>Профили и ноты</CapsLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.profiles.map(p => <Chip key={p} color={MPC[p]} active>{MPLBL[p]}</Chip>)}
            {m.flavors.map(f => <Chip key={f}>{f}</Chip>)}
          </div>
        </div>
      </PhoneBody>

      <BottomDock>
        <CTA pulse>Покурить</CTA>
        <button style={{
          background: 'transparent', border: 0, color: MT.text2,
          fontSize: 11, padding: 4, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>Оценить позже</button>
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Compact "карта" with droplet swatches.
// Olfactory portrait as three weighted droplets that overlap.
// Composition as compact rows. Optimised for vertical phones.
// ───────────────────────────────────────────────────────────
function MixCardDroplets() {
  const m = MMIXES[4]; // Янтарный базар
  return (
    <PhoneShell>
      <Topbar right={<CodeChip />} />
      <MixCardBackdrop />
      <ModalBackdrop>
        <div style={{
          background: `
            radial-gradient(circle at 50% 0%, ${MPC[m.profiles[0]]}55 0%, transparent 45%),
            linear-gradient(180deg, #2a1212 0%, #150909 100%)`,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          border: `1px solid ${MT.line}`,
          boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
          padding: '14px 22px 22px',
          maxHeight: '92%',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(216,171,104,0.30)' }} />
          </div>

          {/* Droplet portrait */}
          <div style={{
            height: 132, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {m.profiles.slice(0, 3).map((p, i) => {
              const c = MPC[p] || MT.primary;
              const layout = [
                { left: '38%', top: '6%',  size: 100, opacity: 0.85, blur: 0 },
                { left: '14%', top: '32%', size: 78,  opacity: 0.78, blur: 1 },
                { left: '60%', top: '40%', size: 64,  opacity: 0.72, blur: 1.5 },
              ][i];
              return (
                <span key={p + i} style={{
                  position: 'absolute',
                  left: layout.left, top: layout.top,
                  width: layout.size, height: layout.size,
                  borderRadius: 999,
                  background: `radial-gradient(circle at 30% 25%, ${c}ff 0%, ${c}aa 55%, transparent 100%)`,
                  filter: `blur(${layout.blur}px)`,
                  opacity: layout.opacity,
                  mixBlendMode: 'screen',
                }} />
              );
            })}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <CapsLabel>Из витрины · Янтарный базар</CapsLabel>
            <h1 className="aroma-serif" style={{ fontSize: 26, lineHeight: 1.05, color: MT.text0 }}>{m.name}</h1>
            <p style={{ fontSize: 13.5, color: MT.text1, lineHeight: 1.5 }}>{m.description}</p>
          </div>

          {/* Profile + flavor chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.profiles.map(p => <Chip key={p} color={MPC[p]} active>{MPLBL[p]}</Chip>)}
            {m.flavors.map(f => <Chip key={f}>{f}</Chip>)}
          </div>

          {/* Composition list */}
          <div style={{ display: 'grid', gap: 10 }}>
            <CapsLabel>Состав</CapsLabel>
            <ProportionStack components={m.components} />
            <div style={{ display: 'grid', gap: 4 }}>
              {m.components.map((c, i) => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
                  fontSize: 13, color: MT.text0,
                }}>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                  }}>
                    <span className="aroma-caps" style={{ color: MT.text2, marginRight: 6 }}>{c.maker}</span>
                    {c.name}
                  </span>
                  <span style={{ color: MT.accentSoft, fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>{c.share}%</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton style={{ width: 'auto', flex: '0 0 auto', padding: '0 16px' }}>Закрыть</GhostButton>
            <CTA pulse style={{ flex: 1 }}>Покурить</CTA>
          </div>
        </div>
      </ModalBackdrop>
    </PhoneShell>
  );
}

Object.assign(window, { MixCardHero, MixCardComposition, MixCardDroplets });
