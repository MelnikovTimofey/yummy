// Guest flow: access → intro → onboarding → (подбор / витрина / рилсы / каталог / рейл / миксер / кабинет) → карточка → подтверждение.
const { GuestTab, OnboardingProgress, MixRow } = window.DesignSystem_1aef33;
const { AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, CatalogFiltersSheet, RailScreen, MixSheet, ReelStrip, ReelsScreen, ConfirmationScreen, GuestSelectedBar, Icon } = window;
const MOCK = window.AROMA_MOCK;

// Нижняя панель (#168): только значки, название — в aria-label, активный пункт кремовый с чертой акцента.
// «Рилсы» (#153) — третьим, ближе к центру, как Reels в Instagram.
const NAV_ITEMS = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
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

// Кабинета в ките нет: вход через Telegram, история и «Для вас» — в design/design_handoff_guest_cabinet/.
// Заглушка показывает только избранное, которое гость отметил сердечком в карточке микса.
function CabinetStub({ favorites, onOpen }) {
  return (
    <section className="kit-cabinet">
      <h1 className="kit-cabinet-title">Кабинет</h1>
      <p className="aroma-caps">{'Избранное · ' + favorites.length}</p>
      {favorites.length ? (
        favorites.map((mix) => <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} onClick={() => onOpen(mix, 'catalog')} />)
      ) : (
        <p className="guest-status">Пока пусто. Сердечко на карточке микса — и он здесь.</p>
      )}
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
  const [favoriteIds, setFavoriteIds] = React.useState([]);
  const [reelsStart, setReelsStart] = React.useState(0);

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

  // Лента рилсов: подбор по онбордингу, затем остальные миксы каталога без повторов.
  const reelsFeed = React.useMemo(() => [...recommendations, ...MOCK.mixes.filter((mix) => !recommendations.includes(mix))], [recommendations]);

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
  const chooseMix = (mix, source) => {
    if (source === 'reels') setReelsStart(reelsFeed.indexOf(mix));
    setSelected({ mix, source }); setSheet(null); setView('confirmation');
  };
  const openReels = (index) => { setReelsStart(index); setView('reels'); };

  const submitAccess = () => {
    if (code.length < 4 || !ageOk) { setAccessError('Введите код доступа и подтвердите 18+.'); return; }
    setAccessError(''); setView('intro');
  };

  const toggleFavorite = (mix) => setFavoriteIds((cur) => (cur.includes(mix.id) ? cur.filter((id) => id !== mix.id) : [...cur, mix.id]));
  const navView = ['recommendations', 'showcase', 'catalog', 'rail', 'cabinet'].includes(view) ? view : null;
  const goNav = (tab) => {
    if (tab === 'mixer') setMixerReturn(view);
    // Рилсы в панели всегда открывают ленту с начала.
    if (tab === 'reels') { openReels(0); return; }
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
          <ConfirmationScreen mix={selected.mix} onDone={() => setView(selected.source === 'reels' ? 'reels' : 'recommendations')} />
        ) : view === 'mixer' ? (
          <MixerStub onBack={() => setView(mixerReturn)} />
        ) : view === 'reels' ? (
          // Шапки нет, лента на всю высоту над панелью; «Готово» после «Покурить» возвращает на тот же рилс.
          <>
            <ReelsScreen key={reelsStart} mixes={reelsFeed} start={reelsStart} favoriteIds={favoriteIds} onFavorite={toggleFavorite} onOpen={openMix} onChoose={chooseMix} />
            <BottomNav value="reels" onChange={goNav} />
          </>
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
              {view === 'recommendations' ? <ReelStrip mixes={reelsFeed} onOpen={openReels} /> : null}
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
              {view === 'cabinet' ? (
                <CabinetStub favorites={MOCK.mixes.filter((mix) => favoriteIds.includes(mix.id))} onOpen={openMix} />
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
      <MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} favorite={Boolean(sheet && favoriteIds.includes(sheet.mix.id))} onFavorite={toggleFavorite} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GuestApp />);
