// Guest rating pill: single star, comma decimal, optional vote count.
const formatRating = (r) => r.toFixed(1).replace('.', ',');

export function RatingPill({ rating, count, style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--rating-bg)',
        border: '1px solid var(--rating-border)',
        color: 'var(--rating-ink)',
        borderRadius: 'var(--r-pill)',
        padding: '3px 9px',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        lineHeight: 1.2,
        ...style,
      }}
    >
      <span aria-hidden style={{ color: 'var(--ember)', fontSize: 10 }}>★</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRating(rating)}</span>
      {count != null ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>· {count}</span> : null}
    </span>
  );
}
