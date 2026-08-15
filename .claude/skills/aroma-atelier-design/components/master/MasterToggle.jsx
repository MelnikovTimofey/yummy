// 30x18 switch (.toggle) — inventory in-stock, rail active, operator active.
export function MasterToggle({ checked = false, onChange, label, disabled = false, style }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        position: 'relative',
        width: 30,
        height: 18,
        borderRadius: 'var(--r-pill)',
        background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
        border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-default)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        flexShrink: 0,
        transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 12,
          height: 12,
          borderRadius: 'var(--r-pill)',
          background: checked ? 'var(--accent-fg)' : 'var(--text-secondary)',
          transform: checked ? 'translateX(12px)' : 'none',
          transition: 'transform var(--dur-base) var(--ease-out), background var(--dur-fast)',
        }}
      />
    </button>
  );
}
