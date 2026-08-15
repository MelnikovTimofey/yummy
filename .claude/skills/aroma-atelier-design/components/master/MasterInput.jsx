// Input shell (.input): icon + field, 32/38/44px, focus ring in accent-soft.
export function MasterInput({ value, onChange, placeholder, icon, size = 'md', type = 'text', disabled = false, id, style }) {
  const [focused, setFocused] = React.useState(false);
  const heights = { md: 32, lg: 38, xl: 44 };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: heights[size] || heights.md,
        padding: '0 10px',
        background: 'var(--bg-base)',
        border: '1px solid ' + (focused ? 'var(--accent-border)' : 'var(--border-default)'),
        borderRadius: 'var(--r-sm)',
        color: 'var(--text-primary)',
        fontSize: size === 'xl' ? 'var(--fs-lg)' : 'var(--fs-md)',
        boxShadow: focused ? 'var(--focus-ring)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {icon ? <span style={{ color: 'var(--text-muted)', display: 'inline-flex', flexShrink: 0 }}>{icon}</span> : null}
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, minWidth: 0, height: '100%', background: 'transparent', border: 0, outline: 0, color: 'inherit', font: 'inherit' }}
      />
    </div>
  );
}
