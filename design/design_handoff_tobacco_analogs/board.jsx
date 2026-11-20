// Доска мокапа #475: аналоги табаков — микс не блокируется, если недостающий табак закрывает аналог с полки.
// Миксы — из сверки миксов мастера Nomad с полкой прода (2026-10-31). Состояние полки — как после того,
// как мастер задал первые аналоги.
const DS = window.DesignSystem_1aef33;
const { AromaCTA, AromaChip, SegmentNav, ProfileGlyph, SignatureBar, MasterTopBar, MasterPageHeader, MasterButton, MasterIconButton, MasterTag, MasterInput, MasterList, MasterSortPill, FilterChip } = DS;

const AN_MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';
const AN_LABELS = { berry: 'Ягодный', citrus: 'Цитрусовый', fruity: 'Фруктовый', minty: 'Мятный', sweet: 'Сладкий', fresh: 'Свежий', dessert: 'Десертный', floral_herbal: 'Травяной', sour: 'Кислый' };
const anLabel = (p) => AN_LABELS[p] || p;
const AN_COLORS = { citrus: '--profile-citrus', berry: '--profile-berry', floral_herbal: '--profile-floral-herbal', fresh: '--profile-fresh', sweet: '--profile-sweet', spicy: '--profile-spicy', dessert: '--profile-dessert', tobacco: '--profile-tobacco', minty: '--profile-minty', fruity: '--profile-fruity', perfume: '--profile-perfume', sour: '--profile-sour' };
const anTint = (id, share) => 'color-mix(in srgb, var(' + (AN_COLORS[id] || '--profile-fallback') + ') ' + share + '%, transparent)';
const anDot = (id) => 'var(' + (AN_COLORS[id] || '--profile-fallback') + ')';

// ── Данные ──
// sub — табак с полки, который сейчас стоит вместо закончившегося компонента (PRD §6.2 п.1).
const AN_MIXES = [
  {
    id: 'rootbeer', name: 'Рутбир с лимоном', status: 'sub', choices: 4, rating: '4,6',
    description: 'Кола и рутбир с лимонной кислинкой и мятной пастилкой.',
    flavorProfiles: ['sweet', 'citrus', 'minty'], flavors: ['кола', 'рутбир', 'лимон', 'мята'],
    components: [
      { manufacturer: 'Darkside', name: 'Darkside Cola', proportion: 25 },
      { manufacturer: 'Darkside', name: 'Lemonblast', proportion: 25, sub: { manufacturer: 'Black Burn', name: 'Lemon Shock' } },
      { manufacturer: 'Sebero', name: 'Root Beer', proportion: 20 },
      { manufacturer: 'Starline', name: 'Мятная пастилка', proportion: 30 },
    ],
  },
  {
    id: 'cherry', name: 'Вишня с виноградом', status: 'sub', choices: 2, rating: '4,5',
    description: 'Вишня мараскино и виноградный леденец с ноткой фейхоа.',
    flavorProfiles: ['berry', 'sweet', 'fruity'], flavors: ['вишня', 'виноград', 'фейхоа'],
    components: [
      { manufacturer: 'Black Burn', name: 'Chupa Graper', proportion: 40 },
      { manufacturer: 'Overdose', name: 'Maraschino Cherry', proportion: 40 },
      { manufacturer: 'Darkside', name: 'Green Beam', proportion: 20, sub: { manufacturer: 'Palitra', name: 'Feijoa' } },
    ],
  },
  {
    id: 'fig', name: 'Инжирный лимонад с персиком', status: 'visible', choices: 7, rating: '4,8',
    description: 'Инжирный лимонад, сочный персик и киви.',
    flavorProfiles: ['fruity', 'citrus', 'sweet'], flavors: ['инжир', 'лимонад', 'персик', 'киви'],
    components: [
      { manufacturer: 'Overdose', name: 'Fig Lemonade', proportion: 40 },
      { manufacturer: 'Black Burn', name: 'Peach Killer', proportion: 40 },
      { manufacturer: 'Black Burn', name: 'Kiwi Stoner', proportion: 20 },
    ],
  },
  {
    id: 'pomegranate', name: 'Гранатовое желе', status: 'visible', choices: 3, rating: '4,7',
    description: 'Гранатовый сок и виноградное желе на фруктовой пыли.',
    flavorProfiles: ['berry', 'fruity', 'sweet'], flavors: ['гранат', 'виноград', 'желе'],
    components: [
      { manufacturer: 'Darkside', name: 'Fruity Dust', proportion: 50 },
      { manufacturer: 'Сарма', name: 'Гранатовый сок', proportion: 30 },
      { manufacturer: 'Starline', name: 'Виноградное желе', proportion: 20 },
    ],
  },
  {
    id: 'lychee', name: 'Личи с кактусом', status: 'visible', choices: 1, rating: null,
    description: 'Содовая с личи, кактус и смородина на винограде.',
    flavorProfiles: ['fruity', 'fresh', 'berry'], flavors: ['личи', 'кактус', 'смородина', 'виноград'],
    components: [
      { manufacturer: 'Сарма', name: 'Содовая-Личи', proportion: 25 },
      { manufacturer: 'Darkside', name: 'Desert Eagle', proportion: 25 },
      { manufacturer: "Trofimoff's", name: 'Hurtleberry', proportion: 25 },
      { manufacturer: 'Overdose', name: 'Stellar Grape', proportion: 25 },
    ],
  },
  {
    id: 'cosmos', name: 'Виноградный космос', status: 'blocked', missing: ['Red Rush'], choices: 0, rating: null,
    description: 'Виноград, барбарис и манго с маракуйей.',
    flavorProfiles: ['berry', 'fruity', 'sour'], flavors: ['виноград', 'барбарис', 'манго'],
    components: [
      { manufacturer: 'Darkside', name: 'Cosmos', proportion: 30 },
      { manufacturer: 'Darkside', name: 'Grape Core', proportion: 25 },
      { manufacturer: 'Darkside', name: 'Red Rush', proportion: 25 },
      { manufacturer: 'Darkside', name: 'Falling Star', proportion: 20 },
    ],
  },
  {
    id: 'tarragon', name: 'Ежевичный тархун', status: 'blocked', missing: ['Estragon', 'Melonade'], choices: 0, rating: null,
    description: 'Ежевичный лимонад, тархун и дыня.',
    flavorProfiles: ['berry', 'floral_herbal', 'fresh'], flavors: ['ежевика', 'тархун', 'дыня'],
    components: [
      { manufacturer: 'Black Burn', name: 'Blackberry Lemonade', proportion: 40 },
      { manufacturer: 'MUSTHAVE', name: 'Melonade', proportion: 40 },
      { manufacturer: 'MUSTHAVE', name: 'Estragon', proportion: 20 },
    ],
  },
];
const anMix = (id) => AN_MIXES.find((mix) => mix.id === id);
// Что гость видит в составе: табак с полки вместо закончившегося.
const asServed = (mix) => mix.components.map((c) => (c.sub ? { ...c.sub, proportion: c.proportion, substitute: true } : c));

