// 28px (or 24px) square icon action for table rows and drawer headers.
export function MasterIconButton({ children, label, small = false, disabled = false, onClick, style }) {
  const size = small ? 24 : 28;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        borderRadius: small ? 'var(--r-xs)' : 'var(--r-sm)',
        background: 'transparent',
        border: 0,
        color: 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
