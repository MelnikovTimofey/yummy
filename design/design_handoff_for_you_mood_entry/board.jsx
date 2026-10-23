// Доска мокапа: вход в «Под настроение» с «Для вас». Три варианта вместо тихой ссылки под заголовком.
// Подбор (RecommendationsScreen), MixRow, чипы и карточки профилей берутся из гостевого UI-кита после канона #348.
// Миксы: витрина прода на 2026-10-15.

// ── Данные ──

// Оценок и выборов в снапшоте нет; число выборов условное, чтобы герой не показывал «0 выборов».
const CATALOG = window.AROMA_MOCK.mixes.map((mix) => ({ ...mix, ratingsCount: 0, popularity: mix.popularity || 3 + (mix.name.length % 9) }));
const mixOf = (id) => CATALOG.find((mix) => mix.id === id);
const profileLabel = (id) => window.AROMA_MOCK.profileLabels[id];

// «Для вас» вошедшего: набор из мокапа #349.
const FOR_YOU = {
  hero: { mix: mixOf('mix-catalog-hit-08'), reason: 'Ягодное, как вы любите, на персиковом чае' },
  taste: [
    { mix: mixOf('mix-catalog-hit-10'), reason: 'Черника и холодок, как в ваших любимых' },
    { mix: mixOf('mix-catalog-hit-03'), reason: 'Свежее и ягодное, но с яблоком' },
    { mix: mixOf('mix-catalog-hit-26'), reason: 'Похоже на микс «Морозная ягода», который вы выбирали' },
  ],
  sidestep: { mix: mixOf('mix-catalog-hit-02'), reason: 'Мастера часто сводят ягодное с цитрусовым' },
  again: { mix: mixOf('mix-catalog-hit-01'), reason: 'Ваша оценка ★ 5, выбирали 5 раз' },
};
// Подсказка после #384: строка наверху ведёт на микс «Шаг в сторону», сам блок скрыт.
const HINT = { text: 'Четыре из пяти последних миксов ягодные', mix: FOR_YOU.sidestep.mix };

// Холодный «Для вас»: выборов мало, подбор по онбордингу кабинета.
const COLD_NOTE = 'Пока подбираем по вкусам из онбординга. Личная подборка появится после нескольких выборов.';
const COLD = ['mix-catalog-hit-03', 'mix-catalog-hit-01', 'mix-catalog-hit-10', 'mix-catalog-hit-26', 'mix-catalog-hit-05'].map(mixOf);

// Под настроение: гость выбрал «Цитрусовый» и «Ягодный», вкусы пропустил.
const MOOD_PICK = ['citrus', 'berry'];
const matching = (profiles) => CATALOG.filter((mix) => profiles.every((p) => mix.flavorProfiles.includes(p)));
// Профили по числу миксов в наличии, как availableProfileOptions в приложении.
const PROFILES = Object.keys(window.AROMA_MOCK.profileLabels)
  .map((id) => [id, CATALOG.filter((mix) => mix.flavorProfiles.includes(id)).length])
  .filter(([, n]) => n)
  .sort((a, b) => b[1] - a[1])
  .map(([id]) => id);
const FLAVORS = window.AROMA_MOCK.flavors.slice(0, 18);

const MOOD_NOTE = 'Только на этот визит. Вкусы в кабинете не изменятся.';

const mixCount = (n) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return n + ' микс';
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return n + ' микса';
  return n + ' миксов';
};
const fits = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'Подходит ' : 'Подходят ') + mixCount(n);

// ── Оболочка ──

const MARK_SRC = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';
const NAV = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];

