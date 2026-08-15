// Pill tab used in the guest topbar nav rows (.tab / .tab.active upstream).
export function GuestTab({ children, active = false, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid ' + (active ? 'rgba(176,74,62,0.4)' : 'var(--border-subtle)'),
        borderRadius: 'var(--r-pill)',
        background: active ? 'linear-gradient(180deg, var(--accent-hover) 0%, var(--accent) 100%)' : 'var(--guest-control-bg-soft)',
        color: active ? 'var(--primary-foreground)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        lineHeight: 1.2,
        padding: '10px 12px',
        minHeight: 44,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
