// catalog.jsx — three catalog filtering variants.
// Fix: current screen (IMG_7265) buries the results under stacked
// filter sections + sort + "any profile"/"any flavor" placeholders.
// Each variant pulls filters off the main column.

const {
  aromaTokens: ACT, mixes: ACMIXES, profileList: ACPL, flavorList: ACFL,
  profileColor: ACPC, profileLabel: ACPLBL,
  PhoneShell, Topbar, CodeChip, SegmentNav, BottomDock, PhoneBody, CapsLabel,
  Chip, GhostButton, CTA, SignatureBar, ProfileGlyph, RatingPill,
} = window;

function CatHeader() {
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
          value="catalog"
          onChange={() => {}}
        />
      }
    />
  );
}

// Small reusable: result row for catalog
function CatalogResultRow({ mix }) {
  return (
    <article style={{
      display: 'grid',
      gridTemplateColumns: '52px 1fr auto',
      alignItems: 'center', gap: 10,
      padding: 10,
      borderRadius: 14,
      background: 'rgba(28,13,13,0.86)',
      border: `1px solid ${ACT.lineSoft}`,
    }}>
      <ProfileGlyph profiles={mix.profiles} size={44} />
      <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
        <h3 className="aroma-serif" style={{ fontSize: 14.5, color: ACT.text0, lineHeight: 1.1 }}>{mix.name}</h3>
        <p style={{ fontSize: 11, color: ACT.text1, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mix.flavors.join(' · ')}
        </p>
      </div>
      <RatingPill rating={mix.rating} />
    </article>
  );
}

// ───────────────────────────────────────────────────────────
// Variant A — Sticky chip rail + bottom-sheet "Фильтры"
// ───────────────────────────────────────────────────────────
function CatalogSheet() {
  const [sheetOpen, setSheetOpen]     = React.useState(false);
  const [query, setQuery]             = React.useState('');
  const [profiles, setProfiles]       = React.useState(['citrus']);
  const [flavors, setFlavors]         = React.useState(['лимон']);
  const [sort, setSort]               = React.useState('popularity');

  const active = profiles.length + flavors.length;

  return (
    <PhoneShell>
      <CatHeader />

      {/* Persistent control rail */}
      <div style={{
        padding: '12px 20px 10px',
        borderBottom: `1px solid ${ACT.lineSoft}`,
        background: 'linear-gradient(180deg, rgba(37,14,15,0.78) 0%, rgba(20,10,10,0.55) 100%)',
        display: 'grid', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию"
            style={{
              flex: 1, height: 40, borderRadius: 999,
              border: `1px solid ${ACT.line}`,
              background: 'rgba(40,18,18,0.66)',
              padding: '0 14px',
              color: ACT.text0, fontSize: 13,
              outline: 'none',
            }}
          />
          <button onClick={() => setSheetOpen(true)} style={{
            height: 40, borderRadius: 999,
            border: `1px solid ${ACT.line}`,
            background: active ? 'linear-gradient(180deg, rgba(216,171,104,0.20) 0%, rgba(140,45,36,0.22) 100%)' : 'rgba(40,18,18,0.66)',
            color: active ? ACT.accentSoft : ACT.text1,
            padding: '0 14px',
            fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Фильтры {active > 0 && <span style={{
              width: 18, height: 18, borderRadius: 999,
              background: ACT.primary, color: '#23120d',
              fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
            }}>{active}</span>}
          </button>
        </div>

        {(profiles.length + flavors.length) > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {profiles.map(p => (
              <Chip key={p} active color={ACPC[p]} onClick={() => setProfiles(profiles.filter(x => x !== p))}>
                {ACPLBL[p]} ✕
              </Chip>
            ))}
            {flavors.map(f => (
              <Chip key={f} active onClick={() => setFlavors(flavors.filter(x => x !== f))}>
                {f} ✕
              </Chip>
            ))}
          </div>
        )}
      </div>

      <PhoneBody style={{ gap: 8, paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <CapsLabel>Найдено · {ACMIXES.length}</CapsLabel>
          <button style={{
            background: 'transparent', border: 0, color: ACT.text1,
            fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
            display: 'inline-flex', gap: 6, alignItems: 'center',
          }}>
            По популярности <span style={{ color: ACT.text2 }}>⌄</span>
          </button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {ACMIXES.map(m => <CatalogResultRow key={m.id} mix={m} />)}
        </div>
      </PhoneBody>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: 'rgba(8,4,4,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }} onClick={() => setSheetOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: `
              radial-gradient(circle at 50% -20%, rgba(122,28,25,0.45), transparent 50%),
              linear-gradient(180deg, #1d0a0a 0%, #130807 100%)`,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            border: `1px solid ${ACT.line}`,
            padding: '14px 20px 22px',
            maxHeight: '78%',
            display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(216,171,104,0.30)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 className="aroma-serif" style={{ fontSize: 20, color: ACT.text0 }}>Фильтры</h3>
              <button onClick={() => { setProfiles([]); setFlavors([]); }} style={{
                background: 'transparent', border: 0, color: ACT.text1,
                fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>Сбросить</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 14 }}>
              <div>
                <CapsLabel style={{ marginBottom: 8 }}>Сортировка</CapsLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {[
                    { id: 'popularity', label: 'Популярные' },
                    { id: 'rating',     label: 'По рейтингу' },
                    { id: 'newest',     label: 'Новые' },
                  ].map(o => (
                    <button key={o.id} onClick={() => setSort(o.id)} style={{
                      padding: '10px 6px', borderRadius: 12,
                      border: `1px solid ${sort === o.id ? ACT.primary : ACT.line}`,
                      background: sort === o.id
                        ? 'linear-gradient(180deg, rgba(216,171,104,0.20) 0%, rgba(140,45,36,0.22) 100%)'
                        : 'rgba(28,13,13,0.7)',
                      color: sort === o.id ? ACT.accentSoft : ACT.text1,
                      fontSize: 11.5,
                    }}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <CapsLabel style={{ marginBottom: 8 }}>Профили</CapsLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ACPL.map(p => (
                    <Chip key={p.id} color={ACPC[p.id]} active={profiles.includes(p.id)}
                      onClick={() => setProfiles(profiles.includes(p.id) ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}>
                      {p.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <CapsLabel style={{ marginBottom: 8 }}>Вкусы</CapsLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ACFL.slice(0, 18).map(f => (
                    <Chip key={f} active={flavors.includes(f)}
                      onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            <CTA onClick={() => setSheetOpen(false)}>
              Показать · {ACMIXES.length}
            </CTA>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant B — Inline horizontal-scroll chip rail.
// Profiles scroll horizontally at top; tap toggles instantly.
// "Все фильтры" button → small popover for sort + flavors.
// Results dominate the screen.
// ───────────────────────────────────────────────────────────
function CatalogInline() {
  const [profiles, setProfiles] = React.useState(['citrus']);
  const [popoverOpen, setPopover] = React.useState(false);
  const [flavors, setFlavors]   = React.useState([]);
  const [sort, setSort]         = React.useState('popularity');

  return (
    <PhoneShell>
      <CatHeader />

      <div style={{
        padding: '10px 20px 10px',
        borderBottom: `1px solid ${ACT.lineSoft}`,
        background: 'rgba(20,10,10,0.6)',
        display: 'grid', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Поиск"
            style={{
              flex: 1, height: 38, borderRadius: 999,
              border: `1px solid ${ACT.line}`,
              background: 'rgba(40,18,18,0.66)',
              padding: '0 14px',
              color: ACT.text0, fontSize: 13,
              outline: 'none',
            }}
          />
          <button onClick={() => setPopover(!popoverOpen)} style={{
            width: 38, height: 38, borderRadius: 999,
            border: `1px solid ${ACT.line}`,
            background: 'rgba(40,18,18,0.66)',
            color: ACT.text1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {(flavors.length > 0 || sort !== 'popularity') && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 10, height: 10, borderRadius: 999, background: ACT.primary,
                boxShadow: '0 0 0 2px #130807',
              }} />
            )}
          </button>
        </div>

        {/* Horizontal profile rail */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {ACPL.map(p => (
            <Chip key={p.id} color={ACPC[p.id]} active={profiles.includes(p.id)}
              onClick={() => setProfiles(profiles.includes(p.id) ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}
              style={{ flex: '0 0 auto' }}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <PhoneBody style={{ gap: 8, paddingTop: 12, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <CapsLabel>Найдено · {ACMIXES.length}</CapsLabel>
          {profiles.length > 0 && (
            <button onClick={() => setProfiles([])} style={{
              background: 'transparent', border: 0, color: ACT.text1,
              fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>Сбросить</button>
          )}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {ACMIXES.map(m => <CatalogResultRow key={m.id} mix={m} />)}
        </div>

        {popoverOpen && (
          <div style={{
            position: 'absolute', top: 8, right: 20, left: 20,
            background: 'linear-gradient(180deg, #2a1212 0%, #180a0b 100%)',
            border: `1px solid ${ACT.line}`,
            borderRadius: 16,
            padding: 14,
            display: 'grid', gap: 14,
            boxShadow: '0 24px 50px rgba(0,0,0,0.55)',
            zIndex: 20,
          }}>
            <div>
              <CapsLabel style={{ marginBottom: 8 }}>Сортировка</CapsLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {[
                  { id: 'popularity', label: 'Топ' },
                  { id: 'rating',     label: 'Рейтинг' },
                  { id: 'newest',     label: 'Новые' },
                ].map(o => (
                  <button key={o.id} onClick={() => setSort(o.id)} style={{
                    padding: '8px 6px', borderRadius: 10,
                    border: `1px solid ${sort === o.id ? ACT.primary : ACT.line}`,
                    background: sort === o.id ? 'rgba(216,171,104,0.18)' : 'rgba(28,13,13,0.7)',
                    color: sort === o.id ? ACT.accentSoft : ACT.text1,
                    fontSize: 11.5,
                  }}>{o.label}</button>
                ))}
              </div>
            </div>
            <div>
              <CapsLabel style={{ marginBottom: 8 }}>Вкусы</CapsLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 132, overflowY: 'auto' }}>
                {ACFL.map(f => (
                  <Chip key={f} active={flavors.includes(f)}
                    onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}>
                    {f}
                  </Chip>
                ))}
              </div>
            </div>
            <button onClick={() => setPopover(false)} style={{
              width: '100%', minHeight: 40, borderRadius: 12,
              background: 'linear-gradient(180deg, #e0b878 0%, #c08a4a 100%)',
              border: '1px solid rgba(242,213,165,0.28)', color: '#23120d',
              fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600,
            }}>Готово</button>
          </div>
        )}
      </PhoneBody>
    </PhoneShell>
  );
}

// ───────────────────────────────────────────────────────────
// Variant C — Accordion. All filter groups collapsed by default.
// Pinned active-filters chip row above results.
// Only one group expanded at a time. Sticky "Готово" footer.
// ───────────────────────────────────────────────────────────
function CatalogAccordion() {
  const [open, setOpen]         = React.useState(null);
  const [profiles, setProfiles] = React.useState(['citrus', 'fresh']);
  const [flavors, setFlavors]   = React.useState(['лимон']);
  const [sort, setSort]         = React.useState('popularity');
  const [manuf, setManuf]       = React.useState([]);

  const Group = ({ id, label, summary, children }) => {
    const isOpen = open === id;
    return (
      <div style={{
        border: `1px solid ${ACT.lineSoft}`,
        borderRadius: 14,
        background: 'rgba(28,13,13,0.84)',
        overflow: 'hidden',
      }}>
        <button onClick={() => setOpen(isOpen ? null : id)} style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'transparent', border: 0,
          color: ACT.text0, fontSize: 13,
          textAlign: 'left',
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="aroma-caps">{label}</span>
            <span style={{ fontSize: 12.5, color: ACT.text1, lineHeight: 1.2 }}>{summary}</span>
          </span>
          <span style={{
            color: ACT.text2, fontSize: 16, transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: 'transform 180ms',
          }}>⌄</span>
        </button>
        {isOpen && (
          <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>{children}</div>
        )}
      </div>
    );
  };

  const sortLabels = { popularity: 'По популярности', rating: 'По рейтингу', newest: 'Сначала новые' };

  return (
    <PhoneShell>
      <CatHeader />

      <div style={{
        padding: '12px 20px 10px',
        borderBottom: `1px solid ${ACT.lineSoft}`,
        background: 'rgba(20,10,10,0.6)',
      }}>
        <input
          placeholder="Поиск по названию"
          style={{
            width: '100%', height: 40, borderRadius: 999,
            border: `1px solid ${ACT.line}`,
            background: 'rgba(40,18,18,0.66)',
            padding: '0 14px',
            color: ACT.text0, fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      <PhoneBody style={{ gap: 10 }}>
        <Group id="sort" label="Сортировка" summary={sortLabels[sort]}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[
              { id: 'popularity', label: 'Популярные' },
              { id: 'rating',     label: 'По рейтингу' },
              { id: 'newest',     label: 'Новые' },
            ].map(o => (
              <button key={o.id} onClick={() => setSort(o.id)} style={{
                padding: '10px 6px', borderRadius: 12,
                border: `1px solid ${sort === o.id ? ACT.primary : ACT.line}`,
                background: sort === o.id ? 'rgba(216,171,104,0.18)' : 'rgba(28,13,13,0.7)',
                color: sort === o.id ? ACT.accentSoft : ACT.text1,
                fontSize: 11.5,
              }}>{o.label}</button>
            ))}
          </div>
        </Group>

        <Group id="profiles" label="Профили вкуса" summary={profiles.length ? profiles.map(p => ACPLBL[p]).join(', ') : 'Любой профиль'}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ACPL.map(p => (
              <Chip key={p.id} color={ACPC[p.id]} active={profiles.includes(p.id)}
                onClick={() => setProfiles(profiles.includes(p.id) ? profiles.filter(x => x !== p.id) : [...profiles, p.id])}>
                {p.label}
              </Chip>
            ))}
          </div>
        </Group>

        <Group id="flavors" label="Вкусы" summary={flavors.length ? flavors.join(', ') : 'Любой вкус'}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ACFL.slice(0, 18).map(f => (
              <Chip key={f} active={flavors.includes(f)}
                onClick={() => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f])}>
                {f}
              </Chip>
            ))}
          </div>
        </Group>

        <Group id="manuf" label="Производитель" summary={manuf.length ? manuf.join(', ') : 'Любой'}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Adalya', 'Darkside', 'Element', 'Tangiers'].map(m => (
              <Chip key={m} active={manuf.includes(m)}
                onClick={() => setManuf(manuf.includes(m) ? manuf.filter(x => x !== m) : [...manuf, m])}>
                {m}
              </Chip>
            ))}
          </div>
        </Group>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 }}>
          <CapsLabel>Найдено · {ACMIXES.length}</CapsLabel>
          <button style={{
            background: 'transparent', border: 0, color: ACT.text1,
            fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>Сбросить всё</button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {ACMIXES.slice(0, 4).map(m => <CatalogResultRow key={m.id} mix={m} />)}
        </div>
      </PhoneBody>
    </PhoneShell>
  );
}

Object.assign(window, { CatalogSheet, CatalogInline, CatalogAccordion });
