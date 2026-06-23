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
        border: "1px solid rgba(242,213,165,0.28)",
        background: disabled
          ? "rgba(60,28,22,0.6)"
          : "linear-gradient(180deg, #e0b878 0%, #c08a4a 100%)",
        color: disabled ? "var(--text-2)" : "#23120d",
        borderRadius: 14,
        minHeight: 52,
        padding: "0 18px",
        fontSize: 13,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled
          ? "none"
          : "inset 0 1px 0 rgba(255,243,220,0.28), 0 14px 26px rgba(140,45,36,0.32)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
