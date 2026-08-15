// KPI strip (.stats): hairline-divided cells, serif tabular values, tracked caps labels.
export function MasterStatsRow({ tiles = [], style }) {
  const toneColor = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 1,
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {tiles.map((tile, i) => (
        <div key={(tile.label || '') + i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', background: 'var(--bg-raised)' }}>
          <div style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--fs-xs)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{tile.label}</div>
          <div
            data-tone={tile.tone || 'default'}
            style={{
              fontFamily: tile.tone === 'code' ? 'var(--font-meta)' : 'var(--font-serif)',
              fontSize: tile.tone === 'code' ? 24 : 28,
              letterSpacing: tile.tone === 'code' ? '0.14em' : undefined,
              fontWeight: 500,
              lineHeight: 1,
              color: toneColor[tile.tone] || 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {tile.value}
          </div>
          {tile.hint ? <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{tile.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
