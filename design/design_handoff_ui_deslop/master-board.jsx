/* eslint-disable */
// Мокап #348 для Мастера: пары «было / стало». Было: снимок прода из screens/.
// Стало: тот же экран по канону без признаков генерации. Режим #shot=<id>
// показывает один экран «стало» без доски.
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterStatsRow, MasterPageHeader, FilterChip, MasterList, MasterCard, MasterTopBar, EmptyState } = window.DesignSystem_1aef33;

const MARK = '../../.claude/skills/aroma-atelier-design/assets/logo-mark-oxblood.svg';
const SHOT = (name) => 'screens/' + name + '.webp';
const WN_IMG = (file) => '../../apps/master-web/public/whats-new/' + file;

const TABS = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
  { id: 'shelf', label: 'Полка', icon: 'Package' },
  { id: 'deliveries', label: 'Поставки', icon: 'Truck' },
  { id: 'catalog', label: 'Каталог', icon: 'LibraryBig' },
  { id: 'mixes', label: 'Миксы', icon: 'Blend' },
  { id: 'rails', label: 'Рейлы', icon: 'GalleryVerticalEnd' },
  { id: 'access', label: 'Доступ', icon: 'ShieldCheck' },
];

function Ic({ name, size = 15 }) {
  const node = window.lucide && window.lucide.icons[name];
  if (!node) return null;
  const children = Array.isArray(node[0]) ? node : node[2] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

// Оверлеи (тост, меню, диалог) рисуются в слой над экраном, а не внутри прокрутки.
const OverlayCtx = React.createContext(null);
function Overlay({ children }) {
  const node = React.useContext(OverlayCtx);
  return node ? ReactDOM.createPortal(children, node) : null;
}

function Desk({ free, children }) {
  const [node, setNode] = React.useState(null);
  return (
    <div className={'desk' + (free ? ' free' : '')}>
      <OverlayCtx.Provider value={node}>
        <div className="desk-scroll">{children}</div>
      </OverlayCtx.Provider>
      <div ref={setNode} />
    </div>
  );
}

function Shell({ tab, children }) {
  const items = TABS.map((t) => ({ ...t, icon: <Ic name={t.icon} /> }));
  return (
    <main className="shell">
      <MasterTopBar markSrc={MARK} items={items} active={tab} userName="Admin" userRole="" />
      <section className="stage">{children}</section>
    </main>
  );
}

// ── Данные. «Сегодня»: пятница, 23 октября 2026. Табаки и миксы с прода
// (снимки screens/), остатки и расход как в мокапе #306, перенесены на октябрь,
// чтобы показать все состояния строки. Описания миксов дословно из каталога. ──
const SHELF = [
  { id: 'bb-cane', brand: 'Black Burn', name: 'Cane Mint', left: 40, full: 400, rate: 13, kind: 'own', until: '26 окт', days: 3, status: 'ending', arrived: '5 окт', plus: 400, supplier: 'Каспий Опт', mixes: 3 },
  { id: 'ds-blackcurrant', brand: 'DARKSIDE', name: 'Blackcurrant', left: 55, full: 250, rate: 9, kind: 'own', until: '29 окт', days: 6, status: 'ending', arrived: '15 сен', plus: 250, supplier: 'Южный табак', mixes: 1 },
  { id: 'hl-panama', brand: 'Хулиган', name: 'Panama', left: 18, full: 200, rate: 8, kind: 'own', status: 'check', arrived: '25 сен', plus: 200, supplier: 'Южный табак', mixes: 0 },
  { id: 'sr-baikal', brand: 'Сарма', name: 'Байкальская клубника', left: 120, full: 200, rate: 6.5, kind: 'own', until: '10 ноя', days: 18, status: 'ok', arrived: '20 окт', plus: 200, supplier: 'Стартовый приход', mixes: 2, mark: 'отметка ¾ вчера' },
  { id: 'bb-rasp', brand: 'Black Burn', name: 'Raspberries', left: 300, full: 400, rate: 14.7, kind: 'own', until: '12 ноя', days: 20, status: 'ok', arrived: '12 окт', plus: 400, supplier: 'Каспий Опт', mixes: 4 },
  { id: 'ds-peach', brand: 'DARKSIDE', name: 'Virgin Peach 2.0', left: 160, full: 250, rate: 10, kind: 'brand', until: '8 ноя', days: 16, status: 'ok', arrived: '12 окт', plus: 250, supplier: 'Южный табак', mixes: 1 },
  { id: 'ad-lemonpie', brand: 'Adalya', name: 'Lemon Pie', left: 210, full: 250, rate: 4.2, kind: 'brand', until: '12 дек', days: 50, status: 'ok', arrived: '3 окт', plus: 250, supplier: 'Вручную', mixes: 1 },
  { id: 'sr-arbuz', brand: 'Сарма', name: 'Арбузный мармелад', left: 200, full: 200, rate: null, kind: 'none', status: 'ok', arrived: '20 окт', plus: 200, supplier: 'Стартовый приход', mixes: 0 },
  { id: 'sb-lemon', brand: 'Sebero', name: 'Лимонная шипучка', left: 0, full: 200, rate: 15, kind: 'own', until: 'закончился 21 окт', status: 'out', arrived: '15 сен', plus: 200, supplier: 'Каспий Опт', mixes: 2 },
  { id: 'jt-gluhwein', brand: 'Jent', name: 'Gluhwein', left: 200, full: 200, rate: null, kind: 'none', status: 'stop', note: 'до декабря', arrived: '20 окт', plus: 200, supplier: 'Стартовый приход', mixes: 0 },
  { id: 'ds-supernova', brand: 'DARKSIDE', name: 'Supernova', left: null, full: null, rate: null, kind: 'none', status: 'plan', mixes: 0 },
  { id: 'ad-milk', brand: 'Adalya', name: 'Milk', left: 230, full: 250, rate: 5.1, kind: 'own', until: '7 дек', days: 45, status: 'ok', arrived: '3 окт', plus: 250, supplier: 'Вручную', mixes: 3 },
];
const STATUS_CHIPS = [['all', 'Все'], ['ok', 'Есть', 266], ['ending', 'Заканчивается', 14], ['check', 'Проверьте остаток', 3], ['out', 'Закончились', 4], ['stop', 'Стоп', 1], ['plan', 'В плане', 2]];
const num = (v) => String(v).replace('.', ',');

const MIXES = [
  { id: 'cosmocola', name: 'Космокола', ratio: '45/30/25', desc: 'Кола и цветочный — с морозным холодком, с нотой газировки.', comp: 'Cosmo Flower + Darkside Cola + Supernova', profiles: [['berry', 'Ягодные'], ['floral-herbal', 'Цветочно-травяные'], ['fruity', 'Фруктовые']], more: 2, chosen: 38, rating: '4,5' },
  { id: 'lemonpie', name: 'Лимонный пирог', ratio: '70/30', desc: 'Лимонный пирог и молоко — с гастрономическим характером, с мягкой сладостью.', comp: 'Lemon Pie + Milk', profiles: [['citrus', 'Цитрусовые'], ['dessert', 'Десертные'], ['fruity', 'Фруктовые']], more: 2, chosen: 31, rating: '4,6' },
  { id: 'milkbanana', name: 'Молоко-Банан', ratio: '50/50', desc: 'Молоко и банан — с мягкой сладостью.', comp: 'Milk + Banana', profiles: [['dessert', 'Десертные'], ['sweet', 'Сладкие'], ['fruity', 'Фруктовые']], more: 0, chosen: 24, rating: '4,4' },
  { id: 'frostberry', name: 'Морозная ягода', ratio: '40/50/10', desc: 'Земляника, лесные ягоды и чёрный чай — с морозным холодком.', comp: 'Wildberry + Red Tea + Supernova', profiles: [['berry', 'Ягодные'], ['fruity', 'Фруктовые'], ['floral-herbal', 'Цветочно-травяные']], more: 3, chosen: 52, rating: '4,7' },
  { id: 'tropics', name: 'Тропики', ratio: '60/40', desc: 'Банан, манго и йогурт.', comp: 'Bananapapa + Mango Lassi 2.0', profiles: [['fruity', 'Фруктовые']], more: 0, chosen: 17, rating: '4,5' },
  { id: 'bubble', name: 'Bubble Fruit', ratio: '100', desc: 'Бабл-гам, виноград, голубика и манго — с морозным холодком.', comp: 'Bubble Fruit', profiles: [['berry', 'Ягодные'], ['fresh', 'Свежие'], ['fruity', 'Фруктовые']], more: 1, chosen: 12, rating: '4,3' },
  { id: 'cinnamon', name: 'Cinnamon Red Tea', ratio: '50/50', desc: 'Корица и чёрный чай — согревающий, с осенним настроением.', comp: 'Cinnamon Roll + Red Tea', profiles: [['dessert', 'Десертные'], ['spicy', 'Пряные'], ['sweet', 'Сладкие']], more: 1, chosen: 9, rating: '4,6' },
];

// ── Тексты «Что нового» по канону. Порядок и состав как в apps/master-web/src/lib/whats-new.ts ──
const WHATS_NEW = [
  {
    id: '2026-10-grams', label: '21 октября', slides: [
      { title: 'Полка в граммах', text: 'Остаток табака на полке теперь в граммах, рядом видно, на сколько дней его хватит.', list: ['Остаток указывают долей от прихода или точно в граммах', 'Пустую банку отмечают одной кнопкой'], action: 'Открыть полку' },
    ],
  },
  {
    id: '2026-10-guest', label: '21 октября', slides: [
      { title: 'Кабинет гостя', text: 'Гость может войти через Telegram, если захочет. Телефон не нужен, рассылок нет. В кабинете история выборов и избранное, мастер кабинет не видит. Без входа всё работает как прежде.', image: WN_IMG('2026-10-guest/cabinet.jpg'), contain: true },
      { title: 'Подбор для вошедшего гостя', text: 'Вошедшему гостю подбор предлагает миксы по его выборам, оценкам и избранному. Если гость берёт одно и то же, рядом появится подборка с другими вкусами.', image: WN_IMG('2026-10-guest/for-you.jpg'), contain: true },
      { title: 'Рилсы', text: 'Миксы короткими сценами по вкусам: лента в нижней панели и полоса над подбором. Ленту листают вверх, выбрать микс можно прямо в рилсе.', image: WN_IMG('2026-10-guest/reels.jpg'), contain: true },
      { title: 'Ещё изменения', list: ['Каталог каждую ночь сверяется с htreviews по брендам с полки, а раз в неделю целиком. Новинки сами на полку не попадают', 'Категории сладкий, кислый и свежий больше не предлагаются гостю и не ставятся табаку', 'Счета разбираются точнее: BLANSH распознаётся как линейка AHF Tobacco, разные написания одного вкуса сводятся к одному', 'На телефоне доступны все действия с банкой и настройки полки', 'Ошибки гость видит на русском и понятными словами'] },
    ],
  },
  {
    id: '2026-10-inventory', label: '21 октября', slides: [
      { title: 'Полка вместо раздела Табаки', text: 'На полке видны остаток, расход и дата, до которой табака хватит. Пустую банку отмечают одной кнопкой, отменить можно в течение 10 секунд.', image: WN_IMG('2026-10-inventory/shelf.jpg'), action: 'Открыть полку' },
      { title: 'Поставки из счёта', text: 'PDF счёта поставщика превращается в приход на полке. Строки сопоставляются с каталогом, следующий счёт того же поставщика разбирается сам.', image: WN_IMG('2026-10-inventory/deliveries.jpg'), action: 'Открыть поставки' },
      { title: 'К заказу и прогноз', text: 'Видно, что закончится до следующей поставки и сколько заказать. Текст заказа для поставщика готов сразу. Прогноз расхода и траты теперь на дашборде.', image: WN_IMG('2026-10-inventory/reorder.jpg'), action: 'Открыть заказ' },
      { title: 'Идеи для закупки', text: 'В каталоге собраны табаки, которых нет на полке, с рейтингом и просмотрами htreviews. Кнопка В план добавляет табак в заказ.', image: WN_IMG('2026-10-inventory/ideas.jpg'), action: 'Открыть идеи' },
      { title: 'Полка на телефоне', text: 'Пустые банки и остаток можно отмечать с телефона у стойки.', image: WN_IMG('2026-10-inventory/shelf-phone.jpg'), contain: true },
      { title: 'Ещё изменения', list: ['Каталог и полка теперь раздельны, тумблера наличия больше нет', 'Стоп для гостей: табак есть, но гостю не предлагается', 'Настройки полки: граммовка чаши и срок поставки', 'Ссылка на htreviews в карточке табака'] },
    ],
  },
];

// ── Вход ──
function Login() {
  return (
    <div className="auth">
      <div className="auth-box">
        <div className="auth-brand"><img src={MARK} alt="" /><span className="wordmark">Ателье <em>Мастер</em></span></div>
        <form className="auth-card" onSubmit={(e) => e.preventDefault()}>
          <h1>Войти в смену</h1>
          <div className="field"><label>Логин</label><span className="search focus">admin</span></div>
          <div className="field">
            <label>Пароль</label>
            <span className="search" style={{ justifyContent: 'space-between' }}><span>••••••••</span><MasterIconButton small label="Показать пароль"><Ic name="Eye" size={14} /></MasterIconButton></span>
          </div>
          <MasterButton type="submit" variant="primary" size="lg" style={{ width: '100%', marginTop: 6 }}>Войти</MasterButton>
        </form>
      </div>
    </div>
  );
}

// ── Дашборд ──
function Dashboard() {
  const weeks = [['22–28 сен', 2810], ['29 сен – 5 окт', 3020], ['6–12 окт', 2940], ['13–19 окт', 3180], ['20–26 окт, идёт', 1650, true]];
  const max = 3300;
  return (
    <div className="page">
      <MasterPageHeader title="Дашборд смены" meta="10–23 октября" />
      <div className="dash-top">
        <MasterCard heading="Прогноз на сегодня">
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="big">420 г</span>
            <span className="hint">23 чаши по 18 г. По пятницам выбирают на 12 % чаще среднего дня.</span>
          </div>
          <p className="subhead" style={{ marginTop: 6 }}>Заканчивается</p>
          <div className="rows">
            <div><span>Black Burn Cane Mint</span><span className="num danger">26 окт, 3 дн</span></div>
            <div><span>DARKSIDE Blackcurrant</span><span className="num warn">29 окт, 6 дн</span></div>
            <div><span>Хулиган Panama</span><span className="warn">проверьте остаток</span></div>
          </div>
        </MasterCard>
        <MasterCard heading="Траты за октябрь">
          <span className="big">43 400 ₽</span>
          <div className="spend">
            <div className="spend-row"><span>Каспий Опт</span><i style={{ width: '100%' }} /><span className="num" style={{ textAlign: 'right' }}>24 800 ₽</span></div>
            <div className="spend-row"><span>Южный табак</span><i style={{ width: '75%' }} /><span className="num" style={{ textAlign: 'right' }}>18 600 ₽</span></div>
          </div>
          <div className="kv">
            <div><span>Себестоимость чаши</span><b>92 ₽</b><small>по ценам прихода</small></div>
            <div><span>Табак на полке</span><b>48 300 ₽</b><small>по ценам прихода</small></div>
          </div>
        </MasterCard>
      </div>
      <MasterCard heading="Расход по неделям, г">
        <div>
          <div className="weeks">
            {weeks.map(([l, v, part]) => <div key={l} className={'week' + (part ? ' partial' : '')}><span>{v.toLocaleString('ru-RU')}</span><i style={{ height: (v / max) * 92 + '%' }} /></div>)}
          </div>
          <div className="week-labels">{weeks.map(([l]) => <span key={l}>{l}</span>)}</div>
        </div>
      </MasterCard>
      <div className="kpi">
        <MasterStatsRow tiles={[
          { label: 'В наличии', value: '290', hint: 'из 11 528 табаков' },
          { label: 'Видно гостю', value: 15, hint: 'миксов', tone: 'success' },
          { label: 'Заблокировано', value: 0 },
          { label: 'Активных рейлов', value: 7 },
        ]} />
      </div>
      <div className="cols">
        <MasterCard heading="Топ миксов недели">
          <div>
            {MIXES.slice().sort((a, b) => b.chosen - a.chosen).slice(0, 5).map((m, i) => (
              <div className="rank" key={m.id}>
                <span className="rank-num">{i + 1}</span>
                <span className="two plain"><b>{m.name}</b><small>{m.comp}</small></span>
                <span className="rank-metrics"><span><Ic name="Flame" size={14} />{m.chosen}</span><span><Ic name="Star" size={14} />{m.rating}</span></span>
              </div>
            ))}
          </div>
        </MasterCard>
        <MasterCard heading="Сигналы для команды">
          <EmptyState>Блокировок нет.</EmptyState>
        </MasterCard>
      </div>
    </div>
  );
}

// ── Полка ──
function Level({ row }) {
  if (row.left == null) return <span className="lvl"><span className="lvl-bar" /><span className="two plain"><b className="faint">—</b><small>прихода не было</small></span></span>;
  const share = row.full ? row.left / row.full : 0;
  const tone = row.status === 'check' || (row.days != null && row.days <= 3) ? ' crit' : row.status === 'ending' ? ' low' : '';
  return (
    <span className="lvl">
      <span className={'lvl-bar' + tone}>{row.left ? <i style={{ width: Math.max(4, share * 100) + '%' }} /> : null}</span>
      <span className="two plain"><b className={row.left === 0 ? 'danger' : ''}>{row.left} г</b><small>из {row.full} г после прихода</small></span>
    </span>
  );
}

function Rate({ row }) {
  if (row.kind === 'none') return <span className="faint">мало данных</span>;
  if (row.kind === 'brand') return <span className="two plain" title="Своих отметок мало, взята медиана бренда"><b className="num">{num(row.rate)} г/день</b><small>по бренду</small></span>;
  return <span className="num">{num(row.rate)} г/день</span>;
}

function Until({ row }) {
  if (row.status === 'out') return <span className="danger">{row.until}</span>;
  if (row.status === 'check') return <span className="two plain"><b className="warn">должен был закончиться</b><small className="warn">проверьте остаток</small></span>;
  if (row.status === 'plan') return <span className="two plain"><b className="faint">—</b><small>в плане</small></span>;
  if (row.status === 'stop') return <span className="two plain"><b className="faint">—</b><small>стоп для гостей: {row.note}</small></span>;
  if (row.days == null) return <span className="faint">—</span>;
  const cls = row.days <= 3 ? 'danger' : row.days <= 7 ? 'warn' : '';
  const line = row.status === 'ending' ? 'заканчивается' : row.mark;
  return <span className="two plain"><b className={'num ' + cls}>{row.until}, {row.days} дн</b>{line ? <small className={row.status === 'ending' ? 'warn' : ''}>{line}</small> : null}</span>;
}

// Позиция всплывашки считается от кнопок строки, в координатах экрана-макета.
function useAnchor(open) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  React.useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const a = ref.current.getBoundingClientRect();
    const d = ref.current.closest('.desk').getBoundingClientRect();
    setPos({ top: a.bottom - d.top + 4, right: d.right - a.right });
  }, [open]);
  return [ref, pos];
}

