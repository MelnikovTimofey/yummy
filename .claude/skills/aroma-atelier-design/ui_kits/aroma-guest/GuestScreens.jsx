// Арома Ателье · guest screens. Recreation of apps/aroma-web/src/App.tsx views.
const { AromaCTA, AromaChip, SegmentNav, ProfileGlyph, SignatureBar, RatingPill, ProfileCard, MixRow, ShowcaseCard, GuestCard, CompositionStack, AccessCodeInput, OnboardingProgress, GuestTab } = window.DesignSystem_1aef33;
const M = window.AROMA_MOCK;
const label = (p) => M.profileLabels[p] || p;
// Без оценок гостей «★» нет: avgRating такого микса — базовый из Мастера, не мнение гостей (#185).
const guestRating = (mix) => (mix.ratingsCount ? mix.avgRating : null);
const railKind = { statistical: 'Выбор гостей', prepared: 'Редакция', curated: 'Мастера' };
// На Витрине тип полки виден значком, словами — в aria-label заголовка (railKindIcon в apps/aroma-web).
// Полка «Оценки гостей» в приложении получает Star; в мок-данных кита её нет.
const railKindIcon = { statistical: 'Users', prepared: 'Feather', curated: 'Flame' };
const sourceLabel = { recommendations: 'Подбор для вас', showcase: 'Из витрины', catalog: 'Из каталога', rail: 'Из подборки' };
const plural = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'микс'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'микса'; return 'миксов'; };

