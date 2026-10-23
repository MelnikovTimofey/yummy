// Доска «было / стало» гостевой поверхности (#348).
// Было: снимки прода из screens/. Стало: экраны гостевого UI-кита после перевода на канон
// (.claude/skills/aroma-atelier-design/ui_kits/aroma-guest/GuestScreens.jsx) и два экрана,
// которых в ките нет: Миксер и кабинет без входа. Они собраны здесь из примитивов бандла.
const GB = window.DesignSystem_1aef33;
const { AromaCTA, AromaChip, OnboardingProgress } = GB;
const MOCK = window.AROMA_MOCK;
const mixOf = (id) => MOCK.mixes.find((mix) => mix.id === id);

// То же правило, что в GuestApp.jsx: совпадение профилей ×3, вкусов ×2, плюс популярность.
function recommend(profiles, flavors) {
  return MOCK.mixes
    .map((mix) => {
      const p = mix.flavorProfiles.filter((x) => profiles.includes(x)).length;
      const f = mix.flavors.filter((x) => flavors.includes(x)).length;
      return { mix, score: p * 3 + f * 2 + mix.popularity / 500 };
    })
    .filter((x) => (profiles.length || flavors.length ? x.score > 0.4 : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.mix);
}
const RECS = recommend(['berry', 'fresh'], []);
const FEED = [...RECS, ...MOCK.mixes.filter((mix) => !RECS.includes(mix))];
const noop = () => {};
const MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';

// ── Оболочка телефона: шапка и нижняя панель как в GuestApp.jsx ──

const NAV = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];