function RowActions({ row, open }) {
  const [ref, pos] = useAnchor(open === 'menu' || open === 'left');
  if (row.status === 'out' || row.status === 'plan') return <span className="cell-actions"><span className="faint" style={{ fontSize: 12 }}>в заказе</span><MasterIconButton small label={'Ещё действия: ' + row.brand + ' ' + row.name}><Ic name="Ellipsis" /></MasterIconButton></span>;
  if (row.status === 'stop') return <span className="cell-actions"><MasterButton size="sm" variant="ghost">Снять стоп</MasterButton><MasterIconButton small label="Ещё действия"><Ic name="Ellipsis" /></MasterIconButton></span>;
  return (
    <span className="cell-actions" ref={ref}>
      <MasterButton size="sm" variant={row.status === 'check' ? 'primary' : 'ghost'} style={open === 'left' ? { background: 'var(--bg-elevated)' } : null}>{row.status === 'check' ? 'Отметить остаток' : 'Указать остаток'}</MasterButton>
      {row.status === 'check' ? null : <MasterButton size="sm">Закончился</MasterButton>}
      <MasterIconButton small label={'Ещё действия: ' + row.brand + ' ' + row.name} style={open === 'menu' ? { background: 'var(--bg-elevated)' } : null}><Ic name="Ellipsis" /></MasterIconButton>
      {open === 'menu' && pos ? <Overlay><RowMenu pos={pos} /></Overlay> : null}
      {open === 'left' && pos ? <Overlay><LeftPop pos={{ top: pos.top, right: pos.right + 112 }} /></Overlay> : null}
    </span>
  );
}

