// extras.jsx — Smoke confirmation card (after "Покурить") + Rail view.
// Smoke confirmation: PRD §8.7 — "После нажатия Покурить открывается
// чистая карточка-подтверждение, удобная для показа кальянному мастеру".
// Rail view: PRD §8 — раскрытый рельс из категории.

const {
  aromaTokens: ET, mixes: EMIXES, profileColor: EPC, profileLabel: EPLBL,
  PhoneShell, Topbar, CodeChip, PhoneBody, BottomDock, CapsLabel,
  SignatureBar, ProfileGlyph, RatingPill, Chip, CTA, GhostButton, SegmentNav,
} = window;

// ───────────────────────────────────────────────────────────
// Smoke confirmation A — Премиум-карточка. Большое имя, портрет,
// состав, инструкция мастеру. Идея: гость держит телефон, мастер
// читает с дистанции 60 см.
// ───────────────────────────────────────────────────────────
function SmokeCardPremium() {
  const m = EMIXES[0];
  return (
    <PhoneShell>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 50% -10%, ${EPC[m.profiles[0]]}30 0%, transparent 50%),
          radial-gradient(circle at 50% 105%, rgba(238,157,69,0.18) 0%, transparent 45%)`,
      }} />
      <Topbar right={<button style={{
        background: 'transparent', border: 0, color: ET.text1,
        fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>Готово</button>} />

      <PhoneBody style={{
        gap: 24, justifyContent: 'center', padding: '32px 24px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'grid', gap: 8, textAlign: 'center', justifyItems: 'center' }}>
          <CapsLabel style={{ color: ET.primary }}>Покажите мастеру</CapsLabel>
          <div style={{ marginTop: 4 }}>
            <ProfileGlyph profiles={m.profiles} size={96} />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
          <h1 className="aroma-serif" style={{ fontSize: 34, lineHeight: 1.0, color: ET.text0, letterSpacing: '0.005em' }}>
            {m.name}
          </h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {m.profiles.map(p => (
              <span key={p} className="aroma-caps" style={{ color: ET.text1, letterSpacing: '0.12em' }}>
                {EPLBL[p]}
              </span>
            )).reduce((acc, el, i, arr) => {
              acc.push(el);
              if (i < arr.length - 1) acc.push(<span key={`s${i}`} style={{ color: ET.text2 }}>·</span>);
              return acc;
            }, [])}
          </div>
          <SignatureBar profiles={m.profiles} height={3} />
        </div>

        <div style={{
          padding: '18px 18px',
          borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(40,17,17,0.92) 0%, rgba(22,11,12,0.92) 100%)',
          border: `1px solid ${ET.line}`,
          boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.06)',
          display: 'grid', gap: 12,
        }}>
          <CapsLabel>Состав</CapsLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            {m.components.map((c, i) => (
              <div key={c.name} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'baseline',
              }}>
                <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 15, color: ET.text0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span className="aroma-caps" style={{ color: ET.text2 }}>{c.maker}</span>
                </div>
                <span style={{
                  color: ET.accentSoft, fontFamily: ET.fontDisplay, fontSize: 22,
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>{c.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </PhoneBody>

      <BottomDock>
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(81,33,21,0.5)',
          border: `1px solid ${ET.lineSoft}`,
          textAlign: 'center',
        }}>
          <span className="aroma-caps" style={{ color: ET.text1 }}>
            Стол 7 · 21:42 · Код {`NMD7`}
          </span>
        </div>
        <GhostButton>Оценить, когда соберут</GhostButton>
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Smoke confirmation B — Ticket-style.
// Looks like a printed lounge ticket with perforated edge.
// ───────────────────────────────────────────────────────────
function SmokeCardTicket() {
  const m = EMIXES[4];
  return (
    <PhoneShell>
      <Topbar right={<button style={{
        background: 'transparent', border: 0, color: ET.text1,
        fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>Готово</button>} />
      <PhoneBody style={{ justifyContent: 'center', padding: '24px 22px', alignContent: 'center', gap: 16 }}>
        <CapsLabel style={{ color: ET.primary, textAlign: 'center' }}>Покажите карточку мастеру</CapsLabel>

        {/* Ticket with notched sides */}
        <div style={{ position: 'relative' }}>
          {/* Top notches */}
          <span style={{
            position: 'absolute', left: -8, top: '64%', width: 16, height: 16, borderRadius: 999,
            background: '#130807', border: `1px solid ${ET.lineSoft}`,
          }} />
          <span style={{
            position: 'absolute', right: -8, top: '64%', width: 16, height: 16, borderRadius: 999,
            background: '#130807', border: `1px solid ${ET.lineSoft}`,
          }} />

          <div style={{
            padding: '22px 22px 20px',
            borderRadius: 22,
            background: 'linear-gradient(180deg, rgba(48,20,20,0.96) 0%, rgba(22,11,12,0.96) 100%)',
            border: `1px solid ${ET.line}`,
            boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.06), 0 28px 60px rgba(0,0,0,0.45)',
            display: 'grid', gap: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="aroma-serif" style={{
                fontSize: 22, color: ET.text0, lineHeight: 1, letterSpacing: '0.01em', textTransform: 'lowercase',
              }}>nomad</span>
              <span className="aroma-caps" style={{ color: ET.text1 }}>Лаундж · Ателье</span>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <CapsLabel>Микс</CapsLabel>
              <h1 className="aroma-serif" style={{ fontSize: 32, lineHeight: 1.0, color: ET.text0 }}>{m.name}</h1>
              <SignatureBar profiles={m.profiles} height={4} />
            </div>

            {/* Perforation line */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              margin: '4px 0',
            }}>
              <span style={{ flex: 1, borderTop: `1px dashed ${ET.line}` }} />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {m.components.map(c => (
                <div key={c.name} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'baseline',
                }}>
                  <span style={{ fontSize: 14, color: ET.text0 }}>
                    <span className="aroma-caps" style={{ color: ET.text2, marginRight: 6 }}>{c.maker}</span>
                    {c.name}
                  </span>
                  <span style={{ color: ET.accentSoft, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontFamily: ET.fontDisplay }}>
                    {c.share}%
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              paddingTop: 10, borderTop: `1px dashed ${ET.line}`,
            }}>
              <div style={{ display: 'grid', gap: 2 }}>
                <CapsLabel>Стол</CapsLabel>
                <span className="aroma-serif" style={{ fontSize: 18, color: ET.text0 }}>07</span>
              </div>
              <div style={{ display: 'grid', gap: 2, textAlign: 'center' }}>
                <CapsLabel>Время</CapsLabel>
                <span className="aroma-serif" style={{ fontSize: 18, color: ET.text0 }}>21:42</span>
              </div>
              <div style={{ display: 'grid', gap: 2, textAlign: 'right' }}>
                <CapsLabel>Код</CapsLabel>
                <span className="aroma-serif" style={{ fontSize: 18, color: ET.primary, letterSpacing: '0.08em' }}>NMD7</span>
              </div>
            </div>
          </div>
        </div>
      </PhoneBody>

      <BottomDock>
        <GhostButton>К подбору</GhostButton>
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Rail view — раскрытый рельс из категории. Sticky header,
// сетка миксов, мини-инфо рельса. Похоже на витрину, но фокус
// на одной категории.
// ───────────────────────────────────────────────────────────
function RailView() {
  const railMixes = EMIXES.slice(0, 6);
  return (
    <PhoneShell>
      {/* Compact rail topbar */}
      <div style={{
        flex: '0 0 auto',
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${ET.lineSoft}`,
        background: 'linear-gradient(180deg, rgba(37,14,15,0.92) 0%, rgba(28,11,12,0.62) 100%)',
        backdropFilter: 'blur(18px)',
        display: 'grid', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{
            width: 36, height: 36, borderRadius: 999,
            border: `1px solid ${ET.line}`,
            background: 'rgba(56,24,22,0.54)',
            color: ET.text1, fontSize: 16,
          }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CapsLabel>Витрина · Мастера</CapsLabel>
            <p style={{ fontSize: 12, color: ET.text2, marginTop: 2 }}>{railMixes.length} миксов</p>
          </div>
          <CodeChip />
        </div>
        <h2 className="aroma-serif" style={{ fontSize: 26, lineHeight: 1.05, color: ET.text0, letterSpacing: '0.005em' }}>
          От наших мастеров
        </h2>
        <p style={{ fontSize: 12.5, color: ET.text1, lineHeight: 1.4, maxWidth: '38ch' }}>
          Кураторская подборка зала на сегодняшний вечер.
        </p>
      </div>

      <PhoneBody style={{ gap: 8, paddingTop: 12 }}>
        {/* Quick filter row */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 4 }}>
          {['Все', 'Цитрус', 'Десерт', 'Пряные', 'Ягоды'].map((t, i) => (
            <Chip key={t} active={i === 0} style={{ flex: '0 0 auto' }}>{t}</Chip>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {railMixes.map(m => (
            <article key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: 12,
              borderRadius: 16,
              background: 'rgba(28,13,13,0.84)',
              border: `1px solid ${ET.lineSoft}`,
            }}>
              <ProfileGlyph profiles={m.profiles} size={52} />
              <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                <h3 className="aroma-serif" style={{ fontSize: 15.5, color: ET.text0, lineHeight: 1.1 }}>{m.name}</h3>
                <SignatureBar profiles={m.profiles} height={3} />
                <p style={{ fontSize: 11.5, color: ET.text1, lineHeight: 1.2,
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

Object.assign(window, { SmokeCardPremium, SmokeCardTicket, RailView });