// Карточки полки: аналоги в порядке замены и похожие табаки с полки по flavors.
const AN_SHELF = {
  lemonblast: {
    manufacturer: 'Darkside', name: 'Lemonblast', profiles: ['citrus'], left: '0 г', leftNote: 'закончился 28 окт', rate: '9 г/день', rateNote: 'по 4 отметкам за 60 дней',
    analogs: [
      { manufacturer: 'Black Burn', name: 'Lemon Shock', stock: '140 г', on: true },
      { manufacturer: 'AHF Tobacco', name: 'Лимонный фреш', stock: '90 г', on: true },
    ],
    similar: [
      { manufacturer: 'Deus', name: 'Sugar Lemon', flavors: 'лимон, сахар' },
      { manufacturer: 'Sebero', name: 'Лимонная шипучка', flavors: 'лимон, газировка' },
    ],
    mixes: [{ id: 'rootbeer', note: 'Lemon Shock вместо Lemonblast' }],
  },
  redrush: {
    manufacturer: 'Darkside', name: 'Red Rush', profiles: ['berry', 'sour'], left: '0 г', leftNote: 'закончился', rate: 'нет данных', rateNote: 'прихода ещё не было',
    analogs: [],
    similar: [
      { manufacturer: 'Sebero', name: 'Barberry', flavors: 'барбарис' },
      { manufacturer: 'Sebero', name: 'Барбарис', flavors: 'барбарис' },
      { manufacturer: "Trofimoff's", name: 'Crespino', flavors: 'барбарис' },
    ],
    mixes: [{ id: 'cosmos', note: 'нет аналога' }],
  },
};

const AN_TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'shelf', label: 'Полка' },
  { id: 'deliveries', label: 'Поставки' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'mixes', label: 'Миксы' },
  { id: 'rails', label: 'Рейлы' },
  { id: 'access', label: 'Доступ' },
];