function RowMenu({ pos }) {
  return (
    <div className="pop" style={pos} role="dialog" aria-label="Действия: Black Burn Cane Mint">
      <button className="pop-item">Приход без счёта</button>
      <button className="pop-item">Списать</button>
      <button className="pop-item">Стоп для гостей</button>
      <div className="pop-sep" />
      <button className="pop-item">Убрать с полки <span className="faint">история останется</span></button>
    </div>
  );
}

function LeftPop({ pos }) {
  return (
    <div className="pop wide" style={pos} role="dialog" aria-label="Сколько осталось: Black Burn Cane Mint">
      <span className="pop-label">Сколько осталось?<small>После прихода 5 окт было 400 г</small></span>
      <div className="fracs">{[['¾', 300], ['½', 200], ['⅓', 133], ['¼', 100]].map(([f, g]) => <button key={f} className="frac">{f}<small>{g} г</small></button>)}</div>
      <div className="pop-sep" />
      <div className="exact"><label>Точно, если взвесили</label><span className="gr-input">— г</span><MasterButton size="sm" variant="ghost" disabled>Сохранить</MasterButton></div>
      <p className="pop-note">По расчёту сейчас 40 г.</p>
      <div className="pop-sep" />
      <button className="pop-item" style={{ color: 'var(--danger)' }}>Закончился <span className="faint">гость перестанет видеть</span></button>
    </div>
  );
}

function Toast() {
  return (
    <div className="toast" role="status">
      <div className="toast-copy">
        <b>Black Burn Cane Mint</b>
        <span>Закончился, гости его не видят. Скрыто миксов: 3, табак добавлен в заказ.</span>
      </div>
      <span className="toast-timer">10 с</span>
      <MasterButton size="sm">Отменить</MasterButton>
    </div>
  );
}

function Shelf({ overlay }) {
  // После «Закончился» строка Cane Mint уже пустая, тост предлагает отмену.
  const rows = overlay === 'toast' ? SHELF.map((r) => (r.id === 'bb-cane' ? { ...r, left: 0, status: 'out', until: 'закончился сегодня' } : r)) : SHELF;
  return (
    <div className="page">
      <MasterPageHeader
        title="Полка"
        meta="290 позиций, 61,9 кг"
        actions={<>
          <span className="seg" role="group" aria-label="Вид полки"><button aria-pressed="true">Полка</button><button aria-pressed="false">К заказу <span className="cnt">12</span></button></span>
          <MasterButton variant="ghost">Добавить из каталога</MasterButton>
          <MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />}>Загрузить счёт</MasterButton>
          <MasterIconButton label="Настройки полки"><Ic name="Ellipsis" /></MasterIconButton>
        </>}
      />
      <div className="toolbar">
        <span className="search" style={{ width: 230 }}><Ic name="Search" size={14} />Табак или бренд</span>
        <div className="toolbar-filters">
          {STATUS_CHIPS.map(([k, l, c]) => <FilterChip key={k} active={k === 'all'} count={c}>{l}</FilterChip>)}
        </div>
        <FilterChip>Фильтры</FilterChip>
        <span className="select">Хватит до <Ic name="ChevronDown" size={13} /></span>
      </div>
      <MasterList
        columns={[
          { key: 'name', label: 'Табак', width: 'minmax(0,1.3fr)', render: (r) => <span className="two"><b>{r.name}</b><small>{r.brand}</small></span> },
          { key: 'left', label: 'Остаток по учёту', width: '200px', render: (r) => <Level row={r} /> },
          { key: 'rate', label: 'Расход', width: '110px', render: (r) => <Rate row={r} /> },
          { key: 'until', label: 'Хватит до', width: '170px', render: (r) => <Until row={r} /> },
          { key: 'arrived', label: 'Приход', width: '130px', render: (r) => (r.arrived ? <span className="two plain"><b className="num">{r.arrived}, +{r.plus} г</b><small>{r.supplier}</small></span> : <span className="faint">—</span>) },
          { key: 'mixes', label: 'Миксы', width: '56px', align: 'right', render: (r) => (r.mixes ? r.mixes : <span className="faint">—</span>) },
          { key: 'act', label: '', width: '250px', align: 'right', render: (r) => <RowActions row={r} open={r.id === 'bb-cane' ? overlay : null} /> },
        ]}
        rows={rows}
      />
      {overlay === 'toast' ? <Overlay><Toast /></Overlay> : null}
    </div>
  );
}

