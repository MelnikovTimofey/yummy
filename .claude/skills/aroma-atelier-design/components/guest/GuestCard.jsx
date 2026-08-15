// Generic guest surface card (.card upstream): warm gradient, hairline border, lit top edge.
export function GuestCard({ children, compact = false, title, style }) {
  return (
    <section
      style={{
        background: 'var(--guest-card-bg)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-guest-card)',
        padding: compact ? 12 : 16,
        boxShadow: 'var(--shadow-guest-card)',
        display: 'grid',
        gap: 8,
        ...style,
      }}
    >
      {title ? (
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{title}</p>
      ) : null}
      {children}
    </section>
  );
}
