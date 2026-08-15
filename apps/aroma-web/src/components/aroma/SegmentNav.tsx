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
              border: `1px solid ${isActive ? "var(--segment-active-border)" : "var(--line)"}`,
              borderRadius: 999,
              padding: "10px 8px",
              minHeight: 40,
              background: isActive ? "var(--segment-active-bg)" : "var(--segment-idle-bg)",
              color: isActive ? "var(--segment-active-ink)" : "var(--text-1)",
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