function Nav({ value }) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {NAV.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined}>
          <window.Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function Topbar({ masterCard = false, children }) {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src={MARK} alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
        {masterCard ? (
          <button type="button" className="topbar-icon-btn topbar-master-card" aria-label="Карточка для мастера" title="Карточка для мастера">
            <window.Icon name="ClipboardList" size={20} />
            <span className="topbar-master-card-dot" aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </header>
  );
}

function Phone({ children }) {
  return <div className="phone-shell">{children}</div>;
}

// ── Экраны из кита ──

function GatePhone() {
  const [code, setCode] = React.useState('');
  const [ageOk, setAgeOk] = React.useState(false);
  return (
    <Phone>
      <window.AccessScreen code={code} setCode={setCode} ageOk={ageOk} setAgeOk={setAgeOk} error="" onSubmit={noop} markSrc={MARK} />
    </Phone>
  );
}

function OnboardingPhone({ step, initialProfiles, initialFlavors = [] }) {
  const [profiles, setProfiles] = React.useState(initialProfiles);
  const [flavors, setFlavors] = React.useState(initialFlavors);
  const toggle = (setter) => (value) => setter((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  return (
    <Phone>
      <Topbar>
        <OnboardingProgress step={step} total={2} onBack={noop} />
      </Topbar>
      <main className="content">
        <window.OnboardingScreen step={step} profiles={profiles} flavors={flavors} toggleProfile={toggle(setProfiles)} toggleFlavor={toggle(setFlavors)} onNext={noop} onSkip={noop} />
      </main>
    </Phone>
  );
}

function RecsPhone({ sheetMix }) {
  const [sheet, setSheet] = React.useState(sheetMix ? { mix: sheetMix, source: 'recommendations' } : null);
  const [rating, setRating] = React.useState(0);
  const [fav, setFav] = React.useState(false);
  return (
    <Phone>
      <Topbar />
      <main className="content">
        <window.ReelStrip mixes={FEED} onOpen={noop} />
        <window.RecommendationsScreen mixes={RECS} onOpen={(mix, source) => setSheet({ mix, source })} onChoose={noop} onOpenOnboarding={noop} onOpenCatalog={noop} onOpenMixer={noop} />
      </main>
      <Nav value="recommendations" />
      <window.MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={noop} favorite={fav} onFavorite={() => setFav(!fav)} />
    </Phone>
  );
}

function MasterPhone() {
  return (
    <Phone>
      <window.ConfirmationScreen mix={mixOf('m11')} onDone={noop} />
    </Phone>
  );
}

function ShowcasePhone() {
  return (
    <Phone>
      <Topbar />
      <main className="content">
        <window.ShowcaseScreen onOpen={noop} onOpenRail={noop} onOpenMixer={noop} />
      </main>
      <Nav value="showcase" />
    </Phone>
  );
}

function RailPhone() {
  const [filters, setFilters] = React.useState([]);
  const rail = MOCK.rails.find((r) => r.id === 'r2');
  const toggleFilter = (p) => setFilters((cur) => (p === null ? [] : cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  return (
    <Phone>
      <main className="content">
        <window.RailScreen rail={rail} filters={filters} toggleFilter={toggleFilter} onBack={noop} onOpen={noop} />
      </main>
      <Nav value="showcase" />
    </Phone>
  );
}

function CatalogPhone({ initialQuery }) {
  const [query, setQuery] = React.useState(initialQuery);
  const q = query.trim().toLowerCase();
  const results = MOCK.mixes
    .filter((m) => !q || [m.name, ...m.flavors, ...m.components.map((c) => c.name)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return (
    <Phone>
      <Topbar />
      <main className="content">
        <window.CatalogScreen query={query} setQuery={setQuery} filters={[]} onRemoveFilter={noop} onOpenFilters={noop} results={results} onOpen={noop} onReset={() => setQuery('')} />
      </main>
      <Nav value="catalog" />
    </Phone>
  );
}

function ReelPhone() {
  return (
    <Phone>
      <window.ReelsScreen mixes={FEED} start={0} favoriteIds={[]} onFavorite={noop} onOpen={noop} onChoose={noop} />
      <Nav value="reels" />
    </Phone>
  );
}

// ── Кабинет без входа: в ките его нет, разметка по CabinetAnon.tsx ──

function CabinetPhone() {
  const [consent, setConsent] = React.useState(false);
  return (
    <Phone>
      <Topbar />
      <main className="content">
        <section className="cab-anon">
          <h1 className="cab-anon-title">Кабинет</h1>
          <p className="cab-anon-text">Сохраним историю выборов и избранное. Подбор будет их учитывать.</p>
          <p className="cab-anon-note">Кабинет работает только в этом заведении.</p>
          <div className="cab-anon-form">
            <div className="aroma-access-age">
              <button type="button" role="checkbox" aria-checked={consent} aria-labelledby="gb-consent" className={'aroma-access-age-dot' + (consent ? ' on' : '')} onClick={() => setConsent(!consent)}>
                {consent ? <span aria-hidden>✓</span> : null}
              </button>
              <span className="aroma-access-age-text">
                <span id="gb-consent" onClick={() => setConsent(!consent)}>Согласен на обработку Telegram id для истории и избранного.</span>{' '}
                <a className="cab-link" href="#policy">Политика</a>
              </span>
            </div>
            <AromaCTA disabled={!consent}>Войти через Telegram</AromaCTA>
          </div>
        </section>
      </main>
      <Nav value="cabinet" />
    </Phone>
  );
}

// ── Миксер: в ките заглушка, разметка по MixerScreen.tsx, TobaccoCard.tsx и MixerReveal.tsx ──
// Табаки и доли те же, что на снимках прода, чтобы пары сравнивались один к одному.

const TOBACCO = {
  pastille: { brand: 'Starline', name: 'Мятная пастилка', profiles: ['dessert', 'fresh'], flavors: ['жвачка', 'мята'], cooling: true },
  carolina: { brand: 'Overdose', name: 'Carolina', profiles: ['tobacco'], flavors: ['табачный'] },
  roll: { brand: 'MustHave', name: 'Cinnamon Roll', profiles: ['dessert', 'spicy'], flavors: ['булочка', 'корица'] },
  cola: { brand: 'Darkside', name: 'Cola', profiles: ['sweet'], flavors: ['кола'] },
  wild: { brand: 'Darkside', name: 'Wildberry', profiles: ['berry'], flavors: ['лесные ягоды'] },
};
const pvar = (profile) => 'var(--profile-' + profile.replace('_', '-') + ')';
const labelOf = (p) => MOCK.profileLabels[p] || p;
const profileLine = (t) => t.profiles.slice(0, 2).map((p, i) => (i ? labelOf(p).toLowerCase() : labelOf(p))).join(', ');

function MixerTop({ done }) {
  return (
    <>
      <header className="mx-topbar">
        <button type="button" className="mx-icon-btn" aria-label="Назад">←</button>
        <h1 className="mx-title">Намиксуй</h1>
        <span aria-hidden />
      </header>
      <div className="mx-progress">
        {done ? null : (
          <div className="mx-progress-row">
            <span className="mx-progress-step">Ход 1 из 3</span>
            <span className="mx-progress-role">Основа, <span>40–70%</span></span>
          </div>
        )}
        <div className="mx-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={done ? 3 : 0}>
          <span style={{ width: done ? '100%' : '0%' }} />
        </div>
      </div>
    </>
  );
}

// Кольцо чаши: дуги в цвете ведущего профиля табака. Гало под кольцом нет.
function Ring({ parts, size, center }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const gap = parts.length > 1 ? 4 : 0;
  let offset = 0;
  return (
    <div className="mx-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 188 188" aria-hidden>
        <circle cx="94" cy="94" r={r} fill="none" stroke="var(--line)" strokeWidth="22" />
        {parts.map((part, i) => {
          const full = (c * part.share) / 100;
          const el = <circle key={i} cx="94" cy="94" r={r} fill="none" stroke={pvar(part.t.profiles[0])} strokeWidth="22" strokeDasharray={Math.max(0, full - gap) + ' ' + c} strokeDashoffset={-offset} transform="rotate(-90 94 94)" />;
          offset += full;
          return el;
        })}
      </svg>
      <div className="mx-ring-center">{center}</div>
    </div>
  );
}

function TobaccoCard({ t, pos, match }) {
  return (
    <div className="mx-card" data-pos={pos} aria-hidden={pos ? true : undefined}>
      <span className="mx-card-profile"><span className="mx-dot" style={{ background: pvar(t.profiles[0]) }} aria-hidden />{profileLine(t)}</span>
      <span className="mx-card-brand">{t.brand}</span>
      <span className="mx-card-name">{t.name}</span>
      <span className="mx-card-flavors">{t.flavors.join(', ')}</span>
      <div className="mx-card-foot">
        {match.value ? (
          <div className="mx-card-match"><b>{match.value}</b><span>{match.caption}</span></div>
        ) : (
          <span className="mx-card-caption">{match.caption}</span>
        )}
        {t.cooling ? <span className="mx-card-tag">холодок</span> : null}
      </div>
    </div>
  );
}

function MixerTurnPhone() {
  const [shelves, setShelves] = React.useState(['spicy', 'minty']);
  const all = ['spicy', 'minty', 'dessert', 'fresh', 'tobacco', 'citrus'];
  const toggle = (p) => setShelves((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  return (
    <Phone>
      <section className="mx">
        <MixerTop />
        <div className="mx-swipe">
          <div className="mx-bowl-row">
            <Ring parts={[]} size={96} center={null} />
            <p className="mx-bowl-hint">Гармония появится после основы</p>
          </div>
          <div className="mx-filters">
            <div className="mx-filters-head">
              <h2 className="aroma-label">Полки</h2>
              <span className="mx-filters-count">21 табак из вашего подбора</span>
            </div>
            <div className="mx-shelves" role="group" aria-label="Полки">
              <AromaChip active={!shelves.length} onClick={() => setShelves([])}>Все</AromaChip>
              {all.map((p) => <AromaChip key={p} profile={p} active={shelves.includes(p)} onClick={() => toggle(p)}>{labelOf(p)}</AromaChip>)}
            </div>
          </div>
          <div className="mx-deck">
            <TobaccoCard t={TOBACCO.wild} pos={2} match={{ caption: '' }} />
            <TobaccoCard t={TOBACCO.cola} pos={1} match={{ caption: '' }} />
            <TobaccoCard t={TOBACCO.pastille} pos={0} match={{ caption: 'В миксах мастеров не встречается' }} />
          </div>
          <div className="mx-actions">
            <button type="button" className="mx-round" aria-label="Дальше">×</button>
            <button type="button" className="mx-round mx-round-take" aria-label="Беру">✓</button>
          </div>
          <div className="mx-links">
            <button type="button" className="mx-link" disabled>Вернуть прошлую</button>
            <button type="button" className="mx-link">Доверюсь мастеру</button>
          </div>
        </div>
      </section>
    </Phone>
  );
}

const REVEAL = [
  { t: TOBACCO.pastille, share: 55, role: 'Основа' },
  { t: TOBACCO.carolina, share: 35, role: 'Акцент' },
  { t: TOBACCO.roll, share: 10, role: 'Штрих' },
];
const AXES = [['Сладость', 0.3], ['Кислинка', 0.05], ['Свежесть', 0.55], ['Плотность', 0.45]];

function MixerRevealPhone() {
  const [name, setName] = React.useState('Жвачка, табачный и булочка');
  let left = 0;
  return (
    <Phone>
      <section className="mx">
        <MixerTop done />
        <div className="mx-reveal">
          <div className="mx-reveal-card">
            <div className="mx-reveal-head">
              <Ring parts={REVEAL} size={88} center={<span className="mx-ring-score">52</span>} />
              <div className="mx-reveal-verdict">
                <h2 className="aroma-label">Гармония</h2>
                <span className="mx-verdict">Необычное сочетание</span>
              </div>
            </div>
            <label className="mx-name-field">
              <span className="aroma-label">Название</span>
              <textarea className="mx-name-input" rows={2} value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} />
            </label>
          </div>
          <div className="mx-split">
            <h2 className="aroma-label">Доли</h2>
            <div className="mx-split-bar">
              {REVEAL.map((part, i) => (
                <span key={i} className="mx-split-seg" style={{ width: part.share + '%', background: 'var(--composition-' + (i + 1) + ')' }}>{part.share + '%'}</span>
              ))}
              {REVEAL.slice(0, -1).map((part, i) => {
                left += part.share;
                return <span key={i} className="mx-split-handle" style={{ left: left + '%' }} aria-label={'Граница ' + (i + 1)} />;
              })}
            </div>
            <ul className="mx-split-legend">
              {REVEAL.map((part, i) => (
                <li key={i}><span className="mx-dot" style={{ background: 'var(--composition-' + (i + 1) + ')' }} aria-hidden />{part.role + ': '}<b>{part.t.brand + ' ' + part.t.name}</b>{', ' + part.share + '%'}</li>
              ))}
            </ul>
          </div>
          <div className="mx-meters">
            {AXES.map(([axis, value]) => (
              <div key={axis} className="mx-meter">
                <span className="mx-meter-label">{axis}</span>
                <span className="mx-meter-track"><span style={{ width: Math.round(value * 100) + '%' }} /></span>
              </div>
            ))}
            <p className="mx-hint">Холодка 55%. Обычно хватает 10–15%.</p>
          </div>
          <p className="mx-similar">Похожих миксов в каталоге нет.</p>
        </div>
        <div className="mx-dock">
          <AromaCTA>Покурить</AromaCTA>
          <button type="button" className="mx-link">Собрать заново</button>
        </div>
      </section>
    </Phone>
  );
}

// ── Пары «было / стало» ──

const SHOTS = [
  {
    id: 'gate', name: 'Гейт 18+ и код', before: 'aroma-375-01-gate', render: () => <GatePhone />,
    notes: [
      'Одно гало фона вместо трёх гало гейта.',
      'Подзаголовок «Подбор кальянных миксов» и подпись поля «Код мастера» обычным регистром.',
      'Подсказка двумя предложениями: «Код скажет мастер зала. Он действует до конца суток.»',
      'У «Войти в Ателье» нет пульса. Юридический минимум и чекбокс 18+ не изменились.',
    ],
  },
  {
    id: 'onboarding-1', name: 'Онбординг, шаг 1', before: 'aroma-375-05-onboarding-1-selected', render: () => <OnboardingPhone step={1} initialProfiles={['spicy', 'minty']} />,
    notes: [
      'Нет надписи с номером шага над заголовком: шаг уже показывает прогресс в шапке.',
      'Подзаголовок сообщает неочевидное: «Можно выбрать несколько.»',
      'Счётчик над кнопкой обычным регистром: «Подходят 3 микса». У «Далее» нет пульса.',
      'Вторичная кнопка «Открыть каталог сразу» в sentence case.',
    ],
  },
  {
    id: 'onboarding-2', name: 'Онбординг, шаг 2', before: 'aroma-375-06-onboarding-2', render: () => <OnboardingPhone step={2} initialProfiles={['spicy', 'minty']} initialFlavors={['мята']} />,
    notes: [
      'Подсказка без тире: «Можно пропустить. Бледные вкусы не встречаются в миксах с выбранными профилями.»',
      'Блока «Сейчас выбрано» нет: он повторял выбор с первого шага.',
      'Если под набор миксов нет, это сказано над кнопкой, и кнопка неактивна.',
    ],
  },
  {
    id: 'recs', name: 'Подбор: герой и «Тоже подходят»', before: 'aroma-375-07-recommendations', render: () => <RecsPhone />,
    notes: [
      'Нет надписи «Лучшее совпадение»: герой и так первый. «Изменить вкусы» осталась над ним.',
      'Герой на ровной поверхности карточки, без подкраски гало профиля. Полоса профилей в герое осталась.',
      'Производитель в составе обычным регистром: «Darkside». Число выборов обычным текстом. У «Покурить» здесь нет пульса.',
      '«Тоже подходят» стал заголовком секции. В строках нет полосы профилей, вкусы через запятую.',
      'В конце строка «Собрать свой микс» вместо «Не нашли своё? Намиксуйте сами» с декоративным глифом.',
    ],
  },
  {
    id: 'sheet', name: 'Карточка микса', before: 'aroma-375-08b-mix-card-full', render: () => <RecsPhone sheetMix={mixOf('m11')} />,
    notes: [
      'Шапка листа без гало профиля. Надписи об источнике открытия над названием нет.',
      'Подписи секций «Состав» и «Ваша оценка» обычным регистром, без «микса».',
      '«Закрыть» в sentence case. Пульс остался только здесь, на «Покурить».',
    ],
  },
  {
    id: 'master', name: 'Покажите мастеру', before: 'aroma-375-09-after-smoke', render: () => <MasterPhone />,
    notes: [
      'Ровный фон без двух бордовых гало.',
      '«Покажите мастеру» обычным текстом в строке с «Готово», а не надписью над глифом.',
      'Профили через запятую обычным регистром. Подписи «Состав» над составом нет.',
      '«Оценить, когда соберут» и «Готово» в sentence case.',
    ],
  },
  {
    id: 'showcase', name: 'Витрина', before: 'aroma-375-10-showcase', render: () => <ShowcasePhone />,
    notes: [
      'Приглашение в Миксер одной строкой «Собрать свой микс» без глифа и без «Не нашли своё?».',
      'Полки и постеры не менялись: подкраска постера цветами профилей остаётся, это данные.',
    ],
  },
  {
    id: 'rail', name: 'Подборка', before: 'aroma-375-11-showcase-rail', render: () => <RailPhone />,
    notes: [
      'Нет крошки с типом полки и счётчика рядом с «←»: тип полки виден на Витрине.',
      'Описание подборки без тире. Вкусы в строках через запятую.',
    ],
  },
  {
    id: 'catalog-empty', name: 'Каталог: ничего не найдено', before: 'aroma-375-13-catalog-empty', render: () => <CatalogPhone initialQuery="zzzqqq" />,
    notes: [
      'Без шутки: «Ничего не найдено. Измените запрос.» С фильтрами: «Уберите один из фильтров.»',
      'Над пустой выдачей нет счётчика: он повторял фразу ниже.',
      'Кнопка по делу: «Очистить поиск». С фильтром: «Убрать: клубника» и «Сбросить всё». Без капсов и кавычек.',
    ],
  },
  {
    id: 'mixer-turn', name: 'Миксер: ход', before: 'aroma-375-14-mixer-1', render: () => <MixerTurnPhone />,
    notes: [
      '«Ход 1 из 3» без ведущих нулей и капсов, роль «Основа, 40–70%».',
      'У пустой чаши одна подсказка вместо трёх. Гало под кольцом и на карте табака нет.',
      'На карте производитель обычным регистром, профили и вкусы через запятую. Вместо «—» подпись «В миксах мастеров не встречается».',
      'Счётчик полок: «21 табак из вашего подбора», без пояснения механики колоды.',
    ],
  },
  {
    id: 'mixer-reveal', name: 'Миксер: раскрытие', before: 'aroma-375-17-mixer-result', render: () => <MixerRevealPhone />,
    notes: [
      'Над полосой прогресса нет пары надписей «Раскрытие» и «Ваш микс».',
      'Подписи «Гармония», «Название», «Доли» без пояснений очевидного («можно переименовать», «тяните бегунки»).',
      'Вердикт обычным регистром и без шутки: «Необычное сочетание» вместо «Смелый эксперимент».',
      'Легенда долей: «Основа: Starline Мятная пастилка, 55%». Похожего микса нет одной строкой. У «Покурить» нет пульса.',
    ],
  },
  {
    id: 'cabinet', name: 'Кабинет без входа', before: 'aroma-375-21-nav-Кабинет', render: () => <CabinetPhone />,
    notes: [
      'Без декоративного глифа и надписи «Кабинет» над заголовком. Заголовок «Кабинет» называет раздел: у панели нет подписей.',
      'Три пункта с тире и кавычками стали одной фразой. Сноска короче.',
      'Справа показан кабинет с настроенным ботом: согласие и «Войти через Telegram». На снимке прода бот не настроен, поэтому формы нет.',
    ],
  },
  {
    id: 'reel', name: 'Рилс', before: 'aroma-375-19-nav-Рилсы', render: () => <ReelPhone />,
    notes: [
      'Сцена не менялась: это согласованное исключение для рилсов.',
      'Нет надписи профилей капсами над названием. Вкусы через запятую, у «★» нет числа оценок.',
      '«Листайте вверх» обычным регистром и без прыгающей стрелки. «Подробнее» в sentence case, у «Покурить» нет пульса.',
    ],
  },
];

function Pair({ shot }) {
  return (
    <section className="pair" id={shot.id}>
      <h2 className="pair-title">{shot.name}</h2>
      <div className="pair-row">
        <figure className="pair-col">
          <figcaption className="pair-tag">Было</figcaption>
          <img className="pair-before" src={'screens/' + shot.before + '.webp'} width="375" height="812" alt={'Было: ' + shot.name} loading="lazy" />
        </figure>
        <figure className="pair-col">
          <figcaption className="pair-tag">{'Стало, #shot=' + shot.id}</figcaption>
          <div className="frame">{shot.render()}</div>
        </figure>
      </div>
      <ul className="pair-notes">
        {shot.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}

function Board() {
  return (
    <div className="board">
      <header className="board-head">
        <h1 className="board-title">Гость без признаков генерации</h1>
        <p className="board-text">Мокап #348. Слева снимок прода 375 px, справа тот же экран по новому канону. Экраны справа живые: это гостевой UI-кит после перевода на канон, Миксер и кабинет без входа собраны из тех же примитивов. Данные из кита и снимков прода.</p>
      </header>
      {SHOTS.map((shot) => <Pair key={shot.id} shot={shot} />)}
    </div>
  );
}

function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) || SHOTS[0];
  return <div className="shot frame">{shot.render()}</div>;
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
