import type { CSSProperties } from "react";

export type SegmentItem = {
  id: string;
  label: string;
};

type SegmentNavProps = {
  items: SegmentItem[];
  value: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
};

export function SegmentNav({ items, value, onChange, style }: SegmentNavProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`,
        gap: 6,
        ...style,
      }}
    >
      {items.map((it) => {
        const isActive = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(it.id)}
            style={{
              border: `1px solid ${isActive ? "rgba(255,220,175,0.36)" : "var(--line)"}`,
              borderRadius: 999,
              padding: "10px 8px",
              minHeight: 40,
              background: isActive
                ? "linear-gradient(180deg, #e0b878 0%, #cb974c 100%)"
                : "rgba(56,24,22,0.54)",
              color: isActive ? "#2b160f" : "var(--text-1)",
              fontSize: 11,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
