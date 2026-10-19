// Guest flow: access → intro → onboarding → (подбор / витрина / каталог / рейл / миксер) → карточка → подтверждение.
const { GuestTab, OnboardingProgress } = window.DesignSystem_1aef33;
const { AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, CatalogFiltersSheet, RailScreen, MixSheet, ConfirmationScreen, GuestSelectedBar, Icon } = window;
const MOCK = window.AROMA_MOCK;

// Нижняя панель (#168): только значки, название — в aria-label, активный пункт кремовый с чертой акцента.
const NAV_ITEMS = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
];

function BottomNav({ value, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

// Экрана «Намиксуй» в ките нет — заглушка показывает только полноэкранный режим без панели и возврат.
function MixerStub({ onBack }) {
  return (
    <section className="kit-mixer">
      <header className="kit-mixer-top">
        <button type="button" className="aroma-rail-back" onClick={onBack} aria-label="Назад">←</button>
        <h1 className="kit-mixer-title">Намиксуй</h1>
      </header>
      <p className="guest-status">Сборку микса за три хода смотрите в приложении: экран MixerScreen в apps/aroma-web.</p>
    </section>
  );
}

function GuestApp() {
  const [view, setView] = React.useState('access');
  const [code, setCode] = React.useState('');
  const [ageOk, setAgeOk] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const [introIndex, setIntroIndex] = React.useState(0);
  const [step, setStep] = React.useState(1);
  const [likedProfiles, setLikedProfiles] = React.useState([]);
  const [likedFlavors, setLikedFlavors] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [catalogFilters, setCatalogFilters] = React.useState([]);
  const [catalogFiltersOpen, setCatalogFiltersOpen] = React.useState(false);
  const [rail, setRail] = React.useState(null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [mixerReturn, setMixerReturn] = React.useState('recommendations');

  const toggle = (setter) => (value) => setter((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));

  const recommendations = React.useMemo(() => {
    const scored = MOCK.mixes
      .map((mix) => {
        const p = mix.flavorProfiles.filter((x) => likedProfiles.includes(x)).length;
        const f = mix.flavors.filter((x) => likedFlavors.includes(x)).length;
        return { mix, score: p * 3 + f * 2 + mix.popularity / 500 };
      })
      .filter((x) => (likedProfiles.length || likedFlavors.length ? x.score > 0.4 : true))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((x) => x.mix);
  }, [likedProfiles, likedFlavors]);

  // Внутри характеров и внутри вкусов — «или», между ними и с текстом — «и». Сортировки нет (#181): по алфавиту.
  const catalogResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const of = (kind) => catalogFilters.filter((t) => t.kind === kind).map((t) => t.value);
    const profiles = of('profile');
    const flavors = of('flavor');
    return MOCK.mixes
      .filter((m) => !q || [m.name, m.description, ...m.flavors, ...m.components.flatMap((c) => [c.name, c.manufacturer])].join(' ').toLowerCase().includes(q))
      .filter((m) => !profiles.length || m.flavorProfiles.some((p) => profiles.includes(p)))
      .filter((m) => !flavors.length || m.flavors.some((f) => flavors.includes(f)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [query, catalogFilters]);

  const sameFilter = (a, b) => a.kind === b.kind && a.value === b.value;
  const removeCatalogFilter = (tag) => setCatalogFilters((cur) => cur.filter((t) => !sameFilter(t, tag)));
  const toggleCatalogFilter = (tag) => setCatalogFilters((cur) => (cur.some((t) => sameFilter(t, tag)) ? cur.filter((t) => !sameFilter(t, tag)) : [...cur, tag]));

  const openMix = (mix, source) => { setSheet({ mix, source }); setRating(0); };
  const chooseMix = (mix, source) => { setSelected({ mix, source }); setSheet(null); setView('confirmation'); };

  const submitAccess = () => {
    if (code.length < 4 || !ageOk) { setAccessError('Введите код доступа и подтвердите 18+.'); return; }
    setAccessError(''); setView('intro');
  };

  const navView = ['recommendations', 'showcase', 'catalog', 'rail'].includes(view) ? view : null;
  const goNav = (tab) => {
    if (tab === 'mixer') setMixerReturn(view);
    setView(tab);
  };

  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        {view === 'access' ? (
          <AccessScreen code={code} setCode={setCode} ageOk={ageOk} setAgeOk={setAgeOk} error={accessError} onSubmit={submitAccess} />
        ) : view === 'confirmation' ? (
          <ConfirmationScreen mix={selected.mix} onDone={() => setView('recommendations')} />
        ) : view === 'mixer' ? (
          <MixerStub onBack={() => setView(mixerReturn)} />
        ) : (
          <>
            {view !== 'rail' ? (
              <header className="topbar">
                <div className="topbar-main-row">
                  <button type="button" className="brand-home-btn" onClick={() => setView('recommendations')}>
                    <img className="brand-mark" src="../../assets/logo-mark-oxblood.svg" alt="" aria-hidden />
                    <span className="brand">Арома Ателье</span>
                  </button>
                  <button type="button" className="topbar-icon-btn" aria-label="Сменить код" title="Сменить код" onClick={() => { setView('access'); setCode(''); setAgeOk(false); setSelected(null); }}>
                    <Icon name="KeyRound" size={20} />
                  </button>
                </div>
                {view === 'intro' ? (
                  <nav className="guest-stage-nav" aria-label="Маршрут знакомства">
                    <GuestTab active>Знакомство</GuestTab>
                    <GuestTab onClick={() => setView('onboarding')}>Предпочтения</GuestTab>
                  </nav>
                ) : null}
                {view === 'onboarding' ? (
                  <OnboardingProgress step={step} total={2} onBack={() => (step === 2 ? setStep(1) : setView('intro'))} />
                ) : null}
              </header>
            ) : null}

            {selected && view !== 'intro' && view !== 'rail' ? (
              <GuestSelectedBar mix={selected.mix} source={selected.source} onOpen={() => openMix(selected.mix, selected.source)} />
            ) : null}

            <main className={view === 'intro' ? 'content content-intro' : 'content'}>
              {view === 'intro' ? (
                <IntroScreen
                  index={introIndex}
                  onNext={() => (introIndex === MOCK.introCards.length - 1 ? setView('onboarding') : setIntroIndex(introIndex + 1))}
                  onSkip={() => setView('onboarding')}
                />
              ) : null}
              {view === 'onboarding' ? (
                <OnboardingScreen
                  step={step}
                  profiles={likedProfiles}
                  flavors={likedFlavors}
                  toggleProfile={toggle(setLikedProfiles)}
                  toggleFlavor={toggle(setLikedFlavors)}
                  onNext={() => { if (step === 1) { setStep(2); return; } setView('recommendations'); }}
                  onSkip={() => setView('catalog')}
                />
              ) : null}
              {view === 'recommendations' ? (
                <RecommendationsScreen mixes={recommendations} onOpen={openMix} onChoose={chooseMix} onOpenOnboarding={() => { setStep(1); setView('onboarding'); }} onOpenCatalog={() => setView('catalog')} />
              ) : null}
              {view === 'showcase' ? (
                <ShowcaseScreen onOpen={openMix} onOpenRail={(r) => { setRail(r); setRailFilters([]); setView('rail'); }} />
              ) : null}
              {view === 'catalog' ? (
                <CatalogScreen
                  query={query} setQuery={setQuery}
                  filters={catalogFilters} onRemoveFilter={removeCatalogFilter}
                  onOpenFilters={() => setCatalogFiltersOpen(true)}
                  results={catalogResults} onOpen={openMix}
                  onReset={() => { setQuery(''); setCatalogFilters([]); }}
                />
              ) : null}
              {view === 'rail' && rail ? (
                <RailScreen rail={rail} filters={railFilters} toggleFilter={(p) => (p === null ? setRailFilters([]) : toggle(setRailFilters)(p))} onBack={() => setView('showcase')} onOpen={openMix} />
              ) : null}
            </main>
            {navView ? <BottomNav value={navView === 'rail' ? 'showcase' : navView} onChange={goNav} /> : null}
          </>
        )}
      </div>
      {catalogFiltersOpen ? (
        <CatalogFiltersSheet filters={catalogFilters} onToggle={toggleCatalogFilter} onReset={() => setCatalogFilters([])} resultCount={catalogResults.length} onClose={() => setCatalogFiltersOpen(false)} />
      ) : null}
      <MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GuestApp />);
