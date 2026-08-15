// Sort trigger + listbox popover (.master-sort-pill).
export function MasterSortPill({ value, options = [], onChange, label = 'Сортировка', style }) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.key === value);
  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(!open)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}
      >
        <span>{current ? current.label : label}</span>
        <span aria-hidden style={{ fontSize: 9, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast)' }}>▾</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          style={{ position: 'absolute', top: 32, right: 0, zIndex: 20, minWidth: 180, listStyle: 'none', margin: 0, padding: 4, borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
        >
          {options.map((o) => {
            const selected = o.key === value;
            return (
              <li
                key={o.key}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange && onChange(o.key); setOpen(false); }}
                style={{ padding: '6px 8px', borderRadius: 'var(--r-xs)', fontSize: 'var(--fs-md)', color: selected ? 'var(--accent)' : 'var(--text-secondary)', background: selected ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' }}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
