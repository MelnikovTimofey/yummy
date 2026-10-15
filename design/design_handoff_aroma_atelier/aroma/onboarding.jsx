// onboarding.jsx — three onboarding variants for Арома Ателье.
// Fix: scroll-to-CTA pain in current build (screenshot IMG_7261 / IMG_7262).
// All variants keep the CTA persistent and adapt the chip taxonomy
// (profiles vs flavors vs meta) into a single-screen affordance.

const {
  aromaTokens: AT, profileList: PL, flavorList: FL,
  PhoneShell, Topbar, CodeChip, Chip, CapsLabel, CTA, GhostButton,
  SegmentNav, BottomDock, PhoneBody, SignatureBar, profileColor: PC, profileLabel: PLBL,
} = window;

// ───────────────────────────────────────────────────────────
// Variant A — Compact one-screen pill mosaic + persistent footer.
// Profiles up top (lg tier), flavors below as a dense pill mosaic.
// The "Далее" CTA + counter pinned to the bottom dock at all times.
// ───────────────────────────────────────────────────────────
function OnboardingCompact() {
  const [profiles, setProfiles] = React.useState(['citrus', 'fresh']);
  const [flavors, setFlavors]   = React.useState(['лимон', 'мята']);
  const toggle = (set, val) => (id) => set(set === setProfiles
    ? (profiles.includes(id) ? profiles.filter(x => x !== id) : [...profiles, id])
    : (flavors.includes(id)  ? flavors.filter(x => x !== id)  : [...flavors, id]));
  const total = profiles.length + flavors.length;

  return (
    <PhoneShell>
      <Topbar
        right={<CodeChip />}
        navBelow={
          <SegmentNav
            items={[
              { id: 'intro',  label: 'Знакомство' },
              { id: 'prefs',  label: 'Предпочтения' },
            ]}
            value="prefs"
            onChange={() => {}}
          />
        }
      />
      <PhoneBody style={{ gap: 16, paddingBottom: 12 }}>
        <div>
          <CapsLabel>Шаг 2 · Предпочтения</CapsLabel>
          <h2 className="aroma-serif" style={{ fontSize: 26, lineHeight: 1.1, color: AT.text0, marginTop: 6, letterSpacing: '0.005em' }}>
            Что хочется покурить сегодня
          </h2>
          <p style={{ color: AT.text1, fontSize: 13, lineHeight: 1.5, marginTop: 8, maxWidth: '34ch' }}>
            Несколько касаний. Подбор учитывает наличие табаков.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <CapsLabel>Профили вкуса · {profiles.length || 0}</CapsLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PL.map((p) => (
              <Chip
                key={p.id}
                tier="lg"
                color={PC[p.id]}
                active={profiles.includes(p.id)}
                onClick={() => setProfiles(profiles.includes(p.id) ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}
              >{p.label}</Chip>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <CapsLabel>Вкусы · {flavors.length || 0}</CapsLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FL.map((f) => (
              <Chip
                key={f}
                tier="sm"
                active={flavors.includes(f)}
                onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}
              >{f}</Chip>
            ))}
          </div>
        </div>
      </PhoneBody>

      <BottomDock>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 22 }}>
          <CapsLabel style={{ color: AT.text1 }}>Выбрано · {total}</CapsLabel>
          <button style={{
            background: 'transparent', border: 0, color: AT.text2,
            fontSize: 12, padding: 0, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>Пропустить</button>
        </div>
        <CTA pulse={total > 0}>
          Показать подбор {total > 0 ? `· ${total}` : ''}
        </CTA>
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Two-step short flow with persistent footer.
// Step 1 = profiles only (big tap targets, fits one screen).
// Step 2 = flavors. Progress dots in footer + CTA persistent.
// ───────────────────────────────────────────────────────────
function OnboardingSteps() {
  const [step, setStep]         = React.useState(1);
  const [profiles, setProfiles] = React.useState(['citrus', 'fresh']);
  const [flavors, setFlavors]   = React.useState(['лимон']);

  const stepCount = 2;
  const canForward = (step === 1 ? profiles.length : flavors.length) >= 0; // soft requirement

  return (
    <PhoneShell>
      <Topbar
        right={<CodeChip />}
        navBelow={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              style={{
                width: 40, height: 40, borderRadius: 999, flex: '0 0 auto',
                background: 'rgba(56,24,22,0.54)', border: `1px solid ${AT.line}`,
                color: AT.text1, opacity: step > 1 ? 1 : 0.4,
              }}
            >←</button>
            <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(60,28,28,0.6)', overflow: 'hidden' }}>
              <div style={{
                width: `${(step / stepCount) * 100}%`, height: '100%',
                background: 'linear-gradient(90deg, #8c2d24 0%, #d8ab68 100%)',
                transition: 'width 220ms',
              }} />
            </div>
            <CapsLabel style={{ color: AT.text1 }}>{step}/{stepCount}</CapsLabel>
          </div>
        }
      />
      <PhoneBody style={{ gap: 16 }}>
        {step === 1 ? (
          <>
            <div>
              <CapsLabel>Шаг 1 · Профили</CapsLabel>
              <h2 className="aroma-serif" style={{ fontSize: 28, lineHeight: 1.05, color: AT.text0, marginTop: 8 }}>
                С чего начнём?
              </h2>
              <p style={{ color: AT.text1, fontSize: 13, lineHeight: 1.5, marginTop: 10, maxWidth: '32ch' }}>
                Выберите два-три профиля. Это задаёт направление.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {PL.map((p) => {
                const active = profiles.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setProfiles(active ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 12px',
                      border: `1px solid ${active ? AT.primary : AT.line}`,
                      borderRadius: 14,
                      background: active
                        ? 'linear-gradient(180deg, rgba(216,171,104,0.18) 0%, rgba(140,45,36,0.20) 100%)'
                        : 'rgba(30,14,14,0.66)',
                      color: active ? AT.accentSoft : AT.text0,
                      textAlign: 'left',
                      minHeight: 52,
                      boxShadow: active ? 'inset 0 1px 0 rgba(255,244,236,0.08)' : 'none',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: 999,
                      background: PC[p.id] || AT.primary,
                      boxShadow: active ? `0 0 0 4px ${PC[p.id] || AT.primary}22` : 'none',
                      flex: '0 0 auto',
                    }} />
                    <span style={{ fontSize: 13, lineHeight: 1.2 }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div>
              <CapsLabel>Шаг 2 · Вкусы</CapsLabel>
              <h2 className="aroma-serif" style={{ fontSize: 28, lineHeight: 1.05, color: AT.text0, marginTop: 8 }}>
                Любимые ноты
              </h2>
              <p style={{ color: AT.text1, fontSize: 13, lineHeight: 1.5, marginTop: 10, maxWidth: '32ch' }}>
                Опционально — но так подбор станет точнее.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {FL.map((f) => (
                <Chip
                  key={f}
                  active={flavors.includes(f)}
                  onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}
                >{f}</Chip>
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              <CapsLabel>Сейчас выбрано</CapsLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, minHeight: 28 }}>
                {profiles.map(p => (
                  <span key={p} style={{
                    fontSize: 11, color: AT.text1,
                    border: `1px solid ${AT.lineSoft}`, borderRadius: 999, padding: '4px 9px',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: PC[p] }} />
                    {PLBL[p]}
                  </span>
                ))}
                {!profiles.length && <span style={{ color: AT.text2, fontSize: 12 }}>—</span>}
              </div>
            </div>
          </>
        )}
      </PhoneBody>

      <BottomDock>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <span key={i} style={{
              width: i + 1 === step ? 18 : 6, height: 6, borderRadius: 999,
              background: i + 1 === step ? AT.primary : 'rgba(216,171,104,0.30)',
              transition: 'width 220ms',
            }} />
          ))}
        </div>
        <CTA
          pulse={step === stepCount}
          onClick={() => step < stepCount ? setStep(step + 1) : null}
        >
          {step < stepCount ? 'Далее' : `Показать подбор · ${profiles.length + flavors.length}`}
        </CTA>
        {step === stepCount && (
          <button style={{
            background: 'transparent', border: 0, color: AT.text2,
            fontSize: 11, padding: 4, letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>Открыть каталог сразу</button>
        )}
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — "Палитра" composer.
// Tap chips → they float up to a palette zone at top, showing
// the signature stripe being assembled. CTA in palette zone.
// Heavy visual identity. Always visible CTA via top fixed palette.
// ───────────────────────────────────────────────────────────
function OnboardingPalette() {
  const [profiles, setProfiles] = React.useState(['berry', 'sweet']);
  const [flavors, setFlavors]   = React.useState(['виноград', 'мёд']);
  const [tab, setTab]           = React.useState('profiles');

  return (
    <PhoneShell>
      <Topbar
        right={<CodeChip />}
        navBelow={
          <SegmentNav
            items={[
              { id: 'profiles', label: `Профили · ${profiles.length}` },
              { id: 'flavors',  label: `Вкусы · ${flavors.length}` },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {/* Palette zone — always visible, "what we're cooking" */}
      <div style={{
        padding: '14px 20px 14px',
        background: 'linear-gradient(180deg, rgba(53,23,23,0.45) 0%, rgba(20,10,10,0) 100%)',
        borderBottom: `1px solid ${AT.lineSoft}`,
        display: 'grid', gap: 10,
      }}>
        <CapsLabel style={{ color: AT.text1 }}>Ваша палитра</CapsLabel>
        <SignatureBar profiles={profiles} height={10} radius={999} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 26 }}>
          {profiles.length === 0 && flavors.length === 0 && (
            <span style={{ fontSize: 12, color: AT.text2 }}>Нажмите профили и вкусы внизу — соберём подбор.</span>
          )}
          {profiles.map(p => (
            <span key={p} style={{
              fontSize: 11, color: AT.accentSoft, borderRadius: 999,
              border: `1px solid rgba(242,213,165,0.20)`, background: 'rgba(81,33,21,0.6)',
              padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: PC[p] }} />
              {PLBL[p]}
            </span>
          ))}
          {flavors.map(f => (
            <span key={f} style={{
              fontSize: 11, color: AT.text1, borderRadius: 999,
              border: `1px solid ${AT.lineSoft}`, padding: '4px 9px',
            }}>{f}</span>
          ))}
        </div>
      </div>

      <PhoneBody style={{ gap: 12, paddingTop: 14 }}>
        {tab === 'profiles' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {PL.map((p) => (
              <Chip
                key={p.id}
                tier="lg"
                color={PC[p.id]}
                active={profiles.includes(p.id)}
                onClick={() => setProfiles(profiles.includes(p.id) ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}
              >{p.label}</Chip>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FL.map((f) => (
              <Chip
                key={f}
                active={flavors.includes(f)}
                onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}
              >{f}</Chip>
            ))}
          </div>
        )}
      </PhoneBody>

      <BottomDock>
        <CTA pulse={(profiles.length + flavors.length) > 0}>
          Показать подбор · {profiles.length + flavors.length}
        </CTA>
      </BottomDock>
    </PhoneShell>
  );
}

Object.assign(window, { OnboardingCompact, OnboardingSteps, OnboardingPalette });
