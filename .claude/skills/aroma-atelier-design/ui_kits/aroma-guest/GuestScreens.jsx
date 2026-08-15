// Арома Ателье · guest screens. Recreation of apps/aroma-web/src/App.tsx views.
const { AromaCTA, AromaChip, SegmentNav, ProfileGlyph, SignatureBar, RatingPill, ProfileCard, MixRow, ShowcaseCard, GuestCard, CompositionStack, AccessCodeInput, OnboardingProgress, GuestTab } = window.DesignSystem_1aef33;
const M = window.AROMA_MOCK;
const label = (p) => M.profileLabels[p] || p;
const railKind = { statistical: 'Выбор гостей', prepared: 'Редакция', curated: 'Мастера' };
const sourceLabel = { recommendations: 'Подбор для вас', showcase: 'Из витрины', catalog: 'Из каталога', rail: 'Из подборки' };
const plural = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'микс'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'микса'; return 'миксов'; };

function AccessScreen({ code, setCode, ageOk, setAgeOk, error, onSubmit }) {
  const ready = code.length >= 4 && ageOk;
  return (
    <section className="aroma-access">
      <div className="aroma-access-halo" aria-hidden />
      <div className="aroma-access-body">
        <div>
          <img className="aroma-access-mark" src="../../assets/logo-mark-oxblood.svg" width="64" height="64" alt="" aria-hidden />
          <span className="aroma-access-brand">Арома<br />Ателье</span>
          <p className="aroma-access-tagline">подбор кальянных миксов</p>
        </div>
        <form className="aroma-access-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <AccessCodeInput value={code} onChange={setCode} />
          <label className="aroma-access-age">
            <button type="button" role="checkbox" aria-checked={ageOk} className={'aroma-access-age-dot' + (ageOk ? ' on' : '')} onClick={() => setAgeOk(!ageOk)}>{ageOk ? <span aria-hidden>✓</span> : null}</button>
            <span className="aroma-access-age-text">Мне есть 18. Понимаю, что курение вредит здоровью.</span>
          </label>
          <AromaCTA type="submit" pulse={ready} disabled={!ready}>Войти в Ателье</AromaCTA>
          {error ? <p className="guest-error">{error}</p> : null}
        </form>
        <p className="aroma-access-footer">18+ · Курение вредит здоровью</p>
      </div>
    </section>
  );
}

function IntroScreen({ index, onNext, onSkip }) {
  const cards = M.introCards;
  const card = cards[index];
  const isLast = index === cards.length - 1;
  const step = String(index + 1).padStart(2, '0');
  return (
    <div className="aroma-intro">
      <span className="aroma-intro-watermark" aria-hidden>{step}</span>
      <div className="aroma-intro-body">
        <p className="aroma-caps">{'Шаг ' + step + ' · из ' + String(cards.length).padStart(2, '0')}</p>
        <div className="aroma-intro-content">
          <h1 className="aroma-intro-title">{card.title}</h1>
          <p className="aroma-intro-text">{card.description}</p>
        </div>
      </div>
      <div className="aroma-intro-dock">
        <div className="aroma-intro-pips">
          {cards.map((_, i) => <span key={i} className={'aroma-intro-pip' + (i === index ? ' on' : '')} aria-hidden />)}
        </div>
        <AromaCTA pulse={isLast} onClick={onNext}>{isLast ? 'Перейти к подбору' : 'Дальше'}</AromaCTA>
        {!isLast ? <button type="button" className="aroma-skip" onClick={onSkip}>Пропустить знакомство</button> : null}
      </div>
    </div>
  );
}

