import type { CSSProperties, ReactNode } from "react";

type ChipTier = "lg" | "sm";

type ChipProps = {
  children: ReactNode;
  tier?: ChipTier;
  active?: boolean;
  color?: string;
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function Chip({
  children,
  tier = "sm",
  active = false,
  color,
  onClick,
  style,
  disabled,
  type = "button",
}: ChipProps) {
  const isLg = tier === "lg";
  const dotSize = isLg ? 8 : 6;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${active ? "var(--primary)" : "var(--line)"}`,
        background: active
          ? "linear-gradient(180deg, rgba(216,171,104,0.20) 0%, rgba(140,45,36,0.18) 100%)"
          : "rgba(40,18,18,0.6)",
        color: active ? "var(--accent-soft)" : "var(--text-1)",
        borderRadius: 999,
        padding: isLg ? "10px 14px" : "7px 12px",
        fontSize: isLg ? 13 : 12,
        fontWeight: 400,
        letterSpacing: 0,
        textTransform: "none",
        lineHeight: 1.1,
        cursor: onClick && !disabled ? "pointer" : "default",
        opacity: disabled ? 0.5 : 1,
        boxShadow: active ? "inset 0 1px 0 rgba(255,244,236,0.10)" : "none",
        transition: "background 120ms, border-color 120ms, color 120ms",
        ...style,
      }}
    >
      {color && (
        <span
          aria-hidden
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: 999,
            background: color,
            flex: "0 0 auto",
            boxShadow: active ? "0 0 0 2px rgba(216,171,104,0.18)" : "none",
          }}
        />
      )}
      <span>{children}</span>
    </button>
  );
}