function GuestNav() {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {NAV.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={item.id === 'recs' ? 'page' : undefined}>
          <Icon name={item.icon} stroke={item.id === 'recs' ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

function GuestTopbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src={MARK_SRC} alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
      </div>
    </header>
  );
}

// ── Общие блоки «Для вас» ──

function ReasonRows({ rows }) {
  return (
    <div className="fy-list">
      {rows.map((row) => (
        <button key={row.mix.id} type="button" className="cab-row">
          <ProfileGlyph profiles={row.mix.flavorProfiles} size={44} />
          <span className="cab-row-text">
            <span className="cab-row-name">{row.mix.name}</span>
            <span className="cab-row-reason">{row.reason}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// «Для вас» после #384: подсказка строкой наверху, «Шаг в сторону» при ней скрыт.
function ForYouBody() {
  const { hero } = FOR_YOU;
  return (
    <>
      <button type="button" className="cab-row">
        <ProfileGlyph profiles={HINT.mix.flavorProfiles} size={44} />
        <span className="cab-row-text">
          <span className="fy-hint-text">{HINT.text}</span>
          <span className="cab-row-name">{HINT.mix.name}</span>
        </span>
      </button>
      <h2 className="aroma-section-title">Новое в вашем вкусе</h2>
      <article className="aroma-recs-hero">
        <div className="aroma-recs-hero-head">
          <ProfileGlyph profiles={hero.mix.flavorProfiles} size={64} />
          <div className="aroma-recs-hero-text">
            <h2 className="aroma-recs-hero-title">{hero.mix.name}</h2>
            <p className="aroma-recs-hero-desc">{hero.reason}</p>
          </div>
        </div>
        <SignatureBar profiles={hero.mix.flavorProfiles} height={6} />
        <CompositionStack components={hero.mix.components} showBar={false} />
        <AromaCTA>Покурить</AromaCTA>
      </article>
      <ReasonRows rows={FOR_YOU.taste} />
      <h2 className="aroma-section-title">Снова</h2>
      <ReasonRows rows={[FOR_YOU.again]} />
    </>
  );
}

// Подбор «под настроение» и холодный «Для вас» — обычный Подбор кита без «Изменить вкусы» и приглашения.
function Recs({ mixes }) {
  return <RecommendationsScreen mixes={mixes} onOpen={() => {}} onChoose={() => {}} editTastes="topbar" />;
}

function Screen({ children, dock, overlay }) {
  return (
    <div className="phone-shell">
      <GuestTopbar />
      <main className="content">{children}</main>
      {dock}
      <GuestNav />
      {overlay}
    </div>
  );
}

// ── Сейчас ──

function NowPhone() {
  return (
    <Screen>
      <h1 className="fy-title">Для вас</h1>
      <button type="button" className="fy-mood-link-now">Подобрать под настроение</button>
      <ForYouBody />
    </Screen>
  );
}

// ── A: две вкладки вместо заголовка ──
// Режим Подбора — вкладка. Выбор профилей открывается прямо во вкладке, результат живёт в ней до конца визита.

function ProfileGrid({ picked, onToggle }) {
  return (
    <div className="aroma-profile-grid">
      {PROFILES.map((id) => (
        <ProfileCard key={id} profile={id} label={profileLabel(id)} active={picked.includes(id)} onClick={() => onToggle(id)} />
      ))}
    </div>
  );
}

const toggled = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

function PhoneA({ tab: initialTab = 'fy', mood: initialMood = null, cold = false }) {
  const [tab, setTab] = React.useState(initialTab);
  // mood: null — не выбран, { picked, done }.
  const [mood, setMood] = React.useState(initialMood);
  const picked = mood?.picked ?? [];
  const count = matching(picked).length;
  const picking = tab === 'mood' && !mood?.done;

  const tabs = (
    <>
      <h1 className="sr-only">{tab === 'fy' ? 'Для вас' : 'Под настроение'}</h1>
      <div className="mood-tabs" role="tablist">
        <GuestTab active={tab === 'fy'} onClick={() => setTab('fy')}>Для вас</GuestTab>
        <GuestTab active={tab === 'mood'} onClick={() => setTab('mood')}>Под настроение</GuestTab>
      </div>
    </>
  );

  if (tab === 'fy') {
    return (
      <Screen>
        {tabs}
        {cold ? (
          <>
            <p className="fy-cold">{COLD_NOTE}</p>
            <Recs mixes={COLD} />
          </>
        ) : <ForYouBody />}
      </Screen>
    );
  }
  if (picking) {
    return (
      <Screen
        dock={(
          <div className="mood-dock">
            <p className="aroma-onboarding-count">{picked.length ? (count ? fits(count) : 'Под такой набор миксов нет. Снимите один из профилей.') : 'Можно выбрать несколько'}</p>
            <AromaCTA disabled={!count || !picked.length} onClick={() => setMood({ picked, done: true })}>Далее</AromaCTA>
          </div>
        )}
      >
        {tabs}
        <div className="mood-pick">
          <p className="aroma-onboarding-hint">{MOOD_NOTE}</p>
          <ProfileGrid picked={picked} onToggle={(id) => setMood({ picked: toggled(picked, id), done: false })} />
        </div>
      </Screen>
    );
  }
  return (
    <Screen>
      {tabs}
      <div className="aroma-section-row">
        <h2 className="aroma-section-title">{picked.map((id, i) => (i ? profileLabel(id).toLowerCase() : profileLabel(id))).join(', ')}</h2>
        <button type="button" className="aroma-text-link" onClick={() => setMood({ picked, done: false })}>Изменить</button>
      </div>
      <Recs mixes={matching(picked)} />
    </Screen>
  );
}

// ── B: профили строкой под заголовком ──
// Чип включает подбор под настроение сразу, без онбординга. Сняли все чипы — снова «Для вас».

function PhoneB({ picked: initialPicked = [], cold = false }) {
  const [picked, setPicked] = React.useState(initialPicked);
  const mood = picked.length > 0;
  // Выбранные — первыми; чип, с которым миксов не останется, бледный.
  const order = [...picked, ...PROFILES.filter((id) => !picked.includes(id))];
  return (
    <Screen>
      <h1 className="fy-title">{mood ? 'Под настроение' : 'Для вас'}</h1>
      <div className="mood-chips" role="group" aria-label="Подобрать под настроение">
        {order.map((id) => {
          const on = picked.includes(id);
          const empty = !on && mood && !matching([...picked, id]).length;
          return (
            <AromaChip key={id} active={on} disabled={empty} profile={id} onClick={() => setPicked(toggled(picked, id))}>
              {profileLabel(id)}{on ? <span className="aroma-catalog-tag-x" aria-hidden>×</span> : null}
            </AromaChip>
          );
        })}
      </div>
      {mood ? <Recs mixes={matching(picked)} /> : cold ? (
        <>
          <p className="fy-cold">{COLD_NOTE}</p>
          <Recs mixes={COLD} />
        </>
      ) : <ForYouBody />}
    </Screen>
  );
}

// ── C: значок у заголовка и шторка ──
// Тот же приём, что «Фильтры» в Каталоге: шторка с профилями и вкусами, CTA показывает подбор.

function MoodSheet({ draft, setDraft, onShow, onReset, onClose }) {
  const count = matching(draft.profiles).length;
  const chip = (kind, value) => {
    const on = draft[kind].includes(value);
    return (
      <AromaChip key={value} active={on} profile={kind === 'profiles' ? value : undefined} onClick={() => setDraft({ ...draft, [kind]: toggled(draft[kind], value) })}>
        {kind === 'profiles' ? profileLabel(value) : value}
      </AromaChip>
    );
  };
  return (
    <div className="aroma-sheet-overlay" onClick={onClose}>
      <section className="aroma-sheet" role="dialog" aria-label="Под настроение" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-catalog-sheet-head">
          <h2 className="aroma-sheet-title">Под настроение</h2>
          {draft.profiles.length || draft.flavors.length ? <button type="button" className="aroma-skip" onClick={onReset}>Сбросить</button> : null}
        </div>
        <p className="mood-sheet-hint">{MOOD_NOTE}</p>
        <section className="aroma-sheet-block">
          <h3 className="aroma-label">Характер</h3>
          <div className="aroma-catalog-sheet-chips">{PROFILES.map((id) => chip('profiles', id))}</div>
        </section>
        <section className="aroma-sheet-block">
          <h3 className="aroma-label">Вкусы</h3>
          <div className="aroma-catalog-sheet-chips">{FLAVORS.map((f) => chip('flavors', f))}</div>
        </section>
        <AromaCTA disabled={!draft.profiles.length || !count} onClick={onShow}>{draft.profiles.length && count ? 'Показать ' + mixCount(count) : 'Выберите характер'}</AromaCTA>
      </section>
    </div>
  );
}

function PhoneC({ picked: initialPicked = [], sheet: initialSheet = false, cold = false }) {
  const [picked, setPicked] = React.useState(initialPicked);
  const [sheet, setSheet] = React.useState(initialSheet);
  const [draft, setDraft] = React.useState({ profiles: initialSheet ? MOOD_PICK : initialPicked, flavors: [] });
  const mood = picked.length > 0;
  const open = () => { setDraft({ profiles: picked, flavors: [] }); setSheet(true); };
  return (
    <Screen
      overlay={sheet ? (
        <MoodSheet
          draft={draft}
          setDraft={setDraft}
          onClose={() => setSheet(false)}
          onReset={() => { setDraft({ profiles: [], flavors: [] }); setPicked([]); setSheet(false); }}
          onShow={() => { setPicked(draft.profiles); setSheet(false); }}
        />
      ) : null}
    >
      <div className="fy-head-row">
        <h1 className="fy-title">{mood ? 'Под настроение' : 'Для вас'}</h1>
        <button type="button" className={'mood-icon-btn' + (mood ? ' mood-icon-btn-on' : '')} aria-label="Подобрать под настроение" onClick={open}>
          <Icon name="SlidersHorizontal" size={22} />
          {mood ? <span className="mood-icon-dot" aria-hidden /> : null}
        </button>
      </div>
      {mood ? (
        <>
          <div className="mood-chips" role="group" aria-label="Выбрано">
            {picked.map((id) => (
              <AromaChip key={id} active profile={id} onClick={() => setPicked(picked.filter((p) => p !== id))}>
                {profileLabel(id)}<span className="aroma-catalog-tag-x" aria-hidden>×</span>
              </AromaChip>
            ))}
          </div>
          <Recs mixes={matching(picked)} />
        </>
      ) : cold ? (
        <>
          <p className="fy-cold">{COLD_NOTE}</p>
          <Recs mixes={COLD} />
        </>
      ) : <ForYouBody />}
    </Screen>
  );
}

// ── Доска ──

function Frame({ name, note, children }) {
  return (
    <figure className="frame">
      <p className="frame-name">{name}</p>
      {note ? <p className="frame-note">{note}</p> : null}
      {children}
    </figure>
  );
}

const SHOTS = [
  { id: 'now', group: 'now', name: 'Сейчас', note: 'Ссылку не отличить от текста.', render: () => <NowPhone /> },

  { id: 'a-fy', group: 'a', name: '«Для вас»', note: 'Вкладки вместо заголовка.', render: () => <PhoneA /> },
  { id: 'a-pick', group: 'a', name: 'Выбор профилей', note: 'Прямо во вкладке. Шаг вкусов как в онбординге.', render: () => <PhoneA tab="mood" mood={{ picked: MOOD_PICK, done: false }} /> },
  { id: 'a-result', group: 'a', name: 'Подбор', note: 'Живёт во вкладке до конца визита.', render: () => <PhoneA tab="mood" mood={{ picked: MOOD_PICK, done: true }} /> },
  { id: 'a-cold', group: 'a', name: 'Холодный «Для вас»', note: 'Выборов пока мало.', render: () => <PhoneA cold /> },

  { id: 'b-fy', group: 'b', name: '«Для вас»', note: 'Строка профилей под заголовком.', render: () => <PhoneB /> },
  { id: 'b-result', group: 'b', name: 'Выбраны два профиля', note: 'Подбор меняется сразу. Бледный чип не оставит миксов.', render: () => <PhoneB picked={MOOD_PICK} /> },
  { id: 'b-cold', group: 'b', name: 'Холодный «Для вас»', note: 'Выборов пока мало.', render: () => <PhoneB cold /> },

  { id: 'c-fy', group: 'c', name: '«Для вас»', note: 'Значок справа от заголовка.', render: () => <PhoneC /> },
  { id: 'c-sheet', group: 'c', name: 'Шторка', note: 'Как «Фильтры» в Каталоге.', render: () => <PhoneC sheet /> },
  { id: 'c-result', group: 'c', name: 'Подбор', note: 'Метка на значке. Крестик на последнем чипе возвращает «Для вас».', render: () => <PhoneC picked={MOOD_PICK} /> },
  { id: 'c-cold', group: 'c', name: 'Холодный «Для вас»', note: 'Выборов пока мало.', render: () => <PhoneC cold /> },
];

function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return <div className="shot">{shot.render()}</div>;
}

const GROUPS = [
  { id: 'now', title: 'Сейчас' },
  { id: 'a', title: 'A. Две вкладки', text: 'Режим Подбора виден всегда. Возврат в «Для вас» — та же вкладка, подбор под настроение не теряется до конца визита.' },
  { id: 'b', title: 'Б. Профили строкой', text: 'Тап по профилю сразу пересобирает Подбор. Без онбординга и без шага вкусов.' },
  { id: 'c', title: 'В. Значок и шторка', text: 'Приём из Каталога. Профили и вкусы на одной шторке, возврат крестиком на чипах или «Сбросить».' },
];

function Board() {
  return (
    <div className="board">
      <header className="board-head">
        <h1 className="board-title">Вход в «Под настроение»</h1>
        <p className="board-text">Три способа войти в подбор на один визит с «Для вас» вошедшего гостя. Телефоны живые: вкладки, чипы и шторка нажимаются.</p>
      </header>
      {GROUPS.map((group) => (
        <section key={group.id} className="board-section">
          <h2 className="board-h2">{group.title}</h2>
          {group.text ? <p className="frame-note">{group.text}</p> : null}
          <div className="board-row">
            {SHOTS.filter((shot) => shot.group === group.id).map((shot) => (
              <Frame key={shot.id} name={shot.name} note={shot.note}>{shot.render()}</Frame>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const shotParam = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotParam ? <Shot id={shotParam} /> : <Board />);
