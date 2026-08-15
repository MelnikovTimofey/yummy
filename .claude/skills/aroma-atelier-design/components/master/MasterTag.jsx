// Small semantic tag (.tag): 22px tall, 4px radius, tonal background.
const TONES = {
  neutral: { background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' },
  info: { background: 'var(--info-soft)', borderColor: 'var(--info-soft)', color: 'var(--info)' },
  success: { background: 'var(--success-soft)', borderColor: 'var(--success-soft)', color: 'var(--success)' },
  warning: { background: 'var(--warning-soft)', borderColor: 'var(--warning-soft)', color: 'var(--warning)' },
  accent: { background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' },
  danger: { background: 'var(--danger-soft)', borderColor: 'var(--danger-soft)', color: 'var(--accent-hover)' },
  ghost: { background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' },
};

export function MasterTag({ children, tone = 'neutral', dot = false, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      data-tone={tone}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 8px',
        borderRadius: 'var(--r-xs)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 500,
        border: '1px solid ' + t.borderColor,
        background: t.background,
        color: t.color,
        ...style,
      }}
    >
      {dot ? <span aria-hidden style={{ width: 6, height: 6, borderRadius: 'var(--r-pill)', background: 'currentColor', flexShrink: 0 }} /> : null}
      {children}
    </span>
  );
}
