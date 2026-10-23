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

// markSrc — путь к знаку от страницы, которая подключает кит (мокапы в design/ лежат глубже).
function AccessScreen({ code, setCode, ageOk, setAgeOk, error, onSubmit, markSrc = '../../assets/logo-mark-oxblood.svg' }) {
  const ready = code.length >= 4 && ageOk;
  return (
    <section className="aroma-access">
      <div className="aroma-access-body">
        <div>
          <img className="aroma-access-mark" src={markSrc} width="64" height="64" alt="" aria-hidden />
          <span className="aroma-access-brand">Арома<br />Ателье</span>
          <p className="aroma-access-tagline">Подбор кальянных миксов</p>
        </div>
        <form className="aroma-access-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <AccessCodeInput value={code} onChange={setCode} hint="Код скажет мастер зала. Он действует до конца суток." />
          <label className="aroma-access-age">
            <button type="button" role="checkbox" aria-checked={ageOk} className={'aroma-access-age-dot' + (ageOk ? ' on' : '')} onClick={() => setAgeOk(!ageOk)}>{ageOk ? <span aria-hidden>✓</span> : null}</button>
            <span className="aroma-access-age-text">Мне есть 18. Понимаю, что курение вредит здоровью.</span>
          </label>
          <AromaCTA type="submit" disabled={!ready}>Войти в Ателье</AromaCTA>
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
  return (
    <div className="aroma-intro">
      <div className="aroma-intro-body">
        <h1 className="aroma-intro-title">{card.title}</h1>
        <p className="aroma-intro-text">{card.description}</p>
      </div>
      <div className="aroma-intro-dock">
        <div className="aroma-intro-pips" aria-label={'Шаг ' + (index + 1) + ' из ' + cards.length}>
          {cards.map((_, i) => <span key={i} className={'aroma-intro-pip' + (i === index ? ' on' : '')} aria-hidden />)}
        </div>
        <AromaCTA onClick={onNext}>{isLast ? 'Перейти к подбору' : 'Дальше'}</AromaCTA>
        {!isLast ? <button type="button" className="aroma-skip" onClick={onSkip}>Пропустить знакомство</button> : null}
      </div>
    </div>
  );
}

// Как в приложении: внутри профилей и внутри вкусов — «или», между ними — «и».
const matchingMixes = (profiles, flavors) => M.mixes
  .filter((m) => !profiles.length || m.flavorProfiles.some((p) => profiles.includes(p)))
  .filter((m) => !flavors.length || m.flavors.some((f) => flavors.includes(f)));

function OnboardingScreen({ step, profiles, flavors, toggleProfile, toggleFlavor, onNext, onSkip }) {
  // Вкус бледный, если его нет ни в одном миксе с выбранными профилями.
  const reachable = new Set(matchingMixes(profiles, []).flatMap((m) => m.flavors));
  const count = matchingMixes(profiles, step === 2 ? flavors : []).length;
  return (
    <div className="aroma-onboarding">
      <div className="aroma-onboarding-body">
        {step === 1 ? (
          <>
            <h1 className="aroma-onboarding-title">С чего начнём?</h1>
            <p className="aroma-onboarding-hint">Можно выбрать несколько.</p>
            <div className="aroma-profile-grid">
              {Object.keys(M.profileLabels).map((id) => (
                <ProfileCard key={id} profile={id} label={label(id)} active={profiles.includes(id)} onClick={() => toggleProfile(id)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="aroma-onboarding-title">Любимые ноты</h1>
            <p className="aroma-onboarding-hint">Можно пропустить. Бледные вкусы не встречаются в миксах с выбранными профилями.</p>
            <div className="aroma-flavor-wrap">
              {M.flavors.map((f) => (
                <AromaChip key={f} active={flavors.includes(f)} disabled={!reachable.has(f) && !flavors.includes(f)} onClick={() => toggleFlavor(f)}>{f}</AromaChip>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="aroma-onboarding-dock">
        <p className="aroma-onboarding-count">{count ? (count === 1 ? 'Подходит 1 микс' : 'Подходят ' + count + ' ' + plural(count)) : 'Под такой набор миксов нет. Снимите один из вкусов.'}</p>
        <AromaCTA disabled={!count} onClick={onNext}>{step === 1 ? 'Далее' : 'Показать подбор'}</AromaCTA>
        <button type="button" className="aroma-skip" onClick={onSkip}>Открыть каталог сразу</button>
      </div>
    </div>
  );
}

// Приглашение в «Намиксуй»: полосой на Витрине, строкой с пояснением в конце Подбора. Без глифа: профилей у него нет.
function MixerInvite({ onOpen, note }) {
  return (
    <button type="button" className="aroma-mixer-invite" onClick={onOpen}>
      <span className="aroma-mixer-invite-text">
        <span className="aroma-mixer-invite-title">Собрать свой микс</span>
        {note ? <span className="aroma-mixer-invite-note">Из табаков, которые сегодня есть на полках.</span> : null}
      </span>
      <Icon name="ChevronRight" size={20} />
    </button>
  );
}

const choices = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'выбор'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'выбора'; return 'выборов'; };

function RecommendationsScreen({ mixes, onOpen, onChoose, onOpenOnboarding, onOpenCatalog, onOpenMixer }) {
  if (!mixes.length) {
    return (
      <section className="aroma-recs-empty">
        <h1 className="aroma-empty-title">Ничего не найдено</h1>
        <div className="aroma-empty-actions">
          <AromaCTA onClick={onOpenOnboarding}>Изменить вкусы</AromaCTA>
          <button type="button" className="aroma-skip" onClick={onOpenCatalog}>Открыть каталог</button>
        </div>
      </section>
    );
  }
  const [hero, ...rest] = mixes;
  return (
    <section className="aroma-recs">
      <div className="aroma-recs-head">
        <button type="button" className="aroma-ghost-sm" onClick={onOpenOnboarding}>Изменить вкусы</button>
      </div>
      <article className="aroma-recs-hero">
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
          <span className="aroma-recs-hero-count">{hero.popularity + ' ' + choices(hero.popularity)}</span>
        </div>
        <AromaCTA onClick={() => onChoose(hero, 'recommendations')}>Покурить</AromaCTA>
      </article>
      {rest.length ? (
        <>
          <h2 className="aroma-section-title">Тоже подходят</h2>
          <div className="aroma-list">
            {rest.slice(0, 4).map((mix) => (
              <MixRow key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={guestRating(mix)} showGlyph={false} onClick={() => onOpen(mix, 'recommendations')} />
            ))}
          </div>
        </>
      ) : null}
      {onOpenMixer ? <MixerInvite onOpen={onOpenMixer} note /> : null}
    </section>
  );
}

// Полки по образцу Okko (#175): заголовок с шевроном открывает подборку, под ним лента постеров.
function ShowcaseScreen({ onOpen, onOpenRail, onOpenMixer }) {
  return (
    <section className="aroma-showcase">
      {onOpenMixer ? <div className="aroma-showcase-invite"><MixerInvite onOpen={onOpenMixer} /></div> : null}
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
// Счётчики нужны только для порядка чипов: частые первыми. На самих чипах чисел нет.
const countBy = (pick) => M.mixes.reduce((acc, mix) => { pick(mix).forEach((v) => { acc[v] = (acc[v] || 0) + 1; }); return acc; }, {});
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

      {results.length ? (
        <div className="aroma-catalog-meta">
          <p className="aroma-catalog-count">{results.length + ' ' + plural(results.length)}</p>
          {dirty ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
        </div>
      ) : null}

      {!results.length ? (
        <div className="aroma-catalog-empty">
          <p className="guest-status">{last ? 'Ничего не найдено. Уберите один из фильтров.' : 'Ничего не найдено. Измените запрос.'}</p>
          <div className="aroma-catalog-empty-actions">
            {last ? <button type="button" className="aroma-ghost-sm" onClick={() => onRemoveFilter(last)}>{'Убрать: ' + filterLabel(last)}</button> : null}
            <button type="button" className={last ? 'aroma-skip' : 'aroma-ghost-sm'} onClick={onReset}>{last ? 'Сбросить всё' : 'Очистить поиск'}</button>
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
  // Считаются при рендере: в _ds_bundle.js этот файл исполняется раньше mock-data.js.
  const profileCounts = countBy((mix) => mix.flavorProfiles);
  const flavorCounts = countBy((mix) => mix.flavors);
  const profiles = byCountDesc(Object.keys(M.profileLabels).filter((p) => profileCounts[p]), profileCounts, label);
  const flavors = byCountDesc(M.flavors, flavorCounts);
  const f = find.trim().toLowerCase();
  const visibleFlavors = f ? flavors.filter((x) => x.includes(f)) : showAll ? flavors : flavors.slice(0, SHEET_FLAVOR_LIMIT);
  const isOn = (tag) => filters.some((t) => sameFilter(t, tag));
  const chip = (tag) => (
    <AromaChip key={tag.value} active={isOn(tag)} profile={tag.kind === 'profile' ? tag.value : undefined} onClick={() => onToggle(tag)}>
      {filterLabel(tag)}
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
          <h3 className="aroma-label">Характер</h3>
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Характер">
            {profiles.map((p) => chip({ kind: 'profile', value: p }))}
          </div>
        </section>
        <section className="aroma-sheet-block">
          <h3 className="aroma-label">Вкусы</h3>
          <input type="search" className="aroma-catalog-sheet-search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Найти вкус" aria-label="Найти вкус" enterKeyHint="search" autoComplete="off" />
          <div className="aroma-catalog-sheet-chips" role="group" aria-label="Вкусы">
            {visibleFlavors.map((v) => chip({ kind: 'flavor', value: v }))}
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
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label={mix.name} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
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
          <h3 className="aroma-label">Состав</h3>
          <CompositionStack components={mix.components} />
        </section>
        <section className="aroma-sheet-block">
          <h3 className="aroma-label">Ваша оценка</h3>
          <div className="aroma-stars" role="group" aria-label="Оценка микса">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className={'aroma-star' + (rating >= v ? ' on' : '')} onClick={() => onRate(v)} aria-label={'Оценить на ' + v}>★</button>
            ))}
          </div>
          {rating ? <p className="guest-ok">{'Оценка ' + rating + ' сохранена.'}</p> : null}
        </section>
        <div className="aroma-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>{source === 'reels' ? 'К рилсам' : 'Закрыть'}</button>
          <AromaCTA pulse onClick={() => onChoose(mix, source)}>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

// ── Рилсы (#153) ──
// Сознательное исключение из VISUAL FOUNDATIONS: линейные мотивы и анимированный фон — только в разделе «Рилсы»
// и в кружках полосы над Подбором. Сцены здесь — CSS-приближение мокапа design/design_handoff_reels/,
// в приложении это композиции Remotion в @remotion/player.

// Правило выбора сцены: профили у миксов раздуты и не упорядочены по силе, поэтому сцена берётся из flavors.
const MOTIFS = {
  frost: { profile: 'minty', alt: 'fresh', words: ['холодок', 'мята', 'ментол', 'лёд', 'лед', 'ледян'] },
  bloom: { profile: 'floral_herbal', alt: 'perfume', words: ['цветочн', 'лаванда', 'ромашка', 'роза', 'бузина', 'жасмин', 'хвойн', 'базилик', 'тархун', 'травян', 'можжевельник', 'чай'] },
  juicy: { profile: 'citrus', alt: 'fruity', words: ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот', 'ананас', 'манго', 'банан', 'киви', 'персик', 'яблоко', 'груша', 'арбуз', 'дыня', 'кокос', 'марула', 'кола', 'энергетик', 'огурец'] },
  berry: { profile: 'berry', alt: 'fruity', words: ['малина', 'клубника', 'черника', 'вишня', 'ежевика', 'голубика', 'клюква', 'смородина', 'барбарис', 'виноград', 'ягод', 'ревень'] },
  warm: { profile: 'dessert', alt: 'spicy', words: ['ваниль', 'шоколад', 'какао', 'печенье', 'пирог', 'чизкейк', 'тирамису', 'молоко', 'булочка', 'корица', 'кардамон', 'перец', 'кашмир', 'мед', 'мёд', 'орех', 'орчата', 'ром', 'жвачка'] },
  smoke: { profile: 'tobacco', alt: 'spicy', words: ['табачн', 'сигар', 'бекон', 'томат', 'копчен'] },
};
const CITRUS = ['лимон', 'лайм', 'грейпфрут', 'апельсин', 'мандарин', 'бергамот'];
const SPICE = ['корица', 'кардамон', 'перец', 'кашмир'];
const PROFILE_TO_MOTIF = { minty: 'frost', fresh: 'frost', floral_herbal: 'bloom', perfume: 'bloom', citrus: 'juicy', fruity: 'juicy', sour: 'juicy', berry: 'berry', dessert: 'warm', sweet: 'warm', spicy: 'warm', tobacco: 'smoke' };
const profileVar = (profile) => 'var(--profile-' + profile.replace('_', '-') + ')';
const hits = (flavors, words) => flavors.filter((f) => words.some((w) => f.toLowerCase().includes(w)));

function pickScene(mix) {
  const scored = Object.entries(MOTIFS)
    .map(([id, motif]) => {
      const found = hits(mix.flavors, motif.words);
      return { id, count: found.length, first: found.length ? mix.flavors.indexOf(found[0]) : 99 };
    })
    .filter((m) => m.count)
    // Холод перебивает всё: самое яркое ощущение.
    .sort((a, b) => (b.id === 'frost') - (a.id === 'frost') || b.count - a.count || a.first - b.first);
  const primary = scored[0] ? scored[0].id : PROFILE_TO_MOTIF[mix.flavorProfiles[0]] || 'smoke';
  const secondary = scored[1] ? scored[1].id : null;
  const colorOf = (id) => {
    if (id === 'juicy') return hits(mix.flavors, CITRUS).length ? 'citrus' : 'fruity';
    if (id === 'warm') return hits(mix.flavors, SPICE).length >= hits(mix.flavors, MOTIFS.warm.words).length / 2 ? 'spicy' : 'dessert';
    return MOTIFS[id].profile;
  };
  return { primary, secondary, c1: colorOf(primary), c2: secondary ? colorOf(secondary) : MOTIFS[primary].alt };
}

// Детерминированный шум: один и тот же микс всегда выглядит одинаково (в Remotion — random(seed) с seed = mix.id).
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Мотивы стиля B: штрих 1,2–1,4 в цвете профиля, без заливки, как у знака «Дым».
const SHAPES = {
  frost: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">{[0, 60, 120].map((r) => <g key={r} transform={'rotate(' + r + ')'}><path d="M0 -11V11" /><path d="M-3 -8L0 -5L3 -8M-3 8L0 5L3 8" /></g>)}</svg>,
  bloom: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M0 -11C6 -5 6 5 0 11C-6 5 -6 -5 0 -11Z" /><path d="M0 -8V8" strokeLinecap="round" /></svg>,
  juicy: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle r="10" /><circle r="7.5" />{[0, 60, 120].map((r) => <path key={r} d="M0 -7.5V7.5" transform={'rotate(' + r + ')'} />)}</svg>,
  berry: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="-4" cy="2" r="5" /><circle cx="4" cy="3" r="5" /><circle cx="0" cy="-4" r="5" /></svg>,
  warm: <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M0 8V-8" /></svg>,
  smoke: <svg viewBox="0 0 40 120" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M20 118C4 96 36 78 20 58C6 40 32 22 22 2" /></svg>,
};
const PARTICLES = {
  frost: { n: 26, size: [10, 18], y: [-8, 10] },
  bloom: { n: 12, size: [14, 22], y: [70, 100] },
  juicy: { n: 16, size: [16, 26], y: [80, 105] },
  berry: { n: 16, size: [16, 24], y: [10, 60] },
  warm: { n: 26, size: [12, 18], y: [85, 105] },
  smoke: { n: 7, size: [30, 44], y: [70, 100] },
};
// Бесшовный цикл около 6 с; струи дыма прорисовываются вдвое медленнее.
const CYCLE = 6;

function particles(motif, rand, color, count) {
  const cfg = PARTICLES[motif];
  const [lo, hi] = cfg.size;
  return Array.from({ length: count || cfg.n }, (_, i) => {
    const s = lo + rand() * (hi - lo);
    const style = {
      '--x': (rand() * 100).toFixed(1) + '%',
      '--y': (cfg.y[0] + rand() * (cfg.y[1] - cfg.y[0])).toFixed(1) + '%',
      '--s': Math.round(motif === 'smoke' ? s * 3 : s) + 'px',
      '--dl': (-rand() * CYCLE).toFixed(2) + 's',
      '--d': CYCLE * (motif === 'smoke' ? 2 : 1) + 's',
      '--dx': Math.round((rand() - 0.5) * 80) + 'px',
      '--pc': profileVar(color),
    };
    if (motif === 'smoke') style.width = Math.round(s) + 'px';
    return <span key={motif + i} className={'p m-' + motif} style={style}>{SHAPES[motif]}</span>;
  });
}

function Scene({ mix, playing = true }) {
  const { primary, secondary, c1, c2 } = pickScene(mix);
  const rand = seeded(mix.id);
  return (
    <div className={'scene' + (playing ? '' : ' scene-paused')} style={{ '--c1': profileVar(c1), '--c2': profileVar(c2) }} aria-hidden>
      {primary === 'frost' ? <span className="frost-rim" /> : null}
      {primary === 'bloom' ? (
        <span className="bloom-core">
          {[0, 72, 144, 216, 288].map((r, i) => <span key={r} className="bloom-petal" style={{ rotate: r + 'deg', animationDelay: -i * 0.4 + 's' }} />)}
        </span>
      ) : null}
      {primary === 'juicy' ? <span className="juicy-ring" /> : null}
      {primary === 'warm' ? <span className="warm-glow" /> : null}
      {particles(primary, rand, c1)}
      {secondary ? particles(secondary, rand, c2, Math.ceil(PARTICLES[secondary].n / 3)) : null}
    </div>
  );
}

// Полоса превью над Подбором: первые восемь миксов ленты, статичный кадр сцены в кружке 60px.
function ReelStrip({ mixes, onOpen }) {
  return (
    <div className="reel-strip" role="list" aria-label="Рилсы">
      {mixes.slice(0, 8).map((mix, i) => (
        <button key={mix.id} type="button" role="listitem" className="reel-strip-item" onClick={() => onOpen(i)}>
          <span className="reel-strip-thumb"><Scene mix={mix} playing={false} /></span>
          <span className="reel-strip-name">{mix.name}</span>
        </button>
      ))}
    </div>
  );
}


function Reel({ mix, index, total, active, paused, hint, favorite, onFavorite, onTogglePause, onOpen, onChoose }) {
  return (
    <section className="reel" aria-label={mix.name}>
      <Scene mix={mix} playing={active && !paused} />
      <button type="button" className="reel-tap" aria-label={paused ? 'Продолжить' : 'Пауза'} onClick={onTogglePause} />
      {paused ? <span className="reel-paused"><Icon name="Play" size={22} /></span> : null}
      <div className={'reel-dock' + (active ? ' reel-reveal' : '')} key={active ? 'on' : 'off'}>
        {hint ? <span className="reel-hint"><Icon name="ChevronUp" size={18} />Листайте вверх</span> : null}
        <div className="reel-name-row">
          <h2 className="reel-name">{mix.name}</h2>
          <HeartButton on={favorite} onClick={() => onFavorite(mix)} />
        </div>
        <p className="reel-flavors">{mix.flavors.join(', ')}</p>
        {mix.ratingsCount ? <div><RatingPill rating={mix.avgRating} /></div> : null}
        <CompositionStack components={mix.components} showBar={false} />
        <div className="reel-actions">
          <button type="button" className="aroma-ghost" onClick={() => onOpen(mix, 'reels')}>Подробнее</button>
          <AromaCTA onClick={() => onChoose(mix, 'reels')}>Покурить</AromaCTA>
        </div>
      </div>
    </section>
  );
}

// Лента: вертикальный свайп со снапом, один жест — один рилс. Играет только активный рилс,
// соседи — статичный кадр, дальше — пустые слоты той же высоты.
function ReelsScreen({ mixes, start = 0, favoriteIds, onFavorite, onOpen, onChoose }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(start);
  const [paused, setPaused] = React.useState(false);
  const [swiped, setSwiped] = React.useState(false);

  React.useEffect(() => {
    const root = ref.current;
    root.scrollTop = start * root.clientHeight;
    // Первый вызов observer — стартовый рилс, это ещё не свайп.
    let initial = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || initial) return;
        setActive(Number(e.target.dataset.i));
        setPaused(false);
        setSwiped(true);
      });
      initial = false;
    }, { root, threshold: 0.6 });
    root.querySelectorAll('[data-i]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="reels" ref={ref}>
      {mixes.map((mix, i) => (
        <div key={mix.id} data-i={i} className="reel-slot">
          {Math.abs(i - active) <= 1 ? (
            <Reel
              mix={mix}
              index={i}
              total={mixes.length}
              active={i === active}
              paused={i === active && paused}
              hint={i === start && !swiped}
              favorite={favoriteIds.includes(mix.id)}
              onFavorite={onFavorite}
              onTogglePause={() => setPaused(!paused)}
              onOpen={onOpen}
              onChoose={onChoose}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ConfirmationScreen({ mix, onDone }) {
  return (
    <section className="aroma-confirm">
      <div className="aroma-confirm-topbar">
        <p className="aroma-confirm-note">Покажите мастеру</p>
        <button type="button" className="aroma-confirm-done" onClick={onDone}>Готово</button>
      </div>
      <div className="aroma-confirm-stack">
        <ProfileGlyph profiles={mix.flavorProfiles} size={96} />
        <h1 className="aroma-confirm-title">{mix.name}</h1>
        <p className="aroma-confirm-profiles">{mix.flavorProfiles.map((p, i) => (i ? label(p).toLowerCase() : label(p))).join(', ')}</p>
        <SignatureBar profiles={mix.flavorProfiles} height={3} />
      </div>
      <section className="aroma-confirm-composition" aria-label="Состав">
        <CompositionStack components={mix.components} showBar={false} />
      </section>
      <button type="button" className="aroma-ghost aroma-confirm-rate" onClick={onDone}>Оценить, когда соберут</button>
    </section>
  );
}

Object.assign(window, { Icon, MixerInvite, AccessScreen, IntroScreen, OnboardingScreen, RecommendationsScreen, ShowcaseScreen, CatalogScreen, CatalogFiltersSheet, RailScreen, MixSheet, ReelStrip, ReelsScreen, ConfirmationScreen });
