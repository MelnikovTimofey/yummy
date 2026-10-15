// auth.jsx — age-gate (18+) + daily code variants.
// PRD §3.1 / §8.1 / §8.2: age-gate is a mandatory modal lock before
// anything else; then ежедневный код from staff. No accounts.

const {
  aromaTokens: AUT,
  PhoneShell, CapsLabel, CTA, GhostButton,
} = window;

// Reusable ambient halo backdrop — phone-shell already has it but
// auth screens want it stronger, so we overlay an extra layer.
function AuthHalo() {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 50% 12%, rgba(140,45,36,0.6) 0%, transparent 38%),
          radial-gradient(circle at 12% 90%, rgba(238,157,69,0.22) 0%, transparent 40%),
          radial-gradient(circle at 90% 86%, rgba(140,45,36,0.18) 0%, transparent 38%)`,
        opacity: 0.92,
      }} />
    </>
  );
}

// Small "n" emblem — uses brand gradient #7a1e1a → #541311 from styles.css
function NomadEmblem({ size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 18,
      border: `1px solid rgba(242,213,165,0.22)`,
      background: 'linear-gradient(180deg, #7a1e1a 0%, #541311 100%)',
      color: '#fff8f4',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: AUT.fontDisplay, fontWeight: 500, fontSize: size * 0.7, lineHeight: 1,
      textTransform: 'lowercase',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 14px 30px rgba(72,14,12,0.4)',
    }}>n</div>
  );
}

// ───────────────────────────────────────────────────────────
// Variant A — Сombined card. Age + code on one screen.
// Один уверенный auth-card, halo по углам. Минимум переходов.
// ───────────────────────────────────────────────────────────
function AuthCombined() {
  const [age, setAge] = React.useState(false);
  const [code, setCode] = React.useState('');
  const canSubmit = age && code.length >= 4;

  return (
    <PhoneShell>
      <AuthHalo />
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '0 24px',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 }}>
            <NomadEmblem />
            <div>
              <CapsLabel>Арома Ателье</CapsLabel>
              <h1 className="aroma-serif" style={{
                fontSize: 32, lineHeight: 1.05, color: AUT.text0, marginTop: 6, letterSpacing: '0.005em',
              }}>
                Гостевой вход
              </h1>
              <p style={{ color: AUT.text1, fontSize: 13.5, lineHeight: 1.5, marginTop: 10, maxWidth: '30ch' }}>
                Подтвердите возраст и введите код мастера — он действует только сегодня.
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid', gap: 14,
            padding: 18,
            borderRadius: 22,
            background: 'linear-gradient(180deg, rgba(46,18,18,0.94) 0%, rgba(22,11,12,0.94) 100%)',
            border: `1px solid ${AUT.line}`,
            boxShadow: 'inset 0 1px 0 rgba(255,244,236,0.06), 0 24px 50px rgba(0,0,0,0.35)',
          }}>
            {/* Age toggle row */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', userSelect: 'none',
            }}>
              <span
                onClick={() => setAge(!age)}
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `1px solid ${age ? AUT.primary : AUT.line}`,
                  background: age ? 'linear-gradient(180deg, #6c1e1b 0%, #4f1613 100%)' : 'rgba(40,18,18,0.6)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: age ? `0 0 0 3px rgba(216,171,104,0.18)` : 'none',
                  flex: '0 0 auto',
                }}
              >
                {age && <span style={{ color: AUT.accentSoft, fontSize: 14, lineHeight: 1 }}>✓</span>}
              </span>
              <span style={{ fontSize: 14, color: AUT.text0, lineHeight: 1.3 }}>
                Мне есть 18 лет. Понимаю, что курение вредит здоровью.
              </span>
            </label>

            <div style={{ display: 'grid', gap: 8 }}>
              <CapsLabel>Ежедневный код</CapsLabel>
              <input
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="••••"
                style={{
                  width: '100%', height: 52, borderRadius: 14,
                  border: `1px solid ${AUT.line}`,
                  background: 'rgba(40,18,18,0.66)',
                  padding: '0 18px',
                  color: AUT.text0,
                  fontFamily: AUT.fontDisplay,
                  fontSize: 24, letterSpacing: '0.32em', textAlign: 'center',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
              <p style={{ color: AUT.text2, fontSize: 11.5, lineHeight: 1.4 }}>
                Спросите код у мастера зала. Действует до 06:00.
              </p>
            </div>

            <CTA disabled={!canSubmit} pulse={canSubmit}>Войти</CTA>
          </div>
        </div>

        <p style={{
          color: AUT.text2, fontSize: 11, lineHeight: 1.4, textAlign: 'center',
          margin: '0 0 22px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          18+ · Курение вредит вашему здоровью
        </p>
      </div>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Two steps. First age-gate as a fullscreen choice;
// after confirmation, code entry slides in. Calmer rhythm.
// ───────────────────────────────────────────────────────────
function AuthSteps() {
  const [step, setStep]   = React.useState('age'); // 'age' | 'code'
  const [code, setCode]   = React.useState('');

  if (step === 'age') {
    return (
      <PhoneShell>
        <AuthHalo />
        <div style={{
          position: 'relative', zIndex: 1, flex: 1,
          display: 'flex', flexDirection: 'column', padding: '0 28px',
          justifyContent: 'space-between',
        }}>
          <div style={{ height: 64 }} />
          <div style={{ display: 'grid', gap: 22 }}>
            <NomadEmblem size={64} />
            <div>
              <CapsLabel>Только 18+</CapsLabel>
              <h1 className="aroma-serif" style={{
                fontSize: 38, lineHeight: 1.0, color: AUT.text0, marginTop: 12,
                letterSpacing: '0.005em',
              }}>
                Прежде<br/>чем войти
              </h1>
              <p style={{ color: AUT.text1, fontSize: 14, lineHeight: 1.55, marginTop: 14, maxWidth: '32ch' }}>
                Это пространство только для взрослых гостей.
                Курение вредит здоровью — ритуал должен быть осознанным.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, paddingBottom: 28 }}>
            <CTA pulse onClick={() => setStep('code')}>Мне есть 18</CTA>
            <button style={{
              background: 'transparent', border: 0, color: AUT.text2,
              fontSize: 12, padding: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>Покинуть страницу</button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  // step === 'code'
  return (
    <PhoneShell>
      <AuthHalo />
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column', padding: '0 28px',
        justifyContent: 'center', gap: 24,
      }}>
        <button onClick={() => setStep('age')} style={{
          alignSelf: 'flex-start',
          background: 'transparent', border: 0, color: AUT.text2,
          fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase',
          padding: 0,
        }}>← Назад</button>

        <div>
          <CapsLabel>Шаг 2 · Код</CapsLabel>
          <h1 className="aroma-serif" style={{
            fontSize: 30, lineHeight: 1.05, color: AUT.text0, marginTop: 8,
          }}>
            Введите код<br/>от мастера
          </h1>
          <p style={{ color: AUT.text1, fontSize: 13.5, lineHeight: 1.5, marginTop: 10, maxWidth: '32ch' }}>
            Четыре символа. Они меняются каждый день.
          </p>
        </div>

        {/* Slot-style input */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[0,1,2,3].map(i => {
            const v = code[i] || '';
            return (
              <div key={i} style={{
                aspectRatio: '1 / 1.1',
                borderRadius: 16,
                border: `1px solid ${v ? AUT.primary : AUT.line}`,
                background: v
                  ? 'linear-gradient(180deg, rgba(216,171,104,0.16) 0%, rgba(140,45,36,0.20) 100%)'
                  : 'rgba(40,18,18,0.66)',
                color: v ? AUT.accentSoft : AUT.text2,
                fontFamily: AUT.fontDisplay,
                fontSize: 36, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: v ? 'inset 0 1px 0 rgba(255,244,236,0.08)' : 'none',
                position: 'relative',
              }}>
                {v || (i === code.length ? <span style={{
                  width: 2, height: 28, background: AUT.primary, opacity: 0.7,
                }} /> : '')}
              </div>
            );
          })}
        </div>

        <CTA disabled={code.length < 4} pulse={code.length >= 4}>Войти</CTA>

        {/* Tiny numeric pad — visual only for the prototype */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button key={i}
              onClick={() => {
                if (k === '⌫') setCode(code.slice(0, -1));
                else if (k && code.length < 4) setCode(code + k);
              }}
              style={{
                visibility: k === '' ? 'hidden' : 'visible',
                minHeight: 44, borderRadius: 12,
                border: `1px solid ${AUT.lineSoft}`,
                background: 'rgba(28,13,13,0.66)',
                color: AUT.text0,
                fontFamily: AUT.fontDisplay,
                fontSize: 20, lineHeight: 1,
              }}>{k}</button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Minimal envelope. Age check inline; code is a single
// large stamped field, no big card. Most "premium-quiet".
// ───────────────────────────────────────────────────────────
function AuthMinimal() {
  const [age, setAge] = React.useState(true);
  const [code, setCode] = React.useState('NMD7');

  return (
    <PhoneShell>
      <AuthHalo />
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column',
        padding: '70px 28px 28px',
        gap: 36,
      }}>
        <div>
          <span className="aroma-serif" style={{
            fontSize: 44, lineHeight: 0.92, color: AUT.text0,
            letterSpacing: '0.01em', textTransform: 'lowercase',
          }}>nomad</span>
          <p className="aroma-caps" style={{ marginTop: 12, color: AUT.text1 }}>
            Арома Ателье · Лаундж
          </p>
        </div>

        <div style={{ display: 'grid', gap: 24, marginTop: 'auto' }}>
          <div>
            <CapsLabel>Код мастера</CapsLabel>
            <input
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                borderBottom: `1px solid ${AUT.line}`,
                padding: '12px 0',
                color: AUT.text0,
                fontFamily: AUT.fontDisplay,
                fontSize: 40,
                letterSpacing: '0.32em',
                textAlign: 'center',
                textTransform: 'uppercase',
                outline: 'none',
                marginTop: 8,
              }}
            />
            <p style={{ color: AUT.text2, fontSize: 11.5, marginTop: 10, textAlign: 'center' }}>
              Спросите у мастера зала — действует до 06:00.
            </p>
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', userSelect: 'none',
          }}>
            <span
              onClick={() => setAge(!age)}
              style={{
                width: 20, height: 20, borderRadius: 999,
                border: `1px solid ${age ? AUT.primary : AUT.line}`,
                background: age ? AUT.primary : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              {age && <span style={{ color: '#23120d', fontSize: 12, lineHeight: 1, fontWeight: 700 }}>✓</span>}
            </span>
            <span style={{ fontSize: 13, color: AUT.text1, lineHeight: 1.3 }}>
              Мне есть 18. Понимаю, что курение вредит здоровью.
            </span>
          </label>

          <CTA disabled={!age || code.length < 4} pulse={age && code.length >= 4}>Войти в Ателье</CTA>
        </div>

        <p style={{
          color: AUT.text2, fontSize: 10.5, lineHeight: 1.4, textAlign: 'center',
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>18+ · Курение вредит здоровью</p>
      </div>
    </PhoneShell>
  );
}

Object.assign(window, { AuthCombined, AuthSteps, AuthMinimal });
