// Dense Linear-style table (.list): tracked caps head, 44px min rows, hairline dividers.
export function MasterList({ columns = [], rows = [], onRowClick, selectedIds = [], style }) {
  const template = columns.map((c) => c.width || 'minmax(0,1fr)').join(' ');
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)', background: 'var(--bg-raised)', overflow: 'hidden', ...style }}>
      <div style={{ display: 'grid', gridTemplateColumns: template, alignItems: 'center', gap: 12, padding: '0 12px', height: 32, borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-meta)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        {columns.map((c, i) => (
          <div key={c.key || i} style={{ textAlign: c.align || 'left' }}>{c.label}</div>
        ))}
      </div>
      {rows.map((row, r) => {
        const selected = selectedIds.includes(row.id);
        return (
          <div
            key={row.id || r}
            data-selected={selected ? 'true' : 'false'}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={{
              display: 'grid',
              gridTemplateColumns: template,
              alignItems: 'center',
              gap: 12,
              padding: '6px 12px',
              minHeight: 44,
              borderBottom: r === rows.length - 1 ? 0 : '1px solid var(--border-subtle)',
              fontSize: 'var(--fs-md)',
              background: selected ? 'var(--accent-soft)' : 'transparent',
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background var(--dur-instant) var(--ease-standard)',
            }}
          >
            {columns.map((c, i) => (
              <div key={c.key || i} style={{ minWidth: 0, textAlign: c.align || 'left', color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: c.wrap ? 'normal' : 'nowrap' }}>
                {typeof c.render === 'function' ? c.render(row) : row[c.key]}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
