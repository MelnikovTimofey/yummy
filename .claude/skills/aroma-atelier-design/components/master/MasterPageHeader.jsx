// Module header: mono eyebrow, big serif h1, lead, right-aligned actions / meta.
export function MasterPageHeader({ eyebrow, title, subtitle, actions, meta, style }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, padding: '4px 0 18px', ...style }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {eyebrow ? <p style={{ margin: 0, fontFamily: 'var(--font-meta)', fontSize: 'var(--fs-xs)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>{eyebrow}</p> : null}
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'var(--fs-3xl)', lineHeight: 1.05, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle ? <p style={{ margin: 0, fontSize: 'var(--fs-md)', lineHeight: 1.4, color: 'var(--text-muted)', maxWidth: 720 }}>{subtitle}</p> : null}
      </div>
      {actions || meta ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
          {meta ? <div style={{ fontFamily: 'var(--font-meta)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{meta}</div> : null}
          {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
