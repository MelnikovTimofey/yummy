import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import type { LegendPayload, TooltipContentProps } from 'recharts';

import { formatMetricValue } from '@/contracts';
import { cn } from '@/lib/utils';

// Графики по образцу shadcn charts (#520): ChartConfig задаёт подпись и цвет ряда,
// ряд берёт цвет из --color-<ключ>. Цвета — только токены Film Noir
// (--chart-*, --profile-*), палитры shadcn по умолчанию нет. Тема одна, тёмная.

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

const useChartConfig = () => React.useContext(ChartContext)?.config ?? {};

type ChartContainerProps = React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
};

function ChartContainer({ id, className, style, children, config, ...props }: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;
  const colors = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) => (item.color ? [[`--color-${key}`, item.color]] : [])),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-slot="chart" data-chart={chartId} className={cn('chart', className)} style={{ ...colors, ...style }} {...props}>
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipItem = TooltipContentProps<number, string>['payload'][number];

type ChartTooltipContentProps = Partial<Pick<TooltipContentProps<number, string>, 'active' | 'payload' | 'label'>> & {
  className?: string;
  hideLabel?: boolean;
  // Подпись берётся из поля данных, а не из подписи оси: на оси «25», в подсказке «25 окт, вс».
  labelKey?: string;
  // Ряд — по значению поля данных (доли кольца), а не по dataKey.
  nameKey?: string;
  valueFormatter?: (value: number) => React.ReactNode;
};

const itemKey = (item: TooltipItem, nameKey?: string) => {
  const data = item.payload as Record<string, unknown> | undefined;
  return String((nameKey ? data?.[nameKey] : undefined) ?? item.dataKey ?? item.name ?? 'value');
};

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  labelKey,
  nameKey,
  valueFormatter = formatMetricValue,
}: ChartTooltipContentProps) {
  const config = useChartConfig();
  if (!active || !payload?.length) return null;

  const first = payload[0]?.payload as Record<string, unknown> | undefined;
  const title = labelKey ? first?.[labelKey] : label;

  return (
    <div className={cn('chart-tooltip', className)}>
      {!hideLabel && title !== undefined && title !== '' ? <b className="chart-tooltip__label">{String(title)}</b> : null}
      {payload.map((item) => {
        const key = itemKey(item, nameKey);
        const data = item.payload as Record<string, unknown> | undefined;
        const color = config[key]?.color ?? item.color ?? (data?.color as string | undefined) ?? (data?.fill as string | undefined);
        return (
          <span className="chart-tooltip__row" key={key}>
            <i style={{ background: color }} aria-hidden="true" />
            <span>{config[key]?.label ?? String(data?.label ?? item.name ?? key)}</span>
            <em>{typeof item.value === 'number' ? valueFormatter(item.value) : null}</em>
          </span>
        );
      })}
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = {
  className?: string;
  payload?: ReadonlyArray<LegendPayload>;
  // Легенда вне графика (в шапке карточки) — ряды берутся из config.
  config?: ChartConfig;
};

function ChartLegendContent({ className, payload, config: own }: ChartLegendContentProps) {
  const context = useChartConfig();
  const config = own ?? context;
  const keys = payload?.length ? payload.map((item) => String(item.dataKey ?? item.value ?? '')) : Object.keys(config);
  if (!keys.length) return null;

  return (
    <span className={cn('chart-legend', className)}>
      {keys.map((key) => (
        <span key={key}>
          <i style={{ background: config[key]?.color }} aria-hidden="true" />
          {config[key]?.label ?? key}
        </span>
      ))}
    </span>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