// ── Поставки ──
function Deliveries() {
  const tag = { draft: ['warning', 'ждёт прихода'], done: ['success', 'принята'], start: ['neutral', 'стартовый приход'] };
  return (
    <div className="page">
      <MasterPageHeader
        title="Поставки"
        meta="Октябрь: 3 счёта, 43 400 ₽"
        actions={<><MasterButton variant="ghost">Заполнить вручную</MasterButton><MasterButton variant="primary" icon={<Ic name="FileUp" size={14} />}>Загрузить счёт</MasterButton></>}
      />
      <div className="drop"><Ic name="FileUp" size={18} />Перетащите PDF счёта сюда</div>
      <MasterList
        onRowClick={() => {}}
        columns={[
          { key: 'date', label: 'Дата счёта', width: '110px' },
          { key: 'supplier', label: 'Поставщик', width: 'minmax(0,1fr)', render: (r) => (r.supplier ? r.supplier : <span className="faint">без поставщика</span>) },
          { key: 'no', label: 'Счёт', width: '130px', render: (r) => r.no || <span className="faint">—</span> },
          { key: 'lines', label: 'Строк', width: '70px', align: 'right' },
          { key: 'kg', label: 'Приход', width: '90px', align: 'right' },
          { key: 'sum', label: 'Сумма', width: '110px', align: 'right', render: (r) => r.sum || <span className="faint">—</span> },
          { key: 'got', label: 'Пришло', width: '90px', render: (r) => r.got || <span className="faint">—</span> },
          { key: 'st', label: 'Статус', width: '150px', render: (r) => <MasterTag tone={tag[r.st][0]}>{tag[r.st][1]}</MasterTag> },
        ]}
        rows={[
          { id: 'd1', date: '22 окт', supplier: 'Каспий Опт', no: '№ 03944', lines: 9, kg: '2,2 кг', sum: '24 800 ₽', st: 'draft' },
          { id: 'd2', date: '20 окт', supplier: '', lines: 0, kg: '56,7 кг', st: 'start', got: '20 окт' },
          { id: 'd3', date: '15 окт', supplier: 'Южный табак', no: '№ ЮТ-5120', lines: 6, kg: '1,5 кг', sum: '18 600 ₽', got: '17 окт', st: 'done' },
        ]}
      />
    </div>
  );
}

function DeliveryCard() {
  const LINES = [
    { n: 1, raw: 'Табак Black Burn Cane Mint 200г', pick: 'Black Burn Cane Mint', tag: ['success', 'по памяти'], qty: '2 × 200 г', sum: '3 100 ₽' },
    { n: 2, raw: 'DarkSide Core Blackcurrant 250 гр', pick: 'DARKSIDE Blackcurrant', tag: ['success', 'по памяти'], qty: '1 × 250 г', sum: '1 900 ₽' },
    { n: 3, raw: 'Black Burn Raspberries 200г', pick: 'Black Burn Raspberries', tag: ['success', 'по каталогу'], qty: '2 × 200 г', sum: '3 100 ₽' },
    { n: 4, raw: 'Сарма Байкальская клубника 200г', pick: 'Сарма Байкальская клубника', tag: ['success', 'по памяти'], qty: '1 × 200 г', sum: '1 200 ₽' },
    { n: 5, raw: 'Хулиган Panama 200', pick: 'Хулиган Panama', tag: ['warning', 'проверьте'], hint: 'похоже на 82 %', tone: 'warn', qty: '1 × 200 г', sum: '1 300 ₽' },
    { n: 6, raw: 'Adalya Lemon Pie 250g', pick: 'Adalya Lemon Pie', tag: ['success', 'по каталогу'], hint: 'новый на полке', qty: '1 × 250 г', sum: '1 600 ₽' },
    { n: 7, raw: 'MustHave Pinkman 125г', pick: null, tag: ['danger', 'нет в каталоге'], tone: 'danger', qty: '2 × 125 г', sum: '2 400 ₽' },
    { n: 8, raw: 'Уголь кокосовый 1кг', skip: true, sum: '900 ₽' },
    { n: 9, raw: 'Black Burn Pear lemonade 200г', pick: 'Black Burn Pear lemonade', tag: ['warning', 'проверьте'], hint: 'похоже на 76 %', tone: 'warn', qty: '2 × 200 г', sum: '3 100 ₽' },
  ];
  return (
    <div className="page">
      <button className="back"><Ic name="ArrowLeft" size={14} />Поставки</button>
      <MasterPageHeader
        title="Каспий Опт, счёт № 03944"
        subtitle="Счёт от 22 октября. Принимайте поставку, когда товар придёт."
        meta={<span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><MasterTag tone="warning">черновик</MasterTag>итог счёта 24 800 ₽</span>}
        actions={<><MasterButton variant="ghost">Открыть PDF</MasterButton><MasterButton variant="ghost">Удалить черновик</MasterButton></>}
      />
      <p className="parse-line">Найдено <b>5 из 8 табаков</b>. Проверьте 2 строки, ещё 1 табака нет в каталоге. Одна строка не табак, она пропущена.</p>
      <MasterList
        columns={[
          { key: 'n', label: '№', width: '36px', render: (r) => <span className="faint">{r.n}</span> },
          { key: 'raw', label: 'Строка счёта', width: 'minmax(0,1fr)', render: (r) => <span className={r.skip ? 'skip' : ''} style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{r.raw}</span> },
          { key: 'pick', label: 'Табак на полке', width: '300px', render: (r) => (r.skip
            ? <span className="match"><span className="faint">Пропущено</span><small>не табак<button className="textbtn">это табак</button></small></span>
            : <span className="match">
                <span className={'pick' + (r.tone ? ' ' + r.tone : '')}>{r.pick || 'Выбрать табак'}<Ic name="ChevronDown" size={13} /></span>
                {r.hint ? <small>{r.hint}</small> : null}
              </span>) },
          { key: 'tag', label: '', width: '120px', render: (r) => (r.tag ? <MasterTag tone={r.tag[0]}>{r.tag[1]}</MasterTag> : null) },
          { key: 'qty', label: 'Приход', width: '110px', render: (r) => r.qty || <span className="faint">—</span> },
          { key: 'sum', label: 'Сумма', width: '90px', align: 'right' },
          { key: 'got', label: 'Пришло', width: '70px', align: 'center', render: (r) => (r.skip ? null : <span className="check on">✓</span>) },
          { key: 'del', label: '', width: '32px', render: () => <MasterIconButton small label="Удалить строку"><Ic name="Trash2" size={14} /></MasterIconButton> },
        ]}
        rows={LINES}
      />
      <div className="footbar">
        <span>Сумма строк совпадает с итогом счёта</span>
        <span>На полку <b>2,2 кг</b></span>
        <span>Без табака: 1 строка</span>
        <span className="grow" />
        <span className="date">Пришло <b>23.10.2026</b></span>
        <MasterButton variant="primary">Принять поставку</MasterButton>
      </div>
    </div>
  );
}

// ── Каталог, пустой результат ──
function CatalogEmpty() {
  const cats = ['Фруктовые', 'Ягодные', 'Десертные', 'Кислые', 'Сладкие', 'Цитрусовые', 'Мятные', 'Свежие', 'Цветочно-травяные', 'Пряные', 'Табачные', 'Парфюмные'];
  return (
    <div className="page">
      <MasterPageHeader
        title="Каталог"
        meta="11 528 позиций, 28 в миксах"
        actions={<>
          <span className="seg" role="group" aria-label="Вид каталога"><button aria-pressed="true">Все табаки</button><button aria-pressed="false">Идеи для закупки</button></span>
          <MasterButton variant="primary" icon={<Ic name="Plus" size={14} />}>Новый табак</MasterButton>
        </>}
      />
      <div className="filters">
        <div>
          <span className="search focus" style={{ flex: 1 }}><Ic name="Search" size={14} /><span style={{ flex: 1 }}>zzzqqq</span><Ic name="X" size={14} /></span>
          <FilterChip active>Все</FilterChip><FilterChip count={290}>В наличии</FilterChip><FilterChip count="11 238">Нет наличия</FilterChip><FilterChip>Архив</FilterChip>
        </div>
        <div><span className="f-label">Категории</span>{cats.map((c) => <FilterChip key={c}>{c}</FilterChip>)}</div>
        <div><MasterButton size="sm" variant="ghost" icon={<Ic name="ChevronDown" size={13} />}>Ещё фильтры</MasterButton></div>
      </div>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)', background: 'var(--bg-raised)', overflow: 'hidden' }}>
        <MasterList style={{ border: 0, borderRadius: 0 }} columns={[
          { key: 'c', label: '', width: '24px' }, { key: 'n', label: 'Табак', width: 'minmax(0,1.4fr)' }, { key: 'b', label: 'Бренд' }, { key: 'p', label: 'Вкус и профиль', width: 'minmax(0,1.4fr)' },
          { key: 'h', label: 'Htreviews', width: '90px', align: 'right' }, { key: 'o', label: 'Оценок', width: '70px', align: 'right' }, { key: 'v', label: 'Просмотров', width: '90px', align: 'right' }, { key: 's', label: 'Полка', width: '90px' }, { key: 'm', label: 'Миксов', width: '60px', align: 'right' },
        ]} rows={[]} />
        <div className="empty-row">Ничего не найдено. Уберите один из фильтров.<MasterButton size="sm" variant="ghost">Сбросить фильтры</MasterButton></div>
      </div>
    </div>
  );
}

