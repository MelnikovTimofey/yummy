import { useEffect, useState, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Ожидания консоли (#397) — те же приёмы, что у гостя (#394, мокап
// design/design_handoff_loaders): скелет строк там, где известна форма списка,
// знак «Дым» там, где идёт расчёт, и знак на занятой кнопке. Без пульса.

/** Быстрый ответ не мигает лоадером: он появляется только после этой паузы. */
export const LOADER_DELAY_MS = 300

function useAfterDelay(ms = LOADER_DELAY_MS) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), ms)
    return () => window.clearTimeout(timer)
  }, [ms])
  return shown
}

// Пути знака «Дым» без изменений (assets/logo-mark-oxblood.svg); в консоли цвета
// из токенов акцента — литералы цвета здесь запрещены lint:design.
const STRANDS = [
  { d: "M42 88C42 72 34 68 34 56C34 44 42 40 42 28", color: "var(--accent)", opacity: 1 },
  { d: "M60 92C60 74 50 70 50 56C50 42 60 38 60 24", color: "var(--accent-hover)", opacity: 0.82 },
  { d: "M78 88C78 72 70 68 70 56C70 44 78 40 78 28", color: "var(--accent-deep)", opacity: 1 },
]

/** Знак «Дым» в движении. `inline` — 14 px в строке и на кнопке, цвета текста. */
export function SmokeMark({ inline = false }: { inline?: boolean }) {
  return (
    <svg className={cn("smoke-mark", inline && "smoke-mark-inline")} viewBox="29 19 54 78" aria-hidden focusable="false">
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
  )
}

/** Ожидание блока: скрытый текст для скринридера, видимое — после паузы. */
export function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const shown = useAfterDelay()
  return (
    <div className={cn("loading", className)} role="status" aria-busy>
      <span className="sr-only">{label}</span>
      {shown ? children : null}
    </div>
  )
}

/** Расчёт: знак по центру блока. */
export function SmokeLoading({ label, className }: { label: string; className?: string }) {
  return (
    <Loading label={label} className={cn("loading-smoke", className)}>
      <SmokeMark />
    </Loading>
  )
}

/** Подпись занятой кнопки: знак слева. Кнопке — `aria-busy`, она не сереет (styles.css). */
export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <>
      {busy ? <SmokeMark inline /> : null}
      {children}
    </>
  )
}

export function Sk({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cn("sk", className)} style={style} />
}

// Ширины колонок по строкам: силуэт не выглядит отпечатанным по линейке.
const ROWS = [
  [38, 22, 12],
  [30, 26, 10],
  [44, 18, 14],
  [34, 24, 9],
  [40, 20, 12],
  [28, 28, 11],
  [36, 16, 13],
  [42, 22, 10],
]

/** Строки таблицы или списка консоли. */
export function RowsSkeleton({ label, rows = 6, className }: { label: string; rows?: number; className?: string }) {
  return (
    <Loading label={label} className={cn("loading-rows", className)}>
      {ROWS.slice(0, rows).map((widths, index) => (
        <span key={index} className="sk-row">
          {widths.map((width, column) => (
            <Sk key={column} className="sk-line" style={{ width: `${width}%` }} />
          ))}
        </span>
      ))}
    </Loading>
  )
}
