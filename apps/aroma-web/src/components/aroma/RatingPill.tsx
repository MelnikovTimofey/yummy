import type { CSSProperties } from "react";

type RatingPillProps = {
  rating: number;
  count?: number;
  style?: CSSProperties;
};

const formatRating = (rating: number) => rating.toFixed(1).replace(".", ",");

export function RatingPill({ rating, count, style }: RatingPillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "var(--rating-bg)",
        border: "1px solid var(--rating-border)",
        color: "var(--rating-ink)",
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11,
        lineHeight: 1.2,
        ...style,
      }}
    >
      <span style={{ color: "var(--ember)", fontSize: 10 }} aria-hidden>
        ★
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatRating(rating)}</span>
      {count != null && (
        <span style={{ color: "var(--text-2)", fontSize: 10 }}>· {count}</span>
      )}
    </span>
  );
}