function Ic({ name, size = 15, fill = 'none', stroke = 1.8 }) {
  const node = window.lucide && window.lucide.icons[name];
  if (!node) return null;
  const children = node[0] === 'svg' ? node[2] : node;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

// ── Мастер: экран «Миксы» ──

function MixStatus({ mix, onMissing }) {
  if (mix.status === 'sub') {
    const c = mix.components.find((item) => item.sub);
    return (
      <span className="an-status">
        <MasterTag tone="info">с заменой</MasterTag>
        <small>{c.sub.name + ' вместо ' + c.name}</small>
      </span>
    );
  }
  if (mix.status === 'blocked') {
    return (
      <span className="an-status">
        <MasterTag tone="warning">блокирован</MasterTag>
        <small>
          {'Нет: '}
          {mix.missing.map((name, i) => (
            <React.Fragment key={name}>
              {i ? ', ' : null}
              <button type="button" className="an-inline-link" onClick={() => onMissing && onMissing(name)}>{name}</button>
            </React.Fragment>
          ))}
        </small>
      </span>
    );
  }
  return <span className="an-status"><MasterTag tone="neutral">виден</MasterTag></span>;
}

function MixesPage({ onMissing }) {
  const counts = { all: AN_MIXES.length, visible: 0, sub: 0, hidden: 0, blocked: 0 };
  AN_MIXES.forEach((mix) => { counts[mix.status] += 1; });
  const columns = [
    { key: 'name', label: 'Микс', width: 'minmax(0,1.6fr)', wrap: true, render: (mix) => (
      <span className="an-mix-name">
        <b>{mix.name}<i>{mix.components.map((c) => c.proportion).join('/')}</i></b>
        <span>{mix.description}</span>
      </span>
    ) },
    { key: 'composition', label: 'Состав', width: 'minmax(0,1.2fr)', wrap: true, render: (mix) => <span className="an-composition">{mix.components.map((c) => c.name).join(' + ')}</span> },
    { key: 'profiles', label: 'Профиль', width: 'minmax(0,1fr)', wrap: true, render: (mix) => (
      <span className="an-profiles">{mix.flavorProfiles.map((p) => <span key={p} className="an-profile"><i style={{ background: anDot(p) }} />{anLabel(p)}</span>)}</span>
    ) },
    { key: 'status', label: 'Статус', width: '200px', wrap: true, render: (mix) => <MixStatus mix={mix} onMissing={onMissing} /> },
    { key: 'choices', label: 'Выборы', width: '80px', render: (mix) => <span className="an-num">{mix.choices}</span> },
    { key: 'rating', label: 'Рейтинг', width: '80px', render: (mix) => <span className="an-num">{mix.rating ? '★ ' + mix.rating : '—'}</span> },
    { key: 'actions', label: '', width: '132px', render: () => (
      <span className="cell-actions">
        <MasterIconButton small label="Изменить"><Ic name="Pencil" /></MasterIconButton>
        <MasterIconButton small label="Копировать"><Ic name="Copy" /></MasterIconButton>
        <MasterIconButton small label="Скрыть"><Ic name="EyeOff" /></MasterIconButton>
      </span>
    ) },
  ];
  return (
    <div className="page">
      <MasterPageHeader title="Каталог миксов" meta="7 миксов, 5 в рейлах" actions={<MasterButton variant="primary" icon={<Ic name="Plus" />}>Новый микс</MasterButton>} />
      <div className="an-toolbar">
        <div className="an-toolbar-row">
          <MasterInput placeholder="Микс или табак" icon={<Ic name="Search" size={14} />} style={{ width: 300 }} />
          <FilterChip active>Все</FilterChip>
          <FilterChip count={counts.visible}>Виден гостю</FilterChip>
          <FilterChip count={counts.sub}>С заменой</FilterChip>
          <FilterChip count={counts.hidden}>Скрыт</FilterChip>
          <FilterChip count={counts.blocked}>Блокирован</FilterChip>
        </div>
        <div className="an-toolbar-row an-toolbar-sep">
          {['Профиль', 'Рейлы', 'Бренды', 'Вкусы', 'Мета-теги'].map((name) => <FilterChip key={name}><span className="an-chip-attr">{name}<Ic name="ChevronDown" size={13} /></span></FilterChip>)}
          <MasterSortPill value="demand" options={[{ key: 'demand', label: 'По спросу' }]} style={{ marginLeft: 'auto' }} />
        </div>
      </div>
      <MasterList columns={columns} rows={AN_MIXES} />
    </div>
  );
}

// ── Мастер: экран «Полка» с колонкой «Аналоги» ──

// Аналоги в строке — список этого табака в его порядке замены. sub — тот, что сейчас стоит в миксах вместо закончившегося.
const AN_SHELF_ROWS = [
  { id: 'lemonblast', manufacturer: 'Darkside', name: 'Lemonblast', left: 0, full: 250, rate: '9 г/день', until: 'закончился 28 окт', status: 'out', arrived: '2 окт', supplier: 'Южный табак', mixes: 1,
    analogs: [{ name: 'Lemon Shock', on: true, sub: true }, { name: 'Лимонный фреш', on: true }] },
  { id: 'lemonshock', manufacturer: 'Black Burn', name: 'Lemon Shock', left: 140, full: 200, rate: '6 г/день', until: '24 ноя', days: 23, status: 'ok', arrived: '20 окт', supplier: 'Каспий Опт', mixes: 2,
    analogs: [{ name: 'Lemonblast', on: false }] },
  { id: 'lemonfresh', manufacturer: 'AHF Tobacco', name: 'Лимонный фреш', left: 90, full: 100, rate: 'мало данных', until: '—', status: 'ok', arrived: '27 окт', supplier: 'Каспий Опт', mixes: 0,
    analogs: [{ name: 'Lemonblast', on: false }] },
  { id: 'greenbeam', manufacturer: 'Darkside', name: 'Green Beam', left: 0, full: 250, rate: '7 г/день', until: 'закончился 30 окт', status: 'out', arrived: '2 окт', supplier: 'Южный табак', mixes: 1,
    analogs: [{ name: 'Feijoa', on: true, sub: true }] },
  { id: 'redrush', manufacturer: 'Darkside', name: 'Red Rush', left: 0, full: 250, rate: 'мало данных', until: 'закончился', status: 'out', arrived: '—', supplier: '', mixes: 1, analogs: [] },
  { id: 'canemint', manufacturer: 'Black Burn', name: 'Cane Mint', left: 40, full: 400, rate: '21 г/день', until: '3 ноя', days: 2, status: 'ending', arrived: '20 окт', supplier: 'Каспий Опт', mixes: 3,
    analogs: [{ name: 'Ледяная мята', on: true }, { name: 'Supernova', on: true }, { name: 'Spearmint', on: false }] },
  { id: 'cola', manufacturer: 'Darkside', name: 'Darkside Cola', left: 180, full: 250, rate: '5 г/день', until: '7 дек', days: 36, status: 'ok', arrived: '20 окт', supplier: 'Южный табак', mixes: 2, analogs: [] },
];

function ShelfLevel({ row }) {
  const share = row.full ? row.left / row.full : 0;
  const tone = row.status === 'ending' ? ' crit' : '';
  return (
    <span className="lvl">
      <span className={'lvl-bar' + tone + (row.left === 0 ? ' none' : '')}><i style={{ width: Math.max(row.left ? 4 : 0, share * 100) + '%' }} /></span>
      <span className="lvl-copy">
        <b className={row.left === 0 ? 'inv-danger' : ''}>{row.left === 0 ? '0 г' : '≈ ' + row.left + ' г'}</b>
        <small>из {row.full} г после прихода</small>
      </span>
    </span>
  );
}

function ShelfUntil({ row }) {
  if (row.status === 'out') return <span className="inv-until"><span className="inv-danger">{row.until}</span></span>;
  if (row.days == null) return <span className="inv-faint">—</span>;
  return (
    <span className="inv-until">
      <span className={'inv-num' + (row.days <= 3 ? ' inv-danger' : '')}>{row.until}</span>
      {row.status === 'ending' ? <small className="inv-warn">заканчивается</small> : null}
    </span>
  );
}

// Два первых аналога, остальное — «ещё N». Закончившиеся приглушены, стоящий сейчас в миксах — с иконкой замены.
function ShelfAnalogs({ row }) {
  if (!row.analogs.length) return <span className="inv-faint">—</span>;
  const head = row.analogs.slice(0, 2);
  const rest = row.analogs.length - head.length;
  return (
    <span className="an-shelf-analogs" title={row.analogs.map((a) => a.name).join(', ')}>
      {head.map((a, i) => (
        <span key={a.name} className={'an-shelf-analog' + (a.on ? '' : ' off')}>
          {a.name}
          {a.sub ? <span className="an-sub-mark" role="img" aria-label="стоит в миксах вместо этого табака" title="стоит в миксах вместо этого табака"><Ic name="ArrowLeftRight" size={12} /></span> : null}
          {i === 1 && rest ? <span className="inv-faint">ещё {rest}</span> : null}
        </span>
      ))}
    </span>
  );
}

function ShelfPage() {
  const columns = [
    { key: 'name', label: 'Табак', width: 'minmax(0,1fr)', render: (r) => <span className="inv-name"><b>{r.name}</b><span>{r.manufacturer}</span></span> },
    { key: 'analogs', label: 'Аналоги', width: 'minmax(0,1fr)', render: (r) => <ShelfAnalogs row={r} /> },
    { key: 'left', label: 'Остаток по учёту', width: '200px', render: (r) => <ShelfLevel row={r} /> },
    { key: 'rate', label: 'Расход', width: '110px', render: (r) => <span className={r.rate === 'мало данных' ? 'inv-faint' : 'inv-num'}>{r.rate}</span> },
    { key: 'until', label: 'Хватит до', width: '140px', render: (r) => <ShelfUntil row={r} /> },
    { key: 'arrived', label: 'Приход', width: '110px', render: (r) => <span className="inv-name"><b style={{ fontWeight: 400 }}>{r.arrived}</b><span>{r.supplier}</span></span> },
    { key: 'mixes', label: 'Миксы', width: '60px', align: 'right', render: (r) => <span className="inv-num">{r.mixes || <span className="inv-faint">—</span>}</span> },
    { key: 'actions', label: '', width: '200px', align: 'right', render: (r) => (
      r.status === 'out'
        ? <span className="inv-faint">в заказе</span>
        : <span className="cell-actions"><MasterButton size="sm" variant="ghost">Указать остаток</MasterButton><MasterButton size="sm">Закончился</MasterButton></span>
    ) },
  ];
  return (
    <div className="page">
      <MasterPageHeader title="Полка" meta="269 позиций, 78 кг" actions={(
        <span className="inv-seg">
          <button aria-pressed="true">Полка</button>
          <button aria-pressed="false">К заказу</button>
          <button aria-pressed="false">Закупка</button>
        </span>
      )} />
      <div className="an-toolbar">
        <div className="an-toolbar-row">
          <MasterInput placeholder="Табак или бренд" icon={<Ic name="Search" size={14} />} style={{ width: 260 }} />
          {[['Все', null, true], ['Есть', 233], ['Заканчивается', 14], ['Проверьте остаток', 9], ['Закончились', 6], ['Стоп', 3], ['В плане', 4]].map(([label, count, active]) => (
            <FilterChip key={label} active={active} count={count == null ? undefined : count}>{label}</FilterChip>
          ))}
          <MasterSortPill value="until" options={[{ key: 'until', label: 'Хватит до' }]} style={{ marginLeft: 'auto' }} />
        </div>
      </div>
      <MasterList columns={columns} rows={AN_SHELF_ROWS} />
    </div>
  );
}

// ── Мастер: карточка табака на полке с блоком «Аналоги» ──

function AnalogRow({ item, index, total }) {
  return (
    <li className="an-analog">
      <span className="an-analog-n">{index + 1}</span>
      <span className="an-analog-name"><small>{item.manufacturer}</small><b>{item.name}</b></span>
      <span className={'an-analog-stock' + (item.on ? '' : ' off')}>{item.on ? item.stock : 'закончился'}</span>
      <span className="cell-actions">
        <MasterIconButton small label="Выше" disabled={index === 0}><Ic name="ArrowUp" size={14} /></MasterIconButton>
        <MasterIconButton small label="Ниже" disabled={index === total - 1}><Ic name="ArrowDown" size={14} /></MasterIconButton>
        <MasterIconButton small label="Убрать из аналогов"><Ic name="X" size={14} /></MasterIconButton>
      </span>
    </li>
  );
}

function ShelfDrawer({ card }) {
  const t = AN_SHELF[card];
  return (
    <aside className="inv-drawer" aria-label={'Карточка: ' + t.name}>
      <div className="inv-drawer-head">
        <div className="an-drawer-top">
          <p className="inv-eyebrow">{t.manufacturer}</p>
          <MasterIconButton small label="Закрыть"><Ic name="X" /></MasterIconButton>
        </div>
        <h2 className="inv-h1">{t.name}</h2>
        <span className="an-profiles">{t.profiles.map((p) => <span key={p} className="an-profile"><i style={{ background: anDot(p) }} />{anLabel(p)}</span>)}</span>
      </div>
      <div className="inv-kv">
        <div><span>Остаток</span><b>{t.left}</b><small>{t.leftNote}</small></div>
        <div><span>Расход</span><b>{t.rate}</b><small>{t.rateNote}</small></div>
      </div>

      <section className="an-section">
        <h3 className="inv-h3">Аналоги</h3>
        {t.analogs.length ? (
          <>
            <ol className="an-analogs">{t.analogs.map((item, i) => <AnalogRow key={item.name} item={item} index={i} total={t.analogs.length} />)}</ol>
            <p className="hint">Гостю ставим первый, который есть на полке.</p>
          </>
        ) : <p className="hint">Аналогов нет.</p>}
        <MasterInput placeholder="Добавить аналог" icon={<Ic name="Search" size={14} />} />
      </section>

      <section className="an-section">
        <h3 className="inv-h3">Похожие на полке</h3>
        <ul className="an-similar">
          {t.similar.map((item) => (
            <li key={item.manufacturer + item.name}>
              <span className="an-analog-name"><small>{item.manufacturer}</small><b>{item.name}</b></span>
              <span className="an-similar-flavors">{item.flavors}</span>
              <MasterButton size="sm">Сделать аналогом</MasterButton>
            </li>
          ))}
        </ul>
      </section>

      <section className="an-section">
        <h3 className="inv-h3">В миксах</h3>
        <ul className="an-in-mixes">
          {t.mixes.map(({ id, note }) => {
            const mix = anMix(id);
            return (
              <li key={id}>
                <b>{mix.name}</b>
                <MixStatus mix={mix} />
                {mix.status === 'blocked' ? null : <span className="an-similar-flavors">{note}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}

function MasterDesk({ card, page = 'mixes' }) {
  return (
    <div className="desk">
      <div className="desk-scroll">
        <main className="shell">
          <MasterTopBar markSrc={AN_MARK} items={AN_TABS} active={page} userName="maxim" userRole="master" onOpenCommandPalette={() => {}} />
          <section className="stage">{page === 'shelf' ? <ShelfPage /> : <MixesPage />}</section>
        </main>
      </div>
      {card ? (
        <>
          <div className="inv-scrim" />
          <ShelfDrawer card={card} />
        </>
      ) : null}
    </div>
  );
}

// ── Гость ──

function GuestIcon({ name, size = 24, stroke = 1.8, fill = 'none' }) {
  return <Ic name={name} size={size} stroke={stroke} fill={fill} />;
}

function GuestTopbar() {
  return (
    <header className="topbar">
      <div className="topbar-main-row">
        <button type="button" className="brand-home-btn">
          <img className="brand-mark" src={AN_MARK} alt="" aria-hidden />
          <span className="brand">Арома Ателье</span>
        </button>
        <button type="button" className="topbar-icon-btn" aria-label="Карточка для мастера"><GuestIcon name="ClipboardList" size={20} /></button>
      </div>
    </header>
  );
}

const AN_NAV = [
  { id: 'recs', label: 'Подбор', icon: 'Sparkles' },
  { id: 'showcase', label: 'Витрина', icon: 'GalleryHorizontalEnd' },
  { id: 'reels', label: 'Рилсы', icon: 'Clapperboard' },
  { id: 'catalog', label: 'Каталог', icon: 'Search' },
  { id: 'mixer', label: 'Миксер', icon: 'Blend' },
  { id: 'cabinet', label: 'Кабинет', icon: 'CircleUserRound' },
];

function GuestNav({ value }) {
  return (
    <nav className="bottom-nav nav-6" aria-label="Гостевая навигация">
      {AN_NAV.map((item) => (
        <button key={item.id} type="button" className="bottom-nav-item" aria-label={item.label} aria-current={value === item.id ? 'page' : undefined}>
          <GuestIcon name={item.icon} stroke={value === item.id ? 2.1 : 1.8} />
        </button>
      ))}
    </nav>
  );
}

// Состав как в CompositionStack, у замены после названия — иконка.
const AN_PALETTE = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];
function ServedStack({ mix, showBar = true }) {
  const rows = asServed(mix).sort((a, b) => b.proportion - a.proportion);
  return (
    <div className="an-stack">
      {showBar ? (
        <div className="an-stack-bar">
          {rows.map((c, i) => <span key={c.name} aria-hidden style={{ flexGrow: c.proportion, background: AN_PALETTE[i % AN_PALETTE.length] }} />)}
        </div>
      ) : null}
      <ul className="an-stack-rows">
        {rows.map((c, i) => (
          <li key={c.name}>
            <span className="an-stack-dot" aria-hidden style={{ background: AN_PALETTE[i % AN_PALETTE.length] }} />
            <span className="an-stack-brand">{c.manufacturer}</span>
            <span className="an-stack-name">
              {c.name}
              {c.substitute ? <span className="an-sub-mark" role="img" aria-label="замена" title="замена"><Ic name="ArrowLeftRight" size={13} /></span> : null}
            </span>
            <span className="an-stack-pct">{c.proportion + '%'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuestSheet({ mix, source }) {
  return (
    <div className="aroma-sheet-overlay">
      <section className="aroma-sheet" role="dialog" aria-label={mix.name} style={{ background: 'radial-gradient(circle at 88% 0%, ' + anTint(mix.flavorProfiles[0], 31) + ' 0%, transparent 50%), var(--guest-sheet-bg)' }}>
        <span className="aroma-sheet-handle" aria-hidden />
        <div className="aroma-sheet-head">
          <ProfileGlyph profiles={mix.flavorProfiles} size={72} />
          <div className="aroma-sheet-head-text">
            {source ? <p className="aroma-caps">{source}</p> : null}
            <h2 className="aroma-sheet-title">{mix.name}</h2>
            <SignatureBar profiles={mix.flavorProfiles} height={4} />
          </div>
          <button type="button" className="heart-btn" aria-pressed="false" aria-label="В избранное"><GuestIcon name="Heart" size={22} /></button>
        </div>
        <p className="aroma-sheet-desc">{mix.description}</p>
        <div className="aroma-sheet-tags">
          {mix.flavorProfiles.map((p) => <AromaChip key={p} tier="lg" active profile={p}>{anLabel(p)}</AromaChip>)}
          {mix.flavors.map((f) => <AromaChip key={f}>{f}</AromaChip>)}
        </div>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Состав микса</p>
          <ServedStack mix={mix} />
        </section>
        <section className="aroma-sheet-block">
          <p className="aroma-caps">Ваша оценка</p>
          <div className="aroma-stars" role="group" aria-label="Оценка микса">
            {[1, 2, 3, 4, 5].map((v) => <button key={v} type="button" className="aroma-star" aria-label={'Оценить на ' + v}>★</button>)}
          </div>
        </section>
        <div className="aroma-sheet-actions">
          <button type="button" className="aroma-ghost">Закрыть</button>
          <AromaCTA pulse>Покурить</AromaCTA>
        </div>
      </section>
    </div>
  );
}

function GuestConfirm({ mix }) {
  return (
    <section className="aroma-confirm">
      <div className="aroma-confirm-topbar">
        <p className="aroma-confirm-note">Покажите мастеру</p>
        <button type="button" className="aroma-confirm-done">Готово</button>
      </div>
      <div className="aroma-confirm-stack">
        <ProfileGlyph profiles={mix.flavorProfiles} size={96} />
        <h1 className="aroma-confirm-title">{mix.name}</h1>
        <p className="aroma-confirm-profiles">{mix.flavorProfiles.map((p, i) => (i ? anLabel(p).toLowerCase() : anLabel(p))).join(', ')}</p>
        <SignatureBar profiles={mix.flavorProfiles} height={3} />
      </div>
      <section className="aroma-confirm-composition" aria-label="Состав">
        <ServedStack mix={mix} showBar={false} />
      </section>
      <button type="button" className="aroma-ghost aroma-confirm-rate">Оценить, когда соберут</button>
    </section>
  );
}

function CabRow({ mix, note }) {
  return (
    <button type="button" className="cab-row">
      <ProfileGlyph profiles={mix.flavorProfiles} size={44} />
      <span className="cab-row-text">
        <span className="cab-row-name">{mix.name}</span>
        <SignatureBar profiles={mix.flavorProfiles} height={3} />
        {note ? <span className="cab-row-note">{note}</span> : null}
      </span>
    </button>
  );
}

function GuestFavorites() {
  return (
    <section className="cab">
      <h1 className="fy-title">Кабинет</h1>
      <SegmentNav items={[{ id: 'history', label: 'История' }, { id: 'favorites', label: 'Избранное' }]} value="favorites" onChange={() => {}} />
      <div className="cab-list">
        <CabRow mix={anMix('rootbeer')} />
        <CabRow mix={anMix('tarragon')} note="Сейчас нет: MUSTHAVE Melonade" />
        <CabRow mix={anMix('pomegranate')} />
      </div>
    </section>
  );
}

function GuestCatalog() {
  return (
    <section className="cab">
      <h1 className="fy-title">Каталог</h1>
      <div className="cab-list">
        {['rootbeer', 'fig', 'pomegranate', 'cherry', 'lychee'].map((id) => <CabRow key={id} mix={anMix(id)} note={anMix(id).flavors.join(', ')} />)}
      </div>
    </section>
  );
}

function GuestPhone({ view, sheet }) {
  if (view === 'confirm') {
    return <div className="phone-shell"><GuestConfirm mix={anMix('rootbeer')} /></div>;
  }
  return (
    <div className="phone-shell">
      <GuestTopbar />
      <main className="content">{view === 'cabinet' ? <GuestFavorites /> : <GuestCatalog />}</main>
      <GuestNav value={view === 'cabinet' ? 'cabinet' : 'catalog'} />
      {sheet ? <GuestSheet mix={anMix(sheet.mix)} source={sheet.source} /> : null}
    </div>
  );
}

// ── Доска ──

const AN_SHOTS = [
  { id: 'mixes', group: 'master', name: 'Миксы', note: 'Новый статус «с заменой»: какой табак стоит вместо какого. У блокированного названо, чего нет, имя табака открывает его карточку. «Ежевичный тархун» блокирован: нет двух табаков, а замена допускается одна.', desk: {} },
  { id: 'shelf', group: 'master', name: 'Полка', note: 'Новая колонка «Аналоги»: аналоги табака в его порядке замены. Связь взаимная: Lemon Shock аналог Lemonblast, значит, и Lemonblast аналог Lemon Shock. Закончившиеся приглушены. У закончившегося табака иконкой отмечен тот, что сейчас стоит вместо него в миксах. Если аналогов нет, в ячейке прочерк.', desk: { page: 'shelf' } },
  { id: 'shelf-analogs', group: 'master', name: 'Карточка табака: аналоги заданы', note: 'Lemonblast закончился. Порядок в списке и есть порядок замены, стрелками меняется. Ниже похожие табаки с полки и миксы, где табак сейчас подменён.', desk: { card: 'lemonblast', page: 'shelf' } },
  { id: 'shelf-suggest', group: 'master', name: 'Карточка табака: аналогов нет', note: 'Открыта из «Миксов» по ссылке «Нет: Red Rush». Похожие на полке подобраны по flavors, «Сделать аналогом» в одно действие делает микс видимым с заменой.', desk: { card: 'redrush' } },
  { id: 'sheet-sub', group: 'guest', name: 'Карточка микса с заменой', note: 'Гость видит табак, который стоит на полке. После названия иконка замены. Остальное как у любого микса: оценка, «Покурить».', phone: { view: 'catalog', sheet: { mix: 'rootbeer' } } },
  { id: 'confirm-sub', group: 'guest', name: 'Покажите мастеру', note: 'Мастер собирает по этому экрану, поэтому замена видна и здесь.', phone: { view: 'confirm' } },
  { id: 'cab-fav', group: 'guest', name: 'Избранное', note: 'Микс с заменой доступен, без пометки в строке. «Сейчас нет» остаётся только у миксов, которые не собрать и с заменой.', phone: { view: 'cabinet' } },
];

function AnFrame({ shot }) {
  return (
    <figure className={'frame' + (shot.desk ? ' frame-desk' : '')}>
      <figcaption className="frame-label">
        <p className="frame-name">{shot.name}</p>
        <p className="frame-note">{shot.note}</p>
      </figcaption>
      {shot.desk ? <MasterDesk {...shot.desk} /> : <GuestPhone {...shot.phone} />}
    </figure>
  );
}

function AnShot({ id }) {
  const shot = AN_SHOTS.find((item) => item.id === id) || AN_SHOTS[0];
  return <div className="shot">{shot.desk ? <MasterDesk {...shot.desk} /> : <GuestPhone {...shot.phone} />}</div>;
}

function AnBoard() {
  const section = (group) => AN_SHOTS.filter((shot) => shot.group === group).map((shot) => <AnFrame key={shot.id} shot={shot} />);
  return (
    <div className="board">
      <header className="board-head">
        <h1 className="board-title">Аналоги табаков</h1>
        <p className="board-text">#475. Если у микса закончился один табак, а мастер задал ему аналог, который есть на полке, микс остаётся у гостя с заменой. Правила в PRD §6.2 п.1 и §9.3 п.6. Миксы из сверки миксов мастера с полкой прода 31 октября.</p>
      </header>
      <section className="board-section">
        <h2 className="board-h2">Мастер</h2>
        <div className="board-row board-col">{section('master')}</div>
      </section>
      <section className="board-section">
        <h2 className="board-h2">Гость</h2>
        <div className="board-row">{section('guest')}</div>
      </section>
    </div>
  );
}

const anShotId = (location.hash.match(/shot=([\w-]+)/) || [])[1];
ReactDOM.createRoot(document.getElementById('root')).render(anShotId ? <AnShot id={anShotId} /> : <AnBoard />);