function OnboardingScreen({ step, profiles, flavors, toggleProfile, toggleFlavor, onNext, onSkip }) {
  return (
    <div className="aroma-onboarding">
      <div className="aroma-onboarding-body">
        {step === 1 ? (
          <>
            <p className="aroma-caps">Шаг 1 · Профили</p>
            <h1 className="aroma-onboarding-title">С чего начнём?</h1>
            <p className="aroma-onboarding-hint">Несколько касаний по профилям, и мы поймём, в какую сторону смотреть.</p>
            <div className="aroma-profile-grid">
              {Object.keys(M.profileLabels).map((id) => (
                <ProfileCard key={id} profile={id} label={label(id)} active={profiles.includes(id)} onClick={() => toggleProfile(id)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="aroma-caps">Шаг 2 · Вкусы</p>
            <h1 className="aroma-onboarding-title">Любимые ноты</h1>
            <p className="aroma-onboarding-hint">Опционально — но так подбор станет точнее.</p>
            <div className="aroma-flavor-wrap">
              {M.flavors.map((f) => (
                <AromaChip key={f} active={flavors.includes(f)} onClick={() => toggleFlavor(f)}>{f}</AromaChip>
              ))}
            </div>
            {profiles.length ? (
              <div className="aroma-selected">
                <p className="aroma-caps">Сейчас выбрано</p>
                <div className="aroma-selected-row">
                  {profiles.map((p) => (
                    <span key={p} className="aroma-selected-tag">
                      <span className="aroma-selected-dot" style={{ background: 'var(--profile-' + p.replace('_', '-') + ')' }} aria-hidden />
                      {label(p)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="aroma-onboarding-dock">
        <div className="aroma-onboarding-pips" aria-hidden>
          <span className={'aroma-onboarding-pip' + (step >= 1 ? ' on' : '')} />
          <span className={'aroma-onboarding-pip' + (step >= 2 ? ' on' : '')} />
        </div>
        <AromaCTA pulse={step === 2} onClick={onNext}>{step === 1 ? 'Далее' : 'Показать подбор'}</AromaCTA>
        <button type="button" className="aroma-skip" onClick={onSkip}>Открыть каталог сразу</button>
      </div>
    </div>
  );
}

function RecommendationsScreen({ mixes, onOpen, onChoose, onOpenOnboarding, onOpenCatalog }) {
  if (!mixes.length) {
    return (
      <section className="aroma-recs-empty">
        <p className="aroma-caps">Подбор не найден</p>
        <h1 className="aroma-empty-title">Ничего не найдено</h1>
        <p className="aroma-empty-text">Попробуйте изменить профили и вкусы или сразу перейти в каталог.</p>
        <div className="aroma-empty-actions">
          <AromaCTA onClick={onOpenOnboarding}>Изменить вкусы</AromaCTA>
          <button type="button" className="aroma-skip" onClick={onOpenCatalog}>Открыть каталог</button>
        </div>
      </section>
    );
  }
  const [hero, ...rest] = mixes;
  const halo = 'var(--profile-' + (hero.flavorProfiles[0] || 'tobacco').replace('_', '-') + ')';
  return (
    <section className="aroma-recs">
      <p className="aroma-caps">Лучшее совпадение</p>
      <article className="aroma-recs-hero" style={{ background: 'radial-gradient(circle at 80% 0%, color-mix(in srgb, ' + halo + ' 33%, transparent) 0%, transparent 55%), linear-gradient(180deg, rgba(34,15,16,0.96) 0%, rgba(22,11,12,0.88) 100%)' }}>
        <div className="aroma-recs-hero-head">
          <ProfileGlyph profiles={hero.flavorProfiles} size={64} />
          <div className="aroma-recs-hero-text">
            <h2 className="aroma-recs-hero-title">{hero.name}</h2>
            <p className="aroma-recs-hero-desc">{hero.description}</p>
          </div>
        </div>
        <SignatureBar profiles={hero.flavorProfiles} height={6} />
        <CompositionStack components={hero.components} showBar={false} />
        <div className="aroma-recs-hero-meta">
          <RatingPill rating={hero.avgRating} />
          <span className="aroma-caps">{hero.popularity + ' выборов'}</span>
        </div>
        <AromaCTA pulse onClick={() => onChoose(hero, 'recommendations')}>Покурить</AromaCTA>
      </article>
      {rest.length ? (
        <>
          <p className="aroma-caps">Тоже подходят</p>
          <div className="aroma-list">
            {rest.slice(0, 4).map((mix) => (
              <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={mix.avgRating} showGlyph={false} showSignature onClick={() => onOpen(mix, 'recommendations')} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ShowcaseScreen({ onOpen, onOpenRail }) {
  return (
    <section className="aroma-showcase">
      {M.rails.map((rail) => (
        <section key={rail.id} className="aroma-showcase-rail">
          <div className="aroma-showcase-head">
            <h2 className="aroma-showcase-title">{rail.name}</h2>
            <span className="aroma-caps aroma-showcase-kind">{railKind[rail.type]}</span>
          </div>
          <div className="aroma-scroller">
            {rail.mixIds.map((id) => {
              const mix = M.mixes.find((m) => m.id === id);
              return <ShowcaseCard key={id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={mix.avgRating} onClick={() => onOpen(mix, 'showcase')} />;
            })}
            <button type="button" className="aroma-showcase-all" onClick={() => onOpenRail(rail)} aria-label={'Открыть весь рейл «' + rail.name + '»'}>Все</button>
          </div>
        </section>
      ))}
    </section>
  );
}

function CatalogScreen({ query, setQuery, profiles, toggleProfile, flavors, toggleFlavor, sort, setSort, popoverOpen, setPopoverOpen, results, onOpen, onReset }) {
  const dirty = Boolean(query) || profiles.length || flavors.length || sort !== 'popularity';
  return (
    <section className="aroma-catalog">
      <div className="aroma-catalog-rail">
        <div className="aroma-catalog-search-row">
          <input type="search" className="aroma-catalog-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию и описанию" autoComplete="off" />
          <button type="button" className="aroma-catalog-icon-btn" onClick={() => setPopoverOpen(!popoverOpen)} aria-label="Фильтры и сортировка" aria-expanded={popoverOpen}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {flavors.length || sort !== 'popularity' ? <span className="aroma-catalog-icon-dot" aria-hidden /> : null}
          </button>
        </div>
        <div className="aroma-chip-scroll">
          {Object.keys(M.profileLabels).map((id) => (
            <AromaChip key={id} profile={id} active={profiles.includes(id)} onClick={() => toggleProfile(id)}>{label(id)}</AromaChip>
          ))}
        </div>
      </div>

      {popoverOpen ? (
        <div className="aroma-catalog-popover" role="dialog" aria-label="Фильтры каталога">
          <p className="aroma-caps">Сортировка</p>
          <div className="aroma-catalog-sort">
            {[['popularity', 'По популярности'], ['rating', 'По рейтингу'], ['newest', 'Сначала новое']].map(([v, l]) => (
              <button key={v} type="button" className={'aroma-sort-btn' + (sort === v ? ' on' : '')} onClick={() => setSort(v)}>{l}</button>
            ))}
          </div>
          <p className="aroma-caps">Вкусы</p>
          <div className="aroma-flavor-scroll">
            {M.flavors.map((f) => <AromaChip key={f} active={flavors.includes(f)} onClick={() => toggleFlavor(f)}>{f}</AromaChip>)}
          </div>
          <AromaCTA onClick={() => setPopoverOpen(false)}>Готово</AromaCTA>
        </div>
      ) : null}

      <div className="aroma-catalog-meta">
        <p className="aroma-caps">{'Найдено · ' + results.length}</p>
        {dirty ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
      </div>

      {!results.length ? <p className="guest-status">По выбранным фильтрам ничего не найдено.</p> : null}
      <div className="aroma-list">
        {results.map((mix) => (
          <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={mix.avgRating} onClick={() => onOpen(mix, 'catalog')} />
        ))}
      </div>
    </section>
  );
}

function RailScreen({ rail, filters, toggleFilter, onBack, onOpen }) {
  const mixes = rail.mixIds.map((id) => M.mixes.find((m) => m.id === id));
  const options = Array.from(new Set(mixes.flatMap((m) => m.flavorProfiles)));
  const visible = filters.length ? mixes.filter((m) => m.flavorProfiles.some((p) => filters.includes(p))) : mixes;
  return (
    <section className="aroma-rail">
      <header className="aroma-rail-topbar">
        <button type="button" className="aroma-rail-back" onClick={onBack} aria-label="Назад к витрине">←</button>
        <div className="aroma-rail-topbar-text">
          <p className="aroma-caps">{'Витрина · ' + railKind[rail.type]}</p>
          <p className="aroma-rail-meta">{mixes.length + ' ' + plural(mixes.length)}</p>
        </div>
        <button type="button" className="aroma-rail-code">Новый код</button>
      </header>
      <div className="aroma-rail-intro">
        <h1 className="aroma-rail-title">{rail.name}</h1>
        <p className="aroma-rail-desc">{rail.description}</p>
      </div>
      <div className="aroma-chip-scroll">
        <AromaChip tier="lg" active={!filters.length} onClick={() => toggleFilter(null)}>Все</AromaChip>
        {options.map((p) => <AromaChip key={p} tier="lg" profile={p} active={filters.includes(p)} onClick={() => toggleFilter(p)}>{label(p)}</AromaChip>)}
      </div>
      {!visible.length ? <p className="guest-status">По выбранным профилям ничего не найдено.</p> : null}
      <div className="aroma-list">
        {visible.map((mix) => (
          <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={mix.avgRating} glyphSize={60} onClick={() => onOpen(mix, 'rail')} />
        ))}
      </div>
    </section>
  );
}

function MixSheet({ state, rating, onRate, onClose, onChoose }) {
  if (!state) return null;
  const { mix, source } = state;
  const halo = 'var(--profile-' + (mix.flavorProfiles[0] || 'tobacco').replace('_', '-') + ')';
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" onClick={(e) => e.stopPropagation()} style={{ background: 'radial-gradient(circle at 88% 0%, color-mix(in srgb, ' + halo + ' 31%, transparent) 0%, transparent 50%), var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
            <p className="aroma-caps">{sourceLabel[source]}</p>
            <h2 className="aroma-sheet-title">{mix.name}</h2>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
        </div>
        <p className="aroma-sheet-desc">{mix.description}</p>
        <div className="aroma-sheet-tags">
          {mix.flavorProfiles.map((p) => <AromaChip key={p} tier="lg" active profile={p}>{label(p)}</AromaChip>)}
          {mix.flavors.map((f) => <AromaChip key={f}>{f}</AromaChip>)}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Состав микса</p>
          <CompositionStack components={mix.components} />
        </section>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Ваша оценка</p>
          <div className="aroma-stars" role="group" aria-label="Оценка микса">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className={'aroma-star' + (rating >= v ? ' on' : '')} onClick={() => onRate(v)} aria-label={'Оценить на ' + v}>★</button>
            ))}
          </div>
          {rating ? <p className="guest-ok">{'Оценка ' + rating + ' сохранена.'}</p> : null}
        </section>
        <div className="aroma-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>Закрыть</button>
          <AromaCTA pulse onClick={() => onChoose(mix, source)}>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

function ConfirmationScreen({ mix, onDone }) {
  return (
    <section className="aroma-confirm">
      <div className="aroma-confirm-topbar">
        <button type="button" className="aroma-confirm-done" onClick={onDone}>Готово</button>
      </div>
      <div className="aroma-confirm-stack">
        <p className="aroma-caps aroma-confirm-kicker">Покажите мастеру</p>
        <ProfileGlyph profiles={mix.flavorProfiles} size={96} />
        <h1 className="aroma-confirm-title">{mix.name}</h1>
        <p className="aroma-caps">{mix.flavorProfiles.map(label).join(' · ')}</p>
        <SignatureBar profiles={mix.flavorProfiles} height={3} />
      </div>
      <section className="aroma-confirm-composition">
        <p className="aroma-caps">Состав</p>
        <CompositionStack components={mix.components} showBar={false} />
      </section>
      <button type="button" className="aroma-ghost aroma-confirm-rate" onClick={onDone}>Оценить, когда соберут</button>
    </section>
  );
}

Object.assign(window, { AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, RailScreen, MixSheet, ConfirmationScreen, GuestSelectedBar: function ({ mix, source, onOpen }) {
  return (
    <div className="aroma-selected-shell">
      <GuestCard compact title="Карточка для мастера" style={{ display: 'grid', gap: 10 }}>
        <p className="aroma-selected-text">{mix.name + ' · ' + sourceLabel[source]}</p>
        <button type="button" className="aroma-ghost-sm" onClick={onOpen}>Открыть карточку</button>
      </GuestCard>
    </div>
  );
} });
