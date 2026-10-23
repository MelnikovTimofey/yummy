// Мастер, экраны персонала. Recreation of apps/master-web views (login, dashboard, inventory, mixes, rails, access).
const { MasterButton, MasterIconButton, MasterTag, MasterToggle, MasterInput, StatusPill, MasterStatsRow, MasterPageHeader, FilterChip, MasterList, EmptyState, MasterSortPill, MasterCard } = window.DesignSystem_1aef33;
const D = window.MASTER_MOCK;

function LoginScreen({ login, setLogin, password, setPassword, error, loading, onSubmit }) {
  const [reveal, setReveal] = React.useState(false);
  return (
    <main className="auth-screen">
      <div className="auth-container">
        <div className="auth-brand">
          <img className="auth-mark" src="../../assets/logo-mark-oxblood.svg" width="30" height="30" alt="" aria-hidden />
          <span className="auth-brand-name">Ателье <em>Мастер</em></span>
        </div>
        <section className="auth-card">
          <h1 className="auth-title">Войти в смену</h1>
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div>
              <label className="auth-label" htmlFor="auth-login">Логин</label>
              <MasterInput id="auth-login" size="lg" value={login} onChange={setLogin} placeholder="admin" />
            </div>
            <div>
              <label className="auth-label" htmlFor="auth-password">Пароль</label>
              <div className="auth-password">
                <MasterInput id="auth-password" size="lg" type={reveal ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="••••••••" style={{ flex: 1 }} />
                <MasterIconButton label={reveal ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setReveal(!reveal)}><i data-lucide={reveal ? 'eye-off' : 'eye'} /></MasterIconButton>
              </div>
            </div>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <MasterButton type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>{loading ? 'Проверяем…' : 'Войти'}</MasterButton>
          </form>
        </section>
        <div className="auth-foot">Демо: любой логин и пароль</div>
      </div>
    </main>
  );
}

function DashboardScreen({ onNavigate }) {
  const [win, setWin] = React.useState('14d');
  return (
    <section className="page">
      <MasterPageHeader title="Дашборд смены" meta="1–14 августа"
        actions={<div className="win-row">{[['7d', '7 дней'], ['14d', '14 дней'], ['30d', '30 дней']].map(([k, l]) => <FilterChip key={k} active={win === k} onClick={() => setWin(k)}>{l}</FilterChip>)}</div>} />
      <div className="kpi">
        <MasterStatsRow tiles={[
          { label: 'В наличии', value: '1 204', hint: 'из 11 505 табаков' },
          { label: 'Видно гостю', value: 15, hint: 'миксов', tone: 'success' },
          { label: 'Заблокировано', value: 1, tone: 'warning' },
          { label: 'Код смены', value: '4821', tone: 'code' },
        ]} />
      </div>
      <div className="cols">
        <MasterCard heading="Топ миксов недели">
          <ol className="rank-list">
            {D.mixes.slice().sort((a, b) => b.chosen - a.chosen).map((mix, i) => (
              <li key={mix.id} className="rank-row">
                <span className="rank-num">{i + 1}</span>
                <span className="rank-copy">
                  <span className="rank-name">{mix.name}</span>
                  <span className="rank-meta">{'Оценок ' + Math.round(mix.chosen / 2)}</span>
                </span>
                <span className="rank-metrics">
                  <span className="rank-metric"><i data-lucide="flame" /> {mix.chosen}</span>
                  <span className="rank-metric"><i data-lucide="star" /> {String(mix.rating).replace('.', ',')}</span>
                </span>
              </li>
            ))}
          </ol>
        </MasterCard>
        <MasterCard heading="Сигналы для команды">
          <ul className="signal-list">
            <li className="signal-row">
              <span className="signal-copy">
                <span className="rank-name">Космокола</span>
                <span className="rank-meta">Нет наличия: Cosmo Flower</span>
              </span>
              <MasterButton size="sm" onClick={() => onNavigate('mixes')}>Открыть</MasterButton>
            </li>
          </ul>
          <EmptyState>Пустых активных рейлов нет.</EmptyState>
        </MasterCard>
      </div>
    </section>
  );
}

function InventoryScreen() {
  const [items, setItems] = React.useState(D.tobaccos);
  const [q, setQ] = React.useState('');
  const [stock, setStock] = React.useState('all');
  const [sort, setSort] = React.useState('updated');
  const [selected, setSelected] = React.useState([]);
  const rows = items
    .filter((t) => !q || (t.name + ' ' + t.manufacturer).toLowerCase().includes(q.toLowerCase()))
    .filter((t) => stock === 'all' || (stock === 'in' ? t.inStock : !t.inStock));
  const toggleStock = (row) => setItems((cur) => cur.map((t) => (t.id === row.id ? { ...t, inStock: !t.inStock } : t)));
  return (
    <section className="page">
      <MasterPageHeader title="Табаки" meta={rows.length + ' из ' + items.length}
        actions={<><MasterButton variant="ghost">Импорт htreviews</MasterButton><MasterButton variant="primary">Добавить табак</MasterButton></>} />
      <div className="toolbar">
        <MasterInput icon={<i data-lucide="search" />} placeholder="Поиск по названию или производителю" value={q} onChange={setQ} style={{ minWidth: 280 }} />
        <div className="toolbar-filters">
          <FilterChip active={stock === 'all'} onClick={() => setStock('all')}>Все</FilterChip>
          <FilterChip active={stock === 'in'} onClick={() => setStock('in')}>В наличии</FilterChip>
          <FilterChip active={stock === 'out'} onClick={() => setStock('out')}>Нет в наличии</FilterChip>
          <FilterChip>Производитель</FilterChip>
          <FilterChip>Категории</FilterChip>
        </div>
        <MasterSortPill value={sort} onChange={setSort} options={[{ key: 'updated', label: 'По изменению' }, { key: 'name', label: 'По названию' }, { key: 'mixes', label: 'По числу миксов' }]} />
      </div>
      {selected.length ? (
        <div className="batch-bar">
          <span className="batch-text">{'Выбрано ' + selected.length}</span>
          <MasterButton size="sm" onClick={() => { setItems((cur) => cur.map((t) => (selected.includes(t.id) ? { ...t, inStock: true } : t))); setSelected([]); }}>Вернуть в наличие</MasterButton>
          <MasterButton size="sm" onClick={() => { setItems((cur) => cur.map((t) => (selected.includes(t.id) ? { ...t, inStock: false } : t))); setSelected([]); }}>Убрать из наличия</MasterButton>
          <MasterButton size="sm" variant="ghost" onClick={() => setSelected([])}>Снять выбор</MasterButton>
        </div>
      ) : null}
      <MasterList
        selectedIds={selected}
        onRowClick={(row) => setSelected((cur) => (cur.includes(row.id) ? cur.filter((id) => id !== row.id) : [...cur, row.id]))}
        columns={[
          { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.6fr)' },
          { key: 'manufacturer', label: 'ПРОИЗВОДИТЕЛЬ' },
          { key: 'profiles', label: 'КАТЕГОРИИ' },
          { key: 'mixes', label: 'МИКСЫ', width: '80px', align: 'right' },
          { key: 'updated', label: 'ИЗМЕНЁН', width: '130px' },
          { key: 'stock', label: 'НАЛИЧИЕ', width: '150px', render: (row) => (
            <span className="cell-actions" onClick={(e) => e.stopPropagation()}>
              <MasterToggle checked={row.inStock} onChange={() => toggleStock(row)} label="В наличии" />
              <MasterTag tone={row.inStock ? 'success' : 'danger'} dot>{row.inStock ? 'в наличии' : 'нет'}</MasterTag>
            </span>
          ) },
        ]}
        rows={rows}
      />
      {!rows.length ? <EmptyState>Ничего не найдено. Уберите один из фильтров.</EmptyState> : null}
    </section>
  );
}

function MixesScreen() {
  const [editing, setEditing] = React.useState(null);
  const statusTag = { visible: ['success', 'виден гостю'], hidden: ['ghost', 'скрыт'], blocked: ['warning', 'блокирует наличие'] };
  if (editing) {
    const total = 100;
    return (
      <section className="page">
        <MasterPageHeader title={editing.name}
          actions={<><MasterButton variant="ghost" onClick={() => setEditing(null)}>Отмена</MasterButton><MasterButton variant="primary" onClick={() => setEditing(null)}>Сохранить</MasterButton></>} />
        <div className="cols">
          <MasterCard heading="Состав">
            <MasterList
              columns={[
                { key: 'name', label: 'ТАБАК', width: 'minmax(0,1.6fr)' },
                { key: 'manufacturer', label: 'ПРОИЗВОДИТЕЛЬ' },
                { key: 'share', label: 'ДОЛЯ', width: '90px', align: 'right' },
              ]}
              rows={[
                { id: '1', name: 'Red Tea', manufacturer: 'Darkside', share: '50%' },
                { id: '2', name: 'Wildberry', manufacturer: 'Darkside', share: '40%' },
                { id: '3', name: 'Supernova', manufacturer: 'Darkside', share: '10%' },
              ]}
            />
            <div className="editor-actions">
              <MasterButton size="sm">Добавить табак</MasterButton>
              <MasterButton size="sm" variant="ghost">Распределить поровну</MasterButton>
              <span className="hint">{'Сумма: ' + total + '%'}</span>
            </div>
          </MasterCard>
          <MasterCard heading="Видимость">
            <div className="field-row"><MasterToggle checked label="Виден гостю" /><span className="hint">Виден гостю</span></div>
            <div className="field-row"><MasterTag tone="accent">Больше всего выбирают</MasterTag><MasterTag tone="ghost">авто-рейл</MasterTag></div>
            <p className="hint">Популярность и рейтинг считаются по выборам и оценкам гостей, вручную не задаются.</p>
          </MasterCard>
        </div>
      </section>
    );
  }
  return (
    <section className="page">
      <MasterPageHeader title="Каталог миксов" meta="15 миксов"
        actions={<MasterButton variant="primary" onClick={() => setEditing({ name: 'Новый микс' })}>Новый микс</MasterButton>} />
      <div className="toolbar">
        <MasterInput icon={<i data-lucide="search" />} placeholder="Поиск по названию микса" style={{ minWidth: 280 }} />
        <div className="toolbar-filters">
          <FilterChip active>Все</FilterChip><FilterChip>Виден гостю</FilterChip><FilterChip>Скрыт</FilterChip><FilterChip>Заблокирован</FilterChip><FilterChip>Рейл</FilterChip>
        </div>
      </div>
      <MasterList
        onRowClick={(row) => setEditing(row)}
        columns={[
          { key: 'name', label: 'МИКС', width: 'minmax(0,1.5fr)' },
          { key: 'components', label: 'КОМПОНЕНТОВ', width: '130px', align: 'right' },
          { key: 'rails', label: 'РЕЙЛЫ', width: 'minmax(0,1.4fr)' },
          { key: 'chosen', label: 'ВЫБОРОВ', width: '100px', align: 'right' },
          { key: 'rating', label: 'ОЦЕНКА', width: '90px', align: 'right', render: (r) => String(r.rating).replace('.', ',') },
          { key: 'status', label: 'СТАТУС', width: '170px', render: (r) => <MasterTag tone={statusTag[r.status][0]} dot>{statusTag[r.status][1]}</MasterTag> },
        ]}
        rows={D.mixes}
      />
    </section>
  );
}

function RailsScreen() {
  const kind = { statistical: 'статистический', prepared: 'подготовленный', curated: 'от мастеров' };
  return (
    <section className="page">
      <MasterPageHeader title="Рейлы витрины" meta="4 рейла"
        actions={<MasterButton variant="primary">Новый рейл</MasterButton>} />
      <MasterList
        onRowClick={() => {}}
        columns={[
          { key: 'name', label: 'РЕЙЛ', width: 'minmax(0,1.6fr)' },
          { key: 'type', label: 'ТИП', render: (r) => kind[r.type] },
          { key: 'mixes', label: 'МИКСОВ', width: '100px', align: 'right' },
          { key: 'editable', label: 'РЕЖИМ', width: '260px', render: (r) => (r.editable ? <MasterTag tone="success" dot>редактируется</MasterTag> : <span className="cell-actions"><MasterTag tone="accent">только чтение</MasterTag><span className="hint">{r.reason}</span></span>) },
        ]}
        rows={D.rails}
      />
      <MasterCard heading="Вечер в ателье" actions={<><MasterButton size="sm">Добавить микс</MasterButton><MasterButton size="sm" variant="ghost">Сохранить порядок</MasterButton></>}>
        <MasterList
          columns={[
            { key: 'pos', label: '#', width: '40px' },
            { key: 'name', label: 'МИКС', width: 'minmax(0,1fr)' },
            { key: 'actions', label: '', width: '90px', align: 'right', render: () => <span className="cell-actions" style={{ justifyContent: 'flex-end' }}><MasterIconButton small label="Выше"><i data-lucide="arrow-up" /></MasterIconButton><MasterIconButton small label="Ниже"><i data-lucide="arrow-down" /></MasterIconButton><MasterIconButton small label="Убрать"><i data-lucide="x" /></MasterIconButton></span> },
          ]}
          rows={[{ id: '1', pos: 1, name: 'Лимонный пирог' }, { id: '2', pos: 2, name: 'Cinnamon Red Tea' }, { id: '3', pos: 3, name: 'Cheesecake Wild Forest' }, { id: '4', pos: 4, name: 'Молоко-Черника' }]}
        />
      </MasterCard>
    </section>
  );
}

function AccessScreen() {
  const [ops, setOps] = React.useState(D.operators);
  return (
    <section className="page">
      <MasterPageHeader title="Код смены и роли"
        actions={<MasterButton variant="primary">Обновить код</MasterButton>} />
      <MasterCard heading="Код смены">
        <div className="code-row">
          <span className="code-value">4821</span>
          <span className="code-meta">
            <span>Действует до полуночи</span>
            <span><MasterTag tone="success" dot>бот на связи</MasterTag> 30 сек назад</span>
          </span>
        </div>
      </MasterCard>
      <div className="cols">
        <MasterCard heading="Allowlist операторов" actions={<MasterButton size="sm">Добавить оператора</MasterButton>}>
          <MasterList
            columns={[
              { key: 'name', label: 'ОПЕРАТОР', width: 'minmax(0,1fr)' },
              { key: 'phone', label: 'ТЕЛЕФОН', width: '170px' },
              { key: 'linked', label: 'CHAT', width: '150px', render: (r) => <MasterTag tone={r.linked ? 'success' : 'warning'} dot>{r.linked ? 'привязан' : 'ожидает контакт'}</MasterTag> },
              { key: 'active', label: 'АКТИВЕН', width: '90px', align: 'right', render: (r) => <MasterToggle checked={r.active} label="Активен" onChange={() => setOps((cur) => cur.map((o) => (o.id === r.id ? { ...o, active: !o.active } : o)))} /> },
            ]}
            rows={ops}
          />
          <p className="hint">Мастер не отправляет код из консоли. Оператор запрашивает его в боте командой /code.</p>
        </MasterCard>
        <MasterCard heading="Staff-аккаунты" actions={<><MasterTag tone="ghost">только admin</MasterTag><MasterButton size="sm">Новый аккаунт</MasterButton></>}>
          <MasterList
            columns={[
              { key: 'login', label: 'ЛОГИН', width: 'minmax(0,1fr)' },
              { key: 'role', label: 'РОЛЬ', render: (r) => <MasterTag tone={r.role === 'admin' ? 'accent' : 'neutral'}>{r.role}</MasterTag> },
              { key: 'active', label: 'СТАТУС', width: '110px', align: 'right', render: (r) => <MasterTag tone={r.active ? 'success' : 'ghost'} dot>{r.active ? 'активен' : 'выключен'}</MasterTag> },
            ]}
            rows={D.staff}
          />
        </MasterCard>
      </div>
      <MasterCard heading="Журнал staff-операций">
        <MasterList
          columns={[
            { key: 'at', label: 'КОГДА', width: '150px' },
            { key: 'action', label: 'ДЕЙСТВИЕ', width: '180px' },
            { key: 'entity', label: 'ОБЪЕКТ', width: 'minmax(0,1fr)' },
            { key: 'who', label: 'КТО', width: '110px', align: 'right' },
          ]}
          rows={D.audit}
        />
      </MasterCard>
    </section>
  );
}

Object.assign(window, { LoginScreen, DashboardScreen, InventoryScreen, MixesScreen, RailsScreen, MasterAccessScreen: AccessScreen });
