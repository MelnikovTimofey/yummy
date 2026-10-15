// intro.jsx — Знакомство variants.
// PRD §8.3: "горизонтальные карточки-шаги, без скролла страницы".
// Three rhythms: full-bleed swipe, vertical manifesto, single-screen ritual.

const {
  aromaTokens: INT,
  PhoneShell, Topbar, CodeChip, SegmentNav,
  PhoneBody, BottomDock, CapsLabel, CTA, GhostButton,
} = window;

const introSteps = [
  {
    n: '01',
    title: 'Расскажите, что хочется',
    body: 'Несколько касаний по профилям и нотам. Подбор соберём под ваше настроение.',
  },
  {
    n: '02',
    title: 'Покажите карточку мастеру',
    body: 'Тапните «Покурить» — мастер увидит состав и пропорции на экране.',
  },
  {
    n: '03',
    title: 'Оцените, если зашло',
    body: 'Оценка помогает другим гостям. Никакой регистрации не нужно.',
  },
  {
    n: '04',
    title: 'Только то, что в наличии',
    body: 'Рекомендации учитывают табаки на кухне сегодня — пустых попыток не будет.',
  },
];

// ───────────────────────────────────────────────────────────
// Variant A — Full-bleed swipe with persistent footer.
// Каждый шаг — отдельная страница. Свайп / тап. CTA закреплён.
// ───────────────────────────────────────────────────────────
function IntroSwipe() {
  const [step, setStep] = React.useState(0);
  const cur = introSteps[step];
  const last = step === introSteps.length - 1;
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
            value="intro"
            onChange={() => {}}
          />
        }
      />
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        padding: '20px 24px 0',
        position: 'relative',
      }}>
        {/* Step number watermark */}
        <span className="aroma-serif" style={{
          position: 'absolute', top: 14, right: 22,
          fontSize: 96, color: 'rgba(216,171,104,0.06)',
          lineHeight: 1, letterSpacing: '0.02em',
        }}>{cur.n}</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          <CapsLabel>Шаг {cur.n} · из 0{introSteps.length}</CapsLabel>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
          <h1 className="aroma-serif" style={{
            fontSize: 34, lineHeight: 1.02, color: INT.text0, letterSpacing: '0.005em',
            textWrap: 'pretty',
          }}>
            {cur.title}
          </h1>
          <p style={{
            color: INT.text1, fontSize: 15, lineHeight: 1.5, maxWidth: '30ch',
          }}>{cur.body}</p>
        </div>
      </div>

      <BottomDock>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {introSteps.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 22 : 6, height: 6, borderRadius: 999,
              background: i === step ? INT.primary : 'rgba(216,171,104,0.30)',
              transition: 'width 220ms',
            }} />
          ))}
        </div>
        <CTA pulse={last} onClick={() => setStep(last ? step : step + 1)}>
          {last ? 'Перейти к подбору' : 'Дальше'}
        </CTA>
        {!last && (
          <button onClick={() => setStep(introSteps.length - 1)} style={{
            background: 'transparent', border: 0, color: INT.text2,
            fontSize: 11, padding: 4, letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>Пропустить знакомство</button>
        )}
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Vertical numbered manifesto. One screen, four
// steps, big serif numbers. Sticky CTA. Хорошо читается сразу.
// ───────────────────────────────────────────────────────────
function IntroManifesto() {
  return (
    <PhoneShell>
      <Topbar right={<CodeChip />} />
      <PhoneBody style={{ gap: 20, paddingTop: 22 }}>
        <div>
          <CapsLabel>Знакомство</CapsLabel>
          <h1 className="aroma-serif" style={{
            fontSize: 30, lineHeight: 1.05, color: INT.text0, marginTop: 8, letterSpacing: '0.005em',
          }}>
            Как устроено<br/>ателье
          </h1>
        </div>

        <ol style={{ display: 'grid', gap: 14, listStyle: 'none', padding: 0, margin: 0 }}>
          {introSteps.map(step => (
            <li key={step.n} style={{
              display: 'grid', gridTemplateColumns: '46px 1fr', gap: 14,
              padding: '14px 16px 16px 6px',
              borderBottom: `1px solid ${INT.lineSoft}`,
            }}>
              <span className="aroma-serif" style={{
                fontSize: 32, lineHeight: 1, color: INT.primary,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
              }}>{step.n}</span>
              <div style={{ display: 'grid', gap: 6 }}>
                <h3 className="aroma-serif" style={{ fontSize: 17, color: INT.text0, lineHeight: 1.15 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 12.5, color: INT.text1, lineHeight: 1.5 }}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </PhoneBody>
      <BottomDock>
        <CTA pulse>Собрать подбор</CTA>
      </BottomDock>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Ritual. Single screen, single paragraph in display
// serif, halo behind. Most premium-quiet, lowest density.
// ───────────────────────────────────────────────────────────
function IntroRitual() {
  return (
    <PhoneShell>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 25% 18%, rgba(238,157,69,0.16) 0%, transparent 38%),
          radial-gradient(circle at 80% 80%, rgba(140,45,36,0.32) 0%, transparent 42%)`,
      }} />
      <Topbar right={<CodeChip />} />
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '32px 28px 0',
        position: 'relative', zIndex: 1,
      }}>
        <CapsLabel>Знакомство</CapsLabel>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, paddingBottom: 20 }}>
          <h1 className="aroma-serif" style={{
            fontSize: 30, lineHeight: 1.15, color: INT.text0,
            letterSpacing: '0.005em', maxWidth: '14ch',
            textWrap: 'pretty',
          }}>
            Скажите, что любите —<br/>
            <span style={{ color: INT.accentSoft }}>соберём ритуал</span> вечера.
          </h1>
          <p style={{
            color: INT.text1, fontSize: 14, lineHeight: 1.65, maxWidth: '32ch',
          }}>
            Несколько касаний — и подбор готов. Покажите карточку мастеру, он соберёт микс. Никаких аккаунтов, никаких лишних шагов.
          </p>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            paddingTop: 12, borderTop: `1px solid ${INT.lineSoft}`,
          }}>
            {[
              ['Профили', 'Цитрус, ягоды, пряности — задайте направление.'],
              ['Состав', 'Карточка покажет табаки и пропорции.'],
              ['Наличие', 'Только то, что есть на кухне сегодня.'],
            ].map(([label, body]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 12 }}>
                <span className="aroma-caps" style={{ color: INT.text1, paddingTop: 2 }}>{label}</span>
                <span style={{ fontSize: 13, color: INT.text0, lineHeight: 1.45 }}>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomDock>
        <CTA pulse>Начать</CTA>
        <button style={{
          background: 'transparent', border: 0, color: INT.text2,
          fontSize: 11, padding: 4, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>Открыть каталог сразу</button>
      </BottomDock>
    </PhoneShell>
  );
}

Object.assign(window, { IntroSwipe, IntroManifesto, IntroRitual });
