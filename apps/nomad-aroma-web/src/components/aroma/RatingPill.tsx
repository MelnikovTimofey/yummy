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
        background: "rgba(81,33,21,0.7)",
        border: "1px solid rgba(240,194,123,0.22)",
        color: "#f1cf93",
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
