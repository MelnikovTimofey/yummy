// Доска мокапа #175: компактная Витрина, как каталог Okko.
// Данные — 12 полок прода (showcase-data.js). Тонкая шапка, нижняя панель, подборка, карточка микса
// и «Покажите мастеру» — из гостевого UI-кита без изменений; новое здесь — CompactShowcase.
const DS = window.DesignSystem_1aef33;
const { ProfileGlyph, SignatureBar, RatingPill, ShowcaseCard } = DS;
const M = window.AROMA_MOCK;

const PROFILE_COLORS = { citrus: '--profile-citrus', berry: '--profile-berry', floral_herbal: '--profile-floral-herbal', fresh: '--profile-fresh', sweet: '--profile-sweet', spicy: '--profile-spicy', dessert: '--profile-dessert', tobacco: '--profile-tobacco', minty: '--profile-minty', fruity: '--profile-fruity', perfume: '--profile-perfume', sour: '--profile-sour' };
const profileColor = (id) => 'var(' + (PROFILE_COLORS[id] || '--profile-fallback') + ')';
const tint = (id, share) => 'color-mix(in srgb, ' + profileColor(id) + ' ' + share + '%, transparent)';

const RAIL_KIND = { statistical: 'Выбор гостей', prepared: 'Редакция', curated: 'Мастера' };
const shelfKind = (rail) => (rail.id === 'rail-statistical-rated' ? 'Оценки гостей' : RAIL_KIND[rail.type]);
const mixById = (id) => M.mixes.find((mix) => mix.id === id);

// Короткая полка для края «1–3 микса»: на проде таких нет, миксы реальные.
const SHORT_RAIL = { id: 'rail-curated-short', name: 'Мастер смены советует', type: 'curated', description: 'Два микса, которые мастер смены собрал бы себе.', mixIds: [M.rails[2].mixIds[0], M.rails[3].mixIds[1]] };
const EDGE_RAIL_IDS = ['rail-statistical-top', 'rail-prepared-on-ice', 'rail-prepared-bodrum-sunset'];

