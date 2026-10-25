// Доска мокапа #151: личный кабинет гостя — вход через Telegram, история, избранное, «Для вас».
// Миксы — витрина прода на 2026-10-15 (../design_handoff_showcase_compact/showcase-data.js).
// Шапка, нижняя панель, подбор по онбордингу и знакомство — из гостевого UI-кита; новое — Cab*, ForYou*, Fav*.
const DS = window.DesignSystem_1aef33;
const { AromaCTA, AromaChip, SegmentNav, ProfileGlyph, SignatureBar } = DS;
const M = window.AROMA_MOCK;
const label = (p) => M.profileLabels[p] || p;
const mixById = (id) => M.mixes.find((mix) => mix.id === id);

const PROFILE_COLORS = { citrus: '--profile-citrus', berry: '--profile-berry', floral_herbal: '--profile-floral-herbal', fresh: '--profile-fresh', sweet: '--profile-sweet', spicy: '--profile-spicy', dessert: '--profile-dessert', tobacco: '--profile-tobacco', minty: '--profile-minty', fruity: '--profile-fruity', perfume: '--profile-perfume', sour: '--profile-sour' };
const tint = (id, share) => 'color-mix(in srgb, var(' + (PROFILE_COLORS[id] || '--profile-fallback') + ') ' + share + '%, transparent)';

// ── Данные гостя ──

// Собранный в «Намиксуй» микс: снимок состава из CustomMixSmokeEvent, имя — как гость переименовал.
const CUSTOM_MIX = {
  id: 'custom-1', custom: true, name: 'Ягодный лёд по-своему',
  description: 'Собран вами в «Намиксуй» 11 октября. Вердикт гармонии — «Классика».',
  flavorProfiles: ['berry', 'fruity', 'fresh'], flavors: ['лесные ягоды', 'вишня', 'холодок'],
  components: [
    { id: 'cc1', name: 'Wildberry', manufacturer: 'DARKSIDE', proportion: 55 },
    { id: 'cc2', name: 'Cherry Shock', manufacturer: 'Black Burn', proportion: 30 },
    { id: 'cc3', name: 'Supernova', manufacturer: 'DARKSIDE', proportion: 15 },
  ],
};
const CUSTOM_MISSING = { ...CUSTOM_MIX, id: 'custom-2', name: 'Вишня на хвое', flavorProfiles: ['fruity', 'floral_herbal'], flavors: ['вишня', 'хвойный'],
  description: 'Собран вами в «Намиксуй» 2 октября.',
  components: [{ id: 'cc4', name: 'Cherry Shock', manufacturer: 'Black Burn', proportion: 60 }, { id: 'cc5', name: 'Needls', manufacturer: 'DARKSIDE', proportion: 40 }] };

const entry = (date, mix, extra = {}) => ({ date, mix, ...extra });
// Снимок названия: мастер удалил «Ягодную классику», в истории она осталась.
const DELETED = { ...mixById('mix-catalog-hit-13'), id: 'deleted-hit-13' };

const PERSONAS = {
  // 4 из 5 последних выборов — «Морозная ягода»: срабатывает подсказка против пузыря.
  steady: [
    entry('20 октября', mixById('mix-catalog-hit-01'), { rating: 5 }),
    entry('17 октября', mixById('mix-catalog-hit-01')),
    entry('14 октября', mixById('mix-catalog-hit-01'), { rating: 5 }),
    entry('11 октября', CUSTOM_MIX),
    entry('8 октября', mixById('mix-catalog-hit-01')),
    entry('4 октября', mixById('mix-catalog-hit-05'), { rating: 4 }),
    entry('27 сентября', DELETED, { rating: 4, deleted: true }),
  ],
  varied: [
    entry('20 октября', mixById('mix-catalog-hit-08'), { rating: 5 }),
    entry('16 октября', mixById('mix-catalog-hit-05')),
    entry('12 октября', mixById('mix-catalog-hit-03'), { rating: 4 }),
    entry('11 октября', CUSTOM_MIX),
    entry('3 октября', mixById('mix-catalog-hit-01'), { rating: 5 }),
  ],
  cold: [entry('20 октября', mixById('mix-catalog-hit-01'))],
  empty: [],
};
const BUBBLE = { steady: true };
const TODAY = '20 октября';

const FAVORITES = [
  { mix: mixById('mix-catalog-hit-01') },
  { mix: CUSTOM_MIX },
  { mix: mixById('mix-catalog-niche-12') },
  { mix: mixById('mix-catalog-niche-15'), missing: 'Oven Black Currant' },
  { mix: CUSTOM_MISSING, missing: 'Black Burn Cherry Shock' },
  { mix: DELETED, deleted: true },
];
const TASTES = ['berry', 'fresh', 'minty'];

