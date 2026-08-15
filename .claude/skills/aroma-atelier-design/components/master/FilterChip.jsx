// Toolbar filter chip (.filter-chip) with optional count badge.
export function FilterChip({ children, active = false, count, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 26,
        padding: '0 10px',
        borderRadius: 'var(--r-pill)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        background: active ? 'var(--accent-soft)' : 'var(--bg-raised)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        border: '1px solid ' + (active ? 'var(--accent-border)' : 'var(--border-subtle)'),
        cursor: 'pointer',
        transition: 'var(--transition-state)',
        ...style,
      }}
    >
      <span>{children}</span>
      {count != null ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 'var(--r-pill)', background: active ? 'var(--accent)' : 'var(--bg-elevated)', color: active ? 'var(--accent-fg)' : 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      ) : null}
    </button>
  );
}