const NAV_ITEMS = [
  { id: 'recommendations', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
];

function Icon({ name, size = 24, stroke = 1.8 }) {
  const node = window.lucide.icons[name];
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
    <nav className="bottom-nav" aria-label="Гостевая навигация">
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          <Icon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

// ── Приглашение «Намиксуй» ──

function InviteCard({ onOpen }) {
  return (
    <button type="button" className="mixer-invite" onClick={onOpen}>
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={44} />
      <span className="mixer-invite-text">
        <span className="aroma-caps">Намиксуй</span>
        <span className="mixer-invite-title">Не нашли своё? Намиксуйте сами</span>
        <span className="mixer-invite-note">Основа, акцент и штрих — из того, что сегодня есть на полках.</span>
      </span>
    </button>
  );
}

function InviteStrip({ onOpen }) {
  return (
    <button type="button" className="sc-invite-strip" onClick={onOpen}>
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={32} />
      <span className="sc-invite-strip-text">
        <span className="aroma-caps" style={{ fontSize: 10 }}>Не нашли своё?</span>
        <span className="sc-invite-strip-title">Намиксуйте сами</span>
      </span>
      <span className="sc-chev"><Icon name="ChevronRight" size={20} /></span>
    </button>
  );
}

// ── Сейчас: витрина из кита + приглашение первым, как в apps/aroma-web.
// Фон карточки — как в приложении (у ShowcaseCard кита он старый, винный). ──

function ShowcaseNow({ rails, onOpen, onOpenRail, onOpenMixer }) {
  return (
    <section className="aroma-showcase">
      <InviteCard onOpen={onOpenMixer} />
      {rails.map((rail) => (
        <section key={rail.id} className="aroma-showcase-rail">
          <div className="aroma-showcase-head">
            <h2 className="aroma-showcase-title">{rail.name}</h2>
            <span className="aroma-caps aroma-showcase-kind">{shelfKind(rail)}</span>
          </div>
          <div className="aroma-scroller">
            {rail.mixIds.map(mixById).map((mix) => (
              <ShowcaseCard
                key={mix.id} name={mix.name} profiles={mix.flavorProfiles} flavors={mix.flavors} rating={mix.avgRating} onClick={() => onOpen(mix, 'showcase')}
                style={{ background: 'radial-gradient(circle at 86% 0%, ' + tint(mix.flavorProfiles[0], 28) + ' 0%, transparent 60%), var(--guest-card-bg)' }}
              />
            ))}
            <button type="button" className="aroma-showcase-all" onClick={() => onOpenRail(rail)} aria-label={'Открыть весь рейл «' + rail.name + '»'}>Все</button>
          </div>
        </section>
      ))}
    </section>
  );
}

// ── Новое: компактные карточки ──

function PosterCard({ mix, onClick }) {
  const [first, second = first] = mix.flavorProfiles;
  return (
    <button
      type="button"
      className="sc-poster"
      onClick={onClick}
      style={{ background: 'radial-gradient(circle at 88% 0%, ' + tint(first, 55) + ' 0%, transparent 62%), radial-gradient(circle at 0% 100%, ' + tint(second, 30) + ' 0%, transparent 58%), var(--guest-card-bg)' }}
    >
      <span className="sc-poster-top">
        <ProfileGlyph profiles={mix.flavorProfiles} size={28} />
        <RatingPill rating={mix.avgRating} style={{ padding: '2px 7px', fontSize: 10.5 }} />
      </span>
      <span className="sc-poster-name">{mix.name}</span>
      <span className="sc-poster-sig"><SignatureBar profiles={mix.flavorProfiles} height={2} /></span>
    </button>
  );
}

function TileCard({ mix, onClick }) {
  return (
    <button
      type="button"
      className="sc-tile"
      onClick={onClick}
      style={{ background: 'radial-gradient(circle at 86% 0%, ' + tint(mix.flavorProfiles[0], 30) + ' 0%, transparent 60%), var(--guest-card-bg)' }}
    >
      <span className="sc-tile-top">
        <ProfileGlyph profiles={mix.flavorProfiles} size={32} />
        <RatingPill rating={mix.avgRating} style={{ padding: '2px 7px', fontSize: 10.5 }} />
      </span>
      <span className="sc-tile-name">{mix.name}</span>
      <SignatureBar profiles={mix.flavorProfiles} height={2} />
      {mix.flavors.length ? <span className="sc-tile-flavors">{mix.flavors.join(' · ')}</span> : null}
    </button>
  );
}

function CompactShowcase({ rails, card, kind, invite, onOpen, onOpenRail, onOpenMixer }) {
  const Card = card === 'poster' ? PosterCard : TileCard;
  return (
    <section className="sc">
      {invite === 'strip' ? <InviteStrip onOpen={onOpenMixer} /> : <InviteCard onOpen={onOpenMixer} />}
      {rails.map((rail) => (
        <section key={rail.id} className="sc-rail">
          <h2 className="sc-head">
            <button type="button" className="sc-head-btn" onClick={() => onOpenRail(rail)} aria-label={'Открыть подборку «' + rail.name + '»'}>
              <span className="sc-title">{rail.name}</span>
              {kind ? <span className="aroma-caps sc-kind">{shelfKind(rail)}</span> : null}
              <span className="sc-chev"><Icon name="ChevronRight" size={22} /></span>
            </button>
          </h2>
          <div className="sc-scroller">
            {rail.mixIds.map(mixById).map((mix) => (
              <Card key={mix.id} mix={mix} onClick={() => onOpen(mix, 'showcase')} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

// ── Телефон ──

function MixerStub({ onBack }) {
  return (
    <section className="kit-mixer">
      <header className="kit-mixer-top">
        <button type="button" className="aroma-rail-back" onClick={onBack} aria-label="Назад">←</button>
        <h1 className="kit-mixer-title">Намиксуй</h1>
      </header>
      <p className="guest-status">Экран «Намиксуй» не меняется — в мокапе заглушка.</p>
    </section>
  );
}

function GuestPhone({ layout = 'poster', kind = false, invite = 'card', edge = false, selectedMixId = null, initialRail = null }) {
  const rails = edge ? [...EDGE_RAIL_IDS.map((id) => M.rails.find((r) => r.id === id)), SHORT_RAIL] : M.rails;
  const [view, setView] = React.useState(initialRail ? 'rail' : 'showcase');
  const [rail, setRail] = React.useState(initialRail ? M.rails.find((r) => r.id === initialRail) : null);
  const [railFilters, setRailFilters] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [selected, setSelected] = React.useState(() => {
    const mix = selectedMixId && mixById(selectedMixId);
    return mix ? { mix, source: 'showcase' } : null;
  });

  const openMix = (mix, source) => { setSheet({ mix, source }); setRating(0); };
  const chooseMix = (mix, source) => { setSelected({ mix, source }); setSheet(null); setView('confirmation'); };
  const openRail = (r) => { setRail(r); setRailFilters([]); setView('rail'); };
  const toggleFilter = (p) => setRailFilters((cur) => (p === null ? [] : cur.includes(p) ? cur.filter((v) => v !== p) : [...cur, p]));
  const showcaseProps = { rails, onOpen: openMix, onOpenRail: openRail, onOpenMixer: () => setView('mixer') };
  const withNav = view === 'showcase' || view === 'rail';

  return (
    <div className={'phone-shell' + (withNav ? ' with-bottom-nav' : '')}>
      {view === 'mixer' ? (
        <MixerStub onBack={() => setView('showcase')} />
      ) : view === 'confirmation' ? (
        <window.ConfirmationScreen mix={selected.mix} onDone={() => setView('showcase')} />
      ) : (
        <>
          {view !== 'rail' ? <Topbar /> : null}
          {selected && view !== 'rail' ? (
            <window.GuestSelectedBar mix={selected.mix} source={selected.source} onOpen={() => openMix(selected.mix, selected.source)} />
          ) : null}
          {view === 'rail' && rail ? (
            <div className="rail-in-shell">
              <window.RailScreen rail={rail} filters={railFilters} toggleFilter={toggleFilter} onBack={() => setView('showcase')} onOpen={openMix} />
            </div>
          ) : (
            <main className="content">
              {layout === 'now' ? <ShowcaseNow {...showcaseProps} /> : <CompactShowcase card={layout} kind={kind} invite={invite} {...showcaseProps} />}
            </main>
          )}
          {withNav ? <BottomNav value="showcase" onChange={(id) => (id === 'mixer' ? setView('mixer') : id === 'showcase' ? setView('showcase') : null)} /> : null}
        </>
      )}
      <window.MixSheet state={sheet} rating={rating} onRate={setRating} onClose={() => setSheet(null)} onChoose={chooseMix} />
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

function Toggle({ title, value, options, onChange }) {
  return (
    <div className="tweak">
      <span className="aroma-caps">{title}</span>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

const SHOTS = [
  { id: 'now', group: 'compare', name: 'Сейчас', note: 'Карточка 196 px, в кадре полторы карточки и две полки. Бейдж типа справа, «Все» в конце ленты.', props: { layout: 'now' } },
  { id: 'a', group: 'compare', name: 'A · постер', note: 'Горизонтальная карточка 156×92, около двух на экран, как у Okko. Название поверх градиента профиля, без вкусов.', props: { layout: 'poster' } },
  { id: 'b', group: 'compare', name: 'B · плотная', note: 'Вертикальная карточка 132 px, около 2,5 на экран. Остаются вкусы в одну строку.', props: { layout: 'tile' } },
  { id: 'a-kind', group: 'detail', name: 'Тип полки подписью', note: '«Выбор гостей», «Редакция», «Мастера» мелкими капсами перед шевроном. Без подписи — как у Okko.', props: { layout: 'poster', kind: true } },
  { id: 'a-strip', group: 'detail', name: 'Приглашение полосой', note: 'Низкая полоса 52 px вместо карточки 88 px: на экране помещается ещё треть полки.', props: { layout: 'poster', invite: 'strip' } },
  { id: 'a-edge', group: 'edge', name: 'A · края', note: 'Длинные названия миксов и полки, тип подписью, короткая полка из двух миксов.', props: { layout: 'poster', kind: true, edge: true } },
  { id: 'b-edge', group: 'edge', name: 'B · края', note: 'То же для плотной карточки.', props: { layout: 'tile', kind: true, edge: true } },
  { id: 'selected', group: 'edge', name: '«Карточка для мастера»', note: 'Выбранный микс закреплён под шапкой, полки прокручиваются под ним.', props: { layout: 'poster', selectedMixId: M.rails[0].mixIds[0] } },
  { id: 'rail', group: 'edge', name: 'Подборка по шеврону', note: 'Экран подборки не меняется: «←» возвращает на Витрину.', props: { layout: 'poster', initialRail: 'rail-prepared-on-ice' } },
];

function ShotFrame({ shot }) {
  return (
    <Frame name={shot.name} note={shot.note}>
      <GuestPhone {...shot.props} />
    </Frame>
  );
}

// mockups.html#shot=<id> — один телефон без доски: для скриншотов в issue и в PR реализации.
function Shot({ id }) {
  const shot = SHOTS.find((item) => item.id === id) ?? SHOTS[0];
  return (
    <div className="shot">
      <GuestPhone {...shot.props} />
    </div>
  );
}

function Board() {
  const [layout, setLayout] = React.useState('poster');
  const [kind, setKind] = React.useState(false);
  const [invite, setInvite] = React.useState('card');
  const section = (group) => SHOTS.filter((shot) => shot.group === group).map((shot) => <ShotFrame key={shot.id} shot={shot} />);
  return (
    <div className="board">
      <header className="board-head">
        <p className="aroma-caps">#175 · гость · 375 px</p>
        <h1 className="board-title">Компактная Витрина</h1>
        <p className="board-text">
          Полки, как в каталоге Okko: заголовок с шевроном открывает подборку, под ним лента небольших карточек.
          Карточки «Все» в конце ленты больше нет. Данные — 12 полок прода на 15 октября.
        </p>
      </header>

      <section className="board-section">
        <h2 className="board-h2">Кликабельный прототип</h2>
        <div className="tweaks">
          <Toggle title="Карточка" value={layout} options={[['poster', 'A · постер'], ['tile', 'B · плотная'], ['now', 'Сейчас']]} onChange={setLayout} />
          <Toggle title="Тип полки" value={kind} options={[[false, 'Нет'], [true, 'Подпись']]} onChange={setKind} />
          <Toggle title="Намиксуй" value={invite} options={[['card', 'Карточка'], ['strip', 'Полоса']]} onChange={setInvite} />
        </div>
        <div className="board-row">
          <Frame name="Попробуйте: заголовок полки → подборка, карточка → микс → «Покурить»">
            <GuestPhone key={layout + String(kind) + invite} layout={layout} kind={kind} invite={invite} />
          </Frame>
        </div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Сейчас и два варианта карточки — выбрать один</h2>
        <div className="board-row">{section('compare')}</div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Детали — решить отдельно</h2>
        <div className="board-row">{section('detail')}</div>
      </section>

      <section className="board-section">
        <h2 className="board-h2">Края и состояния</h2>
        <div className="board-row">{section('edge')}</div>
      </section>
    </div>
  );
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
