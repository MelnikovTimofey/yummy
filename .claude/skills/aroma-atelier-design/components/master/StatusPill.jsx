// Topbar status / command pill (.status-pill) with optional live dot and kbd hint.
export function StatusPill({ children, dot = false, tone = 'success', kbd, onClick, style }) {
  const dotColor = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' }[tone] || 'var(--success)';
  const dotSoft = { success: 'var(--success-soft)', warning: 'var(--warning-soft)', danger: 'var(--danger-soft)' }[tone] || 'var(--success-soft)';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 8px',
        borderRadius: 'var(--r-pill)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--text-secondary)',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {dot ? <span aria-hidden style={{ width: 6, height: 6, borderRadius: 'var(--r-pill)', background: dotColor, boxShadow: '0 0 0 3px ' + dotSoft }} /> : null}
      <span>{children}</span>
      {kbd ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--r-xs)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderBottomWidth: 2, fontFamily: 'var(--font-meta)', fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)' }}>{kbd}</span>
      ) : null}
    </Tag>
  );
}