// «Для вас»: 1 повтор, 4 нового во вкусе (не больше 2 на ведущий профиль), 1 шаг в сторону.
const FOR_YOU = {
  again: { mix: mixById('mix-catalog-hit-01'), reason: 'Ваша оценка ★ 5 · выбирали 5 раз' },
  hero: { mix: mixById('mix-catalog-hit-08'), reason: 'Ягодное, как вы любите, — на персиковом чае.' },
  taste: [
    { mix: mixById('mix-catalog-hit-10'), reason: 'Черника и холодок — рядом с вашими любимыми' },
    { mix: mixById('mix-catalog-hit-03'), reason: 'Свежее и ягодное, но с яблоком' },
    { mix: mixById('mix-catalog-hit-26'), reason: 'Похоже на «Морозную ягоду», только виноград и манго' },
  ],
  aside: { mix: mixById('mix-catalog-hit-02'), reason: 'Мастера часто сводят ягодное с цитрусовым' },
};

// ── Каркас из UI-кита ──

const NAV_ITEMS = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];

function Icon({ name, size = 24, stroke = 1.8, fill = 'none' }) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src="../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg" alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
        <button type="button" className="topbar-icon-btn" aria-label="Сменить код" title="Сменить код">
          <Icon name="KeyRound" size={20} />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ value, onChange }) {
  return (
    <nav className="bottom-nav nav-5" aria-label="Гостевая навигация">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function StubScreen({ title, text }) {
  return (
    <section className="cab-stub">
      <p className="aroma-caps">{title}</p>
      <p className="guest-status">{text}</p>
    </section>
  );
}

// ── Строка с причиной ──

function ReasonRow({ mix, reason, mark, note, own, disabled, onClick }) {
  return (
    <button type="button" className={'cab-row' + (disabled ? ' cab-row-off' : '')} onClick={disabled ? undefined : onClick} aria-disabled={disabled || undefined}>
      <ProfileGlyph profiles={mix.flavorProfiles} size={44} />
      <span className="cab-row-text">
        {mark ? <span className="aroma-caps cab-mark">{mark}</span> : null}
        <span className="cab-row-name">{mix.name}</span>
        <SignatureBar profiles={mix.flavorProfiles} height={3} />
        {reason ? <span className="cab-row-reason">{reason}</span> : null}
        {note ? <span className="cab-row-note">{note}</span> : null}
      </span>
      {own ? <span className="cab-own" aria-label={'Ваша оценка ' + own}>{'★ ' + own}</span> : null}
    </button>
  );
}

// ── «Для вас» ──

function BubbleHint({ onOpen }) {
  const { mix } = FOR_YOU.aside;
  return (
    <section className="fy-bubble" aria-label="Подсказка">
      <p className="aroma-caps">Давно на одном вкусе</p>
      <p className="fy-bubble-text">Четыре из пяти последних — «Морозная ягода». Мастер уважает постоянство, но рядом есть кое-что.</p>
      <button type="button" className="fy-bubble-link" onClick={() => onOpen(mix)}>
        <ProfileGlyph profiles={mix.flavorProfiles} size={28} />
        <span className="fy-bubble-name">{mix.name}</span>
        <Icon name="ChevronRight" size={20} />
      </button>
    </section>
  );
}

function ForYouHero({ item, onOpen, onChoose }) {
  const { mix, reason } = item;
  return (
    <article className="aroma-recs-hero" style={{ background: 'radial-gradient(circle at 80% 0%, ' + tint(mix.flavorProfiles[0], 33) + ' 0%, transparent 55%), linear-gradient(180deg, rgba(34,34,41,.96) 0%, rgba(24,24,28,.94) 100%)' }}>
      <button type="button" className="aroma-recs-hero-head fy-hero-open" onClick={() => onOpen(mix)}>
        <ProfileGlyph profiles={mix.flavorProfiles} size={64} />
        <span className="aroma-recs-hero-text">
          <span className="aroma-recs-hero-title">{mix.name}</span>
          <span className="aroma-recs-hero-desc">{reason}</span>
        </span>
      </button>
      <SignatureBar profiles={mix.flavorProfiles} height={6} />
      <DS.CompositionStack components={mix.components} showBar={false} />
      <AromaCTA pulse onClick={() => onChoose(mix)}>Покурить</AromaCTA>
    </article>
  );
}

// «Подобрать под настроение»: обычный онбординг на один визит, вкусы в кабинете не меняются.
function MoodLink({ onMood }) {
  return (
    <button type="button" className="fy-mood-link" onClick={onMood}>
      <span>Подобрать под настроение</span>
      <Icon name="ChevronRight" size={18} />
    </button>
  );
}

// A · по слотам: повтор, во вкусе, шаг в сторону — каждый под своей подписью.
function ForYouSlots({ bubble, onOpen, onChoose, onMood }) {
  return (
    <section className="aroma-recs">
      <header className="fy-head">
        <h1 className="fy-title">Для вас</h1>
        <p className="fy-sub">По вашим выборам, оценкам и избранному.</p>
        <MoodLink onMood={onMood} />
      </header>
      {bubble ? <BubbleHint onOpen={onOpen} /> : null}
      <p className="aroma-caps">Новое в вашем вкусе</p>
      <ForYouHero item={FOR_YOU.hero} onOpen={onOpen} onChoose={onChoose} />
      <div className="aroma-list">
        {FOR_YOU.taste.map((item) => <ReasonRow key={item.mix.id} {...item} onClick={() => onOpen(item.mix)} />)}
      </div>
      <p className="aroma-caps">Шаг в сторону</p>
      <ReasonRow {...FOR_YOU.aside} onClick={() => onOpen(FOR_YOU.aside.mix)} />
      <p className="aroma-caps">Снова</p>
      <ReasonRow {...FOR_YOU.again} onClick={() => onOpen(FOR_YOU.again.mix)} />
    </section>
  );
}

// B · одним списком: герой, дальше строки с причиной; повтор и шаг в сторону помечены.
function ForYouList({ bubble, onOpen, onChoose }) {
  const rows = [
    FOR_YOU.taste[0],
    { ...FOR_YOU.aside, mark: 'Шаг в сторону' },
    FOR_YOU.taste[1],
    { ...FOR_YOU.again, mark: 'Снова' },
    FOR_YOU.taste[2],
  ];
  return (
    <section className="aroma-recs">
      <header className="fy-head">
        <h1 className="fy-title">Для вас</h1>
        <p className="fy-sub">По вашим выборам, оценкам и избранному.</p>
      </header>
      {bubble ? <BubbleHint onOpen={onOpen} /> : null}
      <ForYouHero item={FOR_YOU.hero} onOpen={onOpen} onChoose={onChoose} />
      <p className="aroma-caps">Тоже для вас</p>
      <div className="aroma-list">
        {rows.map((item) => <ReasonRow key={item.mix.id} {...item} onClick={() => onOpen(item.mix)} />)}
      </div>
    </section>
  );
}

function ColdStart({ onOpen, onChoose, onMood }) {
  const mixes = ['mix-catalog-hit-08', 'mix-catalog-hit-01', 'mix-catalog-hit-26', 'mix-catalog-hit-03', 'mix-catalog-hit-10'].map(mixById);
  return (
    <>
      <p className="fy-cold">«Для вас» соберётся, когда у нас будет больше ваших выборов. Пока — по вкусам из онбординга.</p>
      {onMood ? <MoodLink onMood={onMood} /> : null}
      <window.RecommendationsScreen mixes={mixes} onOpen={(mix) => onOpen(mix)} onChoose={(mix) => onChoose(mix)} onOpenOnboarding={() => {}} onOpenCatalog={() => {}} />
    </>
  );
}

// Онбординг под настроение — экран онбординга из кита, сверху строка о том, что это на один визит.
function MoodOnboarding({ profiles, setProfiles, onBack, onDone, onCatalog }) {
  const [step, setStep] = React.useState(1);
  const [flavors, setFlavors] = React.useState([]);
  const toggle = (setter) => (value) => setter((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  return (
    <>
      <div className="fy-mood-note">
        <button type="button" className="aroma-rail-back" onClick={onBack} aria-label="Назад к «Для вас»">←</button>
        <p className="fy-mood-note-text"><span className="aroma-caps">Под настроение</span>Только на этот визит. Вкусы в кабинете не изменятся.</p>
      </div>
      <window.OnboardingScreen
        step={step}
        profiles={profiles}
        flavors={flavors}
        toggleProfile={toggle(setProfiles)}
        toggleFlavor={toggle(setFlavors)}
        onNext={() => (step === 1 ? setStep(2) : onDone())}
        onSkip={onCatalog}
      />
    </>
  );
}

function MoodResult({ profiles, onBack, onOpen, onChoose }) {
  const score = (mix) => mix.flavorProfiles.filter((p) => profiles.includes(p)).length;
  const mixes = M.mixes.filter((mix) => !profiles.length || score(mix) > 0).sort((a, b) => score(b) - score(a)).slice(0, 5);
  return (
    <>
      <div className="fy-mood-note">
        <p className="fy-mood-note-text">
          <span className="aroma-caps">{'Под настроение' + (profiles.length ? ' · ' + profiles.map(label).join(' · ') : '')}</span>
          Подбор на этот визит. «Для вас» и вкусы в кабинете не изменились.
        </p>
      </div>
      <button type="button" className="fy-mood-link" onClick={onBack}>
        <Icon name="ChevronLeft" size={18} />
        <span>Вернуться к «Для вас»</span>
      </button>
      <window.RecommendationsScreen mixes={mixes} onOpen={(mix) => onOpen(mix, { source: 'Под настроение' })} onChoose={onChoose} onOpenOnboarding={onBack} onOpenCatalog={onBack} />
    </>
  );
}

// ── Кабинет ──

function CabinetAnon({ error, onLogin }) {
  const [consent, setConsent] = React.useState(false);
  return (
    <section className="cab-anon">
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={72} />
      <p className="aroma-caps">Кабинет</p>
      <h1 className="cab-anon-title">Запомним, что вам понравилось</h1>
      <ul className="cab-benefits">
        <li><span className="cab-dot" aria-hidden />История: что и когда вы выбирали</li>
        <li><span className="cab-dot" aria-hidden />Избранное — любимые и собранные вами миксы</li>
        <li><span className="cab-dot" aria-hidden />«Для вас» на Подборе — без онбординга в следующий раз</li>
      </ul>
      <p className="cab-anon-note">Без входа всё работает как прежде. Кабинет действует в этом заведении.</p>
      <div className="cab-anon-form">
        <label className="aroma-access-age">
          <button type="button" role="checkbox" aria-checked={consent} className={'aroma-access-age-dot' + (consent ? ' on' : '')} onClick={() => setConsent(!consent)}>{consent ? <span aria-hidden>✓</span> : null}</button>
          <span className="aroma-access-age-text">Согласен на обработку Telegram id для истории и избранного. <a className="cab-link" href="#policy">Политика</a></span>
        </label>
        <AromaCTA disabled={!consent} onClick={onLogin}>Войти через Telegram</AromaCTA>
        {error ? <p className="guest-error">Telegram не ответил. Попробуйте ещё раз — подбор и каталог работают и без входа.</p> : null}
      </div>
    </section>
  );
}

// Ожидание входа (#239, #243): сайт открыл чат с ботом и опрашивает статус кода.
// Внизу — имитация ответа бота для мокапа; в приложении её нет.
function LoginWait({ expired: initialExpired = false, onConfirmed, onRestart, onCancel }) {
  const [expired, setExpired] = React.useState(initialExpired);
  return (
    <section className="cab-anon cab-wait">
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={72} />
      <p className="aroma-caps">Вход через Telegram</p>
      {expired ? (
        <>
          <h1 className="cab-anon-title">Ссылка устарела</h1>
          <p className="cab-anon-note">Ссылка для входа живёт 10 минут. Начнём заново?</p>
          <div className="cab-anon-form">
            <AromaCTA onClick={() => { setExpired(false); onRestart(); }}>Войти через Telegram</AromaCTA>
            <button type="button" className="aroma-skip" onClick={onCancel}>Отмена</button>
          </div>
        </>
      ) : (
        <>
          <h1 className="cab-anon-title">Подтвердите вход в Telegram</h1>
          <p className="cab-wait-text">Мы открыли чат с ботом Арома Ателье. Нажмите там «Запустить», затем «Войти» — кабинет откроется здесь.</p>
          <p className="cab-wait-status" role="status"><span className="cab-wait-dot" aria-hidden />Ждём подтверждения…</p>
          <div className="cab-anon-form">
            <button type="button" className="aroma-ghost" onClick={() => {}}>Открыть Telegram ещё раз</button>
            <button type="button" className="aroma-skip" onClick={onCancel}>Отмена</button>
          </div>
        </>
      )}
      <div className="tg-stub-box cab-wait-sim">
        <p className="aroma-caps">Только в мокапе — ответ бота</p>
        <div className="tg-stub-actions">
          <button type="button" className="aroma-ghost-sm" onClick={onConfirmed}>Бот подтвердил</button>
          <button type="button" className="aroma-ghost-sm" onClick={() => setExpired(true)}>Прошло 10 минут</button>
        </div>
      </div>
    </section>
  );
}

function HistoryList({ history, onOpen, onGoRecs }) {
  if (!history.length) {
    return (
      <div className="cab-empty">
        <p className="guest-status">Вы ещё ничего не выбирали. Нажмёте «Покурить» — микс появится здесь.</p>
        <button type="button" className="aroma-ghost-sm" onClick={onGoRecs}>Открыть подбор</button>
      </div>
    );
  }
  const groups = history.reduce((acc, item) => {
    const last = acc[acc.length - 1];
    if (last && last.date === item.date) last.items.push(item); else acc.push({ date: item.date, items: [item] });
    return acc;
  }, []);
  return (
    <div className="cab-list">
      {groups.map((group) => (
        <section key={group.date} className="cab-group">
          <p className="aroma-caps">{group.date === TODAY ? 'Сегодня' : group.date}</p>
          {group.items.map((item, i) => (
            <ReasonRow
              key={i}
              mix={item.mix}
              mark={item.mix.custom ? 'Собран вами' : null}
              note={item.deleted ? 'Больше не готовим' : null}
              own={item.rating}
              disabled={item.deleted}
              onClick={() => onOpen(item.mix, { source: 'Из истории' })}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function FavoritesList({ favorites, onOpen, onGoRecs }) {
  if (!favorites.length) {
    return (
      <div className="cab-empty">
        <p className="guest-status">Пока пусто. Сердечко на карточке микса — и он здесь.</p>
        <button type="button" className="aroma-ghost-sm" onClick={onGoRecs}>Открыть подбор</button>
      </div>
    );
  }
  return (
    <div className="cab-list">
      {favorites.map((item) => (
        <ReasonRow
          key={item.mix.id}
          mix={item.mix}
          mark={item.mix.custom ? 'Собран вами' : null}
          note={item.deleted ? 'Больше не готовим' : item.missing ? 'Сейчас нет: ' + item.missing : null}
          disabled={item.deleted}
          onClick={() => onOpen(item.mix, { source: 'Из избранного', missing: item.missing })}
        />
      ))}
    </div>
  );
}

function Cabinet({ tab, setTab, history, favorites, toast, onOpen, onGoRecs, onLogout, onDelete }) {
  return (
    <section className="cab">
      {toast ? <p className="cab-toast" role="status">{toast}</p> : null}
      <h1 className="fy-title">Кабинет</h1>
      <section className="cab-tastes">
        <p className="aroma-caps">Ваши вкусы</p>
        <div className="cab-tastes-row">
          {TASTES.map((p) => <AromaChip key={p} active profile={p}>{label(p)}</AromaChip>)}
        </div>
        <button type="button" className="aroma-skip cab-tastes-edit">Изменить вкусы</button>
      </section>
      <SegmentNav
        items={[{ id: 'history', label: 'История · ' + history.length }, { id: 'favorites', label: 'Избранное · ' + favorites.length }]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'history' ? <HistoryList history={history} onOpen={onOpen} onGoRecs={onGoRecs} /> : <FavoritesList favorites={favorites} onOpen={onOpen} onGoRecs={onGoRecs} />}
      <footer className="cab-foot">
        <button type="button" className="aroma-skip" onClick={onLogout}>Выйти</button>
        <button type="button" className="aroma-skip cab-danger-link" onClick={onDelete}>Удалить кабинет</button>
      </footer>
    </section>
  );
}

function DeleteSheet({ onCancel, onConfirm }) {
  return (
    <div className="aroma-sheet-overlay" onClick={onCancel}>
      <section className="aroma-sheet" role="dialog" aria-label="Удалить кабинет" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <h2 className="aroma-sheet-title">Удалить кабинет?</h2>
        <p className="aroma-sheet-desc">История, избранное и вкусы удалятся насовсем. Выборы миксов останутся в статистике заведения, но без связи с вами.</p>
        <div className="cab-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onCancel}>Отмена</button>
          <button type="button" className="aroma-ghost cab-danger" onClick={onConfirm}>Удалить</button>
        </div>
      </section>
    </div>
  );
}

// ── Карточка микса с сердечком ──

function HeartButton({ on, onClick }) {
  return (
    <button type="button" className="heart-btn" aria-pressed={on} aria-label={on ? 'Убрать из избранного' : 'В избранное'} onClick={onClick}>
      <Icon name="Heart" size={22} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

function CabMixSheet({ state, logged, fav, onFav, onClose, onChoose }) {
  const [rating, setRating] = React.useState(0);
  if (!state) return null;
  const { mix, source = 'Для вас', missing } = state;
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" onClick={(e) => e.stopPropagation()} style={{ background: 'radial-gradient(circle at 88% 0%, ' + tint(mix.flavorProfiles[0], 31) + ' 0%, transparent 50%), var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
            <p className="aroma-caps">{mix.custom ? 'Собран вами' : source}</p>
            <h2 className="aroma-sheet-title">{mix.name}</h2>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
          <HeartButton on={logged && fav} onClick={onFav} />
        </div>
        <p className="aroma-sheet-desc">{mix.description}</p>
        <div className="aroma-sheet-tags">
          {mix.flavorProfiles.slice(0, 3).map((p) => <AromaChip key={p} tier="lg" active profile={p}>{label(p)}</AromaChip>)}
          {mix.flavors.map((f) => <AromaChip key={f}>{f}</AromaChip>)}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Состав микса</p>
          <DS.CompositionStack components={mix.components} />
        </section>
        {!mix.custom ? (
          <section className="aroma-sheet-block">
            <p className="aroma-caps">Ваша оценка</p>
            <div className="aroma-stars" role="group" aria-label="Оценка микса">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" className={'aroma-star' + (rating >= v ? ' on' : '')} onClick={() => setRating(v)} aria-label={'Оценить на ' + v}>★</button>
              ))}
            </div>
            {rating ? <p className="guest-ok">{'Оценка ' + rating + ' сохранена.'}</p> : null}
          </section>
        ) : null}
        {missing ? <p className="screen-status-error">{'Сейчас нет: ' + missing + '. Покурить этот микс сегодня не получится.'}</p> : null}
        <div className="aroma-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>Закрыть</button>
          <AromaCTA pulse={!missing} disabled={Boolean(missing)} onClick={() => onChoose(mix)}>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

function AnonHeartSheet({ onLogin, onClose }) {
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label="Избранное" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <p className="aroma-caps">Избранное</p>
        <h2 className="aroma-sheet-title">Избранное живёт в кабинете</h2>
        <p className="aroma-sheet-desc">Войдите через Telegram — и микс будет ждать вас в следующий раз. Без входа подбор работает как прежде.</p>
        <div className="cab-sheet-actions">
          <button type="button" className="aroma-ghost" onClick={onClose}>Не сейчас</button>
          <AromaCTA onClick={onLogin}>Войти</AromaCTA>
        </div>
      </section>
    </div>
  );
}

// ── Вернувшийся гость: знакомство с входом ──

function IntroReturning({ onLogin, onNext }) {
  const card = M.introCards[0];
  return (
    <div className="aroma-intro">
      <span className="aroma-intro-watermark" aria-hidden>01</span>
      <div className="aroma-intro-body">
        <p className="aroma-caps">Шаг 01 · из 04</p>
        <div className="aroma-intro-content">
          <h1 className="aroma-intro-title">{card.title}</h1>
          <p className="aroma-intro-text">{card.description}</p>
        </div>
      </div>
      <div className="aroma-intro-dock">
        <div className="aroma-intro-pips">
          {M.introCards.map((_, i) => <span key={i} className={'aroma-intro-pip' + (i === 0 ? ' on' : '')} aria-hidden />)}
        </div>
        <AromaCTA onClick={onNext}>Дальше</AromaCTA>
        <button type="button" className="aroma-skip" onClick={onNext}>Пропустить знакомство</button>
        <button type="button" className="cab-returning" onClick={onLogin}>
          <span>Уже были у нас?</span>
          <span className="cab-returning-cta">Войти через Telegram</span>
        </button>
      </div>
    </div>
  );
}

// ── Телефон ──

function GuestPhone({ view: initialView = 'recs', logged: initialLogged = true, persona = 'steady', variant = 'A', cabTab = 'history', sheet: initialSheet = null, anonHeart = false, deleteOpen = false, tgError = false, toast = null, fav = true, mood = [] }) {
  const [view, setView] = React.useState(initialView);
  const [logged, setLogged] = React.useState(initialLogged);
  const [tab, setTab] = React.useState(cabTab);
  const [sheet, setSheet] = React.useState(initialSheet);
  const [favOn, setFavOn] = React.useState(fav);
  const [heartPrompt, setHeartPrompt] = React.useState(anonHeart);
  const [delOpen, setDelOpen] = React.useState(deleteOpen);
  const [note, setNote] = React.useState(toast);
  const [chosen, setChosen] = React.useState(null);
  const [moodProfiles, setMoodProfiles] = React.useState(mood);

  const history = logged ? PERSONAS[persona] : [];
  const favorites = persona === 'empty' ? [] : FAVORITES;
  const openMix = (mix, extra = {}) => setSheet({ mix, ...extra });
  const choose = (mix) => { setSheet(null); setChosen(mix); setView('confirm'); };
  const login = () => { setHeartPrompt(false); setSheet(null); setView('tg'); };
  const afterLogin = () => { setLogged(true); setNote('Вы вошли. Вкусы из онбординга сохранены в кабинете.'); setView('cabinet'); };
  const withNav = ['recs', 'mood-result', 'showcase', 'catalog', 'cabinet'].includes(view);
  const startMood = () => { setMoodProfiles([]); setView('mood'); };

  let body;
  if (view === 'intro') body = <IntroReturning onLogin={login} onNext={() => setView('recs')} />;
  else if (view === 'tg' || view === 'tg-expired') {
    body = (
      <>
        <Topbar />
        <main className="content">
          <LoginWait expired={view === 'tg-expired'} onConfirmed={afterLogin} onRestart={() => setView('tg')} onCancel={() => setView('cabinet')} />
        </main>
      </>
    );
  }
  else if (view === 'confirm') body = <window.ConfirmationScreen mix={chosen} onDone={() => setView(logged ? 'cabinet' : 'recs')} />;
  else if (view === 'mixer') body = <StubScreen title="Миксер" text="«Намиксуй» не меняется. Собранный микс после «Покурить» попадает в историю вошедшего гостя." />;
  else {
    let main;
    if (view === 'recs') {
      if (!logged || PERSONAS[persona].length < 3) main = <ColdStart onOpen={(mix) => openMix(mix, { source: 'Подбор для вас' })} onChoose={choose} onMood={logged ? startMood : null} />;
      else if (variant === 'A') main = <ForYouSlots bubble={BUBBLE[persona]} onOpen={openMix} onChoose={choose} onMood={startMood} />;
      else main = <ForYouList bubble={BUBBLE[persona]} onOpen={openMix} onChoose={choose} />;
    } else if (view === 'mood') {
      main = <MoodOnboarding profiles={moodProfiles} setProfiles={setMoodProfiles} onBack={() => setView('recs')} onDone={() => setView('mood-result')} onCatalog={() => setView('catalog')} />;
    } else if (view === 'mood-result') {
      main = <MoodResult profiles={moodProfiles} onBack={() => setView('recs')} onOpen={openMix} onChoose={choose} />;
    } else if (view === 'cabinet') {
      main = logged
        ? <Cabinet tab={tab} setTab={setTab} history={history} favorites={favorites} toast={note} onOpen={openMix} onGoRecs={() => setView('recs')} onLogout={() => { setLogged(false); setNote(null); }} onDelete={() => setDelOpen(true)} />
        : <CabinetAnon error={tgError} onLogin={login} />;
    } else {
      main = <StubScreen title={view === 'showcase' ? 'Витрина' : 'Каталог'} text="Экран не меняется: сердечко появляется в карточке микса." />;
    }
    body = (
      <>
        <Topbar />
        <main className="content">{main}</main>
      </>
    );
  }

  return (
    <div className="phone-shell">
      {body}
      {withNav ? <BottomNav value={view === 'mood-result' ? 'recs' : view} onChange={(id) => { setNote(null); setView(id); }} /> : null}
      <CabMixSheet
        state={sheet}
        logged={logged}
        fav={favOn}
        onFav={() => (logged ? setFavOn(!favOn) : setHeartPrompt(true))}
        onClose={() => setSheet(null)}
        onChoose={choose}
      />
      {heartPrompt ? <AnonHeartSheet onLogin={login} onClose={() => setHeartPrompt(false)} /> : null}
      {delOpen ? <DeleteSheet onCancel={() => setDelOpen(false)} onConfirm={() => { setDelOpen(false); setLogged(false); setNote(null); }} /> : null}
    </div>
  );
}

// ── Доска ──

function Frame({ name, note, children }) {
  return (
    <figure className="frame">
      <figcaption className="frame-label">
        <p className="frame-name">{name}</p>
        {note ? <p className="frame-note">{note}</p> : null}
      </figcaption>
      {children}
    </figure>
  );
}

const SHOTS = [
  { id: 'fy-a', group: 'foryou', name: '«Для вас» A · по слотам — выбран', note: 'Гость четыре раза из пяти выбрал «Морозную ягоду». Сверху подсказка, дальше «Новое в вашем вкусе», «Шаг в сторону» и один повтор в конце.', props: { variant: 'A' } },
  { id: 'fy-b', group: 'foryou', name: '«Для вас» B · одним списком — отвергнут', note: 'Тот же набор: герой и строки с причиной. Повтор и шаг в сторону помечены капсами внутри строки.', props: { variant: 'B' } },
  { id: 'fy-a-varied', group: 'foryou', name: 'A · разные выборы', note: 'Пузыря нет — подсказки нет. Состав выдачи по тем же правилам.', props: { variant: 'A', persona: 'varied' } },
  { id: 'fy-cold', group: 'foryou', name: 'Меньше трёх выборов', note: 'Подбор по сохранённому онбордингу, как сейчас. Сверху одна строка, без призыва выбирать чаще.', props: { persona: 'cold' } },
  { id: 'fy-mood', group: 'foryou', name: 'Под настроение · онбординг', note: '«Подобрать под настроение» под заголовком «Для вас». Обычный онбординг, сверху — что это только на этот визит.', props: { view: 'mood' } },
  { id: 'fy-mood-result', group: 'foryou', name: 'Под настроение · подбор', note: 'Подбор по онбордингу этого визита. «Для вас» и вкусы в кабинете не изменились, назад — одной ссылкой.', props: { view: 'mood-result', mood: ['citrus'] } },
  { id: 'cab-anon', group: 'cabinet', name: 'Кабинет без входа', note: 'Зачем входить, согласие и «Войти через Telegram». CTA неактивна, пока нет согласия.', props: { view: 'cabinet', logged: false } },
  { id: 'cab-tg', group: 'cabinet', name: 'Вход: ждём подтверждения', note: 'Сайт открыл чат с ботом в Telegram и опрашивает статус. После «Запустить» в боте страница входит сама.', props: { view: 'tg', logged: false } },
  { id: 'cab-tg-expired', group: 'cabinet', name: 'Вход: ссылка устарела', note: 'Код входа живёт 10 минут. Начать заново — одной кнопкой.', props: { view: 'tg-expired', logged: false } },
  { id: 'cab-tg-error', group: 'cabinet', name: 'Telegram не ответил', note: 'Ошибка одной фразой: что случилось и что работает без входа.', props: { view: 'cabinet', logged: false, tgError: true } },
  { id: 'cab-history', group: 'cabinet', name: 'История', note: 'Каждое нажатие «Покурить» по датам. Ваша оценка справа. Собранный микс помечен, удалённый мастером — «Больше не готовим».', props: { view: 'cabinet', toast: 'Вы вошли. Вкусы из онбординга сохранены в кабинете.' } },
  { id: 'cab-favorites', group: 'cabinet', name: 'Избранное', note: 'Каталожные и собранные миксы. Нет табака — пометка, удалён — «Больше не готовим». Длинное название в две строки.', props: { view: 'cabinet', cabTab: 'favorites' } },
  { id: 'cab-empty', group: 'cabinet', name: 'Пусто', note: 'Первый вход: истории ещё нет.', props: { view: 'cabinet', persona: 'empty' } },
  { id: 'cab-delete', group: 'cabinet', name: 'Удаление кабинета', note: 'Без шуток: что удалится и что останется в статистике.', props: { view: 'cabinet', deleteOpen: true } },
  { id: 'sheet-fav', group: 'sheet', name: 'Карточка микса · в избранном', note: 'Сердечко справа в шапке карточки: Lucide Heart 22 px, кремовое, залитое, когда микс в избранном.', props: { sheet: { mix: mixById('mix-catalog-hit-08'), source: 'Для вас' } } },
  { id: 'sheet-anon', group: 'sheet', name: 'Сердечко без входа', note: 'Не прячем сердечко у анонима: по нажатию — предложение войти.', props: { logged: false, persona: 'cold', sheet: { mix: mixById('mix-catalog-hit-08'), source: 'Подбор для вас' }, anonHeart: true, fav: false } },
  { id: 'sheet-stock', group: 'sheet', name: 'Из избранного · нет табака', note: '«Покурить» неактивна, причина названа.', props: { view: 'cabinet', cabTab: 'favorites', sheet: { mix: mixById('mix-catalog-niche-15'), source: 'Из избранного', missing: 'Oven Black Currant' } } },
  { id: 'sheet-custom', group: 'sheet', name: 'Собранный микс', note: 'Из истории или избранного. Оценки нет — её нет и в «Намиксуй».', props: { view: 'cabinet', sheet: { mix: CUSTOM_MIX, source: 'Из истории' } } },
  { id: 'returning', group: 'returning', name: 'Вернувшийся гость', note: 'На знакомстве — «Уже были у нас?». После входа онбординг пропускается: сразу Подбор с «Для вас».', props: { view: 'intro', logged: false } },
  { id: 'returning-after', group: 'returning', name: 'После входа', note: 'Нижняя панель на пять пунктов: Кабинет — CircleUserRound.', props: { view: 'recs' } },
];

function ShotFrame({ shot }) {
  return (
    <Frame name={shot.name} note={shot.note}>
      <GuestPhone {...shot.props} />
    </Frame>
  );
}

function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} />
    </div>
  );
}

function Board() {
  const section = (group) => SHOTS.filter((shot) => shot.group === group).map((shot) => <ShotFrame key={shot.id} shot={shot} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#151 · мокап на согласование</p>
        <h1 className="board-title">Личный кабинет гостя</h1>
        <p className="board-text">Вход через Telegram, история выборов, избранное и «Для вас» с защитой от пузыря одного вкуса. Правила — PRD §4, §6.5, §8.9. Все экраны кликабельны: вкладки, карточки, сердечко, вход и удаление. Миксы — витрина прода на 15 октября.</p>
      </header>
      <section className="board-section" id="foryou">
        <h2 className="board-h2">«Для вас» — выбран A</h2>
        <div className="board-row">{section('foryou')}</div>
      </section>
      <section className="board-section" id="cabinet">
        <h2 className="board-h2">Кабинет</h2>
        <div className="board-row">{section('cabinet')}</div>
      </section>
      <section className="board-section" id="sheet">
        <h2 className="board-h2">Карточка микса и избранное</h2>
        <div className="board-row">{section('sheet')}</div>
      </section>
      <section className="board-section" id="returning">
        <h2 className="board-h2">Вернувшийся гость</h2>
        <div className="board-row">{section('returning')}</div>
      </section>
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