// ── Миксы ──
const pcolor = (k) => 'var(--profile-' + k + ')';
function Mixes() {
  const profiles = [['Фруктовые'], ['Мятные'], ['Свежие'], ['Десертные'], ['Сладкие'], ['Кислые'], ['Цветочно-травяные'], ['Цитрусовые']];
  return (
    <div className="page">
      <MasterPageHeader title="Каталог миксов" meta="15 миксов, 15 в рейлах" actions={<MasterButton variant="primary" icon={<Ic name="Plus" size={14} />}>Новый микс</MasterButton>} />
      <div className="filters">
        <div>
          <span className="search" style={{ flex: 1 }}><Ic name="Search" size={14} />Поиск миксов</span>
          <FilterChip active>Все</FilterChip><FilterChip count={15}>Виден гостю</FilterChip><FilterChip>Скрыт</FilterChip><FilterChip>Блокирован</FilterChip>
        </div>
        <div><span className="f-label">Профиль</span>{profiles.map(([p]) => <FilterChip key={p}>{p}</FilterChip>)}</div>
        <div><MasterButton size="sm" variant="ghost" icon={<Ic name="ChevronDown" size={13} />}>Ещё фильтры</MasterButton></div>
      </div>
      <MasterList
        onRowClick={() => {}}
        columns={[
          { key: 'name', label: 'Микс', width: 'minmax(0,1.6fr)', wrap: true, render: (r) => <span className="mixname"><b>{r.name}<span>{r.ratio}</span></b><small>{r.desc}</small></span> },
          { key: 'comp', label: 'Состав', width: 'minmax(0,1fr)', wrap: true, render: (r) => <span style={{ fontSize: 12.5 }}>{r.comp}</span> },
          { key: 'prof', label: 'Профиль', width: '250px', wrap: true, render: (r) => <span className="ptags">{r.profiles.map(([k, l]) => <span className="ptag" key={k}><span className="dot" style={{ background: pcolor(k) }} />{l}</span>)}{r.more ? <span className="ptag">+{r.more}</span> : null}</span> },
          { key: 'st', label: 'Статус', width: '80px', render: () => <MasterTag tone="neutral">виден</MasterTag> },
          { key: 'chosen', label: 'Выборы', width: '70px', align: 'right' },
          { key: 'rating', label: 'Рейтинг', width: '70px', align: 'right', render: (r) => <span>★ {r.rating}</span> },
          { key: 'act', label: '', width: '120px', align: 'right', render: () => <span className="icons"><MasterIconButton small label="Редактировать"><Ic name="Pencil" size={14} /></MasterIconButton><MasterIconButton small label="Копировать"><Ic name="Copy" size={14} /></MasterIconButton><MasterIconButton small label="Скрыть от гостей"><Ic name="EyeOff" size={14} /></MasterIconButton><MasterIconButton small label="Удалить"><Ic name="Trash2" size={14} /></MasterIconButton></span> },
        ]}
        rows={MIXES}
      />
    </div>
  );
}

