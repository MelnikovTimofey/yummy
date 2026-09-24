// Tab used in the guest topbar nav rows (.tab / .tab.active upstream). Active is quiet:
// graphite fill, cream ink and a 2px bordeaux mark — solid accent belongs to the CTA only.
export function GuestTab({ children, active = false, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid ' + (active ? 'var(--segment-active-border)' : 'var(--border-subtle)'),
        borderRadius: 'var(--r-guest-control)',
        background: active ? 'var(--segment-active-bg)' : 'var(--guest-control-bg-soft)',
        color: active ? 'var(--segment-active-ink)' : 'var(--text-secondary)',
        boxShadow: active ? 'inset 0 -2px 0 var(--segment-active-mark)' : 'none',
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
