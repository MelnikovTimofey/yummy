// Мастер shell: login → workspace with 5 module tabs and a ⌘K command palette.
const { MasterTopBar } = window.DesignSystem_1aef33;
const { LoginScreen, DashboardScreen, InventoryScreen, MixesScreen, RailsScreen, MasterAccessScreen } = window;

const TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'inventory', label: 'Табаки' },
  { id: 'mixes', label: 'Миксы' },
  { id: 'rails', label: 'Рейлы' },
  { id: 'access', label: 'Доступ' },
];

function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = React.useState('');
  if (!open) return null;
  const items = TABS.map((t) => ({ id: t.id, label: 'Перейти: ' + t.label, group: 'Навигация' }))
    .concat([{ id: 'new-mix', label: 'Новый микс', group: 'Действия' }, { id: 'sign-out', label: 'Выйти', group: 'Действия' }])
    .filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input autoFocus className="cmdk-input" placeholder="Найти или сделать…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="cmdk-list">
          {items.map((i) => (
            <li key={i.id} className="cmdk-item" onClick={() => { if (TABS.some((t) => t.id === i.id)) onNavigate(i.id); onClose(); }}>
              <span>{i.label}</span><span className="cmdk-group">{i.group}</span>
            </li>
          ))}
          {!items.length ? <li className="cmdk-empty">Ничего не найдено</li> : null}
        </ul>
      </div>
    </div>
  );
}

function MasterApp() {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons({ attrs: { width: 15, height: 15, 'stroke-width': 1.9 } }); });
  const [user, setUser] = React.useState(null);
  const [login, setLogin] = React.useState('admin');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState('dashboard');
  const [palette, setPalette] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = () => {
    if (!login.trim() || !password) { setError('Введите логин и пароль'); return; }
    setError(''); setLoading(true);
    setTimeout(() => { setLoading(false); setUser({ name: login, role: login === 'admin' ? 'admin' : 'master' }); }, 350);
  };

  if (!user) {
    return <LoginScreen login={login} setLogin={setLogin} password={password} setPassword={setPassword} error={error} loading={loading} onSubmit={submit} />;
  }

  return (
    <main className="shell">
      <MasterTopBar markSrc="../../assets/logo-mark-oxblood.svg" items={TABS} active={tab} onChange={setTab} userName={user.name} userRole={user.role} onOpenCommandPalette={() => setPalette(true)} onSignOut={() => { setUser(null); setPassword(''); setTab('dashboard'); }} />
      <section className="stage">
        {tab === 'dashboard' ? <DashboardScreen onNavigate={setTab} /> : null}
        {tab === 'inventory' ? <InventoryScreen /> : null}
        {tab === 'mixes' ? <MixesScreen /> : null}
        {tab === 'rails' ? <RailsScreen /> : null}
        {tab === 'access' ? <MasterAccessScreen /> : null}
      </section>
      <CommandPalette open={palette} onClose={() => setPalette(false)} onNavigate={setTab} />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MasterApp />);
