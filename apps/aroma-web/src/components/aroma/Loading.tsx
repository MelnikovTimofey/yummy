import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Ожидания гостя (#394, мокап design/design_handoff_loaders): скелет там, где
// известна форма экрана, знак «Дым» там, где её нет, и знак на занятой кнопке.
// Без пульса: канон запрещает его индикаторам ожидания.

/** Быстрый ответ не мигает лоадером: он появляется только после этой паузы. */
export const LOADER_DELAY_MS = 300;

export function useAfterDelay(ms = LOADER_DELAY_MS) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return shown;
}

// Пути знака «Дым» без изменений (assets/logo-mark-oxblood.svg). pathLength=1 —
// чтобы струи рисовались штрихом одинаково, какой бы длины ни был путь.
const STRANDS = [
  { d: "M42 88C42 72 34 68 34 56C34 44 42 40 42 28", color: "#8E2F3C", opacity: 1 },
  { d: "M60 92C60 74 50 70 50 56C50 42 60 38 60 24", color: "#B34A57", opacity: 0.82 },
  { d: "M78 88C78 72 70 68 70 56C70 44 78 40 78 28", color: "#7A2A34", opacity: 1 },
];

/** Знак «Дым» в движении: струи прорисовываются снизу вверх и тают.
 *  `inline` — 16 px в строке и на кнопке; цвет струй тогда берётся из `color` текста. */
export function SmokeMark({ inline = false }: { inline?: boolean }) {
  return (
    <svg
      className={cn("smoke-mark", inline && "smoke-mark-inline")}
      viewBox="29 19 54 78"
      aria-hidden
      focusable="false"
    >
      <g fill="none" strokeLinecap="round" strokeWidth={inline ? 8 : 5}>
        {STRANDS.map((strand) => (
          <path
            key={strand.d}
            d={strand.d}
            pathLength={1}
            stroke={inline ? "currentColor" : strand.color}
            strokeOpacity={inline ? 1 : strand.opacity}
          />
        ))}
      </g>
    </svg>
  );
}

/** Ожидание целого экрана: скрытый текст для скринридера, видимое — после паузы. */
export function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const shown = useAfterDelay();
  return (
    <div className={cn("loading", className)} role="status" aria-busy>
      <span className="sr-only">{label}</span>
      {shown ? children : null}
    </div>
  );
}

/** Знак по центру: знакомство, лента рилсов. */
export function SmokeLoading({ label, className }: { label: string; className?: string }) {
  return (
    <Loading label={label} className={cn("loading-smoke", className)}>
      <SmokeMark />
    </Loading>
  );
}

/** Подпись кнопки с знаком слева, пока действие идёт. */
export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <>
      {busy ? <SmokeMark inline /> : null}
      {children}
    </>
  );
}

export function Sk({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cn("sk", className)} style={style} />;
}

export function MixRowSkeleton({ width = 62 }: { width?: number }) {
  return (
    <span className="mix-row mix-row-sk">
      <Sk className="sk-glyph" style={{ width: 44, height: 44 }} />
      <span className="mix-row-text">
        <Sk className="sk-title" style={{ width: `${width}%`, height: 15 }} />
        <Sk className="sk-bar" style={{ height: 3, width: "88%" }} />
        <Sk className="sk-line" style={{ width: `${width - 10}%`, height: 10 }} />
      </span>
    </span>
  );
}

const ROW_WIDTHS = [66, 52, 60, 46, 58, 70];

export function MixRowsSkeleton({ count }: { count: number }) {
  return (
    <>
      {ROW_WIDTHS.slice(0, count).map((width, index) => (
        <MixRowSkeleton key={index} width={width} />
      ))}
    </>
  );
}

/** Силуэт героя Подбора и «Для вас»: глиф, название, описание, полоса, чипы, состав, CTA. */
export function HeroSkeleton() {
  return (
    <div className="aroma-recs-hero">
      <div className="aroma-recs-hero-head">
        <Sk className="sk-glyph" style={{ flex: "0 0 auto", width: 64, height: 64 }} />
        <span className="sk-stack" style={{ flex: "1 1 auto" }}>
          <Sk className="sk-title" style={{ width: "82%" }} />
          <Sk className="sk-title" style={{ width: "56%" }} />
          <Sk className="sk-line" style={{ width: "92%", marginTop: 6 }} />
          <Sk className="sk-line" style={{ width: "70%" }} />
        </span>
      </div>
      <Sk className="sk-bar" />
      <span className="sk-chips">
        {[84, 104, 62, 88, 54].map((width) => (
          <Sk key={width} className="sk-chip" style={{ width }} />
        ))}
      </span>
      {[70, 55].map((width) => (
        <span key={width} className="sk-comp">
          <Sk className="sk-line" />
          <Sk className="sk-line" style={{ width: `${width}%` }} />
          <Sk className="sk-line" />
        </span>
      ))}
      <Sk className="sk-cta" />
    </div>
  );
}

/** Полка Витрины: заголовок и три постера. */
export function RailSkeleton({ titleWidth }: { titleWidth: number }) {
  return (
    <div className="aroma-showcase-rail">
      <span className="aroma-showcase-rail-head sk-rail-head">
        <Sk className="sk-title" style={{ width: titleWidth, height: 20 }} />
      </span>
      <div className="aroma-showcase-scroller sk-rail">
        {[0, 1, 2].map((index) => (
          <Sk key={index} className="sk-poster" />
        ))}
      </div>
    </div>
  );
}
