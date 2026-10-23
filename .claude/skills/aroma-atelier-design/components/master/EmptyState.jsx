// Empty state (.empty) — plain muted text in the flow, for zero-result tables and unfilled panels.
export function EmptyState({ children, style }) {
  return (
    <p style={{ padding: '12px 0', margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', ...style }}>
      {children}
    </p>
  );
}
