// Guest primary action — solid oxblood CTA, full width, uppercase tracking, optional ember pulse.
export function AromaCTA({ children, onClick, disabled = false, pulse = false, type = 'button', style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={pulse && !disabled ? 'cta-pulse' : undefined}
      style={{
        width: '100%',
        border: '1px solid var(--cta-solid-border)',
        background: disabled ? 'var(--cta-solid-disabled-bg)' : 'var(--cta-solid)',
        color: disabled ? 'var(--text-muted)' : 'var(--cta-solid-ink)',
        borderRadius: 'var(--r-guest-cta)',
        minHeight: 52,
        padding: '0 18px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : 'var(--cta-solid-shadow)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