function MixEditor() {
  const comp = [['Cosmo Flower', 'DARKSIDE Core', 'черника', 45, 'var(--composition-1)'], ['Darkside Cola', 'DARKSIDE Core', 'кола', 30, 'var(--composition-2)'], ['Supernova', 'DARKSIDE Core', 'холодок', 25, 'var(--composition-3)']];
  return (
    <div className="page">
      <div className="ed-bar">
        <MasterIconButton label="Назад к миксам"><Ic name="ArrowLeft" /></MasterIconButton>
        <span>Редактирование микса</span>
        <span className="faint" style={{ fontSize: 12 }}>3 табака</span>
        <span className="grow" />
        <MasterToggle checked label="Виден гостю" /><span style={{ fontSize: 'var(--fs-sm)' }}>Виден гостю</span>
        <MasterButton variant="ghost">Отмена</MasterButton>
        <MasterButton variant="primary">Сохранить</MasterButton>
      </div>
      <div className="ed-grid">
        <div className="panel">
          <span className="search"><Ic name="Search" size={14} />Поиск табака, бренда, вкуса</span>
          <div className="section-h"><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-sm)' }}><MasterToggle checked label="Только в наличии" />Только в наличии</span><span className="select">По алфавиту <Ic name="ChevronDown" size={13} /></span></div>
          <span className="hint">2 из 100</span>
          {[['40000 Irish Cows', 'Jent Основная', 'бейлис'], ['Алматинская халва', 'Black Burn Основная', 'халва']].map(([n, b, f]) => (
            <div className="lib-item" key={n}><span className="two"><b>{n}</b><small>{b}<span className="faint" style={{ marginLeft: 10 }}>{f}</span></small></span><MasterIconButton small label={'Добавить ' + n}><Ic name="Plus" size={14} /></MasterIconButton></div>
          ))}
        </div>
        <div className="panel big-pad">
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 34 }}>Космокола</h1>
            <span className="muted">Кола и цветочный — с морозным холодком, с нотой газировки.</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="section-h"><p className="subhead">Пропорции</p><MasterButton size="sm">Распределить поровну</MasterButton></div>
            <div className="prop">{comp.map(([n, , , p, c]) => <i key={n} style={{ width: p + '%', background: c }} />)}</div>
            <span className="presets">{['34/33/33', '40/30/30', '50/30/20', '60/20/20'].map((p) => <span key={p}>{p}</span>)}</span>
          </div>
          <div>
            <p className="subhead">Состав <span className="faint" style={{ fontWeight: 400 }}>(3)</span></p>
            {comp.map(([n, b, f, p, c]) => (
              <div className="comp" key={n}>
                <span className="dot" style={{ background: c, width: 9, height: 9 }} />
                <span className="two"><b>{n}</b><small>{b}<span className="faint" style={{ marginLeft: 10 }}>{f}</span></small></span>
                <span className="stepper"><span>−</span><b>{p}</b><span>%</span><span style={{ marginLeft: 6 }}>+</span></span>
                <MasterIconButton small label={'Убрать ' + n}><Ic name="Trash2" size={14} /></MasterIconButton>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <p className="subhead">Профиль</p>
            <span className="ptags">{[['berry', 'Ягодные'], ['floral-herbal', 'Цветочно-травяные'], ['fruity', 'Фруктовые'], ['fresh', 'Свежие'], ['minty', 'Мятные']].map(([k, l]) => <span className="ptag" key={k}><span className="dot" style={{ background: pcolor(k) }} />{l}</span>)}</span>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <p className="subhead">В рейлах</p>
            <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Забытые империи</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Рейлы ──
function Rails() {
  const RAILS = [
    { id: 'r1', name: 'Больше всего выбирают', desc: 'Миксы, которые выбирают чаще всего и лучше оценивают гости', type: 'Статистический', ro: true, count: '0 миксов' },
    { id: 'r2', name: 'Лучшие оценки', desc: 'Миксы с самыми сильными оценками гостей и устойчивым спросом', type: 'Статистический', ro: true, count: '0 миксов' },
    { id: 'r3', name: 'Бабушкин буфет', desc: 'Тёплые десертные, пирог и варенье', type: 'Предзаготовленный', count: '5 миксов', list: 'Молоко-Банан, Молоко-Черника, Лимонный пирог, Cookies Bramble Cinnamon, Cinnamon Red Tea' },
    { id: 'r4', name: 'Забытые империи', desc: 'Густые, дорогие, долго играющие вкусы', type: 'Предзаготовленный', count: '4 микса', list: 'Космокола, Cinnamon Red Tea, Citrus Brazillian Rum, Cookies Bramble Cinnamon' },
    { id: 'r5', name: 'Закат в Бодруме', desc: 'Курортный вечер, цитрус и тропик', type: 'Предзаготовленный', count: '4 микса', list: 'Lemon Pineapple, Pirate Citrus, Pineapple Mint, Bubble Fruit' },
    { id: 'r6', name: 'Лёгкие будни', desc: 'Бизнес-ланч, дневная пауза, ничего не отвлекает', type: 'Предзаготовленный', count: '4 микса', list: 'Тропики, Melon Cola, Pineapple Mint, Молоко-Банан' },
    { id: 'r7', name: 'Сад под снегом', desc: 'Ягоды с морозным холодком', type: 'Предзаготовленный', count: '3 микса', list: 'Морозная ягода, Молоко-Черника, Bubble Fruit' },
  ];
  return (
    <div className="page">
      <MasterPageHeader title="Рейлы" actions={<><MasterButton variant="ghost">Витрина гостя</MasterButton><MasterButton variant="primary" icon={<Ic name="Plus" size={14} />}>Новый рейл</MasterButton></>} />
      <MasterList
        columns={[
          { key: 'name', label: 'Рейл', width: 'minmax(0,1.2fr)', render: (r) => <span className="two"><b>{r.name}</b><small>{r.desc}</small></span> },
          { key: 'type', label: 'Тип', width: '160px', render: (r) => <span className="two plain"><b style={{ color: 'var(--text-secondary)' }}>{r.type}</b>{r.ro ? <small>только просмотр</small> : null}</span> },
          { key: 'mixes', label: 'Миксы', width: 'minmax(0,1.2fr)', render: (r) => <span className="two plain"><b style={{ color: 'var(--text-secondary)' }}>{r.count}</b>{r.list ? <small>{r.list}</small> : null}</span> },
          { key: 'act', label: '', width: '170px', align: 'right', render: (r) => (r.ro ? <MasterButton size="sm">Просмотр</MasterButton> : <span className="cell-actions"><MasterButton size="sm">Редактировать</MasterButton><MasterIconButton small label={'Удалить рейл ' + r.name}><Ic name="Trash2" size={14} /></MasterIconButton></span>) },
        ]}
        rows={RAILS}
      />
    </div>
  );
}

// ── Доступ ──
function Access() {
  return (
    <div className="page">
      <MasterPageHeader title="Доступ и персонал" />
      <MasterCard style={{ padding: 0, gap: 0 }}>
        <div className="code-grid">
          <div>
            <div className="section-h"><p className="subhead">Код смены</p><span className="status-dot"><i />Действует</span></div>
            <span className="code">1234</span>
            <div style={{ display: 'flex', gap: 8 }}><MasterButton>Скопировать</MasterButton><MasterButton variant="ghost">Выпустить новый код</MasterButton></div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div className="section-h hint"><span>Истекает 26 октября в 00:00</span><span className="num">Осталось 62 ч 32 мин</span></div>
              <div className="progress"><i style={{ width: '56%' }} /></div>
            </div>
            <p className="hint">Код меняется каждый понедельник, операторы получают его в боте командой /code.</p>
          </div>
          <div>
            <div className="section-h"><span className="two plain"><b>Telegram-бот</b><small>Ещё не выходил на связь</small></span><MasterTag tone="ghost">статус неизвестен</MasterTag></div>
            <p className="subhead">Последние коды</p>
            <div className="rows" style={{ maxWidth: 260 }}><div><span className="num">1234</span><span className="muted">19 окт</span></div></div>
          </div>
        </div>
      </MasterCard>
      <MasterCard heading="Сотрудники с доступом к боту" actions={<MasterButton variant="primary">Добавить оператора</MasterButton>}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="search" style={{ width: 360 }}><Ic name="Search" size={14} />Имя, телефон или @username</span>
          <FilterChip active>Все</FilterChip><FilterChip>Активны</FilterChip><FilterChip>Ждут привязки</FilterChip><FilterChip>Выключены</FilterChip>
        </div>
        <MasterList columns={[
          { key: 'name', label: 'Оператор', width: 'minmax(0,1fr)', render: (r) => <span className="who"><span className="avatar">{r.name[0]}</span>{r.name}</span> },
          { key: 'phone', label: 'Телефон', width: '170px', render: (r) => <span className="num">{r.phone}</span> },
          { key: 'tg', label: 'Telegram', width: '150px', render: () => <MasterTag tone="warning">ждёт /start</MasterTag> },
          { key: 'last', label: 'Последний код', width: '130px', render: () => <span className="faint">—</span> },
          { key: 'on', label: 'Вкл.', width: '60px', render: () => <MasterToggle checked label="Включён" /> },
          { key: 'act', label: '', width: '70px', align: 'right', render: () => <span className="icons"><MasterIconButton small label="Редактировать"><Ic name="Pencil" size={14} /></MasterIconButton><MasterIconButton small label="Удалить"><Ic name="Trash2" size={14} /></MasterIconButton></span> },
        ]} rows={[{ id: 'o1', name: 'Анна', phone: '+79991234567' }, { id: 'o2', name: 'Илья', phone: '+79997654321' }]} />
        <p className="hint">Оператор пишет боту и отправляет контакт. После привязки он получает код командой /code.</p>
      </MasterCard>
      <MasterCard heading="Доступ к Мастеру" actions={<MasterButton variant="primary">Создать сотрудника</MasterButton>}>
        <MasterList columns={[
          { key: 'name', label: 'Имя', width: 'minmax(0,1fr)', render: (r) => <span className="who"><span className={'avatar' + (r.admin ? ' on' : '')}>{r.name[0]}</span>{r.name}</span> },
          { key: 'login', label: 'Логин', width: '200px' },
          { key: 'role', label: 'Роль', width: '110px', render: (r) => <MasterTag tone="neutral">{r.role}</MasterTag> },
          { key: 'last', label: 'Последний вход', width: '140px', render: () => <span className="faint">—</span> },
          { key: 'on', label: 'Вкл.', width: '60px', render: () => <MasterToggle checked label="Включён" /> },
          { key: 'act', label: '', width: '70px', align: 'right', render: () => <span className="icons"><MasterIconButton small label="Редактировать"><Ic name="Pencil" size={14} /></MasterIconButton><MasterIconButton small label="Удалить"><Ic name="Trash2" size={14} /></MasterIconButton></span> },
        ]} rows={[{ id: 's1', name: 'Admin', login: 'admin', role: 'admin', admin: true }, { id: 's2', name: 'Ателье Staff', login: 'atelier', role: 'staff' }]} />
      </MasterCard>
    </div>
  );
}

// ── Что нового ──
function WhatsNew({ releaseId, start = 0 }) {
  const release = WHATS_NEW.find((r) => r.id === releaseId);
  const [i, setI] = React.useState(start);
  const slide = release.slides[i];
  const last = i === release.slides.length - 1;
  return (
    <>
      <div className="scrim" />
      <div className="wn" role="dialog" aria-label={'Что нового, ' + release.label}>
        <div className="wn-head"><span>Что нового, <b>{release.label}</b></span><MasterIconButton label="Закрыть"><Ic name="X" size={16} /></MasterIconButton></div>
        <div className={'wn-visual' + (slide.contain ? ' contain' : '')}>
          {slide.image ? <img src={slide.image} alt={slide.title} /> : <ul className="wn-list">{slide.list.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
        <div className="wn-copy"><h2>{slide.title}</h2>{slide.text ? <p>{slide.text}</p> : null}</div>
        <div className="wn-foot">
          <div className="wn-pips">{release.slides.map((s, k) => <button key={s.title} className={'wn-pip' + (k === i ? ' on' : '')} aria-label={'Слайд ' + (k + 1) + ' из ' + release.slides.length} onClick={() => setI(k)} />)}</div>
          {slide.action ? <MasterButton variant="ghost">{slide.action}</MasterButton> : null}
          <MasterButton variant="ghost" disabled={i === 0} onClick={() => setI(Math.max(0, i - 1))}>Назад</MasterButton>
          <MasterButton variant="primary" onClick={() => setI(last ? i : i + 1)}>{last ? 'Готово' : 'Далее'}</MasterButton>
        </div>
      </div>
    </>
  );
}

// ── Телефон: Полка ──
function PhoneShelf() {
  const rows = SHELF.filter((r) => ['bb-cane', 'ds-blackcurrant', 'hl-panama', 'sr-baikal', 'bb-rasp'].includes(r.id));
  return (
    <div className="phone">
      <div className="m-top"><img src={MARK} alt="" /><h1>Полка</h1><Ic name="ShoppingCart" size={20} /><MasterIconButton label="Ещё"><Ic name="Ellipsis" size={18} /></MasterIconButton></div>
      <div className="m-body">
        <div className="m-search"><span className="search"><Ic name="Search" size={16} />Табак или бренд</span><span className="m-iconbtn" aria-label="Фильтры и сортировка"><Ic name="SlidersHorizontal" size={18} /></span></div>
        <div className="m-chips"><FilterChip count={14}>Заканчивается</FilterChip><FilterChip count={3}>Проверьте остаток</FilterChip><FilterChip count={4}>Закончились</FilterChip><FilterChip count={1}>Стоп</FilterChip></div>
        <span className="hint" style={{ fontSize: 12 }}>290 позиций, 61,9 кг. Сегодня уйдёт 420 г.</span>
        {rows.map((r) => (
          <article className="m-card" key={r.id}>
            <span className="two"><b>{r.name}</b><small>{r.brand}</small></span>
            <span style={{ fontSize: 13, textAlign: 'right' }}><Until row={r} /></span>
            <div style={{ gridColumn: '1 / -1' }}><Level row={r} /></div>
            <div className="m-acts">
              <button className="m-btn">{r.status === 'check' ? 'Отметить остаток' : 'Указать остаток'}</button>
              <button className="m-btn empty">Закончился</button>
            </div>
          </article>
        ))}
      </div>
      <nav className="m-nav"><span>Дашборд</span><span className="on">Полка</span><span>Поставки</span><span>Ещё</span></nav>
    </div>
  );
}

// ── «Было» там, где снимка прода нет: тот же компонент со старыми текстами
// поверх снимка экрана. Тексты дословно из кода на main @ 5899b89b. ──
const OLD_POS = { position: 'absolute' };
function OldRowMenu() {
  return (
    <div className="pop" style={{ ...OLD_POS, top: 458, right: 44 }}>
      <button className="pop-item">Добавить приход без счёта…</button>
      <button className="pop-item">Списать…</button>
      <button className="pop-item">Стоп для гостей</button>
      <div className="pop-sep" />
      <button className="pop-item">Убрать с полки <span className="faint">история останется</span></button>
    </div>
  );
}
function OldLeftPop() {
  return (
    <div className="pop wide" style={{ ...OLD_POS, top: 458, right: 170 }}>
      <span className="pop-label" style={{ fontFamily: 'var(--font-meta)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--text-faint)' }}>Сколько осталось · после прихода 20 окт было 200 г</span>
      <div className="fracs">{[['¾', 150], ['½', 100], ['⅓', 67], ['¼', 50]].map(([f, g]) => <button key={f} className="frac">{f}<small>{g} г</small></button>)}</div>
      <div className="pop-sep" />
      <div className="exact"><label>Точно, если взвесили</label><span className="gr-input">— г</span><MasterButton size="sm" variant="ghost" disabled>Сохранить</MasterButton></div>
      <p className="pop-note">Сейчас по расчёту ≈ 200 г. Отмечать не обязательно — отметка уточняет расход и прогноз.</p>
      <div className="pop-sep" />
      <button className="pop-item" style={{ color: 'var(--danger)' }}>Закончился <span className="faint">0 г · гость перестанет видеть</span></button>
    </div>
  );
}
function OldToast() {
  return (
    <div className="toast" style={{ minWidth: 640 }}>
      <span style={{ color: 'var(--success)', display: 'inline-flex' }}><Ic name="CircleCheck" size={16} /></span>
      <p style={{ margin: 0, flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}><b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Сарма Ананасовые кусочки</b> — закончился: 0 г, гости его больше не видят. Миксов скрыто: 3. Добавлен в «К заказу».</p>
      <span className="toast-timer">10 с</span>
      <MasterButton size="sm">Отменить <span className="cnt" style={{ marginLeft: 4 }}>Z</span></MasterButton>
    </div>
  );
}
const OLD_WN = {
  '2026-10-grams': { title: 'Полка в граммах', text: 'У табака на полке теперь остаток в граммах: сколько пришло, сколько осталось и на сколько дней хватит.', list: ['«Осталось…» — долей от того, что было после прихода, или точно в граммах', '«Закончился» — одной кнопкой'], action: 'Открыть полку', pips: 1 },
  '2026-10-guest': { title: 'И по мелочи', text: 'То, что не тянет на отдельный слайд, но пригодится в смене.', list: ['Каталог каждую ночь сверяется с htreviews по брендам с полки, раз в неделю — целиком; новинки на полку сами не встают', '«Сладкий», «Кислый», «Свежий» больше не предлагаются гостю и не ставятся табаку', 'Счета разбираются точнее: BLANSH — линейка AHF Tobacco, «Бабл Гам» и «Баблгам», «Пинк Ми» → Pink Me', 'Полка на телефоне: все действия с банкой и настройки полки', 'Гость видит ошибки по-русски и по делу, а не ответ сервера'], pips: 4, at: 3 },
};
function OldWhatsNew({ releaseId }) {
  const s = OLD_WN[releaseId];
  return (
    <>
      <div className="scrim" />
      <div className="wn">
        <div className="wn-head"><span style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--fs-xs)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Что нового · <b>21 октября</b></span><MasterIconButton label="Закрыть"><Ic name="X" size={16} /></MasterIconButton></div>
        <div className="wn-visual">
          <ul className="wn-list" style={{ listStyle: 'none', padding: '0 56px' }}>
            {s.list.map((t) => <li key={t} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 14, alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: 999, background: 'var(--success)', color: 'var(--bg-base)', fontSize: 12, fontWeight: 700 }}>✓</span><span>{t}</span></li>)}
          </ul>
        </div>
        <div className="wn-copy"><h2>{s.title}</h2><p>{s.text}</p></div>
        <div className="wn-foot">
          <div className="wn-pips">{Array.from({ length: s.pips }).map((_, k) => <button key={k} className={'wn-pip' + (k === (s.at || 0) ? ' on' : '')} />)}</div>
          {s.action ? <MasterButton variant="ghost">{s.action}</MasterButton> : null}
          <MasterButton variant="ghost" disabled={!s.at}>Назад</MasterButton>
          <MasterButton variant="primary">Готово</MasterButton>
        </div>
      </div>
    </>
  );
}

function Before({ shot }) {
  const b = shot.before;
  if (shot.phone) return <div className="phone"><img className="before-img" src={SHOT(b.img)} alt={'Было: ' + shot.name} /></div>;
  return (
    <div className="desk">
      <img className="before-img" src={SHOT(b.img)} alt={'Было: ' + shot.name} />
      {b.overlay ? <div style={{ position: 'absolute', inset: 0 }}>{b.overlay}</div> : null}
    </div>
  );
}

// ── Пары доски. before.img: снимок прода из screens/ (первый экран 1280×800).
// before.overlay: состояние, которого на снимке нет, воспроизведено по коду. ──
const SHOTS = [
  { id: 'login', name: 'Вход', before: { img: 'master-1280-00-login' }, render: () => <Login />, bare: true,
    notes: ['Фон ровный, без бордового гало и точечной сетки. Рамка карточки обычная, тень средняя, без бордовой обводки.', 'Подзаголовок «Операционная консоль…» удалён. Подписи полей в sentence case.', 'Иконки в полях и стрелка в кнопке убраны: у полей есть подписи.'] },
  { id: 'dashboard', name: 'Дашборд', tab: 'dashboard', before: { img: 'master-1280-01-dashboard' }, render: () => <Dashboard />,
    notes: ['Без надписи «Окно: 10 октября — 23 октября» и подзаголовка. Период в мете справа: «10–23 октября».', 'Каждая карточка открывается своим заголовком: «Прогноз на сегодня», «Траты за октябрь», «Расход по неделям, г». Надписей над ними нет.', 'Без «≈»: прогноз назван в заголовке. Пустые состояния без пунктирных рамок и шуток: «Блокировок нет.»', 'Ряд KPI остаётся только здесь. Подписи в sentence case, хвосты сокращены до одного факта.'] },
  { id: 'shelf', name: 'Полка', tab: 'shelf', before: { img: 'master-1280-02-shelf' }, render: () => <Shelf />,
    notes: ['Без надписи «ИНВЕНТАРИЗАЦИЯ · ПТ, 23 ОКТЯБРЯ» и подзаголовка «Закончился — одна кнопка…». Мета через запятую, без «≈».', 'Ряд KPI убран: числа уже на чипах статусов. Счётчики только на статусах, у «Все» числа нет, оно в мете.', 'Колонка «Остаток по учёту» говорит один раз, что число расчётное. В строках «200 г» без «≈», бренд обычным регистром.', '«Осталось…» стало «Указать остаток». Строка горячих клавиш под таблицей и «/» в поиске убраны, клавиши остаются в палитре ⌘K и в title.'] },
  { id: 'shelf-menu', name: 'Полка, меню строки', tab: 'shelf', fixed: true, before: { img: 'master-1280-02-shelf', overlay: <OldRowMenu /> }, beforeNote: 'воспроизведено по shelf-row-menu.tsx поверх снимка', render: () => <Shelf overlay="menu" />,
    notes: ['«Добавить приход без счёта…» и «Списать…» без многоточия: «Приход без счёта», «Списать».', 'Подпись «история останется» у «Убрать с полки» оставлена: она снимает страх потерять историю.'] },
  { id: 'shelf-left', name: 'Полка, сколько осталось', tab: 'shelf', fixed: true, before: { img: 'master-1280-02-shelf', overlay: <OldLeftPop /> }, beforeNote: 'воспроизведено по shelf-row-menu.tsx и shelf-forms.tsx поверх снимка', render: () => <Shelf overlay="left" />,
    notes: ['Заголовок всплывашки вопросом в sentence case, уровень после прихода отдельной строкой, без middot.', 'Подсказка «Отмечать не обязательно — отметка уточняет…» удалена. Осталось «По расчёту сейчас 40 г.»', 'У «Закончился» подпись без «0 г ·»: «гость перестанет видеть».'] },
  { id: 'shelf-toast', name: 'Полка, тост после «Закончился»', tab: 'shelf', fixed: true, before: { img: 'master-1280-02-shelf', overlay: <OldToast /> }, beforeNote: 'воспроизведено по shelf-toast.tsx и lib/shelf.ts поверх снимка', render: () => <Shelf overlay="toast" />,
    notes: ['Тост из двух строк: название табака жирным, ниже обычные предложения с заглавной. Конструкции «Название — текст» нет.', 'Иконки у успешного тоста нет, она остаётся только у ошибки. Кнопка «Отменить» без клавиши Z внутри.', '«К заказу» в кавычках стало «в заказ».'] },
  { id: 'deliveries', name: 'Поставки', tab: 'deliveries', before: { img: 'master-1280-03-deliveries' }, render: () => <Deliveries />,
    notes: ['Без надписи «ИНВЕНТАРИЗАЦИЯ · ПРИХОД» и подзаголовка «Загрузили счёт — сверили строки — приняли…».', 'Ряд KPI убран. Итог месяца в мете: «Октябрь: 3 счёта, 43 400 ₽».', 'Пунктир остаётся только у зоны перетаскивания, текст в ней сокращён до «Перетащите PDF счёта сюда».'] },
  { id: 'delivery-card', name: 'Поставки, черновик счёта', tab: 'deliveries', before: { img: 'master-1280-03-deliveries' }, beforeNote: 'снимка черновика нет; было по delivery-card.tsx: «ПОСТАВКА · ЧЕРНОВИК», теги «2 предложено — проверьте», «1 не табак — пропущено», футер «Сумма строк 24 800 ₽ = итог счёта · на полку ≈ 2,2 кг · без табака или граммов: 1 строка»', render: () => <DeliveryCard />,
    notes: ['Статус тегом в мете вместо надписи «ПОСТАВКА · ЧЕРНОВИК» над заголовком.', 'Итоги разбора одной фразой вместо ряда тегов с точками и тире. Подсказка «Подтверждённое сопоставление запомним…» удалена.', 'Подсказки в строке через запятую или отдельной строкой, без middot. «Выбрать табак…» без многоточия.', 'Футер из отдельных подписей без «=», «≈» и middot.'] },
  { id: 'catalog-empty', name: 'Каталог, ничего не найдено', tab: 'catalog', before: { img: 'master-1280-23-catalog-empty' }, render: () => <CatalogEmpty />,
    notes: ['Без надписи «КАТАЛОГ · HTREVIEWS» и подзаголовка «Остаток и расход — на «Полке».».', 'Счётчики сняты с категорий. На фильтрах наличия они остаются: это статусы.', 'Подписи групп в sentence case. «ДОП. ФИЛЬТРЫ» в пунктирной рамке стали кнопкой «Ещё фильтры».', 'Пустой результат: «Ничего не найдено. Уберите один из фильтров.» и кнопка сброса.'] },
  { id: 'mixes', name: 'Миксы', tab: 'mixes', before: { img: 'master-1280-05-mixes' }, render: () => <Mixes />,
    notes: ['Подзаголовок «Состав, наличие и видимость на витрине.» удалён. Мета через запятую.', 'Плейсхолдер «Поиск миксов» без многоточия и без «/». Счётчики сняты с профилей.', 'Описания миксов не тронуты: это данные каталога, а не интерфейс.'] },
  { id: 'mix-editor', name: 'Редактор микса', tab: 'mixes', before: { img: 'master-1280-20-mix-editor' }, render: () => <MixEditor />,
    notes: ['«Редактирование микса · 3 табака» без middot: число табаков отдельной приглушённой подписью.', 'В библиотеке и составе бренд и линейка через пробел, вкус приглушённым словом после отступа. Middot нет.', 'У «Распределить поровну» нет иконки весов: это не главное действие раздела.'] },
  { id: 'rails', name: 'Рейлы', tab: 'rails', before: { img: 'master-1280-06-rails' }, render: () => <Rails />,
    notes: ['Подзаголовок «Состав и порядок подборок для гостевой витрины.» удалён.', 'Миксы рейла через запятую, а не через middot.', 'Иконки сняты с «Витрина гостя», «Просмотр» и «Редактировать». Плюс остаётся только у главного действия «Новый рейл».'] },
  { id: 'access', name: 'Доступ', tab: 'access', before: { img: 'master-1280-07-access' }, render: () => <Access />,
    notes: ['Подзаголовок «Гостевой код, операторы Telegram-бота и учётки Мастера.» удалён. Подписи секций «Код смены», «Последние коды» в sentence case.', 'Плитка с иконкой часов «Новый код каждую неделю» стала одной строкой подсказки. Полоса срока сплошная, точка статуса без ореола.', 'Счётчики сняты с фильтров операторов. Схема из четырёх шагов со стрелками стала одной фразой.', 'Иконки сняты с текстовых кнопок, у аватара admin ровная заливка вместо градиента.'] },
  { id: 'whats-new', name: 'Что нового, полка в граммах', tab: 'dashboard', fixed: true, before: { img: 'master-1280-01-dashboard', overlay: <OldWhatsNew releaseId="2026-10-grams" /> }, beforeNote: 'воспроизведено по whats-new-dialog.tsx и lib/whats-new.ts поверх снимка', render: () => <><Dashboard /><Overlay><WhatsNew releaseId="2026-10-grams" /></Overlay></>,
    notes: ['Шапка окна «Что нового, 21 октября» в обычном регистре, без middot.', 'Пункты списка обычными маркерами, без зелёных ✓. «Осталось…» и «Закончился» в кавычках с тире переписаны обычными фразами.', 'Все тексты выпусков по канону лежат в WHATS_NEW в master-board.jsx и в README.'] },
  { id: 'whats-new-list', name: 'Что нового, ещё изменения', tab: 'dashboard', fixed: true, before: { img: 'master-1280-01-dashboard', overlay: <OldWhatsNew releaseId="2026-10-guest" /> }, beforeNote: 'воспроизведено по whats-new-dialog.tsx и lib/whats-new.ts поверх снимка', render: () => <><Dashboard /><Overlay><WhatsNew releaseId="2026-10-guest" start={3} /></Overlay></>,
    notes: ['«И по мелочи» с подзаголовком «То, что не тянет на отдельный слайд…» стал заголовком «Ещё изменения» без подзаголовка.', 'Без тире, стрелки и кавычек вокруг названий категорий. «Не X, а Y» в последнем пункте переписан.', 'На доске окно кликабельно: точки и «Далее» листают слайды выпуска.'] },
  { id: 'shelf-phone', name: 'Полка на телефоне', phone: true, before: { img: 'master-375-02-shelf' }, render: () => <PhoneShelf />,
    notes: ['Сводка «290 позиций · ≈ 61,9 кг · сегодня ≈ 0 г, 0 чаш» стала двумя предложениями без «≈» и middot.', 'Бренд под названием обычным регистром. «Осталось…» стало «Указать остаток».', 'Счётчики остаются на статусах, это и есть информация.'] },
];

function After({ shot }) {
  if (shot.phone) return shot.render();
  if (shot.bare) return <Desk free={!shot.fixed}>{shot.render()}</Desk>;
  return <Desk free={!shot.fixed}><Shell tab={shot.tab}>{shot.render()}</Shell></Desk>;
}

function BoardAfter({ shot }) {
  if (shot.phone) return shot.render();
  if (shot.bare) return <Desk>{shot.render()}</Desk>;
  return <Desk><Shell tab={shot.tab}>{shot.render()}</Shell></Desk>;
}

function Pair({ shot }) {
  return (
    <section className="pair">
      <h2 className="pair-h2">{shot.name}<span className="pair-id">#shot={shot.id}</span></h2>
      <p className="pair-label">Было<span>{shot.beforeNote || 'прод, ' + (shot.phone ? '375' : '1280') + ' px'}</span></p>
      <Before shot={shot} />
      <p className="pair-label">Стало</p>
      <BoardAfter shot={shot} />
      <ul className="pair-notes">{shot.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </section>
  );
}

function Board() {
  return (
    <div className="board">
      <header className="board-head">
        <h1 className="board-title">Мастер без признаков генерации</h1>
        <p className="board-text">
          Issue #348. Пары «было / стало» ключевых экранов консоли. Было: снимок прода из screens/, первый экран. Стало: тот же экран по канону
          из .claude/skills/aroma-atelier-design/readme.md, разделы «Признаки генерации» и «Композиция экрана». На «стало» данные богаче демо-базы прода:
          табаки и миксы те же, а остатки и расход взяты из мокапа #306, чтобы показать все состояния строки.
        </p>
      </header>
      {SHOTS.map((s) => <Pair key={s.id} shot={s} />)}
    </div>
  );
}

function Shot({ id }) {
  const shot = SHOTS.find((s) => s.id === id) || SHOTS[0];
  return <div className="shot"><After shot={shot} /></div>;
}

const shotId = new URLSearchParams(location.hash.slice(1)).get('shot');
ReactDOM.createRoot(document.getElementById('root')).render(shotId ? <Shot id={shotId} /> : <Board />);
