// Ops surface panel: raised gradient, hairline border, optional eyebrow + heading.
export function MasterCard({ children, eyebrow, heading, actions, style }) {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gap: 12,
        padding: 16,
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, var(--bg-raised), var(--bg-base))',
        boxShadow: 'var(--shadow-md)',
        ...style,
      }}
    >
      {eyebrow || heading || actions ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            {eyebrow ? <p style={{ margin: 0, fontFamily: 'var(--font-meta)', fontSize: 'var(--fs-xs)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-hover)' }}>{eyebrow}</p> : null}
            {heading ? <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'var(--fs-xl)', lineHeight: 1.15, color: 'var(--text-primary)' }}>{heading}</h3> : null}
          </div>
          {actions ? <div style={{ display: 'inline-flex', gap: 8, flexShrink: 0 }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
