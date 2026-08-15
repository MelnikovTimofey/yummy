// Dashed empty placeholder (.empty) — for zero-result tables and unfilled panels.
export function EmptyState({ children, style }) {
  return (
    <p style={{ border: '1px dashed var(--border-default)', borderRadius: 'var(--r-md)', padding: 20, margin: 0, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', ...style }}>
      {children}
    </p>
  );
}
