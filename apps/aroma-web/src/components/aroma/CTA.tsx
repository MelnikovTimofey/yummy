import type { CSSProperties, ReactNode } from "react";

type CTAProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  pulse?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
};

export function CTA({
  children,
  onClick,
  disabled = false,
  pulse = false,
  type = "button",
  style,
}: CTAProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={pulse && !disabled ? "cta-pulse" : undefined}
      style={{
        width: "100%",
        border: `1px solid ${disabled ? "var(--line)" : "var(--cta-solid-border)"}`,
        background: disabled ? "var(--cta-solid-disabled-bg)" : "var(--cta-solid)",
        color: disabled ? "var(--text-2)" : "var(--cta-solid-ink)",
        borderRadius: "var(--r-guest-cta)",
        minHeight: 52,
        padding: "0 18px",
        fontSize: 13,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "var(--cta-solid-shadow)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
