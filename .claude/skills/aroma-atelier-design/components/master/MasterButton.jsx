// Console button (.btn upstream): 32px tall, 6px radius, 4 variants, 3 sizes.
const VARIANTS = {
  default: { background: 'var(--bg-raised)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' },
  primary: { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: 'var(--text-secondary)' },
  danger: { background: 'transparent', borderColor: 'var(--accent-border)', color: 'var(--accent)' },
};
const SIZES = { sm: { height: 26, padding: '0 8px', fontSize: 'var(--fs-sm)', borderRadius: 'var(--r-xs)' }, md: { height: 32, padding: '0 12px', fontSize: 'var(--fs-md)', borderRadius: 'var(--r-sm)' }, lg: { height: 38, padding: '0 16px', fontSize: 'var(--fs-md)', borderRadius: 'var(--r-sm)' } };

export function MasterButton({ children, variant = 'default', size = 'md', disabled = false, onClick, type = 'button', icon, style }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const s = SIZES[size] || SIZES.md;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        border: '1px solid ' + v.borderColor,
        background: v.background,
        color: v.color,
        whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'var(--transition-state)',
        ...s,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