// Иконка Lucide из UMD-сборки как React-элемент (в приложении — lucide-react).
function Icon({ name, size = 24, stroke = 1.8, fill = 'none' }) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

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
          {hero.ratingsCount ? <RatingPill rating={hero.avgRating} /> : null}
          <span className="aroma-caps">{hero.popularity + ' выборов'}</span>
        </div>
        <AromaCTA pulse onClick={() => onChoose(hero, 'recommendations')}>Покурить</AromaCTA>
      </article>
      {rest.length ? (
        <>
          <p className="aroma-caps">Тоже подходят</p>
          <div className="aroma-list">
            {rest.slice(0, 4).map((mix) => (
              <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={guestRating(mix)} showGlyph={false} showSignature onClick={() => onOpen(mix, 'recommendations')} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

// Полки по образцу Okko (#175): заголовок с шевроном открывает подборку, под ним лента постеров.
function ShowcaseScreen({ onOpen, onOpenRail }) {
  return (
    <section className="aroma-showcase">
      {M.rails.map((rail) => (
        <section key={rail.id} className="aroma-showcase-rail">
          <h2 className="aroma-showcase-rail-head">
            <button type="button" className="aroma-showcase-rail-open" onClick={() => onOpenRail(rail)} aria-label={'Открыть подборку «' + rail.name + '», ' + railKind[rail.type].toLowerCase()}>
              <span className="aroma-showcase-rail-icon"><Icon name={railKindIcon[rail.type]} size={16} /></span>
              <span className="aroma-showcase-rail-title">{rail.name}</span>
              <span className="aroma-showcase-rail-chevron"><Icon name="ChevronRight" size={22} /></span>
            </button>
          </h2>
          <div className="aroma-showcase-scroller">
            {rail.mixIds.map((id) => {
              const mix = M.mixes.find((m) => m.id === id);
              return <ShowcaseCard key={id} name={mix.name} profiles={mix.flavorProfiles} rating={guestRating(mix)} onClick={() => onOpen(mix, 'showcase')} />;
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

// Каталог по варианту B (#181): фильтр — метка { kind: 'profile' | 'flavor', value }, как CatalogFilterTag в приложении.
const filterLabel = (tag) => (tag.kind === 'profile' ? label(tag.value) : tag.value);
const sameFilter = (a, b) => a.kind === b.kind && a.value === b.value;
// В приложении счётчики приходят из /guest/onboarding/options, в ките считаются по мок-миксам.
const countBy = (pick) => M.mixes.reduce((acc, mix) => { pick(mix).forEach((v) => { acc[v] = (acc[v] || 0) + 1; }); return acc; }, {});
const profileCounts = countBy((mix) => mix.flavorProfiles);
const flavorCounts = countBy((mix) => mix.flavors);
const byCountDesc = (values, counts, toLabel = (v) => v) => [...values].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || toLabel(a).localeCompare(toLabel(b), 'ru'));
// Сразу видны самые частые вкусы, остальные — по «Все N вкусов» или поиску.
const SHEET_FLAVOR_LIMIT = 18;

function FiltersIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

// Совпавшие с меткой или текстом вкусы — первыми, чтобы было видно, почему микс в выдаче.
function flavorsMatchedFirst(flavors, query, filters) {
  const q = query.trim().toLowerCase();
  const hit = (f) => filters.some((t) => t.kind === 'flavor' && t.value === f) || (q !== '' && f.includes(q));
  return [...flavors.filter(hit), ...flavors.filter((f) => !hit(f))];
}

function CatalogScreen({ query, setQuery, filters, onRemoveFilter, onOpenFilters, results, onOpen, onReset }) {
  const last = filters[filters.length - 1];
  const lastLabel = last ? filterLabel(last) : query.trim();
  const dirty = Boolean(query.trim()) || filters.length > 0;
  return (
    <section className="aroma-catalog">
      <div className="aroma-catalog-rail">
        <div className="aroma-catalog-search-row">
          <input type="search" className="aroma-catalog-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Микс, вкус, табак" aria-label="Поиск по каталогу" enterKeyHint="search" autoComplete="off" />
          <button type="button" className={'aroma-catalog-filter-btn' + (filters.length ? ' aroma-catalog-filter-btn-on' : '')} onClick={onOpenFilters} aria-label={filters.length ? 'Фильтры, выбрано ' + filters.length : 'Фильтры'}>
            <FiltersIcon />
            <span>Фильтры</span>
            {filters.length ? <span className="aroma-catalog-filter-count">{filters.length}</span> : null}
          </button>
        </div>
        {filters.length ? (
          <div className="aroma-catalog-tags" role="group" aria-label="Выбранные фильтры">
            {filters.map((tag) => (
              <AromaChip key={tag.kind + '-' + tag.value} active profile={tag.kind === 'profile' ? tag.value : undefined} onClick={() => onRemoveFilter(tag)}>
                {filterLabel(tag)}<span className="aroma-catalog-tag-x" aria-hidden>×</span>
              </AromaChip>
            ))}
          </div>
        ) : null}
      </div>

      <div className="aroma-catalog-meta">
        <p className="aroma-caps">{'Найдено · ' + results.length}</p>
        {dirty && results.length ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
      </div>

      {!results.length ? (
        <div className="aroma-catalog-empty">
          <p className="guest-status">По выбранным фильтрам ничего не найдено. Даже мастер развёл руками.</p>
          <div className="aroma-catalog-empty-actions">
            {lastLabel ? <button type="button" className="aroma-ghost-sm" onClick={() => (last ? onRemoveFilter(last) : setQuery(''))}>{'Убрать «' + lastLabel + '»'}</button> : null}
            <button type="button" className="aroma-skip" onClick={onReset}>Сбросить всё</button>
          </div>
        </div>
      ) : null}
      <div className="aroma-catalog-list">
        {results.map((mix) => (
          <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={flavorsMatchedFirst(mix.flavors, query, filters)} rating={guestRating(mix)} glyphSize={36} style={{ padding: '7px 12px' }} onClick={() => onOpen(mix, 'catalog')} />
        ))}
      </div>
    </section>
  );
}

// Шторка «Фильтры» — разметка карточки микса; выбор применяется сразу, CTA только закрывает.
function CatalogFiltersSheet({ filters, onToggle, onReset, resultCount, onClose }) {
  const [find, setFind] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  // Как availableProfileOptions в приложении: только характеры, которые есть в каталоге.
  const profiles = byCountDesc(Object.keys(M.profileLabels).filter((p) => profileCounts[p]), profileCounts, label);
  const flavors = byCountDesc(M.flavors, flavorCounts);
  const f = find.trim().toLowerCase();
  const visibleFlavors = f ? flavors.filter((x) => x.includes(f)) : showAll ? flavors : flavors.slice(0, SHEET_FLAVOR_LIMIT);
  const isOn = (tag) => filters.some((t) => sameFilter(t, tag));
  const chip = (tag, count) => (
    <AromaChip key={tag.value} active={isOn(tag)} profile={tag.kind === 'profile' ? tag.value : undefined} onClick={() => onToggle(tag)}>
      {filterLabel(tag)}<span className="aroma-catalog-chip-count">{count}</span>
    </AromaChip>
  );
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label="Фильтры" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-catalog-sheet-head">
          <h2 className="aroma-sheet-title">Фильтры</h2>
          {filters.length ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Характер</p>
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Характер">
            {profiles.map((p) => chip({ kind: 'profile', value: p }, profileCounts[p] || 0))}
          </div>
        </section>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Вкусы</p>
          <input type="search" className="aroma-catalog-sheet-search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Найти вкус" aria-label="Найти вкус" enterKeyHint="search" autoComplete="off" />
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Вкусы">
            {visibleFlavors.map((v) => chip({ kind: 'flavor', value: v }, flavorCounts[v] || 0))}
          </div>
          {f && !visibleFlavors.length ? <p className="aroma-catalog-sheet-hint">Такого вкуса в каталоге нет.</p> : null}
          {!f && !showAll && flavors.length > SHEET_FLAVOR_LIMIT ? (
            <button type="button" className="aroma-skip aroma-catalog-sheet-more" onClick={() => setShowAll(true)}>{'Все ' + flavors.length + ' вкусов'}</button>
          ) : null}
        </section>
        <AromaCTA disabled={!resultCount} onClick={onClose}>{resultCount ? 'Показать ' + resultCount + ' ' + plural(resultCount) : 'Ничего не найдено'}</AromaCTA>
      </section>
    </div>
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
          <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={guestRating(mix)} glyphSize={60} onClick={() => onOpen(mix, 'rail')} />
        ))}
      </div>
    </section>
  );
}

// Сердечко (#151): не акцентное — выключено --text-muted, включено кремовое с заливкой.
function HeartButton({ on, onClick }) {
  return (
    <button type="button" className="heart-btn" aria-pressed={on} aria-label={on ? 'Убрать из избранного' : 'В избранное'} onClick={onClick}>
      <Icon name="Heart" size={22} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

function MixSheet({ state, rating, onRate, onClose, onChoose, favorite = false, onFavorite }) {
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
          {onFavorite ? <HeartButton on={favorite} onClick={() => onFavorite(mix)} /> : null}
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

Object.assign(window, { Icon, AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, CatalogFiltersSheet, RailScreen, MixSheet, ConfirmationScreen, GuestSelectedBar: function ({ mix, source, onOpen }) {
  return (
    <div className="aroma-selected-shell">
      <GuestCard compact title="Карточка для мастера" style={{ display: 'grid', gap: 10 }}>
        <p className="aroma-selected-text">{mix.name + ' · ' + sourceLabel[source]}</p>
        <button type="button" className="aroma-ghost-sm" onClick={onOpen}>Открыть карточку</button>
      </GuestCard>
    </div>
  );
} });
