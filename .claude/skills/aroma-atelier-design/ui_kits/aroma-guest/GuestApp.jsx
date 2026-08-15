// Guest flow: access → intro → onboarding → (подбор / витрина / каталог / рейл) → карточка → подтверждение.
const { SegmentNav, GuestTab, OnboardingProgress } = window.DesignSystem_1aef33;
const { AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, RailScreen, MixSheet, ConfirmationScreen, GuestSelectedBar } = window;
const MOCK = window.AROMA_MOCK;

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
  const [catalogProfiles, setCatalogProfiles] = React.useState([]);
  const [catalogFlavors, setCatalogFlavors] = React.useState([]);
  const [sort, setSort] = React.useState('popularity');
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [rail, setRail] = React.useState(null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(null);

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

  const catalogResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK.mixes
      .filter((m) => !q || (m.name + ' ' + m.description + ' ' + m.flavors.join(' ') + ' ' + m.components.map((c) => c.name + ' ' + c.manufacturer).join(' ')).toLowerCase().includes(q))
      .filter((m) => !catalogProfiles.length || m.flavorProfiles.some((p) => catalogProfiles.includes(p)))
      .filter((m) => !catalogFlavors.length || m.flavors.some((f) => catalogFlavors.includes(f)))
      .sort((a, b) => (sort === 'rating' ? b.avgRating - a.avgRating : sort === 'newest' ? b.id.localeCompare(a.id) : b.popularity - a.popularity));
  }, [query, catalogProfiles, catalogFlavors, sort]);

  const openMix = (mix, source) => { setSheet({ mix, source }); setRating(0); };
  const chooseMix = (mix, source) => { setSelected({ mix, source }); setSheet(null); setView('confirmation'); };

  const submitAccess = () => {
    if (code.length < 4 || !ageOk) { setAccessError('Введите код доступа и подтвердите 18+.'); return; }
    setAccessError(''); setView('intro');
  };

  const appTab = ['recommendations', 'showcase', 'catalog'].includes(view) ? view : null;

  return (
    <div className="app-bg">
      <div className="halo-top" />
      <div className="halo-bottom" />
      <div className="phone-shell">
        {view === 'access' ? (
          <AccessScreen code={code} setCode={setCode} ageOk={ageOk} setAgeOk={setAgeOk} error={accessError} onSubmit={submitAccess} />
        ) : view === 'confirmation' ? (
          <ConfirmationScreen mix={selected.mix} onDone={() => setView('recommendations')} />
        ) : (
          <>
            {view !== 'rail' ? (
              <header className="topbar">
                <div className="topbar-main-row">
                  <button type="button" className="brand-home-btn" onClick={() => setView('recommendations')}>
                    <img className="brand-mark" src="../../assets/logo-mark-oxblood.svg" alt="" aria-hidden />
                    <span>
                      <p className="brand">Арома Ателье</p>
                      <p className="tagline">подбор миксов</p>
                    </span>
                  </button>
                  <div className="topbar-right">
                    <button type="button" className="header-auth-btn" onClick={() => { setView('access'); setCode(''); setAgeOk(false); setSelected(null); }}>Новый код</button>
                  </div>
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
                {appTab ? (
                  <SegmentNav value={appTab} onChange={setView} items={[{ id: 'recommendations', label: 'Подбор' }, { id: 'showcase', label: 'Витрина' }, { id: 'catalog', label: 'Каталог' }]} />
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
                  onNext={() => { if (step === 1) { setStep(2); return; } setCatalogProfiles(likedProfiles); setCatalogFlavors(likedFlavors); setView('recommendations'); }}
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
                  profiles={catalogProfiles} toggleProfile={toggle(setCatalogProfiles)}
                  flavors={catalogFlavors} toggleFlavor={toggle(setCatalogFlavors)}
                  sort={sort} setSort={setSort}
                  popoverOpen={popoverOpen} setPopoverOpen={setPopoverOpen}
                  results={catalogResults} onOpen={openMix}
                  onReset={() => { setQuery(''); setCatalogProfiles([]); setCatalogFlavors([]); setSort('popularity'); }}
                />
              ) : null}
              {view === 'rail' && rail ? (
                <RailScreen rail={rail} filters={railFilters} toggleFilter={(p) => (p === null ? setRailFilters([]) : toggle(setRailFilters)(p))} onBack={() => setView('showcase')} onOpen={openMix} />
              ) : null}
            </main>
          </>
        )}
      </div>
      <MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GuestApp />);
