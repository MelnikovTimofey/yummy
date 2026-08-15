// Mix composition: proportional stacked bar + manufacturer / name / share rows.
const PALETTE = ['var(--composition-1)', 'var(--composition-2)', 'var(--composition-3)', 'var(--composition-4)', 'var(--composition-5)'];
const formatPercent = (v) => String(Number(v.toFixed(1))).replace('.', ',') + '%';

export function CompositionStack({ components = [], showBar = true, style }) {
  const sorted = [...components].sort((a, b) => b.proportion - a.proportion);
  const total = sorted.reduce((sum, c) => sum + c.proportion, 0) || 1;
  return (
    <div style={{ display: 'grid', gap: 10, ...style }}>
      {showBar ? (
        <div style={{ display: 'flex', width: '100%', height: 10, borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
          {sorted.map((c, i) => (
            <span key={c.id || c.name} aria-hidden style={{ display: 'block', height: '100%', minWidth: 4, flexGrow: c.proportion / total, background: PALETTE[i % PALETTE.length] }} />
          ))}
        </div>
      ) : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {sorted.map((c, i) => (
          <li key={(c.id || c.name) + i} style={{ display: 'grid', gridTemplateColumns: '10px auto minmax(0,1fr) auto', alignItems: 'baseline', gap: 8 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--r-pill)', alignSelf: 'center', background: PALETTE[i % PALETTE.length] }} />
            <span className="aroma-caps" style={{ fontSize: 10, letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>{c.manufacturer}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            <span style={{ fontSize: 13, color: 'var(--accent-hover)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatPercent(c.proportion)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
