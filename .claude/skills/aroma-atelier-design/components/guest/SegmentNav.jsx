// Equal-width segmented control (guest journey / app tabs). Active segment is oxblood.
export function SegmentNav({ items, value, onChange, style }) {
  return (
    <div
      role="tablist"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(' + items.length + ', minmax(0,1fr))', gap: 6, ...style }}
    >
      {items.map((it) => {
        const isActive = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange && onChange(it.id)}
            style={{
              border: '1px solid ' + (isActive ? 'var(--segment-active-border)' : 'var(--border-subtle)'),
              borderRadius: 'var(--r-pill)',
              padding: '10px 8px',
              minHeight: 40,
              background: isActive ? 'var(--segment-active-bg)' : 'var(--segment-idle-bg)',
              color: isActive ? 'var(--segment-active-ink)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
