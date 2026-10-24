import type { CSSProperties, ReactNode } from "react";
import { BusyLabel } from "./Loading";

type CTAProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  pulse?: boolean;
  // Действие идёт (#394): знак «Дым» у подписи, кнопка не нажимается, но не сереет.
  busy?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
};

export function CTA({
  children,
  onClick,
  disabled = false,
  pulse = false,
  busy = false,
  type = "button",
  style,
}: CTAProps) {
  const muted = disabled && !busy;
  return (
    <button
      // занятая submit-кнопка не отправляет форму второй раз
      type={busy ? "button" : type}
      onClick={busy ? undefined : onClick}
      disabled={muted}
      aria-busy={busy || undefined}
      className={busy ? "cta-busy" : pulse && !muted ? "cta-pulse" : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        border: `1px solid ${muted ? "var(--line)" : "var(--cta-solid-border)"}`,
        background: muted ? "var(--cta-solid-disabled-bg)" : "var(--cta-solid)",
        color: muted ? "var(--text-2)" : "var(--cta-solid-ink)",
        borderRadius: "var(--r-guest-cta)",
        minHeight: 52,
        padding: "0 18px",
        fontSize: 13,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 600,
        cursor: muted || busy ? "default" : "pointer",
        boxShadow: muted ? "none" : "var(--cta-solid-shadow)",
        ...style,
      }}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </button>
  );
}
